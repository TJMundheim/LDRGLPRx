import Foundation

/// When the Home card pointing to the My4MLife Brain Check shows. Pure value type; every
/// date is passed in.
///
/// It appears at a 30-day streak or 12 weeks after first use. Once put away it stays away
/// until the next milestone, 60 and then 90, and after 90 it is gone for good.
struct NextDoorRule: Codable, Equatable {
    static let milestones = [30, 60, 90]
    static let daysUntilTimeTrigger = 84

    private let firstUse: Date
    /// Milestones reached when the card was last put away. 0 until then.
    private var dismissedLevel = 0
    /// Milestones reached when the card was last counted as shown.
    private var shownLevel = 0

    init(firstUse: Date) {
        self.firstUse = firstUse
    }

    func shows(streak: Int, longest: Int, now: Date, calendar: Calendar) -> Bool {
        level(streak: streak, longest: longest, now: now, calendar: calendar) > dismissedLevel
    }

    mutating func dismiss(streak: Int, longest: Int, now: Date, calendar: Calendar) {
        dismissedLevel = max(dismissedLevel, level(streak: streak, longest: longest, now: now, calendar: calendar))
    }

    /// True the first time the card is on screen at a milestone, so a card scrolled off and
    /// back on, or seen again tomorrow, isn't counted twice.
    mutating func markShown(streak: Int, longest: Int, now: Date, calendar: Calendar) -> Bool {
        guard shows(streak: streak, longest: longest, now: now, calendar: calendar) else { return false }
        let current = level(streak: streak, longest: longest, now: now, calendar: calendar)
        guard current > shownLevel else { return false }
        shownLevel = current
        return true
    }

    /// How many milestones have been reached. Twelve weeks of use counts as the first one.
    private func level(streak: Int, longest: Int, now: Date, calendar: Calendar) -> Int {
        let best = max(streak, longest)
        let reached = Self.milestones.filter { best >= $0 }.count
        let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: firstUse),
                                           to: calendar.startOfDay(for: now)).day ?? 0
        return max(reached, days >= Self.daysUntilTimeTrigger ? 1 : 0)
    }
}
