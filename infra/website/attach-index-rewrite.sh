#!/usr/bin/env bash
set -euo pipefail

# Attaches a CloudFront Function that rewrites /foo and /foo/ to /foo/index.html
# so subdirectory routes resolve to their static index.html in S3.

REGION="us-east-1"
PROFILE="default"
AWS="aws --profile $PROFILE --region $REGION"
DIST_ID="E3J19LI34BC2VR"
FN_NAME="my4mlife-index-rewrite"

log() { echo "==> $*"; }

cat > /tmp/index-rewrite.js <<'EOF'
function handler(event) {
  var req = event.request;
  var uri = req.uri;
  if (uri.endsWith('/')) {
    req.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    req.uri = uri + '/index.html';
  }
  return req;
}
EOF

log "Ensuring CloudFront Function $FN_NAME..."
if $AWS cloudfront describe-function --name "$FN_NAME" >/dev/null 2>&1; then
  ETAG=$($AWS cloudfront describe-function --name "$FN_NAME" --query "ETag" --output text)
  $AWS cloudfront update-function --name "$FN_NAME" \
    --function-config "Comment=index rewrite,Runtime=cloudfront-js-2.0" \
    --function-code fileb:///tmp/index-rewrite.js \
    --if-match "$ETAG" >/dev/null
else
  $AWS cloudfront create-function --name "$FN_NAME" \
    --function-config "Comment=index rewrite,Runtime=cloudfront-js-2.0" \
    --function-code fileb:///tmp/index-rewrite.js >/dev/null
fi

ETAG=$($AWS cloudfront describe-function --name "$FN_NAME" --query "ETag" --output text)
log "Publishing function..."
$AWS cloudfront publish-function --name "$FN_NAME" --if-match "$ETAG" >/dev/null

FN_ARN=$($AWS cloudfront describe-function --name "$FN_NAME" --query "FunctionSummary.FunctionMetadata.FunctionARN" --output text)
log "Function ARN: $FN_ARN"

log "Fetching distribution config..."
$AWS cloudfront get-distribution-config --id "$DIST_ID" > /tmp/dist.json
DIST_ETAG=$(python3 -c "import json; print(json.load(open('/tmp/dist.json'))['ETag'])")
python3 <<PY
import json
d = json.load(open('/tmp/dist.json'))
cfg = d['DistributionConfig']
cfg['DefaultCacheBehavior']['FunctionAssociations'] = {
  'Quantity': 1,
  'Items': [{'FunctionARN': '$FN_ARN', 'EventType': 'viewer-request'}]
}
json.dump(cfg, open('/tmp/dist-config.json','w'))
PY

log "Updating distribution..."
$AWS cloudfront update-distribution --id "$DIST_ID" \
  --distribution-config file:///tmp/dist-config.json \
  --if-match "$DIST_ETAG" >/dev/null

log "Done. Distribution will redeploy (~5-10 min)."
