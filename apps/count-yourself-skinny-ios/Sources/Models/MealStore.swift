import Foundation

/// One finished meal. Stays on the phone.
struct MealRecord: Codable, Identifiable, Equatable {
    var id: UUID
    var start: Date
    var end: Date
    var chews: Int
    var bites: Int

    var duration: TimeInterval { end.timeIntervalSince(start) }
}

/// Local-only meal log in UserDefaults. Never networked.
final class MealStore {
    static let defaultsKey = "cys.meals.v1"
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) { self.defaults = defaults }

    /// Newest first. Corrupt or foreign stored data reads as empty.
    func load() -> [MealRecord] {
        guard let data = defaults.data(forKey: Self.defaultsKey),
              let meals = try? JSONDecoder().decode([MealRecord].self, from: data) else { return [] }
        return meals.sorted { $0.start > $1.start }
    }

    /// Adds the meal, or replaces the one with the same id.
    func save(_ meal: MealRecord) {
        var meals = load().filter { $0.id != meal.id }
        meals.append(meal)
        meals.sort { $0.start > $1.start }
        if let data = try? JSONEncoder().encode(meals) {
            defaults.set(data, forKey: Self.defaultsKey)
        }
    }
}
