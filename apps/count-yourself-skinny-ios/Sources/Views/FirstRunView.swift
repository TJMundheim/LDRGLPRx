import SwiftUI

/// Shown once, before anything else. Nothing here blocks: both screens always lead forward.
struct FirstRunView: View {
    let finished: () -> Void
    @State private var askingAboutUsage = false

    var body: some View {
        if askingAboutUsage { usage } else { safety }
    }

    private var safety: some View {
        page(title: "Before you start") {
            Text(AboutContent.safetyAge)
            Text(AboutContent.safetyEatingDisorder)
            Text(AboutContent.safetyPacing)
            Text(AboutContent.safetyStop)
            Text(AboutContent.disclaimer).font(.footnote).foregroundStyle(.secondary)
        } actions: {
            Button { askingAboutUsage = true } label: {
                Text("Continue").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
        }
    }

    /// Yes and No look the same and sit side by side: this is a real choice.
    private var usage: some View {
        page(title: AboutContent.usageTitle + "?") {
            Text(AboutContent.usageBody)
            Text("You can change this anytime in About.").foregroundStyle(.secondary)
        } actions: {
            HStack(spacing: 12) {
                answer("No", share: false)
                answer("Yes", share: true)
            }
        }
    }

    private func answer(_ title: String, share: Bool) -> some View {
        Button {
            FirstRun().finish(shareUsage: share)
            finished()
        } label: {
            Text(title).frame(maxWidth: .infinity)
        }
        .buttonStyle(.bordered)
    }

    private func page<Content: View, Actions: View>(title: String, @ViewBuilder content: () -> Content,
                                                    @ViewBuilder actions: () -> Actions) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(title).font(.largeTitle.bold())
                content()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(24)
        }
        .safeAreaInset(edge: .bottom) {
            actions()
                .controlSize(.large)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
        }
    }
}
