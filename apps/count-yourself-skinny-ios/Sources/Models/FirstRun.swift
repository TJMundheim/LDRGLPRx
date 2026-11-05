import Foundation

/// The two first-run screens: the safety step, then the usage-data question.
struct FirstRun {
    static let doneKey = "cys.firstRun.done"

    let defaults: UserDefaults
    init(defaults: UserDefaults = .standard) { self.defaults = defaults }

    var isDone: Bool { defaults.bool(forKey: Self.doneKey) }

    /// The answer is the analytics consent. About can change it later.
    func finish(shareUsage: Bool) {
        defaults.set(shareUsage, forKey: Analytics.consentKey)
        defaults.set(true, forKey: Self.doneKey)
    }
}
