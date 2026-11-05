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
///   cys.pro.yearly   $4.99/yr, no trial
///   cys.pro.monthly  $0.99/mo, no trial
/// The first counted meal is free instead of a trial: see FreeMealRule.
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
    /// Product ids that still qualify for a free trial. Empty today: this is what lets a trial
    /// come back from App Store Connect alone, which is the pricing plan's fallback.
    @Published private(set) var trialEligible: Set<String> = []

    /// In paywall order: yearly first.
    private let ids = ["cys.pro.yearly", "cys.pro.monthly"]
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
            products = found.sorted { (ids.firstIndex(of: $0.id) ?? 0) < (ids.firstIndex(of: $1.id) ?? 0) }
            var eligible: Set<String> = []
            for p in products where p.subscription?.introductoryOffer != nil {
                if await p.subscription?.isEligibleForIntroOffer == true { eligible.insert(p.id) }
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
            let result = try await product.purchase()
            if case .success(.verified(let transaction)) = result {
                await transaction.finish()
                await refreshEntitlement()
            }
            return Self.outcome(of: result)
        } catch {
            return Self.outcome(of: error)
        }
    }

    /// Every result but a verified success, which `purchase` handles because it has work to do.
    nonisolated static func outcome(of result: Product.PurchaseResult) -> PurchaseOutcome {
        switch result {
        case .success(.verified):
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
    }

    nonisolated static func outcome(of error: Error) -> PurchaseOutcome {
        if case StoreKitError.userCancelled = error { return .cancelled }
        return .failed("The purchase didn't go through. Please try again.")
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
