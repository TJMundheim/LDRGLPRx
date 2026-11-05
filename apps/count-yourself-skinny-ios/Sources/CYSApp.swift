import SwiftUI

@main
struct CYSApp: App {
    @StateObject private var store = CountStore()
    @StateObject private var pro = ProStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            HomeView()
                .environmentObject(store)
                .environmentObject(pro)
                .onChange(of: scenePhase) { _, phase in
                    guard phase == .active else { return }
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
