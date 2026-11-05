import Foundation

/// One bite of the Chew Number test: how many times you chew before you swallow.
struct ChewNumberTest {
    /// Past this it's someone hammering the button, and the number no longer fits the card.
    static let limit = 200

    private(set) var count = 0
    var canFinish: Bool { count > 0 }

    mutating func chew() { count = min(count + 1, Self.limit) }
}

/// What the phone remembers about past tests. Never leaves the phone unless the user shares a card.
struct ChewNumberResults: Codable, Equatable {
    private(set) var latest: Int?
    /// Closest to 32, under it on a tie. Not the highest: 32 is a ceiling, not a score.
    private(set) var best: Int?

    mutating func record(_ number: Int) {
        latest = number
        if let best, !Self.beats(number, best) { return }
        best = number
    }

    private static func beats(_ a: Int, _ b: Int) -> Bool {
        let target = ChewTuning.chewsPerBite
        let (gapA, gapB) = (abs(a - target), abs(b - target))
        return gapA == gapB ? a < b : gapA < gapB
    }
}

/// Local only, in UserDefaults.
struct ChewNumberStore {
    static let resultsKey = "cys.chewNumber.v1"
    static let offerKey = "cys.chewNumber.offerAnswered"

    let defaults: UserDefaults
    init(defaults: UserDefaults = .standard) { self.defaults = defaults }

    /// Corrupt or foreign stored data reads as empty.
    func load() -> ChewNumberResults {
        guard let data = defaults.data(forKey: Self.resultsKey),
              let results = try? JSONDecoder().decode(ChewNumberResults.self, from: data) else { return ChewNumberResults() }
        return results
    }

    func record(_ number: Int) {
        var results = load()
        results.record(number)
        if let data = try? JSONEncoder().encode(results) { defaults.set(data, forKey: Self.resultsKey) }
    }

    /// The one-time Home card, until it gets an answer. The Home row stays either way.
    var offerPending: Bool { !defaults.bool(forKey: Self.offerKey) }
    func markOfferAnswered() { defaults.set(true, forKey: Self.offerKey) }
}

/// No grades and no claim about what other people chew: the plan has no source for one.
enum ChewNumberCopy {
    static let title = "What's your chew number?"
    static let offer = "Nobody knows this about themselves. One bite, about a minute."
    static let instructions = "Take one bite the way you always do. Don't change anything. Tap once per chew, then tap Done when you swallow."
    static let safetyLine = "For adults. A chew count is a pacing tool, not a score. If counting makes eating stressful, stop."
    static let ceilingLine = "More isn't better. 32 is as far as the count goes."
    static let noAirPods = "No AirPods found, so tap once per chew instead."
    static let bookNumber = "The book's number: \(ChewTuning.chewsPerBite)."

    static func yourNumber(_ n: Int) -> String { "Your number: \(n)." }
    static func closest(_ n: Int) -> String { "Closest to \(ChewTuning.chewsPerBite) so far: \(n)." }
}
