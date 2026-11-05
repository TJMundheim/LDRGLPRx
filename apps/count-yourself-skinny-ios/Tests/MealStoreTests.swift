import XCTest
@testable import CountYourselfSkinny

final class MealStoreTests: XCTestCase {
    var suite: String!
    var defaults: UserDefaults!

    override func setUp() {
        suite = "cys.meals.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suite)
    }
    override func tearDown() { defaults.removePersistentDomain(forName: suite) }

    func meal(_ start: TimeInterval, mins: Double = 10, chews: Int = 320, bites: Int = 10) -> MealRecord {
        let s = Date(timeIntervalSince1970: start)
        return MealRecord(id: UUID(), start: s, end: s.addingTimeInterval(mins * 60), chews: chews, bites: bites)
    }

    func testEmptyLoad() {
        XCTAssertEqual(MealStore(defaults: defaults).load(), [])
    }

    func testSaveAndLoadRoundTrip() {
        let store = MealStore(defaults: defaults)
        let m = meal(1_000)
        store.save(m)
        XCTAssertEqual(store.load(), [m])
    }

    func testNewestFirst() {
        let store = MealStore(defaults: defaults)
        let a = meal(1_000), b = meal(3_000), c = meal(2_000)
        [a, b, c].forEach(store.save)
        XCTAssertEqual(store.load().map(\.id), [b.id, c.id, a.id])
    }

    func testSurvivesRelaunch() {
        let m = meal(5_000)
        MealStore(defaults: defaults).save(m)
        XCTAssertEqual(MealStore(defaults: defaults).load(), [m])
    }

    func testSavingSameIdReplaces() {
        let store = MealStore(defaults: defaults)
        var m = meal(1_000)
        store.save(m)
        m.chews = 999
        store.save(m)
        XCTAssertEqual(store.load().count, 1)
        XCTAssertEqual(store.load().first?.chews, 999)
    }

    func testCorruptDataStartsEmptyAndRecovers() {
        defaults.set(Data("not json{{".utf8), forKey: MealStore.defaultsKey)
        let store = MealStore(defaults: defaults)
        XCTAssertEqual(store.load(), [])
        let m = meal(1_000)
        store.save(m)
        XCTAssertEqual(store.load(), [m])
    }

    func testWrongTypeStoredStartsEmpty() {
        defaults.set("a string", forKey: MealStore.defaultsKey)
        XCTAssertEqual(MealStore(defaults: defaults).load(), [])
    }

    func testStoredOnlyLocallyInDefaults() {
        MealStore(defaults: defaults).save(meal(1_000))
        XCTAssertNotNil(defaults.data(forKey: MealStore.defaultsKey))
    }
}
