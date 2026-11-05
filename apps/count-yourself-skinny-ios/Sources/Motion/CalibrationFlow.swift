import Foundation

/// The calibration run as a state machine: still, three guided rounds with rests between,
/// then a result. Time-driven by the view (it calls `advance()`); this type routes samples
/// and judges them. No sensors, no UI.
struct CalibrationFlow {
    enum Phase: Equatable {
        case intro
        case still
        case round(Int)
        case rest(after: Int)
        case rejected(Calibrator.Rejection)
        case calibrated(Calibrator.Success)
        case saved
        case skipped
    }

    static let stillSeconds: TimeInterval = 20
    static let rounds = 3
    static let chewsPerRound = 32
    /// Same beat as the Bite Pacer.
    static let beat: TimeInterval = 0.9
    static let restSeconds: TimeInterval = 4

    private(set) var phase: Phase = .intro
    private var still: [(scalar: Double, t: TimeInterval)] = []
    private var chewing: [(scalar: Double, t: TimeInterval)] = []

    var stillSampleCount: Int { still.count }
    var roundSampleCount: Int { chewing.count }

    mutating func begin() {
        guard phase == .intro else { return }
        phase = .still
    }

    /// Samples count only during the still period and the rounds; rests and screens drop them.
    mutating func ingest(scalar: Double, t: TimeInterval) {
        switch phase {
        case .still: still.append((scalar, t))
        case .round: chewing.append((scalar, t))
        default: break
        }
    }

    /// Moves to the next phase. After the last round it judges the capture.
    mutating func advance() {
        switch phase {
        case .still: phase = .round(1)
        case .round(let n) where n < Self.rounds: phase = .rest(after: n)
        case .round: phase = judge()
        case .rest(let n): phase = .round(n + 1)
        default: break
        }
    }

    private func judge() -> Phase {
        let capture = Calibrator.Capture(samples: chewing, knownChews: Self.rounds * Self.chewsPerRound)
        switch Calibrator.calibrate(capture: capture, still: still) {
        case .calibrated(let s): return .calibrated(s)
        case .rejected(let r): return .rejected(r)
        }
    }

    mutating func retry() {
        guard case .rejected = phase else { return }
        still.removeAll(); chewing.removeAll()
        phase = .still
    }

    /// Saves k. Only a calibrated result can be saved.
    mutating func save(to store: CalibrationStore) {
        guard case .calibrated(let s) = phase else { return }
        store.k = s.k
        store.skipped = false
        phase = .saved
    }

    /// Leaves the default k in place and remembers not to ask on the first meal again.
    mutating func skip(store: CalibrationStore) {
        store.skipped = true
        phase = .skipped
    }

    /// A plain sentence for a rejection.
    static func message(for r: Calibrator.Rejection) -> String {
        switch r {
        case .tooFewSamples:
            return "We didn't get enough from your AirPods. Check they're in and connected, then try again."
        case .noUsableSignal:
            return "We couldn't feel your chewing. Chew something solid, like a bite of food or gum, and try again."
        case .stillPeriodNotQuiet:
            return "Your head was moving during the still part. Sit still for the first 20 seconds and try again."
        }
    }
}
