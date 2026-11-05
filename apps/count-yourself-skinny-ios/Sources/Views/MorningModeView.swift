import SwiftUI

/// "One Walk, Five Boxes": steps, light, hours, sleep and water, all from one walk before breakfast.
struct MorningModeView: View {
    @EnvironmentObject var store: CountStore
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        TimelineView(.periodic(from: .now, by: 30)) { _ in
            List {
                box("figure.walk", "Steps", "\(store.steps.formatted()) / 2,500", store.steps >= 2500)
                box("sun.max", "Morning light", "\(store.lightMinutesToday) / 10 min", store.lightMinutesToday >= 10)
                box("clock", "Fast extended", FastClock.label(hours: store.fastHours), (store.fastHours ?? 0) >= 12)
                box("moon.zzz", "Tonight's sleep", "set by this light", store.lightMinutesToday >= 10)
                box("drop", "Water", "\(store.waterBeforeNoon) / 2", store.waterBeforeNoon >= 2)
            }
        }
        .navigationTitle("One Walk, Five Boxes")
        .safeAreaInset(edge: .bottom) {
            Button(store.walk == nil ? "Start the walk" : "Finish — eat breakfast") {
                if store.walk == nil { store.startWalk() } else { store.finishWalk() }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding()
        }
        .task {
            store.creditWalk()
            await store.requestSteps()
            while await Tick.wait(15) { store.creditWalk() }
        }
        .task {
            while await Tick.wait(60) { await store.requestSteps() }
        }
        .onChange(of: scenePhase) { _, _ in store.creditWalk() }
        .onDisappear { store.creditWalk() }
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
