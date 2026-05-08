# Attorney Brief — 4M Life HIPAA Documents

**To:** Legal counsel
**From:** TJ Mundheim, Founder — 4M Life / Essential Management Group
**Date:** 2026-04-28
**Needed by:** ~1 week (unblocks lead-funnel build)

---

## Project Description

4M Life (my4mlife.com) is a digital health platform targeting men focused on brain healthspan and longevity. The platform combines:

- **Freemium mobile/web app** — workbook-driven program built around four monthly pillars (Mind, Muscle, Mitigate, Motivate)
- **AI concierge** — Claude-based (via AWS Bedrock) automated email and SMS communications that guide patients through intake, scheduling, and health coaching
- **Telemedicine** — contracted telemedicine practice for physician-supervised consults and Rx (GLP-1, TRT, peptides, brain-health Rx)
- **Supplements and proprietary formulas** — Biome-AF and three companion formulas; direct-to-consumer fulfillment
- **Contracted pharmacy and lab** — third-party compound pharmacy and diagnostic lab (vendors to be contracted)
- **Stripe-collected revenue** — consult fees, subscription tiers, supplement orders

The platform is operated by a solo founder (TJ Mundheim, DO) who also serves as the treating physician and will designate himself as Privacy Officer and Security Officer.

---

## Our Role Under HIPAA

4M Life acts as:

1. **Business Associate** of the contracted telemedicine practice, lab, and pharmacy — we process, store, and transmit PHI on their behalf through our platform infrastructure (DynamoDB, S3, AppSync/GraphQL API, Lambda functions).
2. **Covered Entity** in certain interactions — TJ Mundheim is a licensed physician providing direct patient care through the platform, which may make 4M Life a covered healthcare provider in its own right depending on how transactions are structured.
3. **Potentially Healthcare Clearinghouse** — if we route standard electronic health transactions (eligibility, claims) between the telemedicine practice and payers, this role may apply. Please advise.

---

## Documents Requested

### 1. Notice of Privacy Practices (NPP)
Patient-facing. Posted publicly and acknowledged (with timestamp) at signup. Should cover: how PHI is used and disclosed; patient rights (access, amendment, restriction, accounting); AI-assisted communications; data retention; how to contact the Privacy Officer.

### 2. Patient Authorization to Share PHI
Bidirectional authorization for 4M Life to share the patient's PHI with contracted care team members: telemedicine practice, compound pharmacy, diagnostic lab. Should be generic enough to cover vendors not yet named (use "contracted care team" or similar). Acknowledged at signup with timestamp.

### 3. AI / Automated Communication Consent
Patient consents to receive automated and AI-drafted email and SMS communications regarding their care (appointment reminders, intake follow-ups, health coaching). Must be compliant with both HIPAA and TCPA. Note: per our architecture, SMS bodies contain no PHI — only generic "log in to see your update" notices; PHI is delivered inside the authenticated app.

### 4. Marketing-Use Authorization (separate, optional)
Patient may opt in, separately from required consents, to allow use of their de-identified aggregate data for marketing and research purposes. Must make clear this is voluntary and does not affect care.

### 5. Business Associate Agreement (BAA) Template
Standard BAA template for use with downstream vendors not yet contracted (telemedicine practice, lab, pharmacy). Should be compatible with our AWS infrastructure context (DynamoDB encrypted at rest, CloudTrail audit logging, Cognito-based access control).

### 6. Workforce HIPAA Compliance Policy
One-page policy for TJ now; designed to scale to future hires. Should cover: minimum necessary standard, breach notification obligations, device/access management, sanctions for violations, training requirements.

---

## Operational Context (for drafting)

- **AI infrastructure:** Claude models accessed exclusively via AWS Bedrock. AWS BAA covers Bedrock-routed Claude calls. No direct Anthropic API usage in any production path.
- **SMS constraint:** No PHI transmitted in SMS bodies. SMS is limited to generic login-prompt notices ("You have an update — log in at https://app.my4mlife.com"). All PHI lives behind Cognito authentication.
- **Data storage:** AWS DynamoDB (encrypted at rest, point-in-time recovery), S3 (encrypted), Cognito (user management). All HIPAA-eligible under the AWS BAA.
- **Audit logging:** AWS CloudTrail enabled org-wide.
- **Access control:** Cognito user pools + AppSync authorization. Role-based: patient, admin (TJ), future care team.
- **Privacy + Security Officer:** TJ Mundheim, DO.
- **Compliance maturity:** DIY until MRR > $10K, then Vanta/Drata. Documents must be substantive and defensible, not just checkbox templates.

---

## Delivery

Please deliver all six documents as signed PDFs to `docs/legal/` in our project repository, or email to drtj@essentialmanage.com. Questions: same email.
