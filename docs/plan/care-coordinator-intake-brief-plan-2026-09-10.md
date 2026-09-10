# Care-coordinator intake → pre-call brief → plan-of-action email (2026-09-10)

TJ directive: "back to basics" — proper intake for an interested prospect, proper care-coordinator visit, proper
direction afterwards, delivered automatically. First user: Brian Schumacher (call Wed 2026-09-16).

## Flow
1. /consult = 5-step Care Coordinator Intake (identity · why now/curiosity/refusals/budget · health history ·
   lifestyle · review + single consent). No card. POSTs to contact-form (lead email + confirmation) and
   patient-record-intake (category `care-coordinator`).
2. patient-record-intake → invokes `my4mlife-coordinator-brief` → gathers PatientRecords record+encounter +
   Contact (MindSpan intakeAnswers/auditTop3) → Bedrock Haiku (JSON contract) → stores `brief#<encounterId>` →
   emails TJ "[Pre-call brief] <name> — <top lane> — call <bestTime>".
3. Admin → Patients → encounter: Pre-call brief panel (Generate/Regenerate) + Plan of action panel
   (coordinator notes → Draft with AI → edit → Send to patient). `my4mlife-plan-of-action` lambda:
   draft → `plan#<id>` state draft; send → link allowlist (my4mlife.com only) + required disclaimer → email-sender
   'info' from info@ → state sent + audit + TJ copy.

## Contracts
Brief JSON {summary, why_now, assessment_readout[], red_flags[], recommended_lanes[{lane,rationale,visit_type,price}],
questions_to_ask[], suggested_plan_outline[]}. Plan JSON {subject, greeting, summary_of_call, plan_steps[{step,why,link}],
next_step_cta{label,url}, disclaimer}. AppSync: BriefAdmin, PlanAdmin, PatientRecordAdmin.briefs/plans,
generateCoordinatorBriefAdmin / draftPlanOfActionAdmin / sendPlanOfActionAdmin (Admins).

## Deploy order
coordinator-brief → plan-of-action → patient-record-intake (all infra/deploy.sh) → infra/clientportal/deploy.sh (CDK)
→ apps/clientportal/deploy.sh → website/deploy.sh. Verify: synthetic intake for drtj+intaketest@ → brief email → draft+send.

## Out of scope
HIPAA consent gating changes, scheduling, SMS.
