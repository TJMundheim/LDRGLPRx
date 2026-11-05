import SwiftUI
import StoreKit

enum AboutContent {
    static let disclaimer = "Count Yourself Skinny is an educational tool. It isn't medical advice and doesn't diagnose or treat anything. Talk to your own physician before changing how you eat or fast, especially if you're pregnant, have diabetes, take medication, or have a history of disordered eating."
    static let fastNote = "Start at 12 hours. The book's ladder stops at 16. If you're pregnant, have diabetes, take medication, or have a history of disordered eating, talk to your physician first."
    static let homeFootnote = "An educational tool, not medical advice. Talk to your physician before changing how you eat or fast."
    static let consent = "Enter your email to get updates and offers from My4MLife. Unsubscribe anytime. We never ask for this to use the app."
    static let safetyAge = "This app is for adults 18 and over."
    static let safetyEatingDisorder = "It isn't for anyone with a current or past eating disorder. If that's you, please talk to your own physician or an eating disorder specialist instead."
    static let safetyPacing = "A chew count is a pacing tool, not a score. More isn't better."
    static let safetyStop = "If counting makes eating stressful, stop counting and talk to your own physician."
    static let usageTitle = "Share anonymous usage events"
    static let usageBody = "Event names like \"app opened\" and \"meal completed\", with a random ID made on this phone. Never your counts, weight, steps or email. The app works the same either way."
    static let fontCredit = "The share card uses the Anton font, copyright 2020 The Anton Project Authors, under the SIL Open Font License 1.1."
    static let identityLine = "Don't lose your identity and your dignity while you still have a choice."
    static let assessment = URL(string: "https://www.my4mlife.com/assessment")!
    static let privacy = URL(string: "https://www.my4mlife.com/legal/count-yourself-skinny-privacy")!
    static let terms = URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!
    static let nextDoorHeading = "What comes after skinny?"
    static let nextDoorBody = "Keeping your mind sharp is the long game, and the free Brain Check takes about 7 minutes to show you where to start."
    static let nextDoorButton = "Take the Brain Check"
    static let nextDoorLink = URL(string: "https://www.my4mlife.com/assessment?src=cys-app")!

    static func versionText(short: String?, build: String?) -> String {
        guard let short else { return "Version unknown" }
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
    @AppStorage(Analytics.consentKey) private var shareUsage = false

    private var versionText: String {
        let info = Bundle.main.infoDictionary
        return AboutContent.versionText(short: info?["CFBundleShortVersionString"] as? String,
                                        build: info?["CFBundleVersion"] as? String)
    }

    var body: some View {
        List {
            Section("Good to know") {
                Text(AboutContent.disclaimer).font(.callout)
                Text("\(AboutContent.safetyAge) \(AboutContent.safetyEatingDisorder)").font(.callout)
                Text("\(AboutContent.safetyPacing) \(AboutContent.safetyStop)").font(.callout)
            }
            Section {
                Toggle(AboutContent.usageTitle, isOn: $shareUsage)
            } header: {
                Text("Usage data")
            } footer: {
                Text(AboutContent.usageBody)
            }
            Section("Your subscription") {
                Button("Restore Purchases") { Task { await restore() } }
                if let restoreMessage { Text(restoreMessage).font(.footnote).foregroundStyle(.orange) }
                Button("Manage Subscription") { showManage = true }
            }
            Section {
                Link("Privacy Policy", destination: AboutContent.privacy)
                Link("Terms of Use", destination: AboutContent.terms)
            } header: {
                Text("Legal")
            } footer: {
                Text(AboutContent.fontCredit)
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
