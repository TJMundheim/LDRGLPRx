import XCTest
@testable import CountYourselfSkinny

final class FirstRunTests: XCTestCase {
    var suite: String!
    var defaults: UserDefaults!

    override func setUp() {
        suite = "cys.firstrun.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suite)
    }
    override func tearDown() { defaults.removePersistentDomain(forName: suite) }

    func testNotDoneOnANewInstall() {
        XCTAssertFalse(FirstRun(defaults: defaults).isDone)
    }

    func testAnsweringFinishesItForGood() {
        FirstRun(defaults: defaults).finish(shareUsage: false)
        XCTAssertTrue(FirstRun(defaults: defaults).isDone)
    }

    func testTheAnswerIsTheConsent() {
        let analytics = Analytics(session: StubURLProtocol.session(), defaults: defaults, appVersion: "1.0.0", sending: true)
        XCTAssertFalse(analytics.consented, "off until answered")
        FirstRun(defaults: defaults).finish(shareUsage: true)
        XCTAssertTrue(analytics.consented)
        FirstRun(defaults: defaults).finish(shareUsage: false)
        XCTAssertFalse(analytics.consented)
    }
}
