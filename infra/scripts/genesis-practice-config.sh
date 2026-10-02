#!/bin/bash
set -euo pipefail

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
  "clinician": "Oscar Molina",
  "practice": "MD Specialty Group",
  "practice_phone": "817-995-3103",
  "payment_email": "drtj@mdspecialtygroup.com",
  "billing": "6406 Lago Vista Drive, Benbrook, TX 76132",
  "placer": "TJ Mundheim",
  "placer_phone": "817-995-3103",
  "salesrep": "TJ Mundheim",
  "physician_signature": "Electronically signed",
  "microneedling_per_order": "1"
}
EOF
)

# Validate JSON
if ! echo "$JSON" | python3 -m json.tool > /dev/null 2>&1; then
  echo "❌ JSON validation failed"
  exit 1
fi

echo "Mode: $MODE"
echo "---"
echo "JSON payload:"
echo "$JSON" | python3 -m json.tool
echo "---"
echo "Command:"
echo "aws ssm put-parameter --name '/my4mlife/genesis/practice' --value '$JSON' --type String --overwrite --region us-east-2"
echo "---"

if [[ "$DRY_RUN" == false ]]; then
  echo "Writing parameter to SSM..."
  aws ssm put-parameter \
    --name '/my4mlife/genesis/practice' \
    --value "$JSON" \
    --type String \
    --overwrite \
    --region us-east-2
  echo "✓ Parameter written successfully"
else
  echo "(No write performed; use --apply to commit)"
fi
