import Foundation

/// Every tunable number in the chew chain. One source of truth; `ChewDetector.Tuning`
/// is an alias for this.
enum ChewTuning {
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

/// Pure chew signal chain: EMA band-pass, MAD noise floor, three-point peak,
/// minimum inter-peak interval, absolute floor. No CoreMotion, no UIKit.
struct ChewSignalCore {
    typealias Tuning = ChewTuning

    struct Sample: Equatable {
        /// Band-passed value for this sample.
        let filtered: Double
        /// Adaptive threshold in force for this sample.
        let threshold: Double
        /// True when a chew peak was confirmed on this call.
        let chew: Bool
        /// Timestamp of the confirmed peak (the previous sample), when `chew`.
        let chewTime: TimeInterval?
    }

    private var baseline: Double = 0
    private var bandPassed: Double = 0
    private var primed = false
    private var prev2: Double = 0
    private var prev1: Double = 0
    private var prev1Time: TimeInterval = 0
    private var lastPeakTime: TimeInterval = -.greatestFiniteMagnitude
    private var noiseWindowBuf: [(t: TimeInterval, v: Double)] = []
    private var lastSampleTime: TimeInterval?

    init() {}

    /// `|rotationRate| + accelGain * |userAcceleration.y|`, from plain doubles.
    static func scalar(rotX: Double, rotY: Double, rotZ: Double, accelY: Double) -> Double {
        let rotMag = (rotX * rotX + rotY * rotY + rotZ * rotZ).squareRoot()
        return rotMag + Tuning.accelGain * abs(accelY)
    }

    mutating func ingest(scalar raw: Double, t: TimeInterval, k: Double) -> Sample {
        let dt = clampedDt(from: t)
        lastSampleTime = t

        if !primed {
            baseline = raw
            bandPassed = 0
            primed = true
        } else {
            baseline += Self.emaAlpha(dt: dt, cutoffHz: Tuning.highPassCutoffHz) * (raw - baseline)
            let highPassed = raw - baseline
            bandPassed += Self.emaAlpha(dt: dt, cutoffHz: Tuning.lowPassCutoffHz) * (highPassed - bandPassed)
        }
        let value = bandPassed

        pushNoise(t: t, v: value)
        let thr = max(Tuning.minPeakAmplitude, k * noiseFloor())

        var chew = false
        var chewTime: TimeInterval?
        // Three-point local maximum, evaluated on the previous sample.
        if prev1 > prev2, prev1 >= value, prev1 > thr,
           prev1Time - lastPeakTime >= Tuning.minInterPeakInterval {
            lastPeakTime = prev1Time
            chew = true
            chewTime = prev1Time
        }
        prev2 = prev1
        prev1 = value
        prev1Time = t
        return Sample(filtered: value, threshold: thr, chew: chew, chewTime: chewTime)
    }

    /// Guards against gaps (headphones dropping out) and zero deltas.
    private func clampedDt(from t: TimeInterval) -> TimeInterval {
        guard let last = lastSampleTime else { return Tuning.nominalDt }
        let dt = t - last
        guard dt > 0.0005, dt < 0.5 else { return Tuning.nominalDt }
        return dt
    }

    private static func emaAlpha(dt: TimeInterval, cutoffHz: Double) -> Double {
        let rc = 1.0 / (2.0 * Double.pi * cutoffHz)
        return dt / (dt + rc)
    }

    private mutating func pushNoise(t: TimeInterval, v: Double) {
        noiseWindowBuf.append((t, v))
        let cutoff = t - Tuning.noiseWindow
        if let firstKept = noiseWindowBuf.firstIndex(where: { $0.t >= cutoff }), firstKept > 0 {
            noiseWindowBuf.removeFirst(firstKept)
        }
    }

    /// Robust sigma: `1.4826 × median(|x − median(x)|)`.
    private func noiseFloor() -> Double {
        guard noiseWindowBuf.count >= 8 else { return .greatestFiniteMagnitude }
        let values = noiseWindowBuf.map(\.v)
        let med = Self.median(values)
        return Tuning.madToSigma * Self.median(values.map { abs($0 - med) })
    }

    private static func median(_ xs: [Double]) -> Double {
        guard !xs.isEmpty else { return 0 }
        let sorted = xs.sorted()
        let mid = sorted.count / 2
        return sorted.count.isMultiple(of: 2) ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    }
}
