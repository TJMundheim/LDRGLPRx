import XCTest
@testable import CountYourselfSkinny

final class CalibrationFlowTests: XCTestCase {
    var suite: String!
    var defaults: UserDefaults!
    override func setUp() {
        suite = "cys.cal.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suite)
    }
    override func tearDown() { defaults.removePersistentDomain(forName: suite) }

    /// Feeds a signal into the flow, shifting its timestamps so each phase continues in time.
    private func feed(_ flow: inout CalibrationFlow, _ s: SyntheticChew.Samples, from t: Double) -> Double {
        for x in s { flow.ingest(scalar: x.scalar, t: t + x.t) }
        return t + (s.last?.t ?? 0) + 0.04
    }

    /// Plays the whole run: 20 s still, three 28.8 s rounds of 1.1 Hz chewing with rests.
    private func runAll(chewing: Bool) -> CalibrationFlow {
        var flow = CalibrationFlow()
        flow.begin()
        var t = 0.0
        t = feed(&flow, SyntheticChew.make(seconds: 20, chewHz: nil).samples, from: t)
        flow.advance()
        for _ in 1...3 {
            t = feed(&flow, SyntheticChew.make(seconds: 29, chewHz: chewing ? 1.1 : nil).samples, from: t)
            flow.advance()      // end of round
            if case .rest = flow.phase { flow.advance() }
        }
        return flow
    }

    func testPhaseOrder() {
        var flow = CalibrationFlow()
        XCTAssertEqual(flow.phase, .intro)
        flow.begin()
        XCTAssertEqual(flow.phase, .still)
        flow.advance()
        XCTAssertEqual(flow.phase, .round(1))
        flow.advance()
        XCTAssertEqual(flow.phase, .rest(after: 1))
        flow.advance()
        XCTAssertEqual(flow.phase, .round(2))
        flow.advance(); flow.advance()
        XCTAssertEqual(flow.phase, .round(3))
    }

    func testSuccessfulRunReachesResultThenSaves() {
        var flow = runAll(chewing: true)
        guard case .calibrated(let s) = flow.phase else { return XCTFail("phase \(flow.phase)") }
        XCTAssertTrue(Calibrator.kValues.contains(s.k))
        let store = CalibrationStore(defaults: defaults)
        XCTAssertNil(store.k)
        flow.save(to: store)
        XCTAssertEqual(flow.phase, .saved)
        XCTAssertEqual(store.k, s.k)
    }

    func testNoChewingIsRejectedAndSavesNothing() {
        var flow = runAll(chewing: false)
        guard case .rejected = flow.phase else { return XCTFail("phase \(flow.phase)") }
        let store = CalibrationStore(defaults: defaults)
        flow.save(to: store)
        XCTAssertNil(store.k, "save is only allowed from a calibrated result")
        XCTAssertNotEqual(flow.phase, .saved)
    }

    func testRetryStartsOverFromStillWithFreshBuffers() {
        var flow = runAll(chewing: false)
        flow.retry()
        XCTAssertEqual(flow.phase, .still)
        XCTAssertEqual(flow.stillSampleCount, 0)
        XCTAssertEqual(flow.roundSampleCount, 0)
    }

    func testSkipLeavesDefaultAndRemembersTheSkip() {
        var flow = CalibrationFlow()
        flow.begin()
        let store = CalibrationStore(defaults: defaults)
        flow.skip(store: store)
        XCTAssertEqual(flow.phase, .skipped)
        XCTAssertNil(store.k)
        XCTAssertEqual(store.kOrDefault, ChewTuning.defaultK)
        XCTAssertTrue(store.skipped)
    }

    func testSamplesAreRoutedByPhase() {
        var flow = CalibrationFlow()
        flow.ingest(scalar: 1, t: 0)           // intro: dropped
        flow.begin()
        flow.ingest(scalar: 1, t: 1)           // still
        flow.advance()
        flow.ingest(scalar: 1, t: 2)           // round 1
        flow.advance()                          // rest
        flow.ingest(scalar: 1, t: 3)           // dropped
        XCTAssertEqual(flow.stillSampleCount, 1)
        XCTAssertEqual(flow.roundSampleCount, 1)
    }

    func testNeedsCalibrationOnlyWhenNothingSavedOrSkipped() {
        let store = CalibrationStore(defaults: defaults)
        XCTAssertTrue(store.needsFirstRun)
        store.skipped = true
        XCTAssertFalse(store.needsFirstRun)
        store.skipped = false
        store.k = 3.0
        XCTAssertFalse(store.needsFirstRun)
    }

    func testRoundBeatMatchesBitePacer() {
        XCTAssertEqual(CalibrationFlow.beat, 0.9)
        XCTAssertEqual(CalibrationFlow.chewsPerRound, 32)
        XCTAssertEqual(CalibrationFlow.stillSeconds, 20)
    }
}
