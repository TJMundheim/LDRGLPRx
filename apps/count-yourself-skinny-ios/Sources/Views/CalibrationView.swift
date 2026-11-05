import SwiftUI
import UIKit

/// Drives the calibration run. The decisions live in `CalibrationFlow`; this holds the
/// sensor, the clock and the haptic.
@MainActor
final class CalibrationController: ObservableObject {
    @Published private(set) var flow = CalibrationFlow()
    @Published private(set) var secondsLeft = Int(CalibrationFlow.stillSeconds)
    @Published private(set) var beat = 0
    @Published private(set) var problem: MealAvailability?

    private let sensor: any ChewSensing
    private let calibration: CalibrationStore
    private let now: () -> Date
    private let autoplay: Bool
    private var run: Task<Void, Never>?
    private var started = Date()
    private var lastSample: Date?
    private let haptic = UIImpactFeedbackGenerator(style: .light)

    /// `autoplay: false` lets a test step the clock itself instead of waiting two minutes.
    init(sensor: (any ChewSensing)? = nil, calibration: CalibrationStore = CalibrationStore(),
         now: @escaping () -> Date = Date.init, autoplay: Bool = true) {
        let sensor = sensor ?? ChewDetector()
        self.sensor = sensor
        self.calibration = calibration
        self.now = now
        self.autoplay = autoplay
        sensor.hapticsEnabled = false
    }

    func begin() {
        problem = nil
        if flow.phase == .intro { flow.begin() }
        let a = MealAvailability.evaluate(isAvailable: sensor.isAvailable, permission: sensor.permission,
                                          isRunning: false, secondsWithoutSample: 0)
        guard a == .ready else { problem = a; return }
        sensor.reset()
        lastSample = nil
        started = now()
        sensor.onSample = { [weak self] scalar, t in
            guard let self else { return }
            self.lastSample = self.now()
            self.flow.ingest(scalar: scalar, t: t)
        }
        sensor.start()
        ScreenAwake.hold()
        haptic.prepare()
        secondsLeft = Int(CalibrationFlow.stillSeconds)
        if autoplay { run = Task { await self.play() } }
    }

    /// One second of the still period. Returns false when the run has stopped on a problem.
    /// The countdown waits for the first sample, so the permission alert isn't "sitting still".
    func stillTick() -> Bool {
        guard lastSample != nil else {
            let a = MealAvailability.evaluate(isAvailable: sensor.isAvailable, permission: sensor.permission,
                                              isRunning: true, secondsWithoutSample: now().timeIntervalSince(started))
            if a != .ready {
                problem = a
                end()
                return false
            }
            return true
        }
        secondsLeft -= 1
        return true
    }

    private func play() async {
        while secondsLeft > 0 {
            guard await Tick.wait(1), stillTick() else { return }
        }
        flow.advance()
        while case .round(let n) = flow.phase {
            beat = 0
            for _ in 1...CalibrationFlow.chewsPerRound {
                try? await Task.sleep(for: .seconds(CalibrationFlow.beat))
                if Task.isCancelled { return }
                beat += 1
                haptic.impactOccurred()
            }
            try? await Task.sleep(for: .seconds(0.8))   // let the last chew land
            if Task.isCancelled { return }
            flow.advance()
            if n < CalibrationFlow.rounds {
                try? await Task.sleep(for: .seconds(CalibrationFlow.restSeconds))
                if Task.isCancelled { return }
                flow.advance()
            }
        }
        end()
    }

    func retry() {
        flow.retry()
        begin()
    }

    func save() {
        flow.save(to: calibration)
        if flow.phase == .saved { Analytics.shared.track(.calibrationCompleted) }
    }

    func skip() {
        end()
        flow.skip(store: calibration)
    }

    /// Stops everything and restores the screen timer. Safe to call twice.
    func end() {
        run?.cancel()
        run = nil
        sensor.stop()
        sensor.onSample = nil
        ScreenAwake.release()
    }
}

struct CalibrationView: View {
    @StateObject private var c = CalibrationController()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 24) {
            Spacer(minLength: 0)
            content
            Spacer(minLength: 0)
            footer
        }
        .padding(28)
        .onDisappear { c.end() }
        .interactiveDismissDisabled(isRunning)
    }

    private var isRunning: Bool {
        switch c.flow.phase {
        case .still, .round, .rest: return true
        default: return false
        }
    }

    @ViewBuilder
    private var content: some View {
        if let problem = c.problem {
            problemView(problem)
        } else {
            switch c.flow.phase {
            case .intro:
                title("Tune it to you", "About 2 minutes. Put your AirPods in. You'll need something to chew: a bite of food or a piece of gum.")
                Text("First you sit still for 20 seconds. Then three rounds of 32 chews, in time with the buzz.")
                    .font(.callout).foregroundStyle(.secondary).multilineTextAlignment(.center)
                Button("Start") { c.begin() }.buttonStyle(.borderedProminent).controlSize(.large)
            case .still:
                title("Sit still", "Don't chew or talk. Head still.")
                Text("\(c.secondsLeft)").font(.system(size: 96, weight: .bold)).monospacedDigit()
            case .round(let n):
                title("Round \(n) of \(CalibrationFlow.rounds)", "Chew in time with the buzz.")
                Text("\(c.beat)").font(.system(size: 96, weight: .bold)).monospacedDigit()
                Text("of \(CalibrationFlow.chewsPerRound)").foregroundStyle(.secondary)
            case .rest(let n):
                title("Swallow.", n < CalibrationFlow.rounds ? "Next round starts in a moment. Take a fresh bite." : "")
            case .rejected(let r):
                title("That didn't work", CalibrationFlow.message(for: r))
                Button("Try Again") { c.retry() }.buttonStyle(.borderedProminent).controlSize(.large)
            case .calibrated:
                title("Done", "Your count is tuned to you. The count is an estimate. Your rhythm matters more than the exact number.")
                Button("Save") { c.save(); dismiss() }.buttonStyle(.borderedProminent).controlSize(.large)
            case .saved, .skipped:
                ProgressView().onAppear { dismiss() }
            }
        }
    }

    @ViewBuilder
    private func problemView(_ p: MealAvailability) -> some View {
        title(MotionHelp.title(p), p == .unsupported
              ? "Headphone motion isn't available here. You can skip, and the Bite Pacer still counts to 32."
              : MotionHelp.detail(p))
        if p == .notConnected {
            Button("Try Again") { c.begin() }.buttonStyle(.borderedProminent).controlSize(.large)
        }
        if p == .denied, let settings = MotionHelp.settingsURL {
            Link("Open Settings", destination: settings).buttonStyle(.bordered)
        }
    }

    @ViewBuilder
    private var footer: some View {
        switch c.flow.phase {
        case .saved, .skipped, .calibrated: EmptyView()
        default:
            Button("Skip for now") { c.skip(); dismiss() }
                .font(.footnote).foregroundStyle(.secondary)
        }
    }

    private func title(_ head: String, _ sub: String) -> some View {
        VStack(spacing: 8) {
            Text(head).font(.title2.bold())
            if !sub.isEmpty {
                Text(sub).font(.callout).foregroundStyle(.secondary).multilineTextAlignment(.center)
            }
        }
    }
}
