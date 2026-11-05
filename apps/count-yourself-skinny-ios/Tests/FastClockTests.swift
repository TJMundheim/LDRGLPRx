import XCTest
@testable import CountYourselfSkinny

final class FastClockTests: XCTestCase {
    let t0 = Date(timeIntervalSince1970: 1_000_000)

    func testNoLastBiteMeansNotRunning() {
        XCTAssertNil(FastClock.activeHours(lastBite: nil, now: t0))
        XCTAssertEqual(FastClock.label(hours: nil), "Not set")
    }
    func testCountsHoursSinceLastBite() {
        let h = FastClock.activeHours(lastBite: t0, now: t0.addingTimeInterval(12.5 * 3600))
        XCTAssertEqual(h, 12.5)
        XCTAssertEqual(FastClock.label(hours: h), "12.5 h")
    }
    func testAClockSetBackNeverShowsNegativeHours() {
        XCTAssertEqual(FastClock.activeHours(lastBite: t0, now: t0.addingTimeInterval(-3600)), 0)
    }
    /// The book's ladder tops out at 16. The clock must never show a growing multi-day
    /// number, whether someone forgot to tap or is actually not eating.
    func testStopsAt24HoursInsteadOfCountingUp() {
        XCTAssertNotNil(FastClock.activeHours(lastBite: t0, now: t0.addingTimeInterval(23.9 * 3600)))
        XCTAssertNil(FastClock.activeHours(lastBite: t0, now: t0.addingTimeInterval(24 * 3600)))
        XCTAssertNil(FastClock.activeHours(lastBite: t0, now: t0.addingTimeInterval(120 * 3600)))
    }
}
