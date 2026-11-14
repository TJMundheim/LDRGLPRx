# Plan: Uninsured Decade calculator soft gate (queue step 6)

## Context
/go/uninsured-decade is live and ungated. TJ (2026-10-03, re-confirmed 2026-11-14 "Build the calculator gate"): free inputs + headline number, then first name + email unlock the full breakdown and an emailed personalized PDF report, with an optional copy to the reader's financial advisor. Contact source `uninsured-decade-calculator` per the capture-every-contact rule. **Nothing goes live (no Lambda deploy, no website deploy) until TJ approves the email + PDF copy.**

## Decisions (orchestrator, from the rules on file)
- **Free:** The Bill card (headline). **Locked:** Premium + Spend-Down cards, chart, ledger, expected value, actions.
- **Gate form:** first name, email, optional "Send a copy to my financial advisor" email, optional unchecked "Email me occasional notes from Dr. TJ" (marketing consent only if ticked), honeypot `hp` + fill timer `t`.
- **Soft gate:** the page unlocks on any non-400 reply (200, bot-silent 200, 5xx). On 5xx/network error the page says the email couldn't be sent and offers Print. On 400 it shows the error and stays locked.
- **Server recomputes** every number from raw inputs with the shared math (`website/src/lib/uninsured-decade-math.ts`); the client never sends text that ends up in the email, so the route can't relay arbitrary content.
- **Advisor copy = CC on the same email** (requester visible on it; advisor address never stored, never logged, never written to Contact). Endorse-the-professional-partner rule on every line.
- **Contact:** identity + source + event only (`{type:'ud-calculator-report'}`), no age/state/net worth/spend. Logs: outcome codes only, never email/name.
- **Throttle:** add `POST /api/ud-calculator-report|2|5` to infra/api-throttling.sh.
- Gender-neutral copy; "Dr. TJ" only; identity/dignity tagline in email + PDF; no "coming soon".

## Shared interface (all tasks code to this)
`website/src/lib/uninsured-decade-report.ts`
```ts
export interface UdInputs { age: number; spouseAge?: number; stateAbbr: string; netWorthBand: NetWorthBand;
  monthlySpend: number; exerciseHours: number; rrrPct: number; now?: Date }
export interface UdReport { stateName: string; onsetYear: number; onsetDrivingAge: number; isCouple: boolean;
  bill: number; billWhy: string; stages: { stage1: number; stage2: number; stage3: number };
  ledger: { fullBasketTenYear: number; alreadySpendingTenYear: number; newMoneyTenYear: number }; premiumWhy: string;
  spendDownDisplay: string; spendDownWhy: string; hoursToAdd: number; atTarget: boolean; hoursNote: string;
  fullPremium: number; rrrPct: number; ev: { unmitigatedExpectedCost: number; mitigatedExpectedCost: number; expectedSavings: number; breaksEven: boolean };
  evVerdict: string /* the breaksEven / falls-short sentence, plain text */ }
export function buildReport(i: UdInputs): UdReport
export function money(n: number): string
```

## Tasks

### [P1] TEST: report builder matches today's page output  [parallel]
model: sonnet
Create `website/src/lib/uninsured-decade-report.test.ts` (vitest). Assert `buildReport` against values computed directly from the existing math functions (same calls the page's submit handler makes, lines 302–353 of uninsured-decade.astro): default inputs (62/60/TX/500k-1m/400/3/30), single (no spouse), age ≥ 70 (today's-dollars billWhy + spendDownWhy branches), onset exactly 1 year out ("1 year" singular), monthlySpend ≥ basket ("no new money required" premiumWhy), exercise at target (hoursNote "You’re already paying the hours…"), rrr 0 and 45, breaksEven true and false verdicts. Use `now` for deterministic years. Copy the page's why-strings verbatim (curly apostrophes).
✓ DONE WHEN: test file exists and `pnpm --filter website exec vitest run src/lib/uninsured-decade-report.test.ts` fails only because the module is missing

### [P2] IMPL: report builder + page uses it  [sequential after P1]
model: sonnet
Create `website/src/lib/uninsured-decade-report.ts` per the interface (pure, no DOM). Refactor the page's submit handler and `renderExpectedValue` to read from `buildReport` (behavior and text unchanged; no gate yet).
✓ DONE WHEN: `pnpm --filter website test` exits 0 and `pnpm --filter website build` exits 0

### [P2] TEST: ud-calculator-report Lambda  [parallel with P2 IMPL]
model: sonnet
Scaffold `lambdas/ud-calculator-report` from `lambdas/pullup-challenge-entry` (package.json name `@ldrglprx/ud-calculator-report`, deps + `pdf-lib`, tsconfig include `src` and the two website files it imports). Write `src/handler.test.ts` (mock email-sender invoke + Contact upsert): OPTIONS 204; bad JSON 400; honeypot/too-fast → 200 and nothing sent; each invalid field → 400 (age 45–85 int, spouseAge optional 45–85, unknown state, unknown band, spend 0–100000, exercise 0–40, rrr 0–50, firstName 1–40 chars, bad email, bad advisor email, advisor == own email); valid → one invoke `{kind:'info', from:'drtj', to:email, cc:advisor?, attachments:[{filename:'Uninsured-Decade-<First>.pdf', contentType:'application/pdf'}]}`, html/text contain the server-computed Bill; Contact upsert has source `uninsured-decade-calculator`, no financial fields, marketingConsent only when `emailOptIn`; advisor address never in Contact or console output; email failure → 502; contact failure still 200. Plus `src/pdf.test.ts`: PDF bytes start `%PDF`, page count 1–3.
✓ DONE WHEN: test files exist and fail only on missing implementation modules

### [P2] TEST: page gate static checks  [parallel]
model: sonnet
Add `website/tests/ud-calculator-gate.test.ts` (pattern: website/tests/pullup-challenge.test.ts, read source). Assert: gate form ids `ud-gate`, `ud-gate-first`, `ud-gate-email`, `ud-gate-advisor`, `ud-gate-optin` (unchecked), honeypot `hp`; locked region `ud-locked` hidden by default; POST to `/api/ud-calculator-report`; hero no longer says "No name, no email"; privacy page mentions the Uninsured Decade calculator; PostHog payloads never include email/firstName/advisor.
✓ DONE WHEN: test exists and fails only on the not-yet-built gate

### [P3] IMPL: Lambda + deploy script + throttle  [sequential after P2 TESTs + P2 IMPL]
model: sonnet
Implement modules (handler.ts < 100 lines; http.ts, validate.ts, pdf.ts with pdf-lib, email.ts compose + invoke, contact.ts via `@my4mlife/contact-upsert`). Email/PDF copy from `docs/launch/uninsured-decade/calculator-report-email-draft-2026-11-14.md` (P3 copy task). `infra/deploy.sh` (pattern: pullup deploy.sh, no table; IAM: Contact UpdateItem + invoke email-sender). Add throttle line. Add `pnpm preview` script writing sample PDF + email HTML to `docs/launch/uninsured-decade/preview/`. Do NOT deploy.
✓ DONE WHEN: `pnpm --filter @ldrglprx/ud-calculator-report test` and `typecheck` and `build` exit 0, preview files exist

### [P3] Draft email + PDF copy for TJ  [parallel, can start in P1]
model: sonnet
Write `docs/launch/uninsured-decade/calculator-report-email-draft-2026-11-14.md`: subject, email body (from Dr. TJ, short, gender-neutral, endorses advisor/attorney/CPA, one CTA to free MindSpan assessment `?src=ud-report-email`, tagline), advisor-CC framing line, PDF section order + fixed text (reuse page's honest-close paragraphs and disclaimers verbatim), gate-form copy (heading, button, fine print). Follow feedback_endorse_the_professional_partner + branding rules.
✓ DONE WHEN: file exists with all five sections

### [P3] IMPL: page gate UI + privacy line  [sequential after P2]
model: sonnet
In uninsured-decade.astro: wrap locked results in `#ud-locked` (hidden), add the gate form after The Bill card, new hero sub line, POST to `${API_BASE}/api/ud-calculator-report` with inputs + gate fields, soft-gate unlock rules above, remember unlock in sessionStorage (try/catch), "Email me the updated report" after unlock, PostHog `calc_gate_view` / `calc_unlock {src, advisor:boolean, optIn:boolean}`. Print stylesheet hides the gate. Add a privacy sentence for the calculator report.
✓ DONE WHEN: `pnpm --filter website test` and `build` exit 0

### [REVIEW] Code Review  [sequential — runs last]
model: opus
- [ ] typecheck/build pass (website + lambda)
- [ ] All tests green
- [ ] No unused imports or dead code introduced
- [ ] No secrets or env values committed; no PII in logs/PostHog
- [ ] Relay/abuse surface checked (server-only content, CC behavior, throttle)
- [ ] Commit message written (main only — no PR per project CLAUDE.md)
✓ DONE WHEN: all checklist items checked and fixes applied

## After review (orchestrator)
Browser-verify the gate on the dev server (desktop + mobile), commit + push, show TJ the email + PDF previews. **Deploy order once TJ approves copy:** lambda deploy.sh → api-throttling.sh → smoke (drtj+udsmoke@my4mlife.com, with and without advisor CC) → website deploy.sh.
