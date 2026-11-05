import SwiftUI
import UIKit

/// Runs one meal. Counting decisions live in `MealSessionModel`; this holds the sensor,
/// the chime and the haptic.
@MainActor
final class MealController: ObservableObject {
    enum Phase: Equatable { case idle, running, finished(String) }

    @Published private(set) var phase: Phase = .idle
    @Published private(set) var chewsInBite = 0
    @Published private(set) var bites = 0
    @Published private(set) var availability: MealAvailability

    private let sensor: any ChewSensing
    private let chime: any ChimePlaying
    private let heavy = UIImpactFeedbackGenerator(style: .heavy)
    private let meals: MealStore
    private let calibration: CalibrationStore
    private let now: () -> Date
    private var model: MealSessionModel?
    private var watchdog: Task<Void, Never>?
    private var lastSample = Date()

    init(sensor: (any ChewSensing)? = nil, chime: any ChimePlaying = ChimePlayer(),
         meals: MealStore = MealStore(), calibration: CalibrationStore = CalibrationStore(),
         now: @escaping () -> Date = Date.init) {
        let sensor = sensor ?? ChewDetector()
        self.sensor = sensor
        self.chime = chime
        self.meals = meals
        self.calibration = calibration
        self.now = now
        sensor.hapticsEnabled = false
        availability = MealAvailability.evaluate(isAvailable: sensor.isAvailable, permission: sensor.permission,
                                                 isRunning: false, secondsWithoutSample: 0)
    }

    var needsCalibration: Bool { calibration.needsFirstRun }

    /// A finished meal's summary always wins, even when AirPods dropping is what finished it.
    var showsBlockedScreen: Bool {
        if case .finished = phase { return false }
        return availability != .ready
    }

    func start() {
        guard phase != .running else { return }
        availability = evaluate(isRunning: false, gap: 0)
        guard availability == .ready else { return }
        sensor.reset()
        sensor.sensitivity = calibration.kOrDefault
        model = MealSessionModel(start: now())
        chewsInBite = 0; bites = 0
        lastSample = now()
        sensor.onSample = { [weak self] _, _ in
            guard let self else { return }
            self.lastSample = self.now()
        }
        sensor.onChew = { [weak self] _ in self?.chewed() }
        chime.prepare()
        heavy.prepare()
        sensor.start()
        ScreenAwake.hold()
        phase = .running
        watchdog = Task { [weak self] in
            while await Tick.wait(1) {
                guard let self else { return }
                self.checkStall()
            }
        }
    }

    private func chewed() {
        guard phase == .running, var m = model else { return }
        let biteDone = m.registerChew()
        model = m
        chewsInBite = m.chewsInBite
        bites = m.bites
        if biteDone {
            chime.play()
            heavy.impactOccurred()
            heavy.prepare()
        }
    }

    private func evaluate(isRunning: Bool, gap: TimeInterval) -> MealAvailability {
        MealAvailability.evaluate(isAvailable: sensor.isAvailable, permission: sensor.permission,
                                  isRunning: isRunning, secondsWithoutSample: gap)
    }

    /// Checks that motion is still arriving. Runs once a second during a meal.
    func checkStall() {
        guard phase == .running else { return }
        let a = evaluate(isRunning: true, gap: now().timeIntervalSince(lastSample))
        guard a != .ready else { return }
        // Keep what was counted if the meal was long enough.
        if (model?.totalChews ?? 0) > 0 { finish() } else { halt() }
        availability = a
    }

    /// Motion pauses while the app is in the background, so that gap says nothing about AirPods.
    func returnedToForeground() { lastSample = now() }

    func finish() {
        guard phase == .running, let m = model else { return }
        let record = m.finish(at: now())
        if let record { meals.save(record); Analytics.shared.track(.mealCompleted) }
        halt()
        phase = .finished(record.map(MealSessionModel.summary(for:)) ?? MealSessionModel.shortMealSummary)
    }

    /// The screen is going away: keep a meal in progress, then release everything.
    func leave() {
        finish()
        halt()
    }

    func again() {
        phase = .idle
        availability = evaluate(isRunning: false, gap: 0)
    }

    /// Stops sensing and restores the screen timer and audio session. Safe to call twice.
    func halt() {
        watchdog?.cancel(); watchdog = nil
        sensor.stop()
        sensor.onSample = nil
        sensor.onChew = nil
        chime.stop()
        ScreenAwake.release()
        if phase == .running { phase = .idle }
    }
}

struct MealView: View {
    @StateObject private var c = MealController()
    @State private var showCalibration = false
    @State private var startAfterCalibration = false
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        VStack(spacing: 24) {
            Spacer(minLength: 0)
            main
            Spacer(minLength: 0)
            Text("The count is an estimate. Your rhythm matters more than the exact number.")
                .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
        }
        .padding(28)
        .navigationTitle("Count my chews")
        .navigationBarTitleDisplayMode(.inline)
        .onDisappear { c.leave() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { c.returnedToForeground() }
        }
        .sheet(isPresented: $showCalibration, onDismiss: {
            if startAfterCalibration { startAfterCalibration = false; c.start() }
        }) { CalibrationView() }
    }

    @ViewBuilder
    private var main: some View {
        if c.showsBlockedScreen {
            blocked
        } else {
            switch c.phase {
            case .idle:
                Image(systemName: "airpods.pro").font(.system(size: 56))
                Text("Put in your AirPods, take a bite, and start.").font(.title3).multilineTextAlignment(.center)
                Button("Start meal") {
                    if c.needsCalibration { startAfterCalibration = true; showCalibration = true }
                    else { c.start() }
                }
                .buttonStyle(.borderedProminent).controlSize(.large)
                Button("Tune to me") { showCalibration = true }.font(.footnote)
            case .running:
                Text("\(c.chewsInBite)").font(.system(size: 120, weight: .bold)).monospacedDigit()
                    .contentTransition(.numericText())
                Text("of \(MealSessionModel.chewsPerBite)").font(.title2).foregroundStyle(.secondary)
                Text("\(c.bites) \(c.bites == 1 ? "bite" : "bites")").font(.title3).monospacedDigit()
                Button("Finish") { c.finish() }.buttonStyle(.borderedProminent).controlSize(.large)
            case .finished(let summary):
                Text("Meal done").font(.title2.bold())
                Text(summary).font(.callout).multilineTextAlignment(.center)
                Button("Another meal") { c.again() }.buttonStyle(.bordered)
            }
        }
    }

    private var blocked: some View {
        VStack(spacing: 14) {
            Image(systemName: "airpods.pro").font(.system(size: 56)).foregroundStyle(.secondary)
            Text(MotionHelp.title(c.availability))
                .font(.title3.bold()).multilineTextAlignment(.center)
            Text(MotionHelp.detail(c.availability))
                .font(.callout).foregroundStyle(.secondary).multilineTextAlignment(.center)
            Text("The free Bite Pacer still counts to 32 with a buzz. Find it on the home screen.")
                .font(.callout).multilineTextAlignment(.center)
            if c.availability == .notConnected {
                Button("Try Again") { c.again() }.buttonStyle(.bordered)
            }
            if c.availability == .denied, let settings = MotionHelp.settingsURL {
                Link("Open Settings", destination: settings).buttonStyle(.bordered)
            }
        }
    }
}

/// The one set of words for why chew counting can't run.
enum MotionHelp {
    static let settingsURL = URL(string: UIApplication.openSettingsURLString)

    static func title(_ a: MealAvailability) -> String {
        switch a {
        case .unsupported: "This iPhone can't read headphone motion"
        case .denied: "Motion access is off"
        case .notConnected, .ready: "No AirPods found"
        }
    }

    static func detail(_ a: MealAvailability) -> String {
        switch a {
        case .unsupported:
            "Counting needs AirPods Pro, AirPods Max or AirPods (3rd generation) or later, and an iPhone that can read their motion."
        case .denied:
            "Chew counting reads your AirPods' motion, on your phone only. Turn on Motion & Fitness for this app in Settings."
        case .notConnected, .ready:
            "Put in AirPods Pro, AirPods Max or AirPods (3rd generation) or later, and make sure they're connected."
        }
    }
}
