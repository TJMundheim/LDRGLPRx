import XCTest

/// Drives the real Debug app. Screens are kept as attachments in the .xcresult.
final class CYSUITests: XCTestCase {
    let app = XCUIApplication()

    override func setUp() {
        continueAfterFailure = false
    }

    private func keep(_ name: String) {
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }

    /// Launches at a 30-day streak with a fresh card. Launch arguments win over what's saved,
    /// so a card dismissed in an earlier run doesn't leak into this one.
    private func launchAtThirtyDays() {
        let streak = #"{"streak":30,"longest":30,"misses":0,"baseStreak":0,"baseLongest":0,"baseMisses":0}"#
        let rule = #"{"firstUse":\#(Date().timeIntervalSinceReferenceDate),"dismissedLevel":0,"shownLevel":0}"#
        func arg(_ json: String) -> String { "<data>\(Data(json.utf8).base64EncodedString())</data>" }
        app.launchArguments = ["-streakEngine", arg(streak), "-nextDoor", arg(rule)]
        app.launch()
    }

    private var card: XCUIElement { app.staticTexts["What comes after skinny?"] }

    func testCardShowsAtThirtyDaysAndNotNowPutsItAway() {
        launchAtThirtyDays()
        XCTAssertTrue(card.waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Don't lose your identity and your dignity while you still have a choice."].exists)
        keep("next-door-card")
        app.buttons["Not now"].tap()
        XCTAssertFalse(card.waitForExistence(timeout: 2))
        XCTAssertTrue(app.staticTexts["Today's counts"].exists || app.buttons["Bite Pacer"].exists, "only the card left")
        keep("next-door-dismissed")
    }

    func testTakeTheBrainCheckOpensSafariAndPutsTheCardAway() {
        launchAtThirtyDays()
        XCTAssertTrue(card.waitForExistence(timeout: 5))
        app.buttons["Take the Brain Check"].tap()
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        XCTAssertTrue(safari.wait(for: .runningForeground, timeout: 15))
        sleep(4)
        keep("next-door-safari")
        app.activate()
        XCTAssertFalse(card.waitForExistence(timeout: 2))
    }

    func testPaywallShowsPlanRowsWithPrices() throws {
        app.launch()
        let getPro = app.buttons["Get Pro: chew counting and trends"]
        for _ in 0..<6 where !getPro.isHittable { app.swipeUp() }
        getPro.tap()
        let monthly = app.buttons.containing(NSPredicate(format: "label CONTAINS '$2.99'")).firstMatch
        let loaded = monthly.waitForExistence(timeout: 10)
        keep("paywall")
        try XCTSkipUnless(loaded, "Plans did not load: run from Xcode, or after a unit test run has installed the StoreKit config.")
        XCTAssertTrue(app.buttons.containing(NSPredicate(format: "label CONTAINS '$19.99'")).firstMatch.exists)
    }

    /// Every Chew Lab label the phone test guide (docs/launch/cys) tells Dr. TJ to look for.
    func testDeveloperSectionAndChewLabMatchTheGuide() {
        app.launch()
        let lab = app.buttons["Chew Lab — AirPods prototype"]
        for _ in 0..<8 where !lab.isHittable { app.swipeUp() }
        XCTAssertTrue(app.staticTexts["Developer"].exists || app.staticTexts["DEVELOPER"].exists)
        XCTAssertTrue(app.switches["Pretend Pro"].exists)
        keep("developer-section")
        lab.tap()
        XCTAssertTrue(app.staticTexts["Not supported on this device/simulator"].waitForExistence(timeout: 5),
                      "no headphone motion on a simulator")
        XCTAssertTrue(app.staticTexts["session total"].exists)
        let start = app.buttons["Start"]
        for _ in 0..<4 where !start.exists { app.swipeUp() }
        XCTAssertFalse(start.isEnabled, "needs a real iPhone")
        for _ in 0..<4 where !app.buttons["Export CSV"].exists { app.swipeUp() }
        XCTAssertTrue(app.buttons["Reset counts"].exists)
        XCTAssertTrue(app.switches["Haptic tick on each chew"].exists)
        XCTAssertTrue(app.switches["Record session"].exists)
        XCTAssertTrue(app.staticTexts["Samples recorded"].exists)
        XCTAssertTrue(app.buttons["Export CSV"].exists, "the CSV export the phone test depends on")
        XCTAssertFalse(app.buttons["Export CSV"].isEnabled, "greyed out until samples are recorded")
        keep("chew-lab-controls")
    }

    func testShortNameUnderTheIcon() {
        app.launch()
        XCUIDevice.shared.press(.home)
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        XCTAssertTrue(springboard.icons["Count Skinny"].waitForExistence(timeout: 5))
        keep("home-screen")
    }
}
