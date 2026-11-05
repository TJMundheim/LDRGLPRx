#if DEBUG
import Foundation

/// Debug builds only: lets a UI test run a real meal on a simulator, which has no AirPods.
/// Turned on with the launch argument `-cys.simulateChews YES`.
@MainActor
final class SimulatedChewSensor: ChewSensing {
    static let launchKey = "cys.simulateChews"

    let isAvailable = true
    let permission = MotionPermission.allowed
    var sensitivity = 0.0
    var hapticsEnabled = false
    var onSample: ((Double, TimeInterval) -> Void)?
    var onChew: ((TimeInterval) -> Void)?
    private var run: Task<Void, Never>?

    func start() {
        run = Task { [weak self] in
            while await Tick.wait(0.25) {
                guard let self else { return }
                self.onSample?(0.1, 0)
                self.onChew?(0)
            }
        }
    }
    func stop() { run?.cancel(); run = nil }
    func reset() {}
}
#endif
