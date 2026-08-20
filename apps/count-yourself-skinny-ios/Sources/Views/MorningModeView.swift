import SwiftUI

/// "One Walk, Five Boxes" — the signature demo screen (master plan §3).
/// Steps, light minutes, and fast hours tick simultaneously during the fasted walk.
struct MorningModeView: View {
    @EnvironmentObject var store: CountStore
    @State private var walkStart: Date?

    var body: some View {
        List {
            box("figure.walk", "Steps", "\(store.steps) / 2,500", store.steps >= 2500)
            box("sun.max", "Morning light", "\(store.lightMinutesToday) / 10 min", store.lightMinutesToday >= 10)
            box("clock", "Fast extended", String(format: "%.1f h", store.fastHours), store.fastHours >= 12)
            box("moon.zzz", "Tonight's sleep", "set by this light", walkStart != nil)
            box("drop", "Water", "\(store.waterBeforeNoon) / 2", store.waterBeforeNoon >= 2)
        }
        .navigationTitle("One Walk, Five Boxes")
        .safeAreaInset(edge: .bottom) {
            Button(walkStart == nil ? "Start the walk" : "Finish — eat breakfast") {
                if walkStart == nil { walkStart = .now } else { walkStart = nil }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding()
        }
        .task {
            // tick light minutes while walk is running
            while true {
                try? await Task.sleep(for: .seconds(60))
                if walkStart != nil { store.lightMinutesToday += 1 }
                await store.requestSteps()
            }
        }
    }

    private func box(_ icon: String, _ title: String, _ value: String, _ done: Bool) -> some View {
        HStack {
            Image(systemName: done ? "checkmark.square.fill" : "square")
                .foregroundStyle(done ? .green : .secondary)
            Image(systemName: icon).frame(width: 28)
            Text(title)
            Spacer()
            Text(value).monospacedDigit().foregroundStyle(.secondary)
        }
    }
}
