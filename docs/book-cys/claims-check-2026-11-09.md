# Claims check: Count Yourself Skinny draft (docs/book-cys/draft/_MASTER.md)

Checked 2026-11-09. Read-only. No emails sent. No branches, commits or other files changed.

HTTP checks: `curl -s -o /dev/null -L -w "%{http_code}"` on 2026-11-09.

| # | Book line | Claim | Verdict | Evidence | Evidence date |
|---|-----------|-------|---------|----------|---------------|
| 1 | 10 | "the free ... program ... at my4mlife.com" | TRUE | Free signup: `website/src/pages/protege-signup.astro:5` ("No purchase required"). https://my4mlife.com = HTTP 200, https://my4mlife.com/protege-signup = HTTP 200. | 2026-11-09 |
| 2 | 10 | "12-week program" | TRUE, with caveat | App is built as a 12-week program: `apps/clientportal/src/lib/program.ts` (per `docs/HANDOFF.md:580`, capped at week 12). TJ directed "program 12 weeks" in `docs/HANDOFF.md:78` (2026-11-04). Open question still listed in `docs/HANDOFF.md:79` ("12 weeks vs four months"), so TJ has not closed it. | 2026-11-04 |
| 3 | 10 | "app" | TRUE | https://app.my4mlife.com = HTTP 200. Admin/member app in `apps/clientportal` (`docs/HANDOFF.md:580`, `:692`). | 2026-11-09 |
| 4 | 10 | "weekly live calls" | UNKNOWN | Nothing in the repo shows a call is being held now. `docs/HANDOFF.md:79` (2026-11-04): "no fixed day/time anywhere ... scheduled based on demand"; the Monday recurring meeting job still exists in `lambdas/ops-agent/infra/deploy.sh:119`, and recordings are manual. `docs/HANDOFF.md:90` (2026-10-30): "Events table is empty". `docs/HANDOFF.md:64` (2026-10-23): "leave ops-agent off until weekly Zooms run", i.e. not running. `docs/HANDOFF.md:501`: weekly Zoom run was starved and failed until a Zoom account exists. Live Events data sits in AWS and is not in the repo, so this cannot be settled from the repo. | 2026-11-04 (latest); 2026-10-30; 2026-10-23 |
| 5 | 305 (Ch 13) | "free program" | TRUE | Same as row 1. `website/src/pages/protege-signup.astro:5`; `docs/HANDOFF.md:1126` ("App + weekly Zooms free for all Protégés"). | 2026-11-09 |
| 6 | 305 (Ch 13) | "companion app" | TRUE | Same as row 3. https://app.my4mlife.com = HTTP 200. | 2026-11-09 |
| 7 | 305 (Ch 13) | "live weekly calls" | UNKNOWN | Same evidence as row 4. The site copy still promises "Weekly support Zooms" (`website/src/pages/protege-signup.astro:43`, `website/src/pages/welcome-protege.astro:42`), but `docs/HANDOFF.md:79` (2026-11-04) removed any fixed weekly schedule. Nothing shows a call held now. | 2026-11-04 |
| 8 | 305 (Ch 13) | "step-by-step twelve-week voyage" | TRUE, with caveat | Same as row 2. | 2026-11-04 |
| 9 | 309, 27 | https://my4mlife.com/assessment | TRUE | HTTP 200 (`curl -L`). Assessment is the Protégé signup per `docs/HANDOFF.md:658`. | 2026-11-09 |
| 10 | 27 | https://my4mlife.com | TRUE | HTTP 200. | 2026-11-09 |
| 11 | 877 | https://my4mlife.com/assessment (link text "my4mlife.com/assessment") | TRUE | HTTP 200. | 2026-11-09 |
| 12 | 1059 | "the free program built around it" at my4mlife.com | TRUE | Free program: `website/src/pages/protege-signup.astro:5`; https://my4mlife.com HTTP 200. | 2026-11-09 |
| 13 | 41, 995 | support@my4mlife.com | TRUE | Inbound routing confirmed: `docs/HANDOFF.md:500` (2026-09-03: "support@ CONFIRMED WORKING", MX to Google Workspace, reached drtj@). Site uses it: `website/src/pages/contact.astro:37`, `website/src/pages/welcome-protege.astro:52`. Not sent to. | 2026-09-03 |

## Other URLs and emails in the book

- URLs printed in `_MASTER.md`: only https://my4mlife.com and https://my4mlife.com/assessment (lines 27, 309, 877, 1059). Both HTTP 200.
- Email addresses printed: only support@my4mlife.com (lines 41, 995). See row 13.

## Summary

- FALSE: none found.
- UNKNOWN: "live weekly calls" (lines 10 and 305). The repo shows no weekly schedule (2026-11-04) and no evidence of any call currently held. Only AWS Events data could settle it.
- Open caveat, not a verdict change: the "12-week" program length is still an open TJ decision (`docs/HANDOFF.md:79`).
