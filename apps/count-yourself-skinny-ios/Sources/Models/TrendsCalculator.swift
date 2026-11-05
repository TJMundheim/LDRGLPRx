import Foundation

struct WeekTrend: Equatable {
    let weekStart: Date
    let mealCount: Int
    let averageChewsPerMeal: Double
    let averageMinutesPerMeal: Double
    let averageChewsPerMinute: Double
}

struct TrendChange: Equatable {
    /// Latest week minus previous week.
    let chewsPerMeal: Double
    let minutesPerMeal: Double
    let chewsPerMinute: Double
}

/// Pure weekly roll-up. Averages are pooled (total chews or minutes over meal count; chews per minute is total chews over total minutes).
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
            let minutes = group.reduce(0) { $0 + $1.duration } / 60
            let chews = Double(group.reduce(0) { $0 + $1.chews })
            return WeekTrend(
                weekStart: week,
                mealCount: group.count,
                averageChewsPerMeal: chews / Double(group.count),
                averageMinutesPerMeal: minutes / Double(group.count),
                averageChewsPerMinute: chews / minutes
            )
        }
    }

    /// Latest vs previous week in the list (oldest-first input). nil with fewer than two weeks.
    static func change(from rows: [WeekTrend]) -> TrendChange? {
        guard rows.count >= 2 else { return nil }
        let a = rows[rows.count - 2], b = rows[rows.count - 1]
        return TrendChange(chewsPerMeal: b.averageChewsPerMeal - a.averageChewsPerMeal,
                           minutesPerMeal: b.averageMinutesPerMeal - a.averageMinutesPerMeal,
                           chewsPerMinute: b.averageChewsPerMinute - a.averageChewsPerMinute)
    }
}
