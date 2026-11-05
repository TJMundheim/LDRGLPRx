import SwiftUI
import StoreKit

enum AboutContent {
    static let disclaimer = "Count Yourself Skinny is an educational tool. It isn't medical advice and doesn't diagnose or treat anything. Talk to your own physician before changing how you eat or fast, especially if you're pregnant, have diabetes, or take medication."
    static let consent = "Enter your email to get updates and offers from My4MLife. Unsubscribe anytime. We never ask for this to use the app."
    static let identityLine = "Don't lose your identity and your dignity while you still have a choice."
    static let assessment = URL(string: "https://www.my4mlife.com/assessment")!
    static let privacy = URL(string: "https://www.my4mlife.com/legal/count-yourself-skinny-privacy")!
    static let terms = URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!

    static func versionText(short: String?, build: String?) -> String {
        guard let short else { return "Version 1.0.0" }
        guard let build else { return "Version \(short)" }
        return "Version \(short) (\(build))"
    }
}

struct AboutView: View {
    @EnvironmentObject var pro: ProStore
    @State private var email = ""
    @State private var form = ContactForm(appeared: Date())
    @State private var sending = false
    @State private var done = false
    @State private var message: String?
    @State private var restoreMessage: String?
    @State private var showManage = false

    private var versionText: String {
        let info = Bundle.main.infoDictionary
        return AboutContent.versionText(short: info?["CFBundleShortVersionString"] as? String,
                                        build: info?["CFBundleVersion"] as? String)
    }

    var body: some View {
        List {
            Section("Good to know") {
                Text(AboutContent.disclaimer).font(.callout)
            }
            Section("Your subscription") {
                Button("Restore Purchases") { Task { await restore() } }
                if let restoreMessage { Text(restoreMessage).font(.footnote).foregroundStyle(.orange) }
                Button("Manage Subscription") { showManage = true }
            }
            Section("Legal") {
                Link("Privacy Policy", destination: AboutContent.privacy)
                Link("Terms of Use", destination: AboutContent.terms)
            }
            Section {
                if done {
                    Text("Thank you. You're on the list.")
                } else {
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    TimelineView(.periodic(from: .now, by: 0.5)) { ctx in
                        Button(sending ? "Sending..." : "Sign up") { Task { await submit() } }
                            .disabled(sending || !form.canSubmit(now: ctx.date, email: email))
                    }
                    if let message { Text(message).font(.footnote).foregroundStyle(.orange) }
                }
            } header: {
                Text("Want updates?")
            } footer: {
                Text(AboutContent.consent)
            }
            Section {
                Link("What comes after skinny?", destination: AboutContent.assessment)
                Text(AboutContent.identityLine).font(.footnote).foregroundStyle(.secondary)
            }
            Section { Text(versionText).foregroundStyle(.secondary) }
        }
        .navigationTitle("About")
        .manageSubscriptionsSheet(isPresented: $showManage)
        .onAppear { form = ContactForm(appeared: Date()) }
    }

    private func submit() async {
        sending = true; defer { sending = false }
        let result = await ContactCapture().submit(email: email, elapsedMs: form.elapsedMs(now: Date()))
        switch result {
        case .success:
            done = true; message = nil
            Analytics.shared.track(.contactSubmitted)
        case .invalidEmail: message = "That email doesn't look right. Please check it."
        case .tooSoon, .failed: message = "That didn't go through. Please try again."
        }
    }

    private func restore() async {
        Analytics.shared.track(.restoreTapped)
        let outcome = await pro.restore()
        restoreMessage = outcome == .restored ? "Pro is restored." : outcome.message
    }
}
