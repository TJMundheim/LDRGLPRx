import XCTest
@testable import CountYourselfSkinny

final class WeighInScheduleTests: XCTestCase {
    var cal: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/New_York")!
        return c
    }()
    func d(_ day: Int, _ h: Int = 8) -> Date {
        cal.date(from: DateComponents(year: 2026, month: 11, day: day, hour: h))!
    }

    func testNoWeighInMeansDueNow() {
        XCTAssertEqual(WeighInSchedule.daysUntilDue(last: nil, now: d(2), calendar: cal), 0)
    }
    func testWithinSixDaysNotDue() {
        XCTAssertEqual(WeighInSchedule.daysUntilDue(last: d(2), now: d(3), calendar: cal), 6)
        XCTAssertEqual(WeighInSchedule.daysUntilDue(last: d(2), now: d(8, 22), calendar: cal), 1)
    }
    func testSevenDaysLaterIsDue() {
        XCTAssertEqual(WeighInSchedule.daysUntilDue(last: d(2), now: d(9, 6), calendar: cal), 0)
        XCTAssertEqual(WeighInSchedule.daysUntilDue(last: d(2), now: d(20), calendar: cal), 0)
    }
    func testSameDayIsSevenOut() {
        XCTAssertEqual(WeighInSchedule.daysUntilDue(last: d(2), now: d(2, 20), calendar: cal), 7)
    }
}
