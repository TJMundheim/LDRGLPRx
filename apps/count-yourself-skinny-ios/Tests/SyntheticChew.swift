import Foundation
@testable import CountYourselfSkinny

/// Deterministic synthetic signals at 25 Hz. These check the signal chain against
/// made-up waveforms, NOT real chewing; the detector has not been validated on a meal.
/// Passing here means "the arithmetic is not self-defeating", nothing more.
enum SyntheticChew {
    typealias Samples = [(scalar: Double, t: TimeInterval)]

    /// Seeded LCG so runs are identical everywhere.
    struct RNG {
        var state: UInt64
        mutating func next() -> Double {   // uniform in [-1, 1)
            state = state &* 6364136223846793005 &+ 1442695040888963407
            return Double(state >> 11) / Double(1 << 53) * 2 - 1
        }
    }

    enum Shape {
        /// One raised-cosine cycle per chew, trough to trough.
        case sine
        /// One Gaussian bump per chew.
        case pulse
        /// A bump per chew plus a smaller closing bump half a period later. Truth counts
        /// only the main bump: a user whose best k is stricter than the default.
        case doublePulse(secondary: Double)
        /// Every other chew is weak, as in chewing side to side: a user whose best k
        /// is more sensitive than the default.
        case alternating(weak: Double)
    }

    enum Segment {
        case chew(seconds: Double, hz: Double, amp: Double, shape: Shape)
        case still(seconds: Double)
        /// Irregular motion: contiguous one-cycle pulses, each at a random 3-6 Hz and a
        /// random 0.5-1.5 x `amp`. With `pauses`, syllables come in word-sized groups
        /// separated by short gaps, which leaks energy into the chew band.
        case speech(seconds: Double, amp: Double, pauses: Bool)

        var seconds: Double {
            switch self {
            case .chew(let s, _, _, _), .still(let s), .speech(let s, _, _): return s
            }
        }
    }

    struct Session {
        var samples: Samples = []
        var truth = 0
        /// Device-clock span and true chews of each segment, in order.
        var segments: [(start: TimeInterval, end: TimeInterval, truth: Int)] = []
    }

    static let rate = 25.0
    static let base = 0.3
    static let noise = 0.01
    static let origin = 1000.0   // arbitrary device-clock origin
    /// Used when a case runs across seeds, so one lucky draw can't pass it.
    static let seeds: [UInt64] = [42, 1, 7, 99, 1234]

    static func session(
        _ segments: [Segment],
        swell: (start: Double, length: Double, amp: Double)? = nil,
        gap: (start: Double, length: Double)? = nil,
        seed: UInt64 = 42
    ) -> Session {
        var rng = RNG(state: seed)
        let total = segments.reduce(0) { $0 + $1.seconds }
        let n = Int(total * rate)
        var motion = [Double](repeating: 0, count: n)
        var out = Session()

        var start = 0.0
        for segment in segments {
            let end = start + segment.seconds
            var truth = 0
            switch segment {
            case .still:
                break
            case .chew(_, let hz, let amp, let shape):
                switch shape {
                case .sine:
                    var c = start
                    while c + 1 / hz <= end {
                        addCycle(&motion, from: c, seconds: 1 / hz, amp: amp * (1 + 0.2 * rng.next()))
                        truth += 1
                        c += 1 / hz
                    }
                case .pulse, .doublePulse, .alternating:
                    var c = start + 0.5
                    while c < end - 0.2 {
                        var main = amp * (1 + 0.2 * rng.next())
                        if case .alternating(let weak) = shape, truth % 2 == 1 { main *= weak }
                        addBump(&motion, at: c, amp: main)
                        if case .doublePulse(let secondary) = shape {
                            addBump(&motion, at: c + 0.5 / hz, amp: amp * secondary * (1 + 0.2 * rng.next()))
                        }
                        truth += 1
                        c += 1 / hz
                    }
                }
            case .speech(_, let amp, let pauses):
                var c = start
                var left = pauses ? 2 + Int((rng.next() + 1) * 1.5) : Int.max
                while c < end {
                    let f = 4.5 + 1.5 * rng.next()
                    addCycle(&motion, from: c, seconds: 1 / f, amp: amp * (1 + 0.5 * rng.next()))
                    c += 1 / f
                    left -= 1
                    if left <= 0 {
                        c += 0.2 + 0.1 * rng.next()   // 0.1-0.3 s between words
                        left = 2 + Int((rng.next() + 1) * 1.5)
                    }
                }
            }
            out.segments.append((origin + start, origin + end, truth))
            out.truth += truth
            start = end
        }

        for i in 0..<n {
            let nominal = Double(i) / rate
            let jittered = origin + nominal + 0.002 * rng.next()
            var v = base + noise * rng.next() + motion[i]
            if let g = gap, nominal >= g.start, nominal < g.start + g.length { continue }
            if let s = swell, nominal >= s.start, nominal < s.start + s.length {
                v += s.amp * 0.5 * (1 - cos(2 * .pi * (nominal - s.start) / s.length))
            }
            out.samples.append((v, max(jittered, (out.samples.last?.t ?? 0) + 0.001)))
        }
        return out
    }

    /// One chewing shape for `seconds`, or stillness when `chewHz` is nil.
    static func make(
        seconds: Double, chewHz: Double?, amp: Double = 0.12, shape: Shape = .pulse,
        swell: (start: Double, length: Double, amp: Double)? = nil,
        gap: (start: Double, length: Double)? = nil, seed: UInt64 = 42
    ) -> (samples: Samples, truth: Int) {
        let segment: Segment = chewHz.map { .chew(seconds: seconds, hz: $0, amp: amp, shape: shape) }
            ?? .still(seconds: seconds)
        let s = session([segment], swell: swell, gap: gap, seed: seed)
        return (s.samples, s.truth)
    }

    /// Chewing as a signed pitch-rate swing, sent through the real `scalar()` rather than
    /// added to its output. `scalar()` takes a magnitude, so this rectifies to 2 x `hz`.
    static func signedPitch(seconds: Double, hz: Double, amp: Double = 0.3, seed: UInt64 = 42) -> (samples: Samples, truth: Int) {
        var rng = RNG(state: seed)
        let samples: Samples = (0..<Int(seconds * rate)).map { i in
            let nominal = Double(i) / rate
            let rx = amp * sin(2 * .pi * hz * nominal) + noise * rng.next()
            let scalar = ChewSignalCore.scalar(rotX: rx, rotY: noise * rng.next(), rotZ: noise * rng.next(), accelY: 0)
            return (scalar, origin + nominal)
        }
        return (samples, Int(seconds * hz))
    }

    /// Irregular fidgeting confined to the chew band, with no chewing in it: white noise
    /// through two low-pass poles, then the detector's own high-pass removes the rest.
    static func inBandFidget(seconds: Double, level: Double = 0.4, seed: UInt64 = 42) -> Samples {
        var rng = RNG(state: seed)
        var a = 0.0, b = 0.0
        return (0..<Int(seconds * rate)).map { i in
            a += 0.25 * (rng.next() - a)
            b += 0.25 * (a - b)
            return (base + level * b + noise * rng.next(), origin + Double(i) / rate)
        }
    }

    static func count(_ s: Samples, k: Double = ChewTuning.defaultK) -> Int {
        Calibrator.count(s, k: k)
    }

    static func chewTimes(_ s: Samples, k: Double = ChewTuning.defaultK) -> [TimeInterval] {
        var core = ChewSignalCore()
        return s.compactMap { core.ingest(scalar: $0.scalar, t: $0.t, k: k).chewTime }
    }

    private static func addCycle(_ m: inout [Double], from c: Double, seconds: Double, amp: Double) {
        var i = max(0, Int((c * rate).rounded(.up)))
        while i < m.count, Double(i) / rate < c + seconds {
            m[i] += amp * 0.5 * (1 - cos(2 * .pi * (Double(i) / rate - c) / seconds))
            i += 1
        }
    }

    private static func addBump(_ m: inout [Double], at c: Double, amp: Double, sigma: Double = 0.06) {
        var i = max(0, Int(((c - 0.4) * rate).rounded(.up)))
        while i < m.count, Double(i) / rate <= c + 0.4 {
            let d = Double(i) / rate - c
            m[i] += amp * exp(-d * d / (2 * sigma * sigma))
            i += 1
        }
    }
}
