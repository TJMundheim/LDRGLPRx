import XCTest
@testable import CountYourselfSkinny

final class FreeMealRuleTests: XCTestCase {
    private let t0 = Date(timeIntervalSince1970: 1_000_000)

    private func meal(chews: Int, at offset: TimeInterval = 0, seconds: TimeInterval = 600) -> MealRecord {
        let start = t0.addingTimeInterval(offset)
        return MealRecord(id: UUID(), start: start, end: start.addingTimeInterval(seconds), chews: chews,
                          bites: chews / MealSessionModel.chewsPerBite)
    }

    func testAFreeUserGetsOneMeal() {
        XCTAssertTrue(FreeMealRule.canCount(isPro: false, meals: []))
        XCTAssertFalse(FreeMealRule.isUsed(meals: []))
    }

    func testASavedMealSpendsIt() {
        let meals = [meal(chews: 96)]
        XCTAssertTrue(FreeMealRule.isUsed(meals: meals))
        XCTAssertFalse(FreeMealRule.canCount(isPro: false, meals: meals))
    }

    func testAMealThatCountedNothingDoesNotSpendIt() {
        let meals = [meal(chews: 0)]
        XCTAssertFalse(FreeMealRule.isUsed(meals: meals), "the AirPods never counted, so they haven't seen it work")
        XCTAssertTrue(FreeMealRule.canCount(isPro: false, meals: meals))
    }

    func testAFalseChewOrTalkingDoesNotSpendIt() {
        let talking = MealRecord(id: UUID(), start: t0, end: t0.addingTimeInterval(600), chews: 20, bites: 0)
        XCTAssertFalse(FreeMealRule.isUsed(meals: [talking]), "no completed 32-chew round")
        XCTAssertTrue(FreeMealRule.canCount(isPro: false, meals: [talking]))
        XCTAssertFalse(FreeMealRule.endedFreeMeal(talking, isPro: false))
        XCTAssertNil(FreeMealRule.paywallCopy(meals: [talking]).result)
        XCTAssertEqual(FreeMealRule.paywallCopy(meals: [talking]).note,
                       "Your first counted meal is free, with no subscription. Start it from Count my chews on the home screen.")
    }

    func testOneCompletedRoundSpendsIt() {
        let one = MealRecord(id: UUID(), start: t0, end: t0.addingTimeInterval(600), chews: 33, bites: 1)
        XCTAssertTrue(FreeMealRule.isUsed(meals: [one]))
        XCTAssertTrue(FreeMealRule.endedFreeMeal(one, isPro: false))
    }

    func testProIsAlwaysAllowed() {
        XCTAssertTrue(FreeMealRule.canCount(isPro: true, meals: []))
        XCTAssertTrue(FreeMealRule.canCount(isPro: true, meals: [meal(chews: 96), meal(chews: 40, at: 100)]))
    }

    func testTrendsStaysPro() {
        XCTAssertFalse(FreeMealRule.canSeeTrends(isPro: false))
        XCTAssertTrue(FreeMealRule.canSeeTrends(isPro: true))
    }

    func testThePaywallFollowsOnlyAFreeUsersCountedMeal() {
        XCTAssertTrue(FreeMealRule.endedFreeMeal(meal(chews: 96), isPro: false))
        XCTAssertFalse(FreeMealRule.endedFreeMeal(meal(chews: 96), isPro: true), "Pro never sees it")
        XCTAssertFalse(FreeMealRule.endedFreeMeal(meal(chews: 0), isPro: false), "nothing counted")
        XCTAssertFalse(FreeMealRule.endedFreeMeal(nil, isPro: false), "under 30 seconds saves nothing")
    }

    func testPaywallBeforeTheFreeMealSaysItIsThere() {
        let copy = FreeMealRule.paywallCopy(meals: [])
        XCTAssertEqual(copy.title, "Your earbuds can count your chews.")
        XCTAssertNil(copy.result)
        XCTAssertEqual(copy.note, "Your first counted meal is free, with no subscription. Start it from Count my chews on the home screen.")
    }

    func testPaywallAfterTheFreeMealShowsItsResult() {
        let m = meal(chews: 96)
        let copy = FreeMealRule.paywallCopy(meals: [m])
        XCTAssertEqual(copy.title, "That was your free meal.")
        XCTAssertEqual(copy.result, MealSessionModel.summary(for: m))
        XCTAssertEqual(copy.note, "Pro keeps counting every meal after this one.")
    }

    func testPaywallIgnoresAMealThatCountedNothing() {
        XCTAssertNil(FreeMealRule.paywallCopy(meals: [meal(chews: 0)]).result)
    }

    func testALapsedSubscriberIsNotToldTheyJustHadAFreeMeal() {
        let copy = FreeMealRule.paywallCopy(meals: [meal(chews: 96), meal(chews: 64, at: 86_400)])
        XCTAssertEqual(copy.title, "Your earbuds can count your chews.")
        XCTAssertNil(copy.result)
        XCTAssertEqual(copy.note, "Pro keeps counting every meal.")
        XCTAssertFalse(copy.note.contains("this one"))
    }
}
