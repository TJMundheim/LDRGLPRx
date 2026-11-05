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
        s.waterBeforeNoon = 2
        s.lightMinutesToday = 10
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
        s.waterBeforeNoon = 1
        s.lightMinutesToday = 7
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
        s.waterBeforeNoon = 2
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
