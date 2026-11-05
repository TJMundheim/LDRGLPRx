#if DEBUG
import XCTest
@testable import CountYourselfSkinny

@MainActor
final class ProPretendTests: XCTestCase {
    func testPretendProOpensGatesAndIsNotPersisted() {
        let a = ProStore(observeStoreKit: false)
        XCTAssertFalse(a.isPro)
        a.pretendPro = true
        XCTAssertTrue(a.isPro)
        let b = ProStore(observeStoreKit: false)
        XCTAssertFalse(b.isPro, "a fresh run starts without pretend")
    }
}
#endif
