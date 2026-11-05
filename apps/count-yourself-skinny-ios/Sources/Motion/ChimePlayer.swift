import AVFoundation

/// Plays the chime over whatever else is playing (music keeps going), through connected AirPods.
/// Needs no background mode. Every failure is silent.
final class ChimePlayer: ChimePlaying {
    private var player: AVAudioPlayer?
    private var sessionActive = false

    init() {}

    func prepare() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
            sessionActive = true
            let p = try AVAudioPlayer(data: ChimeTone.wavData())
            p.prepareToPlay()
            player = p
        } catch {
            player = nil
        }
    }

    func play() {
        if player == nil { prepare() }
        guard let player else { return }
        player.currentTime = 0
        player.play()
    }

    func stop() {
        player?.stop()
        player = nil
        guard sessionActive else { return }
        sessionActive = false
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}
