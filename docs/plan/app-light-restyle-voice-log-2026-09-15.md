# App restyle (light) + voice-first logging — 2026-09-15 (TJ approved)

## Decisions
- Light clinical theme replaces dark "Mission Control" ground (TJ: Surface laptop reads near-black; red-on-blue, blue-on-blue fail). Off-white page, white cards, near-black ink, navy for header/headlines, gold accent only. WCAG AA contrast on every pair.
- Voice-first "Tell Dr. TJ's AI" daily log: device speech-to-text (Web Speech API; text fallback) → Bedrock parse (Haiku) → structured preview → user CONFIRMS → existing recordAdherence/entries. Never saves without confirm.
- Cut typing: "Same as yesterday" one-tap; chips for numbers (sleep, walk minutes, protein g); nothing mandatory daily. Target <30 s/day, mid-workout.
- coach-proxy lambda migrated to Bedrock (rule: no direct Anthropic SDK). New `log-parse` lambda on Bedrock.
- No changes to data model, scoring math, week content, admin flows.

## Tracks (parallel, disjoint files)
A. tokens.css + app.css + component color audit (light theme)         — apps/clientportal styles + svelte color sweep
B. Voice log UI: VoiceLog.svelte + speech helper + chips + same-as-yesterday — apps/clientportal components (new files) + App.svelte wiring
C. log-parse lambda (Bedrock; JSON contract) + HTTP route + deploy.sh    — lambdas/log-parse
D. coach-proxy → Bedrock                                                  — lambdas/coach-proxy
Then: REVIEW (opus) → screenshots (Surface 1366×768 + phone 390×844) → TJ approval → deploy app + lambdas.

## log-parse contract
POST /api/log-parse {text, date, actions:[{id,label}], fields:[{id,label,unit,min,max}]} → {actions:{[id]:true|false|null}, fields:{[id]:number|null}, notes:string, unclear:[string]} (Bedrock Haiku, no PHI logged, 10s timeout).
