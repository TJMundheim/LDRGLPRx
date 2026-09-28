#!/usr/bin/env bash
# One-off RESTORE for bryan@bryanshoemaker.com after the 2026-09-28 cleanup incident.
# 1) copies his PatientRecords items from the PITR restore table back into PatientRecords
# 2) rebuilds his Contact row from the surviving Users row
# Read-only until you pass --execute. Never touches any other contactId.
set -euo pipefail
REGION=us-east-2
CID="73c97bdd-a25a-56d4-8d3f-02e9512e177a"           # uuidv5(bryan@bryanshoemaker.com)
USERS_ID="013bd5d0-e051-705b-3484-efa80941d2d8"      # his Cognito sub / Users.id
SRC="PatientRecords-restore-20260928"
EXECUTE=false; [[ "${1:-}" == "--execute" ]] && EXECUTE=true
TMP="$(mktemp -d)"

st="$(aws dynamodb describe-table --table-name "$SRC" --region $REGION --query 'Table.TableStatus' --output text)"
echo "Restore table $SRC status: $st"
[[ "$st" == "ACTIVE" ]] || { echo "Not ACTIVE yet — wait a few minutes and re-run."; exit 2; }

aws dynamodb query --table-name "$SRC" --region $REGION \
  --key-condition-expression "contactId = :c" --expression-attribute-values "{\":c\":{\"S\":\"$CID\"}}" \
  --output json > "$TMP/items.json"
n="$(python3 -c "import json;print(len(json.load(open('$TMP/items.json'))['Items']))")"
echo "Found $n PatientRecords item(s) for Bryan in the restore table:"
python3 -c "import json;[print('  -',i['sk']['S']) for i in json.load(open('$TMP/items.json'))['Items']]"
[[ "$n" -ge 1 ]] || { echo "Nothing to restore (expected ~6)."; exit 3; }

aws dynamodb get-item --table-name Users --region $REGION --key "{\"id\":{\"S\":\"$USERS_ID\"}}" --output json > "$TMP/users.json"
python3 - "$TMP" "$CID" <<'PY'
import json,sys
T,cid=sys.argv[1:]
u=json.load(open(f"{T}/users.json")).get("Item")
assert u and u["primaryEmail"]["S"]=="bryan@bryanshoemaker.com", "Users row missing or wrong email — STOP"
c={"contactId":{"S":cid},"email":{"S":"bryan@bryanshoemaker.com"},"firstName":u["firstName"],"lifecycleStage":{"S":"protege"},
   "createdAt":u["createdAt"],"updatedAt":{"S":"2026-09-28T15:30:00.000Z"},
   "restoredAt":{"S":"2026-09-28T15:30:00.000Z"},"restoredFrom":{"S":"Users row after 2026-09-28 cleanup incident"}}
for k in ("phone","auditCompletedAt","auditTop3","intakeAnswers","consent","consentedAt"):
    if k in u: c[k]=u[k]
if "consent" in u: c["aiCommsConsent"]=u["consent"]; c["protegeConsent"]=u["consent"]
json.dump({"Item":c},open(f"{T}/contact.json","w"))
print("Contact row rebuilt with fields:",", ".join(sorted(c)))
PY

if ! $EXECUTE; then echo; echo "DRY RUN. Re-run with --execute to write the $n items + Contact row."; exit 0; fi

python3 -c "
import json;items=json.load(open('$TMP/items.json'))['Items']
for k,i in enumerate(items): json.dump(i,open('$TMP/item%d.json'%k,'w'))
" >/dev/null
for f in "$TMP"/item*.json; do
  aws dynamodb put-item --table-name PatientRecords --region $REGION --item "file://$f" --condition-expression "attribute_not_exists(sk)" \
    && echo "restored $(python3 -c "import json;print(json.load(open('$f'))['sk']['S'])")"
done
python3 -c "import json;json.dump(json.load(open('$TMP/contact.json'))['Item'],open('$TMP/contact-item.json','w'))"
aws dynamodb put-item --table-name Contact --region $REGION --item "file://$TMP/contact-item.json" \
  --condition-expression "attribute_not_exists(contactId)" && echo "restored Contact row"

echo; echo "VERIFY:"
aws dynamodb query --table-name PatientRecords --region $REGION --key-condition-expression "contactId = :c" \
  --expression-attribute-values "{\":c\":{\"S\":\"$CID\"}}" --query 'Items[].sk.S' --output text
aws dynamodb get-item --table-name Contact --region $REGION --key "{\"contactId\":{\"S\":\"$CID\"}}" --query 'Item.[email.S,lifecycleStage.S]' --output text
echo "Done. When satisfied, delete the restore table: aws dynamodb delete-table --table-name $SRC --region $REGION"
