# Count Yourself Skinny — iOS app (native exception)

Native SwiftUI, **approved exception** to the Vite-PWA house rule (2026-08-19, TJ):
chew detection requires `CMHeadphoneMotionManager` (AirPods motion), which only
exists natively on iOS. Master plan: `docs/plan/count-yourself-skinny-master-plan-2026-08-09.md`.

## v1 scope (this scaffold)
- Home: streak + five counters (Bite Pacer, Steps/HealthKit, Fast clock, First Light, Water)
- Bite Pacer: haptic 32-chew cadence — works with no earbuds, day one
- Morning mode: "One Walk, Five Boxes"
- Pro subscription via StoreKit 2 (`cys.pro.monthly` $2.99, `cys.pro.yearly` $19.99,
  book offer-code redemption wired) — monetized at launch
- Local-first, no PHI, no account (Cognito link + PostHog come before App Store submission)

## v1.5 (the marquee)
- `CMHeadphoneMotionManager` chew detection (1–2 Hz periodicity, on-device only) — **prototype shipped**, see below
- 2-minute calibration onboarding; trends screen — not built yet

## Build
```bash
~/.local/xcodegen/xcodegen/bin/xcodegen generate   # in this directory
open CountYourselfSkinny.xcodeproj
```
Simulator build + install + launch:
```bash
xcodebuild -project CountYourselfSkinny.xcodeproj -scheme CountYourselfSkinny \
  -configuration Debug -destination "id=<SIM-UDID>" \
  -derivedDataPath build -skipMacroValidation build
xcrun simctl install <SIM-UDID> build/Build/Products/Debug-iphonesimulator/CountYourselfSkinny.app
xcrun simctl launch  <SIM-UDID> com.my4mlife.countyourselfskinny
```

---

## Chew Lab prototype (v1.5)

Home → **Prototype → Chew Lab — AirPods prototype**. Open to everyone, not gated
behind Pro, while we tune it.

Two jobs:
1. Count chews live, so we can see whether the count is believable at the table.
2. Record raw motion to CSV, so a real meal can be argued with offline.

Files: `Sources/Motion/ChewDetector.swift`, `Sources/Views/ChewLabView.swift`.

### Why this works without ML

Chewing moves the mandible, which couples into small pitch rotations and vertical
translation of the skull. `CMHeadphoneMotionManager` streams that at ~25 Hz from
AirPods Pro, AirPods (3rd gen or later) and AirPods Max. Human chewing is a stable
0.9–1.8 Hz oscillation, so band-passing into the chew band and counting peaks is
enough for a prototype. Everything runs on-device; nothing is written to disk or
transmitted unless the user taps Export.

### Pipeline

1. **Scalar** — `s = |rotationRate| + 2.0 · |userAcceleration.y|`
   (rotation in rad/s dominates; vertical accel in g gets a modest boost)
2. **Band-pass** — single-pole EMAs, `α = dt / (dt + 1/(2π·fc))`, with `dt` taken
   from the device timestamps:
   - high-pass at **0.8 Hz** (subtract the EMA baseline) — kills posture drift,
     head turns, walking sway
   - low-pass at **2.5 Hz** — kills speech, footfall, sensor noise
3. **Peaks** — three-point local maxima, minimum inter-peak interval **0.35 s**
   (a 2.86 Hz ceiling — faster than any real chew)
4. **Gate** — a peak counts only if it exceeds `k × noiseFloor`, where the floor is
   a robust sigma (`1.4826 × MAD`) over the last **3.0 s** of the band-passed signal.
   Median-based, so the chew peaks themselves barely move the floor. A peak must
   also clear an absolute floor of **0.015** so a motionless head can't manufacture
   chews from quantisation noise.

### Constants (all in `ChewDetector.Tuning`)

| Constant | Value | Why |
|---|---|---|
| `accelGain` | 2.0 | weight on `userAcceleration.y` in the scalar |
| `highPassCutoffHz` | 0.8 | below = posture / head turns |
| `lowPassCutoffHz` | 2.5 | above = speech / footfall / noise |
| `minInterPeakInterval` | 0.35 s | 2.86 Hz chew ceiling |
| `noiseWindow` | 3.0 s | rolling MAD window |
| `madToSigma` | 1.4826 | MAD → sigma for a normal distribution |
| `defaultK` | 2.5 | threshold multiplier; slider range 1.5–4.0 |
| `minPeakAmplitude` | 0.015 | absolute gate against a still head |
| `chewsPerBite` | 32 | heavy haptic + bite auto-reset |
| `signalWindow` | 200 | sparkline depth (~8 s at 25 Hz) |
| `rateStaleAfter` | 5.0 s | no chew for this long ⇒ chews/min drops to 0 |

The **Threshold k** slider (1.5–4.0) is the live knob: lower counts more chews *and*
more noise, higher is stricter. `defaultK = 2.5` is a starting guess, not a finding —
it is exactly what the CSV captures are meant to settle.

Haptics: light tick per chew, heavy tick at 32 then the bite counter auto-resets.
Session total and bite count keep accumulating until **Reset counts**.

### Simulator

The simulator has no headphone motion. `ChewDetector` checks
`CMHeadphoneMotionManager().isDeviceMotionAvailable` at init; when it's false the
screen shows "Not supported on this device/simulator", Start and Export are disabled,
and nothing crashes. Real testing requires a physical iPhone.

### Running on a real iPhone (personal Apple ID team)

Signing is set to `CODE_SIGN_STYLE = Automatic` with an intentionally empty
`DEVELOPMENT_TEAM`, so the checked-in project doesn't pin a team id. One-time setup:

1. `~/.local/xcodegen/xcodegen/bin/xcodegen generate`, then open
   `CountYourselfSkinny.xcodeproj` in Xcode.
2. Select the **CountYourselfSkinny** target → **Signing & Capabilities** →
   **Team** → your personal Apple ID team. (If it isn't listed:
   Xcode → Settings → Accounts → **+** → Apple ID.)
   Leave "Automatically manage signing" checked. Bundle id stays
   `com.my4mlife.countyourselfskinny`.
3. Plug the iPhone in with a cable. On the phone, tap **Trust This Computer** and
   enter the passcode.
4. Pick the iPhone in Xcode's run destination menu and press **Run** (⌘R).
5. First install only: on the phone go to **Settings → General → VPN & Device
   Management → Developer App →** your Apple ID **→ Trust**. Then launch the app
   from the home screen.
6. Approve the motion permission prompt on first entry to Chew Lab
   (`NSMotionUsageDescription` is already in `project.yml` / `Info.plist`).

Free personal teams expire the provisioning profile after **7 days** — re-run from
Xcode to refresh it.

### Capturing a CSV session for analysis

1. AirPods in, open **Chew Lab**, tap **Start**.
2. Turn on **Record session** *before* eating. "Samples recorded" should climb at
   ~25/s once the AirPods are streaming.
3. Eat the meal normally. Note roughly how many bites you took — that's the ground
   truth to score the detector against.
4. Tap **Stop**, then **Export CSV**. The share sheet opens; AirDrop it to the Mac
   (or Save to Files).

The CSV is written to the app's temporary directory as
`chewlab-<ISO8601-timestamp>.csv` with one row per sample:

```
t,pitch,roll,yaw,rot_x,rot_y,rot_z,acc_x,acc_y,acc_z,filtered,threshold,chew
```

`t` is seconds from the first sample, `filtered` is the band-passed scalar,
`threshold` is the adaptive gate at that instant, and `chew` is 1 on the sample the
detector counted. Raw attitude / rotation / acceleration are all preserved, so the
whole filter chain can be re-derived and re-tuned offline against the same capture.

**Recorded samples live in memory only.** They are dropped on **Reset counts** and
when the app quits — export before either.

## App Store Connect checklist (monetize out of the box)
- [ ] Products: cys.pro.monthly ($2.99, 7-day trial), cys.pro.yearly ($19.99, 7-day trial)
- [ ] Offer-code campaign "BOOK" — 1 free month (printed in the book's back matter)
- [ ] Featuring nomination at launch (novel CMHeadphoneMotionManager health use-case)
- [ ] Privacy nutrition label: no data collected (v1, pre-account)
