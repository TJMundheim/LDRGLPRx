import Foundation
import StoreKit

enum ProLoadState: Equatable { case loading, loaded, failed }

enum PurchaseOutcome: Equatable {
    case success, cancelled, pending
    case failed(String)

    /// Text for the paywall. Cancel is silent by design.
    var message: String? {
        switch self {
        case .success, .cancelled: nil
        case .pending: "Waiting for approval. Pro turns on as soon as it's approved."
        case .failed(let m): m
        }
    }
}

enum RestoreOutcome: Equatable {
    case restored, nothingFound, cancelled
    case failed(String)

    var message: String? {
        switch self {
        case .restored, .cancelled: nil
        case .nothingFound: "We couldn't find a Pro subscription on this Apple account."
        case .failed(let m): m
        }
    }
}

/// StoreKit 2 subscription store — Pro monetizes from day one (TJ directive 2026-08-19).
/// Products (create in App Store Connect):
///   cys.pro.monthly  $2.99/mo, 7-day free trial
///   cys.pro.yearly   $19.99/yr, 7-day free trial
/// Book offer code (1 free month) configured as an App Store offer code campaign.
@MainActor
final class ProStore: ObservableObject {
    @Published private var entitled = false
    var isPro: Bool {
        #if DEBUG
        return entitled || pretendPro
        #else
        return entitled
        #endif
    }
    #if DEBUG
    /// Developer builds only: lets Dr. TJ's phone test reach Pro screens. Never saved.
    @Published var pretendPro = false
    #endif
    @Published private(set) var products: [Product] = []
    @Published private(set) var loadState: ProLoadState = .loading
    /// Product ids that still qualify for the free trial.
    @Published private(set) var trialEligible: Set<String> = []

    private let ids = ["cys.pro.monthly", "cys.pro.yearly"]
    private var updates: Task<Void, Never>?

    init(observeStoreKit: Bool = true) {
        guard observeStoreKit else { return }
        updates = Task { await observeTransactions() }
        Task {
            await loadProducts()
            await refreshEntitlement()
        }
    }
    deinit { updates?.cancel() }

    func loadProducts() async {
        loadState = .loading
        do {
            let found = try await Product.products(for: ids)
            guard !found.isEmpty else { loadState = .failed; return }
            products = found.sorted { $0.price < $1.price }
            var eligible: Set<String> = []
            for p in products where await p.subscription?.isEligibleForIntroOffer == true {
                eligible.insert(p.id)
            }
            trialEligible = eligible
            loadState = .loaded
        } catch {
            products = []
            loadState = .failed
        }
    }

    func purchase(_ product: Product) async -> PurchaseOutcome {
        do {
            switch try await product.purchase() {
            case .success(.verified(let transaction)):
                await transaction.finish()
                await refreshEntitlement()
                return .success
            case .success(.unverified):
                return .failed("We couldn't verify that purchase. Please try again.")
            case .pending:
                return .pending
            case .userCancelled:
                return .cancelled
            @unknown default:
                return .failed("The purchase didn't go through. Please try again.")
            }
        } catch StoreKitError.userCancelled {
            return .cancelled
        } catch {
            return .failed("The purchase didn't go through. Please try again.")
        }
    }

    func restore() async -> RestoreOutcome {
        do {
            try await AppStore.sync()
        } catch StoreKitError.userCancelled {
            return .cancelled
        } catch {
            return .failed("We couldn't reach the App Store. Please try again.")
        }
        await refreshEntitlement()
        return entitled ? .restored : .nothingFound
    }

    func refreshEntitlement() async {
        for await entitlement in Transaction.currentEntitlements {
            if case .verified(let t) = entitlement, ids.contains(t.productID), t.revocationDate == nil {
                entitled = true
                return
            }
        }
        entitled = false
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
