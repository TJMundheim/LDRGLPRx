import XCTest
@testable import CountYourselfSkinny

final class NextDoorRuleTests: XCTestCase {
    var cal: Calendar!
    var start: Date!

    override func setUp() {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "America/New_York")!
        cal = c
        start = c.date(from: DateComponents(year: 2026, month: 1, day: 1, hour: 8))!
    }

    func day(_ n: Int) -> Date { cal.date(byAdding: .day, value: n, to: start)! }

    func shows(_ r: NextDoorRule, streak: Int = 0, longest: Int = 0, at n: Int) -> Bool {
        r.shows(streak: streak, longest: longest, now: day(n), calendar: cal)
    }
    func dismiss(_ r: inout NextDoorRule, streak: Int = 0, longest: Int = 0, at n: Int) {
        r.dismiss(streak: streak, longest: longest, now: day(n), calendar: cal)
    }

    func testHiddenForNewUser() {
        XCTAssertFalse(shows(NextDoorRule(firstUse: start), at: 0))
    }

    func testNeverInTheFirstThirtyDaysWithoutAThirtyDayStreak() {
        let r = NextDoorRule(firstUse: start)
        for n in 0...30 { XCTAssertFalse(shows(r, streak: 29, longest: 29, at: n), "day \(n)") }
    }

    func testShowsAtThirtyDayStreak() {
        let r = NextDoorRule(firstUse: start)
        XCTAssertFalse(shows(r, streak: 29, longest: 29, at: 29))
        XCTAssertTrue(shows(r, streak: 30, longest: 30, at: 30))
    }

    func testAnEarnedLongestStillCountsAfterTheStreakBreaks() {
        XCTAssertTrue(shows(NextDoorRule(firstUse: start), streak: 2, longest: 30, at: 40))
    }

    func testTwelveWeeksSinceFirstUseShowsWithNoStreakAtAll() {
        let r = NextDoorRule(firstUse: start)
        XCTAssertFalse(shows(r, at: 83))
        XCTAssertTrue(shows(r, at: 84))
    }

    func testAClockSetBackwardNeverShows() {
        XCTAssertFalse(shows(NextDoorRule(firstUse: start), at: -200))
    }

    func testDismissHidesUntilTheNextMilestone() {
        var r = NextDoorRule(firstUse: start)
        dismiss(&r, streak: 30, longest: 30, at: 30)
        XCTAssertFalse(shows(r, streak: 30, longest: 30, at: 30))
        XCTAssertFalse(shows(r, streak: 59, longest: 59, at: 59))
        XCTAssertTrue(shows(r, streak: 60, longest: 60, at: 60))
    }

    func testComesBackAtSixtyAndNinetyThenNeverAgain() {
        var r = NextDoorRule(firstUse: start)
        dismiss(&r, streak: 30, longest: 30, at: 30)
        dismiss(&r, streak: 60, longest: 60, at: 60)
        XCTAssertFalse(shows(r, streak: 89, longest: 89, at: 89))
        XCTAssertTrue(shows(r, streak: 90, longest: 90, at: 90))
        dismiss(&r, streak: 90, longest: 90, at: 90)
        XCTAssertFalse(shows(r, streak: 90, longest: 90, at: 90))
        XCTAssertFalse(shows(r, streak: 400, longest: 400, at: 400))
    }

    func testDismissingTheTimeTriggerDoesNotReturnUntilSixty() {
        var r = NextDoorRule(firstUse: start)
        dismiss(&r, at: 84)
        XCTAssertFalse(shows(r, at: 200), "more time alone never brings it back")
        XCTAssertFalse(shows(r, streak: 30, longest: 30, at: 200), "thirty is the milestone it already showed for")
        XCTAssertTrue(shows(r, streak: 60, longest: 60, at: 200))
    }

    func testJumpingPastAMilestoneReturnsOnlyOnce() {
        var r = NextDoorRule(firstUse: start)
        dismiss(&r, streak: 30, longest: 30, at: 30)
        XCTAssertTrue(shows(r, streak: 95, longest: 95, at: 95))
        dismiss(&r, streak: 95, longest: 95, at: 95)
        XCTAssertFalse(shows(r, streak: 95, longest: 95, at: 96))
    }

    func testMarkShownIsTrueOncePerMilestone() {
        var r = NextDoorRule(firstUse: start)
        XCTAssertFalse(r.markShown(streak: 1, longest: 1, now: day(1), calendar: cal), "not showing, nothing to count")
        XCTAssertTrue(r.markShown(streak: 30, longest: 30, now: day(30), calendar: cal))
        XCTAssertFalse(r.markShown(streak: 31, longest: 31, now: day(31), calendar: cal), "same milestone")
        XCTAssertTrue(r.markShown(streak: 60, longest: 60, now: day(60), calendar: cal))
    }

    func testSurvivesAJSONRoundTrip() throws {
        var r = NextDoorRule(firstUse: start)
        dismiss(&r, streak: 30, longest: 30, at: 30)
        let back = try JSONDecoder().decode(NextDoorRule.self, from: JSONEncoder().encode(r))
        XCTAssertEqual(back, r)
        XCTAssertFalse(shows(back, streak: 30, longest: 30, at: 31))
    }

    func testCardCopy() {
        XCTAssertEqual(AboutContent.nextDoorHeading, "What comes after skinny?")
        XCTAssertEqual(AboutContent.nextDoorButton, "Take the Brain Check")
        XCTAssertEqual(AboutContent.nextDoorLink.absoluteString, "https://www.my4mlife.com/assessment?src=cys-app")
        XCTAssertTrue(AboutContent.nextDoorBody.contains("about 7 minutes"))
        XCTAssertEqual(AboutContent.nextDoorBody.filter { $0 == "." }.count, 1, "one sentence")
        let body = AboutContent.nextDoorBody.lowercased()
        for word in ["treat", "cure", "prevent", "reverse", "diagnos", "heal", "alzheimer", "dementia"] {
            XCTAssertFalse(body.contains(word), word)
        }
    }
}
