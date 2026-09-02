import SwiftUI
import UIKit

/// v1.5 prototype bench for AirPods chew detection.
///
/// Two jobs: prove the count is real in the moment, and capture raw motion to CSV so
/// the algorithm can be argued with offline against real meals.
struct ChewLabView: View {
    @StateObject private var detector = ChewDetector()
    @State private var shareItem: ShareItem?
    @State private var exportFailed = false

    var body: some View {
        List {
            Section { statusRow }

            Section {
                countCard
            } header: {
                Text("Live")
            } footer: {
                Text("Put in your AirPods, take a bite, chew normally. Nothing is recorded or uploaded unless you tap Export.")
            }

            Section("Signal") {
                Sparkline(values: detector.signal, threshold: detector.threshold)
                    .frame(height: 88)
                    .listRowInsets(EdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12))
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Threshold k")
                        Spacer()
                        Text(String(format: "%.2f", detector.sensitivity))
                            .monospacedDigit().foregroundStyle(.secondary)
                    }
                    Slider(value: $detector.sensitivity, in: 1.5...4.0, step: 0.05)
                    Text("Lower counts more (and counts more noise). Higher is stricter.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }

            Section("Controls") {
                Button(detector.isRunning ? "Stop" : "Start") {
                    detector.isRunning ? detector.stop() : detector.start()
                }
                .disabled(!detector.isAvailable)
                Button("Reset counts", role: .destructive) { detector.reset() }
                Toggle("Haptic tick on each chew", isOn: $detector.hapticsEnabled)
            }

            Section {
                Toggle("Record session", isOn: $detector.isRecording)
                HStack {
                    Text("Samples recorded")
                    Spacer()
                    Text("\(detector.samplesRecorded)")
                        .monospacedDigit().foregroundStyle(.secondary)
                }
                Button("Export CSV") {
                    if let url = detector.exportCSV() { shareItem = ShareItem(url: url) } else { exportFailed = true }
                }
                .disabled(detector.samplesRecorded == 0)
            } header: {
                Text("Session capture")
            } footer: {
                Text("Recording keeps raw motion in memory only. Export hands the CSV to the share sheet — AirDrop it to a Mac for analysis.")
            }

            if let error = detector.lastError {
                Section("Error") {
                    Text(error).font(.caption).foregroundStyle(.red)
                }
            }
        }
        .navigationTitle("Chew Lab")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $shareItem) { item in
            ShareSheet(items: [item.url])
        }
        .alert("Nothing to export", isPresented: $exportFailed) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Turn on \"Record session\" and chew for a bit first.")
        }
        .onDisappear { detector.stop() }
    }

    // MARK: - Pieces

    @ViewBuilder
    private var statusRow: some View {
        if !detector.isAvailable {
            Label {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Not supported on this device/simulator")
                    Text("Headphone motion needs a real iPhone plus AirPods Pro, AirPods (3rd gen or later) or AirPods Max.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            } icon: {
                Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.orange)
            }
        } else if detector.isConnected {
            Label("AirPods connected", systemImage: "airpods.pro")
                .foregroundStyle(.green)
        } else {
            Label {
                VStack(alignment: .leading, spacing: 2) {
                    Text("AirPods not connected")
                    Text("Put them in — the count starts the moment motion arrives.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            } icon: {
                Image(systemName: "airpods.pro").foregroundStyle(.secondary)
            }
        }
    }

    private var countCard: some View {
        VStack(spacing: 6) {
            Text("\(detector.chewCount)")
                .font(.system(size: 96, weight: .bold)).monospacedDigit()
                .contentTransition(.numericText())
            Text("chews this bite — of 32")
                .foregroundStyle(.secondary)
            HStack(spacing: 24) {
                stat(String(format: "%.0f", detector.chewRatePerMin), "chews/min")
                stat("\(detector.sessionChewTotal)", "session total")
                stat("\(detector.biteCount)", "bites")
            }
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.title3.bold()).monospacedDigit()
            Text(label).font(.caption2).foregroundStyle(.secondary)
        }
    }
}

// MARK: - Sparkline

/// Lightweight Canvas plot of the band-passed signal with the adaptive threshold
/// drawn as a dashed line, so you can see how close the gate is to the peaks.
struct Sparkline: View {
    let values: [Double]
    let threshold: Double

    var body: some View {
        Canvas { context, size in
            guard values.count > 1 else { return }
            let peak = max(values.map(\.magnitude).max() ?? 1, threshold, 0.02)
            let mid = size.height / 2
            let scale = (size.height / 2 - 4) / peak
            let dx = size.width / CGFloat(max(values.count - 1, 1))

            var path = Path()
            for (i, v) in values.enumerated() {
                let point = CGPoint(x: CGFloat(i) * dx, y: mid - CGFloat(v) * scale)
                if i == 0 { path.move(to: point) } else { path.addLine(to: point) }
            }
            context.stroke(path, with: .color(.accentColor), lineWidth: 1.5)

            if threshold.isFinite, threshold > 0 {
                let y = mid - CGFloat(threshold) * scale
                var line = Path()
                line.move(to: CGPoint(x: 0, y: y))
                line.addLine(to: CGPoint(x: size.width, y: y))
                context.stroke(line, with: .color(.orange),
                               style: StrokeStyle(lineWidth: 1, dash: [4, 3]))
            }
        }
        .background(Color.secondary.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(alignment: .topLeading) {
            if values.isEmpty {
                Text("No signal yet")
                    .font(.caption2).foregroundStyle(.secondary).padding(6)
            }
        }
    }
}

// MARK: - Share sheet

/// Small box so `.sheet(item:)` can drive the share sheet off an exported file URL.
struct ShareItem: Identifiable {
    let url: URL
    var id: String { url.absoluteString }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
