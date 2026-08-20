import Foundation
import StoreKit

/// StoreKit 2 subscription store — Pro monetizes from day one (TJ directive 2026-08-19).
/// Products (create in App Store Connect):
///   cys.pro.monthly  $2.99/mo, 7-day free trial
///   cys.pro.yearly   $19.99/yr, 7-day free trial
/// Book offer code (1 free month) configured as an App Store offer code campaign.
@MainActor
final class ProStore: ObservableObject {
    @Published var isPro = false
    @Published var products: [Product] = []

    private let ids = ["cys.pro.monthly", "cys.pro.yearly"]
    private var updates: Task<Void, Never>?

    init() {
        updates = Task { await observeTransactions() }
        Task {
            await loadProducts()
            await refreshEntitlement()
        }
    }
    deinit { updates?.cancel() }

    func loadProducts() async {
        products = (try? await Product.products(for: ids)) ?? []
    }

    func purchase(_ product: Product) async {
        guard let result = try? await product.purchase() else { return }
        if case .success(let verification) = result,
           case .verified(let transaction) = verification {
            await transaction.finish()
            await refreshEntitlement()
        }
    }

    func refreshEntitlement() async {
        for await entitlement in Transaction.currentEntitlements {
            if case .verified(let t) = entitlement, ids.contains(t.productID) {
                isPro = true
                return
            }
        }
        isPro = false
    }

    private func observeTransactions() async {
        for await update in Transaction.updates {
            if case .verified(let t) = update {
                await t.finish()
                await refreshEntitlement()
            }
        }
    }
}
