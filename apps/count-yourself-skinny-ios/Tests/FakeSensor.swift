import Foundation
@testable import CountYourselfSkinny

/// Stands in for AirPods so the meal and calibration lifecycles can run on a simulator.
@MainActor
final class FakeSensor: ChewSensing {
    var isAvailable = true
    var permission = MotionPermission.allowed
    var sensitivity = 0.0
    var hapticsEnabled = true
    var onSample: ((Double, TimeInterval) -> Void)?
    var onChew: ((TimeInterval) -> Void)?
    private(set) var running = false
    private(set) var starts = 0

    func start() { running = true; starts += 1 }
    func stop() { running = false }
    func reset() {}
}

final class FakeChime: ChimePlaying {
    private(set) var prepared = 0
    private(set) var plays = 0
    private(set) var stops = 0
    func prepare() { prepared += 1 }
    func play() { plays += 1 }
    func stop() { stops += 1 }
}
