import SwiftUI
import UIKit

/// The picture a user can choose to share. The chew number is the only health number on it.
struct ChewNumberCard: View {
    let number: Int

    static let fontName = "Anton-Regular"
    private static let side: CGFloat = 360
    private static let red = Color(red: 0xE8 / 255, green: 0x35 / 255, blue: 0x2B / 255)
    private static let yellow = Color(red: 0xFF / 255, green: 0xD4 / 255, blue: 0x00 / 255)
    private static let lead = "My chew number:"
    private static let ask = "What's yours?"
    private static let rule = "Count to \(ChewTuning.chewsPerBite)"
    private static let link = "my4mlife.com"

    static func lines(for n: Int) -> [String] { ["\(lead) \(n).", ask, rule, link] }

    /// 1080 by 1080. Rendered on the phone; nothing is uploaded.
    @MainActor static func image(for n: Int) -> UIImage? {
        let renderer = ImageRenderer(content: ChewNumberCard(number: n))
        renderer.scale = 3
        renderer.isOpaque = true
        return renderer.uiImage
    }

    private func anton(_ size: CGFloat) -> Font { .custom(Self.fontName, fixedSize: size) }

    var body: some View {
        VStack(spacing: 0) {
            Text(Self.lead.uppercased())
                .font(anton(40))
                .foregroundStyle(.white)
            Text("\(number)")
                .font(anton(150))
                .minimumScaleFactor(0.5)
                .foregroundStyle(Self.yellow)
            Text(Self.ask.uppercased())
                .font(anton(40))
                .foregroundStyle(.white)
            Spacer(minLength: 0)
            Text(Self.rule.uppercased())
                .font(anton(24))
                .foregroundStyle(Self.yellow)
            Text(Self.link)
                .font(anton(16))
                .foregroundStyle(.white)
        }
        .lineLimit(1)
        .padding(.vertical, 12)
        .padding(.horizontal, 20)
        .frame(width: Self.side, height: Self.side)
        .background(Self.red)
    }
}
