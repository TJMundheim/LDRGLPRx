# Ultralight EMR Verification Runbook

**Date:** 2026-06-26  
**For:** Dr. TJ (non-technical operator)

## Context

The EMR now persists every Rx questionnaire and consult submission to a queryable `PatientRecords` DynamoDB table (encrypted, AWS BAA), instead of email-only. Admins review records and advance each "encounter" through a state machine in the clientportal Admin dashboard's new "Patients" tab. A clinical packet can be exported for the telemedicine provider. Async review is default; testosterone is the only audio-visual visit.

---

## Verification Steps

### Step 1: Submit a Real Questionnaire

Go to **https://my4mlife.com/rx/weight-loss/questionnaire** and complete the form with a test email.

- **Tip:** Use your email with a tag like `drtj+emrtest@essentialmanage.com` to keep test data separate.
- **Include:** Fill in all fields and proceed through the card-capture step.
- **What happens:** This fires both the existing intake email AND the new patient-record persistence.

---

### Step 2: Confirm the Record Landed

Records live in AWS. You'll need AWS CLI access and the `us-east-2` region.

#### Scan for the Contact ID (UUID from the email)

Open a terminal and run:

```bash
aws dynamodb scan --table-name PatientRecords --region us-east-2 \
  --query "Items[].{sk:sk.S,contactId:contactId.S}" --output table
```

Find the row matching your test email. Copy the `contactId` value (a UUID).

#### Query All Records for That Contact

Replace `<CONTACT_ID>` with the UUID from above:

```bash
aws dynamodb query --table-name PatientRecords --region us-east-2 \
  --key-condition-expression "contactId = :c" \
  --expression-attribute-values '{":c":{"S":"<CONTACT_ID>"}}' \
  --output json
```

**Expected result:** You should see three kinds of `sk` values:
- `record` — the raw questionnaire data
- `encounter#...` — the encounter state and metadata
- `audit#...` — timestamps and state transitions

---

### Step 3: Open the Admin Patients Tab

Sign in to the app at **https://app.my4mlife.com** with the account you want to use as admin (e.g. drtj@essentialmanage.com).

**One-time setup — grant yourself admin.** The account must exist in Cognito first, which happens automatically the first time you sign in. After that first sign-in, run this once to add yourself to the `Admins` group (it looks up your Cognito username by email, then adds it):

```bash
EMAIL="drtj@essentialmanage.com"
UN=$(aws cognito-idp list-users --user-pool-id us-east-2_kIpKnr17R --region us-east-2 \
  --filter "email = \"$EMAIL\"" --query 'Users[0].Username' --output text)
aws cognito-idp admin-add-user-to-group --user-pool-id us-east-2_kIpKnr17R --region us-east-2 \
  --username "$UN" --group-name Admins
```

Sign out and back in so the new group is in your token. Then:

1. Click **Admin** in the sidebar.
2. Click the **"Patients"** tab.
3. You should see the new record with:
   - Encounter state: `new`
   - Visit type: `async`

---

### Step 4: Advance the Encounter

In the **Patients** tab, click on the new record. You should see buttons to advance the encounter state.

Click through the progression:
- `new` → `coordinator-reviewed` → `sent-to-provider`

**Expected result:** Each click succeeds, and the state updates in the table. (Illegal jumps are blocked server-side.)

---

### Step 5: Export the Clinical Packet

This endpoint is authenticated. The export key is stored in AWS Secrets Manager.

#### Get the Export Key

```bash
KEY=$(aws secretsmanager get-secret-value --secret-id export-clinical-packet-key \
  --query SecretString --output text --region us-east-2)
```

#### Export the Packet

Replace `<CONTACT_ID>` and `<ENCOUNTER_ID>` (use the values from Step 2 or the Patients tab):

```bash
curl -s -X POST https://v9svm8ds74.execute-api.us-east-2.amazonaws.com/api/export-clinical-packet \
  -H "Content-Type: application/json" \
  -H "x-packet-key: $KEY" \
  -d '{"contactId":"<CONTACT_ID>","encounterId":"<ENCOUNTER_ID>"}' \
  | python3 -m json.tool
```

**Expected result:** A JSON object with:
- `packet` object containing computed BMI, meds, allergies, consents, visitType
- `summaryUrl` (a 7-day signed link to an HTML summary for the provider)
- **Important:** NO raw card data appears — `cardOnFile` is shown only as `true/false`.

---

### Step 6: Confirm Testosterone → Audio-Visual

Submit a questionnaire for **https://my4mlife.com/rx/testosterone-ed/questionnaire** using the same test email.

Then:
- **Option A:** Check the **Patients** tab — the new encounter should show `visitType: audio-visual`.
- **Option B:** Run the query from **Step 2** again — the new `encounter#...` entry should have `visitType: audio-visual`.

**Expected result:** Testosterone visits are marked `audio-visual` (all other categories remain `async`).

---

## What This Proves

✓ Records are persisted + queryable (not inbox-only)  
✓ Admin review + state machine work end-to-end  
✓ Clinical packet export works for providers  
✓ Async/audio-visual visit rule is enforced  
✓ Card data is redacted (not exposed in exports)

---

## Cleanup (Optional)

Test records can be deleted one at a time. Replace `<CONTACT_ID>` and `<SK>` (e.g., `record` or `encounter#...`):

```bash
aws dynamodb delete-item --table-name PatientRecords --region us-east-2 \
  --key '{"contactId":{"S":"<CONTACT_ID>"},"sk":{"S":"<SK>"}}'
```

Repeat for each `sk` value you want to remove.

---

**Questions?** Check the admin dashboard logs or the DynamoDB table directly for any anomalies.
