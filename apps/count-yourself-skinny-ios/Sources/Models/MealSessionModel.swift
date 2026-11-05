import Foundation

/// The numbers of one meal in progress. Takes chew events, knows nothing about sensors or UI.
struct MealSessionModel {
    static let chewsPerBite = ChewTuning.chewsPerBite
    static let shortMealSummary = "Under 30 seconds, so this one wasn't saved."

    let start: Date
    private(set) var totalChews = 0

    init(start: Date) { self.start = start }

    /// Chews in the current bite, 1 to 32. Stays at 32 until the next chew starts a new bite.
    var chewsInBite: Int {
        totalChews == 0 ? 0 : (totalChews - 1) % Self.chewsPerBite + 1
    }
    var bites: Int { totalChews / Self.chewsPerBite }

    /// Counts one chew. Returns true on the chew that completes a bite: the chime signal.
    mutating func registerChew() -> Bool {
        totalChews += 1
        return totalChews % Self.chewsPerBite == 0
    }

    /// The record to save, or nil for a meal under 30 seconds.
    func finish(at end: Date, id: UUID = UUID()) -> MealRecord? {
        guard end.timeIntervalSince(start) >= TrendsCalculator.minimumMealSeconds else { return nil }
        return MealRecord(id: id, start: start, end: end, chews: totalChews, bites: bites)
    }

    /// One line, no food numbers.
    static func summary(for r: MealRecord) -> String {
        let minutes = max(1, Int((r.duration / 60).rounded()))
        var parts = ["\(r.chews) chews", "\(r.bites) \(r.bites == 1 ? "bite" : "bites")"]
        if r.bites > 0 {
            parts.append("\(Int((Double(r.chews) / Double(r.bites)).rounded())) chews a bite")
        }
        parts.append("\(minutes) min")
        return parts.joined(separator: ", ") + "."
    }
}

/// Whether the meal screen can count right now.
enum MealAvailability: Equatable {
    case ready
    /// This iPhone can't read headphone motion at all.
    case unsupported
    /// Started, but no motion has arrived: AirPods missing, out of range or not supported.
    case notConnected

    static let stallSeconds: TimeInterval = 3

    static func evaluate(isAvailable: Bool, isConnected: Bool, isRunning: Bool,
                         secondsWithoutSample: TimeInterval) -> MealAvailability {
        guard isAvailable else { return .unsupported }
        if isRunning && secondsWithoutSample >= stallSeconds { return .notConnected }
        return .ready
    }
}
