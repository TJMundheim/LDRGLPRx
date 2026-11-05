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

    let detector = ChewDetector()
    private let chime = ChimePlayer()
    private let heavy = UIImpactFeedbackGenerator(style: .heavy)
    private let meals: MealStore
    private let calibration: CalibrationStore
    private var model: MealSessionModel?
    private var watchdog: Task<Void, Never>?
    private var lastSample = Date()

    init(meals: MealStore = MealStore(), calibration: CalibrationStore = CalibrationStore()) {
        self.meals = meals
        self.calibration = calibration
        availability = .ready
        detector.hapticsEnabled = false
        availability = MealAvailability.evaluate(isAvailable: detector.isAvailable, isConnected: false,
                                                 isRunning: false, secondsWithoutSample: 0)
    }

    var needsCalibration: Bool { calibration.needsFirstRun }

    func start() {
        guard detector.isAvailable, phase != .running else { return }
        detector.reset()
        detector.sensitivity = calibration.kOrDefault
        model = MealSessionModel(start: Date())
        chewsInBite = 0; bites = 0
        lastSample = Date()
        detector.onSample = { [weak self] _, _ in self?.lastSample = Date() }
        detector.onChew = { [weak self] _ in self?.chewed() }
        chime.prepare()
        heavy.prepare()
        detector.start()
        ScreenAwake.hold()
        availability = .ready
        phase = .running
        watchdog = Task { await self.watch() }
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

    /// Checks once a second that motion is still arriving.
    private func watch() async {
        while !Task.isCancelled {
            try? await Task.sleep(for: .seconds(1))
            if Task.isCancelled { return }
            let a = MealAvailability.evaluate(isAvailable: detector.isAvailable, isConnected: detector.isConnected,
                                              isRunning: true, secondsWithoutSample: Date().timeIntervalSince(lastSample))
            if a == .notConnected {
                // Keep what was counted if the meal was long enough.
                if bites > 0 || (model?.totalChews ?? 0) > 0 { finish() }
                else { halt() }
                availability = .notConnected
                return
            }
        }
    }

    func finish() {
        guard phase == .running, let m = model else { return }
        let record = m.finish(at: Date())
        if let record { meals.save(record) }
        halt()
        phase = .finished(record.map(MealSessionModel.summary(for:)) ?? MealSessionModel.shortMealSummary)
    }

    func again() { phase = .idle; availability = .ready }

    /// Stops sensing and restores the screen timer and audio session. Safe to call twice.
    func halt() {
        watchdog?.cancel(); watchdog = nil
        detector.stop()
        detector.onSample = nil
        detector.onChew = nil
        chime.stop()
        ScreenAwake.release()
        if phase == .running { phase = .idle }
    }
}

struct MealView: View {
    @StateObject private var c = MealController()
    @State private var showCalibration = false
    @State private var startAfterCalibration = false

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
        .onDisappear { c.halt() }
        .sheet(isPresented: $showCalibration, onDismiss: {
            if startAfterCalibration { startAfterCalibration = false; c.start() }
        }) { CalibrationView() }
    }

    @ViewBuilder
    private var main: some View {
        if c.availability != .ready {
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
            Text(c.availability == .unsupported ? "This iPhone can't read headphone motion" : "No AirPods found")
                .font(.title3.bold()).multilineTextAlignment(.center)
            Text(c.availability == .unsupported
                 ? "Counting needs AirPods Pro, AirPods Max or AirPods (3rd generation) or later, and an iPhone that can read their motion."
                 : "Put in AirPods Pro, AirPods Max or AirPods (3rd generation) or later, and make sure they're connected.")
                .font(.callout).foregroundStyle(.secondary).multilineTextAlignment(.center)
            Text("The free Bite Pacer still counts to 32 with a buzz. Find it on the home screen.")
                .font(.callout).multilineTextAlignment(.center)
            if c.availability == .notConnected {
                Button("Try Again") { c.again() }.buttonStyle(.bordered)
            }
        }
    }
}
