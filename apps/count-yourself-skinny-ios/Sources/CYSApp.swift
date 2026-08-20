import SwiftUI

@main
struct CYSApp: App {
    @StateObject private var store = CountStore()
    @StateObject private var pro = ProStore()

    var body: some Scene {
        WindowGroup {
            HomeView()
                .environmentObject(store)
                .environmentObject(pro)
        }
    }
}
