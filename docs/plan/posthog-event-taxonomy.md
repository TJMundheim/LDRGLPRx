# PostHog Event Taxonomy

**Date:** 2026-05-13
**Status:** Drafted for instrumentation when PostHog key arrives
**Owner:** Engineering

---

## Purpose

Define the events My4MLife tracks in PostHog so we have visibility into the funnel from Day 1 of launch. Naming is consistent (`object_action` format), payloads are minimal, no PHI ever leaves the device in event properties.

## Naming convention

`{object}_{action}` — past tense, snake_case.

Examples: `tile_clicked`, `audit_started`, `cart_viewed`, `checkout_completed`.

Never embed PHI (no names, emails, audit scores tied to identity in event properties). PostHog identifies by anonymous distinct_id by default; we only call `posthog.identify(member_id)` AFTER purchase, never with raw email or PHI.

---

## The 4 core funnel events (the ones we'd cry without)

### 1. `audit_started`
Fires when the user clicks "Start" on /assessment (renders the first question).
**Properties:**
- `source: 'homepage' | 'navbar' | 'membership' | 'direct'` (where they came from)
- `referrer_pillar: string | null` (if linked from a pillar page)

### 2. `audit_completed`
Fires when the user submits all 8 answers and gets the top-3 result.
**Properties:**
- `top_priority_slug: string` (e.g., 'gut', 'sleep')
- `avg_score: number` (0-10 across the 8 questions)
- `audit_duration_seconds: number`

### 3. `cart_viewed`
Fires when /cart loads (regardless of whether SKU is set).
**Properties:**
- `sku_id: string | null`
- `sku_available: boolean`

### 4. `checkout_completed`
Fires from the Stripe webhook → flips into client via app state. Stripe payment confirmed.
**Properties:**
- `sku_id: string`
- `amount_usd: number`
- `cadence: 'monthly' | 'annual' | 'one-time'`
- `first_purchase: boolean` (is this their first My4MLife purchase ever?)

---

## Engagement events (week-2 visibility, not day-1 critical)

### 5. `tile_clicked`
Fires on any homepage CTA-band tile click.
**Properties:**
- `tile_slug: 'gut' | 'sleep' | 'weight' | 'nutrition' | 'erectile-dysfunction' | 'environment' | 'cognitive' | 'hormones'`
- `tile_position: number` (1-8, position in grid)

### 6. `solution_page_viewed`
Fires on each /solutions/<slug> page load.
**Properties:**
- `solution_slug: string`
- `referrer_type: 'homepage_tile' | 'navbar' | 'audit_result' | 'direct' | 'search'`

### 7. `two_paths_cta_clicked`
Fires when user clicks OTC or Rx button in the top Two Paths block on any solution page.
**Properties:**
- `solution_slug: string`
- `path: 'otc' | 'rx'`
- `location: 'hero_top' | 'mini_repeat_1' | 'mini_repeat_2' | 'mini_repeat_3'` (which Two Paths repeat they clicked)

### 8. `mini_two_paths_clicked`
Fires on any MiniTwoPaths repeat click.
**Properties:** same as above, but `location` always indicates which repeat.

### 9. `state_gate_blocked`
Fires when a non-covered-state user hits the cart/consult gate.
**Properties:**
- `state_code: string`
- `attempted_sku: string | null`

### 10. `state_waitlist_joined`
Fires when a non-covered-state user submits their email for waitlist.
**Properties:**
- `state_code: string`
- `source: 'cart' | 'consult' | 'coverage' | 'membership'`

---

## App-side events (in the clientportal PWA)

### 11. `app_signin_completed`
Fires after successful Cognito OTP login.
**Properties:**
- `is_new_user: boolean`
- `has_active_purchase: boolean`

### 12. `app_paywall_seen`
Fires when LockedGate renders (no purchase).
**Properties:**
- `has_audit_recap: boolean` (did they arrive with `?audit=` param?)

### 13. `app_unlocked_first_view`
Fires the FIRST time the app renders the unlocked experience after a purchase.
**Properties:**
- `time_since_purchase_seconds: number`

### 14. `week_module_opened`
Fires when the user opens a weekly module (week 1, 2, 3, 4).
**Properties:**
- `week_number: 1 | 2 | 3 | 4`
- `pillar: 'mind' | 'muscle' | 'mitigate' | 'motivate'`

### 15. `nudge_shown` / `nudge_dismissed`
Fires when a Nudge appears or is dismissed.
**Properties:**
- `nudge_id: string`
- `nudge_category: 'welcome-back' | 'intake-celebration' | 'week-milestone' | 'free-tier-upgrade' | 'substance-use-ldn'`

---

## Marketing-attribution events

### 16. `landing_first_view`
Fires on the first page load of a session.
**Properties:**
- `utm_source: string | null`
- `utm_medium: string | null`
- `utm_campaign: string | null`
- `referrer_domain: string | null`
- `landing_path: string`

### 17. `assessment_share_clicked`
Fires when user clicks "Share" on their audit results.
**Properties:**
- `share_method: 'email' | 'copy_link' | 'sms'`

---

## Identity model

Before purchase: anonymous distinct_id (PostHog's default UUID, cookie-based).
After purchase: `posthog.identify(member_id)` where `member_id` is our Cognito user sub — NOT the email.
On AI concierge interactions: use `member_id` for identification.

**Never identify by raw email or any PHI.** Member-ID-only is sufficient for funnel + cohort analysis and keeps PostHog analytics outside the PHI envelope.

---

## Cohorts to set up in PostHog (week 1 of launch)

1. **Audit completers** — fired `audit_completed`
2. **Cart viewers** — fired `cart_viewed` with sku_id != null
3. **Buyers** — fired `checkout_completed`
4. **First-week activation** — Buyers who fired `app_unlocked_first_view` within 24 hours
5. **State-blocked** — fired `state_gate_blocked` at least once
6. **Top-priority gut** — fired `audit_completed` with top_priority_slug = 'gut'
   (one cohort per priority — helps content-marketing tuning)

---

## Funnels to watch (week 1)

1. **Audit funnel:** `audit_started` → `audit_completed` → `solution_page_viewed` → `cart_viewed` → `checkout_completed`
2. **Tile funnel:** `tile_clicked` → `solution_page_viewed` → `two_paths_cta_clicked` → `cart_viewed` → `checkout_completed`
3. **Mobile vs desktop conversion** — PostHog has device tracking built in
4. **State-gate impact:** `cart_viewed` → `state_gate_blocked` vs `cart_viewed` → `checkout_completed` (what % of cart views are non-covered-state)

---

## Implementation checklist

- [x] PostHog snippet wired in BaseLayout (TJ needs to replace placeholder key)
- [ ] Add posthog.capture() calls at each of the 17 event sites listed above
- [ ] Build the 6 cohorts in PostHog console once the first ~50 events fire
- [ ] Build the 4 funnels in PostHog console
- [ ] Weekly review cadence: every Monday, look at funnel conversion rates and the top "drop-off" event from the prior week
