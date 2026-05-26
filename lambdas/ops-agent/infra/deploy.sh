#!/usr/bin/env bash
# Deploy ops-agent Lambda — idempotent
set -euo pipefail

FUNCTION_NAME="my4mlife-ops-agent"
ROLE_NAME="my4mlife-ops-agent-role"
REGION="us-east-2"
RUNTIME="nodejs20.x"
HANDLER="handler.handler"
TIMEOUT=300
MEMORY=1024
BEDROCK_MODEL_ID="us.anthropic.claude-sonnet-4-5-20250929-v1:0"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Build"
pnpm install --frozen-lockfile
pnpm build
cd dist && zip -q -FS handler.zip handler.js && cd ..

echo "==> Ensure IAM role"
if ! aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  aws iam create-role --role-name "$ROLE_NAME" \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
  aws iam attach-role-policy --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  echo "    waiting for role propagation..."; sleep 10
fi

echo "==> Apply IAM inline policy"
POLICY_DOC=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockInvoke",
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": [
        "arn:aws:bedrock:us-east-2:${ACCOUNT_ID}:inference-profile/us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        "arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0",
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-5-*"
      ]
    },
    {
      "Sid": "DynamoDBOps",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/Events",
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/EventRSVPs",
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/EventReminders",
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/Contact",
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/AgentRuns",
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/ApprovalRequests"
      ]
    },
    {
      "Sid": "LambdaInvoke",
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": [
        "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:my4mlife-zoom-ops",
        "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:my4mlife-email-sender",
        "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:my4mlife-approval-queue-dispatch"
      ]
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/aws/lambda/${FUNCTION_NAME}:*"
    }
  ]
}
EOF
)
aws iam put-role-policy --role-name "$ROLE_NAME" \
  --policy-name "ops-agent-policy" \
  --policy-document "$POLICY_DOC" >/dev/null

echo "==> Deploy function"
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
  aws lambda update-function-code --function-name "$FUNCTION_NAME" --region "$REGION" \
    --zip-file "fileb://dist/handler.zip" >/dev/null
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"
  aws lambda update-function-configuration --function-name "$FUNCTION_NAME" --region "$REGION" \
    --runtime "$RUNTIME" --handler "$HANDLER" \
    --timeout "$TIMEOUT" --memory-size "$MEMORY" \
    --environment "Variables={BEDROCK_MODEL_ID=${BEDROCK_MODEL_ID}}" >/dev/null
else
  aws lambda create-function --function-name "$FUNCTION_NAME" --region "$REGION" \
    --runtime "$RUNTIME" --role "$ROLE_ARN" --handler "$HANDLER" \
    --timeout "$TIMEOUT" --memory-size "$MEMORY" \
    --environment "Variables={BEDROCK_MODEL_ID=${BEDROCK_MODEL_ID}}" \
    --zip-file "fileb://dist/handler.zip" >/dev/null
fi
aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"

echo "==> Wire EventBridge weekly rule: ops-agent-weekly-schedule"
# cron(0 13 ? * MON *) = every Monday 13:00 UTC = 9:00 AM ET (EDT, UTC-4).
# During EST (UTC-5, Nov–Mar) this fires at 8:00 AM ET.
# Approximation: 9 AM ET in summer, 8 AM ET in winter. Adjust if needed.
WEEKLY_RULE="ops-agent-weekly-schedule"
WEEKLY_INPUT='{"intent":"Schedule this week'\''s Protégé weekly Zoom. Target: Wednesday 7:00 PM Eastern Time, 60 minutes, recurring weekly cohort. Steps: (1) Check Events table for any '\''zoom-weekly'\'' event with startsAt in the next 7 days. If one exists, stop and report. (2) Otherwise, call zoom_create_meeting with topic '\''My4MLife Protégé Weekly — gut, brain, accountability'\'', start_time set to the next Wednesday 7 PM ET, duration 60, type 8 (recurring weekly), settings auto_recording=cloud join_before_host=false mute_upon_entry=true. (3) Write the Events row (eventId=uuid, type='\''zoom-weekly'\'', title=topic, startsAt, durationMin=60, joinUrl from Zoom response, status='\''scheduled'\''). (4) Scan Contact for lifecycleStage='\''protege'\'' (up to 200 for v1). (5) For each Protégé, draft a 5-sentence personal invite email referencing their personalWhy (if present) and accountabilityTarget (if present). Read these via ddb_get_item on Contact then look in workbookJson if needed; if absent, use the generic invite copy. (6) Call request_approval ONCE with summary='\''Send invites for this week'\''s Zoom to N Protégés'\'' and preview containing the full list of names + sample of one invite. Stop after request_approval — the dispatch will happen in a follow-up agent run after TJ approves.","trigger":"schedule","context":{"weeklyJob":"schedule-protege-zoom"}}'

aws events put-rule --name "$WEEKLY_RULE" --region "$REGION" \
  --schedule-expression "cron(0 13 ? * MON *)" \
  --state ENABLED >/dev/null

FN_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}"

aws lambda remove-permission --function-name "$FUNCTION_NAME" --region "$REGION" \
  --statement-id eventbridge-weekly-schedule >/dev/null 2>&1 || true
aws lambda add-permission --function-name "$FUNCTION_NAME" --region "$REGION" \
  --statement-id eventbridge-weekly-schedule \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn "arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/${WEEKLY_RULE}" >/dev/null

aws events put-targets --rule "$WEEKLY_RULE" --region "$REGION" \
  --targets "[{\"Id\":\"ops-agent-weekly-target\",\"Arn\":\"${FN_ARN}\",\"Input\":$(echo "$WEEKLY_INPUT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}]" >/dev/null

echo "==> Wire EventBridge post-event rule: ops-agent-post-event-cron"
POST_EVENT_RULE="ops-agent-post-event-cron"
POST_EVENT_INPUT='{"intent":"Process completed Zoom events. Steps: (1) ddb_scan Events where status='\''scheduled'\'' AND startsAt+durationMin*60*1000 < now (the meeting ended in the past). If none, write a one-line summary '\''no post-event work'\'' and stop. (2) For each completed-but-unprocessed Event: (a) call zoom_get_attendance with meetingId=event.zoomMeetingId. (b) For each participant returned: ddb_query EventRSVPs by eventId — match Contacts by email (Contact.email == participant.user_email, case-insensitive). For matched Contacts that have an RSVP row, ddb_update_item EventRSVPs to set attended=true, joinTimeUtc, leaveTimeUtc, attendanceMinutes. For attended participants WITHOUT an RSVP, write a new EventRSVPs row with status='\''walkin'\'', attended=true. (c) ddb_update_item Events: status='\''completed'\'', updatedAt=now. (3) After all completed events are processed in this run, scan EventRSVPs for rows where status='\''yes'\'' AND attended=false AND the parent event'\''s status just became '\''completed'\''. For each: ddb_get_item Contact to read personalWhy + accountabilityTarget. Draft a 5-sentence personal '\''we missed you'\'' email referencing their accountability target by name (if present) and tying back to their personalWhy (if present). If both are absent, use generic copy. (4) If there are ANY missed-you drafts, call request_approval ONCE with summary '\''Send N we-missed-you emails to Protégés who skipped this week'\''s Zoom'\'' and preview containing the list of names + sample email. Stop after request_approval. (5) If a follow-up run sees this approval status='\''approved'\'', dispatch the emails via send_email_via_email_sender and write Touchpoints rows.","trigger":"schedule","context":{"cron":"post-event-cron"}}'

aws events put-rule --name "$POST_EVENT_RULE" --region "$REGION" \
  --schedule-expression "rate(30 minutes)" \
  --state ENABLED >/dev/null

aws lambda remove-permission --function-name "$FUNCTION_NAME" --region "$REGION" \
  --statement-id eventbridge-post-event-cron >/dev/null 2>&1 || true
aws lambda add-permission --function-name "$FUNCTION_NAME" --region "$REGION" \
  --statement-id eventbridge-post-event-cron \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn "arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/${POST_EVENT_RULE}" >/dev/null

aws events put-targets --rule "$POST_EVENT_RULE" --region "$REGION" \
  --targets "[{\"Id\":\"ops-agent-post-event-target\",\"Arn\":\"${FN_ARN}\",\"Input\":$(echo "$POST_EVENT_INPUT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}]" >/dev/null

echo "==> Done: $FUNCTION_NAME deployed to $REGION + weekly EventBridge rule $WEEKLY_RULE + post-event rule $POST_EVENT_RULE"
