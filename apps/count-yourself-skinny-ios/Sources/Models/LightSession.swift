import Foundation

/// The 10-minute First Light timer as pure data. It stores dates, never a tick count,
/// so backgrounding the app can't lose time. Credits whole minutes only.
struct LightSession: Equatable {
    static let target: TimeInterval = 600

    private(set) var runningSince: Date?
    private var banked: TimeInterval = 0
    private(set) var credited = 0

    var isRunning: Bool { runningSince != nil }

    func elapsed(at date: Date) -> TimeInterval {
        let live = runningSince.map { max(0, date.timeIntervalSince($0)) } ?? 0
        return min(Self.target, banked + live)
    }

    func remaining(at date: Date) -> TimeInterval { Self.target - elapsed(at: date) }
    func isFinished(at date: Date) -> Bool { elapsed(at: date) >= Self.target }

    /// Whole minutes elapsed that have not yet been handed to the store.
    func minutesDue(at date: Date) -> Int {
        max(0, Int(elapsed(at: date) / 60) - credited)
    }

    mutating func markCredited(_ minutes: Int) { credited += minutes }

    mutating func start(at date: Date) {
        guard runningSince == nil else { return }
        runningSince = date
    }

    mutating func pause(at date: Date) {
        guard runningSince != nil else { return }
        banked = elapsed(at: date)
        runningSince = nil
    }
}

/// Weigh once a week: same scale, same morning. Trend line only.
enum WeighInSchedule {
    /// 0 when a weigh-in is due (or none exists yet); otherwise whole days to wait.
    static func daysUntilDue(last: Date?, now: Date, calendar: Calendar) -> Int {
        guard let last else { return 0 }
        let gone = calendar.dateComponents([.day], from: calendar.startOfDay(for: last),
                                           to: calendar.startOfDay(for: now)).day ?? 0
        return max(0, 7 - gone)
    }
}
