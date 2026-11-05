import SwiftUI
import UIKit

/// Runs one Chew Number test. Tapping needs no sensor and no permission. AirPods are only used
/// when the user asks for them, and if no motion arrives the test carries on by tapping.
@MainActor
final class ChewNumberController: ObservableObject {
    enum Phase: Equatable { case ready, tapping, airPods, result(Int) }

    @Published private(set) var phase = Phase.ready
    @Published private(set) var test = ChewNumberTest()
    @Published private(set) var note: String?

    var count: Int { test.count }
    var canUseAirPods: Bool { sensor.isAvailable }
    var results: ChewNumberResults { store.load() }

    private let sensor: any ChewSensing
    private let store: ChewNumberStore
    private let now: () -> Date
    private var lastSample = Date()
    private var watchdog: Task<Void, Never>?

    init(sensor: (any ChewSensing)? = nil, store: ChewNumberStore = ChewNumberStore(),
         now: @escaping () -> Date = Date.init) {
        let sensor = sensor ?? makeChewSensor()
        self.sensor = sensor
        self.store = store
        self.now = now
        sensor.hapticsEnabled = false
    }

    func startTapping() {
        test = ChewNumberTest()
        phase = .tapping
    }

    func startAirPods() {
        test = ChewNumberTest()
        guard evaluate(isRunning: false, gap: 0) == .ready else {
            note = ChewNumberCopy.noAirPods
            phase = .tapping
            return
        }
        sensor.reset()
        lastSample = now()
        sensor.onSample = { [weak self] _, _ in
            guard let self else { return }
            self.lastSample = self.now()
        }
        sensor.onChew = { [weak self] _ in self?.test.chew() }
        sensor.start()
        ScreenAwake.hold()
        phase = .airPods
        watchdog = Task { [weak self] in
            while await Tick.wait(1) {
                guard let self else { return }
                self.checkStall()
            }
        }
    }

    /// While AirPods are counting, a tap would count the same chew twice.
    func tap() {
        guard phase == .tapping else { return }
        test.chew()
    }

    func done() {
        guard test.canFinish, phase == .tapping || phase == .airPods else { return }
        stopSensing()
        store.record(test.count)
        Analytics.shared.track(.chewNumberDone)
        phase = .result(test.count)
    }

    /// Checks that motion is still arriving. Runs once a second while AirPods are counting.
    func checkStall() {
        guard phase == .airPods, evaluate(isRunning: true, gap: now().timeIntervalSince(lastSample)) != .ready else { return }
        stopSensing()
        note = ChewNumberCopy.noAirPods
        phase = .tapping
    }

    func anotherBite() {
        test = ChewNumberTest()
        note = nil
        phase = .ready
    }

    /// The screen is going away. Safe to call twice.
    func leave() {
        stopSensing()
    }

    private func evaluate(isRunning: Bool, gap: TimeInterval) -> MealAvailability {
        MealAvailability.evaluate(isAvailable: sensor.isAvailable, permission: sensor.permission,
                                  isRunning: isRunning, secondsWithoutSample: gap)
    }

    private func stopSensing() {
        watchdog?.cancel(); watchdog = nil
        sensor.stop()
        sensor.onSample = nil
        sensor.onChew = nil
        ScreenAwake.release()
    }
}

struct ChewNumberView: View {
    @StateObject private var c = ChewNumberController()
    @Environment(\.dismiss) private var dismiss
    @State private var showPacer = false

    var body: some View {
        NavigationStack {
            content
                .padding(24)
                .navigationTitle(ChewNumberCopy.title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Close") { dismiss() }
                    }
                }
        }
        .onDisappear { c.leave() }
        .sheet(isPresented: $showPacer) { BitePacerView() }
    }

    @ViewBuilder
    private var content: some View {
        switch c.phase {
        case .ready: ready
        case .tapping: counting(tappable: true)
        case .airPods: counting(tappable: false)
        case .result(let n): result(n)
        }
    }

    private var ready: some View {
        ScrollView {
            VStack(spacing: 20) {
                Text(ChewNumberCopy.offer).font(.title3.bold()).multilineTextAlignment(.center)
                Text(ChewNumberCopy.instructions).font(.callout).multilineTextAlignment(.center)
                Button { c.startTapping() } label: {
                    Text("Tap to count").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent).controlSize(.large)
                if c.canUseAirPods {
                    Button { c.startAirPods() } label: {
                        Text("Use my AirPods").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered).controlSize(.large)
                }
                Text(ChewNumberCopy.safetyLine)
                    .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
            }
        }
    }

    private func counting(tappable: Bool) -> some View {
        VStack(spacing: 16) {
            if let note = c.note {
                Text(note).font(.callout).foregroundStyle(.orange).multilineTextAlignment(.center)
            }
            Text("\(c.count)").font(.system(size: 96, weight: .bold)).monospacedDigit()
                .contentTransition(.numericText())
                .accessibilityIdentifier("chewNumberCount")
            Text(tappable ? "Tap once per chew." : "Your AirPods are counting.")
                .font(.callout).foregroundStyle(.secondary)
            if tappable {
                Button { c.tap() } label: {
                    Text("Chew").font(.title.bold()).frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .buttonBorderShape(.roundedRectangle(radius: 24))
                .sensoryFeedback(.impact(weight: .light), trigger: c.count)
            } else {
                Spacer(minLength: 0)
            }
            Button("Done") { c.done() }
                .buttonStyle(.bordered).controlSize(.large)
                .disabled(!c.test.canFinish)
        }
    }

    private func result(_ n: Int) -> some View {
        let card = ChewNumberCard.image(for: n)
        let best = c.results.best
        return ScrollView {
            VStack(spacing: 14) {
                Text(ChewNumberCopy.yourNumber(n)).font(.largeTitle.bold())
                Text(ChewNumberCopy.bookNumber).font(.title3)
                if let best, best != n {
                    Text(ChewNumberCopy.closest(best)).font(.callout).foregroundStyle(.secondary)
                }
                if let card {
                    let image = Image(uiImage: card)
                    image.resizable().scaledToFit().frame(maxWidth: 200)
                        .accessibilityLabel(ChewNumberCard.lines(for: n).joined(separator: " "))
                    ShareLink(item: image, preview: SharePreview("My chew number", image: image)) {
                        Label("Share my number", systemImage: "square.and.arrow.up").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent).controlSize(.large)
                    .simultaneousGesture(TapGesture().onEnded { Analytics.shared.track(.shareTapped) })
                }
                Button { showPacer = true } label: {
                    Text("Try the Bite Pacer").frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered).controlSize(.large)
                Button("Try another bite") { c.anotherBite() }
                Text(ChewNumberCopy.ceilingLine + " " + ChewNumberCopy.safetyLine)
                    .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
            }
        }
    }
}
