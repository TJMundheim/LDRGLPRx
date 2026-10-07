# Contact table audit — every email entry point (2026-10-07)

Queue step 1 (HANDOFF START HERE). Read-only audit; nothing changed. Feeds step 2 (shared contact-upsert helper).

## Writers of Contact today (8)
| Entry point | Funnel | Writes | Gaps |
|---|---|---|---|
| lambdas/lead-capture/src/handler.ts:70-86 | EmailCapture.astro (footer, weekly-picks) | newsletter=true, newsletterSource (OVERWRITTEN), newsletterAt/email/firstName/lifecycleStage='lead'/createdAt (if_not_exists) | no phone/firstSeenAt/tags/events; boolean newsletter, no marketingConsent |
| lambdas/audit-complete/src/handler.ts:437-461 | MindSpan assessment | overwrites auditCompletedAt, intakeAnswers, auditTop3, consent (JSON STRING), consentedAt, aiCommsConsent, protegeConsent; if_not_exists lifecycleStage='protege', email, firstName, phone | intakeAnswers = screening scores in the marketing list (borderline PHI); not additive on retake; ?src= dropped; new contacts land as 'protege' so nurture-worker (only 'lead') skips them |
| lambdas/protege-signup/src/handler.ts:299-323 | protege-signup / become-protege / app-access purchase | OVERWRITES email, firstName, phone, consent (MAP); lifecycleStage/createdAt if_not_exists | app-access path sends placeholder phone +10000000000 (order-handler-core:326) → can clobber a real phone |
| lambdas/_shared/order-handler-core/src/process-event.ts:157-164 | every Stripe purchase | lastPurchaseAt, lifetimeValueUSD +=, hasUsedFirstPurchaseDiscount | NO email/name/phone/createdAt/lifecycle → purchase-first buyers are stub rows invisible to byEmail; stripeCustomerId never written (byStripeCustomer GSI empty); no SKU/purchase list; never promoted to 'customer' |
| lambdas/_shared/subscription-handler-core/src/process-event.ts:53-70 | Stripe subscriptions | hasActiveSubscription, currentPeriodEnd, subscriptionStartedAt | same stub-row problem |
| lambdas/_shared/refund-dispute-handler-core/src/process-event.ts:92-103 | refunds/disputes | lifecycleStage='banned', isBanned | ok |
| lambdas/create-checkout-session/src/handler.ts:66-77,162 | cart, product pages, /go/* | isDemo only (when client sends contactId) | client-supplied contactId can create orphan rows; push-patch sends no email (Stripe collects) |
| lambdas/nurture-worker/src/handler.ts:58-63 | SQS from audit-complete | nurtureStage{N}Sent | needs email/phone that stub rows lack |

## Take an email, write NOTHING to Contact
- /consult + /rx/*/questionnaire → /api/contact-form (email-sender relay) + /api/patient-record-intake (PatientRecords only; Stripe customer in PatientRecords.cardOnFile). Highest-intent leads never reach Contact.
- lambdas/push-patch-intake (PatientRecords + Touchpoints only).
- /api/send-app-link (infra/clientportal/cdk/lambdas/lead-capture/send-app-link.ts).
- /api/request-otp + Cognito post-confirmation/post-authentication (Users table only).
- lambdas/inbound-handler (reads byEmail; unknown senders → 'prospect#<email>' in Conversations).
- /contact, /referral (relay only); consent.astro (no fetch).
- FAKE forms: blog handleNewsletter (~10 pages) and bmi-calculator submitEmail show "Subscribed!" and discard the email.
- front-door-chat (redacts emails). /go/uninsured-decade (no email; ?src= dropped at /assessment). CYS iOS (no network).
- Abandoned checkouts: no checkout.session.expired rule (infra/eventbridge/deploy-stripe-rules.sh:61 = completed only). DANGER: stripe-events-retry routes every checkout.session.* to the order handler, which does not check the event type → adding an expired rule as-is would record fake purchases + LTV.

## Helpers / schema
- lambdas/_shared/contact-id: deriveContactId(email) (uuidv5, ns f0e1d2c3-b4a5-4968-87a6-95c4d3e2f1a0), resolveContactId. protege-signup, audit-complete, lead-capture re-declare the namespace inline.
- No shared upsert helper; every writer hand-rolls its UpdateExpression.
- Table: CONTACT_TABLE env (default 'Contact'); order-handler-core + subscription-handler-core hardcode 'Contact'. Provisioned by infra/provision-contact-tables.sh / infra/dynamodb/deploy.sh; stream NEW_AND_OLD_IMAGES.
- Inferred attributes: contactId, lifecycleStage, email, firstName, phone, createdAt, updatedAt, newsletter*, consent (map OR string), consentedAt, aiCommsConsent, protegeConsent, auditCompletedAt, intakeAnswers, auditTop3, nurture*, lastPurchaseAt, lifetimeValueUSD, hasUsedFirstPurchaseDiscount, hasActiveSubscription, currentPeriodEnd, subscriptionStartedAt, isDemo, isBanned.
- Never written: marketingConsent, tags, firstSeenAt, events/purchases, source, stripeCustomerId.

## Implications for step 2 (helper design)
1. One upsert in lambdas/_shared/contact-upsert: identity fields if_not_exists (fill blanks, never clobber; ignore placeholder phones), source → firstSource (if_not_exists) + sources set (ADD), events list_append, tags ADD, LTV ADD, stripeCustomerId if_not_exists, marketingConsent only upgraded by an explicit opt-in/opt-out with {status, at, source}.
2. Event-type guard in order-handler before any expired-checkout rule.
3. Decide with TJ: move intakeAnswers out of Contact (PHI line), and new-assessment lifecycle 'lead' vs 'protege' (nurture skip).
4. Wire: order-handler-core, subscription core, consult intake, push-patch-intake (email+name only), send-app-link, Cognito post-confirmation, lead-capture, protege-signup, audit-complete, fake newsletter/BMI forms → lead-capture.
