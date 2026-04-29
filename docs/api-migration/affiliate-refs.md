# Nutrition Affiliate Sources — Repository Scan

## Summary
Scanned repo (current tree + git history) for nutrition affiliate references TJ recalls. Found **4 active affiliate/supplier references** in current codebase, all in `/apps/clientportal/src/lib/content/factors.ts`. No historical references in git; no matches in website_legacy/.

## Current References

### Factor 07: Poor Nutrition Quality (Keto-Paleo)
**File:** `apps/clientportal/src/lib/content/factors.ts:159-166`

**Resource links:**
- **ButcherBox** — grass-fed beef & wild salmon — `https://butcherbox.com`
- **US Wellness Meats** — organ meats & game — `https://uswellnessmeats.com`
- **Force of Nature** — ancestral blend — `https://forceofnaturemeats.com`
- **Vital Choice** — wild-caught seafood — `https://vitalchoice.com`
- **Ancestral Supplements** — organ capsules — `https://ancestralsupplements.com`

**Context:** Mentioned in "adv" (advanced) tab and resources section of nutrition factor; also referenced in tools section as grass-fed supplier sources.

## Affiliate Products (Vielight, Dexcom)
**File:** `apps/clientportal/src/lib/content/products.ts:1110+`

Two service/affiliate products tagged with `affiliate`:
- **Vielight** (PBM device) — photobiomodulation device, affiliate pricing $1749
- **Stelo/Dexcom** (CGM) — continuous glucose monitor, affiliate pricing $99

These are marked as affiliate-only with no inventory held.

## Search Results Summary
**Terms searched (case-insensitive):**
- Thrive Market / ThriveMarket — **no matches**
- ButcherBox — **4 matches**
- US Wellness Meats — **4 matches**
- Vital Choice — **2 matches**
- Primal Kitchen — **no matches**
- Crowd Cow — **no matches**
- Omaha Steaks — **no matches**
- General "affiliate" — **6 matches** (4 in products.ts, 2 text references)

**website_legacy/:** No nutrition affiliate references found.

## Recommendations
- ButcherBox, US Wellness Meats, Vital Choice are already live in factor 07
- Consider adding commission/affiliate relationship status to products.ts comments if these become formal partnerships
- No evidence of Thrive Market, Primal Kitchen, Crowd Cow, or Omaha Steaks in current or historical codebase
