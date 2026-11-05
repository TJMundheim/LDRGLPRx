import XCTest
@testable import CountYourselfSkinny

/// Reads what actually shipped in the app bundle, not what a config file says.
final class BundleConfigTests: XCTestCase {
    func testVersionComesFromTheBuildSettingNotAHardcodedPlist() {
        let info = Bundle.main.infoDictionary ?? [:]
        let short = info["CFBundleShortVersionString"] as? String ?? ""
        XCTAssertEqual(short.split(separator: ".").count, 3, "MARKETING_VERSION is x.y.z; got \(short)")
        XCTAssertFalse(short.contains("$"), "build setting was not expanded")
        XCTAssertFalse((info["CFBundleVersion"] as? String ?? "$").contains("$"))
    }

    func testShortNameUnderTheIcon() {
        XCTAssertEqual(Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String, "Count Skinny")
    }

    func testDebugBuildIsTheFreeAppleIDBuild() {
        #if DEBUG
        XCTAssertEqual(Bundle.main.bundleIdentifier, "com.my4mlife.countyourselfskinny.dev",
                       "a personal team must never claim the App Store id")
        XCTAssertFalse(CountStore.defaultHealthEntitled, "Debug has no HealthKit entitlement, so it must not call HealthKit")
        #endif
    }

    func testUsageStringsSayWhyAndNothingAboutUpdatingHealth() {
        let info = Bundle.main.infoDictionary ?? [:]
        XCTAssertNotNil(info["NSHealthShareUsageDescription"])
        XCTAssertNil(info["NSHealthUpdateUsageDescription"], "steps are read-only")
        XCTAssertNotNil(info["NSMotionUsageDescription"])
    }

    private func manifest() throws -> [String: Any] {
        let url = try XCTUnwrap(Bundle.main.url(forResource: "PrivacyInfo", withExtension: "xcprivacy"))
        let data = try Data(contentsOf: url)
        return try XCTUnwrap(PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any])
    }

    private func collected() throws -> [String: [String: Any]] {
        let rows = try XCTUnwrap(try manifest()["NSPrivacyCollectedDataTypes"] as? [[String: Any]])
        return Dictionary(uniqueKeysWithValues: rows.map { ($0["NSPrivacyCollectedDataType"] as! String, $0) })
    }

    func testManifestDeclaresExactlyWhatTheAppSends() throws {
        let c = try collected()
        XCTAssertEqual(Set(c.keys), ["NSPrivacyCollectedDataTypeProductInteraction",
                                     "NSPrivacyCollectedDataTypeDeviceID",
                                     "NSPrivacyCollectedDataTypePurchaseHistory",
                                     "NSPrivacyCollectedDataTypeEmailAddress"])
    }

    func testAnalyticsRowsAreLinkedBecauseEveryEventCarriesAPersistentID() throws {
        let c = try collected()
        for key in ["NSPrivacyCollectedDataTypeProductInteraction", "NSPrivacyCollectedDataTypeDeviceID",
                    "NSPrivacyCollectedDataTypePurchaseHistory"] {
            let row = try XCTUnwrap(c[key])
            XCTAssertEqual(row["NSPrivacyCollectedDataTypeLinked"] as? Bool, true, key)
            XCTAssertEqual(row["NSPrivacyCollectedDataTypeTracking"] as? Bool, false, key)
            XCTAssertEqual(row["NSPrivacyCollectedDataTypePurposes"] as? [String],
                           ["NSPrivacyCollectedDataTypePurposeAnalytics"], key)
        }
    }

    func testEmailIsForDeveloperMarketingOnly() throws {
        let row = try XCTUnwrap(try collected()["NSPrivacyCollectedDataTypeEmailAddress"])
        XCTAssertEqual(row["NSPrivacyCollectedDataTypeLinked"] as? Bool, true)
        XCTAssertEqual(row["NSPrivacyCollectedDataTypeTracking"] as? Bool, false)
        XCTAssertEqual(row["NSPrivacyCollectedDataTypePurposes"] as? [String],
                       ["NSPrivacyCollectedDataTypePurposeDeveloperAdvertising"])
    }

    func testNoTrackingAndOnlyUserDefaultsAsARequiredReasonAPI() throws {
        let m = try manifest()
        XCTAssertEqual(m["NSPrivacyTracking"] as? Bool, false)
        let apis = try XCTUnwrap(m["NSPrivacyAccessedAPITypes"] as? [[String: Any]])
        XCTAssertEqual(apis.count, 1)
        XCTAssertEqual(apis[0]["NSPrivacyAccessedAPIType"] as? String, "NSPrivacyAccessedAPICategoryUserDefaults")
        XCTAssertEqual(apis[0]["NSPrivacyAccessedAPITypeReasons"] as? [String], ["CA92.1"])
    }
}
