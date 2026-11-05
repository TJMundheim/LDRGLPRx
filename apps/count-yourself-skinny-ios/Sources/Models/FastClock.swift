import Foundation

/// The hours since the last bite. The book's ladder is 12, 14, 16, so past a day this
/// stops counting: the clock never shows a growing multi-day number, whether someone
/// forgot to tap or has actually stopped eating.
enum FastClock {
    static let stopsAfterHours: Double = 24

    /// nil when no last bite is logged, or it is a day old or more.
    static func activeHours(lastBite: Date?, now: Date) -> Double? {
        guard let lastBite else { return nil }
        let hours = max(0, now.timeIntervalSince(lastBite) / 3600)
        return hours < stopsAfterHours ? hours : nil
    }

    static func label(hours: Double?) -> String {
        hours.map { String(format: "%.1f h", $0) } ?? "Not set"
    }
}
