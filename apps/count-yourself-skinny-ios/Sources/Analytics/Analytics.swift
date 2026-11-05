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
    case nextDoorShown = "next_door_shown"
    case nextDoorTapped = "next_door_tapped"
    case chewNumberDone = "chew_number_done"
    case shareTapped = "share_tapped"
}

/// PostHog capture over plain URLSession, keyed to a random ID kept on the phone. Failures are silent.
struct Analytics {
    static let idKey = "cys.analytics.id"
    /// Off until the first-run question is answered. About can change it.
    static let consentKey = "cys.analytics.consent"
    static let shared = Analytics()

    /// Public PostHog client key (same one the website ships).
    private static let apiKey = "phc_qZQbqDfKqxUFtSpb79Ex967RkMHdmx7axp8mzFABEYbY"
    private static let endpoint = URL(string: "https://us.i.posthog.com/capture/")!

    private let session: URLSession
    private let defaults: UserDefaults
    private let appVersion: String
    private let sending: Bool

    /// Only a Release build on a real device sends. Debug builds, test runs and every
    /// simulator run stay silent, so nobody's testing lands in the live numbers.
    static var defaultSending: Bool {
        #if DEBUG || targetEnvironment(simulator)
        return false
        #else
        return true
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

    var consented: Bool { defaults.bool(forKey: Self.consentKey) }

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
                "$geoip_disable": true,
            ] as [String: Any],
        ]
    }

    func track(_ event: AnalyticsEvent) {
        guard sending, consented else { return }
        Task.detached(priority: .utility) { await send(event) }
    }

    func send(_ event: AnalyticsEvent) async {
        guard sending, consented,
              let body = try? JSONSerialization.data(withJSONObject: payload(for: event)) else { return }
        var req = URLRequest(url: Self.endpoint, timeoutInterval: 10)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
        _ = try? await session.data(for: req)
    }
}
