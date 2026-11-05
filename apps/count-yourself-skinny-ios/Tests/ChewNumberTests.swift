import XCTest
import UIKit
@testable import CountYourselfSkinny

final class ChewNumberTestModelTests: XCTestCase {
    func testStartsAtZeroAndCannotFinish() {
        let t = ChewNumberTest()
        XCTAssertEqual(t.count, 0)
        XCTAssertFalse(t.canFinish)
    }

    func testEachChewCounts() {
        var t = ChewNumberTest()
        for _ in 0..<11 { t.chew() }
        XCTAssertEqual(t.count, 11)
        XCTAssertTrue(t.canFinish)
    }

    func testHammeringTheButtonStopsAtTheLimit() {
        var t = ChewNumberTest()
        for _ in 0..<(ChewNumberTest.limit + 50) { t.chew() }
        XCTAssertEqual(t.count, ChewNumberTest.limit)
    }
}

final class ChewNumberResultsTests: XCTestCase {
    func testFirstResultIsBothLatestAndBest() {
        var r = ChewNumberResults()
        XCTAssertNil(r.latest)
        XCTAssertNil(r.best)
        r.record(11)
        XCTAssertEqual(r.latest, 11)
        XCTAssertEqual(r.best, 11)
    }

    func testLatestAlwaysMoves() {
        var r = ChewNumberResults()
        r.record(20); r.record(9)
        XCTAssertEqual(r.latest, 9)
        XCTAssertEqual(r.best, 20)
    }

    /// 32 is a ceiling, not a score: more is not better.
    func testBestIsClosestTo32NotHighest() {
        var r = ChewNumberResults()
        r.record(30); r.record(60)
        XCTAssertEqual(r.best, 30)
        XCTAssertEqual(r.latest, 60)
        r.record(32)
        XCTAssertEqual(r.best, 32)
        r.record(33)
        XCTAssertEqual(r.best, 32)
    }

    func testATieGoesToTheNumberUnder32() {
        var a = ChewNumberResults(), b = ChewNumberResults()
        a.record(30); a.record(34)
        b.record(34); b.record(30)
        XCTAssertEqual(a.best, 30)
        XCTAssertEqual(b.best, 30)
    }

    func testStoreKeepsThemOnThePhone() throws {
        let suite = "cys.chewnumber.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let store = ChewNumberStore(defaults: defaults)
        XCTAssertEqual(store.load(), ChewNumberResults())
        store.record(11)
        store.record(20)
        let back = ChewNumberStore(defaults: defaults).load()
        XCTAssertEqual(back.latest, 20)
        XCTAssertEqual(back.best, 20)
        defaults.set(Data("nonsense".utf8), forKey: ChewNumberStore.resultsKey)
        XCTAssertEqual(store.load(), ChewNumberResults(), "corrupt data reads as empty")
    }

    func testTheOfferIsMadeOnce() throws {
        let suite = "cys.chewnumber.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let store = ChewNumberStore(defaults: defaults)
        XCTAssertTrue(store.offerPending)
        store.markOfferAnswered()
        XCTAssertFalse(ChewNumberStore(defaults: defaults).offerPending)
    }
}

final class ChewNumberCopyTests: XCTestCase {
    func testResultWordingIsThePlans() {
        XCTAssertEqual(ChewNumberCopy.yourNumber(11), "Your number: 11.")
        XCTAssertEqual(ChewNumberCopy.bookNumber, "The book's number: 32.")
        XCTAssertEqual(ChewNumberCopy.closest(14), "Closest to 32 so far: 14.")
    }

    /// No grade, no comparison with other people, at any number.
    func testNoCopyGradesTheNumberOrClaimsWhatIsNormal() {
        let banned = ["good", "bad", "great", "perfect", "normal", "most people", "average", "best", "winner", "skinny"]
        for n in [1, 11, 32, 33, 200] {
            let all = [ChewNumberCopy.yourNumber(n), ChewNumberCopy.bookNumber, ChewNumberCopy.closest(n),
                       ChewNumberCopy.instructions, ChewNumberCopy.safetyLine, ChewNumberCopy.ceilingLine]
                .joined(separator: " ").lowercased()
            for word in banned { XCTAssertFalse(all.contains(word), word) }
        }
    }

    func testTheSafetyLineIsOnTheScreen() {
        XCTAssertTrue(ChewNumberCopy.safetyLine.contains("If counting makes eating stressful, stop."))
        XCTAssertTrue(ChewNumberCopy.ceilingLine.contains("More isn't better."))
    }
}

@MainActor
final class ChewNumberCardTests: XCTestCase {
    func testTheCardSaysWhatThePlanSaysAndNothingElse() {
        XCTAssertEqual(ChewNumberCard.lines(for: 11),
                       ["My chew number: 11.", "What's yours?", "Count to 32", "my4mlife.com"])
    }

    func testNoWeightStepsOrSkinnyOnTheCard() {
        let text = ChewNumberCard.lines(for: 200).joined(separator: " ").lowercased()
        for word in ["skinny", "weight", "pound", " lb", "step", "#"] { XCTAssertFalse(text.contains(word), word) }
    }

    func testRendersASquarePictureForSharing() throws {
        let image = try XCTUnwrap(ChewNumberCard.image(for: 11))
        XCTAssertEqual(image.cgImage?.width, 1080)
        XCTAssertEqual(image.cgImage?.height, 1080)
        let attachment = XCTAttachment(image: image)
        attachment.name = "share-card"
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    func testRendersTheLongestNumberToo() throws {
        XCTAssertEqual(try XCTUnwrap(ChewNumberCard.image(for: ChewNumberTest.limit)).cgImage?.width, 1080)
    }
}

/// The screen's decisions against a fake sensor, since a simulator has no AirPods.
@MainActor
final class ChewNumberControllerTests: XCTestCase {
    var sensor: FakeSensor!
    var suite: String!
    var defaults: UserDefaults!
    var clock = Date(timeIntervalSince1970: 1_000_000)

    override func setUp() async throws {
        sensor = FakeSensor()
        suite = "cys.chewnumber.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suite)
        UIApplication.shared.isIdleTimerDisabled = false
    }
    override func tearDown() async throws {
        defaults.removePersistentDomain(forName: suite)
        UIApplication.shared.isIdleTimerDisabled = false
    }

    func make() -> ChewNumberController {
        ChewNumberController(sensor: sensor, store: ChewNumberStore(defaults: defaults),
                             now: { [unowned self] in self.clock })
    }
    var stored: ChewNumberResults { ChewNumberStore(defaults: defaults).load() }

    func testTappingCountsAndDoneSavesTheResult() {
        let c = make()
        c.startTapping()
        XCTAssertEqual(c.phase, .tapping)
        for _ in 0..<11 { c.tap() }
        XCTAssertEqual(c.count, 11)
        c.done()
        XCTAssertEqual(c.phase, .result(11))
        XCTAssertEqual(stored.latest, 11)
        XCTAssertFalse(sensor.running, "tapping never touches motion")
        XCTAssertEqual(sensor.starts, 0)
    }

    func testDoneWithNoChewsIsNotAResult() {
        let c = make()
        c.startTapping()
        c.done()
        XCTAssertEqual(c.phase, .tapping)
        XCTAssertNil(stored.latest)
    }

    func testAirPodsCountAndTheTapButtonCannotAddToThem() {
        let c = make()
        c.startAirPods()
        XCTAssertEqual(c.phase, .airPods)
        XCTAssertTrue(sensor.running)
        XCTAssertTrue(UIApplication.shared.isIdleTimerDisabled)
        sensor.onSample?(0.1, 0)
        for _ in 0..<9 { sensor.onChew?(0) }
        c.tap()
        XCTAssertEqual(c.count, 9)
        c.done()
        XCTAssertEqual(c.phase, .result(9))
        XCTAssertEqual(stored.latest, 9)
        XCTAssertFalse(sensor.running)
        XCTAssertNil(sensor.onChew)
        XCTAssertFalse(UIApplication.shared.isIdleTimerDisabled)
    }

    func testNoAirPodsFallsBackToTapping() {
        let c = make()
        c.startAirPods()
        clock += 3
        c.checkStall()
        XCTAssertEqual(c.phase, .tapping)
        XCTAssertEqual(c.note, ChewNumberCopy.noAirPods)
        XCTAssertFalse(sensor.running)
        c.tap()
        XCTAssertEqual(c.count, 1)
    }

    func testAirPodsDroppingKeepsTheCountAndCarriesOnByTapping() {
        let c = make()
        c.startAirPods()
        sensor.onSample?(0.1, 0)
        sensor.onChew?(0); sensor.onChew?(0)
        clock += 3
        c.checkStall()
        XCTAssertEqual(c.phase, .tapping)
        XCTAssertEqual(c.count, 2)
        c.tap()
        XCTAssertEqual(c.count, 3)
    }

    func testSamplesKeepAirPodsRunning() {
        let c = make()
        c.startAirPods()
        defer { c.leave() }
        for _ in 0..<5 {
            clock += 2
            sensor.onSample?(0.1, 0)
            c.checkStall()
        }
        XCTAssertEqual(c.phase, .airPods)
    }

    func testThePermissionAlertGetsTimeToBeAnswered() {
        sensor.permission = .notDetermined
        let c = make()
        c.startAirPods()
        defer { c.leave() }
        clock += 3
        c.checkStall()
        XCTAssertEqual(c.phase, .airPods)
        clock += MealAvailability.permissionPatienceSeconds
        c.checkStall()
        XCTAssertEqual(c.phase, .tapping)
    }

    func testDeniedMotionGoesStraightToTapping() {
        sensor.permission = .denied
        let c = make()
        c.startAirPods()
        XCTAssertEqual(c.phase, .tapping)
        XCTAssertEqual(c.note, ChewNumberCopy.noAirPods)
        XCTAssertEqual(sensor.starts, 0)
    }

    func testAirPodsAreOnlyOfferedWhereTheyCanWork() {
        XCTAssertTrue(make().canUseAirPods)
        sensor.isAvailable = false
        XCTAssertFalse(make().canUseAirPods)
    }

    func testAnotherBiteStartsAtZeroAndKeepsTheResults() {
        let c = make()
        c.startTapping()
        c.tap(); c.tap()
        c.done()
        c.anotherBite()
        XCTAssertEqual(c.phase, .ready)
        XCTAssertEqual(c.count, 0)
        XCTAssertNil(c.note)
        XCTAssertEqual(stored.latest, 2)
    }

    func testLeavingMidTestReleasesAndSavesNothing() {
        let c = make()
        c.startAirPods()
        sensor.onChew?(0)
        c.leave()
        XCTAssertFalse(sensor.running)
        XCTAssertNil(sensor.onChew)
        XCTAssertNil(sensor.onSample)
        XCTAssertFalse(UIApplication.shared.isIdleTimerDisabled)
        XCTAssertNil(stored.latest)
    }
}
