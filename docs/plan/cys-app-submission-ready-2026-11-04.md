# Plan: Count Yourself Skinny iOS app, ready to submit (2026-11-04)

## Context
The app builds, but it can't go to Apple: the paywall sells features that don't exist, a subscriber gets nothing extra, and the streak can never rise because nothing closes out the day. This plan makes the free tier work as the book describes, makes Pro real, and adds what App Review requires. It stops short of what needs TJ: Apple enrollment, the AirPods test on a real meal, approving the icon, and deploying the privacy page.

Project rule overrides the plan template: **main only, no worktrees, no PR.** The orchestrator commits and pushes after each phase. Writer tasks run one at a time because they share the Xcode project and build directory; only tasks that never build run in parallel.

## Shared rules for every task
- Directory: `apps/count-yourself-skinny-ios`. Regenerate after adding files: `~/.local/xcodegen/xcodegen/bin/xcodegen generate`.
- Test command (`$TEST`): `xcodebuild test -project CountYourselfSkinny.xcodeproj -scheme CountYourselfSkinny -destination "platform=iOS Simulator,id=DFE0EF33-CD43-441B-BD5F-CC44D108CF11" -derivedDataPath build -skipMacroValidation`
- Tests are written first and seen failing. Keep logic out of SwiftUI views, in plain types.
- Copy: book voice. Never count calories, macros or grams. No "coming soon". Say "Dr. TJ", no ", DC". Don't commit or push; the orchestrator does.
- Never send chew, step, weight or other health numbers off the phone.

## Tasks

### [P1] Project config, test target, StoreKit config, privacy manifest  [parallel]
model: sonnet
In `project.yml`: add unit test target `CountYourselfSkinnyTests`; set version 1.0.0, iPhone only, portrait; `ITSAppUsesNonExemptEncryption` NO; app icon name `AppIcon`; scheme `storeKitConfiguration`. Add `CountYourselfSkinny.storekit` with `cys.pro.monthly` $2.99 and `cys.pro.yearly` $19.99, each with a 7-day free trial, one group. Add `Sources/PrivacyInfo.xcprivacy`: UserDefaults reason CA92.1, no tracking, collected types: product interaction (not linked, analytics) and email (linked, optional, developer marketing). Reword the motion string to: "Motion access lets your AirPods count chews during meals. Chew motion is processed on your phone and never leaves it."
✓ DONE WHEN: `$TEST` exits 0 with one placeholder test

### [P1] App icon  [parallel]
model: sonnet
Generate `Sources/Assets.xcassets/AppIcon.appiconset` with a single 1024×1024 opaque PNG (no alpha) and Contents.json. Design: giant numeral "32", the book's planned motif. Check `docs/book/cover/` for the brand navy and gold. Must read at 60px. Do not build.
✓ DONE WHEN: `sips -g hasAlpha -g pixelWidth` reports hasAlpha no, pixelWidth 1024

### [P1] Draft app privacy page, not deployed  [parallel]
model: sonnet
Create `website/src/pages/legal/count-yourself-skinny-privacy.astro`, following `pages/legal/privacy-notice.astro`. State plainly: counts, meals and weigh-ins stay on the phone; chew motion is processed on-device; HealthKit steps are read-only and never leave the phone; anonymous usage events (event names and a random ID, no health numbers) go to PostHog; email only if volunteered, for updates, unsubscribe anytime; Apple handles payments; no accounts; no sale of data. Do not deploy, do not edit `privacy.astro`.
✓ DONE WHEN: `pnpm --filter website build` exits 0, or the site's own build command does, and the page is in the output

### [P2] TEST + IMPL: Day rollover and streak  [sequential after P1]
model: sonnet
TEST pure `StreakEngine` and `DayCounts`, injecting dates: yes adds one; one miss keeps the streak with no gain; a second miss in a row resets to 0; unanswered past days count as misses; answering twice in a day changes the answer rather than double counting; longest streak kept; new calendar day zeroes water and light; values persist across relaunch. IMPL them, wire `CountStore`, delete unused `hitToday`/`closeOutDay` paths.
✓ DONE WHEN: `$TEST` exits 0

### [P3] Free-tier screens  [sequential after P2]
model: sonnet
Home: evening card "Did you hit your counts today?" Yes/No, with the book's reminder "A shrunk day still counts"; after a miss show "Never miss twice." First Light row opens a 10-minute timer that credits minutes. Steps row refreshes, and shows why Health is needed. Fast clock row says "Tap at your last bite". Weigh-in screen: once a week, simple trend line. Water and light persist. Morning mode uses the same store. Verify in simulator.
✓ DONE WHEN: `$TEST` exits 0 and build succeeds

### [P4] TEST + IMPL: Chew signal core and calibration  [sequential after P3]
model: sonnet
Extract pure `ChewSignalCore` from `ChewDetector` (feed scalar + timestamp, get chew flags), no CoreMotion. `ChewDetector` keeps behaviour by wrapping it. TEST with synthetic signals: 1.1 Hz chewing yields a count within 10% of truth; a still head yields 0; a slow head turn yields under 3. TEST `Calibrator`: replays captured samples across k from 1.5 to 4.0 and picks the k closest to the known chew count; rejects a run with no usable signal. Persist chosen k per user.
✓ DONE WHEN: `$TEST` exits 0

### [P5] TEST + IMPL: Meal log, trends, chime tone  [sequential after P4]
model: sonnet
TEST `MealStore` (save, load, sorted, survives relaunch) and `TrendsCalculator` (average chews per bite and chews per minute, by week, empty state, ignores meals under 30 seconds). TEST `ChimeTone` generates a valid WAV (header, duration, non-silent). IMPL all three, plus `ChimePlayer` using AVAudioSession `.playback` with `.mixWithOthers`, so it plays in the AirPods over any music.
✓ DONE WHEN: `$TEST` exits 0

### [P6] Pro screens and gating  [sequential after P5]
model: sonnet
`CalibrationView`: about 2 minutes: stay still, then three guided 32-chew rounds at the pacer's beat. `MealView`: live count, chime at 32, screen stays awake, clear AirPods-missing state, saves the meal at finish. `TrendsView`. Lock all three behind `isPro`, showing the paywall otherwise. First meal runs calibration. Wrap the Chew Lab link in `#if DEBUG` so TJ's test build has it and Release doesn't.
✓ DONE WHEN: `$TEST` exits 0 and a Release build has no Chew Lab symbol reachable from Home (`#if DEBUG` in diff)

### [P7] TEST + IMPL: Paywall and purchases  [sequential after P6]
model: sonnet
TEST with StoreKitTest `SKTestSession`: buying sets `isPro`; expiring clears it; restore works; cancel leaves state unchanged and shows no error. IMPL `ProStore` purchase result handling, `restore()` via `AppStore.sync()`, load failure. Paywall: list only built features; show price, period and "7 days free, then $X per month, cancels anytime in Settings" from product data, showing the trial only if eligible; Restore Purchases; working Terms (Apple standard EULA) and Privacy links; retry state if products fail to load; pending state.
✓ DONE WHEN: `$TEST` exits 0

### [P8] TEST + IMPL: About, analytics, contact capture  [sequential after P7]
model: sonnet
TEST `Analytics` builds a PostHog capture payload with allowed event names only and a random stored ID, and contains no numeric health property. TEST `ContactCapture` payload: `{email, source:"cys-app", hp:"", t}` to `/api/lead-capture`, rejects a bad email. IMPL both with URLSession, no SDK, failures silent. Public key as in `website/src/layouts/BaseLayout.astro`. About screen: disclaimer, privacy, terms, restore, an optional email box with explicit consent wording, and "What comes after skinny?" linking to my4mlife.com/assessment with the identity/dignity line. Never require email.
✓ DONE WHEN: `$TEST` exits 0

### [REVIEW] Code review  [sequential, runs last]
model: opus
- [ ] `$TEST` green; Release build succeeds
- [ ] Every paywall promise is built and gated
- [ ] No health numbers leave the phone; manifest matches actual behaviour
- [ ] No unused code; no secrets beyond the public PostHog client key
- [ ] Apple 3.1.2 items present
- [ ] README and App Store Connect checklist updated
✓ DONE WHEN: all items checked, findings fixed, pushed to main

## Needs TJ, not in this plan
Apple Developer enrollment; AirPods test on a real meal, which decides whether Pro ships paid; icon approval; deploying the privacy page; App Store listing and screenshots; the CYS web page; the book.
