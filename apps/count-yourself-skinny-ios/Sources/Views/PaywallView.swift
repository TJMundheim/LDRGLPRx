import SwiftUI
import StoreKit

struct PaywallView: View {
    @EnvironmentObject var pro: ProStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "airpods.pro")
                .font(.system(size: 56))
            Text("Your earbuds can count your chews.")
                .font(.title2.bold())
                .multilineTextAlignment(.center)
            VStack(alignment: .leading, spacing: 10) {
                Label("Automatic chew counting through AirPods", systemImage: "checkmark")
                Label("In-ear chime at 32 — eyes stay on the table", systemImage: "checkmark")
                Label("Trends: chews per meal, eating speed over weeks", systemImage: "checkmark")
                Label("On-device only. Nothing recorded, nothing uploaded.", systemImage: "lock")
            }
            .font(.callout)

            ForEach(pro.products, id: \.id) { product in
                Button {
                    Task { await pro.purchase(product); if pro.isPro { dismiss() } }
                } label: {
                    Text("\(product.displayName) — \(product.displayPrice)")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
            Button("Have a code from the book?") {
                // App Store offer-code redemption sheet
                if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                    Task { try? await AppStore.presentOfferCodeRedeemSheet(in: scene) }
                }
            }
            .font(.footnote)
            Button("Not now") { dismiss() }.font(.footnote).foregroundStyle(.secondary)
        }
        .padding(28)
    }
}
