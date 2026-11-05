import SwiftUI
import StoreKit

struct PaywallView: View {
    @EnvironmentObject var pro: ProStore
    @Environment(\.dismiss) private var dismiss
    @State private var busy = false
    @State private var message: String?

    private let terms = URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!
    private let privacy = URL(string: "https://www.my4mlife.com/legal/count-yourself-skinny-privacy")!

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Image(systemName: "airpods.pro")
                    .font(.system(size: 56))
                    .accessibilityHidden(true)
                Text("Your earbuds can count your chews.")
                    .font(.title2.bold())
                    .multilineTextAlignment(.center)
                VStack(alignment: .leading, spacing: 10) {
                    Label("Automatic chew counting through AirPods", systemImage: "checkmark")
                    Label("A chime at 32, right in your ear", systemImage: "checkmark")
                    Label("Weekly trends for chews per bite and eating pace", systemImage: "checkmark")
                    Label("Your chew motion stays on your phone.", systemImage: "lock")
                }
                .font(.callout)
                .frame(maxWidth: .infinity, alignment: .leading)
                Text("Works with AirPods Pro, AirPods (3rd generation or later), and AirPods Max. No AirPods? The Bite Pacer is free.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                plans

                if let message {
                    Text(message)
                        .font(.footnote)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.orange)
                }

                Text("Billed through your Apple account. Renews automatically until canceled at least 24 hours before the period ends. Cancel anytime in Settings.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                Button("Restore Purchases") { Task { await restore() } }
                    .font(.footnote)
                    .disabled(busy)
                HStack(spacing: 16) {
                    Link("Terms of Use", destination: terms)
                    Link("Privacy Policy", destination: privacy)
                }
                .font(.footnote)
                Button("Have a code from the book?") { Task { await redeem() } }
                    .font(.footnote)
                Button("Not now") { dismiss() }
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .padding(24)
        }
        .onAppear { Analytics.shared.track(.paywallView) }
        .task { if pro.loadState == .failed { await pro.loadProducts() } }
        .onChange(of: pro.isPro) { _, isPro in
            if isPro { dismiss() }   // an offer code or an Ask to Buy approval lands here
        }
    }

    @ViewBuilder private var plans: some View {
        switch pro.loadState {
        case .loading:
            ProgressView().padding()
        case .failed:
            VStack(spacing: 8) {
                Text("We couldn't load the plans. Check your connection and try again.")
                    .font(.callout)
                    .multilineTextAlignment(.center)
                Button("Try Again") { Task { await pro.loadProducts() } }
                    .buttonStyle(.bordered)
            }
        case .loaded:
            VStack(spacing: 10) {
                ForEach(pro.products, id: \.id) { product in
                    Button { Task { await buy(product) } } label: {
                        VStack(spacing: 2) {
                            Text("\(product.displayName) — \(product.displayPrice)")
                                .font(.headline)
                            Text(PlanText.line(for: product, eligible: pro.trialEligible.contains(product.id)))
                                .font(.caption)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(busy)
                }
            }
        }
    }

    private func buy(_ product: Product) async {
        busy = true; defer { busy = false }
        Analytics.shared.track(.purchaseStarted)
        let outcome = await pro.purchase(product)
        message = outcome.message
        if outcome == .success { Analytics.shared.track(.purchaseSuccess); dismiss() }
    }

    private func restore() async {
        busy = true; defer { busy = false }
        Analytics.shared.track(.restoreTapped)
        let outcome = await pro.restore()
        message = outcome.message
        if outcome == .restored { dismiss() }
    }

    private func redeem() async {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene else { return }
        do {
            try await AppStore.presentOfferCodeRedeemSheet(in: scene)
            message = nil
        } catch {
            message = "We couldn't open the code screen. Please try again."
        }
    }
}
