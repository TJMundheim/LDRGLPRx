import SwiftUI

/// The no-earbuds-required chew counter: haptic cadence to 32, fork-down cue.
/// Works for every user on day one; AirPods auto-counting is the Pro upgrade.
struct BitePacerView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var chew = 0
    @State private var running = false
    private let target = 32
    private let cadence: TimeInterval = 0.9 // ~1.1 Hz, natural chew rhythm

    var body: some View {
        VStack(spacing: 32) {
            Text(chew >= target ? "Swallow. Fork down." : "Chew")
                .font(.title2).foregroundStyle(.secondary)
            Text("\(chew)")
                .font(.system(size: 120, weight: .bold)).monospacedDigit()
                .contentTransition(.numericText())
            Button(running ? "Pause" : (chew >= target ? "Next bite" : "Start bite")) {
                if chew >= target { chew = 0 }
                running.toggle()
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            Button("Done") { dismiss() }
        }
        .task(id: running) {
            guard running else { return }
            while running && chew < target {
                try? await Task.sleep(for: .seconds(cadence))
                chew += 1
                UIImpactFeedbackGenerator(style: chew == target ? .heavy : .light).impactOccurred()
                if chew >= target { running = false }
            }
        }
    }
}
