# Push Patch async visit: deploy runbook (2026-10-02)

Deploys everything built in commits `8c816423` through `5dcc97c8`, plus the review fixes from 2026-10-02 (email-sender public-route lockdown and the reminder email's refund wording). Run it on `main` from the primary checkout `/Users/thomasmundheim/Development/LDRGLPRx`. Use the AWS account `879696522760`, region `us-east-2`. The HTTP API is `v9svm8ds74`.

Rules:
- Every step is a repo script (IaC). Do not use the console.
- Run the steps in order. Stop at the first failure.
- **Do not deploy order-handler on its own.** Once it is live, it stops emailing the order at payment.

```bash
REPO=/Users/thomasmundheim/Development/LDRGLPRx
API=https://v9svm8ds74.execute-api.us-east-2.amazonaws.com
```

---

## 0. Preflight (no side effects)

```bash
cd $REPO && git status --short && git log --oneline -1          # clean main, review fixes committed
aws sts get-caller-identity --query Account --output text          # 879696522760
aws configure get region                                           # us-east-2 (CDK reads it)
pnpm install --frozen-lockfile                                     # root workspace

# Tests (all must pass; apps/clientportal has 7 known pre-existing env failures in
# client.test.ts / triggers.test.ts / AuthGate.test.ts, and none in admin/*)
for p in lambdas/create-checkout-session lambdas/push-patch-intake lambdas/push-patch-decision \
         lambdas/push-patch-reminder lambdas/refund-encounter-admin lambdas/_shared/encounter-refund \
         lambdas/_shared/order-handler-core lambdas/stripe-events-retry lambdas/email-sender \
         lambdas/export-clinical-packet lambdas/approval-queue; do (cd $REPO/$p && pnpm test) || break; done
(cd $REPO/apps/clientportal && pnpm test -- src/lib/components/admin src/lib/api/operations.test.ts)
(cd $REPO/infra/clientportal/cdk && pnpm install --ignore-workspace --frozen-lockfile && pnpm test)

# Website must build before anything goes live
(cd $REPO/website && pnpm build)

# AppSync diff: expect ONLY RefundEncounterDS (+ role/policy), RefundEncounterAdminResolver,
# the schema, and the GetPatientRecordAdminResolver code. Stop if anything else shows.
# (No `pnpm build` here: cdk.json runs bin/clientportal.ts via ts-node --prefer-ts-exts, and tsc would
#  rewrite the stale tracked lib/*.js files for nothing.)
(cd $REPO/infra/clientportal/cdk && npx cdk diff ApiStack)
```

---

## 1. Deploy, in this order

```bash
# 1. email-sender: attachments (Genesis PDF), support@ sender, public route accepts kind 'form' only
bash $REPO/lambdas/email-sender/infra/deploy.sh

# 2. export-clinical-packet: "Pre-payment safety screen" block in the physician packet
bash $REPO/lambdas/export-clinical-packet/infra/deploy.sh

# 3. Genesis practice constants -> SSM /my4mlife/genesis/practice (dry run first, read it, then apply)
bash $REPO/infra/scripts/genesis-practice-config.sh
bash $REPO/infra/scripts/genesis-practice-config.sh --apply

# 4. push-patch-intake: GET/POST/OPTIONS /api/push-patch-intake; creates SSM push-patch-decision-hmac-key if missing
bash $REPO/lambdas/push-patch-intake/infra/deploy.sh

# 5. push-patch-decision: GET (confirm page) + POST (acts) /api/push-patch-decision; packages the Genesis PDF template
#    GENESIS_ORDER_EMAIL=drtj@my4mlife.com for TJ's test (switch to orders@novobioalliance.com afterward, then redeploy)
bash $REPO/lambdas/push-patch-decision/infra/deploy.sh

# 6. push-patch-reminder: EventBridge rate(15 minutes); intake reminders + 7-business-day refund reminder to TJ
bash $REPO/lambdas/push-patch-reminder/infra/deploy.sh

# 7. refund-encounter-admin: AppSync direct Lambda resolver (LIVE Stripe refunds). Must exist before step 8.
bash $REPO/lambdas/refund-encounter-admin/infra/deploy.sh

# 8. AppSync: refundEncounterAdmin mutation + refund fields on EncounterAdmin
cd $REPO/infra/clientportal/cdk && pnpm install --ignore-workspace --frozen-lockfile \
  && npx cdk deploy ApiStack --exclusively --require-approval never; cd $REPO

# 9. Admin app (app.my4mlife.com): Issue refund button in Patients
bash $REPO/apps/clientportal/deploy.sh

# 10. Route throttles. Run this only after steps 4 and 5 have created the routes; it fails if any route key is missing.
#     It also applies the pending GET/POST /api/approve throttles.
bash $REPO/infra/api-throttling.sh

# 11. order-handler + stripe-events-retry: write the PUSH_PATCH_PENDING# marker instead of emailing the order
bash $REPO/lambdas/order-handler/infra/deploy.sh
bash $REPO/lambdas/stripe-events-retry/infra/deploy.sh

# 12 + 13 back to back. Once checkout is live it requires `screening`. Until the new site is live,
#    the old landing page's Buy buttons get a 400 ("We could not open checkout"). The window is
#    roughly the length of website/deploy.sh.
#    (Option: run 13 before 12. The old checkout ignores the extra `screening` field. Orders in
#    that window reach the physician flagged "[No pre-payment screening]".)
bash $REPO/lambdas/create-checkout-session/infra/deploy.sh
bash $REPO/website/deploy.sh
```

---

## 2. Post-deploy smoke checks (no purchases, no patient emails)

```bash
O='Origin: https://www.my4mlife.com'; J='Content-Type: application/json'
code() { curl -s -o /tmp/pp-body -w '%{http_code}' "$@"; echo " $(head -c 160 /tmp/pp-body)"; }
```

### Checkout and the safety check (`POST /api/create-checkout-session`)
| Request | Expect |
|---|---|
| `code -X POST -H "$O" -H "$J" -d '{"skuId":"push-patch-wolverine"}' $API/api/create-checkout-session` | `400 {"error":"screening required"}` |
| `code -X POST -H "$O" -H "$J" -d '{"skuId":"push-patch-wolverine","screening":{"version":"pp-screen-v1","answers":{"seizures":true,"pacemaker":false,"pregnant":false,"suitableArea":true,"metalImplant":false,"woundOrScar":false}}}' $API/api/create-checkout-session` | `403 {"error":"not eligible"}` |
| Same, but `"seizures":false` and `"suitableArea":false` | `403 {"error":"not eligible"}` |
| Same, but `"version":"v0"` | `400 {"error":"screening required"}` |
| `-d '{"skuId":"push-patch-wolverine","wear":"14h", ...valid screening}'` | `400 {"error":"wear must be 12h"}` |
| All answers false, `"suitableArea":true` | `200 {"url":"https://checkout.stripe.com/...","id":"cs_live_..."}`. This creates an unpaid live session, which expires on its own. Do not pay it. |

Browser: open https://my4mlife.com/go/push-patch and click any Buy. The "Quick safety check" modal opens. Click "Something on this list applies to me", answer **Yes** to seizures, answer every other question, then Continue. Expect "The Push Patch isn't the right fit for you right now." with a care-coordinator link and **no** Stripe redirect. Then click "Change my answers", answer Yes to metal implant, and expect the inline "Choose an area away from the implant" note. Close the modal without paying. The fine print reads "Not cleared? Full refund. Final once shipped."

### Intake (`/api/push-patch-intake`)
| Request | Expect |
|---|---|
| `curl -s -i -X OPTIONS -H "$O" -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type' $API/api/push-patch-intake \| grep -i 'HTTP/\|access-control-allow-origin'` | 204, `access-control-allow-origin: https://www.my4mlife.com` |
| `code -H "$O" "$API/api/push-patch-intake"` | `400 {"error":"session_id required"}` |
| `code -H "$O" "$API/api/push-patch-intake?session_id=cs_live_doesnotexist"` | `402 {"error":"payment not found for this session"}` |
| `curl -s -i -H "$O" "$API/api/push-patch-intake?session_id=x" \| grep -i access-control-allow-origin` | the header is present (the GET prefill works cross-origin) |
| `code -X POST -H "$O" -H "$J" -d '{}' $API/api/push-patch-intake` | `400 {"error":"sessionId required"}` |
| `code -X POST -H "$O" -H "$J" -d 'not json' $API/api/push-patch-intake` | `400 {"error":"invalid json"}` |
| `code -X POST -H "$O" -H "$J" -d '{"sessionId":"cs_live_doesnotexist","dob":"1980-01-01","sex":"male","phone":"5555555555","medications":["None"],"allergies":["None"],"conditions":["None"],"consentName":"Test","shipping":{"confirmed":true}}' $API/api/push-patch-intake` | `402 {"error":"payment not found for this session"}` |

### Physician decision (`/api/push-patch-decision`)
| Request | Expect |
|---|---|
| `code "$API/api/push-patch-decision"` | `403`, HTML "Link invalid" |
| `code "$API/api/push-patch-decision?t=garbage"` | `403`, HTML "Link invalid" |
| `code -X POST -d 't=garbage' $API/api/push-patch-decision` | `403`, HTML "Link invalid" |

### email-sender public route (review fix)
| Request | Expect |
|---|---|
| `code -X POST -H "$O" -H "$J" -d '{"kind":"info","to":"nobody@example.com","subject":"x","html":"x"}' $API/api/contact-form` | `400 {"error":"only form submissions are accepted"}`; no email sent |

### Refund resolver, reminder and config
```bash
# Non-admin -> Unauthorized (FunctionError); admin + unknown encounter -> {"ok":false,"code":"not_found"}. No Stripe call either way.
aws lambda invoke --region us-east-2 --function-name my4mlife-refund-encounter-admin --cli-binary-format raw-in-base64-out \
  --payload '{"arguments":{"contactId":"smoke","encounterId":"pp-smoke"},"identity":{"groups":[]}}' /tmp/r1.json; cat /tmp/r1.json
aws lambda invoke --region us-east-2 --function-name my4mlife-refund-encounter-admin --cli-binary-format raw-in-base64-out \
  --payload '{"arguments":{"contactId":"smoke","encounterId":"pp-smoke"},"identity":{"groups":["Admins"],"username":"smoke"}}' /tmp/r2.json; cat /tmp/r2.json

# Reminder sweep. Run only BEFORE the first real purchase, while there are no pending markers (otherwise it emails buyers).
aws lambda invoke --region us-east-2 --function-name my4mlife-push-patch-reminder /tmp/r3.json; cat /tmp/r3.json   # {"scanned":0,...}
aws events describe-rule --region us-east-2 --name push-patch-reminder-every-15min --query '[State,ScheduleExpression]'

aws ssm get-parameter --region us-east-2 --name /my4mlife/genesis/practice --query Parameter.Value --output text | python3 -m json.tool
aws ssm get-parameter --region us-east-2 --name push-patch-decision-hmac-key --query Parameter.Name --output text   # name only; never print the value
aws apigatewayv2 get-stage --region us-east-2 --api-id v9svm8ds74 --stage-name '$default' --query 'RouteSettings' \
  | grep -E 'push-patch|/api/approve'                                                             # 6 keys
curl -s https://www.my4mlife.com/go/push-patch/thank-you | grep -c '9 a.m.–5 p.m. Central'          # >= 1
curl -s https://www.my4mlife.com/go/push-patch | grep -c 'All sales are final'                       # 0
```
Admin app: sign in at https://app.my4mlife.com as an Admins user. The Patients tab loads with no GraphQL error.

---

## 3. TJ end-to-end test A: approve path

Prerequisites:
- Steps 1–13 are done and the smoke checks pass.
- TJ can read the provider inbox (SSM `/my4mlife/provider/email`, currently drtj@mdspecialtygroup.com) and drtj@my4mlife.com.

1. In a private window, open https://my4mlife.com/go/push-patch. Click **Buy** on Glutathione Radiance ($550, the cheapest). In the modal, click **None of these apply to me**.
2. In Stripe, pay with a real card and a real US shipping address.
3. The thank-you page shows "Payment received." and the form, with **Your patches will ship to:** pre-filled from Stripe. Fill in DOB, sex, mobile, medications "None", allergies "None" and conditions "None". Leave **Yes, ship here** selected, type your full name and click **Submit for physician review**. Expect "Submitted." The after-hours note appears only outside Mon–Fri, 9–5 Central.
4. The provider inbox receives `[Provider review] Push Patch — Glutathione Radiance — T. <Last>`. The body contains "Pre-payment safety screen / Patient denied: epilepsy/seizures; pacemaker or implanted electronic device; pregnancy (version pp-screen-v1, <date>)", an **Open the clinical packet** link and green **Approve** / red **Decline** buttons. Open the packet. It shows demographics, history, the safety-screen block and the consent `consent-telehealth-push-patch-v1`.
5. Tap **Approve**. Expect the "Approve this order?" page. Nothing has happened yet. Tap **Confirm approve** and expect "Approved — Welcome email sent and order forwarded."
6. The buyer inbox receives **Welcome — your Push Patch is approved** from `My4MLife Support <support@my4mlife.com>`. Replies go to support@. The email says "our network's licensed physicians" and "our pharmacy partner", never Genesis or a physician name. The footer carries the tagline.
7. drtj@my4mlife.com receives `encrypt — Push Patch order — Glutathione Radiance — <Last>` with **My4MLife-PushPatch-cs_live_….pdf** attached. Open the PDF: the clinician/practice/phone/payment email/billing/placer/sales rep fields are filled, the Glutathione row has qty 1, the shipping box shows name, address and phone, the microneedling qty is 1, and the fields can still be edited. If the subject starts `[ACTION NEEDED] Genesis practice info missing`, step 3 of the deploy was skipped.
8. Tap Approve in the provider email again, then **Confirm approve**. Expect "Already decided — Current state: script-written". No new emails arrive.
9. In the admin app, the patient shows a Push Patch encounter in **script-written** with **no** Issue refund button.
10. No intake reminder arrives (the intake was submitted within 30 minutes).
11. Cleanup: this was a real live charge. Do **not** forward the PDF to Genesis unless you want the kit. Refund it in the Stripe dashboard if needed. The admin Issue refund button only works on declined orders.

## 4. TJ end-to-end test B: decline path and admin refund

1. Make a second purchase, of any blend. In the modal, click **Something on this list applies to me** and answer every question. Answer **Yes** only to the metal-implant question, confirm the inline "Choose an area away from the implant" note appears, and answer Yes to the suitable-area question. Click **Continue to checkout** and pay with a real card.
2. Complete the intake as in A3. The provider email subject starts `[Placement note] [Provider review] …`, and the body includes "Metal implant: yes, told to choose another area".
3. Tap **Decline**, then **Confirm decline**. Expect "Declined — A refund is queued for admin approval."
4. The buyer receives **You weren't cleared for the Push Patch. Refund within 10 business days** from support@. It gives no reason and no amount, says "Nothing has shipped", and carries the tagline footer.
5. drtj@my4mlife.com receives **no** Genesis order email.
6. Sign in at https://app.my4mlife.com as an Admins user and open **Patients**, then the buyer. The panel shows "Push Patch · declined", **Refund pending** and "Refund due by <declined date + 10 business days>". Click **Issue refund**. Expect "Refund $XXX.00 to <name>? This cannot be undone." Click **Refund $XXX.00**. The panel refreshes to **Refunded** and the button disappears.
7. The buyer receives **Your Push Patch refund has been issued** from support@.
8. In the Stripe dashboard, the PaymentIntent shows a full refund. The idempotency key is `push-patch-refund-<sessionId>`.
9. Tap Decline in the provider email again and confirm. Expect "Already decided — Current state: declined".

## 5. After both tests pass

- Switch the Genesis order address: set `GENESIS_ORDER_EMAIL="orders@novobioalliance.com"` in `lambdas/push-patch-decision/infra/deploy.sh`, commit, and re-run that script. From then on, TJ is cc'd automatically.
- Update `docs/HANDOFF.md`: mark the set as deployed, list the test session ids, and note the Genesis switch.
- Refunds left pending for 7 business days trigger one `[Refund due]` email to drtj@my4mlife.com from the 15-minute sweep.
