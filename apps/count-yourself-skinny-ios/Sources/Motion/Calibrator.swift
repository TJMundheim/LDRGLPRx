import Foundation

/// Picks the sensitivity k that best reproduces a known chew count on a captured run.
enum Calibrator {
    struct Capture {
        let samples: [(scalar: Double, t: TimeInterval)]
        let knownChews: Int
    }

    enum Rejection: Equatable {
        case tooFewSamples
        case noUsableSignal
        case stillPeriodNotQuiet
    }

    struct Success: Equatable {
        let k: Double
        /// |counted − known| / known × 100 at the chosen k.
        let errorPercent: Double
        let counted: Int
    }

    enum Outcome: Equatable {
        case calibrated(Success)
        case rejected(Rejection)
    }

    static let kValues: [Double] = stride(from: 1.5, through: 4.0, by: 0.25).map { $0 }
    static let minSamples = 100
    static let minRecallFraction = 0.5
    static let stillChewLimit = 3

    static func count(_ samples: [(scalar: Double, t: TimeInterval)], k: Double) -> Int {
        var core = ChewSignalCore()
        var n = 0
        for s in samples where core.ingest(scalar: s.scalar, t: s.t, k: k).chew { n += 1 }
        return n
    }

    static func calibrate(
        capture: Capture,
        still: [(scalar: Double, t: TimeInterval)]? = nil
    ) -> Outcome {
        guard capture.samples.count >= minSamples, capture.knownChews > 0 else {
            return .rejected(.tooFewSamples)
        }
        let known = Double(capture.knownChews)
        let counts = kValues.map { (k: $0, n: count(capture.samples, k: $0)) }
        // Most sensitive k is the lowest.
        guard let best = counts.first, Double(best.n) >= minRecallFraction * known else {
            return .rejected(.noUsableSignal)
        }
        // Closest to known; ties go to the higher (stricter) k.
        var chosen = counts[0]
        for c in counts where abs(c.n - capture.knownChews) <= abs(chosen.n - capture.knownChews) {
            chosen = c
        }
        if let still {
            guard let ok = counts.filter({ $0.k >= chosen.k })
                .first(where: { count(still, k: $0.k) < stillChewLimit }) else {
                return .rejected(.stillPeriodNotQuiet)
            }
            chosen = ok
        }
        let err = abs(Double(chosen.n) - known) / known * 100
        return .calibrated(Success(k: chosen.k, errorPercent: err, counted: chosen.n))
    }
}

/// Per-user chosen k, in an injected UserDefaults.
struct CalibrationStore {
    static let key = "cys.chew.calibratedK"
    let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) { self.defaults = defaults }

    var k: Double? {
        get { defaults.object(forKey: Self.key) as? Double }
        nonmutating set {
            if let v = newValue { defaults.set(v, forKey: Self.key) }
            else { defaults.removeObject(forKey: Self.key) }
        }
    }

    var kOrDefault: Double { k ?? ChewTuning.defaultK }
}
