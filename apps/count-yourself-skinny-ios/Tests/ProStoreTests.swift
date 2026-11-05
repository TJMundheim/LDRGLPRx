import XCTest
import StoreKit
import StoreKitTest
@testable import CountYourselfSkinny

/// Drives the real ProStore against CountYourselfSkinny.storekit through SKTestSession.
@MainActor
final class ProStoreTests: XCTestCase {
    var session: SKTestSession!

    override func setUp() async throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "CountYourselfSkinny", withExtension: "storekit"),
                                "storekit file missing from test bundle")
        // SKTestSession writes next to its configuration, so work on a temp copy.
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let copy = dir.appendingPathComponent("CountYourselfSkinny.storekit")
        try FileManager.default.copyItem(at: url, to: copy)
        session = try SKTestSession(contentsOf: copy)
        session.resetToDefaultState()
        session.clearTransactions()
        session.disableDialogs = true
        session.askToBuyEnabled = false
        // Two environments load no products, seen on Xcode 27 and reproduced on new simulators:
        //   1. The first test run after the app is installed on an iOS 27 simulator. The next run works.
        //   2. Every run on an iOS 26.5 simulator (SKInternalErrorDomain 3, even after a reboot).
        // Skip loudly rather than fake a pass; the file itself is still checked by
        // StoreKitConfigFileTests, which always runs.
        let probe = (try? await Product.products(for: ["cys.pro.monthly"])) ?? []
        try XCTSkipIf(probe.isEmpty, "No StoreKitTest products. First run since install on this simulator? Run the tests again. iOS 26.5 simulators never work with Xcode 27. StoreKit behaviour NOT verified.")
    }

    override func tearDown() async throws {
        session.resetToDefaultState()
        session.clearTransactions()
        session = nil
    }

    private func loadedStore() async -> ProStore {
        let s = ProStore(observeStoreKit: false)
        await s.loadProducts()
        return s
    }

    func testBothProductsLoadWithNoIntroOffer() async throws {
        let s = await loadedStore()
        XCTAssertEqual(s.loadState, .loaded)
        XCTAssertEqual(Set(s.products.map(\.id)), ["cys.pro.monthly", "cys.pro.yearly"])
        for p in s.products { XCTAssertNil(p.subscription?.introductoryOffer, p.id) }
        XCTAssertTrue(s.trialEligible.isEmpty, "no offer, so nothing to be eligible for")
    }

    func testYearlyIsListedFirst() async throws {
        let s = await loadedStore()
        XCTAssertEqual(s.products.map(\.id), ["cys.pro.yearly", "cys.pro.monthly"])
    }

    func testPlanRowsReadTheRealProducts() async throws {
        let s = await loadedStore()
        let yearly = PlanText.row(for: try XCTUnwrap(s.products.first { $0.id == "cys.pro.yearly" }), eligible: false)
        XCTAssertEqual(yearly.billed, "$4.99 a year")
        XCTAssertEqual(yearly.detail, "Pro Yearly, about 42¢ a month")
        let monthly = PlanText.row(for: try XCTUnwrap(s.products.first { $0.id == "cys.pro.monthly" }), eligible: false)
        XCTAssertEqual(monthly.billed, "$0.99 a month")
        XCTAssertEqual(monthly.detail, "Pro Monthly")
    }

    func testPurchaseSetsProAndExpiryClearsIt() async throws {
        let s = await loadedStore()
        let monthly = try XCTUnwrap(s.products.first { $0.id == "cys.pro.monthly" })
        XCTAssertFalse(s.isPro)
        let outcome = await s.purchase(monthly)
        XCTAssertEqual(outcome, .success)
        XCTAssertTrue(s.isPro)
        try session.expireSubscription(productIdentifier: "cys.pro.monthly")
        // expireSubscription doesn't touch currentEntitlements' cache, which keeps the entry
        // until a sync. The lapse test below covers the path with no sync.
        try await AppStore.sync()
        await s.refreshEntitlement()
        XCTAssertFalse(s.isPro)
    }

    /// The case a real customer hits: renewal off, period runs out, nothing is pushed to the app.
    func testPeriodRunningOutClearsProOnTheNextRefresh() async throws {
        session.timeRate = .oneRenewalEveryTwoSeconds
        let s = await loadedStore()
        let monthly = try XCTUnwrap(s.products.first { $0.id == "cys.pro.monthly" })
        let outcome = await s.purchase(monthly)
        XCTAssertEqual(outcome, .success)
        XCTAssertTrue(s.isPro)
        let transaction = try XCTUnwrap(session.allTransactions().first)
        try session.disableAutoRenewForTransaction(identifier: transaction.identifier)
        for _ in 0..<50 where s.isPro {
            try await Task.sleep(for: .milliseconds(200))
            await s.refreshEntitlement()
        }
        XCTAssertFalse(s.isPro, "still Pro 10 seconds after a 2 second period")
    }

    func testRestoreAfterClearingLocalState() async throws {
        _ = try await session.buyProduct(identifier: "cys.pro.yearly")
        let fresh = ProStore(observeStoreKit: false)
        XCTAssertFalse(fresh.isPro, "fresh store has no local entitlement")
        let outcome = await fresh.restore()
        XCTAssertEqual(outcome, .restored)
        XCTAssertTrue(fresh.isPro)
    }

    func testRestoreWithNothingToRestoreSaysSo() async {
        let s = ProStore(observeStoreKit: false)
        let outcome = await s.restore()
        XCTAssertEqual(outcome, .nothingFound)
        XCTAssertEqual(RestoreOutcome.nothingFound.message, "We couldn't find a Pro subscription on this Apple account.")
        XCTAssertFalse(s.isPro)
    }

    func testPurchaseErrorShowsAMessageAndNoPro() async throws {
        let s = await loadedStore()
        let monthly = try XCTUnwrap(s.products.first)
        try await session.setSimulatedError(.generic(.networkError(URLError(.notConnectedToInternet))), forAPI: .purchase)
        let outcome = await s.purchase(monthly)
        XCTAssertEqual(outcome, .failed("The purchase didn't go through. Please try again."))
        XCTAssertFalse(s.isPro)
    }

    func testLoadFailureIsRetryableNotEmpty() async throws {
        try await session.setSimulatedError(.generic(.networkError(URLError(.notConnectedToInternet))), forAPI: .loadProducts)
        let s = ProStore(observeStoreKit: false)
        await s.loadProducts()
        XCTAssertEqual(s.loadState, .failed)
        XCTAssertTrue(s.products.isEmpty)
        try await session.setSimulatedError(nil, forAPI: .loadProducts)
        await s.loadProducts()  // Try Again
        XCTAssertEqual(s.loadState, .loaded)
        XCTAssertEqual(s.products.count, 2)
    }

    func testAskToBuyIsPendingAndDoesNotGrantPro() async throws {
        session.askToBuyEnabled = true
        let s = await loadedStore()
        let monthly = try XCTUnwrap(s.products.first)
        let outcome = await s.purchase(monthly)
        XCTAssertEqual(outcome, .pending)
        XCTAssertNotNil(outcome.message)
        XCTAssertFalse(s.isPro)
    }

    func testUnverifiedTransactionNeverGrantsPro() async throws {
        let s = await loadedStore()
        let monthly = try XCTUnwrap(s.products.first)
        try await session.setSimulatedError(.verification(.invalidSignature), forAPI: .verification)
        let outcome = await s.purchase(monthly)
        if case .failed = outcome {} else { XCTFail("expected failed, got \(outcome)") }
        XCTAssertFalse(s.isPro)
    }
}

/// A real cancel can't be driven through SKTestSession: `.generic(.userCancelled)` comes back
/// as StoreKitError.unknown (ASDServerErrorDomain 907), not as what a cancelled sheet returns.
/// So the mapping is tested directly.
final class PurchaseOutcomeMappingTests: XCTestCase {
    func testCancelInEitherFormIsSilent() {
        XCTAssertEqual(ProStore.outcome(of: Product.PurchaseResult.userCancelled), .cancelled)
        XCTAssertEqual(ProStore.outcome(of: StoreKitError.userCancelled), .cancelled)
        XCTAssertNil(PurchaseOutcome.cancelled.message, "cancel shows nothing")
    }
    func testPendingIsPending() {
        XCTAssertEqual(ProStore.outcome(of: Product.PurchaseResult.pending), .pending)
    }
    func testAnyOtherErrorIsAMessage() {
        XCTAssertEqual(ProStore.outcome(of: StoreKitError.unknown), .failed("The purchase didn't go through. Please try again."))
        XCTAssertEqual(ProStore.outcome(of: URLError(.notConnectedToInternet)), .failed("The purchase didn't go through. Please try again."))
    }
}

final class PlanTextTests: XCTestCase {
    private let us = Locale(identifier: "en_US")

    func testBilledAmountNamesThePeriod() {
        XCTAssertEqual(PlanText.billed(price: "$0.99", unit: .month, value: 1), "$0.99 a month")
        XCTAssertEqual(PlanText.billed(price: "$4.99", unit: .year, value: 1), "$4.99 a year")
        XCTAssertEqual(PlanText.billed(price: "$5.00", unit: .month, value: 3), "$5.00 every 3 months")
    }

    func testTrialWordingOnlyWhenEligible() {
        XCTAssertEqual(PlanText.trial(days: 7, eligible: true), "first 7 days free")
        XCTAssertNil(PlanText.trial(days: 7, eligible: false))
        XCTAssertNil(PlanText.trial(days: nil, eligible: true))
    }

    private func perMonth(_ price: String, _ unit: Product.SubscriptionPeriod.Unit = .year, _ value: Int = 1,
                          code: String = "USD") -> String? {
        PlanText.perMonth(price: Decimal(string: price)!, unit: unit, value: value, currencyCode: code, locale: us)
    }

    /// Computed from the price, so a price change in App Store Connect can't leave it wrong.
    func testPerMonthLineIsComputed() {
        XCTAssertEqual(perMonth("4.99"), "about 42¢ a month")
        XCTAssertEqual(perMonth("9.99"), "about 83¢ a month")
        XCTAssertEqual(perMonth("2.99"), "about 25¢ a month")
        XCTAssertEqual(perMonth("19.99"), "about $1.67 a month")
        XCTAssertEqual(perMonth("12.00"), "about $1.00 a month")
        XCTAssertEqual(perMonth("3.00", .month, 6), "about 50¢ a month")
    }

    func testOtherCurrenciesUseTheirOwnSymbol() {
        XCTAssertEqual(perMonth("4.99", code: "EUR"), "about €0.42 a month")
    }

    func testAMonthlyPlanHasNoPerMonthLine() {
        XCTAssertNil(perMonth("0.99", .month, 1))
        XCTAssertNil(perMonth("0.99", .week, 1))
        XCTAssertNil(perMonth("0.99", .day, 7))
    }
}

/// Always runs: proves the .storekit file declares what the paywall depends on.
final class StoreKitConfigFileTests: XCTestCase {
    func testFileDeclaresBothProductsWithNoIntroOffer() throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "CountYourselfSkinny", withExtension: "storekit"))
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
        let groups = try XCTUnwrap(json["subscriptionGroups"] as? [[String: Any]])
        XCTAssertEqual(groups.count, 1)
        let subs = groups.flatMap { $0["subscriptions"] as? [[String: Any]] ?? [] }
        XCTAssertEqual(Set(subs.compactMap { $0["productID"] as? String }), ["cys.pro.monthly", "cys.pro.yearly"])
        for s in subs {
            XCTAssertTrue(s["introductoryOffer"] is NSNull, "the first counted meal is free instead of a trial")
        }
        let prices = Dictionary(uniqueKeysWithValues: subs.map { ($0["productID"] as! String, $0["displayPrice"] as! String) })
        XCTAssertEqual(prices["cys.pro.monthly"], "0.99")
        XCTAssertEqual(prices["cys.pro.yearly"], "4.99")
    }
}
