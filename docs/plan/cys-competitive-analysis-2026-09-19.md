# Count Yourself Skinny — chew-tracking competitive analysis (2026-09-19)

## The field (as of 2026-09-19)
| Product | Detection | Price | Traction signal | Notes |
|---|---|---|---|---|
| **Ododok — Meal & Chew Tracker** (Shamrock Labs / sungho choi, Korea) | AirPods motion (Pro, 3rd/4th gen); personal calibration | Free (no IAP listed yet) | v1.0 Jul 6 2026; v1.6.1 ~Sep 18; Product Hunt Aug 2026 = 105 upvotes; **App Store: not enough ratings to show** | Real-time chews, pace, meal duration, meal reports, streak calendar + Streak Freeze, meal photos, mascot "Odi" + acorns, friend sharing, reminders, Live Activities. EN/JA/KO. Disclaimer: "reference information… not medical." No Watch, no HealthKit, no Android. |
| Chewing Diet: Mindful Eating (Seunggon Kim) | Manual timer + Watch vibration cues | Free, $1.99 remove ads | 5.0 (6 ratings) | Timer-to-15-min approach, coin gamification. |
| SlowEat — Mindful Eating Tracker (Jkcreate) | Phone camera speed detection; Watch/phone haptic cadence | Free, $4.99 lifetime | 4.0 (2 ratings) | 50+ badges, heatmap, iCloud. |
| ZenMunch (BL Tech, AU) | Camera face-landmark chew counting | Free | no ratings | Meditations, pacing alerts, weight log. Dec 2025. |
| ChewBe | Camera + "in-house" AI, claims >90% | open beta | — | iOS+Android; also macros; diabetes angle. |
| Chew Sense — Collect and Label (individual) | AirPods motion + video **data-collection tool**, personal use | Free | — | Not a consumer counter. |
| Research: IMChew (2024, ACM) | Earphone IMU, 8 subjects | — | — | Detector F1 0.91; count MAPE 9.5% (LOSO). Our Chew Lab pipeline is the same idea. |
| History: HAPIfork (2013), Dartmouth jaw sensor (2017), Healbe GoBe, AIRO | Smart fork / jaw wearable | $99 | Kickstarter/CES buzz → faded | Failure modes: extra hardware, "weird" wearable, couldn't tell foods apart, no reason to keep using. |

## Are they doing/saying anything we're not?
Yes — three worth taking, none of them our moat:
1. **Personal calibration before first meal** (Ododok). Already in our v1.5 plan as the "2-minute Chew Calibration"; keep it and make it a delightful first-run moment.
2. **Meal reports + pace score + streak with a "freeze"** (Ododok). We have streak + never-miss-twice; add a per-meal pace readout and a streak-freeze ("one free miss a week") — cheap, matches the book's "never miss twice."
3. **Live Activities / lock-screen chew count** (Ododok) — worth adding so the count is visible without unlocking mid-meal.
Camera-based rivals (SlowEat/ZenMunch/ChewBe) prove the *camera* approach is the crowded, awkward path (phone propped at the table); AirPods is the clean one.

## Why no traction (so far)
- **Ododok is 10 weeks old** — too early to call "no traction," but the pattern is visible: a *counting utility* with a mascot and social sharing, no thesis, no program, no reason to keep going after the novelty. Consumer health single-feature apps die at week 3 unless attached to an outcome. Same pattern that killed HAPIfork after the CES buzz.
- Positioning is "mindful eating" (soft, wellness-flavored, no promise). No book, no number to hit, no protocol, no clinician voice, no funnel, no distribution beyond Product Hunt.
- Each rival is a solo developer; none has a channel (grocery racks, dinners, a book, a coordinator call).
- Camera apps require propping a phone at the table → low compliance; timer apps are just timers.

## What this confirms about CYS (our differentiation)
1. **The 32 + the stack.** Nobody else names a number, a rule (fork down), or ties chewing to a 6-count program (hours, steps, light, water, nights, streak). Ododok counts; we prescribe.
2. **The book is the distribution.** A $7 checkout-aisle book that *sells the app* is a channel none of them have. Grocery racks + dinners + coordinator funnel.
3. **Clinician voice + evidence page** (Iowa State chew RCT, step-curve data) vs "reference information" disclaimers.
4. **Provocation** ("Skinny") vs "mindful." They whisper; we pick the fight.
5. **Bite Pacer works with no earbuds day one** — none of the AirPods-only or camera-only apps degrade gracefully; ours does.
6. **On-device, nothing uploaded** — Ododok's privacy is similar; keep parity, but ours ALSO never asks for photos or friends.

## Risks to watch
- Ododok ships fast (1.0→1.6.1 in 10 weeks) and could add a program/thesis; watch for a paid tier and any "32"-style rule.
- **Apple could ship eating detection natively** (biosensor patents; AirPods Pro 3 heart-rate). If Apple Health adds "eating episodes," the counter becomes a commodity — the program/book/coordinator layer is what survives. Design so the AirPods feature is marketing, not the moat.
- Name collision: "Ododok" is also a Korean kimchi brand — irrelevant to us, but a reminder to lock the CYS domain/trademark now.

## Actions
- Keep v1.5 plan; add: pace score per meal, streak freeze, Live Activity. Calibration = first-run ritual.
- Lock countyourselfskinny.com + handles + trademark (still open).
- TJ now has the AirPods → run Chew Lab meals this week; tune constants against Ododok's claimed behavior (they "distinguish chewing from head movement" — our band-pass + MAD floor targets exactly that).
- App Store copy: lead with "Count to 32" and the book, not "mindful eating."
