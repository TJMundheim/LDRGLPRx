# ops-agent Lambda

## Overview

`my4mlife-ops-agent` is the autonomous operations agent for My4MLife. It receives an `intent` string (either from a scheduled EventBridge rule or a manual invoke) and runs a Bedrock-powered agentic loop (Claude Sonnet via `us.anthropic.claude-sonnet-4-5-20250929-v1:0`) to complete the task end-to-end. Available tools: `ddb_get_item`, `ddb_put_item`, `ddb_update_item`, `ddb_query`, `ddb_scan`, `zoom_create_meeting`, `invoke_email_sender`, `request_approval`. Every run is logged to the `AgentRuns` DynamoDB table (PK `runId`, GSI `byAgent` on `agentName` + `startedAt`). When the agent reaches a decision that requires TJ's sign-off it calls `request_approval` and halts — a follow-up run resumes the work after approval.

## Manual test invoke

Once the Bedrock use-case form has been approved and the model is accessible:

```bash
aws lambda invoke --function-name my4mlife-ops-agent --region us-east-2 \
  --cli-binary-format raw-in-base64-out \
  --payload '{"intent":"test: just say hello","trigger":"intent"}' /tmp/out.json
cat /tmp/out.json
```

## Check AgentRuns log for a recent run

```bash
aws dynamodb query \
  --table-name AgentRuns \
  --index-name byAgent \
  --key-condition-expression "agentName = :a" \
  --expression-attribute-values '{":a":{"S":"ops"}}' \
  --scan-index-forward false \
  --limit 5 \
  --region us-east-2 \
  | jq '.Items[] | {runId: .runId.S, status: .status.S, startedAt: .startedAt.S, summary: .summary.S}'
```

## Adding new tools

Tools are registered in the dispatch table in `src/tools.ts`. To add a new tool:

1. Add a `ToolSpec` entry to the `TOOLS` array (name, description, input_schema for Bedrock).
2. Add a matching case in the `dispatchTool(name, input)` async function.
3. Grant the Lambda role any additional IAM permissions in `infra/deploy.sh`.
4. Re-run `bash infra/deploy.sh` to deploy.

## Scheduled trigger

`ops-agent-weekly-schedule` fires every Monday at 13:00 UTC (~9 AM ET EDT) to schedule the week's Protégé Zoom. Defined and deployed via `infra/deploy.sh`.
