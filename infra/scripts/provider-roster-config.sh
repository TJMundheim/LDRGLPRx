#!/bin/bash
# Provider roster for Push Patch approvals — SSM String /my4mlife/providers.
# Dry run by default. --apply writes the parameter (LIVE). Do not run --apply without TJ's sign-off.
set -euo pipefail

PARAM_NAME="/my4mlife/providers"
REGION="us-east-2"
DRY_RUN=true
MODE="--dry-run (default)"

if [[ "${1:-}" == "--apply" ]]; then
  DRY_RUN=false
  MODE="--apply (LIVE)"
elif [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

# Build JSON using heredoc
JSON=$(cat <<'EOF'
{
  "providers": [
    {
      "id": "molina",
      "name": "Oscar Molina",
      "credentials": "MD",
      "inbox": "drtj@mdspecialtygroup.com",
      "default": true
    }
  ]
}
EOF
)

# Validate JSON, then the roster rules: non-empty unique ids, exactly one default, non-empty names
if ! echo "$JSON" | python3 -m json.tool > /dev/null 2>&1; then
  echo "ERROR: JSON validation failed"
  exit 1
fi

if ! echo "$JSON" | python3 -c '
import json, sys
roster = json.load(sys.stdin)["providers"]
if not roster:
    sys.exit("roster is empty")
ids = [p.get("id", "") for p in roster]
if any(not i for i in ids):
    sys.exit("every provider needs a non-empty id")
if len(set(ids)) != len(ids):
    sys.exit("provider ids must be unique")
if sum(1 for p in roster if p.get("default") is True) != 1:
    sys.exit("exactly one provider must have default: true")
if any(not str(p.get("name", "")).strip() for p in roster):
    sys.exit("every provider needs a non-empty name")
'; then
  echo "ERROR: roster validation failed"
  exit 1
fi

echo "Mode: $MODE"
echo "---"
echo "JSON payload:"
echo "$JSON" | python3 -m json.tool
echo "---"
echo "Command:"
echo "aws ssm put-parameter --name '$PARAM_NAME' --value '<payload above>' --type String --overwrite --region $REGION"
echo "---"

if [[ "$DRY_RUN" == false ]]; then
  echo "Writing parameter to SSM..."
  aws ssm put-parameter \
    --name "$PARAM_NAME" \
    --value "$JSON" \
    --type String \
    --overwrite \
    --region "$REGION"
  echo "Parameter written successfully"
else
  echo "(dry run: no write performed; use --apply to commit)"
fi
