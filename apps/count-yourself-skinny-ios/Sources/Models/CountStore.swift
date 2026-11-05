import Foundation
import HealthKit

/// Local store for the daily counts and streak. No account; nothing here leaves the phone.
@MainActor
final class CountStore: ObservableObject {
    // Today's counts
    @Published var steps: Int = 0
    @Published var lastBite: Date?          // fast clock anchor
    @Published private(set) var lightMinutesToday: Int = 0 { didSet { counts.lightMinutes = lightMinutesToday; save() } }
    @Published private(set) var waterBeforeNoon: Int = 0 { didSet { counts.water = waterBeforeNoon; save() } } // glasses, target 2
    @Published private(set) var streak: Int = 0
    @Published private(set) var longestStreak: Int = 0
    /// Today's yes/no, nil until answered.
    @Published private(set) var todayAnswer: Bool?
    /// True when yesterday was not a yes: drives the "Never miss twice" prompt.
    @Published private(set) var missedYesterday: Bool = false
    @Published private(set) var weighIns: [WeighIn] = [] // weekly, trend line only
    /// Set after a steps refresh that returned nothing, so the screen can say why.
    @Published private(set) var stepsNeedHelp = false
    /// The morning walk in progress. Kept here so leaving the screen doesn't lose it.
    @Published private(set) var walk: LightSession?
    /// The Home card that points to the Brain Check. See NextDoorRule.
    @Published private(set) var showNextDoor = false

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
    private var nextDoor: NextDoorRule
    private var loading = false
    private let healthEntitled: Bool

    /// Debug is the build a free Apple ID can install, and it has no HealthKit entitlement
    /// (see project.yml), so it never calls HealthKit.
    nonisolated static var defaultHealthEntitled: Bool {
        #if DEBUG
        return false
        #else
        return true
        #endif
    }

    init(defaults: UserDefaults = .standard, now: @escaping () -> Date = Date.init, calendar: Calendar = .current,
         healthEntitled: Bool = CountStore.defaultHealthEntitled) {
        self.defaults = defaults
        self.now = now
        self.calendar = calendar
        self.healthEntitled = healthEntitled
        self.counts = DayCounts(for: now(), calendar: calendar)
        self.nextDoor = NextDoorRule(firstUse: now())
        load()
        rollover()
    }

    // MARK: fast clock
    var fastHours: Double? { FastClock.activeHours(lastBite: lastBite, now: now()) }
    func tapLastBite() {
        rollover()
        lastBite = now()
        save()
    }

    // MARK: day rollover + streak ("never miss twice"; see StreakEngine)

    /// Call at launch and whenever the app returns to the foreground.
    func rollover() {
        let t = now()
        let newDay = counts.day != calendar.startOfDay(for: t)
        counts.roll(to: t, calendar: calendar)
        engine.catchUp(today: t, calendar: calendar)
        if newDay { steps = 0; stepsNeedHelp = false }
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

    // MARK: next door card
    func dismissNextDoor() {
        nextDoor.dismiss(streak: engine.streak, longest: engine.longest, now: now(), calendar: calendar)
        publish()
        save()
    }

    /// True once per milestone, for the analytics event.
    func markNextDoorShown() -> Bool {
        let first = nextDoor.markShown(streak: engine.streak, longest: engine.longest, now: now(), calendar: calendar)
        save()
        return first
    }

    // MARK: water + light (always roll the day over first; the app may have stayed open past midnight)
    /// Adds a glass up to 2; tapping at 2 resets to 0 (the undo for a mistaken tap).
    func tapWater() {
        rollover()
        waterBeforeNoon = waterBeforeNoon >= 2 ? 0 : waterBeforeNoon + 1
    }

    func creditLight(minutes: Int) {
        guard minutes > 0 else { return }
        rollover()
        lightMinutesToday = min(Int(LightSession.target / 60), lightMinutesToday + minutes)
    }

    // MARK: morning walk (light counted from dates: the phone is in a pocket, the app suspended)
    func startWalk() {
        guard walk == nil else { return }
        var session = LightSession()
        session.start(at: now())
        walk = session
    }

    func creditWalk() {
        guard var session = walk else { return }
        let due = session.minutesDue(at: now())
        guard due > 0 else { return }
        creditLight(minutes: due)
        session.markCredited(due)
        walk = session
    }

    func finishWalk() {
        creditWalk()
        walk = nil
    }

    // MARK: weigh-in (weekly; a weigh-in inside the last 6 days is corrected, not added)
    var daysUntilNextWeighIn: Int {
        WeighInSchedule.daysUntilDue(last: weighIns.last?.date, now: now(), calendar: calendar)
    }

    func logWeighIn(pounds: Double) {
        rollover()
        let entry = WeighIn(date: now(), pounds: pounds)
        if daysUntilNextWeighIn > 0, let last = weighIns.last {
            // a correction keeps the original date so the weekly rhythm doesn't slide
            weighIns[weighIns.count - 1] = WeighIn(date: last.date, pounds: pounds)
        }
        else { weighIns.append(entry) }
        save()
    }

    // MARK: HealthKit steps (read-only)
    /// Reads today's steps. Health hides whether read access was denied, so "nothing came back"
    /// is the signal to show the one-line help.
    func requestSteps() async {
        rollover()
        guard healthEntitled, HKHealthStore.isHealthDataAvailable(),
              let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            stepsNeedHelp = true
            return
        }
        try? await healthStore.requestAuthorization(toShare: [], read: [stepType])
        let start = calendar.startOfDay(for: now())
        let predicate = HKQuery.predicateForSamples(withStart: start, end: now())
        let store = healthStore
        let count: Int = await withCheckedContinuation { cont in
            let query = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate,
                                          options: .cumulativeSum) { _, stats, _ in
                cont.resume(returning: Int(stats?.sumQuantity()?.doubleValue(for: .count()) ?? 0))
            }
            store.execute(query)
        }
        steps = count
        stepsNeedHelp = count == 0
    }

    // MARK: persistence (UserDefaults)
    private func publish() {
        loading = true
        defer { loading = false }
        streak = engine.streak
        longestStreak = engine.longest
        todayAnswer = engine.answer(on: now(), calendar: calendar)
        missedYesterday = engine.missedYesterday(today: now(), calendar: calendar)
        waterBeforeNoon = counts.water
        lightMinutesToday = counts.lightMinutes
        showNextDoor = nextDoor.shows(streak: engine.streak, longest: engine.longest, now: now(), calendar: calendar)
    }

    private func load() {
        loading = true
        defer { loading = false }
        lastBite = defaults.object(forKey: "lastBite") as? Date
        if let data = defaults.data(forKey: "streakEngine"),
           let decoded = try? JSONDecoder().decode(StreakEngine.self, from: data) { engine = decoded }
        if let data = defaults.data(forKey: "dayCounts"),
           let decoded = try? JSONDecoder().decode(DayCounts.self, from: data) { counts = decoded }
        if let data = defaults.data(forKey: "nextDoor"),
           let decoded = try? JSONDecoder().decode(NextDoorRule.self, from: data) { nextDoor = decoded }
        if let data = defaults.data(forKey: "weighIns"),
           let decoded = try? JSONDecoder().decode([WeighIn].self, from: data) { weighIns = decoded }
    }

    private func save() {
        guard !loading else { return }
        defaults.set(lastBite, forKey: "lastBite")
        if let data = try? JSONEncoder().encode(engine) { defaults.set(data, forKey: "streakEngine") }
        if let data = try? JSONEncoder().encode(counts) { defaults.set(data, forKey: "dayCounts") }
        if let data = try? JSONEncoder().encode(nextDoor) { defaults.set(data, forKey: "nextDoor") }
        if let data = try? JSONEncoder().encode(weighIns) { defaults.set(data, forKey: "weighIns") }
    }
}
