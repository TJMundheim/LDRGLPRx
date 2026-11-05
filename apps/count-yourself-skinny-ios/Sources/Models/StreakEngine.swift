import Foundation

/// The streak, as the book defines it: one yes/no a day, one miss is a rest,
/// two misses in a row start over. Pure value type; every date is passed in.
///
/// State is kept so today's answer can be changed without double counting:
/// `base*` is the state as it stood before `answerDay`'s answer was applied.
struct StreakEngine: Codable, Equatable {
    private(set) var streak = 0
    private(set) var longest = 0
    /// Consecutive misses ending at `through`.
    private(set) var misses = 0
    /// Start of the last day already folded into streak/misses. Nil before the first answer.
    private(set) var through: Date?

    private(set) var answerDay: Date?
    private(set) var answerHit: Bool?
    private var baseStreak = 0
    private var baseLongest = 0
    private var baseMisses = 0

    /// Today's answer, if one was given on the calendar day of `date`.
    func answer(on date: Date, calendar: Calendar) -> Bool? {
        answerDay == calendar.startOfDay(for: date) ? answerHit : nil
    }

    /// True when the day before `today` was not a yes ("Never miss twice").
    func missedYesterday(today: Date, calendar: Calendar) -> Bool {
        guard let through else { return false }
        let t = calendar.startOfDay(for: today)
        if answerDay == t { return baseMisses > 0 }
        return days(from: through, to: t, calendar) > 1 || misses > 0
    }

    /// Folds every fully elapsed, unanswered day before `today` in as a miss.
    mutating func catchUp(today: Date, calendar: Calendar) {
        guard let through else { return }
        let t = calendar.startOfDay(for: today)
        let gap = days(from: through, to: t, calendar) - 1
        guard gap > 0 else { return }
        for _ in 0..<gap { applyMiss() }
        self.through = calendar.date(byAdding: .day, value: -1, to: t)
        if answerDay != t { answerDay = nil; answerHit = nil }
    }

    /// Records (or changes) the answer for the calendar day of `date`.
    mutating func answer(_ hit: Bool, on date: Date, calendar: Calendar) {
        let t = calendar.startOfDay(for: date)
        if let through, t < through { return }
        catchUp(today: t, calendar: calendar)
        if answerDay == t {
            streak = baseStreak; misses = baseMisses
        } else {
            baseStreak = streak; baseMisses = misses; baseLongest = longest
        }
        if hit { streak += 1; misses = 0 } else { applyMiss() }
        longest = max(baseLongest, streak)
        answerDay = t; answerHit = hit; through = t
    }

    private mutating func applyMiss() {
        misses += 1
        if misses >= 2 { streak = 0 }
    }

    private func days(from a: Date, to b: Date, _ calendar: Calendar) -> Int {
        calendar.dateComponents([.day], from: calendar.startOfDay(for: a), to: calendar.startOfDay(for: b)).day ?? 0
    }
}

/// Water and morning-light counts for one calendar day; zero on any new day.
struct DayCounts: Codable, Equatable {
    private(set) var day: Date
    var water = 0
    var lightMinutes = 0

    init(for date: Date, calendar: Calendar) {
        day = calendar.startOfDay(for: date)
    }

    mutating func roll(to date: Date, calendar: Calendar) {
        let t = calendar.startOfDay(for: date)
        guard t != day else { return }
        day = t; water = 0; lightMinutes = 0
    }
}
