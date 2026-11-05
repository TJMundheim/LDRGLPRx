import XCTest
@testable import CountYourselfSkinny

final class LightSessionTests: XCTestCase {
    let t0 = Date(timeIntervalSince1970: 1_000_000)

    func testNothingBeforeStart() {
        let s = LightSession()
        XCTAssertEqual(s.elapsed(at: t0), 0)
        XCTAssertEqual(s.minutesDue(at: t0), 0)
        XCTAssertFalse(s.isRunning)
    }

    func testCreditsWholeMinutesOnly() {
        var s = LightSession()
        s.start(at: t0)
        XCTAssertEqual(s.minutesDue(at: t0.addingTimeInterval(59)), 0)
        XCTAssertEqual(s.minutesDue(at: t0.addingTimeInterval(61)), 1)
        XCTAssertEqual(s.minutesDue(at: t0.addingTimeInterval(179)), 2)
    }

    func testCreditedMinutesAreNotCreditedTwice() {
        var s = LightSession()
        s.start(at: t0)
        let n = s.minutesDue(at: t0.addingTimeInterval(125))
        s.markCredited(n)
        XCTAssertEqual(s.minutesDue(at: t0.addingTimeInterval(125)), 0)
        XCTAssertEqual(s.minutesDue(at: t0.addingTimeInterval(185)), 1)
    }

    func testPauseStopsTheClock() {
        var s = LightSession()
        s.start(at: t0)
        s.pause(at: t0.addingTimeInterval(90))
        XCTAssertFalse(s.isRunning)
        XCTAssertEqual(s.elapsed(at: t0.addingTimeInterval(900)), 90)
        s.start(at: t0.addingTimeInterval(1000))
        XCTAssertEqual(s.elapsed(at: t0.addingTimeInterval(1030)), 120)
    }

    func testBackgroundingIsJustALaterDate() {
        var s = LightSession()
        s.start(at: t0)
        XCTAssertEqual(s.minutesDue(at: t0.addingTimeInterval(420)), 7)
    }

    func testCapsAtTenMinutesAndFinishes() {
        var s = LightSession()
        s.start(at: t0)
        XCTAssertEqual(s.minutesDue(at: t0.addingTimeInterval(5000)), 10)
        XCTAssertTrue(s.isFinished(at: t0.addingTimeInterval(600)))
        XCTAssertFalse(s.isFinished(at: t0.addingTimeInterval(599)))
        XCTAssertEqual(s.remaining(at: t0.addingTimeInterval(5000)), 0)
        XCTAssertEqual(s.remaining(at: t0.addingTimeInterval(100)), 500)
    }

    func testStartWhileRunningDoesNotReset() {
        var s = LightSession()
        s.start(at: t0)
        s.start(at: t0.addingTimeInterval(300))
        XCTAssertEqual(s.elapsed(at: t0.addingTimeInterval(300)), 300)
    }
}
