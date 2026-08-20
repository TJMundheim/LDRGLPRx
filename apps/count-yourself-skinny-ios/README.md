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
- `CMHeadphoneMotionManager` chew detection (1–2 Hz periodicity, on-device only)
- 2-minute calibration onboarding; trends screen

## Build
Project is generated with xcodegen (not installed on this Mac yet):
```bash
xcodegen generate   # in this directory, then open CountYourselfSkinny.xcodeproj
```
Until xcodegen is available, the Sources tree is the deliverable.

## App Store Connect checklist (monetize out of the box)
- [ ] Products: cys.pro.monthly ($2.99, 7-day trial), cys.pro.yearly ($19.99, 7-day trial)
- [ ] Offer-code campaign "BOOK" — 1 free month (printed in the book's back matter)
- [ ] Featuring nomination at launch (novel CMHeadphoneMotionManager health use-case)
- [ ] Privacy nutrition label: no data collected (v1, pre-account)
