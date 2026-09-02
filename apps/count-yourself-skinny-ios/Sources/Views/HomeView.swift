import SwiftUI

/// One home screen, five live counters + streak (master plan §3 v1 scope).
struct HomeView: View {
    @EnvironmentObject var store: CountStore
    @EnvironmentObject var pro: ProStore
    @State private var showPacer = false
    @State private var showPaywall = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    StreakCard(streak: store.streak)
                }
                Section("Today's counts") {
                    CounterRow(icon: "fork.knife", title: "Bite Pacer",
                               value: "32 chews", tint: .orange) { showPacer = true }
                    CounterRow(icon: "figure.walk", title: "Steps",
                               value: "\(store.steps)", tint: .green) { }
                    CounterRow(icon: "clock", title: "Fast clock",
                               value: String(format: "%.1f h", store.fastHours), tint: .blue) {
                        store.tapLastBite()
                    }
                    CounterRow(icon: "sun.max", title: "First Light",
                               value: "\(store.lightMinutesToday)/10 min", tint: .yellow) { }
                    CounterRow(icon: "drop", title: "Water before noon",
                               value: "\(store.waterBeforeNoon)/2", tint: .cyan) {
                        store.waterBeforeNoon = min(2, store.waterBeforeNoon + 1)
                    }
                }
                Section {
                    NavigationLink("One Walk, Five Boxes — morning mode") {
                        MorningModeView()
                    }
                }
                if !pro.isPro {
                    Section {
                        Button("Unlock AirPods chew counting — Pro") { showPaywall = true }
                    }
                }
            }
            .navigationTitle("Count Yourself Skinny")
            .sheet(isPresented: $showPacer) { BitePacerView() }
            .sheet(isPresented: $showPaywall) { PaywallView() }
            .task { await store.requestSteps() }
        }
    }
}

struct CounterRow: View {
    let icon: String, title: String, value: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon).foregroundStyle(tint).frame(width: 28)
                Text(title)
                Spacer()
                Text(value).monospacedDigit().foregroundStyle(.secondary)
            }
            .contentShape(Rectangle())   // whole row is tappable, not just the text
        }
        .buttonStyle(.plain)
    }
}

struct StreakCard: View {
    let streak: Int
    var body: some View {
        VStack(spacing: 4) {
            Text("\(streak)").font(.system(size: 56, weight: .bold)).monospacedDigit()
            Text(streak == 1 ? "day in a row" : "days in a row").foregroundStyle(.secondary)
            Text("Never miss twice.").font(.caption).foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }
}
