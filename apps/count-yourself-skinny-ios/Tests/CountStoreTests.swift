import XCTest
@testable import CountYourselfSkinny

@MainActor
final class CountStoreTests: XCTestCase {
    var cal: Calendar!
    var suite: String!
    var defaults: UserDefaults!
    var clock: Date!

    override func setUp() {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/New_York")!
        cal = c
        suite = "cys.tests.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suite)
        clock = d(2, 8)
    }
    override func tearDown() {
        defaults.removePersistentDomain(forName: suite)
    }

    func d(_ day: Int, _ h: Int) -> Date {
        cal.date(from: DateComponents(year: 2026, month: 11, day: day, hour: h))!
    }
    func makeStore() -> CountStore {
        CountStore(defaults: defaults, now: { [unowned self] in self.clock }, calendar: cal)
    }

    func testAnswerTodayBuildsStreak() {
        let s = makeStore()
        XCTAssertNil(s.todayAnswer)
        s.answerToday(hit: true)
        XCTAssertEqual(s.streak, 1)
        XCTAssertEqual(s.todayAnswer, true)
        s.answerToday(hit: false)
        XCTAssertEqual(s.streak, 0)
        XCTAssertEqual(s.todayAnswer, false)
    }

    func testRolloverZeroesCountsAndClearsAnswer() {
        let s = makeStore()
        s.tapWater(); s.tapWater()
        s.creditLight(minutes: 10)
        s.answerToday(hit: true)
        clock = d(3, 7)
        s.rollover()
        XCTAssertEqual(s.waterBeforeNoon, 0)
        XCTAssertEqual(s.lightMinutesToday, 0)
        XCTAssertNil(s.todayAnswer)
        XCTAssertEqual(s.streak, 1)
        XCTAssertFalse(s.missedYesterday)
    }

    func testRolloverAfterSilentDaysAppliesMisses() {
        let s = makeStore()
        s.answerToday(hit: true)
        clock = d(3, 9); s.rollover()
        clock = d(4, 9); s.rollover()
        XCTAssertEqual(s.streak, 1)
        XCTAssertTrue(s.missedYesterday)
        clock = d(5, 9); s.rollover()
        XCTAssertEqual(s.streak, 0)
    }

    func testPersistsAcrossRelaunch() {
        let s = makeStore()
        s.answerToday(hit: true)
        s.tapWater()
        s.creditLight(minutes: 7)
        s.tapLastBite()
        s.logWeighIn(pounds: 201.5)
        clock = d(2, 12)
        let t = makeStore()
        XCTAssertEqual(t.streak, 1)
        XCTAssertEqual(t.longestStreak, 1)
        XCTAssertEqual(t.todayAnswer, true)
        XCTAssertEqual(t.waterBeforeNoon, 1)
        XCTAssertEqual(t.lightMinutesToday, 7)
        XCTAssertEqual(t.lastBite, d(2, 8))
        XCTAssertEqual(t.weighIns.count, 1)
        XCTAssertEqual(t.weighIns.first?.pounds, 201.5)
    }

    func testRelaunchNextDayZeroesCountsKeepsStreak() {
        let s = makeStore()
        s.answerToday(hit: true)
        s.tapWater(); s.tapWater()
        clock = d(3, 8)
        let t = makeStore()
        XCTAssertEqual(t.waterBeforeNoon, 0)
        XCTAssertEqual(t.streak, 1)
        XCTAssertNil(t.todayAnswer)
    }

    func testRelaunchAfterTwoSilentDaysResets() {
        let s = makeStore()
        s.answerToday(hit: true)
        clock = d(5, 8)
        let t = makeStore()
        XCTAssertEqual(t.streak, 0)
        XCTAssertEqual(t.longestStreak, 1)
    }
}

// MARK: P3 free-tier behaviour
extension CountStoreTests {
    func testFreshInstallDoesNotSayMissedYesterday() {
        let s = makeStore()
        XCTAssertFalse(s.missedYesterday)
        clock = d(2, 21)
        s.rollover()
        XCTAssertFalse(s.missedYesterday)
        XCTAssertEqual(s.longestStreak, 0)
    }

    func testFirstLaunchDaysAfterInstallDoesNotScold() {
        let s = makeStore()
        clock = d(5, 8)
        s.rollover()
        XCTAssertFalse(s.missedYesterday)
    }

    func testWaterTapAddsThenResetsAtTwo() {
        let s = makeStore()
        s.tapWater(); XCTAssertEqual(s.waterBeforeNoon, 1)
        s.tapWater(); XCTAssertEqual(s.waterBeforeNoon, 2)
        s.tapWater(); XCTAssertEqual(s.waterBeforeNoon, 0)
    }

    func testWaterTapAfterMidnightRollsOverFirst() {
        let s = makeStore()
        s.tapWater(); s.tapWater()
        clock = d(3, 7)
        s.tapWater()
        XCTAssertEqual(s.waterBeforeNoon, 1)
    }

    func testLightCreditAfterMidnightRollsOverFirst() {
        let s = makeStore()
        s.creditLight(minutes: 8)
        clock = d(3, 7)
        s.creditLight(minutes: 3)
        XCTAssertEqual(s.lightMinutesToday, 3)
    }

    func testLightCreditAccumulatesAndPersists() {
        let s = makeStore()
        s.creditLight(minutes: 4)
        s.creditLight(minutes: 2)
        XCTAssertEqual(makeStore().lightMinutesToday, 6)
    }

    func testAnswerAfterMidnightWithAppOpen() {
        let s = makeStore()
        s.answerToday(hit: true)
        clock = d(3, 21)
        s.answerToday(hit: true)
        XCTAssertEqual(s.streak, 2)
        XCTAssertEqual(s.longestStreak, 2)
    }

    func testWeighInWithinSixDaysCorrectsInsteadOfAdding() {
        let s = makeStore()
        s.logWeighIn(pounds: 200)
        clock = d(4, 8)
        s.logWeighIn(pounds: 199)
        XCTAssertEqual(s.weighIns.count, 1)
        XCTAssertEqual(s.weighIns.first?.pounds, 199)
        clock = d(9, 8)
        s.logWeighIn(pounds: 197)
        XCTAssertEqual(s.weighIns.count, 2)
    }

    func testDaysUntilNextWeighIn() {
        let s = makeStore()
        XCTAssertEqual(s.daysUntilNextWeighIn, 0)
        s.logWeighIn(pounds: 200)
        clock = d(4, 8)
        XCTAssertEqual(s.daysUntilNextWeighIn, 5)
    }
}
