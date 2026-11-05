import UIKit

/// Keeps the screen on while a meal or calibration runs. Always released on exit.
@MainActor
enum ScreenAwake {
    static func hold() { UIApplication.shared.isIdleTimerDisabled = true }
    static func release() { UIApplication.shared.isIdleTimerDisabled = false }
}
