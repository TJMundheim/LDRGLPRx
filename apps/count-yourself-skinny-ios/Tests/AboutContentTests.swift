import XCTest
@testable import CountYourselfSkinny

final class AboutContentTests: XCTestCase {
    func testDisclaimerIsVerbatim() {
        XCTAssertEqual(AboutContent.disclaimer,
            "Count Yourself Skinny is an educational tool. It isn't medical advice and doesn't diagnose or treat anything. Talk to your own physician before changing how you eat or fast, especially if you're pregnant, have diabetes, or take medication.")
    }
    func testConsentAndIdentityLinesAreVerbatim() {
        XCTAssertEqual(AboutContent.consent,
            "Enter your email to get updates and offers from My4MLife. Unsubscribe anytime. We never ask for this to use the app.")
        XCTAssertEqual(AboutContent.identityLine,
            "Don't lose your identity and your dignity while you still have a choice.")
    }
    func testLinks() {
        XCTAssertEqual(AboutContent.assessment.absoluteString, "https://www.my4mlife.com/assessment")
        XCTAssertEqual(AboutContent.privacy.absoluteString, "https://www.my4mlife.com/legal/count-yourself-skinny-privacy")
        XCTAssertEqual(AboutContent.terms.absoluteString, "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")
    }
    func testVersionText() {
        XCTAssertEqual(AboutContent.versionText(short: "1.0.0", build: "7"), "Version 1.0.0 (7)")
        XCTAssertEqual(AboutContent.versionText(short: nil, build: nil), "Version 1.0.0")
    }
}
