import Foundation
import CoreMotion
import UIKit

/// v1.5 marquee prototype — real-time chew detection from AirPods head motion.
///
/// Chewing moves the mandible, which couples into small pitch rotations and vertical
/// translation of the skull. `CMHeadphoneMotionManager` streams that at ~25 Hz from
/// AirPods (Pro/Max/3rd-gen and later). Human chewing is a remarkably stable
/// 0.9–1.8 Hz oscillation, so we don't need ML: band-pass the motion into the chew
/// band and count peaks against a gate that follows the chewer's own recent peaks.
///
/// Pipeline (all on-device, nothing leaves the phone unless the user taps Export):
///
///   1. Scalar   `s = |rotationRate| + accelGain * |userAcceleration.y|`
///   2. Band-pass  EMA high-pass at 0.8 Hz (kills head-turn / posture drift)
///                 then EMA low-pass at 2.5 Hz (kills footfall, speech, sensor noise)
///   3. Peaks     three-point local maxima, min inter-peak interval 0.35 s (≤ 2.86 Hz),
///                and the signal must return through zero between counted peaks
///   4. Gate      a peak must clear all of: a small absolute floor (0.015), so a still
///                head counts nothing; `k × 0.2` of a peak envelope decaying over 2 s, so
///                the gate follows this chewer; and a power split, blocked while power
///                above the 2.5 Hz corner exceeds `2.5 / k` times power below it (1 s
///                smoothing), which rejects speech-rate motion and white noise.
///                Noise isn't estimated from the chew band: during a meal, that band
///                holds the chewing, and a floor measured there counts nothing.
///
/// None of this has met a real meal. It has only been run on synthetic waveforms, so
/// `defaultK` is a starting guess and the CSV export is how it gets settled.
///
/// Everything tunable is a constant in `Tuning` below and echoed in the README so the
/// numbers we ship can be argued with against real CSV captures.
@MainActor
final class ChewDetector: NSObject, ObservableObject {

    // MARK: - Tuning constants

    typealias Tuning = ChewTuning

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

    /// Gate setting *k*, scaling both relative gates. Lower = more sensitive. Slider range 1.5–4.0.
    @Published var sensitivity: Double

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

    private var core = ChewSignalCore()
    private let calibration: CalibrationStore

    /// Recent chew times, for chews/min.
    private var chewTimes: [TimeInterval] = []

    private var sessionStart = Date()

    /// Raw (scalar, t) samples as they arrive, before any filtering. Calibration replays
    /// these through `Calibrator`. Observing only; detection never reads this.
    var onSample: ((Double, TimeInterval) -> Void)?
    /// Called with the time of each counted chew.
    var onChew: ((TimeInterval) -> Void)?

    // MARK: - Lifecycle

    init(calibration: CalibrationStore = CalibrationStore()) {
        self.calibration = calibration
        self.sensitivity = calibration.kOrDefault
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
        core = ChewSignalCore()
        chewTimes.removeAll(keepingCapacity: true)
        recording.removeAll(keepingCapacity: false)
        samplesRecorded = 0
        sessionStart = Date()
    }

    // MARK: - Signal chain

    private func ingest(_ motion: CMDeviceMotion) {
        let t = motion.timestamp
        let r = motion.rotationRate
        let a = motion.userAcceleration
        let att = motion.attitude

        let raw = ChewSignalCore.scalar(rotX: r.x, rotY: r.y, rotZ: r.z, accelY: a.y)
        onSample?(raw, t)
        let out = core.ingest(scalar: raw, t: t, k: sensitivity)
        let value = out.filtered
        let thr = out.threshold
        threshold = thr
        let chewFlag = out.chew
        if let ct = out.chewTime { registerChew(at: ct); onChew?(ct) }

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
