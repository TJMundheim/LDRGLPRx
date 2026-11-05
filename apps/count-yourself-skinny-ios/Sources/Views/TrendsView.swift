import SwiftUI
import Charts

/// Weekly chew trends from the meal log. Numbers come from `TrendsCalculator`.
struct TrendsView: View {
    @State private var weeks: [WeekTrend] = []

    var body: some View {
        ScrollView {
            if weeks.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "chart.line.uptrend.xyaxis").font(.system(size: 48)).foregroundStyle(.secondary)
                    Text("Your first meal starts the trend").font(.title3.bold())
                    Text("Use Count my chews at a meal. Meals under 30 seconds aren't counted.")
                        .font(.callout).foregroundStyle(.secondary).multilineTextAlignment(.center)
                }
                .padding(32)
            } else {
                VStack(alignment: .leading, spacing: 28) {
                    chart("Chews per bite", unit: "chews", values: weeks.map { ($0.weekStart, $0.averageChewsPerBite) })
                    chart("Chews per minute", unit: "per min", values: weeks.map { ($0.weekStart, $0.averageChewsPerMinute) })
                    Text("Counts are estimates. Slower, steadier chewing is the goal, not a perfect number.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                .padding()
            }
        }
        .navigationTitle("Trends")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { Analytics.shared.track(.trendsViewed); weeks = TrendsCalculator.weeks(from: MealStore().load()) }
    }

    private func chart(_ title: String, unit: String, values: [(Date, Double?)]) -> some View {
        let points = values.compactMap { d, v in v.map { (d, $0) } }
        return VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.headline)
            if let last = points.last {
                Text("\(Int(last.1.rounded())) \(unit) this week").font(.caption).foregroundStyle(.secondary)
            }
            Chart(points, id: \.0) { p in
                LineMark(x: .value("Week", p.0, unit: .weekOfYear), y: .value(title, p.1))
                PointMark(x: .value("Week", p.0, unit: .weekOfYear), y: .value(title, p.1))
            }
            .chartYScale(domain: .automatic(includesZero: false))
            .frame(height: 180)
        }
    }
}
