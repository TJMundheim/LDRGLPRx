import XCTest
@testable import CountYourselfSkinny

final class ChimeToneTests: XCTestCase {
    let wav = ChimeTone.wavData()

    func u16(_ o: Int) -> Int { Int(wav[o]) | Int(wav[o + 1]) << 8 }
    func u32(_ o: Int) -> Int { u16(o) | u16(o + 2) << 16 }
    func tag(_ o: Int) -> String { String(decoding: wav[o..<o + 4], as: UTF8.self) }
    func samples() -> [Int16] {
        stride(from: 44, to: wav.count - 1, by: 2).map { Int16(bitPattern: UInt16(wav[$0]) | UInt16(wav[$0 + 1]) << 8) }
    }

    func testHeader() {
        XCTAssertGreaterThan(wav.count, 44)
        XCTAssertEqual(tag(0), "RIFF")
        XCTAssertEqual(tag(8), "WAVE")
        XCTAssertEqual(tag(12), "fmt ")
        XCTAssertEqual(u32(16), 16)
        XCTAssertEqual(u16(20), 1)    // PCM
        XCTAssertEqual(u16(22), 1)    // mono
        XCTAssertEqual(u32(24), ChimeTone.sampleRate)
        XCTAssertEqual(u32(28), ChimeTone.sampleRate * 2)
        XCTAssertEqual(u16(32), 2)
        XCTAssertEqual(u16(34), 16)
        XCTAssertEqual(tag(36), "data")
    }

    func testSizesConsistent() {
        XCTAssertEqual(u32(4), wav.count - 8)
        XCTAssertEqual(u32(40), wav.count - 44)
        XCTAssertEqual((wav.count - 44) % 2, 0)
    }

    func testDurationAboutPointFourSeconds() {
        let seconds = Double(u32(40)) / Double(u32(28))
        XCTAssertEqual(seconds, 0.4, accuracy: 0.04)
        XCTAssertEqual(ChimeTone.duration, 0.4, accuracy: 0.04)
    }

    func testNotSilent() {
        let peak = samples().map { abs(Int($0)) }.max() ?? 0
        XCTAssertGreaterThan(peak, 4000)
        let rms = sqrt(samples().map { Double($0) * Double($0) }.reduce(0, +) / Double(samples().count))
        XCTAssertGreaterThan(rms, 500)
    }

    func testNoClipping() {
        let peak = samples().map { abs(Int($0)) }.max() ?? 0
        XCTAssertLessThan(peak, 32767)
        XCTAssertLessThan(peak, 30000)
    }

    func testFadesOutWithoutClick() {
        let s = samples()
        XCTAssertLessThan(abs(Int(s.last!)), 50)
        XCTAssertLessThan(abs(Int(s.first!)), 50)
        let tail = s.suffix(Int(0.01 * Double(ChimeTone.sampleRate)))
        XCTAssertLessThan(tail.map { abs(Int($0)) }.max()!, 500)
        // no abrupt jump between neighbouring samples near the end
        let end = Array(s.suffix(200))
        let maxStep = zip(end, end.dropFirst()).map { abs(Int($1) - Int($0)) }.max()!
        XCTAssertLessThan(maxStep, 1500)
    }

    func testDeterministic() {
        XCTAssertEqual(ChimeTone.wavData(), wav)
    }
}
