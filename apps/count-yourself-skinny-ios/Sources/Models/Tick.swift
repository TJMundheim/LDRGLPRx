import Foundation

/// One step of a repeating timer loop.
enum Tick {
    /// Sleeps, then returns true. Returns false once the task is cancelled, so a loop can
    /// stop. Never loop on `try? await Task.sleep`: cancelled, it returns at once and spins.
    static func wait(_ seconds: TimeInterval) async -> Bool {
        do {
            try await Task.sleep(for: .seconds(seconds))
            return !Task.isCancelled
        } catch {
            return false
        }
    }
}
