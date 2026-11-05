import XCTest
@testable import CountYourselfSkinny

final class ContactCaptureTests: XCTestCase {
    override func setUp() { StubURLProtocol.reset() }
    override func tearDown() { StubURLProtocol.reset() }

    func capture() -> ContactCapture { ContactCapture(session: StubURLProtocol.session()) }

    func testNormalizeTrimsAndLowercases() {
        XCTAssertEqual(ContactCapture.normalize("  Jane.Doe@Example.COM \n"), "jane.doe@example.com")
    }

    func testRejectsBadEmails() {
        for bad in ["", "   ", "nope", "a@b", "a b@c.com", "@x.com", "a@.com ", "a@@b.com"] {
            XCTAssertNil(ContactCapture.normalize(bad), bad)
        }
        XCTAssertNil(ContactCapture.normalize(String(repeating: "a", count: 250) + "@x.com"))
    }

    func testBadEmailNeverHitsTheNetwork() async {
        StubURLProtocol.handler = { _ in (200, Data()) }
        let r = await capture().submit(email: "nope", elapsedMs: 5000)
        XCTAssertEqual(r, .invalidEmail)
        XCTAssertTrue(StubURLProtocol.requests.isEmpty)
    }

    func testPayloadShape() throws {
        let p = ContactCapture.payload(email: "a@b.co", elapsedMs: 4200)
        XCTAssertEqual(Set(p.keys), ["email", "source", "hp", "t"])
        XCTAssertEqual(p["email"] as? String, "a@b.co")
        XCTAssertEqual(p["source"] as? String, "cys-app")
        XCTAssertEqual(p["hp"] as? String, "")
        XCTAssertEqual(p["t"] as? Int, 4200)
    }

    func testPostsToLeadCaptureAndSucceedsOn2xx() async throws {
        StubURLProtocol.handler = { _ in (200, Data()) }
        let r = await capture().submit(email: " A@B.co ", elapsedMs: 4200)
        XCTAssertEqual(r, .success)
        let req = StubURLProtocol.requests[0]
        XCTAssertEqual(req.url?.absoluteString, "https://v9svm8ds74.execute-api.us-east-2.amazonaws.com/api/lead-capture")
        XCTAssertEqual(req.httpMethod, "POST")
        let body = try JSONSerialization.jsonObject(with: StubURLProtocol.bodies[0]) as! [String: Any]
        XCTAssertEqual(body["email"] as? String, "a@b.co")
        XCTAssertEqual(body["t"] as? Int, 4200)
        XCTAssertEqual(Set(body.keys), ["email", "source", "hp", "t"])
    }

    func testNon2xxAndNetworkErrorAreRetryable() async {
        for code in [400, 429, 500] {
            StubURLProtocol.handler = { _ in (code, Data()) }
            let r = await capture().submit(email: "a@b.co", elapsedMs: 4000)
            XCTAssertEqual(r, .failed, "\(code)")
        }
        StubURLProtocol.handler = { _ in throw URLError(.notConnectedToInternet) }
        let r = await capture().submit(email: "a@b.co", elapsedMs: 4000)
        XCTAssertEqual(r, .failed)
    }

    func testRefusesToSendUnderThreeSeconds() async {
        StubURLProtocol.handler = { _ in (200, Data()) }
        let r = await capture().submit(email: "a@b.co", elapsedMs: 2999)
        XCTAssertEqual(r, .tooSoon)
        XCTAssertTrue(StubURLProtocol.requests.isEmpty)
    }

    func testFormTimingIsRealElapsedTime() {
        let t0 = Date(timeIntervalSince1970: 1_000)
        let f = ContactForm(appeared: t0)
        XCTAssertFalse(f.canSubmit(now: t0.addingTimeInterval(2.9), email: "a@b.co"))
        XCTAssertTrue(f.canSubmit(now: t0.addingTimeInterval(3.0), email: "a@b.co"))
        XCTAssertFalse(f.canSubmit(now: t0.addingTimeInterval(10), email: "bad"))
        XCTAssertEqual(f.elapsedMs(now: t0.addingTimeInterval(4.25)), 4250)
    }

    func testEmailHasNoAnalyticsLink() {
        let p = ContactCapture.payload(email: "a@b.co", elapsedMs: 4000)
        XCTAssertNil(p["distinct_id"])
    }
}
