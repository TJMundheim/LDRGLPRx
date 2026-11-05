import Foundation

struct WeekTrend: Equatable {
    let weekStart: Date
    let mealCount: Int
    /// nil when the week has no meal with a completed bite.
    let averageChewsPerBite: Double?
    let averageChewsPerMinute: Double?
}

struct TrendChange: Equatable {
    /// Latest week minus previous week; nil when either side is missing.
    let chewsPerBite: Double?
    let chewsPerMinute: Double?
}

/// Pure weekly roll-up. Averages are pooled (total chews over total bites or minutes).
enum TrendsCalculator {
    static let minimumMealSeconds: TimeInterval = 30

    /// Oldest week first. Meals under 30 seconds are ignored.
    static func weeks(from meals: [MealRecord], calendar: Calendar = .current) -> [WeekTrend] {
        let valid = meals.filter { $0.duration >= minimumMealSeconds }
        let grouped = Dictionary(grouping: valid) {
            calendar.dateInterval(of: .weekOfYear, for: $0.start)?.start ?? calendar.startOfDay(for: $0.start)
        }
        return grouped.keys.sorted().map { week in
            let group = grouped[week]!
            let withBites = group.filter { $0.bites > 0 }
            let bites = withBites.reduce(0) { $0 + $1.bites }
            let minutes = group.reduce(0) { $0 + $1.duration } / 60
            return WeekTrend(
                weekStart: week,
                mealCount: group.count,
                averageChewsPerBite: bites > 0 ? Double(withBites.reduce(0) { $0 + $1.chews }) / Double(bites) : nil,
                averageChewsPerMinute: minutes > 0 ? Double(group.reduce(0) { $0 + $1.chews }) / minutes : nil
            )
        }
    }

    /// Latest vs previous week in the list (oldest-first input). nil with fewer than two weeks.
    static func change(from rows: [WeekTrend]) -> TrendChange? {
        guard rows.count >= 2 else { return nil }
        let a = rows[rows.count - 2], b = rows[rows.count - 1]
        func diff(_ x: Double?, _ y: Double?) -> Double? {
            guard let x, let y else { return nil }
            return y - x
        }
        return TrendChange(chewsPerBite: diff(a.averageChewsPerBite, b.averageChewsPerBite),
                           chewsPerMinute: diff(a.averageChewsPerMinute, b.averageChewsPerMinute))
    }
}
