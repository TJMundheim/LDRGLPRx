import Foundation

enum ContactResult: Equatable { case success, invalidEmail, tooSoon, failed }

/// Measures real time since the form appeared. The server treats under 3 seconds as a bot.
struct ContactForm {
    static let minimumMs = 3000
    let appeared: Date

    func elapsedMs(now: Date) -> Int { max(0, Int(now.timeIntervalSince(appeared) * 1000)) }

    func canSubmit(now: Date, email: String) -> Bool {
        elapsedMs(now: now) >= Self.minimumMs && ContactCapture.normalize(email) != nil
    }
}

/// Posts a volunteered email to the My4MLife lead list. Email only; no analytics ID.
struct ContactCapture {
    private static let endpoint = URL(string: "https://v9svm8ds74.execute-api.us-east-2.amazonaws.com/api/lead-capture")!
    private static let pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    var session: URLSession = .shared

    static func normalize(_ raw: String) -> String? {
        let e = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard e.count <= 254, e.wholeMatch(of: pattern) != nil else { return nil }
        return e
    }

    static func payload(email: String, elapsedMs: Int) -> [String: Any] {
        ["email": email, "source": "cys-app", "hp": "", "t": elapsedMs]
    }

    func submit(email: String, elapsedMs: Int) async -> ContactResult {
        guard let clean = Self.normalize(email) else { return .invalidEmail }
        guard elapsedMs >= ContactForm.minimumMs else { return .tooSoon }
        guard let body = try? JSONSerialization.data(withJSONObject: Self.payload(email: clean, elapsedMs: elapsedMs)) else { return .failed }
        var req = URLRequest(url: Self.endpoint, timeoutInterval: 15)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
        guard let (_, resp) = try? await session.data(for: req),
              let code = (resp as? HTTPURLResponse)?.statusCode, (200..<300).contains(code) else { return .failed }
        return .success
    }
}
