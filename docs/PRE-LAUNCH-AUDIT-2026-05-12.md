# Pre-Launch Audit — My4MLife

**Date:** 2026-05-12
**Auditor:** Claude (read-only sweep)
**Scope:** website/, apps/clientportal/, lambdas/, infra/, live site (www + app)
**Live status:** www.my4mlife.com 200 (4 occurrences of "Begin with the end"). app.my4mlife.com 200. All spot-checked routes 200; `/solutions/` index returns **404**. Two Paths confirmed at top of gut/hormones/ED live pages.
**Prior audit:** docs/PRE-LAUNCH-AUDIT.md (2026-05-07, 5 days old) — several items below carry over unresolved.

---

## TL;DR — Top 10 Blockers (ranked by severity)

| # | Blocker | Owner |
|---|---|---|
| 1 | **App shell is NOT hard-paywalled in copy.** Per brand state "no free Protégé framing should exist anywhere," yet `apps/clientportal/src/lib/components/auth/EmailEntry.svelte:32`, `MembershipBanner.svelte:14`, `TierCard.svelte:36+68` ("Start free" / "no card required"), `TierComparisonTable.svelte:52` ("Free"), `PricingPage.svelte:47,61,100` all advertise free Protégé. Sign-up flow auto-creates a free Protégé account in copy. Hard-paywall flag exists in code (`purchase.svelte.ts`) but the marketing copy contradicts it. | [Claude-action] |
| 2 | **Marketing site still sells "free Protégé" everywhere** (must be removed per launch brand state). 16 hits across `website/src/pages/membership.astro` (lines 6, 18, 25, 58, 135, 407, 467), `consult.astro:119`, 5 solution-page `protegeFooter` props (gut, hormones, weight, ED, nutrition), 3 environment sub-pages (sauna:239, cold-plunge:232, mineral-bath:217). `membership.astro:135` button literally reads **"Get the App — Free"** — explicitly forbidden. | [Claude-action] |
| 3 | **OTC `/shop/*` links 404 on production.** Source-confirmed: `solutions/gut.astro:19` → `/shop/biome-af`, `solutions/hormones.astro:19` → `/shop/armorvita`, `solutions/weight.astro:19` → `/shop/foundational`. Live curl confirms 404 on `/shop/biome-af` and `/shop/armorvita`. No `pages/shop/` directory exists. Every primary OTC CTA is broken. (Same blocker as prior audit; unresolved.) | [Claude-action] |
| 4 | **`/solutions` index 404.** `website/src/pages/links.astro:39` links to `/solutions` but there is no `solutions.astro` (only `solutions/` subdirectory). Live curl: 404. | [Claude-action] |
| 5 | **Public-visible "Pricing finalizing" on every solution Two-Paths card.** Live HTML on gut/hormones/ED all render `<p class="path-price">Pricing finalizing</p>` in the OTC card. Looks unfinished on the primary CTA. (Improvement over prior `$XXX`/`TBD` strings, but still flags as pre-launch.) | [TJ-action] (decide price) then [Claude-action] |
| 6 | **8-question intake mislabeled "20-question" in source comments.** `apps/clientportal/src/lib/components/intake/Stage2Likert.svelte:3` header reads "Stage 2 — 20-question Likert Self-Assessment" but the actual `QUESTIONS` array is 8 items (verified). `IntakeModule.svelte:6` also says "Stage2Likert — 20 Likert questions". Not user-visible but misleading for next agent; verify no UI strings say "20 questions" before launch. | [Claude-action] |
| 7 | **Legacy `.html` canonicals + share URLs.** Blog canonicals & JSON-LD in `blog/what-to-expect-first-month-glp1.astro:5,11,114-115` and `blog/semaglutide-vs-tirzepatide.astro:5,11,137` all use `.html` URLs (`/blog/...html`, `/about.html`, `/blog.html`). Twitter/Facebook share buttons will share `.html` URLs that don't exist. Also: `404.astro:27` (`index.html#treatments`), `referral.astro:223` (`index.html#get-started`), `contact.astro:134` (`index.html#faq`). (Same as prior audit, unresolved.) | [Claude-action] |
| 8 | **No `/shop/foundational` page + "Coming soon" public copy.** `solutions/nutritional-supplements.astro:61` says "Coming soon to Insider members" — fine if launching post-Insider. `consult.astro:147` "Booking is coming soon" — booking is on the primary consult CTA page; either remove or replace with a working notify form. | [TJ-action] |
| 9 | **`solutions/erectile-dysfunction` Two-Paths CTA bypasses shop and dumps user on `/membership`** (line 90/121/137 use `otcHref="/membership"`). Inconsistent with gut/hormones which point to (broken) `/shop/*`. Pick a uniform behavior. | [Claude-action] |
| 10 | **JSON-LD on `about.astro:11` explicitly states "Protege tier is free for anyone" and "20-factor self-assessment, daily protocols ... Free, forever — no card required."** This contradicts the hard-paywall state. Schema is crawled and cached by Google/Bing/AI surfaces — this propagates the stale framing into AEO. | [Claude-action] |

---

## 1. Stale copy from prior versions

### 1a. "free Protégé" / "Get the App — Free"  (FAIL — 16+ hits)
**Marketing site:**
- `website/src/pages/membership.astro:6, 18, 25, 58, 135 ("Get the App — Free"), 407, 467`
- `website/src/pages/consult.astro:119`
- `website/src/pages/solutions/erectile-dysfunction.astro:23` (`protegeFooter`)
- `website/src/pages/solutions/weight.astro:23`
- `website/src/pages/solutions/gut.astro:23`
- `website/src/pages/solutions/hormones.astro:23`
- `website/src/pages/solutions/nutrition.astro:22`
- `website/src/pages/solutions/environment/sauna.astro:239`
- `website/src/pages/solutions/environment/cold-plunge.astro:232`
- `website/src/pages/solutions/environment/mineral-bath.astro:217`

**App (clientportal):**
- `apps/clientportal/src/lib/components/auth/EmailEntry.svelte:32` — "We'll create your free Protégé account automatically"
- `apps/clientportal/src/lib/components/tiers/PricingPage.svelte:47, 61, 100`
- `apps/clientportal/src/lib/components/tiers/MembershipBanner.svelte:14`
- `apps/clientportal/src/lib/components/tiers/TierCard.svelte:36, 68`
- `apps/clientportal/src/lib/components/tiers/TierComparisonTable.svelte:52`

### 1b. Question counts (PASS user-visible, FAIL in comments)
No "20-question / 21 / 22 questions" strings rendered to users. Source comments in `apps/clientportal/src/lib/components/intake/Stage2Likert.svelte:3` and `IntakeModule.svelte:6` say "20-question" / "20 Likert questions" but the array is 8 — stale comments only.

### 1c. NeuroLift (PASS)
Zero hits. MitoVita has fully replaced NeuroLift.

### 1d. Age brackets (PASS)
Zero hits for `35-65`, `35-60`, `40-60`, `men 35/40`, `ages 35/40`. Compliant with honest-tone rule.

### 1e. "Dr. Mundheim" outside disclaimers (mostly PASS)
All hits live inside disclaimers, schema, or credentials blocks:
- `website/src/components/Footer.astro:60` — disclaimer (OK)
- `website/src/pages/membership.astro:523, 545` — disclaimers (OK)
- `website/src/pages/about.astro:11, 211, 231, 258` — schema + credentials body (OK; line 211/231 are FAQ Q&A about whether you need to be his patient — arguably borderline marketing voice, review)
- `website/src/pages/consult.astro:214` — disclaimer (OK)
- `website/src/pages/protocols.astro:160` — describes "Dr. Mundheim's telemedicine network" — borderline marketing context (review whether "Dr. TJ" is more on-brand here)

### 1f. "treat" verb in marketing copy
- `website/src/pages/solutions/allergies.astro:20` — "The Mitigate approach **treats** allergic reactivity as a downstream symptom" — clear marketing-voice violation.
- `website/src/pages/solutions/dental.astro:14` — "most men **treat** dental care as cosmetic" — describes consumer behavior, soft pass.
- `website/src/pages/solutions/environment/air.astro:102` — "Know before you **treat**." — soft pass (DIY-mold product context).
- Other matches in environment/cold-plunge & water are technical ("ozone treatment", "water treatment", "treats 100+ liters") — OK.
- `website/src/pages/terms.astro` — heavy "treatment" usage (15+); legal-page context, but reviewed in prior audit. Acceptable in terms-of-use.

---

## 2. Broken internal links

Pages directory: 68 .astro files. Built link inventory: 62 unique `href="/..."` paths.

**Broken:**
- `/solutions` — no `solutions.astro` index. Linked from `links.astro:39`. **Live 404 confirmed.**
- `/shop/biome-af` — no `pages/shop/`. Linked from `solutions/gut.astro:19`. **Live 404.**
- `/shop/armorvita` — same. Linked from `solutions/hormones.astro:19`. **Live 404.**
- `/shop/foundational` — same. Linked from `solutions/weight.astro:19`.

**Anchor links present and verified targets exist:**
- `#solution` — defined in `components/TwoPathsCTA.astro:29`. Used by 8 quick-buy tiles on homepage (`index.astro:21-63`). PASS — Two Paths confirmed at top of live gut/hormones/ED HTML.
- `#why-matters` — `<h2 id="why-matters">` confirmed in all 8 master solution pages. PASS.
- `#sourcing-partners` — no source occurrences found; not currently used. N/A.
- `#tiers`, `#mechanism`, `#mission`, `#booking`, `#protocols`, `#generate`, `#shop-coming-soon`, `#graduate-faq-how` — all defined in their respective pages (spot-verified).

---

## 3. Placeholder / TBD copy visible to users

- `website/src/pages/solutions/nutritional-supplements.astro:61` — "Coming soon to Insider members"
- `website/src/pages/solutions/self-image.astro:41, 47` — "coming soon" (cosmetic referrals)
- `website/src/pages/solutions/healthcare-access.astro:46` — "coming soon"
- `website/src/pages/solutions/environment/cold-plunge.astro:165` — "DIY Cold Plunge Guide ... coming soon"
- `website/src/pages/consult.astro:147` — "Booking is coming soon" (on the consult booking page itself — UX hit)
- **Live Two-Paths card** on every master solution page renders `<p>Pricing finalizing</p>` — visible to users.

No `TBD`, `[placeholder]`, `[Telemedicine Partner — to be named]`, `$XXX`, `TODO`, `FIXME`, `Lorem` strings found in visitor-rendered copy on the marketing site. (Prior audit's `$XXX` in `consult.astro:144,151` and `Price: TBD` in cognitive/sleep have been resolved.)

**Stale schema data:** `about.astro:11` JSON-LD asserts "Protege tier is free for anyone" + "20-factor self-assessment" + "Free, forever — no card required" — contradicts hard-paywall state and 8-question count. Will leak into Google/AI-search results.

---

## 4. Stripe / checkout / shop links

- `/shop/biome-af` (gut) — **404**
- `/shop/armorvita` (hormones) — **404**
- `/shop/foundational` (weight) — no page; not separately tested live
- No `href="/cart"` references found.
- `solutions/erectile-dysfunction.astro` OTC button points to `/membership` instead of `/shop/*` — inconsistent but at least 200.

No `pages/shop/` directory exists. Every "buy now" path through gut/hormones/weight 404s on launch.

---

## 5. Image references

All 16 `src="/images/..."` references resolve to existing files. Two oversized images (>1MB) flagged as speed risks:
- `website/public/images/hero/main.jpg` — **2,054,413 B (2.0 MB)** — homepage above-the-fold hero
- `website/public/images/scenes/leadership-executive.jpg` — **2,194,283 B (2.1 MB)**

Several others 400–650 KB. Consider WebP + responsive `srcset` before launch.

---

## 6. Sitemap / robots / canonicals

- `website/public/robots.txt`: PASS — explicit AI crawler allowlist (GPTBot, ClaudeBot, PerplexityBot, etc.), sitemap URL correct.
- Spot-check on 5 solution pages (gut, hormones, ED, cognitive, sleep): all use the `SolutionPage` layout which provides `canonical`, `og:image`, and `description` (grep against raw `.astro` returns 0 because they're injected by the layout, not inline — confirmed via earlier audit). Live HTML verified.
- **Canonical inconsistency:** blog pages still emit `.html` canonicals + JSON-LD URLs (`blog/what-to-expect-first-month-glp1.astro:5,11,114,115`; `blog/semaglutide-vs-tirzepatide.astro:5,11,137`). Sitemap likely emits trailing-slash. (Prior audit flagged `terms.astro`/`contact.astro`/`links.astro`/`blog.astro` — re-grep needed to confirm fix.)
- `404.astro:27`, `referral.astro:223`, `contact.astro:134` link to `index.html#...` (broken `.html`).

---

## 7. Live-site smoke checks

| URL | Status |
|---|---|
| `https://www.my4mlife.com/` | **200** — "Begin with the end" present (4×) |
| `https://www.my4mlife.com/assessment` | 200 |
| `https://www.my4mlife.com/membership` | 200 |
| `https://www.my4mlife.com/consult` | 200 |
| `https://www.my4mlife.com/solutions/gut` | 200 — `id="solution"` Two Paths confirmed near top |
| `https://www.my4mlife.com/solutions/hormones` | 200 — Two Paths confirmed |
| `https://www.my4mlife.com/solutions/erectile-dysfunction` | 200 — Two Paths confirmed |
| `https://www.my4mlife.com/solutions/` | **404** |
| `https://www.my4mlife.com/shop/biome-af` | **404** |
| `https://www.my4mlife.com/shop/armorvita` | **404** |

---

## 8. App-side smoke check

- `https://app.my4mlife.com/` → 200
- `https://app.my4mlife.com/?reset=1` → 200
- App shell HTML does not include "free Protégé" string at server-render time (Svelte SPA — strings live in bundle).
- **However**, bundle source shows 5+ "free Protégé" / "Start free" / "no card required" strings (see §1a App). These will appear in the live UI once the SPA hydrates. **Audit FAIL against "hard-paywalled" rule.**

---

## 9. Brand-name consistency

**My4MLife wordmark:** PASS — only `My4MLife` (canonical) and `my4mlife` (lowercase domain) appear. No `My 4M Life`, `MY4MLIFE`, or `my4mLife` variations found.

**Product names:** PASS for all checked:
- `MitoVita` only — no `Mitovita` / `Mito Vita` / `MitoLift` variants.
- `Biome-AF` only (no `BiomeAF` / `Biome AF`).
- `ArmorVita`, `SleepRestore`, `NeuroBridge` — all consistent single-form.
- `NeuroSeal`, `GLOW Peptide` — not found in source; if these are still in plan deck, they haven't been written to the site yet.

**Note:** `solutions/erectile-dysfunction.astro:17` says "MitoVita (in development)" — public copy admits product isn't shipping. Acceptable if intentional; flag for TJ.

---

## 10. Mobile responsiveness

- `website/src/styles/global.css` — **0 `@media` queries** in this file alone (most breakpoints live in component `.astro` scoped `<style>` blocks).
- Across `website/src` (.astro + .css): **78 `@media` rules** total. Coverage looks broad.
- Spot-checked `grid-template-columns` definitions in components:
  - `MiniTwoPaths.astro:63` (`1fr 1fr`) → reflows to `1fr` at `max-width:560px` (line 100). PASS.
  - `TwoPathsCTA.astro` (inlined CSS in live HTML) → `1fr 1fr` reflows to `1fr` at `max-width:640px`. PASS.
  - `Footer.astro:90` (`2fr 1fr 1fr 1fr`) → reflows at line 180/183. PASS.
  - `Navbar.astro:369` (5-column mega-menu) → has 560 + smaller breakpoints (line 564). PASS.
  - `styles/article.css:529` (`1fr 1fr`) → reflows at line 717. PASS.

No obvious unguarded multi-column grids. Recommend a real device pass before launch (audit can only catch missing breakpoints, not visual quality).

---

## Sources / patterns grep'd

```
# Stale copy
grep -rnE "free Protégé|Protégé \(free\)|Protégé app free|Get the App — Free|Get the App - Free"
grep -rnE "20-question|21 question|22 question|20 question"
grep -rn "NeuroLift"
grep -rnE "35-65|35-60|40-60|men 35|men 40|ages 35|ages 40"
grep -rn "Dr. Mundheim"
grep -rnE "\btreat\b|\btreats\b|\btreating\b|\btreatment\b"

# Brand variations
grep -rhEo "[Mm]y[ -]?4[Mm][ -]?[Ll]ife"
grep -rhEo "Biome[- ]?AF|Sleep[- ]?Restore|Armor[- ]?Vita|Neuro[- ]?Bridge|Neuro[- ]?Seal|GLOW Peptide"
grep -rniE "mitovita|mito vita|mito-vita|mitolift"

# Links / placeholders / images
grep -rhoE 'href="/[^"#]*"' --include="*.astro"
grep -rnE 'href="/shop/|href="/cart'
grep -rnE "TBD|\[placeholder\]|Coming soon|to be named|\$XXX|TODO|FIXME|Lorem"
grep -rhoE 'src="/images/[^"]+"'

# Live
curl -sS -o /dev/null -w "%{http_code}" <urls>
curl -sS https://www.my4mlife.com/solutions/<slug> | grep 'id="solution"'

# Mobile
grep -rE "@media" --include="*.css" --include="*.astro"
grep -rnE "grid-template-columns"
```

---

## Findings summary

- **Top-10 blockers:** ranked above.
- **Total distinct findings:** ~30 file-level items across 10 sections.
- **Most severe:** "free Protégé" framing is still pervasive on both the marketing site (16 hits) AND the app shell (5+ hits) AND in the about-page JSON-LD schema. The hard-paywall pivot has been wired in the auth/purchase code path (`purchase.svelte.ts`) but copy was never updated. This is the single biggest brand-state mismatch before launch.
- **Carryover from 2026-05-07 audit:** `/shop/*` 404s, `.html` canonical leftovers (blog), broken `index.html#...` anchors in 404/referral/contact — all unresolved.
