# Count Yourself Skinny — Master Plan (2026-08-09)

Status: DRAFT — awaiting TJ review. Book v1 draft lives at `docs/book-cys/draft/_MASTER.md`.

## 1. The concept in one line

Mass-market prequel to *Begin with the End in Mind*: a short, free-to-execute protocol built on counting easy things (chews, hours, steps, light minutes, nights, streak) and never counting calories — paired with a low-cost companion app whose marquee feature is **real-time chew counting through the motion sensors in AirPods**, all funneling into the My4MLife assessment.

## 2. The science backbone (claims we can defend)

| Count | Threshold | Evidence anchor |
|---|---|---|
| Chews | 32/bite, fork down | Iowa State RCT: +50% chews → −10% intake; 2× chews → −15% (S2212267213013750) |
| Steps floor | ~2,500/day; ladder to 10k/14k | CV-mortality benefit threshold ~2,337 (Eur J Prev Cardiol 2023); all-cause ~3,143–3,867; steepest gains at bottom of curve |
| Fast hours | 12 → 14 → 16; 3h before bed | Insulin-suppression framing; consistent with book-one protocol (9–6 window) |
| Morning light | 10 min outside, first hour awake | 10–15 min → sleep-onset −30 min, +19 min sleep; outdoor lux ≫ window |
| Sleep | 7×7h nights/week | Ghrelin/leptin appetite-amplification literature |
| Streak | Never miss twice; weekly weigh-in | Behavior-design standard |

Caveats written into the book: chewing is "one lever in a stack" (older-adult studies show slower eating but not always smaller meals); fasting disclaimer for diabetes/eating-disorder history.

## 3. The app — "Count Yourself Skinny" (native iOS)

**Why native, not our usual Vite PWA:** chew detection requires `CMHeadphoneMotionManager` (AirPods motion API), which is iOS-native only. Everything else (steps via HealthKit, timers) is also cleaner native. Android follows later (fewer earbuds expose motion data). This is a deliberate, contained exception to the PWA house standard.

**Feasibility proof:** IMChew (ACM 2024) — 91% chew-detection accuracy, ~9.5% count error using earphone IMUs; one thin competitor (Ododok) already ships AirPods chew counting. Per-user calibration improves accuracy → "2-minute Chew Calibration" onboarding step.

### v1 scope (no ML — ships with book launch)

One home screen, five live counters:
1. **Bite Pacer** — metronome/haptic cadence for 32 chews + fork-down cue (works for every user, no earbuds).
2. **Steps** — HealthKit read; ladder display 2,500 / 5,000 / 10,000 / 14,000.
3. **Fast clock** — "Last bite" button; celebrates 12/14/16h; 3h-before-bed reminder.
4. **First Light timer** — 10-min outdoor timer, morning notification.
5. **Streak** — one daily yes/no; "never miss twice" guard notification; weekly weigh-in log (trend line only).
Plus **"One Walk, Five Boxes" morning mode** — a single screen where steps, light minutes, and fast hours tick simultaneously during the fasted morning walk. Signature feature; demo moment for talks/media.

### v1.5 (the marquee)

- **AirPods chew counting**: CMHeadphoneMotionManager stream → on-device peak-detection/periodicity model (chewing ≈ 1–2 Hz rhythmic ear motion); in-ear chime at 32; per-user calibration session. On-device only — no audio recorded, no cloud (privacy is a marketing feature: "your earbuds count, nothing leaves your phone").
- Trends screen (chews/meal, eating speed over weeks).
- v2 candidates: Apple Watch fork-down detection (wrist IMU), Android + non-Apple earbud support, employer cohort dashboards.

### Data + funnel triggers

- Local-first; optional account = same Cognito pool as My4MLife (email+name+phone → Protégé-compatible).
- **No PHI in this app** (wellness counters only) → stays outside the Bedrock/HIPAA perimeter; if that changes, all AI calls go through Bedrock per standing rule.
- Funnel triggers (in-app "next door" card → my4mlife.com/assessment): 30-day streak, 12-week completion, weight-trend milestone, or user taps "What comes after skinny?" (mirrors book ch. 11).
- PostHog events per existing taxonomy; app-source tagging so cohort attribution is clean.

## 4. Monetization ladder

1. **App: free + Pro subscription ($2.99/mo or $19.99/yr).** Free tier = all five counters + streak. Pro = AirPods chew counting, trends, morning-mode history. Book carries a code for 1 free month of Pro. Rationale: $1.99 one-time caps LTV and shrinks the funnel; free download maximizes reach and Pro monetizes the marquee feature. (If TJ prefers the $1.99 psychology: $1.99 paid app + $0.99/mo Pro is the fallback — decision needed.)
2. **Hardware affiliate layer** — see §5.
3. **Employer skin** — this app is a cleaner $0-PEPM wedge than the full platform: non-medical, no PHI, instant rollout. "Give every employee Count Yourself Skinny Pro" = employer-paid Pro seats (per-seat annual), feeding the same assessment funnel. Aligns with employer-edition direction (2026-08-05).
4. **The real engine: funnel to My4MLife** — assessment → Protégé → Biome NS / consults / Rx verticals. The app is a $0-CAC acquisition machine; Hims-model alignment (buy first, app second → here: tiny purchase first, telehealth relationship second).
5. **Paid speaking + media** — book gives the talk; app gives the live demo ("everyone put in your AirPods and chew this almond"). Feeds Sinicropi speaker track.

## 5. Hardware affiliate + co-marketing strategy

**Tier 1 — Apple (affiliate only, no co-marketing expectations).** Join the Apple Services/Performance Partners affiliate program; in-app + book QR "Works best with AirPods Pro" link. Apple won't co-market with a small app, BUT: an app that showcases CMHeadphoneMotionManager in a novel health use-case is exactly the profile Apple features editorially (App Store "Apps We Love," WWDC health sessions). **The realistic Apple play is App Store featuring, not a partnership deal.** Action: build to Apple design standards, submit a featuring nomination via App Store Connect at launch.

**Tier 2 — challenger earbud brands (the real co-marketing target).** Brands with ear-worn sensing ambitions who NEED a killer health app: Soundcore/Anker, JLab, Nothing, Jabra, and especially any brand shipping heart-rate/motion earbuds (e.g., Powerbeats-class fitness buds). Pitch: "Our book + media push tells millions their earbuds can make them skinny — we'll certify yours as a supported device; you promote the app to your installed base." Deliverables to ask for: co-branded bundle SKU (buds + book + 3-mo Pro), inclusion in their companion-app discovery, joint PR at launch. Our leverage: we bring the *reason to wear earbuds at meals* — net-new usage minutes for their hardware.

**Tier 3 — white-label future (not now).** If v1.5 proves the category, a branded "counting earbud" via ODM is possible; explicitly deferred — no hardware pre-revenue.

**No-weak-links rule applies:** any recommended earbud must pass a full audit (privacy posture, motion-API quality) before it's certified/affiliated.

## 6. Book production notes

- Draft v1 at `docs/book-cys/draft/_MASTER.md` — 11 chapters, ~5,500 words, deliberately short (checkout-aisle read). De-branded per print-artifact policy: no product names; only my4mlife.com pointers. Disclaimer included.
- Voice: mass-market ("Who This Book Is For: Everyone") — deliberate contrast with book one's motivate-men page; positions as prequel, ch. 11 hands off to *Begin with the End in Mind* + assessment QR.
- Same KDP pipeline as book one (6×9 paperback/hardcover + Kindle). Cover concept: giant numeral "32" motif.
- On every future revision: keep the S3 fulfillment re-upload rule in mind if this book joins Protégé fulfillment.

## 7. Sequence

1. TJ reviews book draft + this plan (pricing decision §4.1; title lock).
2. Book: cover + KDP layout pass (reuse book-one pipeline).
3. App v1 build (native iOS, ~5 screens, no ML) — target: ready at book launch.
4. Launch: book + free app + media pitch ("the anti-counting counting diet"; journalist can test it in one morning).
5. v1.5 AirPods chew counting + Apple featuring nomination + Tier-2 brand outreach (with launch traction numbers in hand).
6. Employer Pro-seat offering once consumer app is stable.

## Open decisions for TJ

- [ ] Pricing: free+Pro sub (recommended) vs $1.99 paid.
- [ ] Title lock: "Count Yourself Skinny" (subtitle: "You'll never count a calorie. You'll count to 32 instead.").
- [ ] Author byline consistent with book one (Dr. TJ Mundheim) — confirm.
- [ ] iOS-native exception approved.
