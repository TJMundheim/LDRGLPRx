import XCTest
@testable import CountYourselfSkinny

/// All of these run against `SyntheticChew`: made-up waveforms, not meals. Each case runs
/// across several seeds and asserts on the worst one. CHEWCASE lines carry the numbers.
final class ChewSignalCoreTests: XCTestCase {
    private typealias Seg = SyntheticChew.Segment
    private static let chewRates = [0.9, 1.1, 1.6]

    private func describe(_ shape: SyntheticChew.Shape) -> String {
        switch shape {
        case .sine: return "sine"
        case .pulse: return "pulse"
        case .doublePulse: return "doublePulse"
        case .alternating: return "alternating"
        }
    }

    /// Whole-session count within `tolerance` of truth on every seed.
    private func assertCounts(
        _ label: String, _ segments: [Seg], tolerance: Double,
        file: StaticString = #filePath, line: UInt = #line
    ) {
        var counted: [Int] = []
        var truth = 0
        for seed in SyntheticChew.seeds {
            let session = SyntheticChew.session(segments, seed: seed)
            truth = session.truth
            let n = SyntheticChew.count(session.samples)
            counted.append(n)
            XCTAssertEqual(Double(n), Double(truth), accuracy: Double(truth) * tolerance,
                           "\(label) seed \(seed): counted \(n) vs truth \(truth)", file: file, line: line)
        }
        print("CHEWCASE \(label) truth=\(truth) counted=\(counted)")
    }

    private func chews(
        in range: (start: TimeInterval, end: TimeInterval), _ times: [TimeInterval]
    ) -> Int {
        times.filter { $0 >= range.start && $0 < range.end }.count
    }

    // MARK: - Steady chewing: within 10%

    func testSineChewingWithinTenPercent() { steadyChewing(.sine) }
    func testPulseChewingWithinTenPercent() { steadyChewing(.pulse) }

    private func steadyChewing(_ shape: SyntheticChew.Shape, file: StaticString = #filePath, line: UInt = #line) {
        for hz in Self.chewRates {
            assertCounts("\(describe(shape)) \(hz) Hz", [.chew(seconds: 60, hz: hz, amp: 0.12, shape: shape)],
                         tolerance: 0.10, file: file, line: line)
        }
    }

    // MARK: - Amplitude steps: within 15%

    func testQuietChewerBecomesVigorous() { amplitudeStep(from: 0.06, to: 0.18) }
    func testVigorousChewerBecomesQuiet() { amplitudeStep(from: 0.18, to: 0.06) }

    private func amplitudeStep(from a: Double, to b: Double, file: StaticString = #filePath, line: UInt = #line) {
        for shape in [SyntheticChew.Shape.sine, .pulse] {
            for hz in Self.chewRates {
                assertCounts("step \(a)->\(b) \(describe(shape)) \(hz) Hz",
                             [.chew(seconds: 30, hz: hz, amp: a, shape: shape),
                              .chew(seconds: 30, hz: hz, amp: b, shape: shape)],
                             tolerance: 0.15, file: file, line: line)
            }
        }
    }

    // MARK: - Not chewing

    func testStillHeadCountsNothing() {
        for seed in SyntheticChew.seeds {
            let (s, _) = SyntheticChew.make(seconds: 60, chewHz: nil, seed: seed)
            XCTAssertEqual(SyntheticChew.count(s), 0, "seed \(seed)")
        }
    }

    /// 200 seeds, not 5: noise ripple on the turn's slow hump only reaches 3 on some draws.
    func testSlowHeadTurnUnderThreeChews() {
        var counted: [Int: Int] = [:]
        for seed in (1...200).map({ UInt64($0) * 37 }) {
            let (s, _) = SyntheticChew.make(seconds: 30, chewHz: nil, swell: (10, 3.3, 0.5), seed: seed)
            let n = SyntheticChew.count(s)
            counted[n, default: 0] += 1
            XCTAssertLessThan(n, 3, "seed \(seed)")
        }
        print("CHEWCASE headturn seeds-by-count=\(counted.sorted { $0.key < $1.key })")
    }

    func testDropoutGapDoesNotBurst() {
        for shape in [SyntheticChew.Shape.sine, .pulse] {
            var report: [String] = []
            for seed in SyntheticChew.seeds {
                let (clean, truth) = SyntheticChew.make(seconds: 60, chewHz: 1.1, shape: shape, seed: seed)
                let (gapped, _) = SyntheticChew.make(seconds: 60, chewHz: 1.1, shape: shape, gap: (30, 2), seed: seed)
                let a = SyntheticChew.count(clean), b = SyntheticChew.count(gapped)
                report.append("\(a)/\(b)")
                XCTAssertLessThanOrEqual(b, truth + 2, "seed \(seed)")
                XCTAssertGreaterThan(b, a - 4 - 3, "seed \(seed)")
                // timestamps really do skip 2 s
                let jumps = zip(gapped, gapped.dropFirst()).filter { $1.t - $0.t > 1.5 }
                XCTAssertEqual(jumps.count, 1)
                // No burst: the three seconds after the gap hold no more than the true rate allows.
                let resume = SyntheticChew.origin + 32
                let after = chews(in: (resume, resume + 3), SyntheticChew.chewTimes(gapped))
                XCTAssertLessThanOrEqual(after, 5, "\(describe(shape)) seed \(seed)")
            }
            print("CHEWCASE gap \(describe(shape)) clean/gapped=\(report)")
        }
    }

    func testStillnessAfterChewingHasNoPhantomsAndCountingResumes() {
        for shape in [SyntheticChew.Shape.sine, .pulse] {
            var report: [String] = []
            for seed in SyntheticChew.seeds {
                let session = SyntheticChew.session(
                    [.chew(seconds: 30, hz: 1.1, amp: 0.12, shape: shape),
                     .still(seconds: 20),
                     .chew(seconds: 30, hz: 1.1, amp: 0.12, shape: shape)], seed: seed)
                let times = SyntheticChew.chewTimes(session.samples)
                let still = session.segments[1], resumed = session.segments[2]
                // The last chew can peak right at the boundary; give the filter 0.5 s to let go.
                let phantoms = chews(in: (still.start + 0.5, still.end), times)
                let after = chews(in: (resumed.start, resumed.end + 1), times)
                report.append("still=\(phantoms) resumed=\(after)/\(resumed.truth)")
                XCTAssertEqual(phantoms, 0, "\(describe(shape)) seed \(seed)")
                XCTAssertEqual(Double(after), Double(resumed.truth), accuracy: Double(resumed.truth) * 0.15,
                               "\(describe(shape)) seed \(seed)")
            }
            print("CHEWCASE still-then-resume \(describe(shape)) \(report)")
        }
    }

    // MARK: - Speech

    /// Under 20% of a same-length chewing session, taken at the slowest target rate
    /// (the fewest true chews, so the strictest limit).
    private var speechLimit: Double {
        0.2 * Double(SyntheticChew.make(seconds: 20, chewHz: 0.9).truth)
    }

    func testSpeechBurstCountsUnderTwentyPercentOfChewing() {
        for amp in [0.06, 0.12, 0.24] {
            var counted: [Int] = []
            for seed in SyntheticChew.seeds {
                let s = SyntheticChew.session([.speech(seconds: 20, amp: amp, pauses: false)], seed: seed)
                let n = SyntheticChew.count(s.samples)
                counted.append(n)
                XCTAssertLessThan(Double(n), speechLimit, "amp \(amp) seed \(seed)")
            }
            print("CHEWCASE speech amp=\(amp) limit<\(speechLimit) counted=\(counted)")
        }
    }

    func testSpeechBetweenChewingIsRejectedAndChewingResumes() {
        for shape in [SyntheticChew.Shape.sine, .pulse] {
            var report: [String] = []
            for seed in SyntheticChew.seeds {
                let session = SyntheticChew.session(
                    [.chew(seconds: 20, hz: 1.1, amp: 0.12, shape: shape),
                     .speech(seconds: 20, amp: 0.12, pauses: false),
                     .chew(seconds: 20, hz: 1.1, amp: 0.12, shape: shape)], seed: seed)
                let times = SyntheticChew.chewTimes(session.samples)
                let speech = session.segments[1], resumed = session.segments[2]
                let talking = chews(in: (speech.start, speech.end), times)
                let after = chews(in: (resumed.start, resumed.end + 1), times)
                report.append("speech=\(talking) resumed=\(after)/\(resumed.truth)")
                XCTAssertLessThan(Double(talking), speechLimit, "\(describe(shape)) seed \(seed)")
                XCTAssertEqual(Double(after), Double(resumed.truth), accuracy: Double(resumed.truth) * 0.15,
                               "\(describe(shape)) seed \(seed)")
            }
            print("CHEWCASE chew-speech-chew \(describe(shape)) limit<\(speechLimit) \(report)")
        }
    }

    // MARK: - Known limits

    // Expected failures, strict, so they flag the day the behaviour changes. These are not
    // targets the detector was asked to meet; they are places it is known to be wrong.

    /// Word-length pauses put speech energy below the corner, so it partly gets through.
    func testKnownLimitSpeechWithPauses() {
        var counted: [Int] = []
        XCTExpectFailure("speech grouped into words leaks through the power split") {
            for seed in SyntheticChew.seeds {
                let s = SyntheticChew.session([.speech(seconds: 20, amp: 0.12, pauses: true)], seed: seed)
                let n = SyntheticChew.count(s.samples)
                counted.append(n)
                XCTAssertLessThan(Double(n), speechLimit, "seed \(seed)")
            }
        }
        print("CHEWCASE known-limit speech with pauses limit<\(speechLimit) counted=\(counted)")
    }

    /// Nothing checks regularity, so in-band fidgeting reads as chewing.
    func testKnownLimitInBandFidgetCountsAsChewing() {
        let n = SyntheticChew.count(SyntheticChew.inBandFidget(seconds: 60))
        print("CHEWCASE known-limit in-band fidget 60 s counted=\(n)")
        XCTExpectFailure("irregular motion inside the chew band passes every gate") {
            XCTAssertLessThan(n, 3)
        }
    }

    /// `scalar()` is a magnitude, so a signed swing arrives at twice its rate: slow chews
    /// double, faster ones land above the corner and get blocked. Every synthetic target
    /// above adds chewing after `scalar()` and so can't see this. Whether real chewing
    /// looks like this is unknown until a meal CSV shows it.
    func testKnownLimitSignedSwingIsRectifiedToTwiceItsRate() {
        for hz in Self.chewRates {
            let (s, truth) = SyntheticChew.signedPitch(seconds: 60, hz: hz)
            let n = SyntheticChew.count(s)
            print("CHEWCASE known-limit signed swing \(hz) Hz truth=\(truth) counted=\(n)")
            XCTExpectFailure("rectified chew counted at the wrong rate") {
                XCTAssertEqual(Double(n), Double(truth), accuracy: Double(truth) * 0.10)
            }
        }
    }

    // MARK: - k and plumbing

    /// Lower k must mean more sensitive, on any input, at every sample.
    func testThresholdRisesWithK() {
        let session = SyntheticChew.session(
            [.chew(seconds: 15, hz: 1.1, amp: 0.12, shape: .pulse), .still(seconds: 5),
             .speech(seconds: 10, amp: 0.12, pauses: false), .chew(seconds: 15, hz: 1.6, amp: 0.06, shape: .sine)])
        var lower: [Double]?
        for k in Calibrator.kValues {
            var core = ChewSignalCore()
            let thresholds = session.samples.map { core.ingest(scalar: $0.scalar, t: $0.t, k: k).threshold }
            if let lower {
                for (a, b) in zip(lower, thresholds) { XCTAssertLessThanOrEqual(a, b, "k \(k)") }
            }
            lower = thresholds
        }
    }

    /// The threshold ends up in the CSV and on the sparkline, so it must stay a real number.
    func testThresholdIsAlwaysFinite() {
        var core = ChewSignalCore()
        for (scalar, t) in SyntheticChew.make(seconds: 5, chewHz: 1.1).samples {
            XCTAssertTrue(core.ingest(scalar: scalar, t: t, k: 2.5).threshold.isFinite)
        }
    }

    func testScalarFormula() {
        let v = ChewSignalCore.scalar(rotX: 3, rotY: 4, rotZ: 0, accelY: -0.1)
        XCTAssertEqual(v, 5 + ChewTuning.accelGain * 0.1, accuracy: 1e-12)
    }

    func testSampleReportsThresholdAtLeastAbsoluteFloor() {
        var core = ChewSignalCore()
        let s = core.ingest(scalar: 0.3, t: 1, k: 2.5)
        XCTAssertGreaterThanOrEqual(s.threshold, ChewTuning.minPeakAmplitude)
        XCTAssertFalse(s.chew)
    }
}

final class CalibratorTests: XCTestCase {
    func testPicksKClosestToKnownCount() {
        let (s, truth) = SyntheticChew.make(seconds: 60, chewHz: 1.1)
        let r = Calibrator.calibrate(capture: .init(samples: s, knownChews: truth))
        guard case .calibrated(let ok) = r else { return XCTFail("\(r)") }
        // No other k may be strictly closer.
        for k in Calibrator.kValues {
            XCTAssertGreaterThanOrEqual(abs(Calibrator.count(s, k: k) - truth), abs(ok.counted - truth))
        }
        XCTAssertEqual(ok.errorPercent, Double(abs(ok.counted - truth)) / Double(truth) * 100, accuracy: 1e-9)
    }

    func testTieGoesToHigherK() {
        let (s, truth) = SyntheticChew.make(seconds: 60, chewHz: 1.1)
        // Every k gives the same count on a clean signal, so the strictest wins.
        let counts = Calibrator.kValues.map { Calibrator.count(s, k: $0) }
        let best = counts.map { abs($0 - truth) }.min()!
        let expected = zip(Calibrator.kValues, counts).filter { abs($0.1 - truth) == best }.map(\.0).max()!
        guard case .calibrated(let ok) = Calibrator.calibrate(capture: .init(samples: s, knownChews: truth)) else {
            return XCTFail()
        }
        XCTAssertEqual(ok.k, expected)
    }

    func testRejectsTooFewSamples() {
        let (s, _) = SyntheticChew.make(seconds: 2, chewHz: 1.1)
        XCTAssertEqual(Calibrator.calibrate(capture: .init(samples: s, knownChews: 2)),
                       .rejected(.tooFewSamples))
    }

    func testRejectsNoSignal() {
        let (s, _) = SyntheticChew.make(seconds: 60, chewHz: nil)
        XCTAssertEqual(Calibrator.calibrate(capture: .init(samples: s, knownChews: 64)),
                       .rejected(.noUsableSignal))
    }

    func testRejectsWhenMostSensitiveKUnderHalf() {
        // Known count far above anything the signal can produce.
        let (s, truth) = SyntheticChew.make(seconds: 60, chewHz: 1.1)
        XCTAssertEqual(Calibrator.calibrate(capture: .init(samples: s, knownChews: truth * 3)),
                       .rejected(.noUsableSignal))
    }

    func testStillPeriodQuietKeepsChoice() {
        let (s, truth) = SyntheticChew.make(seconds: 60, chewHz: 1.1)
        let (still, _) = SyntheticChew.make(seconds: 20, chewHz: nil)
        let base = Calibrator.calibrate(capture: .init(samples: s, knownChews: truth))
        let withStill = Calibrator.calibrate(capture: .init(samples: s, knownChews: truth), still: still)
        XCTAssertEqual(base, withStill)
    }

    func testNoisyStillPushesToStricterKOrRejects() {
        let (s, truth) = SyntheticChew.make(seconds: 60, chewHz: 1.1)
        // "Still" capture that is really chewing: never quiet at any k.
        let r = Calibrator.calibrate(capture: .init(samples: s, knownChews: truth), still: s)
        XCTAssertEqual(r, .rejected(.stillPeriodNotQuiet))
    }

    func testStillPeriodStricterKWhenChosenKIsNoisy() {
        let (s, truth) = SyntheticChew.make(seconds: 60, chewHz: 1.1)
        // A restless "still" period: noisy enough that low k counts several chews.
        var rng = SyntheticChew.RNG(state: 7)
        var t = 5000.0
        var restless: [(scalar: Double, t: TimeInterval)] = []
        for _ in 0..<(25 * 20) { t += 0.04; restless.append((0.3 + 0.05 * rng.next(), t)) }
        let counts = Calibrator.kValues.map { Calibrator.count(restless, k: $0) }
        print("CHEWCASE restless-still counts by k: \(counts)")
        XCTAssertGreaterThanOrEqual(counts.first!, 3, "fixture must be noisy at the lowest k")
        XCTAssertLessThan(counts.last!, 3, "fixture must be quiet at the strictest k")
        let plain = Calibrator.calibrate(capture: .init(samples: s, knownChews: truth))
        let r = Calibrator.calibrate(capture: .init(samples: s, knownChews: truth), still: restless)
        guard case .calibrated(let ok) = r, case .calibrated(let p) = plain else { return XCTFail("\(r)") }
        XCTAssertLessThan(Calibrator.count(restless, k: ok.k), 3)
        XCTAssertGreaterThanOrEqual(ok.k, p.k)
    }
}

extension CalibratorTests {
    /// Default k is badly wrong for this user, the sweep finds one that isn't.
    private func assertRescued(
        _ label: String, shape: SyntheticChew.Shape, amp: Double = 0.12,
        file: StaticString = #filePath, line: UInt = #line
    ) -> Double? {
        let (s, truth) = SyntheticChew.make(seconds: 60, chewHz: 1.1, amp: amp, shape: shape)
        let atDefault = SyntheticChew.count(s)
        let byK = Calibrator.kValues.map { "\($0):\(Calibrator.count(s, k: $0))" }
        guard case .calibrated(let ok) = Calibrator.calibrate(capture: .init(samples: s, knownChews: truth)) else {
            XCTFail("\(label): not calibrated", file: file, line: line)
            return nil
        }
        print("CHEWCASE rescue \(label) truth=\(truth) default=\(atDefault) chosenK=\(ok.k) counted=\(ok.counted) err=\(ok.errorPercent)% sweep=\(byK)")
        XCTAssertGreaterThan(Double(abs(atDefault - truth)) / Double(truth), 0.25,
                             "\(label): fixture must be wrong at the default k", file: file, line: line)
        XCTAssertLessThanOrEqual(ok.errorPercent, 10, "\(label)", file: file, line: line)
        return ok.k
    }

    func testRescuesUserWhoNeedsStricterK() {
        let k = assertRescued("double-peak chewer", shape: .doublePulse(secondary: 0.6))
        XCTAssertGreaterThan(k ?? 0, ChewTuning.defaultK)
    }

    func testRescuesUserWhoNeedsMoreSensitiveK() {
        let k = assertRescued("side-to-side chewer", shape: .alternating(weak: 0.3), amp: 0.24)
        XCTAssertLessThan(k ?? .infinity, ChewTuning.defaultK)
    }
}

final class CalibrationStoreTests: XCTestCase {
    var suite = ""
    var defaults: UserDefaults!
    override func setUp() {
        suite = "cys.tests.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suite)
    }
    override func tearDown() { defaults.removePersistentDomain(forName: suite) }

    func testDefaultsToTuningDefault() {
        XCTAssertNil(CalibrationStore(defaults: defaults).k)
        XCTAssertEqual(CalibrationStore(defaults: defaults).kOrDefault, ChewTuning.defaultK)
    }

    func testPersistsAcrossInstances() {
        CalibrationStore(defaults: defaults).k = 3.25
        XCTAssertEqual(CalibrationStore(defaults: defaults).k, 3.25)
        CalibrationStore(defaults: defaults).k = nil
        XCTAssertNil(CalibrationStore(defaults: defaults).k)
    }

    @MainActor
    func testDetectorSensitivityStartsFromStore() {
        XCTAssertEqual(ChewDetector(calibration: CalibrationStore(defaults: defaults)).sensitivity, ChewTuning.defaultK)
        CalibrationStore(defaults: defaults).k = 3.0
        XCTAssertEqual(ChewDetector(calibration: CalibrationStore(defaults: defaults)).sensitivity, 3.0)
    }
}
