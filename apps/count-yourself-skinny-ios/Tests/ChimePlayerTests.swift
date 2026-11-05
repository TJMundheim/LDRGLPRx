import XCTest
@testable import CountYourselfSkinny

final class ChimePlayerTests: XCTestCase {
    func testConstructionDoesNotCrashOrTouchAudio() {
        _ = ChimePlayer()
    }
    func testPlayWithoutPrepareAndStopAreSilentlySafe() {
        let p = ChimePlayer()
        p.play()
        p.stop()
        p.stop()
    }
}
