import Foundation
import CoreMotion
import UIKit

/// v1.5 marquee prototype — real-time chew detection from AirPods head motion.
///
/// Chewing moves the mandible, which couples into small pitch rotations and vertical
/// translation of the skull. `CMHeadphoneMotionManager` streams that at ~25 Hz from
/// AirPods (Pro/Max/3rd-gen and later). Human chewing is a remarkably stable
/// 0.9–1.8 Hz oscillation, so we don't need ML: band-pass the motion into the chew
/// band and count peaks against a rolling noise floor.
///
/// Pipeline (all on-device, nothing leaves the phone unless the user taps Export):
///
///   1. Scalar   `s = |rotationRate| + accelGain * |userAcceleration.y|`
///   2. Band-pass  EMA high-pass at 0.8 Hz (kills head-turn / posture drift)
///                 then EMA low-pass at 2.5 Hz (kills footfall, speech, sensor noise)
///   3. Peaks     three-point local maxima, min inter-peak interval 0.35 s (≤ 2.86 Hz)
///   4. Gate      peak must exceed `k × noiseFloor`, where noiseFloor is a robust
///                sigma estimate (1.4826 × MAD) over the last 3 s of the band-passed
///                signal, and must also clear a small absolute floor so a perfectly
///                still head can't manufacture chews out of quantisation noise.
///
/// Everything tunable is a constant in `Tuning` below and echoed in the README so the
/// numbers we ship can be argued with against real CSV captures.
@MainActor
final class ChewDetector: NSObject, ObservableObject {

    // MARK: - Tuning constants

    enum Tuning {
        /// How much vertical head acceleration (g) is folded into the rotation-rate
        /// scalar (rad/s). Chewing shows up in both; rotation dominates, so this is
        /// a modest boost rather than an equal weighting.
        static let accelGain: Double = 2.0

        /// High-pass corner. Below this is posture, head turns, walking sway.
        static let highPassCutoffHz: Double = 0.8

        /// Low-pass corner. Above this is speech, footfall, sensor noise.
        static let lowPassCutoffHz: Double = 2.5

        /// Fastest credible chew: 0.35 s ⇒ 2.86 Hz ceiling.
        static let minInterPeakInterval: TimeInterval = 0.35

        /// Rolling window for the noise-floor (MAD) estimate.
        static let noiseWindow: TimeInterval = 3.0

        /// MAD → sigma scale factor for a normal distribution.
        static let madToSigma: Double = 1.4826

        /// Default threshold multiplier. Peak must exceed `k × noiseFloor`.
        static let defaultK: Double = 2.5

        /// Absolute amplitude gate so a motionless head counts nothing.
        static let minPeakAmplitude: Double = 0.015

        /// Chews shown per bite before the heavy haptic + auto-reset.
        static let chewsPerBite: Int = 32

        /// Live sparkline depth (~8 s at 25 Hz).
        static let signalWindow: Int = 200

        /// A chew rate older than this reads as "stopped eating".
        static let rateStaleAfter: TimeInterval = 5.0

        /// Sampling assumption used only when a timestamp delta looks implausible.
        static let nominalDt: TimeInterval = 1.0 / 25.0
    }

    // MARK: - Published state

    /// Does this hardware support headphone motion at all? (false on simulator)
    @Published private(set) var isAvailable = false
    /// Are motion-capable AirPods currently connected?
    @Published private(set) var isConnected = false
    @Published private(set) var isRunning = false

    /// Chews in the current bite — resets to 0 after `Tuning.chewsPerBite`.
    @Published private(set) var chewCount = 0
    /// Every chew counted since the last `reset()`.
    @Published private(set) var sessionChewTotal = 0
    /// Completed 32-chew bites since the last `reset()`.
    @Published private(set) var biteCount = 0
    @Published private(set) var chewRatePerMin: Double = 0

    /// Last `Tuning.signalWindow` band-passed samples, for the live sparkline.
    @Published private(set) var signal: [Double] = []
    /// Current adaptive threshold, drawn on the sparkline.
    @Published private(set) var threshold: Double = 0

    /// Threshold multiplier *k*. Lower = more sensitive. Slider range 1.5–4.0.
    @Published var sensitivity: Double = Tuning.defaultK

    @Published var isRecording = false
    @Published private(set) var samplesRecorded = 0
    @Published var hapticsEnabled = true

    /// Set when `startDeviceMotionUpdates` hands back an error.
    @Published private(set) var lastError: String?

    // MARK: - Recording

    struct RawSample {
        let t: TimeInterval
        let pitch: Double, roll: Double, yaw: Double
        let rx: Double, ry: Double, rz: Double
        let ax: Double, ay: Double, az: Double
        let filtered: Double
        let threshold: Double
        let chewFlag: Bool
    }
    private var recording: [RawSample] = []

    // MARK: - Private

    private let manager = CMHeadphoneMotionManager()
    private let lightHaptic = UIImpactFeedbackGenerator(style: .light)
    private let heavyHaptic = UIImpactFeedbackGenerator(style: .heavy)

    /// EMA state
    private var baseline: Double = 0        // 0.8 Hz low-pass = the DC/drift term
    private var bandPassed: Double = 0      // 2.5 Hz low-pass of (raw − baseline)
    private var primed = false

    /// Three-point peak detector state
    private var prev2: Double = 0
    private var prev1: Double = 0
    private var prev1Time: TimeInterval = 0
    private var lastPeakTime: TimeInterval = -.greatestFiniteMagnitude

    /// Rolling window for the MAD noise floor: (time, value)
    private var noiseWindowBuf: [(t: TimeInterval, v: Double)] = []

    /// Recent chew times, for chews/min.
    private var chewTimes: [TimeInterval] = []

    private var lastSampleTime: TimeInterval?
    private var sessionStart = Date()

    // MARK: - Lifecycle

    override init() {
        super.init()
        isAvailable = manager.isDeviceMotionAvailable
        manager.delegate = self
        // `isDeviceMotionActive` is the only connection signal we get before the
        // delegate fires; the delegate keeps it live from here on.
        isConnected = manager.isDeviceMotionActive
    }

    // MARK: - Control

    func start() {
        guard isAvailable, !isRunning else { return }
        lastError = nil
        sessionStart = Date()
        lightHaptic.prepare()
        heavyHaptic.prepare()
        manager.startDeviceMotionUpdates(to: .main) { [weak self] motion, error in
            // The handler is delivered on .main, so hopping is a formality that
            // also satisfies the compiler's actor checking.
            MainActor.assumeIsolated {
                guard let self else { return }
                if let error { self.lastError = error.localizedDescription }
                guard let motion else { return }
                self.ingest(motion)
            }
        }
        isRunning = true
    }

    func stop() {
        guard isRunning else { return }
        manager.stopDeviceMotionUpdates()
        isRunning = false
        chewRatePerMin = 0
    }

    /// Clears counts, filter state and the live sparkline. Recorded samples are
    /// cleared too — export before you reset.
    func reset() {
        chewCount = 0
        sessionChewTotal = 0
        biteCount = 0
        chewRatePerMin = 0
        signal.removeAll(keepingCapacity: true)
        threshold = 0
        baseline = 0
        bandPassed = 0
        primed = false
        prev1 = 0; prev2 = 0; prev1Time = 0
        lastPeakTime = -.greatestFiniteMagnitude
        noiseWindowBuf.removeAll(keepingCapacity: true)
        chewTimes.removeAll(keepingCapacity: true)
        lastSampleTime = nil
        recording.removeAll(keepingCapacity: false)
        samplesRecorded = 0
        sessionStart = Date()
    }

    // MARK: - Signal chain

    private func ingest(_ motion: CMDeviceMotion) {
        let t = motion.timestamp
        let dt = clampedDt(from: t)
        lastSampleTime = t

        let r = motion.rotationRate
        let a = motion.userAcceleration
        let att = motion.attitude

        // 1. scalar
        let rotMag = (r.x * r.x + r.y * r.y + r.z * r.z).squareRoot()
        let raw = rotMag + Tuning.accelGain * abs(a.y)

        // 2. band-pass — EMA high-pass then EMA low-pass
        if !primed {
            baseline = raw
            bandPassed = 0
            primed = true
        } else {
            baseline += emaAlpha(dt: dt, cutoffHz: Tuning.highPassCutoffHz) * (raw - baseline)
            let highPassed = raw - baseline
            bandPassed += emaAlpha(dt: dt, cutoffHz: Tuning.lowPassCutoffHz) * (highPassed - bandPassed)
        }
        let value = bandPassed

        // 3/4. noise floor + peak
        pushNoise(t: t, v: value)
        let floor = noiseFloor()
        let thr = max(Tuning.minPeakAmplitude, sensitivity * floor)
        threshold = thr

        var chewFlag = false
        // Three-point local maximum, evaluated on the *previous* sample.
        if prev1 > prev2, prev1 >= value, prev1 > thr,
           prev1Time - lastPeakTime >= Tuning.minInterPeakInterval {
            lastPeakTime = prev1Time
            chewFlag = true
            registerChew(at: prev1Time)
        }
        prev2 = prev1
        prev1 = value
        prev1Time = t

        // live sparkline
        signal.append(value)
        if signal.count > Tuning.signalWindow {
            signal.removeFirst(signal.count - Tuning.signalWindow)
        }

        updateRate(now: t)

        if isRecording {
            recording.append(RawSample(
                t: t,
                pitch: att.pitch, roll: att.roll, yaw: att.yaw,
                rx: r.x, ry: r.y, rz: r.z,
                ax: a.x, ay: a.y, az: a.z,
                filtered: value, threshold: thr, chewFlag: chewFlag
            ))
            samplesRecorded = recording.count
        }
    }

    /// `dt` from device timestamps, guarded against gaps (headphones dropping out)
    /// and against a zero delta, either of which would blow up the EMA alpha.
    private func clampedDt(from t: TimeInterval) -> TimeInterval {
        guard let last = lastSampleTime else { return Tuning.nominalDt }
        let dt = t - last
        guard dt > 0.0005, dt < 0.5 else { return Tuning.nominalDt }
        return dt
    }

    /// Single-pole EMA coefficient for a given corner frequency: `α = dt / (dt + RC)`,
    /// `RC = 1 / (2π·fc)`.
    private func emaAlpha(dt: TimeInterval, cutoffHz: Double) -> Double {
        let rc = 1.0 / (2.0 * Double.pi * cutoffHz)
        return dt / (dt + rc)
    }

    private func pushNoise(t: TimeInterval, v: Double) {
        noiseWindowBuf.append((t, v))
        let cutoff = t - Tuning.noiseWindow
        if let firstKept = noiseWindowBuf.firstIndex(where: { $0.t >= cutoff }), firstKept > 0 {
            noiseWindowBuf.removeFirst(firstKept)
        }
    }

    /// Robust sigma of the band-passed signal: `1.4826 × median(|x − median(x)|)`.
    /// Median-based so the chew peaks themselves barely move the floor.
    private func noiseFloor() -> Double {
        guard noiseWindowBuf.count >= 8 else { return .greatestFiniteMagnitude }
        let values = noiseWindowBuf.map(\.v)
        let med = median(values)
        let deviations = values.map { abs($0 - med) }
        return Tuning.madToSigma * median(deviations)
    }

    private func median(_ xs: [Double]) -> Double {
        guard !xs.isEmpty else { return 0 }
        let sorted = xs.sorted()
        let mid = sorted.count / 2
        return sorted.count.isMultiple(of: 2) ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    }

    private func registerChew(at t: TimeInterval) {
        sessionChewTotal += 1
        chewCount += 1
        chewTimes.append(t)
        if chewTimes.count > 64 { chewTimes.removeFirst(chewTimes.count - 64) }

        if chewCount >= Tuning.chewsPerBite {
            biteCount += 1
            chewCount = 0
            if hapticsEnabled {
                heavyHaptic.impactOccurred()
                heavyHaptic.prepare()
            }
        } else if hapticsEnabled {
            lightHaptic.impactOccurred()
            lightHaptic.prepare()
        }
    }

    private func updateRate(now: TimeInterval) {
        guard let last = chewTimes.last, now - last <= Tuning.rateStaleAfter else {
            chewRatePerMin = 0
            return
        }
        let window = chewTimes.filter { now - $0 <= 20 }
        guard window.count >= 2, let first = window.first, let lastInWindow = window.last,
              lastInWindow > first else {
            chewRatePerMin = 0
            return
        }
        chewRatePerMin = 60.0 * Double(window.count - 1) / (lastInWindow - first)
    }

    // MARK: - Export

    /// Writes the recorded session to a CSV in the temporary directory and returns
    /// its URL. Returns nil if nothing has been recorded.
    func exportCSV() -> URL? {
        guard !recording.isEmpty else { return nil }
        var csv = "t,pitch,roll,yaw,rot_x,rot_y,rot_z,acc_x,acc_y,acc_z,filtered,threshold,chew\n"
        csv.reserveCapacity(recording.count * 128)
        let t0 = recording[0].t
        for s in recording {
            csv += String(
                format: "%.4f,%.6f,%.6f,%.6f,%.6f,%.6f,%.6f,%.6f,%.6f,%.6f,%.6f,%.6f,%d\n",
                s.t - t0, s.pitch, s.roll, s.yaw,
                s.rx, s.ry, s.rz, s.ax, s.ay, s.az,
                s.filtered, s.threshold, s.chewFlag ? 1 : 0
            )
        }
        let stamp = ISO8601DateFormatter().string(from: sessionStart)
            .replacingOccurrences(of: ":", with: "-")
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("chewlab-\(stamp).csv")
        do {
            try csv.write(to: url, atomically: true, encoding: .utf8)
            return url
        } catch {
            lastError = "CSV write failed: \(error.localizedDescription)"
            return nil
        }
    }

    func clearRecording() {
        recording.removeAll(keepingCapacity: false)
        samplesRecorded = 0
    }
}

// MARK: - Connection tracking

extension ChewDetector: CMHeadphoneMotionManagerDelegate {
    nonisolated func headphoneMotionManagerDidConnect(_ manager: CMHeadphoneMotionManager) {
        Task { @MainActor in self.isConnected = true }
    }

    nonisolated func headphoneMotionManagerDidDisconnect(_ manager: CMHeadphoneMotionManager) {
        Task { @MainActor in
            self.isConnected = false
            self.chewRatePerMin = 0
        }
    }
}
