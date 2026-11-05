import XCTest
@testable import CountYourselfSkinny

final class AnalyticsTests: XCTestCase {
    var suite: String!
    var defaults: UserDefaults!

    override func setUp() {
        suite = "cys.analytics.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suite)
        StubURLProtocol.reset()
    }
    override func tearDown() {
        defaults.removePersistentDomain(forName: suite)
        StubURLProtocol.reset()
    }

    func make(sending: Bool = false) -> Analytics {
        Analytics(session: StubURLProtocol.session(), defaults: defaults, appVersion: "1.0.0", sending: sending)
    }

    func testEventNamesAreExactlyTheAllowedList() {
        XCTAssertEqual(Set(AnalyticsEvent.allCases.map(\.rawValue)),
                       ["app_open", "paywall_view", "purchase_started", "purchase_success",
                        "restore_tapped", "calibration_completed", "meal_completed",
                        "trends_viewed", "contact_submitted",
                        "next_door_shown", "next_door_tapped",
                        "chew_number_done", "share_tapped"])
    }

    func testPayloadHasOnlyAllowedKeys() {
        let a = make()
        for e in AnalyticsEvent.allCases {
            let p = a.payload(for: e)
            XCTAssertEqual(Set(p.keys), ["api_key", "event", "distinct_id", "properties"])
            XCTAssertEqual(p["event"] as? String, e.rawValue)
            XCTAssertEqual(p["api_key"] as? String, "phc_qZQbqDfKqxUFtSpb79Ex967RkMHdmx7axp8mzFABEYbY")
            let props = p["properties"] as! [String: Any]
            XCTAssertEqual(Set(props.keys), ["$lib", "app_version", "$process_person_profile", "$geoip_disable"])
            XCTAssertEqual(props["$lib"] as? String, "cys-ios")
            XCTAssertEqual(props["app_version"] as? String, "1.0.0")
            XCTAssertEqual(props["$process_person_profile"] as? Bool, false)
            XCTAssertEqual(props["$geoip_disable"] as? Bool, true, "no location is derived from the IP address")
        }
    }

    func testNoNumbersEmailsOrCountsInAnyPayload() throws {
        let a = make()
        for e in AnalyticsEvent.allCases {
            let data = try JSONSerialization.data(withJSONObject: a.payload(for: e))
            let text = String(decoding: data, as: UTF8.self).lowercased()
            XCTAssertFalse(text.contains("@"))
            for word in ["email", "step", "chew", "weight", "count", "bite"] {
                XCTAssertFalse(text.replacingOccurrences(of: e.rawValue, with: "").contains(word), word)
            }
            let props = a.payload(for: e)["properties"] as! [String: Any]
            for (k, v) in props where k != "$process_person_profile" && k != "$geoip_disable" {
                XCTAssertTrue(v is String, "\(k) must be a string")
            }
        }
    }

    func testDistinctIDIsRandomUUIDAndStableAcrossInstances() {
        let a = make().distinctID, b = make().distinctID
        XCTAssertEqual(a, b)
        XCTAssertNotNil(UUID(uuidString: a))
        defaults.removeObject(forKey: Analytics.idKey)
        XCTAssertNotEqual(make().distinctID, a)
    }

    func testDebugAndSimulatorBuildsDoNotSendByDefault() {
        let a = Analytics(session: StubURLProtocol.session(), defaults: defaults, appVersion: "1.0.0")
        a.track(.appOpen)
        XCTAssertTrue(StubURLProtocol.requests.isEmpty)
    }

    func testNothingIsSentBeforeTheQuestionIsAnswered() async {
        StubURLProtocol.handler = { _ in (200, Data()) }
        let a = make(sending: true)
        XCTAssertFalse(a.consented)
        await a.send(.appOpen)
        a.track(.appOpen)
        try? await Task.sleep(for: .milliseconds(200))
        XCTAssertTrue(StubURLProtocol.requests.isEmpty)
        XCTAssertNil(defaults.string(forKey: Analytics.idKey), "no ID is even made until yes")
    }

    func testNoMeansNothingIsSent() async {
        StubURLProtocol.handler = { _ in (200, Data()) }
        let a = make(sending: true)
        defaults.set(false, forKey: Analytics.consentKey)
        await a.send(.appOpen)
        a.track(.appOpen)
        try? await Task.sleep(for: .milliseconds(200))
        XCTAssertTrue(StubURLProtocol.requests.isEmpty)
    }

    func testYesSendsAndChangingToNoStops() async {
        StubURLProtocol.handler = { _ in (200, Data()) }
        let a = make(sending: true)
        defaults.set(true, forKey: Analytics.consentKey)
        await a.send(.appOpen)
        XCTAssertEqual(StubURLProtocol.requests.count, 1)
        defaults.set(false, forKey: Analytics.consentKey)
        await a.send(.appOpen)
        XCTAssertEqual(StubURLProtocol.requests.count, 1, "the About toggle takes effect at once")
    }

    func testTrackGoesThroughTheSameGate() async {
        StubURLProtocol.handler = { _ in (200, Data()) }
        let a = make(sending: true)
        defaults.set(true, forKey: Analytics.consentKey)
        a.track(.appOpen)
        for _ in 0..<40 where StubURLProtocol.requests.isEmpty { try? await Task.sleep(for: .milliseconds(50)) }
        XCTAssertEqual(StubURLProtocol.requests.count, 1)
    }

    func testDebugAndSimulatorBuildsStaySilentEvenAfterYes() {
        defaults.set(true, forKey: Analytics.consentKey)
        let a = Analytics(session: StubURLProtocol.session(), defaults: defaults, appVersion: "1.0.0")
        a.track(.appOpen)
        XCTAssertTrue(StubURLProtocol.requests.isEmpty)
    }

    func testSendingPostsJSONToPostHog() async throws {
        StubURLProtocol.handler = { _ in (200, Data()) }
        let a = make(sending: true)
        defaults.set(true, forKey: Analytics.consentKey)
        await a.send(.paywallView)
        XCTAssertEqual(StubURLProtocol.requests.count, 1)
        let r = StubURLProtocol.requests[0]
        XCTAssertEqual(r.url?.absoluteString, "https://us.i.posthog.com/capture/")
        XCTAssertEqual(r.httpMethod, "POST")
        let body = try JSONSerialization.jsonObject(with: StubURLProtocol.bodies[0]) as! [String: Any]
        XCTAssertEqual(body["event"] as? String, "paywall_view")
    }

    func testNetworkFailureIsSilent() async {
        StubURLProtocol.handler = { _ in throw URLError(.timedOut) }
        let a = make(sending: true)
        defaults.set(true, forKey: Analytics.consentKey)
        await a.send(.appOpen)   // must not throw or crash
        StubURLProtocol.handler = { _ in (500, Data()) }
        await a.send(.appOpen)
        XCTAssertEqual(StubURLProtocol.requests.count, 2)
    }
}
