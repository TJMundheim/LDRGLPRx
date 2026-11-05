import Foundation
import HealthKit

/// Local-first store for the daily counts + streak.
/// No PHI, no account required; optional Cognito link comes later (funnel spec §3).
@MainActor
final class CountStore: ObservableObject {
    // Today's counts
    @Published var steps: Int = 0
    @Published var lastBite: Date?          // fast clock anchor
    @Published var lightMinutesToday: Int = 0 { didSet { counts.lightMinutes = lightMinutesToday; save() } }
    @Published var waterBeforeNoon: Int = 0 { didSet { counts.water = waterBeforeNoon; save() } } // glasses, target 2
    @Published private(set) var streak: Int = 0
    @Published private(set) var longestStreak: Int = 0
    /// Today's yes/no, nil until answered.
    @Published private(set) var todayAnswer: Bool?
    /// True when yesterday was not a yes: drives the "Never miss twice" prompt.
    @Published private(set) var missedYesterday: Bool = false
    @Published var weighIns: [WeighIn] = [] // weekly, trend line only

    struct WeighIn: Codable, Identifiable {
        var id: Date { date }
        let date: Date
        let pounds: Double
    }

    private let healthStore = HKHealthStore()
    private let defaults: UserDefaults
    private let now: () -> Date
    private let calendar: Calendar
    private var engine = StreakEngine()
    private var counts: DayCounts
    private var loading = false

    init(defaults: UserDefaults = .standard, now: @escaping () -> Date = Date.init, calendar: Calendar = .current) {
        self.defaults = defaults
        self.now = now
        self.calendar = calendar
        self.counts = DayCounts(for: now(), calendar: calendar)
        load()
        rollover()
    }

    // MARK: fast clock
    var fastHours: Double {
        guard let lastBite else { return 0 }
        return now().timeIntervalSince(lastBite) / 3600
    }
    func tapLastBite() {
        lastBite = now()
        save()
    }

    // MARK: day rollover + streak ("never miss twice"; see StreakEngine)

    /// Call at launch and whenever the app returns to the foreground.
    func rollover() {
        let t = now()
        counts.roll(to: t, calendar: calendar)
        engine.catchUp(today: t, calendar: calendar)
        if counts.day != calendar.startOfDay(for: t) { counts = DayCounts(for: t, calendar: calendar) }
        publish()
        save()
    }

    /// The one daily yes/no. Answering again changes the answer; it never double counts.
    func answerToday(hit: Bool) {
        rollover()
        engine.answer(hit, on: now(), calendar: calendar)
        publish()
        save()
    }

    func logWeighIn(pounds: Double) {
        weighIns.append(WeighIn(date: now(), pounds: pounds))
        save()
    }

    // MARK: HealthKit steps (read-only)
    func requestSteps() async {
        guard HKHealthStore.isHealthDataAvailable(),
              let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return }
        try? await healthStore.requestAuthorization(toShare: [], read: [stepType])
        let start = calendar.startOfDay(for: now())
        let predicate = HKQuery.predicateForSamples(withStart: start, end: now())
        let query = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, stats, _ in
            let count = Int(stats?.sumQuantity()?.doubleValue(for: .count()) ?? 0)
            Task { @MainActor in self.steps = count }
        }
        healthStore.execute(query)
    }

    // MARK: persistence (UserDefaults for v1 skeleton; SwiftData when schema settles)
    private func publish() {
        loading = true
        defer { loading = false }
        streak = engine.streak
        longestStreak = engine.longest
        todayAnswer = engine.answer(on: now(), calendar: calendar)
        missedYesterday = engine.missedYesterday(today: now(), calendar: calendar)
        waterBeforeNoon = counts.water
        lightMinutesToday = counts.lightMinutes
    }

    private func load() {
        loading = true
        defer { loading = false }
        lastBite = defaults.object(forKey: "lastBite") as? Date
        if let data = defaults.data(forKey: "streakEngine"),
           let decoded = try? JSONDecoder().decode(StreakEngine.self, from: data) { engine = decoded }
        if let data = defaults.data(forKey: "dayCounts"),
           let decoded = try? JSONDecoder().decode(DayCounts.self, from: data) { counts = decoded }
        if let data = defaults.data(forKey: "weighIns"),
           let decoded = try? JSONDecoder().decode([WeighIn].self, from: data) { weighIns = decoded }
    }

    private func save() {
        guard !loading else { return }
        defaults.set(lastBite, forKey: "lastBite")
        if let data = try? JSONEncoder().encode(engine) { defaults.set(data, forKey: "streakEngine") }
        if let data = try? JSONEncoder().encode(counts) { defaults.set(data, forKey: "dayCounts") }
        if let data = try? JSONEncoder().encode(weighIns) { defaults.set(data, forKey: "weighIns") }
    }
}
