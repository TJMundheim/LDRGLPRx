import SwiftUI

@main
struct CYSApp: App {
    @StateObject private var store = CountStore()
    @StateObject private var pro = ProStore()
    @Environment(\.scenePhase) private var scenePhase
    @State private var firstRunDone: Bool

    init() {
        #if DEBUG
        // UI tests start from a new install with `-cys.uiTestReset YES`.
        if UserDefaults.standard.bool(forKey: "cys.uiTestReset"), let id = Bundle.main.bundleIdentifier {
            UserDefaults.standard.removePersistentDomain(forName: id)
        }
        #endif
        _firstRunDone = State(initialValue: FirstRun().isDone)
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if firstRunDone {
                    HomeView()
                } else {
                    FirstRunView { firstRunDone = true }
                }
            }
                .environmentObject(store)
                .environmentObject(pro)
                .onChange(of: scenePhase) { _, phase in
                    // Home asks for Health when it appears, so no system prompt covers the first run.
                    guard phase == .active, firstRunDone else { return }
                    store.rollover()
                    store.creditWalk()
                    Analytics.shared.track(.appOpen)
                    Task {
                        await store.requestSteps()
                        await pro.refreshEntitlement()   // a lapsed subscription sends no update
                    }
                }
        }
    }
}
