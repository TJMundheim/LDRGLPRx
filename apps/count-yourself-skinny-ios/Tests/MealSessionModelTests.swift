import XCTest
@testable import CountYourselfSkinny

final class MealSessionModelTests: XCTestCase {
    let t0 = Date(timeIntervalSince1970: 1_000_000)

    private func chew(_ m: inout MealSessionModel, _ n: Int) -> [Bool] {
        (0..<n).map { _ in m.registerChew() }
    }

    func testStartsEmpty() {
        let m = MealSessionModel(start: t0)
        XCTAssertEqual(m.totalChews, 0)
        XCTAssertEqual(m.chewsInBite, 0)
        XCTAssertEqual(m.bites, 0)
    }

    func testCountsWithinABite() {
        var m = MealSessionModel(start: t0)
        _ = chew(&m, 10)
        XCTAssertEqual(m.chewsInBite, 10)
        XCTAssertEqual(m.totalChews, 10)
        XCTAssertEqual(m.bites, 0)
    }

    func testChimeSignalOnlyOnThe32nd() {
        var m = MealSessionModel(start: t0)
        let signals = chew(&m, 32)
        XCTAssertEqual(signals.filter { $0 }.count, 1)
        XCTAssertTrue(signals[31])
        XCTAssertEqual(m.chewsInBite, 32, "stays at 32 of 32 until the next chew")
        XCTAssertEqual(m.bites, 1)
    }

    func testNextBiteStartsAtOneAndChimesAgainAt64() {
        var m = MealSessionModel(start: t0)
        _ = chew(&m, 32)
        XCTAssertFalse(m.registerChew())
        XCTAssertEqual(m.chewsInBite, 1)
        let rest = chew(&m, 31)
        XCTAssertTrue(rest.last!)
        XCTAssertEqual(m.bites, 2)
        XCTAssertEqual(m.totalChews, 64)
    }

    func testFinishAfterThirtySecondsMakesARecord() {
        var m = MealSessionModel(start: t0)
        _ = chew(&m, 70)
        let id = UUID()
        let r = m.finish(at: t0.addingTimeInterval(600), id: id)
        XCTAssertEqual(r, MealRecord(id: id, start: t0, end: t0.addingTimeInterval(600), chews: 70, bites: 2))
    }

    func testNoRecordForAMealUnderThirtySeconds() {
        var m = MealSessionModel(start: t0)
        _ = chew(&m, 40)
        XCTAssertNil(m.finish(at: t0.addingTimeInterval(29.9)))
    }

    func testExactlyThirtySecondsIsKept() {
        var m = MealSessionModel(start: t0)
        _ = chew(&m, 5)
        XCTAssertNotNil(m.finish(at: t0.addingTimeInterval(30)))
    }

    func testSummaryLinesCarryNoFoodNumbers() {
        let r = MealRecord(id: UUID(), start: t0, end: t0.addingTimeInterval(600), chews: 320, bites: 10)
        let s = MealSessionModel.summary(for: r)
        XCTAssertEqual(s, "320 chews, 10 bites, 32 chews a bite, 10 min.")
        let none = MealRecord(id: UUID(), start: t0, end: t0.addingTimeInterval(120), chews: 12, bites: 0)
        XCTAssertEqual(MealSessionModel.summary(for: none), "12 chews, 0 bites, 2 min.")
        XCTAssertEqual(MealSessionModel.shortMealSummary, "Under 30 seconds, so this one wasn't saved.")
    }
}

final class MealAvailabilityTests: XCTestCase {
    func eval(available: Bool = true, permission: MotionPermission = .allowed, running: Bool = true, gap: TimeInterval = 0) -> MealAvailability {
        MealAvailability.evaluate(isAvailable: available, permission: permission, isRunning: running, secondsWithoutSample: gap)
    }
    func testUnsupportedDeviceWins() {
        XCTAssertEqual(eval(available: false, permission: .denied), .unsupported)
    }
    func testIdleSupportedIsReady() {
        XCTAssertEqual(eval(running: false), .ready)
        XCTAssertEqual(eval(permission: .notDetermined, running: false), .ready)
    }
    func testDeniedIsNotMistakenForMissingAirPods() {
        XCTAssertEqual(eval(permission: .denied, running: false), .denied)
        XCTAssertEqual(eval(permission: .denied, gap: 10), .denied)
    }
    func testRunningStaysReadyWhileWaitingBriefly() {
        XCTAssertEqual(eval(gap: 2), .ready)
    }
    func testRunningWithNoSamplesAfterThreeSecondsIsNotConnected() {
        XCTAssertEqual(eval(gap: 3), .notConnected)
    }
    func testAnUnansweredPermissionAlertGetsLonger() {
        XCTAssertEqual(eval(permission: .notDetermined, gap: 19), .ready)
        XCTAssertEqual(eval(permission: .notDetermined, gap: 20), .notConnected)
    }
}
