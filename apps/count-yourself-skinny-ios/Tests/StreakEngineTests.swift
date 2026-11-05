import XCTest
@testable import CountYourselfSkinny

final class StreakEngineTests: XCTestCase {
    var cal: Calendar!

    override func setUp() {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/New_York")!
        cal = c
    }

    func d(_ y: Int, _ m: Int, _ day: Int, _ h: Int = 12, _ min: Int = 0) -> Date {
        cal.date(from: DateComponents(year: y, month: m, day: day, hour: h, minute: min))!
    }

    // 2026-11-02 is a Monday.
    func testYesAddsOne() {
        var e = StreakEngine()
        e.answer(true, on: d(2026, 11, 2), calendar: cal)
        XCTAssertEqual(e.streak, 1)
        e.answer(true, on: d(2026, 11, 3), calendar: cal)
        XCTAssertEqual(e.streak, 2)
        XCTAssertEqual(e.longest, 2)
    }

    func testOneMissKeepsStreak() {
        var e = StreakEngine()
        e.answer(true, on: d(2026, 11, 2), calendar: cal)
        e.answer(true, on: d(2026, 11, 3), calendar: cal)
        e.answer(false, on: d(2026, 11, 4), calendar: cal)
        XCTAssertEqual(e.streak, 2)
    }

    func testYesAfterOneMissContinues() {
        var e = StreakEngine()
        e.answer(true, on: d(2026, 11, 2), calendar: cal)
        e.answer(false, on: d(2026, 11, 3), calendar: cal)
        e.answer(true, on: d(2026, 11, 4), calendar: cal)
        XCTAssertEqual(e.streak, 2)
    }

    func testSecondMissInARowResets() {
        var e = StreakEngine()
        e.answer(true, on: d(2026, 11, 2), calendar: cal)
        e.answer(true, on: d(2026, 11, 3), calendar: cal)
        e.answer(false, on: d(2026, 11, 4), calendar: cal)
        e.answer(false, on: d(2026, 11, 5), calendar: cal)
        XCTAssertEqual(e.streak, 0)
        XCTAssertEqual(e.longest, 2)
    }

    func testMissesNotConsecutiveDoNotReset() {
        var e = StreakEngine()
        e.answer(true, on: d(2026, 11, 2), calendar: cal)
        e.answer(false, on: d(2026, 11, 3), calendar: cal)
        e.answer(true, on: d(2026, 11, 4), calendar: cal)
        e.answer(false, on: d(2026, 11, 5), calendar: cal)
        XCTAssertEqual(e.streak, 2)
    }

    func testUnansweredDaysCountAsMisses() {
        var e = StreakEngine()
        e.answer(true, on: d(2026, 11, 2), calendar: cal)      // Monday yes
        e.answer(true, on: d(2026, 11, 5), calendar: cal)      // Thursday: Tue+Wed missed -> reset, then 1
        XCTAssertEqual(e.streak, 1)
        XCTAssertEqual(e.longest, 1)
    }

    func testExactlyOneSkippedDayIsOneMiss() {
        var e = StreakEngine()
        e.answer(true, on: d(2026, 11, 2), calendar: cal)
        e.answer(true, on: d(2026, 11, 4), calendar: cal)      // Tuesday skipped
        XCTAssertEqual(e.streak, 2)
    }

    func testCatchUpWithoutAnswerAppliesMisses() {
        var e = StreakEngine()
        e.answer(true, on: d(2026, 11, 2), calendar: cal)
        e.answer(true, on: d(2026, 11, 3), calendar: cal)
        e.catchUp(today: d(2026, 11, 4), calendar: cal)        // nothing missed yet: today is open
        XCTAssertEqual(e.streak, 2)
        e.catchUp(today: d(2026, 11, 5), calendar: cal)        // Wed missed once
        XCTAssertEqual(e.streak, 2)
        e.catchUp(today: d(2026, 11, 6), calendar: cal)        // Wed + Thu missed
        XCTAssertEqual(e.streak, 0)
        e.catchUp(today: d(2026, 11, 6), calendar: cal)        // idempotent
        XCTAssertEqual(e.streak, 0)
    }

    func testCatchUpIsIdempotentForSingleMiss() {
        var e = StreakEngine()
        e.answer(true, on: d(2026, 11, 2), calendar: cal)
        e.catchUp(today: d(2026, 11, 4), calendar: cal)
        e.catchUp(today: d(2026, 11, 4), calendar: cal)
        XCTAssertEqual(e.streak, 1)
    }

    func testChangingAnswerYesToNoRecalculates() {
        var e = StreakEngine()
        e.answer(true, on: d(2026, 11, 2), calendar: cal)
        e.answer(true, on: d(2026, 11, 3), calendar: cal)
        e.answer(false, on: d(2026, 11, 3, 20), calendar: cal)
        XCTAssertEqual(e.streak, 1)
        XCTAssertEqual(e.longest, 1, "a corrected answer must not leave an unearned longest streak")
    }

    func testChangingAnswerNoToYesRecalculates() {
        var e = StreakEngine()
        e.answer(true, on: d(2026, 11, 2), calendar: cal)
        e.answer(false, on: d(2026, 11, 3), calendar: cal)
        e.answer(true, on: d(2026, 11, 3, 22), calendar: cal)
        XCTAssertEqual(e.streak, 2)
    }

    func testSameAnswerTwiceDoesNotDoubleCount() {
        var e = StreakEngine()
        e.answer(true, on: d(2026, 11, 2), calendar: cal)
        e.answer(true, on: d(2026, 11, 2, 21), calendar: cal)
        XCTAssertEqual(e.streak, 1)
    }

    func testChangeAnswerToNoAfterMissInRowResets() {
        var e = StreakEngine()
        e.answer(true, on: d(2026, 11, 2), calendar: cal)
        e.answer(true, on: d(2026, 11, 3), calendar: cal)
        e.answer(false, on: d(2026, 11, 4), calendar: cal)
        e.answer(true, on: d(2026, 11, 5), calendar: cal)      // 3
        e.answer(false, on: d(2026, 11, 5, 23), calendar: cal) // back to 2 (one miss since Wed was a miss -> Thu is another? no, Wed miss, Thu miss => reset)
        XCTAssertEqual(e.streak, 0)
    }

    func testLongestStreakKept() {
        var e = StreakEngine()
        for day in 2...6 { e.answer(true, on: d(2026, 11, day), calendar: cal) }
        e.answer(false, on: d(2026, 11, 7), calendar: cal)
        e.answer(false, on: d(2026, 11, 8), calendar: cal)
        e.answer(true, on: d(2026, 11, 9), calendar: cal)
        XCTAssertEqual(e.streak, 1)
        XCTAssertEqual(e.longest, 5)
    }

    func testMissedYesterday() {
        var e = StreakEngine()
        XCTAssertFalse(e.missedYesterday(today: d(2026, 11, 2), calendar: cal))
        e.answer(true, on: d(2026, 11, 2), calendar: cal)
        XCTAssertFalse(e.missedYesterday(today: d(2026, 11, 3), calendar: cal))
        e.answer(false, on: d(2026, 11, 3), calendar: cal)
        XCTAssertTrue(e.missedYesterday(today: d(2026, 11, 4), calendar: cal))
        e.catchUp(today: d(2026, 11, 4), calendar: cal)
        XCTAssertTrue(e.missedYesterday(today: d(2026, 11, 4), calendar: cal))
        // unanswered yesterday
        var f = StreakEngine()
        f.answer(true, on: d(2026, 11, 2), calendar: cal)
        XCTAssertTrue(f.missedYesterday(today: d(2026, 11, 4), calendar: cal))
    }

    func testTodayAnswer() {
        var e = StreakEngine()
        XCTAssertNil(e.answer(on: d(2026, 11, 2), calendar: cal))
        e.answer(false, on: d(2026, 11, 2), calendar: cal)
        XCTAssertEqual(e.answer(on: d(2026, 11, 2, 23, 59), calendar: cal), false)
        XCTAssertNil(e.answer(on: d(2026, 11, 3), calendar: cal))
    }

    func testSpringForwardDST() {
        // 2026-03-08 is a 23-hour day in New York. Sat yes, Mon: Sunday is exactly one miss.
        var e = StreakEngine()
        e.answer(true, on: d(2026, 3, 7, 23, 30), calendar: cal)
        e.answer(true, on: d(2026, 3, 9, 0, 30), calendar: cal)
        XCTAssertEqual(e.streak, 2)
        e.answer(true, on: d(2026, 3, 10, 0, 5), calendar: cal)
        XCTAssertEqual(e.streak, 3)
    }

    func testFallBackDST() {
        // 2026-11-01 is a 25-hour day. Sat 23:30 -> Mon 00:30 is 26 real hours; Sunday is one miss, not zero.
        var e = StreakEngine()
        e.answer(true, on: d(2026, 10, 31, 23, 30), calendar: cal)
        e.answer(true, on: d(2026, 11, 2, 0, 30), calendar: cal)
        XCTAssertEqual(e.streak, 2)
        // and two skipped days across the boundary reset
        var f = StreakEngine()
        f.answer(true, on: d(2026, 10, 31, 23, 30), calendar: cal)
        f.answer(true, on: d(2026, 11, 3, 0, 30), calendar: cal)
        XCTAssertEqual(f.streak, 1)
    }

    func testCodableRoundTrip() throws {
        var e = StreakEngine()
        e.answer(true, on: d(2026, 11, 2), calendar: cal)
        e.answer(false, on: d(2026, 11, 3), calendar: cal)
        let data = try JSONEncoder().encode(e)
        var back = try JSONDecoder().decode(StreakEngine.self, from: data)
        XCTAssertEqual(back, e)
        back.answer(true, on: d(2026, 11, 3, 22), calendar: cal)
        XCTAssertEqual(back.streak, 2)
    }
}

final class DayCountsTests: XCTestCase {
    var cal: Calendar!
    override func setUp() {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/New_York")!
        cal = c
    }
    func d(_ day: Int, _ h: Int) -> Date {
        cal.date(from: DateComponents(year: 2026, month: 11, day: day, hour: h))!
    }

    func testStartsZero() {
        let c = DayCounts(for: d(2, 8), calendar: cal)
        XCTAssertEqual(c.water, 0)
        XCTAssertEqual(c.lightMinutes, 0)
    }

    func testSameDayKeepsValues() {
        var c = DayCounts(for: d(2, 8), calendar: cal)
        c.water = 2; c.lightMinutes = 10
        c.roll(to: d(2, 23), calendar: cal)
        XCTAssertEqual(c.water, 2)
        XCTAssertEqual(c.lightMinutes, 10)
    }

    func testNewDayZeroes() {
        var c = DayCounts(for: d(2, 8), calendar: cal)
        c.water = 2; c.lightMinutes = 10
        c.roll(to: d(3, 0), calendar: cal)
        XCTAssertEqual(c.water, 0)
        XCTAssertEqual(c.lightMinutes, 0)
        XCTAssertEqual(c.day, cal.startOfDay(for: d(3, 5)))
    }
}
