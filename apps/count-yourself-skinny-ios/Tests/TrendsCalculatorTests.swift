import XCTest
@testable import CountYourselfSkinny

final class TrendsCalculatorTests: XCTestCase {
    var cal: Calendar!

    override func setUp() {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/New_York")!
        c.firstWeekday = 1 // Sunday
        cal = c
    }

    func date(_ day: Int, _ h: Int = 12) -> Date {
        cal.date(from: DateComponents(year: 2026, month: 11, day: day, hour: h))!
    }
    func meal(_ day: Int, mins: Double = 10, chews: Int, bites: Int, hour: Int = 12) -> MealRecord {
        let s = date(day, hour)
        return MealRecord(id: UUID(), start: s, end: s.addingTimeInterval(mins * 60), chews: chews, bites: bites)
    }

    func testEmptyState() {
        XCTAssertTrue(TrendsCalculator.weeks(from: [], calendar: cal).isEmpty)
        XCTAssertNil(TrendsCalculator.change(from: []))
    }

    func testGroupsByCalendarWeekOldestFirst() {
        // Nov 1 2026 is a Sunday. Nov 1-7 = week A, Nov 8-14 = week B.
        let rows = TrendsCalculator.weeks(from: [
            meal(9, chews: 100, bites: 10), meal(2, chews: 100, bites: 10), meal(6, chews: 100, bites: 10),
        ], calendar: cal)
        XCTAssertEqual(rows.count, 2)
        XCTAssertEqual(rows[0].weekStart, cal.startOfDay(for: date(1)))
        XCTAssertEqual(rows[0].mealCount, 2)
        XCTAssertEqual(rows[1].weekStart, cal.startOfDay(for: date(8)))
        XCTAssertEqual(rows[1].mealCount, 1)
    }

    func testWeekStartFollowsCalendarFirstWeekday() {
        cal.firstWeekday = 2 // Monday
        let rows = TrendsCalculator.weeks(from: [meal(4, chews: 100, bites: 10)], calendar: cal) // Wed Nov 4
        XCTAssertEqual(rows[0].weekStart, cal.startOfDay(for: date(2)))
    }

    func testAverages() {
        // week: 300 chews in 10 min, 100 chews in 5 min
        // pooled: 400 chews / 2 meals = 200 per meal; 15 min / 2 = 7.5 min per meal; 400 / 15 = 26.667 per min
        let rows = TrendsCalculator.weeks(from: [
            meal(2, mins: 10, chews: 300, bites: 10),
            meal(3, mins: 5, chews: 100, bites: 5),
        ], calendar: cal)
        XCTAssertEqual(rows[0].averageChewsPerMeal, 200, accuracy: 0.001)
        XCTAssertEqual(rows[0].averageMinutesPerMeal, 7.5, accuracy: 0.001)
        XCTAssertEqual(rows[0].averageChewsPerMinute, 400.0 / 15.0, accuracy: 0.001)
    }

    func testPaceDiffersFromChewsPerMeal() {
        let rows = TrendsCalculator.weeks(from: [meal(2, mins: 20, chews: 400, bites: 10)], calendar: cal)
        XCTAssertEqual(rows[0].averageChewsPerMeal, 400, accuracy: 0.001)
        XCTAssertEqual(rows[0].averageMinutesPerMeal, 20, accuracy: 0.001)
        XCTAssertEqual(rows[0].averageChewsPerMinute, 20, accuracy: 0.001)
    }

    func testZeroBitesMealStillCounts() {
        let rows = TrendsCalculator.weeks(from: [
            meal(2, mins: 10, chews: 300, bites: 10),
            meal(3, mins: 10, chews: 500, bites: 0),
        ], calendar: cal)
        XCTAssertEqual(rows[0].mealCount, 2)
        XCTAssertEqual(rows[0].averageChewsPerMeal, 400, accuracy: 0.001)
    }

    func testIgnoresMealsUnder30Seconds() {
        let short = meal(2, mins: 29.0 / 60, chews: 50, bites: 5)
        let exact = meal(2, mins: 0.5, chews: 40, bites: 4)
        let rows = TrendsCalculator.weeks(from: [short, exact], calendar: cal)
        XCTAssertEqual(rows[0].mealCount, 1)
        XCTAssertEqual(rows[0].averageChewsPerMeal, 40, accuracy: 0.001)
        XCTAssertEqual(rows[0].averageMinutesPerMeal, 0.5, accuracy: 0.001)
    }

    func testOnlyShortMealsGivesEmpty() {
        let short = meal(2, mins: 0.1, chews: 5, bites: 1)
        XCTAssertTrue(TrendsCalculator.weeks(from: [short], calendar: cal).isEmpty)
    }

    func testChangeLatestVsPrevious() {
        let rows = TrendsCalculator.weeks(from: [
            meal(2, mins: 10, chews: 200, bites: 6),   // 200/meal, 10 min, 20/min
            meal(9, mins: 15, chews: 450, bites: 14),  // 450/meal, 15 min, 30/min
        ], calendar: cal)
        let c = TrendsCalculator.change(from: rows)!
        XCTAssertEqual(c.chewsPerMeal, 250, accuracy: 0.001)
        XCTAssertEqual(c.minutesPerMeal, 5, accuracy: 0.001)
        XCTAssertEqual(c.chewsPerMinute, 10, accuracy: 0.001)
    }

    func testChangeUsesLatestTwoWeeksEvenWithGap() {
        let rows = TrendsCalculator.weeks(from: [
            meal(2, chews: 100, bites: 3), meal(16, chews: 300, bites: 9), meal(23, chews: 250, bites: 7),
        ], calendar: cal)
        XCTAssertEqual(TrendsCalculator.change(from: rows)!.chewsPerMeal, -50, accuracy: 0.001)
    }

    func testChangeNilWithSingleWeek() {
        let rows = TrendsCalculator.weeks(from: [meal(2, chews: 100, bites: 3)], calendar: cal)
        XCTAssertNil(TrendsCalculator.change(from: rows))
    }
}
