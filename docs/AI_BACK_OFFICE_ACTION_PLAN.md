# AI-Run Back Office — Action Plan (MedVi-style operations)

**Goal (TJ):** at launch and scale, run *every administrative process and workflow* with AI, the way MedVi does $1B+ with effectively two humans. Model their **operating back end**, not their cheap-GLP-1 marketing.

---

## The principle
MedVi's lean headcount works because they drew a hard line: **AI orchestrates and executes the entire operational pipeline; humans only do the two things software legally/practically can't.** Translate that to My4MLife as one rule:

> **AI runs the workflow end to end. A human appears only as (1) the licensed clinician who signs the prescription, and (2) an exception-handler who clears whatever the AI flags as out-of-policy.** Everything between those two points is automated.

Be honest about the irreducible human steps — designing around them is what keeps you lean:
- **Clinical sign-off** — a licensed prescriber must review and write each Rx. This is the telemedicine partner's job, not yours. AI preps the perfect packet; the physician decides.
- **Safety escalations** — adverse events / red-flag symptoms route to a clinician immediately (your `coach/prompts.ts` already encodes the escalation list).
- **A thin exception queue** — TJ (or one ops person) clears edge cases the AI is <X% confident on. The `approval-queue` Lambda is already this inbox.

Everything else — intake, eligibility, data packaging, physician routing, scheduling, payment capture, pharmacy ordering, shipping/tracking, renewals, dunning, support, retention, reporting — is AI.

---

## The pipeline (who does what)
| Stage | AI does | Human |
|---|---|---|
| **Intake** | Questionnaire + structured capture (already live) | — |
| **Eligibility screen** | Rules + LLM read of intake → eligible / needs-info / decline-with-reason | exception only |
| **Data packaging** | Assemble the clinical packet (intake, BMI, meds, allergies, ID) in the partner's required format | — |
| **Physician routing** | Match patient → right network physician by state license + specialty + load | — |
| **Scheduling** | Offer slots, book, send DocuSign (NPP/auth), reminders | — |
| **Clinical decision** | Pre-draft the likely protocol for the physician to approve/edit | **physician signs** |
| **Payment** | Capture card at intake (done), charge the approved protocol price on sign-off | exception (disputes) |
| **Fulfillment** | Fire the order to the compounding/retail pharmacy, track shipment, notify patient | — |
| **Renewals / subscription** | Auto-renew, monitoring-lab reminders at month 3/6, refill cadence | — |
| **Dunning** | Retry failed cards, dunning emails, pause/cancel via customer portal | exception |
| **Support** | AI concierge (`inbound-handler`) handles inbound; escalates clinical/safety to a human | clinical/safety only |
| **Retention** | Nurture sequences, check-in cadence, win-back (`nurture-worker`, `coach`) | — |
| **Reporting** | Daily digest, funnel metrics, cohort health (`daily-digest`, + analytics) | reads it |

---

## Architecture on the My4MLife stack (you're closer than you think)
You already have the skeleton — the job is to connect and supervise it, not build from scratch:
- **Orchestration:** an AWS Step Functions state machine per patient = the "operating system." Each pipeline stage is a Lambda; the machine moves a patient stage→stage, retries, and routes failures to the queue.
- **The brain:** AWS Bedrock (HIPAA-covered per your locked architecture) runs the LLM steps — eligibility reads, packet assembly, support replies, routing logic, exception triage.
- **Existing Lambdas to wire in:** `ops-agent` (the AI operator), `approval-queue` (human exception inbox), `inbound-handler` (concierge — deployed), `subscription-handler`, `order-handler`, `reminder-dispatcher`, `nurture-worker`, `refund-dispute-handler`, `customer-portal-session`, `zoom-ops`.
- **The human surface:** the admin app's approval queue — every AI action above a risk threshold lands there with a one-click approve/edit/reject, so one person supervises hundreds of automated actions. **Confidence-gated autonomy:** high-confidence routine actions auto-execute; low-confidence or high-stakes ones wait for a tap. As trust grows, raise the auto-execute threshold.

---

## Phased rollout (crawl → walk → run)
**Phase 0 — now (manual-with-AI-draft):** AI drafts everything (eligibility note, packet, support reply, charge); TJ approves each from the queue. You're learning the exception patterns. *This is where you are — the Rx-email-to-TJ is literally Phase 0.*

**Phase 1 — semi-auto:** the high-volume, low-risk stages auto-execute (scheduling, reminders, payment capture, shipping notifications, tier-1 support, dunning, reporting). Clinical sign-off + flagged exceptions stay human. Build the Step Functions machine + wire the existing Lambdas. Stripe webhooks → subscription lifecycle automation (your `stripe-eventbridge` plan).

**Phase 2 — AI-operated:** the LLM ops-agent runs the whole pipeline; the physician signs scripts via partner API; the exception queue is the only human ops touchpoint. Target MedVi's ratio. The enterprise telemedicine partner's API is the unlock — it replaces "email TJ" with a real intake→Rx→pharmacy data pipe.

---

## What to build first (next 3–5 moves)
1. **Replace "email TJ" with a `Contact`/`Order` record + state machine entry** for every Rx submission — so leads are tracked and auto-advanceable, not stuck in an inbox. (You flagged this; it's the foundation.)
2. **Stand up the Step Functions pipeline** with the existing Lambdas as stages; start with scheduling + payment + fulfillment + reminders auto-executing.
3. **Turn the `approval-queue` into the real supervisory inbox** with confidence scores + one-click actions, and route every AI decision through it.
4. **Sign the enterprise telemedicine partner and integrate their API** (eligibility → packet → physician sign-off → pharmacy). This is the single highest-leverage dependency for going from Phase 0 → Phase 2.
5. **Turn on analytics + reporting** so the AI (and you) can see funnel + cohort health and the ops-agent can act on it.

**Bottom line:** the only humans in the steady state are a licensed prescriber (the partner's) and one supervisor clearing the exception queue. Everything administrative is AI — and you already own most of the Lambda scaffolding to get there. The gating dependency is the enterprise telemedicine partner's API; the gating internal build is the Step Functions pipeline + the supervisory queue.
