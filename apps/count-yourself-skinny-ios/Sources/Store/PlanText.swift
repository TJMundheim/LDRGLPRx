import StoreKit

/// Plan-row wording built from product data, never hard-coded prices.
enum PlanText {
    static func line(price: String, unit: Product.SubscriptionPeriod.Unit, value: Int,
                     trialDays: Int?, eligible: Bool) -> String {
        let base: String
        if value == 1 {
            base = "\(price) per \(unitName(unit))"
        } else {
            base = "\(price) every \(value) \(unitName(unit))s"
        }
        if eligible, let days = trialDays { return "\(days) days free, then \(base)." }
        return base + "."
    }

    static func line(for product: Product, eligible: Bool) -> String {
        guard let sub = product.subscription else { return product.displayPrice }
        let trial = sub.introductoryOffer.flatMap { $0.paymentMode == .freeTrial ? days($0.period) : nil }
        return line(price: product.displayPrice, unit: sub.subscriptionPeriod.unit,
                    value: sub.subscriptionPeriod.value, trialDays: trial, eligible: eligible)
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
