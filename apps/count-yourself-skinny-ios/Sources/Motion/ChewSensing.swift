import Foundation

enum MotionPermission: Equatable { case notDetermined, allowed, denied }

/// What the meal and calibration screens need from the chew sensor. `ChewDetector` is the
/// real one; tests use a fake, since a simulator has no AirPods.
@MainActor
protocol ChewSensing: AnyObject {
    var isAvailable: Bool { get }
    var permission: MotionPermission { get }
    var sensitivity: Double { get set }
    var hapticsEnabled: Bool { get set }
    var onSample: ((Double, TimeInterval) -> Void)? { get set }
    var onChew: ((TimeInterval) -> Void)? { get set }
    func start()
    func stop()
    func reset()
}

/// The sensor a screen uses when no test has handed it one.
@MainActor
func makeChewSensor() -> any ChewSensing {
    #if DEBUG
    if UserDefaults.standard.bool(forKey: SimulatedChewSensor.launchKey) { return SimulatedChewSensor() }
    #endif
    return ChewDetector()
}

protocol ChimePlaying: AnyObject {
    func prepare()
    func play()
    func stop()
}
