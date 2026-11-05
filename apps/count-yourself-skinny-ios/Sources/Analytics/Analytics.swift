import Foundation

/// The only events the app can send. No free-form properties exist, so no health
/// number, email or count can ride along.
enum AnalyticsEvent: String, CaseIterable {
    case appOpen = "app_open"
    case paywallView = "paywall_view"
    case purchaseStarted = "purchase_started"
    case purchaseSuccess = "purchase_success"
    case restoreTapped = "restore_tapped"
    case calibrationCompleted = "calibration_completed"
    case mealCompleted = "meal_completed"
    case trendsViewed = "trends_viewed"
    case contactSubmitted = "contact_submitted"
}

/// Anonymous PostHog capture over plain URLSession. Failures are silent.
struct Analytics {
    static let idKey = "cys.analytics.id"
    static let shared = Analytics()

    /// Public PostHog client key (same one the website ships).
    private static let apiKey = "phc_qZQbqDfKqxUFtSpb79Ex967RkMHdmx7axp8mzFABEYbY"
    private static let endpoint = URL(string: "https://us.i.posthog.com/capture/")!

    private let session: URLSession
    private let defaults: UserDefaults
    private let appVersion: String
    private let sending: Bool

    /// Debug builds and test runs never send.
    static var defaultSending: Bool {
        #if DEBUG
        return false
        #else
        return NSClassFromString("XCTestCase") == nil
        #endif
    }

    init(session: URLSession = .shared,
         defaults: UserDefaults = .standard,
         appVersion: String = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown",
         sending: Bool = Analytics.defaultSending) {
        self.session = session
        self.defaults = defaults
        self.appVersion = appVersion
        self.sending = sending
    }

    /// Random UUID, made once and kept.
    var distinctID: String {
        if let id = defaults.string(forKey: Self.idKey) { return id }
        let id = UUID().uuidString
        defaults.set(id, forKey: Self.idKey)
        return id
    }

    func payload(for event: AnalyticsEvent) -> [String: Any] {
        [
            "api_key": Self.apiKey,
            "event": event.rawValue,
            "distinct_id": distinctID,
            "properties": [
                "$lib": "cys-ios",
                "app_version": appVersion,
                "$process_person_profile": false,
            ] as [String: Any],
        ]
    }

    func track(_ event: AnalyticsEvent) {
        guard sending else { return }
        Task.detached(priority: .utility) { await send(event) }
    }

    func send(_ event: AnalyticsEvent) async {
        guard sending,
              let body = try? JSONSerialization.data(withJSONObject: payload(for: event)) else { return }
        var req = URLRequest(url: Self.endpoint, timeoutInterval: 10)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
        _ = try? await session.data(for: req)
    }
}
