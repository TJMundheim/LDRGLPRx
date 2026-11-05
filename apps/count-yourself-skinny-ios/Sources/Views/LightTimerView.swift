import SwiftUI

/// First Light: 10 minutes outside. Time comes from dates, so it keeps counting in the background.
struct LightTimerView: View {
    @EnvironmentObject var store: CountStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    @State private var session = LightSession()
    private let ticker = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationStack {
            TimelineView(.periodic(from: .now, by: 1)) { context in
                let remaining = Int(session.remaining(at: context.date).rounded(.up))
                VStack(spacing: 20) {
                    Spacer()
                    Text(String(format: "%d:%02d", remaining / 60, remaining % 60))
                        .font(.system(size: 72, weight: .bold)).monospacedDigit()
                    Text(session.isFinished(at: context.date)
                         ? "Done. Ten minutes of light banked."
                         : "Outside, eyes open, no sunglasses. Minutes are credited as they finish.")
                        .multilineTextAlignment(.center).foregroundStyle(.secondary).padding(.horizontal)
                    Text("Today: \(store.lightMinutesToday)/10 min").monospacedDigit()
                    Button(session.isRunning ? "Pause" : (session.elapsed(at: context.date) > 0 ? "Resume" : "Start")) {
                        if session.isRunning { session.pause(at: .now) } else { session.start(at: .now) }
                        credit()
                    }
                    .buttonStyle(.borderedProminent).controlSize(.large)
                    .disabled(session.isFinished(at: context.date))
                    Spacer()
                }
            }
            .navigationTitle("First Light")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
        .onReceive(ticker) { _ in credit() }
        .onChange(of: scenePhase) { _, _ in credit() }
        .onDisappear { credit() }
    }

    private func credit() {
        let due = session.minutesDue(at: .now)
        guard due > 0 else { return }
        store.creditLight(minutes: due)
        session.markCredited(due)
    }
}
