#!/usr/bin/env bash
# reset-drtj-data.sh
#
# TJ-run infrastructure tool: wipes TJ's OWN TEST DATA for drtj@my4mlife.com
# (Contact row, Adherence rows, PatientRecords, Touchpoints, Conversations,
# and audit/workbook fields on his Users row) WITHOUT touching his Cognito
# login or his Admins group membership.
#
# HARD RULES:
#   - NEVER calls cognito-idp admin-delete-user.
#   - NEVER modifies Cognito group membership.
#   - NEVER touches any email/contactId/userId other than the ones below.
#   - Refuses to run if the Users row's primaryEmail != drtj@my4mlife.com
#     or the Contact row's email != drtj@my4mlife.com.
#
# Defaults to --dry-run (read-only + a plan of what would happen).
# Pass --execute to perform real deletes/updates.
#
# Usage:
#   infra/scripts/reset-drtj-data.sh              # dry-run
#   infra/scripts/reset-drtj-data.sh --dry-run     # explicit dry-run
#   infra/scripts/reset-drtj-data.sh --execute     # actually mutate data
#
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
USER_POOL_ID="us-east-2_kIpKnr17R"

CONTACT_TABLE="Contact"
USERS_TABLE="Users"
ADHERENCE_TABLE="Adherence"
PATIENT_RECORDS_TABLE="PatientRecords"
TOUCHPOINTS_TABLE="Touchpoints"
CONVERSATIONS_TABLE="Conversations"

EXPECTED_EMAIL="drtj@my4mlife.com"
CONTACT_ID="8eb82eae-4d0c-5d17-a359-f8fa06ae0662"
USERS_ID="e1db7550-8071-7061-8595-e179ef4a8b7a"
COGNITO_SUB="e1db7550-8071-7061-8595-e179ef4a8b7a"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG="$SCRIPT_DIR/reset-drtj-data.log"

EXECUTE=false
for arg in "$@"; do
  case "$arg" in
    --execute) EXECUTE=true ;;
    --dry-run) EXECUTE=false ;;
    *) echo "Unknown argument: $arg (expected --dry-run or --execute)" >&2; exit 1 ;;
  esac
done

# ---------------------------------------------------------------------------
# Logging wrapper. Logs the exact command line, then runs it (unless dry-run).
# ---------------------------------------------------------------------------
run() {
  echo "[$(date -u +%FT%TZ)] $*" | tee -a "$LOG"
  if $EXECUTE; then
    local out status
    set +e
    out=$(eval "$@" 2>&1)
    status=$?
    set -e
    echo "$out" | tee -a "$LOG"
    return $status
  else
    echo "  (dry-run: not executed)" | tee -a "$LOG"
  fi
}

# Always actually runs (read-only calls), regardless of --dry-run/--execute.
run_readonly() {
  echo "[$(date -u +%FT%TZ)] (read-only) $*" | tee -a "$LOG"
  local out status
  set +e
  out=$(eval "$@" 2>&1)
  status=$?
  set -e
  echo "$out" | tee -a "$LOG"
  return $status
}

json_get() {
  # json_get <path-expr-using-j> <fallback>
  node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  try { const j = JSON.parse(d); const v = ($1); console.log(v === undefined || v === null ? '' : v); }
  catch (e) { console.log(''); }
});"
}

echo "=== reset-drtj-data.sh run started $(date -u +%FT%TZ) (EXECUTE=$EXECUTE) ===" | tee -a "$LOG"
echo "Region: $REGION | Contact contactId=$CONTACT_ID | Users id=$USERS_ID | Cognito sub=$COGNITO_SUB" | tee -a "$LOG"

# ---------------------------------------------------------------------------
# Hard guard: never operate on anything but drtj@my4mlife.com's own rows.
# ---------------------------------------------------------------------------
if [[ "$USERS_ID" != "$COGNITO_SUB" ]]; then
  echo "FATAL: USERS_ID and COGNITO_SUB must be the same Cognito sub. Refusing to run." >&2
  exit 1
fi

MISMATCH=0

# ---------------------------------------------------------------------------
# PRE-CHECK: Users row — describe-table first to confirm key schema, then
# get-item, confirm primaryEmail matches, and never delete this row.
# ---------------------------------------------------------------------------
echo "" | tee -a "$LOG"
echo "### PRE-CHECK: Users table key schema ###" | tee -a "$LOG"
run_readonly "aws dynamodb describe-table --table-name $USERS_TABLE --region $REGION --query 'Table.KeySchema'" || true

echo "" | tee -a "$LOG"
echo "### PRE-CHECK: Users item (id=$USERS_ID) ###" | tee -a "$LOG"
users_item=$(aws dynamodb get-item --table-name "$USERS_TABLE" --region "$REGION" \
  --key "{\"id\":{\"S\":\"$USERS_ID\"}}" 2>&1)
echo "$users_item" | tee -a "$LOG"
users_email=$(echo "$users_item" | json_get "j.Item && j.Item.primaryEmail && j.Item.primaryEmail.S")

users_email_norm="$(echo -n "$users_email" | tr '[:upper:]' '[:lower:]')"
expected_norm="$(echo -n "$EXPECTED_EMAIL" | tr '[:upper:]' '[:lower:]')"
if [[ "$users_email_norm" != "$expected_norm" ]]; then
  echo "FATAL: Users row id=$USERS_ID primaryEmail ('$users_email') != expected '$EXPECTED_EMAIL'. Refusing to run." | tee -a "$LOG" >&2
  exit 1
fi
echo "Guard PASSED: Users.primaryEmail == $EXPECTED_EMAIL" | tee -a "$LOG"

# ---------------------------------------------------------------------------
# PRE-CHECK: Contact row — confirm email matches before allowing delete.
# ---------------------------------------------------------------------------
echo "" | tee -a "$LOG"
echo "### PRE-CHECK: Contact item (contactId=$CONTACT_ID) ###" | tee -a "$LOG"
contact_item=$(aws dynamodb get-item --table-name "$CONTACT_TABLE" --region "$REGION" \
  --key "{\"contactId\":{\"S\":\"$CONTACT_ID\"}}" 2>&1)
echo "$contact_item" | tee -a "$LOG"
contact_email=$(echo "$contact_item" | json_get "j.Item && j.Item.email && j.Item.email.S")
contact_email_norm="$(echo -n "$contact_email" | tr '[:upper:]' '[:lower:]')"

contact_exists=true
if [[ -z "$contact_email" ]]; then
  echo "NOTE: No Contact item found for contactId=$CONTACT_ID (or no email attribute) — nothing to delete there." | tee -a "$LOG"
  contact_exists=false
elif [[ "$contact_email_norm" != "$expected_norm" ]]; then
  echo "FATAL: Contact row contactId=$CONTACT_ID email ('$contact_email') != expected '$EXPECTED_EMAIL'. Refusing to run." | tee -a "$LOG" >&2
  exit 1
else
  echo "Guard PASSED: Contact.email == $EXPECTED_EMAIL" | tee -a "$LOG"
fi

# ---------------------------------------------------------------------------
# PRE-CHECK: Adherence — query by userId=Cognito sub, plus a defensive
# scan-filter for userId == contactId in case some legacy rows used that.
# ---------------------------------------------------------------------------
echo "" | tee -a "$LOG"
echo "### PRE-CHECK: Adherence query (userId=$COGNITO_SUB) ###" | tee -a "$LOG"
adh_sub_items=$(aws dynamodb query --table-name "$ADHERENCE_TABLE" --region "$REGION" \
  --key-condition-expression "userId = :u" \
  --expression-attribute-values "{\":u\":{\"S\":\"$COGNITO_SUB\"}}" 2>&1)
echo "$adh_sub_items" | tee -a "$LOG"
adh_sub_count=$(echo "$adh_sub_items" | json_get "(j.Items||[]).length")
echo "Found $adh_sub_count Adherence item(s) for userId=$COGNITO_SUB." | tee -a "$LOG"

echo "" | tee -a "$LOG"
echo "### PRE-CHECK (defensive): Adherence scan-filter (userId=$CONTACT_ID) ###" | tee -a "$LOG"
adh_contact_items=$(aws dynamodb scan --table-name "$ADHERENCE_TABLE" --region "$REGION" \
  --filter-expression "userId = :u" \
  --expression-attribute-values "{\":u\":{\"S\":\"$CONTACT_ID\"}}" 2>&1)
echo "$adh_contact_items" | tee -a "$LOG"
adh_contact_count=$(echo "$adh_contact_items" | json_get "(j.Items||[]).length")
echo "Found $adh_contact_count Adherence item(s) for userId=$CONTACT_ID (legacy check)." | tee -a "$LOG"

# ---------------------------------------------------------------------------
# PRE-CHECK: PatientRecords, Touchpoints by contactId.
# ---------------------------------------------------------------------------
echo "" | tee -a "$LOG"
echo "### PRE-CHECK: PatientRecords query (contactId=$CONTACT_ID) ###" | tee -a "$LOG"
pr_items=$(aws dynamodb query --table-name "$PATIENT_RECORDS_TABLE" --region "$REGION" \
  --key-condition-expression "contactId = :pk" \
  --expression-attribute-values "{\":pk\":{\"S\":\"$CONTACT_ID\"}}" 2>&1)
echo "$pr_items" | tee -a "$LOG"
pr_count=$(echo "$pr_items" | json_get "(j.Items||[]).length")
echo "Found $pr_count PatientRecords item(s)." | tee -a "$LOG"

echo "" | tee -a "$LOG"
echo "### PRE-CHECK: Touchpoints query (contactId=$CONTACT_ID) ###" | tee -a "$LOG"
tp_items=$(aws dynamodb query --table-name "$TOUCHPOINTS_TABLE" --region "$REGION" \
  --key-condition-expression "contactId = :pk" \
  --expression-attribute-values "{\":pk\":{\"S\":\"$CONTACT_ID\"}}" 2>&1)
echo "$tp_items" | tee -a "$LOG"
tp_count=$(echo "$tp_items" | json_get "(j.Items||[]).length")
echo "Found $tp_count Touchpoints item(s)." | tee -a "$LOG"

# ---------------------------------------------------------------------------
# PRE-CHECK: Conversations — prospect#<email> and member#<email> variants.
# ---------------------------------------------------------------------------
echo "" | tee -a "$LOG"
echo "### PRE-CHECK: Conversations query (pk=prospect#$EXPECTED_EMAIL) ###" | tee -a "$LOG"
conv_prospect_items=$(aws dynamodb query --table-name "$CONVERSATIONS_TABLE" --region "$REGION" \
  --key-condition-expression "contactId = :pk" \
  --expression-attribute-values "{\":pk\":{\"S\":\"prospect#$EXPECTED_EMAIL\"}}" 2>&1)
echo "$conv_prospect_items" | tee -a "$LOG"
conv_prospect_count=$(echo "$conv_prospect_items" | json_get "(j.Items||[]).length")
echo "Found $conv_prospect_count Conversations item(s) for prospect#$EXPECTED_EMAIL." | tee -a "$LOG"

echo "" | tee -a "$LOG"
echo "### PRE-CHECK: Conversations query (pk=member#$EXPECTED_EMAIL) ###" | tee -a "$LOG"
conv_member_items=$(aws dynamodb query --table-name "$CONVERSATIONS_TABLE" --region "$REGION" \
  --key-condition-expression "contactId = :pk" \
  --expression-attribute-values "{\":pk\":{\"S\":\"member#$EXPECTED_EMAIL\"}}" 2>&1)
echo "$conv_member_items" | tee -a "$LOG"
conv_member_count=$(echo "$conv_member_items" | json_get "(j.Items||[]).length")
echo "Found $conv_member_count Conversations item(s) for member#$EXPECTED_EMAIL." | tee -a "$LOG"

# ---------------------------------------------------------------------------
# PRE-CHECK: Cognito — user exists and is still in Admins.
# ---------------------------------------------------------------------------
echo "" | tee -a "$LOG"
echo "### PRE-CHECK: Cognito user + group membership ###" | tee -a "$LOG"
run_readonly "aws cognito-idp admin-get-user --user-pool-id $USER_POOL_ID --username $COGNITO_SUB --region $REGION" || true
run_readonly "aws cognito-idp admin-list-groups-for-user --user-pool-id $USER_POOL_ID --username $COGNITO_SUB --region $REGION" || true

# ---------------------------------------------------------------------------
# Generic delete-by-key helper for a list of DynamoDB Items (from a query
# result) that share the same two key attribute names.
# ---------------------------------------------------------------------------
delete_items_by_key() {
  local table="$1" hash_name="$2" range_name="$3" items_json="$4"
  local count
  count=$(echo "$items_json" | json_get "(j.Items||[]).length")
  if [[ "$count" -eq 0 ]]; then
    echo "No items to delete in $table for this key set." | tee -a "$LOG"
    return 0
  fi
  echo "$items_json" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const j=JSON.parse(d);
  (j.Items||[]).forEach(it=>console.log(JSON.stringify({h:it['$hash_name'].S, r:it['$range_name'].S})));
});" | while read -r line; do
    h=$(echo "$line" | json_get "j.h")
    r=$(echo "$line" | json_get "j.r")
    run "aws dynamodb delete-item --table-name $table --region $REGION --key '{\"$hash_name\":{\"S\":\"$h\"},\"$range_name\":{\"S\":\"$r\"}}'"
  done
}

# ---------------------------------------------------------------------------
# ACTIONS
# ---------------------------------------------------------------------------
if $EXECUTE; then
  echo "" | tee -a "$LOG"
  echo "### ACTION: delete Contact item (contactId=$CONTACT_ID) ###" | tee -a "$LOG"
  if $contact_exists; then
    run "aws dynamodb delete-item --table-name $CONTACT_TABLE --region $REGION --key '{\"contactId\":{\"S\":\"$CONTACT_ID\"}}'"
  else
    echo "Skipping Contact delete: no item found." | tee -a "$LOG"
  fi

  echo "" | tee -a "$LOG"
  echo "### ACTION: update Users item (id=$USERS_ID) — strip test-data fields, DO NOT DELETE ###" | tee -a "$LOG"
  NOW_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  run "aws dynamodb update-item --table-name $USERS_TABLE --region $REGION \
    --key '{\"id\":{\"S\":\"$USERS_ID\"}}' \
    --update-expression 'REMOVE auditCompletedAt, auditTop3, intakeAnswers, workbookJson, workbookUpdatedAt, weeklyZoomAttestedAt SET weekUnlocked = :w, updatedAt = :t' \
    --expression-attribute-values '{\":w\":{\"N\":\"1\"},\":t\":{\"S\":\"$NOW_ISO\"}}'"

  echo "" | tee -a "$LOG"
  echo "### ACTION: delete Adherence items (userId=$COGNITO_SUB) ###" | tee -a "$LOG"
  delete_items_by_key "$ADHERENCE_TABLE" "userId" "dateActionId" "$adh_sub_items"

  echo "" | tee -a "$LOG"
  echo "### ACTION: delete Adherence items (userId=$CONTACT_ID legacy) ###" | tee -a "$LOG"
  delete_items_by_key "$ADHERENCE_TABLE" "userId" "dateActionId" "$adh_contact_items"

  echo "" | tee -a "$LOG"
  echo "### ACTION: delete PatientRecords items (contactId=$CONTACT_ID) ###" | tee -a "$LOG"
  delete_items_by_key "$PATIENT_RECORDS_TABLE" "contactId" "sk" "$pr_items"

  echo "" | tee -a "$LOG"
  echo "### ACTION: delete Touchpoints items (contactId=$CONTACT_ID) ###" | tee -a "$LOG"
  delete_items_by_key "$TOUCHPOINTS_TABLE" "contactId" "sk" "$tp_items"

  echo "" | tee -a "$LOG"
  echo "### ACTION: delete Conversations items (prospect#$EXPECTED_EMAIL) ###" | tee -a "$LOG"
  delete_items_by_key "$CONVERSATIONS_TABLE" "contactId" "sk" "$conv_prospect_items"

  echo "" | tee -a "$LOG"
  echo "### ACTION: delete Conversations items (member#$EXPECTED_EMAIL) ###" | tee -a "$LOG"
  delete_items_by_key "$CONVERSATIONS_TABLE" "contactId" "sk" "$conv_member_items"
else
  echo "" | tee -a "$LOG"
  echo "(dry-run) Would perform:" | tee -a "$LOG"
  echo "  - Delete Contact contactId=$CONTACT_ID (exists=$contact_exists)" | tee -a "$LOG"
  echo "  - UpdateItem Users id=$USERS_ID: REMOVE auditCompletedAt/auditTop3/intakeAnswers/workbookJson/workbookUpdatedAt/weeklyZoomAttestedAt, SET weekUnlocked=1 updatedAt=now (row NOT deleted)" | tee -a "$LOG"
  echo "  - Delete $adh_sub_count Adherence item(s) for userId=$COGNITO_SUB" | tee -a "$LOG"
  echo "  - Delete $adh_contact_count Adherence item(s) for userId=$CONTACT_ID (legacy check)" | tee -a "$LOG"
  echo "  - Delete $pr_count PatientRecords item(s) for contactId=$CONTACT_ID" | tee -a "$LOG"
  echo "  - Delete $tp_count Touchpoints item(s) for contactId=$CONTACT_ID" | tee -a "$LOG"
  echo "  - Delete $conv_prospect_count Conversations item(s) for prospect#$EXPECTED_EMAIL" | tee -a "$LOG"
  echo "  - Delete $conv_member_count Conversations item(s) for member#$EXPECTED_EMAIL" | tee -a "$LOG"
  echo "  - Cognito user $COGNITO_SUB and Admins group membership are NEVER touched by this script." | tee -a "$LOG"
fi

# ---------------------------------------------------------------------------
# VERIFY (only meaningful after --execute; still runs read-only checks under
# --dry-run for visibility, but only asserts hard pass/fail under --execute).
# ---------------------------------------------------------------------------
echo "" | tee -a "$LOG"
echo "### VERIFY ###" | tee -a "$LOG"

VERIFY_FAIL=0

echo "-- Re-read Contact item --" | tee -a "$LOG"
contact_after=$(aws dynamodb get-item --table-name "$CONTACT_TABLE" --region "$REGION" \
  --key "{\"contactId\":{\"S\":\"$CONTACT_ID\"}}" 2>&1)
echo "$contact_after" | tee -a "$LOG"
contact_after_has_item=$(echo "$contact_after" | json_get "j.Item ? '1' : ''")

echo "-- Re-read Users item --" | tee -a "$LOG"
users_after=$(aws dynamodb get-item --table-name "$USERS_TABLE" --region "$REGION" \
  --key "{\"id\":{\"S\":\"$USERS_ID\"}}" 2>&1)
echo "$users_after" | tee -a "$LOG"
users_after_email=$(echo "$users_after" | json_get "j.Item && j.Item.primaryEmail && j.Item.primaryEmail.S")
users_after_has_audit=$(echo "$users_after" | json_get "j.Item && (j.Item.auditCompletedAt || j.Item.auditTop3 || j.Item.intakeAnswers || j.Item.workbookJson || j.Item.workbookUpdatedAt || j.Item.weeklyZoomAttestedAt) ? '1' : ''")

echo "-- Re-query Adherence (userId=$COGNITO_SUB) --" | tee -a "$LOG"
adh_after=$(aws dynamodb query --table-name "$ADHERENCE_TABLE" --region "$REGION" \
  --key-condition-expression "userId = :u" \
  --expression-attribute-values "{\":u\":{\"S\":\"$COGNITO_SUB\"}}" 2>&1)
echo "$adh_after" | tee -a "$LOG"
adh_after_count=$(echo "$adh_after" | json_get "(j.Items||[]).length")

echo "-- Re-check Cognito user still exists --" | tee -a "$LOG"
cognito_after_status=0
run_readonly "aws cognito-idp admin-get-user --user-pool-id $USER_POOL_ID --username $COGNITO_SUB --region $REGION" || cognito_after_status=$?

echo "-- Re-check Cognito Admins group membership --" | tee -a "$LOG"
groups_after=$(aws cognito-idp admin-list-groups-for-user --user-pool-id "$USER_POOL_ID" --username "$COGNITO_SUB" --region "$REGION" 2>&1)
echo "$groups_after" | tee -a "$LOG"
is_admin_after=$(echo "$groups_after" | json_get "((j.Groups||[]).some(g=>g.GroupName==='Admins')) ? '1' : ''")

if $EXECUTE; then
  if [[ -n "$contact_after_has_item" ]]; then
    echo "VERIFY FAIL: Contact item still present." | tee -a "$LOG"
    VERIFY_FAIL=1
  fi
  if [[ "$(echo "$users_after_email" | tr '[:upper:]' '[:lower:]')" != "$expected_norm" ]]; then
    echo "VERIFY FAIL: Users row primaryEmail changed or missing." | tee -a "$LOG"
    VERIFY_FAIL=1
  fi
  if [[ -n "$users_after_has_audit" ]]; then
    echo "VERIFY FAIL: Users row still has an audit/workbook field." | tee -a "$LOG"
    VERIFY_FAIL=1
  fi
  if [[ "$adh_after_count" -ne 0 ]]; then
    echo "VERIFY FAIL: Adherence rows remain for userId=$COGNITO_SUB (count=$adh_after_count)." | tee -a "$LOG"
    VERIFY_FAIL=1
  fi
  if [[ $cognito_after_status -ne 0 ]]; then
    echo "VERIFY FAIL: Cognito user $COGNITO_SUB no longer exists or is not reachable." | tee -a "$LOG"
    VERIFY_FAIL=1
  fi
  if [[ -z "$is_admin_after" ]]; then
    echo "VERIFY FAIL: Cognito user $COGNITO_SUB is not in Admins group." | tee -a "$LOG"
    VERIFY_FAIL=1
  fi

  if [[ $VERIFY_FAIL -ne 0 ]]; then
    echo "" | tee -a "$LOG"
    echo "=== VERIFY FAILED — see FAIL lines above ===" | tee -a "$LOG"
    exit 1
  fi
  echo "" | tee -a "$LOG"
  echo "=== VERIFY PASSED ===" | tee -a "$LOG"
else
  echo "(dry-run) Verification assertions are skipped; pre-check state was logged above." | tee -a "$LOG"
fi

echo "" | tee -a "$LOG"
echo "=== reset-drtj-data.sh run finished $(date -u +%FT%TZ) (EXECUTE=$EXECUTE) ===" | tee -a "$LOG"
