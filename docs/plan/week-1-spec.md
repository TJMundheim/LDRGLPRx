# Week 1 Spec — *"Begin with the end in mind"*

Locked **2026-06-01** with TJ. The single-track, baby-steps Week 1 every Protégé starts on. Companion to the 2026-05-25 Active-Member spec.

---

## 1. Vision + Tone

The app is a **clinical compliance tool with lifestyle scaffolding**. It is **not** a habit tracker, a coach app, or a "challenge" app. Every action is framed as *the protocol your doctor put you on* — never as homework, challenges, or quests.

**Tone rules:**
- No emoji.
- No streak fireworks, celebration popups, or gamification flourishes.
- No exclamation points outside error states.
- Quiet, serious, prescriptive. Think: a tidy medication-management UI used by patients post-discharge.
- Copy voice: brief, calm, factual. ("Take Biome NS Ultra with breakfast." Not "Time to fuel your gut!")

**Customer mental model**: a 50–65-year-old man who knows he should be doing this but hasn't been able to make it stick. He needs structure, not motivation. He has tried apps before. The product that wins his trust is the one that respects his time and intelligence.

**What we are deliberately not designing for**: high-functioning, self-organizing executives who already have a Whoop + Notion stack. They are not the customer.

---

## 2. The 6 actions across all 4 pillars

Half are 2×/week (not daily) so even a bad week stays completable.

### Mitigate — food + gut (3 actions)

| Action | Cadence | UI |
|---|---|---|
| **Take Biome NS Ultra** (gut-brain seal) | Daily | Single tap checkbox |
| **9 AM – 6 PM eating window** | Daily | One tap "stayed in window" OR two-tap "first bite" + "last bite" |
| **30g lean protein breakfast** | 2× this week | Single tap; tile expands to show examples + affiliate links (see §5) |

### Muscle — strength (1 action)

| Action | Cadence | UI |
|---|---|---|
| **Strength session**: countertop push-ups 3×10 + supported air squats 3×10 | 2× this week | Single tap per session; expander shows form GIFs |

### Mind — circadian + brain (1 action)

| Action | Cadence | UI |
|---|---|---|
| **Fasted morning sunlight walk** (10 min, no food yet, eyes toward sun, sunglasses off) | 2× this week | Single tap; expander explains the why (circadian anchoring, cortisol regulation) |

### Motivate — accountability (1 action)

| Action | Cadence | UI |
|---|---|---|
| **Attend (or watch the recording of) this week's Protégé Zoom** | 1× this week | Auto-marked by ops-agent attendance ingest from Zoom API; or single tap "watched recording" |

---

## 3. Supplements list (Week 1)

### Universal — every Protégé starts here

**Biome NS Ultra** — daily, with breakfast.
- If they subscribed at signup, it ships automatically.
- Otherwise the tile has *"Order now — 15% Protégé discount applied"* linking to `/cart?sku=biome-ns-ultra-sub` with the discount auto-applied.

### Optional / future (not shown in Week 1)

- **BPC-157 oral OTC variant** — once sourced, will be added as a Week 1 default. (TJ to confirm availability.)
- **GLP-1** — log-only field for early-starters. Tile reads *"Already on a GLP-1? Tap to log."* When `Contact.glpStatus = 'prescribed'` (post-consult), this becomes a required weekly action and is no longer optional. Until then it's hidden unless the user has self-attested.

---

## 4. Daily view layout

The app's primary view is **TODAY** — yesterday's checked boxes recede; tomorrow does not exist yet.

```
┌────────────────────────────────────────┐
│ Good morning, Thomas.                  │
│ Monday, June 1                         │
│                                        │
│ DAILY                                  │
│ ☐ Take Biome NS Ultra                  │
│ ☐ Stayed in 9–6 eating window          │
│                                        │
│ THIS WEEK (0 of 5 done)                │
│ ☐ Fasted sunlight walk (0/2)           │
│ ☐ Strength session (0/2)               │
│ ☐ 30g protein breakfast (0/2)          │
│ ☐ Watch this week's Zoom (0/1)         │
│                                        │
│ [Week 1 Zoom — Wed 7pm ET]             │
│ "Why gut first, why we're going to     │
│  want you on a GLP-1, and what your    │
│  next 4 weeks look like."              │
│ → Save your seat / Join                │
│                                        │
│ ↓ Bonus targets (toggle in profile)    │
└────────────────────────────────────────┘
```

The sidebar continues to show Weeks 1–4 (unlocked navigation per current sidebar) but Weeks 2–4 land on placeholder pages until earned. See §8 for unlock logic.

---

## 5. Affiliate revenue ("same spend, better quality")

The protein-breakfast tile expands into 3 example breakfasts. Each example has 1–3 source links — when the user clicks, the link uses our affiliate code.

**Examples shown:**
1. **Eggs + breakfast sausage + spinach** (~32g protein)
2. **Wild salmon + leftover greens** (~34g protein)
3. **Leftover ribeye + soft-boiled egg** (~40g protein)

**Affiliate sources** (one or more shown per example):
- **ButcherBox** (meat/seafood subscription)
- **Thrive Market** (pantry staples, eggs, oils)
- **Amazon** (last-resort convenience)

**Tile footer copy**:
> *We earn a small commission. We never recommend something we don't use ourselves. Same spend, better quality.*

### Implementation note

Affiliate codes are placeholders until TJ signs up:
```ts
// website/src/lib/affiliates.ts (and same in apps/clientportal)
export const AFFILIATES = {
  butcherbox: 'butcherbox.com?ref=PLACEHOLDER_BUTCHERBOX',
  thrive:     'thrivemarket.com?ref=PLACEHOLDER_THRIVE',
  amazon:     'amazon.com/?tag=PLACEHOLDER_AMAZON',
} as const;
```
**TJ action**: sign up for ButcherBox Partner Program, Thrive Market Affiliates, Amazon Associates (~15 min each). Drop the real codes into one file. No code change needed elsewhere.

---

## 6. What's NOT in Week 1 (deferred behind progressive disclosure)

These elements stay in the data schema and stay collected in the assessment / signup — but **don't render** in the Week 1 Today view. They unlock as the Protégé demonstrates adherence.

Hidden in Week 1, surfaces later:
- Identity statement / "I am a man who…"
- Accountability target / "Who are you doing this for?"
- Personal why / graduation-day reading
- BMI calculator
- Workbook reflection fields (`weekReflections`, `month1Wins`, etc.)
- Cognitive ratings (`cogRatings`)
- Body baseline (`bodyBaseline`)
- Factor scores / Factor plans
- Weekly + monthly reflection prompts
- All Week 2–4 detailed content

---

## 7. The one concession to high-achievers: bonus toggle

Profile → Settings → one toggle: **"Show me bonus daily targets"** (off by default).

When on, adds 2 quiet checkboxes to the Today view daily section:
- Cold shower close (≥1 min)
- Walk 10,000 steps

That's it. Self-selecting. Doesn't fork the program, doesn't change the Zoom curriculum, doesn't affect unlocking logic. Adherence on bonus targets is tracked but not gated.

---

## 8. Behavior-triggered unlocking (Week 2 and beyond)

Week 2 unlocks when **both**:
1. Adherence on Week 1 daily actions ≥ 60% (Biome NS Ultra + eating window) over the trailing 7 days
2. Week 1 Zoom attended live OR recording viewed (logged via ops-agent attendance ingest or self-tap)

Until both conditions met, Week 2 page renders:
> *Week 2 unlocks after you've stayed on Week 1 for 5 of 7 days and joined (or watched) this week's Zoom. Keep going.*

No artificial timer — they can earn it as fast as the data allows. Implication: someone who hits Week 1 hard could be on Week 2 by Day 6.

Same pattern for Weeks 3 and 4 with progressively higher bars.

**Why this matters**: it converts the Zoom-attendance ingest we already built (ops-agent post-event-cron) into a direct app gate. No new Lambdas needed — just a new derived field on `UserProfile` and a derived `weekUnlocked` calculation in App.svelte.

---

## 9. Graduation context (shown sparingly)

Single footer line on the dashboard:

> *Week 1 of 52. Graduation = 80% daily + weekly adherence sustained for 12 continuous months.*

No countdown timer, no progress-to-graduation bar, no badges. Just orientation so the user understands the shape of the program. The 80% target matches the locked Active-Member spec (Graduate = 12 continuous months of subscription + adherence floor).

---

## 10. Week 1 Zoom topic (host: Dr. TJ)

**Title**: *"Why gut first, why we're going to want you on a GLP-1, and what your next 4 weeks look like."*

**Outline (45–50 min):**
1. Welcome + identify the room (5 min): "Read your why aloud. Picture the person you're doing this for."
2. Why gut is Week 1 (15 min): the gut-brain axis canonical talking points (90% serotonin / 50% dopamine / vagal highway / probiotic failure modes). Why Biome NS Ultra is universal.
3. Why GLP-1 is coming (15 min): metabolic dysfunction as the upstream of every other 4M issue. What the consult covers. How to book.
4. Weeks 2–4 preview (5 min): not detailed — just shape.
5. Q&A (10 min).

**Conversion mechanic**: the post-Zoom email (sent by ops-agent the next morning to attendees) has ONE primary CTA: **"Book your consult"**.

---

## 11. Data model additions

New collections / fields to add to support this spec:

### `Adherence` table (new)
- PK: `userId` (Cognito sub)
- SK: `date#actionId` (e.g., `2026-06-01#biome-ns-ultra` or `2026-06-01-W23#strength-session`)
- attrs: `completedAt: ISO`, `value?: number` (e.g., minutes walked), `notes?: string`

### `UserProfile` schema extensions
- `weekUnlocked: Int` (derived; 1 by default, updated by adherence cron)
- `bonusTargetsEnabled: Boolean` (default false)
- `glpStatus: 'none' | 'self-attested' | 'prescribed'` (default `'none'`)

### `Adherence` derived calculations
- Run daily by an `adherence-cron` Lambda (new) at 11:55 PM ET per user timezone:
  - Compute Week 1 daily adherence over trailing 7 days
  - Check Zoom attendance status for the current week's Event
  - If both pass, increment `UserProfile.weekUnlocked`
  - Write a row to `AgentRuns` so the daily digest reflects unlock events

---

## 12. What ships in v1 (the minimum)

To ship Week 1 functionally:
1. Today view component in app (replaces current Week 1 page).
2. New `Adherence` DDB table + simple `recordAdherence` mutation in AppSync.
3. Affiliate codes file (placeholders OK at launch — fill in real codes when accounts ready).
4. Profile setting for bonus toggle.
5. Updated copy on dashboard, sidebar, week pages.

To ship behavior-triggered unlocking (can come in v1.1):
6. Daily `adherence-cron` Lambda.
7. `UserProfile.weekUnlocked` field + AppSync derived field.
8. App reads `weekUnlocked` → renders Week 2+ as placeholders until unlocked.

---

## 13. TJ action items before build starts

| # | Item | ~Effort |
|---|---|---|
| 1 | Sign up for **ButcherBox Partner Program** | 15 min |
| 2 | Sign up for **Thrive Market Affiliates** | 15 min |
| 3 | Sign up for **Amazon Associates** (US store) | 15 min |
| 4 | Confirm Week 1 Zoom day/time (proposal: **Wednesdays 7:00 PM ET**, recurring) | 1 min |
| 5 | Provide Zoom Server-to-Server credentials so attendance ingest can fire (`zoom-ops-creds` secret in AWS) | 15 min |
| 6 | Confirm BPC-157 OTC sourcing — add to Week 1 universal supplements? (defer if not ready) | TBD |
| 7 | Record form GIFs for countertop push-ups + supported air squats (or pull from a stock source we have rights to) | 30 min |

None of these block code starting; build can proceed with placeholders for #1–#3 and #5–#7. Only #4 (Zoom time) blocks the first ops-agent weekly run.

---

## 14. Refinements locked 2026-06-01 (second pass with TJ)

These supersede or extend earlier sections.

### 14.1 End-of-week scoreboard

Sunday evening (per user timezone) the Today view flips into a **scoreboard** that stays visible until the next Zoom completes. Shows:
- Daily streak count (longest + current)
- Weekly action completion (e.g., "Fasted walk: 2/2", "Strength: 1/2", "Protein breakfast: 2/2", "Zoom: 1/1")
- Overall Week 1 adherence percentage
- One line of orientation: *"Week 2 unlocks when you attest you watched (live or recording)."*
- A prominent **"I attended (live or recording)"** checkbox — see §14.2

Implementation note: scoreboard is a Today-view variant. Same data source as the daily tiles. No new mutation needed; renderer just changes mode based on `dayOfWeek` and `currentWeekZoomCompleted`.

### 14.2 Zoom attendance = honor system

We are NOT integrating with Zoom's attendance API for the unlock mechanism. Single self-attest checkbox on the scoreboard: **"I attended live or watched the recording."** One tap. Honor system. Unlocks next week.

**Why this works**: the friction of self-attesting (going to the app, finding the button, tapping it) is itself a re-engagement act. If a user is willing to tap that button without actually watching, they're still showing up to the program — which keeps them in the funnel. We'd rather have a self-attested non-watcher than a lost user.

**Implication**: the Zoom S2S creds are no longer blocking for the unlock loop. They're still useful for ops-agent to auto-create the Wednesday recurring meeting, but the attendance ingest path is no longer needed for app gating.

**App displays the recording link** on the Today view scoreboard once recordings are uploaded (TJ posts the link to the Event row via admin UI or directly to DDB). If no recording URL is present, the button just shows the attest checkbox without a "watch recording" link.

### 14.3 Eating window = user-picked at signup

Drop the strict 9–6 default. During the assessment → Protégé signup flow (or first dashboard load), the user picks their window from a short list:
- 9 AM – 6 PM (default suggestion)
- 10 AM – 7 PM
- 11 AM – 8 PM
- 12 PM – 8 PM
- Custom (text inputs, both required)

Stored on `UserProfile.eatingWindowStart` + `eatingWindowEnd`. The Today view tile shows their picked window. Adjustable later in Settings.

### 14.4 BPC-157 in Week 1 — Rx via consult

BPC-157 IS a Week 1 supplement, but framed via the consult path:
- The Biome NS Ultra tile (Mitigate pillar) gets a small expander: *"BPC-157 oral is added to your protocol at your consult — it ships with your GLP-1 prescription."*
- Reinforces that **the consult unlocks two prescriptions, not one** (GLP-1 + BPC-157).
- Increases the perceived value of the consult and increases conversion pressure on Week 1.

### 14.5 Week 1 Zoom — fear-based "why" emphasis

The Zoom opens with **the why, hard**. Spending real minutes (~10–12) on what cognitive loss actually looks like.

Connection to the assessment: the first survey question segments users into *"scared of cognitive loss / want to optimize / both"*. The Zoom acknowledges that answer directly and meets them there. For users who selected "scared" (likely the majority — these are middle-aged men watching a parent decline), the opening visualization needs to be **honest enough to motivate action without being clinical or detached**.

**Revised Week 1 Zoom outline (~50 min):**

1. **Welcome (3 min).** "Read your why aloud — or picture it. Who are you doing this for? See their face."
2. **What cognitive loss actually looks like (10–12 min).** Stage-by-stage visualization. Stage 4 — couldn't recognize own kids. Stage 5 — couldn't drive. Stage 6 — couldn't button a shirt. Walk through the timeline. Acknowledge that everyone in the room either knows someone or fears becoming someone. *This is not abstract. This is your dad in 8 years if nothing changes.*
3. **Why gut first (12 min).** Gut-brain axis canonical talking points. 90% of serotonin made in gut. 50% of dopamine. Vagal highway. Why probiotics fail without the seal. Biome NS Ultra mechanism.
4. **Why GLP-1 is coming + what comes with it (12 min).** Metabolic dysfunction as upstream of cognitive decline. What the consult covers. **And** — at the consult you get BPC-157 oral prescribed at the same time. Two scripts, one visit.
5. **Weeks 2–4 preview (5 min).** Just the shape. No detail.
6. **Q&A (8 min).**

**Conversion mechanic**: post-Zoom email next morning has ONE primary CTA — *"Book your consult"*. Both the GLP-1 and the BPC-157 come from that one click.

### 14.6 Tone for the fear emphasis

This is where the "calm, prescriptive" tone earns its credibility. We don't shout, we don't dramatize, we don't manipulate. We state the facts of what late-stage cognitive decline looks like, in the same tone as the rest of the program. The fear is in the truth, not the framing. Dr. TJ describing in clinical detail what stage 6 looks like — that's the motivator. No music swell, no emotional voiceover. Quiet, serious, mission-driven.

This carries through to the app: a small footer line on Week 1 — *"You're here because you don't want to become the person you're afraid of. We start with your gut because the brain runs on what the gut makes."*

---

## 15. What we are explicitly NOT building yet

- Multi-track / commitment-level fork (rejected 2026-06-01 — single track only).
- Tier upgrades or pricing surfaces in the app (already stripped 2026-06-01).
- Workbook-style reflection fields visible by default (deferred behind progressive disclosure).
- Daily nudges, streak fireworks, gamification copy.
- Cohort chat, peer feed, social features.
- Push notifications (consider once daily compliance is the primary engagement loop).

---

## 16. Open questions resolved 2026-06-01

All three open questions are now resolved (see §14):
1. ~~Eating window~~ → user-picked at signup. (§14.3)
2. ~~Held-back if no Zoom~~ → honor-system tap; user attests live OR recording, no hard hold. (§14.2)
3. ~~BPC-157~~ → Week 1 universal, framed as Rx via the consult bundled with GLP-1. (§14.4)

---

## 17. One remaining question before I build

**Where does the Zoom recording link live?** Two options:
- **(a)** Manual: after each Zoom, you (or whoever hosts) drops the recording URL into the Event row via a small admin page in the AdminDashboard. Then the Today view scoreboard shows a "Watch recording" link next to the attest checkbox.
- **(b)** Automated (later): when Zoom S2S creds are live, ops-agent watches for `recording.completed` webhook and writes the URL automatically.

Recommend **(a) for v1** (5-min admin page), with (b) as a follow-up when Zoom creds land. Confirm and I'll include the admin page in the build.
