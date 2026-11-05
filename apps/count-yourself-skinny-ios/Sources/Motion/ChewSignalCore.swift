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
    /// Decay of the peak envelope. Sets how fast the gate follows a chewer who goes quiet.
    static let envelopeDecay: TimeInterval = 2.0
    /// Fraction of the envelope a peak must reach, per unit of k (k 2.5 ⇒ 50%, 4.0 ⇒ 80%).
    static let envelopeFractionPerK: Double = 0.2
    /// Smoothing of the power split above and below the low-pass corner.
    static let powerTimeConstant: TimeInterval = 1.0
    /// Peaks are blocked while power above the corner exceeds `fastMotionLimit / k` times
    /// power below it. A pure tone's ratio is (f / corner)², so k 2.5 blocks motion
    /// centred above the 2.5 Hz corner; lower k tolerates faster motion.
    static let fastMotionLimit: Double = 2.5
    /// The one tunable: scales both relative gates. Lower = more sensitive. A starting
    /// guess, not a finding; real meal captures are meant to settle it.
    static let defaultK: Double = 2.5
    /// Absolute amplitude gate so a motionless head counts nothing, and all that stands
    /// in for noise when the envelope has decayed away.
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

/// Pure chew signal chain: EMA band-pass, three-point peak, minimum inter-peak interval,
/// one count per swing through zero, then a gate of three parts. No CoreMotion, no UIKit.
/// O(1) per sample, no buffers.
///
/// The gate never estimates noise from the chew band, because during a meal the chew band
/// holds the chewing. A sigma-style floor over that window sits at about 1.05 × a steady
/// chew's own peak and counts nothing, at any k. Instead a peak must clear all of:
///
/// - `minPeakAmplitude`: fixed, so a still head counts nothing.
/// - `k × 0.2 × envelope`: the envelope follows the largest recent peak and decays, so the
///   gate is relative to this chewer and rejects ripple between chews.
/// - power split: blocked while power above the low-pass corner outweighs power below it
///   by more than `fastMotionLimit / k`. White noise and speech-rate motion put most of
///   their power above the corner; chewing doesn't. It is a measure of how fast the motion
///   is, so a louder signal doesn't change it.
///
/// Only checked against made-up waveforms so far. Motion that really is in the chew band
/// and irregular passes all three, since nothing here looks at regularity.
struct ChewSignalCore {
    typealias Tuning = ChewTuning

    struct Sample: Equatable {
        /// Band-passed value for this sample.
        let filtered: Double
        /// Gate in force for this sample. While motion is too fast to be chewing, it sits
        /// at or above every recent peak, so no peak can clear it.
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
    private var armed = true
    private var abovePower: Double = 0
    private var belowPower: Double = 0
    private var envelope: Double = 0
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

        var above = 0.0
        if !primed {
            baseline = raw
            bandPassed = 0
            primed = true
        } else {
            baseline += Self.emaAlpha(dt: dt, cutoffHz: Tuning.highPassCutoffHz) * (raw - baseline)
            let highPassed = raw - baseline
            bandPassed += Self.emaAlpha(dt: dt, cutoffHz: Tuning.lowPassCutoffHz) * (highPassed - bandPassed)
            above = highPassed - bandPassed
        }
        let value = bandPassed

        let smoothing = 1 - exp(-dt / Tuning.powerTimeConstant)
        abovePower += smoothing * (above * above - abovePower)
        belowPower += smoothing * (value * value - belowPower)
        envelope = max(value, envelope * exp(-dt / Tuning.envelopeDecay))

        var thr = max(Tuning.minPeakAmplitude, k * Tuning.envelopeFractionPerK * envelope)
        // Too fast to be chewing: lift the gate above anything a peak could be right now.
        if abovePower * k > Tuning.fastMotionLimit * belowPower { thr = max(thr, envelope, prev1) }

        // One chew per swing: the signal must come back through zero before the next one,
        // so ripple on top of one slow hump can't count twice.
        if value <= 0 { armed = true }

        var chew = false
        var chewTime: TimeInterval?
        // Three-point local maximum, evaluated on the previous sample.
        if armed, prev1 > prev2, prev1 >= value, prev1 > thr,
           prev1Time - lastPeakTime >= Tuning.minInterPeakInterval {
            armed = false
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
}
