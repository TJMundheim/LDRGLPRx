import XCTest

/// Drives the real Debug app. Screens are kept as attachments in the .xcresult.
final class CYSUITests: XCTestCase {
    let app = XCUIApplication()

    override func setUp() {
        continueAfterFailure = false
    }

    /// Skips the first-run screens and the one-time Chew Number card. Launch arguments win over
    /// what's saved, so nothing from an earlier run leaks in.
    private let skipFirstRun = ["-cys.firstRun.done", "YES", "-cys.chewNumber.offerAnswered", "YES"]
    /// Debug builds only: wipes the app's saved data at launch, as a new install would have it.
    private let newInstall = ["-cys.uiTestReset", "YES"]
    /// Debug builds only: a stand-in for AirPods that chews four times a second.
    private let simulatedChews = ["-cys.simulateChews", "YES"]

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
        app.launchArguments = skipFirstRun + ["-streakEngine", arg(streak), "-nextDoor", arg(rule)]
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

    func testAboutLinkOpensTheAssessment() {
        app.launchArguments = skipFirstRun
        app.launch()
        let about = app.buttons["About"]
        scroll(to: about)
        about.tap()
        let link = app.buttons["What comes after skinny?"]
        scroll(to: link)
        link.tap()
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        XCTAssertTrue(safari.wait(for: .runningForeground, timeout: 15))
        app.activate()
    }

    private func row(_ title: String) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", title)).firstMatch
    }

    private func scroll(to element: XCUIElement, down: Bool = true) {
        for _ in 0..<10 where !element.isHittable {
            if down { app.swipeUp() } else { app.swipeDown() }
        }
    }

    private func openPaywallFromGetPro() {
        let getPro = app.buttons["Get Pro: chew counting and trends"]
        scroll(to: getPro)
        getPro.tap()
    }

    func testPaywallListsYearlyFirstWithBilledPriceAndPerMonthLine() throws {
        app.launchArguments = skipFirstRun
        app.launch()
        openPaywallFromGetPro()
        let yearly = app.buttons.containing(NSPredicate(format: "label CONTAINS '$4.99 a year'")).firstMatch
        let loaded = yearly.waitForExistence(timeout: 10)
        keep("paywall")
        try XCTSkipUnless(loaded, "Plans did not load: run from Xcode, or after a unit test run has installed the StoreKit config.")
        XCTAssertTrue(yearly.label.contains("about 42¢ a month"), yearly.label)
        let monthly = app.buttons.containing(NSPredicate(format: "label CONTAINS '$0.99 a month'")).firstMatch
        XCTAssertTrue(monthly.exists)
        XCTAssertLessThan(yearly.frame.minY, monthly.frame.minY, "yearly is listed first")
        XCTAssertFalse(app.buttons["Have an offer code?"].exists, "the App Store redeems codes on its own")
    }

    /// A new user sees the two screens once, in order, with a real choice, and can change it later.
    func testFirstRunIsTwoScreensOnceWithARealChoice() {
        app.launchArguments = newInstall
        app.launch()
        XCTAssertTrue(app.staticTexts["Before you start"].waitForExistence(timeout: 5))
        for line in ["This app is for adults 18 and over.",
                     "It isn't for anyone with a current or past eating disorder. If that's you, please talk to your own physician or an eating disorder specialist instead.",
                     "A chew count is a pacing tool, not a score. More isn't better.",
                     "If counting makes eating stressful, stop counting and talk to your own physician."] {
            // Queried by predicate: a plain subscript refuses strings over 128 characters.
            XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label == %@", line)).firstMatch.exists, line)
        }
        keep("first-run-1-safety")
        app.buttons["Continue"].tap()

        XCTAssertTrue(app.staticTexts["Share usage events?"].waitForExistence(timeout: 5))
        let no = app.buttons["No"], yes = app.buttons["Yes"]
        XCTAssertTrue(no.exists)
        XCTAssertTrue(yes.exists)
        XCTAssertEqual(no.frame.size, yes.frame.size, "neither answer is dressed up")
        keep("first-run-2-usage")
        no.tap()

        // The offer comes after the flow, once.
        let find = app.buttons["Find my number"]
        XCTAssertTrue(find.waitForExistence(timeout: 5))
        keep("home-chew-number-offer")
        app.buttons["Not now"].tap()
        XCTAssertFalse(find.waitForExistence(timeout: 1))
        XCTAssertTrue(row("What's your chew number?").exists, "the Home row stays")

        // No stuck: About shows off, and can turn it on.
        let about = app.buttons["About"]
        scroll(to: about)
        about.tap()
        let toggle = app.switches["Share usage events"]
        scroll(to: toggle)
        XCTAssertEqual(toggle.value as? String, "0")
        keep("about-usage-toggle")
        toggle.switches.firstMatch.tap()
        XCTAssertEqual(toggle.value as? String, "1")

        // Not shown again, and the changed answer stuck.
        app.terminate()
        app.launchArguments = []
        app.launch()
        XCTAssertTrue(row("What's your chew number?").waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["Before you start"].exists)
        XCTAssertFalse(find.exists)
        scroll(to: about)
        about.tap()
        scroll(to: toggle)
        XCTAssertEqual(toggle.value as? String, "1")
    }

    func testAnsweringYesTurnsTheAboutToggleOn() {
        app.launchArguments = newInstall
        app.launch()
        app.buttons["Continue"].tap()
        app.buttons["Yes"].tap()
        XCTAssertTrue(app.buttons["Find my number"].waitForExistence(timeout: 5))
        let about = app.buttons["About"]
        scroll(to: about)
        about.tap()
        let toggle = app.switches["Share usage events"]
        scroll(to: toggle)
        XCTAssertEqual(toggle.value as? String, "1")
    }

    func testChewNumberFromOfferToResultToCardToPacer() {
        app.launchArguments = newInstall + ["-cys.firstRun.done", "YES"]
        app.launch()
        app.buttons["Find my number"].tap()

        XCTAssertTrue(app.buttons["Tap to count"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["Use my AirPods"].exists, "a simulator has no headphone motion")
        keep("chew-number-ready")
        app.buttons["Tap to count"].tap()

        XCTAssertFalse(app.buttons["Done"].isEnabled, "no result before a chew")
        for _ in 0..<11 { app.buttons["Chew"].tap() }
        XCTAssertEqual(app.staticTexts["chewNumberCount"].label, "11")
        keep("chew-number-tapping")
        app.buttons["Done"].tap()

        XCTAssertTrue(app.staticTexts["Your number: 11."].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["The book's number: 32."].exists)
        keep("chew-number-result")

        let share = app.buttons["Share my number"]
        XCTAssertTrue(share.exists)
        share.tap()
        let saveImage = app.cells["Save Image"]
        XCTAssertTrue(saveImage.waitForExistence(timeout: 10), "the card reached the share sheet as a picture")
        keep("chew-number-share-sheet")

        // Save Image asks for the add-to-Photos permission: without its usage string this is a crash.
        saveImage.tap()
        let alert = XCUIApplication(bundleIdentifier: "com.apple.springboard").alerts.firstMatch
        if alert.waitForExistence(timeout: 5) {
            keep("chew-number-save-permission")
            alert.buttons.element(boundBy: alert.buttons.count - 1).tap()
        }
        XCTAssertTrue(share.waitForExistence(timeout: 10))
        XCTAssertEqual(app.state, .runningForeground)

        let pacer = app.buttons["Try the Bite Pacer"]
        scroll(to: pacer)
        pacer.tap()
        XCTAssertTrue(app.buttons["Start bite"].waitForExistence(timeout: 5))
        app.buttons["Done"].tap()

        // A second try: no grade, and the closest stays.
        let again = app.buttons["Try another bite"]
        scroll(to: again)
        again.tap()
        app.buttons["Tap to count"].tap()
        for _ in 0..<3 { app.buttons["Chew"].tap() }
        app.buttons["Done"].tap()
        XCTAssertTrue(app.staticTexts["Your number: 3."].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Closest to 32 so far: 11."].exists)
        keep("chew-number-second-result")

        app.buttons["Close"].tap()
        let homeRow = row("What's your chew number?")
        XCTAssertTrue(homeRow.waitForExistence(timeout: 5))
        XCTAssertTrue(homeRow.label.contains("3"), homeRow.label)
        keep("home-chew-number-row")
    }

    func testNoAirPodsLeavesTheFreeMealAndTrendsStaysPro() {
        app.launchArguments = skipFirstRun + newInstall
        app.launch()
        let count = row("Count my chews")
        scroll(to: count)
        XCTAssertTrue(count.label.contains("Free meal"), count.label)
        count.tap()
        XCTAssertTrue(app.staticTexts["This iPhone can't read headphone motion"].waitForExistence(timeout: 5), "not the paywall")
        XCTAssertFalse(app.buttons["Not now"].exists)
        keep("meal-no-airpods")
        app.navigationBars.buttons.firstMatch.tap()
        scroll(to: count)
        XCTAssertTrue(count.label.contains("Free meal"), count.label)

        let trends = row("Trends")
        scroll(to: trends)
        trends.tap()
        XCTAssertTrue(app.staticTexts["Your first counted meal is free, with no subscription. Start it from Count my chews on the home screen."].waitForExistence(timeout: 5))
        keep("paywall-before-free-meal")
    }

    /// The whole free meal on real screens, with a simulated sensor standing in for AirPods.
    func testFreeMealThenPaywallWithItsResult() {
        app.launchArguments = skipFirstRun + newInstall + simulatedChews
        app.launch()
        let count = row("Count my chews")
        scroll(to: count)
        count.tap()

        // The labels the phone test guide (docs/launch/cys) gives Test C.
        XCTAssertTrue(app.staticTexts["Your first counted meal is free."].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Tune to me"].exists)
        app.buttons["Start meal"].tap()
        let skip = app.buttons["Skip for now"]
        XCTAssertTrue(app.staticTexts["Tune it to you"].waitForExistence(timeout: 5))
        skip.tap()

        // Under 30 seconds: not saved, no paywall, free meal still there.
        let finish = app.buttons["Finish"]
        XCTAssertTrue(finish.waitForExistence(timeout: 5))
        finish.tap()
        XCTAssertTrue(app.staticTexts["Under 30 seconds, so this one wasn't saved."].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["Not now"].waitForExistence(timeout: 2), "no paywall")
        app.buttons["Another meal"].tap()

        // A real one.
        app.buttons["Start meal"].tap()
        XCTAssertTrue(finish.waitForExistence(timeout: 5))
        sleep(31)
        keep("meal-running")
        finish.tap()

        XCTAssertTrue(app.staticTexts["That was your free meal."].waitForExistence(timeout: 5), "paywall follows the meal")
        let result = app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'chews, ' AND label CONTAINS ' min.'")).firstMatch
        XCTAssertTrue(result.exists, "with the meal's result")
        keep("paywall-after-free-meal")
        let notNow = app.buttons["Not now"]
        scroll(to: notNow)
        notNow.tap()

        XCTAssertTrue(app.staticTexts["Meal done"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["Another meal"].exists, "the free meal is spent")
        XCTAssertTrue(app.buttons["See Pro"].exists)
        keep("meal-done-after-free-meal")

        app.navigationBars.buttons.firstMatch.tap()
        scroll(to: count)
        XCTAssertTrue(count.label.contains("Pro"), count.label)
        count.tap()
        XCTAssertTrue(app.staticTexts["That was your free meal."].waitForExistence(timeout: 5), "paywall now, not the meal screen")
    }

    func testBackingOutOfALongFreeMealStillShowsThePaywall() {
        app.launchArguments = skipFirstRun + newInstall + simulatedChews
        app.launch()
        let count = row("Count my chews")
        scroll(to: count)
        count.tap()
        XCTAssertTrue(app.buttons["Start meal"].waitForExistence(timeout: 5))
        app.buttons["Start meal"].tap()
        XCTAssertTrue(app.buttons["Skip for now"].waitForExistence(timeout: 5))
        app.buttons["Skip for now"].tap()
        XCTAssertTrue(app.buttons["Finish"].waitForExistence(timeout: 5))
        sleep(31)
        app.navigationBars.buttons.firstMatch.tap()
        XCTAssertTrue(app.staticTexts["That was your free meal."].waitForExistence(timeout: 5))
    }

    /// Every Chew Lab label the phone test guide (docs/launch/cys) tells Dr. TJ to look for.
    func testDeveloperSectionAndChewLabMatchTheGuide() {
        app.launchArguments = skipFirstRun
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
        app.launchArguments = skipFirstRun
        app.launch()
        XCUIDevice.shared.press(.home)
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        XCTAssertTrue(springboard.icons["Count Skinny"].waitForExistence(timeout: 5))
        keep("home-screen")
    }
}
