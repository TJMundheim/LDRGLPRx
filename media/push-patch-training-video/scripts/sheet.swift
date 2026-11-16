// Build a labelled contact sheet from JPEG/PNG frames (AppKit; no ImageMagick needed).
// usage: swift sheet.swift <out.jpg> <cols> <cellWidth> <img1> [img2 ...]
import AppKit

let a = CommandLine.arguments
let out = a[1]
let cols = Int(a[2]) ?? 5
let cellW = CGFloat(Double(a[3]) ?? 360)
let paths = Array(a.dropFirst(4))
guard let first = NSImage(contentsOfFile: paths[0]) else { fatalError("cannot read \(paths[0])") }
let aspect = first.size.height / first.size.width
let cellH = (cellW * aspect).rounded()
let label: CGFloat = 26
let rows = Int((Double(paths.count) / Double(cols)).rounded(.up))
let W = Int(cellW) * cols
let H = Int(cellH + label) * rows
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H, bitsPerSample: 8,
  samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
NSColor.white.setFill()
NSRect(x: 0, y: 0, width: W, height: H).fill()
let attrs: [NSAttributedString.Key: Any] = [.font: NSFont.monospacedSystemFont(ofSize: 15, weight: .medium), .foregroundColor: NSColor.black]
for (i, p) in paths.enumerated() {
  guard let img = NSImage(contentsOfFile: p) else { continue }
  let c = i % cols, r = i / cols
  let x = CGFloat(c) * cellW
  let yTop = CGFloat(H) - CGFloat(r) * (cellH + label)
  img.draw(in: NSRect(x: x, y: yTop - label - cellH, width: cellW, height: cellH))
  let name = (p as NSString).lastPathComponent
  (name as NSString).draw(at: NSPoint(x: x + 4, y: yTop - label + 5), withAttributes: attrs)
}
NSGraphicsContext.restoreGraphicsState()
let data = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.8])!
try! data.write(to: URL(fileURLWithPath: out))
print("sheet:", out, W, "x", H, "frames:", paths.count)
