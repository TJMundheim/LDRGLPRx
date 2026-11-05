import SwiftUI
import Charts

/// Weekly weigh-in. Pounds, trend line only. No calories, no goals math.
struct WeighInView: View {
    @EnvironmentObject var store: CountStore
    @State private var text = ""
    @FocusState private var focused: Bool

    private var pounds: Double? {
        Double(text.replacingOccurrences(of: ",", with: ".")).flatMap { $0 > 0 && $0 < 1000 ? $0 : nil }
    }

    var body: some View {
        List {
            Section {
                Text("Once a week. Same scale, same morning. Daily weight is noise; weekly weight is a trend line.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            Section {
                HStack {
                    TextField("Weight", text: $text).keyboardType(.decimalPad).focused($focused)
                    Text("lb").foregroundStyle(.secondary)
                }
                Button(store.daysUntilNextWeighIn > 0 ? "Correct this week's weigh-in" : "Save weigh-in") {
                    if let pounds { store.logWeighIn(pounds: pounds); text = ""; focused = false }
                }
                .disabled(pounds == nil)
            } footer: {
                if store.daysUntilNextWeighIn > 0 {
                    let d = store.daysUntilNextWeighIn
                    Text("Next weigh-in in \(d) \(d == 1 ? "day" : "days"). You can still correct this week's number.")
                }
            }
            Section("Trend") {
                if store.weighIns.count >= 2 {
                    Chart(store.weighIns) { w in
                        LineMark(x: .value("Date", w.date), y: .value("Pounds", w.pounds))
                        PointMark(x: .value("Date", w.date), y: .value("Pounds", w.pounds))
                    }
                    .chartYScale(domain: .automatic(includesZero: false))
                    .frame(height: 200)
                } else {
                    Text(store.weighIns.isEmpty ? "Your first weigh-in starts the line."
                                                : "One more weigh-in next week draws the line.")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("Weigh-in")
        .navigationBarTitleDisplayMode(.inline)
    }
}
