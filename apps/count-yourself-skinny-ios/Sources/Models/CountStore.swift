import Foundation
import HealthKit

/// Local-first store for the five daily counts + streak.
/// No PHI, no account required; optional Cognito link comes later (funnel spec §3).
@MainActor
final class CountStore: ObservableObject {
    // Today's counts
    @Published var steps: Int = 0
    @Published var lastBite: Date?          // fast clock anchor
    @Published var lightMinutesToday: Int = 0
    @Published var waterBeforeNoon: Int = 0 // glasses, target 2
    @Published var hitToday: Bool = false   // the one daily yes/no
    @Published var streak: Int = 0
    @Published var weighIns: [WeighIn] = [] // weekly, trend line only

    struct WeighIn: Codable, Identifiable {
        var id: Date { date }
        let date: Date
        let pounds: Double
    }

    private let healthStore = HKHealthStore()
    private let defaults = UserDefaults.standard

    init() { load() }

    // MARK: fast clock
    var fastHours: Double {
        guard let lastBite else { return 0 }
        return Date().timeIntervalSince(lastBite) / 3600
    }
    func tapLastBite() {
        lastBite = Date()
        save()
    }

    // MARK: streak — "never miss twice" logic lives in notifications (see StreakGuard)
    func closeOutDay(hit: Bool) {
        hitToday = hit
        streak = hit ? streak + 1 : 0
        save()
    }

    func logWeighIn(pounds: Double) {
        weighIns.append(WeighIn(date: .now, pounds: pounds))
        save()
    }

    // MARK: HealthKit steps (read-only)
    func requestSteps() async {
        guard HKHealthStore.isHealthDataAvailable(),
              let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return }
        try? await healthStore.requestAuthorization(toShare: [], read: [stepType])
        let start = Calendar.current.startOfDay(for: .now)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: .now)
        let query = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, stats, _ in
            let count = Int(stats?.sumQuantity()?.doubleValue(for: .count()) ?? 0)
            Task { @MainActor in self.steps = count }
        }
        healthStore.execute(query)
    }

    // MARK: persistence (UserDefaults for v1 skeleton; SwiftData when schema settles)
    private func load() {
        streak = defaults.integer(forKey: "streak")
        lastBite = defaults.object(forKey: "lastBite") as? Date
        if let data = defaults.data(forKey: "weighIns"),
           let decoded = try? JSONDecoder().decode([WeighIn].self, from: data) {
            weighIns = decoded
        }
    }
    private func save() {
        defaults.set(streak, forKey: "streak")
        defaults.set(lastBite, forKey: "lastBite")
        if let data = try? JSONEncoder().encode(weighIns) {
            defaults.set(data, forKey: "weighIns")
        }
    }
}
