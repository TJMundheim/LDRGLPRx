import XCTest
@testable import CountYourselfSkinny

final class TickTests: XCTestCase {
    func testReturnsTrueWhenTheTimeRunsOut() async {
        let finished = await Tick.wait(0.01)
        XCTAssertTrue(finished)
    }

    /// `try? await Task.sleep` returns at once when cancelled, so a loop built on it spins.
    /// That is how leaving Morning mode ran the app at 95% CPU and credited 2,011 light minutes.
    func testReturnsFalseOnceCancelled() async {
        let task = Task { () -> Bool in
            while !Task.isCancelled { await Task.yield() }
            return await Tick.wait(60)
        }
        task.cancel()
        let finished = await task.value
        XCTAssertFalse(finished)
    }

    func testALoopOnTickStopsWhenItsTaskIsCancelled() async {
        let task = Task { () -> Int in
            var ticks = 0
            while await Tick.wait(0.001) { ticks += 1 }
            return ticks
        }
        try? await Task.sleep(for: .seconds(0.05))
        task.cancel()
        let ticks = await task.value
        XCTAssertLessThan(ticks, 1000, "a cancelled loop must stop, not spin")
    }
}
