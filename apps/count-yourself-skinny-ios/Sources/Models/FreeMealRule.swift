import Foundation

/// The opening words of the paywall, which depend on what the user has already done.
struct PaywallCopy: Equatable {
    let title: String
    let result: String?
    let note: String
}

/// One AirPods-counted meal is free, so people see the count work before they pay.
///
/// The meal log is the only record: the free meal is spent once a saved meal has at least one
/// completed 32-chew round (`bites >= 1`). So AirPods that never connect, a meal under 30 seconds
/// (neither is saved), a meal where nothing was counted, and a false chew or talking that never
/// reached 32 all leave it unspent, and deleting the app resets it.
enum FreeMealRule {
    static func isUsed(meals: [MealRecord]) -> Bool {
        meals.contains(where: counted)
    }

    static func canCount(isPro: Bool, meals: [MealRecord]) -> Bool {
        isPro || !isUsed(meals: meals)
    }

    static func canSeeTrends(isPro: Bool) -> Bool { isPro }

    /// Should the paywall follow this meal? `saved` is nil when nothing was saved.
    static func endedFreeMeal(_ saved: MealRecord?, isPro: Bool) -> Bool {
        guard !isPro, let saved else { return false }
        return counted(saved)
    }

    static func paywallCopy(meals: [MealRecord]) -> PaywallCopy {
        let title = "Your earbuds can count your chews."
        let keepCounting = "Pro keeps counting every meal after this one."
        let neutral = "Pro keeps counting every meal."
        let countedMeals = meals.filter(counted)
        guard let only = countedMeals.first else {
            return PaywallCopy(title: title, result: nil,
                               note: "Your first counted meal is free, with no subscription. Start it from Count my chews on the home screen.")
        }
        // More than one counted meal means a subscription has lapsed: no "free meal" or "this one" wording.
        guard countedMeals.count == 1 else { return PaywallCopy(title: title, result: nil, note: neutral) }
        return PaywallCopy(title: "That was your free meal.", result: MealSessionModel.summary(for: only), note: keepCounting)
    }

    private static func counted(_ meal: MealRecord) -> Bool { meal.bites >= 1 }
}
