# Telemed-Partner Handoff Specification

**Date:** 2026-05-13
**Status:** Draft for partner review
**Owner:** Dr. TJ (chairman); engineering to operationalize.

---

## Purpose

Define exactly what data My4MLife forwards to the contracted licensed telemedicine partner when a member purchases a consult or an Rx product. This document is the **contract for what the partner receives, in what format, and when** — so they can deliver a clean clinical experience and we can deliver a clean handoff.

This is intentionally a launch-grade spec (lowest-effort, highest-reliability). API integration can come later when volume justifies it.

---

## The handoff is triggered by

1. Patient purchases a **Comprehensive 4M Consult** SKU → full intake handoff fires immediately.
2. Patient purchases an **Insider+ tier subscription** that includes 1:1 consult time → handoff fires on first consult booking.
3. Patient already on the platform requests a **prescription refill / protocol adjustment** through their account → lightweight handoff (existing context + delta).

---

## What we send (intake payload)

A single structured payload per handoff. JSON over email-to-EMR for v1 (simple, auditable). Migrate to API call when partner can accept.

```json
{
  "handoff_id": "ho_2026-05-13_abc123",
  "handoff_timestamp": "2026-05-13T15:30:00Z",
  "trigger": "consult_purchase",
  "my4mlife_member_id": "u_xyz789",
  "patient": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+1-555-555-5555",
    "date_of_birth": "1968-03-15",
    "biological_sex": "male",
    "state_of_residence": "TX",
    "preferred_contact_method": "email",
    "consents": {
      "telemed_partner_data_sharing": {
        "consented": true,
        "consented_at": "2026-05-13T15:28:00Z",
        "version": "consent-telemed-v1"
      },
      "ai_communications": {
        "consented": true,
        "consented_at": "2026-05-13T15:28:00Z",
        "version": "consent-ai-v1"
      }
    }
  },
  "audit_results": {
    "completed_at": "2026-05-13T14:42:00Z",
    "scores": {
      "gut-microbiome": 8,
      "sleep": 6,
      "weight-body-fat": 4,
      "nutrition": 6,
      "erectile-dysfunction": 8,
      "environment": 4,
      "cognitive": 6,
      "hormone-balance": 8
    },
    "top_3_priorities": [
      { "category": "gut-microbiome", "score": 8 },
      { "category": "erectile-dysfunction", "score": 8 },
      { "category": "hormone-balance", "score": 8 }
    ]
  },
  "demographic_extras": {
    "height_inches": 70,
    "weight_lbs": 195,
    "bmi": 27.9,
    "primary_concerns_free_text": "Energy off for 18 months, libido down, sleep mediocre. Wife worried."
  },
  "purchase": {
    "stripe_session_id": "cs_test_xyz",
    "sku_id": "comprehensive-consult",
    "amount_usd": 99.00,
    "paid_at": "2026-05-13T15:29:00Z"
  },
  "preferred_consult_window": {
    "earliest_date": "2026-05-15",
    "preferred_times": ["evening", "early_morning"],
    "timezone": "America/Chicago"
  }
}
```

---

## What we DO NOT send

- **Credit card numbers / Stripe customer IDs.** Stripe is the system of record; partner doesn't need it.
- **Audit free-text fields beyond `primary_concerns_free_text`** (no PHI fishing).
- **Behavioral analytics data** (PostHog, app usage) — not relevant to the clinical decision.
- **Marketing source / UTM data** — not clinically relevant; stays on our side.

---

## What the partner sends back

Two return signals we need to capture:

### 1. Consult scheduled confirmation

```json
{
  "handoff_id": "ho_2026-05-13_abc123",
  "consult_id": "partner_consult_456",
  "scheduled_at": "2026-05-15T18:00:00Z",
  "provider_name": "Dr. Jane Smith, MD",
  "video_link_url": "https://partner.com/consult/xyz",
  "icalendar_url": "https://partner.com/ics/xyz.ics"
}
```

We forward this to the patient as: "Your consult is booked for X with Dr. Y. Add to calendar: [link]. Join the visit here: [link]." Patient experience stays inside the My4MLife email channel; partner provides the URLs.

### 2. Post-consult outcome

```json
{
  "consult_id": "partner_consult_456",
  "completed_at": "2026-05-15T18:45:00Z",
  "outcomes": {
    "prescriptions_issued": [
      {
        "drug_name": "Testosterone Cypionate 200mg/mL",
        "directions": "0.5mL IM weekly",
        "quantity": "5mL vial",
        "refills": 5,
        "pharmacy_sent_to": "MD Specialty Group"
      }
    ],
    "labs_ordered": [
      { "panel_name": "Comprehensive Men's Hormone", "lab_provider": "Quest" }
    ],
    "follow_up_recommended_weeks": 8,
    "protocol_notes_for_member": "Encouraged the protein-first rule and SleepRestore stack alongside TRT initiation. Discussed alcohol reduction."
  }
}
```

We use this to:
- Trigger the post-consult email sequence to the member
- Surface the protocol summary inside the My4MLife App (Protégé tier dashboard)
- Trigger pharmacy fulfillment from our side (if we are paying the pharmacy — recommended model)

---

## Handoff mechanisms (in order of effort)

### v0 (launch — operational this week)
- **Structured email** to a single intake address at the partner's domain (e.g., `intake@partnerdomain.com`)
- Payload in email body as plain JSON for the partner's intake coordinator to copy-paste
- AND a CC to a shared Google Drive folder for redundancy / audit trail
- Partner replies-all when consult is scheduled; we manually update patient

### v1 (low-volume launch — month 2)
- **Shared Slack or Microsoft Teams channel** between us + partner
- Posts via webhook; partner sees real-time
- Reactions/emoji as ack ("📅" = scheduled, "✅" = consult complete)

### v2 (real volume — month 3-6)
- **Direct API integration** with partner's EMR/scheduling system
- Webhooks both directions
- HMAC-signed payloads for security
- Auto-retry on failure

---

## Compliance + data-handling notes

- **My4MLife is NOT the medical provider.** Partner is the licensed prescriber-of-record. Their EMR is the system of record for clinical data.
- **PHI custody:** Once data crosses to partner, they own the medical record. We retain only the handoff acknowledgment + the outcome summary for our member-facing dashboard.
- **Patient consent:** Captured at sign-up (`telemed_partner_data_sharing` consent). Must be granted before any handoff fires.
- **Audit trail:** Every handoff has a unique `handoff_id`, timestamp, payload size. Logged in DynamoDB on our side for 7-year retention.
- **Encryption:** All emails / API calls over TLS 1.2+. Payloads at rest encrypted via AWS KMS.

---

## What we need from the partner to operationalize

This is the punch list for TJ's next conversation with the partner:

1. **Intake email address** for v0 handoff
2. **Confirmation of receiving format** — JSON in email body OK? Or CSV? Or a partner intake form URL we redirect the patient to?
3. **State licensure list** — the 34 states they currently cover (also needed for state-gating elsewhere)
4. **Per-consult fee structure** — flat fee per consult? Revenue share? What % goes to provider, what % to us?
5. **Lab markup arrangement** — do they handle labs (Quest/Labcorp through them) or do we contract direct?
6. **Brand language** — does the post-consult email come from "Dr. X via My4MLife" or "Dr. X" alone?
7. **SLA on consult availability** — once patient pays, expected booking window? 48 hrs? 7 days?
8. **No-show / cancellation policy** — who eats the cost?
9. **Refund authority** — if member cancels post-consult, can we refund, or do they hold us liable for the time slot?
10. **API roadmap** — do they have an EMR API, and when can we get docs?

---

## Open questions for legal / TJ

- **Does the partner BAA cover My4MLife as a Business Associate?** If not, we're handling consent + audit data outside HIPAA — fine for our scope, but the partner may have stricter requirements on data we forward.
- **Do we need a Data Processing Agreement (DPA)** between My4MLife and partner separate from the BAA?
- **Insurance coverage** — does our E&O policy cover us for "data forwarding errors" (we sent wrong patient info)? This is real risk to insure against once we have volume.

---

## Implementation status

- [x] Specification drafted (this document)
- [ ] Partner intake address received
- [ ] First test handoff dry-run with partner intake coordinator
- [ ] Lambda `consult-handoff` deployed (triggered by Stripe webhook on consult purchase)
- [ ] Email sequence for member ("Your consult is being scheduled" → "Booked for X" → "Join your visit")
- [ ] Post-consult outcome capture Lambda
- [ ] Protocol summary surface in app's Protégé dashboard
