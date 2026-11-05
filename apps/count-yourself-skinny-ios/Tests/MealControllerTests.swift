import XCTest
import UIKit
@testable import CountYourselfSkinny

/// The whole meal lifecycle against a fake sensor: nothing here needs AirPods.
@MainActor
final class MealControllerTests: XCTestCase {
    var sensor: FakeSensor!
    var chime: FakeChime!
    var suite: String!
    var defaults: UserDefaults!
    var clock = Date(timeIntervalSince1970: 1_000_000)

    override func setUp() async throws {
        sensor = FakeSensor(); chime = FakeChime()
        suite = "cys.meal.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suite)
        UIApplication.shared.isIdleTimerDisabled = false
    }
    override func tearDown() async throws {
        defaults.removePersistentDomain(forName: suite)
        UIApplication.shared.isIdleTimerDisabled = false
    }

    func make() -> MealController {
        MealController(sensor: sensor, chime: chime, meals: MealStore(defaults: defaults),
                       calibration: CalibrationStore(defaults: defaults),
                       now: { [unowned self] in self.clock })
    }
    var saved: [MealRecord] { MealStore(defaults: defaults).load() }
    var screenHeld: Bool { UIApplication.shared.isIdleTimerDisabled }
    func chews(_ n: Int) { for _ in 0..<n { sensor.onChew?(0) } }
    func sample() { sensor.onSample?(0.1, 0) }
    func assertAllReleased(file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertFalse(sensor.running, "sensor still running", file: file, line: line)
        XCTAssertFalse(screenHeld, "idle timer still off", file: file, line: line)
        XCTAssertNil(sensor.onChew, file: file, line: line)
        XCTAssertNil(sensor.onSample, file: file, line: line)
        XCTAssertGreaterThan(chime.stops, 0, "audio session not released", file: file, line: line)
    }

    func testStartHoldsScreenAndRunsSensor() {
        let c = make()
        c.start()
        defer { c.halt() }
        XCTAssertEqual(c.phase, .running)
        XCTAssertTrue(sensor.running)
        XCTAssertTrue(screenHeld)
        XCTAssertEqual(chime.prepared, 1)
    }

    func testChimesOnceAt32() {
        let c = make()
        c.start()
        defer { c.halt() }
        chews(31)
        XCTAssertEqual(chime.plays, 0)
        chews(1)
        XCTAssertEqual(chime.plays, 1)
        XCTAssertEqual(c.chewsInBite, 32)
        XCTAssertEqual(c.bites, 1)
    }

    func testFinishSavesAndReleasesEverything() {
        let c = make()
        c.start()
        chews(40)
        clock += 60
        c.finish()
        guard case .finished = c.phase else { return XCTFail("not finished") }
        XCTAssertEqual(saved.count, 1)
        XCTAssertEqual(saved.first?.chews, 40)
        assertAllReleased()
    }

    func testShortMealIsNotSavedButStillReleases() {
        let c = make()
        c.start()
        chews(5)
        clock += 10
        c.finish()
        XCTAssertTrue(saved.isEmpty)
        assertAllReleased()
    }

    func testFinishOffersTheSavedMealToTheScreen() {
        let c = make()
        c.start()
        chews(40)
        clock += 60
        c.finish()
        XCTAssertEqual(c.lastSaved?.chews, 40)
        XCTAssertEqual(c.lastSaved, saved.first)
        XCTAssertTrue(FreeMealRule.endedFreeMeal(c.lastSaved, isPro: false))
        XCTAssertTrue(FreeMealRule.isUsed(meals: saved))
    }

    func testUnderThirtySecondsLeavesTheFreeMeal() {
        let c = make()
        c.start()
        chews(5)
        clock += 29
        c.finish()
        XCTAssertNil(c.lastSaved)
        XCTAssertFalse(FreeMealRule.endedFreeMeal(c.lastSaved, isPro: false))
        XCTAssertFalse(FreeMealRule.isUsed(meals: saved))
    }

    func testNoAirPodsLeavesTheFreeMeal() {
        let c = make()
        c.start()
        clock += MealAvailability.stallSeconds
        c.checkStall()
        XCTAssertEqual(c.availability, .notConnected)
        XCTAssertNil(c.lastSaved)
        XCTAssertFalse(FreeMealRule.isUsed(meals: saved))
    }

    func testAMealThatCountedNothingLeavesTheFreeMeal() {
        let c = make()
        c.start()
        clock += 1
        sample()
        clock += 60
        sample()
        c.finish()
        XCTAssertEqual(c.lastSaved?.chews, 0)
        XCTAssertFalse(FreeMealRule.endedFreeMeal(c.lastSaved, isPro: false))
        XCTAssertFalse(FreeMealRule.isUsed(meals: saved))
    }

    func testLeavingMidMealStillSpendsItAndSaysSo() {
        let c = make()
        c.start()
        chews(64)
        clock += 120
        c.leave()
        XCTAssertTrue(FreeMealRule.endedFreeMeal(c.lastSaved, isPro: false))
    }

    func testStartingAgainForgetsTheLastMeal() {
        let c = make()
        c.start()
        chews(40)
        clock += 60
        c.finish()
        c.again()
        c.start()
        defer { c.halt() }
        XCTAssertNil(c.lastSaved)
    }

    /// Back button mid-meal: a long meal must not vanish.
    func testLeavingMidMealSavesItAndReleases() {
        let c = make()
        c.start()
        chews(64)
        clock += 300
        c.leave()
        XCTAssertEqual(saved.first?.chews, 64)
        assertAllReleased()
    }

    func testLeavingBeforeStartingTouchesNothing() {
        let c = make()
        c.leave()
        XCTAssertEqual(c.phase, .idle)
        XCTAssertTrue(saved.isEmpty)
        XCTAssertFalse(screenHeld)
    }

    func testHaltIsSafeTwice() {
        let c = make()
        c.start()
        c.halt(); c.halt()
        XCTAssertEqual(c.phase, .idle)
        assertAllReleased()
    }

    func testAirPodsNeverConnectedStopsAndSaysSo() {
        let c = make()
        c.start()
        clock += 3
        c.checkStall()
        XCTAssertEqual(c.availability, .notConnected)
        XCTAssertEqual(c.phase, .idle)
        XCTAssertTrue(saved.isEmpty)
        assertAllReleased()
    }

    /// The finished summary used to be hidden behind "No AirPods found".
    func testAirPodsDroppingMidMealSavesAndStillShowsTheSummary() {
        let c = make()
        c.start()
        sample()
        chews(50)
        clock += 120
        c.checkStall()
        XCTAssertEqual(saved.first?.chews, 50)
        guard case .finished(let summary) = c.phase else { return XCTFail("not finished") }
        XCTAssertTrue(summary.contains("50 chews"))
        XCTAssertEqual(c.availability, .notConnected)
        XCTAssertFalse(c.showsBlockedScreen, "the summary must win over the blocked screen")
        assertAllReleased()
    }

    func testSamplesKeepTheMealRunning() {
        let c = make()
        c.start()
        defer { c.halt() }
        clock += 2; sample()
        clock += 2; sample()
        clock += 2
        c.checkStall()
        XCTAssertEqual(c.phase, .running)
        XCTAssertEqual(c.availability, .ready)
    }

    /// Motion stops while the app is in the background. Coming back must not read as "AirPods gone".
    func testReturningFromTheBackgroundForgivesTheGap() {
        let c = make()
        c.start()
        defer { c.halt() }
        sample()
        chews(10)
        clock += 90
        c.returnedToForeground()
        c.checkStall()
        XCTAssertEqual(c.phase, .running)
        XCTAssertEqual(c.availability, .ready)
        clock += 3
        c.checkStall()
        XCTAssertNotEqual(c.phase, .running, "a real stall after returning still ends it")
    }

    /// The first-run permission alert can sit on screen for longer than the stall limit.
    func testWaitsForTheMotionPermissionAnswer() {
        sensor.permission = .notDetermined
        let c = make()
        c.start()
        defer { c.halt() }
        clock += 10
        c.checkStall()
        XCTAssertEqual(c.phase, .running)
        XCTAssertEqual(c.availability, .ready)
        clock += 10
        c.checkStall()
        XCTAssertEqual(c.availability, .notConnected, "no AirPods means no alert ever comes; can't wait forever")
    }

    func testAnsweringDontAllowShowsMotionHelpNotNoAirPods() {
        sensor.permission = .notDetermined
        let c = make()
        c.start()
        sensor.permission = .denied
        c.checkStall()
        XCTAssertEqual(c.availability, .denied)
        assertAllReleased()
    }

    func testAlreadyDeniedNeverStarts() {
        sensor.permission = .denied
        let c = make()
        c.start()
        XCTAssertEqual(c.availability, .denied)
        XCTAssertEqual(sensor.starts, 0)
        XCTAssertFalse(screenHeld)
    }

    func testUnsupportedPhoneNeverStarts() {
        sensor.isAvailable = false
        let c = make()
        XCTAssertEqual(c.availability, .unsupported)
        c.start()
        XCTAssertEqual(sensor.starts, 0)
        XCTAssertFalse(screenHeld)
        XCTAssertTrue(c.showsBlockedScreen)
    }

    func testAgainClearsTheProblem() {
        let c = make()
        c.start()
        clock += 3
        c.checkStall()
        c.again()
        XCTAssertEqual(c.phase, .idle)
        XCTAssertEqual(c.availability, .ready)
        XCTAssertFalse(c.showsBlockedScreen)
    }
}

@MainActor
final class CalibrationControllerTests: XCTestCase {
    var sensor: FakeSensor!
    var suite: String!
    var defaults: UserDefaults!
    var clock = Date(timeIntervalSince1970: 1_000_000)

    override func setUp() async throws {
        sensor = FakeSensor()
        suite = "cys.calib.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suite)
        UIApplication.shared.isIdleTimerDisabled = false
    }
    override func tearDown() async throws {
        defaults.removePersistentDomain(forName: suite)
        UIApplication.shared.isIdleTimerDisabled = false
    }

    func make() -> CalibrationController {
        CalibrationController(sensor: sensor, calibration: CalibrationStore(defaults: defaults),
                              now: { [unowned self] in self.clock }, autoplay: false)
    }

    func testBeginRunsSensorAndHoldsScreenEndReleases() {
        let c = make()
        c.begin()
        XCTAssertTrue(sensor.running)
        XCTAssertTrue(UIApplication.shared.isIdleTimerDisabled)
        c.end(); c.end()
        XCTAssertFalse(sensor.running)
        XCTAssertFalse(UIApplication.shared.isIdleTimerDisabled)
        XCTAssertNil(sensor.onSample)
    }

    func testUnsupportedStopsAtAProblemAndCanStillSkip() {
        sensor.isAvailable = false
        let c = make()
        c.begin()
        XCTAssertEqual(c.problem, .unsupported)
        XCTAssertEqual(sensor.starts, 0)
        c.skip()
        XCTAssertEqual(c.flow.phase, .skipped)
        XCTAssertTrue(CalibrationStore(defaults: defaults).skipped)
    }

    func testDeniedMotionIsItsOwnProblem() {
        sensor.permission = .denied
        let c = make()
        c.begin()
        XCTAssertEqual(c.problem, .denied)
        XCTAssertEqual(sensor.starts, 0)
        XCTAssertFalse(UIApplication.shared.isIdleTimerDisabled)
    }

    func testNoSamplesAfterThreeSecondsStopsAndReleases() {
        let c = make()
        c.begin()
        clock += 2
        XCTAssertTrue(c.stillTick())
        clock += 1
        XCTAssertFalse(c.stillTick())
        XCTAssertEqual(c.problem, .notConnected)
        XCTAssertFalse(sensor.running)
        XCTAssertFalse(UIApplication.shared.isIdleTimerDisabled)
    }

    func testTheStillCountdownWaitsForTheFirstSample() {
        let c = make()
        c.begin()
        defer { c.end() }
        let full = c.secondsLeft
        clock += 1
        XCTAssertTrue(c.stillTick())
        XCTAssertEqual(c.secondsLeft, full, "don't count the permission alert as sitting still")
        sensor.onSample?(0.1, 0)
        clock += 1
        XCTAssertTrue(c.stillTick())
        XCTAssertEqual(c.secondsLeft, full - 1)
    }

    func testPermissionAlertDoesNotReadAsNoAirPods() {
        sensor.permission = .notDetermined
        let c = make()
        c.begin()
        defer { c.end() }
        clock += 10
        XCTAssertTrue(c.stillTick())
        XCTAssertNil(c.problem)
    }

    func testTryAgainAfterNoAirPodsStartsCleanly() {
        let c = make()
        c.begin()
        clock += 3
        _ = c.stillTick()
        c.begin()
        defer { c.end() }
        XCTAssertNil(c.problem)
        XCTAssertTrue(sensor.running)
        XCTAssertEqual(c.flow.phase, .still)
    }
}
