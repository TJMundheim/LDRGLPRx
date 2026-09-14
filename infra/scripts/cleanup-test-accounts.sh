#!/usr/bin/env bash
# cleanup-test-accounts.sh
#
# TJ-run infrastructure tool: removes test-account rows for four known test
# identities from DynamoDB (Contact, Users, PatientRecords, Conversations)
# and Cognito. Defaults to --dry-run (read-only). Pass --execute to perform
# real deletes.
#
# Usage:
#   infra/scripts/cleanup-test-accounts.sh              # dry-run (default)
#   infra/scripts/cleanup-test-accounts.sh --dry-run     # explicit dry-run
#   infra/scripts/cleanup-test-accounts.sh --execute     # actually delete
#
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
USER_POOL_ID="us-east-2_kIpKnr17R"
CONTACT_TABLE="Contact"
USERS_TABLE="Users"
PATIENT_RECORDS_TABLE="PatientRecords"
CONVERSATIONS_TABLE="Conversations"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG="$SCRIPT_DIR/cleanup-test-accounts.log"

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
    local out
    if out=$(eval "$@" 2>&1); then
      echo "$out" | tee -a "$LOG"
    else
      local status=$?
      echo "$out" | tee -a "$LOG"
      return $status
    fi
  else
    echo "  (dry-run: not executed)" | tee -a "$LOG"
  fi
}

# Read-only variant: always actually runs (used for PRE-CHECK / VERIFY),
# regardless of --dry-run / --execute, since it performs no mutation.
run_readonly() {
  echo "[$(date -u +%FT%TZ)] (read-only) $*" | tee -a "$LOG"
  local out
  if out=$(eval "$@" 2>&1); then
    echo "$out" | tee -a "$LOG"
  else
    echo "$out" | tee -a "$LOG"
  fi
}

echo "=== cleanup-test-accounts.sh run started $(date -u +%FT%TZ) (EXECUTE=$EXECUTE) ===" | tee -a "$LOG"

# ---------------------------------------------------------------------------
# uuidv5 helper (RFC 4122, manual SHA-1 implementation via node's crypto —
# no npm install required, portable).
# ---------------------------------------------------------------------------
NAMESPACE="f0e1d2c3-b4a5-4968-87a6-95c4d3e2f1a0"

uuidv5() {
  local name="$1"
  local namespace="$2"
  node -e "
const crypto = require('crypto');
function uuidv5(name, namespace) {
  const nsBytes = Buffer.from(namespace.replace(/-/g,''), 'hex');
  const nameBytes = Buffer.from(name, 'utf8');
  const hash = crypto.createHash('sha1').update(Buffer.concat([nsBytes, nameBytes])).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0,16).toString('hex');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20,32)].join('-');
}
process.stdout.write(uuidv5(process.argv[1], process.argv[2]));
" "$name" "$namespace"
}

derive_contact_id() {
  local email="$1"
  local trimmed_lower
  trimmed_lower="$(echo -n "$email" | awk '{$1=$1;print}' | tr '[:upper:]' '[:lower:]')"
  uuidv5 "$trimmed_lower" "$NAMESPACE"
}

# ---------------------------------------------------------------------------
# HARD GUARD — must run before ANY AWS call. Never touch these two accounts.
# ---------------------------------------------------------------------------
FORBIDDEN_EMAILS=("drtj@my4mlife.com" "coonan_michael@yahoo.com")

TARGET_EMAILS=(
  "tjshcacs@gmail.com"
  "drtj@mdspecialtygroup.com"
  "tjmundheim@genesisregenerative.com"
  "drtj+intaketest@my4mlife.com"
)

for te in "${TARGET_EMAILS[@]}"; do
  te_norm="$(echo -n "$te" | awk '{$1=$1;print}' | tr '[:upper:]' '[:lower:]')"
  for fe in "${FORBIDDEN_EMAILS[@]}"; do
    fe_norm="$(echo -n "$fe" | awk '{$1=$1;print}' | tr '[:upper:]' '[:lower:]')"
    if [[ "$te_norm" == "$fe_norm" ]]; then
      echo "FATAL: target email '$te' matches a FORBIDDEN email ($fe). Refusing to run." >&2
      exit 1
    fi
  done
done

echo "Hard guard passed: no target email matches a forbidden email." | tee -a "$LOG"

# ---------------------------------------------------------------------------
# Target identities
# ---------------------------------------------------------------------------
# label|email|expected_contactId_prefix(or empty)|users_id(or empty)|cognito_sub(or empty)|conversations_pk(or empty)
IDENTITY_1_LABEL="tjshcacs@gmail.com"
IDENTITY_1_EMAIL="tjshcacs@gmail.com"
IDENTITY_1_USERS_ID="d18b95c0-00a1-702c-f94c-ff27747e0305"
IDENTITY_1_COGNITO_SUB="d18b95c0-00a1-702c-f94c-ff27747e0305"
IDENTITY_1_CONVERSATIONS_PK="prospect#tjshcacs@gmail.com"

IDENTITY_2_LABEL="drtj@mdspecialtygroup.com"
IDENTITY_2_EMAIL="drtj@mdspecialtygroup.com"
IDENTITY_2_USERS_ID="519b4570-30b1-7063-c0e8-326307dcde09"
IDENTITY_2_COGNITO_SUB="519b4570-30b1-7063-c0e8-326307dcde09"

IDENTITY_3_LABEL="tjmundheim@genesisregenerative.com"
IDENTITY_3_EMAIL="tjmundheim@genesisregenerative.com"
IDENTITY_3_CONTACTID_PREFIX="d8030552-"
IDENTITY_3_USERS_ID="410b3580-9061-70eb-fb96-3f73ec11e42d"
IDENTITY_3_COGNITO_SUB="410b3580-9061-70eb-fb96-3f73ec11e42d"

IDENTITY_4_LABEL="drtj+intaketest@my4mlife.com"
IDENTITY_4_EMAIL="drtj+intaketest@my4mlife.com"
IDENTITY_4_CONTACTID="3f4823b2-a3b1-56d0-8954-33b3dd913a13"

REMAINING_UNEXPECTED=0

# ---------------------------------------------------------------------------
# Cognito delete helper: ignores UserNotFoundException, doesn't die under set -e.
# ---------------------------------------------------------------------------
cognito_delete_user() {
  local sub="$1"
  echo "[$(date -u +%FT%TZ)] aws cognito-idp admin-delete-user --user-pool-id $USER_POOL_ID --username $sub --region $REGION" | tee -a "$LOG"
  if $EXECUTE; then
    local out
    set +e
    out=$(aws cognito-idp admin-delete-user --user-pool-id "$USER_POOL_ID" --username "$sub" --region "$REGION" 2>&1)
    local status=$?
    set -e
    echo "$out" | tee -a "$LOG"
    if [[ $status -ne 0 ]] && ! echo "$out" | grep -q "UserNotFoundException"; then
      echo "WARNING: cognito-idp admin-delete-user failed for $sub (non-UserNotFoundException error)" | tee -a "$LOG"
    fi
  else
    echo "  (dry-run: not executed)" | tee -a "$LOG"
  fi
}

cognito_check_user() {
  local sub="$1"
  echo "[$(date -u +%FT%TZ)] aws cognito-idp admin-get-user --user-pool-id $USER_POOL_ID --username $sub --region $REGION" | tee -a "$LOG"
  set +e
  local out
  out=$(aws cognito-idp admin-get-user --user-pool-id "$USER_POOL_ID" --username "$sub" --region "$REGION" 2>&1)
  local status=$?
  set -e
  echo "$out" | tee -a "$LOG"
  return $status
}

# ---------------------------------------------------------------------------
# Identity 1: tjshcacs@gmail.com — Users, Conversations, Cognito
# ---------------------------------------------------------------------------
echo "" | tee -a "$LOG"
echo "### Identity 1: $IDENTITY_1_LABEL ###" | tee -a "$LOG"

echo "-- PRE-CHECK: Users item --" | tee -a "$LOG"
users1_item=$(aws dynamodb get-item --table-name "$USERS_TABLE" --region "$REGION" \
  --key "{\"id\":{\"S\":\"$IDENTITY_1_USERS_ID\"}}" 2>&1)
echo "$users1_item" | tee -a "$LOG"
users1_email=$(echo "$users1_item" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log(j.Item&&j.Item.primaryEmail&&j.Item.primaryEmail.S||'');}catch(e){console.log('');}});" || echo "")

echo "-- PRE-CHECK: Conversations items (pk=$IDENTITY_1_CONVERSATIONS_PK) --" | tee -a "$LOG"
conv1_items=$(aws dynamodb query --table-name "$CONVERSATIONS_TABLE" --region "$REGION" \
  --key-condition-expression "contactId = :pk" \
  --expression-attribute-values "{\":pk\":{\"S\":\"$IDENTITY_1_CONVERSATIONS_PK\"}}" 2>&1)
echo "$conv1_items" | tee -a "$LOG"
conv1_count=$(echo "$conv1_items" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log((j.Items||[]).length);}catch(e){console.log(0);}});" || echo 0)

echo "-- PRE-CHECK: Cognito user $IDENTITY_1_COGNITO_SUB --" | tee -a "$LOG"
cognito_check_user "$IDENTITY_1_COGNITO_SUB" || true

if [[ "$(echo "$users1_email" | tr '[:upper:]' '[:lower:]')" == "$(echo "$IDENTITY_1_EMAIL" | tr '[:upper:]' '[:lower:]')" ]]; then
  echo "Email match guard PASSED for identity 1 (Users.primaryEmail == $IDENTITY_1_EMAIL)" | tee -a "$LOG"
  if $EXECUTE; then
    echo "-- DELETE: Users item --" | tee -a "$LOG"
    run "aws dynamodb delete-item --table-name $USERS_TABLE --region $REGION --key '{\"id\":{\"S\":\"$IDENTITY_1_USERS_ID\"}}'"

    if [[ "$conv1_count" -gt 0 ]]; then
      echo "-- DELETE: Conversations items ($conv1_count found) --" | tee -a "$LOG"
      echo "$conv1_items" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const j=JSON.parse(d);
  (j.Items||[]).forEach(it=>console.log(JSON.stringify({contactId:it.contactId.S, sk:it.sk.S})));
});" | while read -r line; do
        pk=$(echo "$line" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.contactId);});")
        sk=$(echo "$line" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.sk);});")
        run "aws dynamodb delete-item --table-name $CONVERSATIONS_TABLE --region $REGION --key '{\"contactId\":{\"S\":\"$pk\"},\"sk\":{\"S\":\"$sk\"}}'"
      done
    else
      echo "No Conversations items found for identity 1; nothing to delete." | tee -a "$LOG"
    fi

    echo "-- DELETE: Cognito user --" | tee -a "$LOG"
    cognito_delete_user "$IDENTITY_1_COGNITO_SUB"
  else
    echo "(dry-run) Would delete: Users id=$IDENTITY_1_USERS_ID, $conv1_count Conversations item(s), Cognito sub=$IDENTITY_1_COGNITO_SUB" | tee -a "$LOG"
  fi
else
  echo "WARNING: Users.primaryEmail ('$users1_email') does NOT match expected '$IDENTITY_1_EMAIL' for identity 1. SKIPPING all deletes for identity 1." | tee -a "$LOG"
fi

# ---------------------------------------------------------------------------
# Identity 2: drtj@mdspecialtygroup.com — Users, Cognito
# ---------------------------------------------------------------------------
echo "" | tee -a "$LOG"
echo "### Identity 2: $IDENTITY_2_LABEL ###" | tee -a "$LOG"

echo "-- PRE-CHECK: Users item --" | tee -a "$LOG"
users2_item=$(aws dynamodb get-item --table-name "$USERS_TABLE" --region "$REGION" \
  --key "{\"id\":{\"S\":\"$IDENTITY_2_USERS_ID\"}}" 2>&1)
echo "$users2_item" | tee -a "$LOG"
users2_email=$(echo "$users2_item" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log(j.Item&&j.Item.primaryEmail&&j.Item.primaryEmail.S||'');}catch(e){console.log('');}});" || echo "")

echo "-- PRE-CHECK: Cognito user $IDENTITY_2_COGNITO_SUB --" | tee -a "$LOG"
cognito_check_user "$IDENTITY_2_COGNITO_SUB" || true

if [[ "$(echo "$users2_email" | tr '[:upper:]' '[:lower:]')" == "$(echo "$IDENTITY_2_EMAIL" | tr '[:upper:]' '[:lower:]')" ]]; then
  echo "Email match guard PASSED for identity 2 (Users.primaryEmail == $IDENTITY_2_EMAIL)" | tee -a "$LOG"
  if $EXECUTE; then
    echo "-- DELETE: Users item --" | tee -a "$LOG"
    run "aws dynamodb delete-item --table-name $USERS_TABLE --region $REGION --key '{\"id\":{\"S\":\"$IDENTITY_2_USERS_ID\"}}'"
    echo "-- DELETE: Cognito user --" | tee -a "$LOG"
    cognito_delete_user "$IDENTITY_2_COGNITO_SUB"
  else
    echo "(dry-run) Would delete: Users id=$IDENTITY_2_USERS_ID, Cognito sub=$IDENTITY_2_COGNITO_SUB" | tee -a "$LOG"
  fi
else
  echo "WARNING: Users.primaryEmail ('$users2_email') does NOT match expected '$IDENTITY_2_EMAIL' for identity 2. SKIPPING all deletes for identity 2." | tee -a "$LOG"
fi

# ---------------------------------------------------------------------------
# Identity 3: tjmundheim@genesisregenerative.com — Contact, Users, Cognito
#             (+ defensive PatientRecords / Conversations check)
# ---------------------------------------------------------------------------
echo "" | tee -a "$LOG"
echo "### Identity 3: $IDENTITY_3_LABEL ###" | tee -a "$LOG"

identity3_contact_id="$(derive_contact_id "$IDENTITY_3_EMAIL")"
echo "Computed contactId via uuidv5: $identity3_contact_id (expected prefix: $IDENTITY_3_CONTACTID_PREFIX)" | tee -a "$LOG"

identity3_id_ok=true
if [[ "$identity3_contact_id" != "$IDENTITY_3_CONTACTID_PREFIX"* ]]; then
  echo "WARNING: computed contactId for identity 3 does not start with expected prefix '$IDENTITY_3_CONTACTID_PREFIX'. Skipping DynamoDB (Contact/PatientRecords/Conversations) deletes for identity 3; Users/Cognito deletes still proceed on their own guard." | tee -a "$LOG"
  identity3_id_ok=false
fi

echo "-- PRE-CHECK: Contact item --" | tee -a "$LOG"
contact3_item=$(aws dynamodb get-item --table-name "$CONTACT_TABLE" --region "$REGION" \
  --key "{\"contactId\":{\"S\":\"$identity3_contact_id\"}}" 2>&1)
echo "$contact3_item" | tee -a "$LOG"
contact3_email=$(echo "$contact3_item" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log(j.Item&&j.Item.email&&j.Item.email.S||'');}catch(e){console.log('');}});" || echo "")

echo "-- PRE-CHECK: Users item --" | tee -a "$LOG"
users3_item=$(aws dynamodb get-item --table-name "$USERS_TABLE" --region "$REGION" \
  --key "{\"id\":{\"S\":\"$IDENTITY_3_USERS_ID\"}}" 2>&1)
echo "$users3_item" | tee -a "$LOG"
users3_email=$(echo "$users3_item" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log(j.Item&&j.Item.primaryEmail&&j.Item.primaryEmail.S||'');}catch(e){console.log('');}});" || echo "")

echo "-- PRE-CHECK: Cognito user $IDENTITY_3_COGNITO_SUB --" | tee -a "$LOG"
cognito_check_user "$IDENTITY_3_COGNITO_SUB" || true

echo "-- PRE-CHECK (defensive): PatientRecords by contactId --" | tee -a "$LOG"
pr3_items=$(aws dynamodb query --table-name "$PATIENT_RECORDS_TABLE" --region "$REGION" \
  --key-condition-expression "contactId = :pk" \
  --expression-attribute-values "{\":pk\":{\"S\":\"$identity3_contact_id\"}}" 2>&1)
echo "$pr3_items" | tee -a "$LOG"
pr3_count=$(echo "$pr3_items" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log((j.Items||[]).length);}catch(e){console.log(0);}});" || echo 0)

echo "-- PRE-CHECK (defensive): Conversations by pk 'prospect#$IDENTITY_3_EMAIL' --" | tee -a "$LOG"
conv3_pk="prospect#$IDENTITY_3_EMAIL"
conv3_items=$(aws dynamodb query --table-name "$CONVERSATIONS_TABLE" --region "$REGION" \
  --key-condition-expression "contactId = :pk" \
  --expression-attribute-values "{\":pk\":{\"S\":\"$conv3_pk\"}}" 2>&1)
echo "$conv3_items" | tee -a "$LOG"
conv3_count=$(echo "$conv3_items" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log((j.Items||[]).length);}catch(e){console.log(0);}});" || echo 0)

contact3_ok=false
if [[ -n "$contact3_email" && "$(echo "$contact3_email" | tr '[:upper:]' '[:lower:]')" == "$(echo "$IDENTITY_3_EMAIL" | tr '[:upper:]' '[:lower:]')" ]]; then
  contact3_ok=true
  echo "Email match guard PASSED for identity 3 Contact row." | tee -a "$LOG"
elif [[ -n "$contact3_email" ]]; then
  echo "WARNING: Contact.email ('$contact3_email') does NOT match expected '$IDENTITY_3_EMAIL'. SKIPPING Contact delete." | tee -a "$LOG"
else
  echo "No Contact row found for identity 3 (or no email attribute) — nothing to delete there." | tee -a "$LOG"
fi

users3_ok=false
if [[ "$(echo "$users3_email" | tr '[:upper:]' '[:lower:]')" == "$(echo "$IDENTITY_3_EMAIL" | tr '[:upper:]' '[:lower:]')" ]]; then
  users3_ok=true
  echo "Email match guard PASSED for identity 3 Users row." | tee -a "$LOG"
else
  echo "WARNING: Users.primaryEmail ('$users3_email') does NOT match expected '$IDENTITY_3_EMAIL'. SKIPPING Users delete for identity 3." | tee -a "$LOG"
fi

if $EXECUTE; then
  if $contact3_ok && $identity3_id_ok; then
    echo "-- DELETE: Contact item --" | tee -a "$LOG"
    run "aws dynamodb delete-item --table-name $CONTACT_TABLE --region $REGION --key '{\"contactId\":{\"S\":\"$identity3_contact_id\"}}'"
  fi
  if $users3_ok; then
    echo "-- DELETE: Users item --" | tee -a "$LOG"
    run "aws dynamodb delete-item --table-name $USERS_TABLE --region $REGION --key '{\"id\":{\"S\":\"$IDENTITY_3_USERS_ID\"}}'"
  fi
  echo "-- DELETE: Cognito user --" | tee -a "$LOG"
  cognito_delete_user "$IDENTITY_3_COGNITO_SUB"

  if $identity3_id_ok && [[ "$pr3_count" -gt 0 ]]; then
    echo "-- DELETE (defensive): PatientRecords items ($pr3_count found) --" | tee -a "$LOG"
    sks=$(echo "$pr3_items" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);(j.Items||[]).forEach(it=>console.log(it.sk.S));});")
    while read -r sk; do
      [[ -z "$sk" ]] && continue
      run "aws dynamodb delete-item --table-name $PATIENT_RECORDS_TABLE --region $REGION --key '{\"contactId\":{\"S\":\"$identity3_contact_id\"},\"sk\":{\"S\":\"$sk\"}}'"
    done <<< "$sks"
  fi

  if [[ "$conv3_count" -gt 0 ]]; then
    echo "-- DELETE (defensive): Conversations items ($conv3_count found) --" | tee -a "$LOG"
    echo "$conv3_items" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const j=JSON.parse(d);
  (j.Items||[]).forEach(it=>console.log(JSON.stringify({contactId:it.contactId.S, sk:it.sk.S})));
});" | while read -r line; do
      pk=$(echo "$line" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.contactId);});")
      sk=$(echo "$line" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.sk);});")
      run "aws dynamodb delete-item --table-name $CONVERSATIONS_TABLE --region $REGION --key '{\"contactId\":{\"S\":\"$pk\"},\"sk\":{\"S\":\"$sk\"}}'"
    done
  fi
else
  echo "(dry-run) Would delete (subject to per-row email guard): Contact contactId=$identity3_contact_id (ok=$contact3_ok), Users id=$IDENTITY_3_USERS_ID (ok=$users3_ok), Cognito sub=$IDENTITY_3_COGNITO_SUB, PatientRecords items=$pr3_count, Conversations items=$conv3_count" | tee -a "$LOG"
fi

# ---------------------------------------------------------------------------
# Identity 4: drtj+intaketest@my4mlife.com — PatientRecords ONLY
# ---------------------------------------------------------------------------
echo "" | tee -a "$LOG"
echo "### Identity 4: $IDENTITY_4_LABEL ###" | tee -a "$LOG"

identity4_contact_id="$(derive_contact_id "$IDENTITY_4_EMAIL")"
echo "Computed contactId via uuidv5: $identity4_contact_id (expected: $IDENTITY_4_CONTACTID)" | tee -a "$LOG"

identity4_id_ok=true
if [[ "$identity4_contact_id" != "$IDENTITY_4_CONTACTID" ]]; then
  echo "WARNING: computed contactId for identity 4 ('$identity4_contact_id') does not match expected ('$IDENTITY_4_CONTACTID'). Using the EXPLICITLY GIVEN contactId for lookups, and skipping PatientRecords deletes." | tee -a "$LOG"
  identity4_id_ok=false
fi
# Always operate against the explicitly-given contactId for identity 4, per spec.
identity4_contact_id="$IDENTITY_4_CONTACTID"

echo "-- PRE-CHECK: PatientRecords by contactId --" | tee -a "$LOG"
pr4_items=$(aws dynamodb query --table-name "$PATIENT_RECORDS_TABLE" --region "$REGION" \
  --key-condition-expression "contactId = :pk" \
  --expression-attribute-values "{\":pk\":{\"S\":\"$identity4_contact_id\"}}" 2>&1)
echo "$pr4_items" | tee -a "$LOG"
pr4_count=$(echo "$pr4_items" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log((j.Items||[]).length);}catch(e){console.log(0);}});" || echo 0)
echo "Found $pr4_count PatientRecords item(s) for identity 4." | tee -a "$LOG"

if $EXECUTE; then
  if [[ "$pr4_count" -gt 0 ]]; then
    echo "-- DELETE: PatientRecords items via batch-write-item, chunks of 25 --" | tee -a "$LOG"
    sks=$(echo "$pr4_items" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);(j.Items||[]).forEach(it=>console.log(it.sk.S));});")
    mapfile -t sk_array <<< "$sks"
    chunk=()
    flush_chunk() {
      [[ ${#chunk[@]} -eq 0 ]] && return
      local reqs
      reqs=$(printf '%s\n' "${chunk[@]}" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const sks=d.split('\n').filter(Boolean);
  const reqs=sks.map(sk=>({DeleteRequest:{Key:{contactId:{S:process.argv[1]},sk:{S:sk}}}}));
  console.log(JSON.stringify({['$PATIENT_RECORDS_TABLE']:reqs}));
});" "$identity4_contact_id")
      local tmpfile
      tmpfile=$(mktemp)
      echo "$reqs" > "$tmpfile"
      run "aws dynamodb batch-write-item --region $REGION --request-items file://$tmpfile"
      rm -f "$tmpfile"
      chunk=()
    }
    for sk in "${sk_array[@]}"; do
      [[ -z "$sk" ]] && continue
      chunk+=("$sk")
      if [[ ${#chunk[@]} -eq 25 ]]; then
        flush_chunk
      fi
    done
    flush_chunk
  else
    echo "No PatientRecords items found for identity 4; nothing to delete." | tee -a "$LOG"
  fi
else
  echo "(dry-run) Would delete $pr4_count PatientRecords item(s) for contactId=$identity4_contact_id via batch-write-item." | tee -a "$LOG"
fi

# ---------------------------------------------------------------------------
# VERIFY
# ---------------------------------------------------------------------------
echo "" | tee -a "$LOG"
echo "### VERIFY ###" | tee -a "$LOG"

if ! $EXECUTE; then
  echo "Dry-run mode: verify skipped, no deletes were performed." | tee -a "$LOG"
else
  echo "-- Re-checking Identity 1 --" | tee -a "$LOG"
  v_users1=$(aws dynamodb get-item --table-name "$USERS_TABLE" --region "$REGION" --key "{\"id\":{\"S\":\"$IDENTITY_1_USERS_ID\"}}" 2>&1)
  echo "$v_users1" | tee -a "$LOG"
  if echo "$v_users1" | grep -q '"Item"'; then
    echo "UNEXPECTED: Users row for identity 1 still present." | tee -a "$LOG"
    REMAINING_UNEXPECTED=1
  fi
  v_conv1=$(aws dynamodb query --table-name "$CONVERSATIONS_TABLE" --region "$REGION" --key-condition-expression "contactId = :pk" --expression-attribute-values "{\":pk\":{\"S\":\"$IDENTITY_1_CONVERSATIONS_PK\"}}" 2>&1)
  echo "$v_conv1" | tee -a "$LOG"
  v_conv1_count=$(echo "$v_conv1" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log((j.Items||[]).length);}catch(e){console.log(0);}});" || echo 0)
  if [[ "$v_conv1_count" -gt 0 ]]; then
    echo "UNEXPECTED: $v_conv1_count Conversations row(s) for identity 1 still present." | tee -a "$LOG"
    REMAINING_UNEXPECTED=1
  fi
  cognito_check_user "$IDENTITY_1_COGNITO_SUB" && { echo "UNEXPECTED: Cognito user for identity 1 still present."; REMAINING_UNEXPECTED=1; } | tee -a "$LOG" || echo "Cognito user for identity 1 confirmed gone (or was already absent)." | tee -a "$LOG"

  echo "-- Re-checking Identity 2 --" | tee -a "$LOG"
  v_users2=$(aws dynamodb get-item --table-name "$USERS_TABLE" --region "$REGION" --key "{\"id\":{\"S\":\"$IDENTITY_2_USERS_ID\"}}" 2>&1)
  echo "$v_users2" | tee -a "$LOG"
  if echo "$v_users2" | grep -q '"Item"'; then
    echo "UNEXPECTED: Users row for identity 2 still present." | tee -a "$LOG"
    REMAINING_UNEXPECTED=1
  fi
  cognito_check_user "$IDENTITY_2_COGNITO_SUB" && { echo "UNEXPECTED: Cognito user for identity 2 still present."; REMAINING_UNEXPECTED=1; } | tee -a "$LOG" || echo "Cognito user for identity 2 confirmed gone (or was already absent)." | tee -a "$LOG"

  echo "-- Re-checking Identity 3 --" | tee -a "$LOG"
  v_contact3=$(aws dynamodb get-item --table-name "$CONTACT_TABLE" --region "$REGION" --key "{\"contactId\":{\"S\":\"$identity3_contact_id\"}}" 2>&1)
  echo "$v_contact3" | tee -a "$LOG"
  if echo "$v_contact3" | grep -q '"Item"'; then
    echo "UNEXPECTED: Contact row for identity 3 still present." | tee -a "$LOG"
    REMAINING_UNEXPECTED=1
  fi
  v_users3=$(aws dynamodb get-item --table-name "$USERS_TABLE" --region "$REGION" --key "{\"id\":{\"S\":\"$IDENTITY_3_USERS_ID\"}}" 2>&1)
  echo "$v_users3" | tee -a "$LOG"
  if echo "$v_users3" | grep -q '"Item"'; then
    echo "UNEXPECTED: Users row for identity 3 still present." | tee -a "$LOG"
    REMAINING_UNEXPECTED=1
  fi
  cognito_check_user "$IDENTITY_3_COGNITO_SUB" && { echo "UNEXPECTED: Cognito user for identity 3 still present."; REMAINING_UNEXPECTED=1; } | tee -a "$LOG" || echo "Cognito user for identity 3 confirmed gone (or was already absent)." | tee -a "$LOG"
  v_pr3=$(aws dynamodb query --table-name "$PATIENT_RECORDS_TABLE" --region "$REGION" --key-condition-expression "contactId = :pk" --expression-attribute-values "{\":pk\":{\"S\":\"$identity3_contact_id\"}}" 2>&1)
  echo "$v_pr3" | tee -a "$LOG"
  v_pr3_count=$(echo "$v_pr3" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log((j.Items||[]).length);}catch(e){console.log(0);}});" || echo 0)
  if [[ "$v_pr3_count" -gt 0 ]]; then
    echo "UNEXPECTED: $v_pr3_count PatientRecords row(s) for identity 3 still present." | tee -a "$LOG"
    REMAINING_UNEXPECTED=1
  fi

  echo "-- Re-checking Identity 4 --" | tee -a "$LOG"
  v_pr4=$(aws dynamodb query --table-name "$PATIENT_RECORDS_TABLE" --region "$REGION" --key-condition-expression "contactId = :pk" --expression-attribute-values "{\":pk\":{\"S\":\"$identity4_contact_id\"}}" 2>&1)
  echo "$v_pr4" | tee -a "$LOG"
  v_pr4_count=$(echo "$v_pr4" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);console.log((j.Items||[]).length);}catch(e){console.log(0);}});" || echo 0)
  if [[ "$v_pr4_count" -gt 0 ]]; then
    echo "UNEXPECTED: $v_pr4_count PatientRecords row(s) for identity 4 still present." | tee -a "$LOG"
    REMAINING_UNEXPECTED=1
  fi
fi

echo "" | tee -a "$LOG"
echo "=== cleanup-test-accounts.sh run finished $(date -u +%FT%TZ) (EXECUTE=$EXECUTE, REMAINING_UNEXPECTED=$REMAINING_UNEXPECTED) ===" | tee -a "$LOG"

if $EXECUTE && [[ "$REMAINING_UNEXPECTED" -ne 0 ]]; then
  exit 1
fi
exit 0
