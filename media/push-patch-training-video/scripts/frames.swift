// Extract one JPEG frame every N seconds from a video (AVFoundation; no ffmpeg needed).
import AVFoundation
import AppKit

let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1])
let outDir = args[2]
let step = Double(args.count > 3 ? args[3] : "4") ?? 4
let asset = AVURLAsset(url: url)
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
let duration = CMTimeGetSeconds(asset.duration)
var t = 0.5
var i = 0
while t < duration {
  let time = CMTime(seconds: t, preferredTimescale: 600)
  if let cg = try? gen.copyCGImage(at: time, actualTime: nil) {
    let rep = NSBitmapImageRep(cgImage: cg)
    if let data = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.7]) {
      let name = String(format: "%@/f%03d_%06.1fs.jpg", outDir, i, t)
      try? data.write(to: URL(fileURLWithPath: name))
    }
  }
  i += 1
  t += step
}
print("frames:", i, "duration:", duration)
