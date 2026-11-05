import StoreKit

/// Plan-row wording built from product data, never hard-coded prices.
enum PlanText {
    /// `billed` is the biggest price on the row (guideline 3.1.2). `detail` stays secondary.
    struct Row: Equatable {
        let billed: String
        let detail: String
    }

    static func row(for product: Product, eligible: Bool) -> Row {
        guard let sub = product.subscription else { return Row(billed: product.displayPrice, detail: product.displayName) }
        let period = sub.subscriptionPeriod
        let trialDays = sub.introductoryOffer.flatMap { $0.paymentMode == .freeTrial ? days($0.period) : nil }
        let style = product.priceFormatStyle
        let parts = [product.displayName,
                     perMonth(price: product.price, unit: period.unit, value: period.value,
                              currencyCode: style.currencyCode, locale: style.locale),
                     trial(days: trialDays, eligible: eligible)]
        return Row(billed: billed(price: product.displayPrice, unit: period.unit, value: period.value),
                   detail: parts.compactMap { $0 }.joined(separator: ", "))
    }

    static func billed(price: String, unit: Product.SubscriptionPeriod.Unit, value: Int) -> String {
        value == 1 ? "\(price) a \(unitName(unit))" : "\(price) every \(value) \(unitName(unit))s"
    }

    /// Only for a plan billed over several months, rounded to the cent. Under a dollar, US
    /// prices read in cents. Week and day plans have no honest monthly figure.
    static func perMonth(price: Decimal, unit: Product.SubscriptionPeriod.Unit, value: Int,
                         currencyCode: String, locale: Locale) -> String? {
        let months: Int
        switch unit {
        case .month: months = value
        case .year: months = value * 12
        default: return nil
        }
        guard months > 1 else { return nil }
        let monthly = price / Decimal(months)
        var cents = monthly * 100
        var rounded = Decimal()
        NSDecimalRound(&rounded, &cents, 0, .plain)
        if currencyCode == "USD", rounded < 100 { return "about \(rounded)¢ a month" }
        return "about \(monthly.formatted(.currency(code: currencyCode).locale(locale))) a month"
    }

    static func trial(days: Int?, eligible: Bool) -> String? {
        guard eligible, let days else { return nil }
        return "first \(days) days free"
    }

    private static func unitName(_ u: Product.SubscriptionPeriod.Unit) -> String {
        switch u {
        case .day: "day"
        case .week: "week"
        case .month: "month"
        case .year: "year"
        @unknown default: "period"
        }
    }

    private static func days(_ p: Product.SubscriptionPeriod) -> Int {
        switch p.unit {
        case .day: p.value
        case .week: p.value * 7
        case .month: p.value * 30
        case .year: p.value * 365
        @unknown default: p.value
        }
    }
}
