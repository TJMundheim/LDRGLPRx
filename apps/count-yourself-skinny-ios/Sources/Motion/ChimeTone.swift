import Foundation

/// Synthesizes the 32nd-chew chime: two soft bell-like notes, 16-bit PCM mono WAV, in memory.
enum ChimeTone {
    static let sampleRate = 44_100
    static let duration = 0.4

    static func wavData() -> Data {
        let n = Int(Double(sampleRate) * duration)
        // E5 then B5, second note starts at 0.14 s.
        let notes: [(freq: Double, start: Double)] = [(659.25, 0), (987.77, 0.14)]
        let attack = 0.008, fadeOut = 0.06
        var pcm = Data(capacity: n * 2)
        for i in 0..<n {
            let t = Double(i) / Double(sampleRate)
            var v = 0.0
            for note in notes where t >= note.start {
                let nt = t - note.start
                let env = min(1, nt / attack) * exp(-nt * 9)
                v += env * (sin(2 * .pi * note.freq * nt) + 0.25 * sin(4 * .pi * note.freq * nt))
            }
            let tail = duration - t
            if tail < fadeOut { v *= max(0, tail / fadeOut) }
            if i == n - 1 { v = 0 }
            let s = Int16(max(-1, min(1, v * 0.4)) * 30000 * 0.9)
            pcm.append(contentsOf: withUnsafeBytes(of: s.littleEndian) { Array($0) })
        }
        var d = Data()
        func u32(_ x: Int) { d.append(contentsOf: withUnsafeBytes(of: UInt32(x).littleEndian) { Array($0) }) }
        func u16(_ x: Int) { d.append(contentsOf: withUnsafeBytes(of: UInt16(x).littleEndian) { Array($0) }) }
        d.append(contentsOf: Array("RIFF".utf8)); u32(36 + pcm.count)
        d.append(contentsOf: Array("WAVEfmt ".utf8)); u32(16)
        u16(1); u16(1); u32(sampleRate); u32(sampleRate * 2); u16(2); u16(16)
        d.append(contentsOf: Array("data".utf8)); u32(pcm.count)
        d.append(pcm)
        return d
    }
}
