# coach-proxy Lambda

Thin AWS Lambda that proxies Anthropic Messages API calls from the client portal, keeping the API key server-side.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic secret key (`sk-ant-…`) |
| `PORTAL_ORIGIN` | No | Allowed CORS origin (defaults to `*`) |

## Build

```sh
pnpm install
pnpm build
# output: dist/handler.js
```

## Deploy

```sh
bash infra/deploy.sh
```

See `infra/deploy.sh` — AWS commands are commented pending IaC wiring.

## Request shape

```json
{ "system": "...", "messages": [{"role":"user","content":"..."}], "model": "claude-sonnet-4-6", "maxTokens": 1024 }
```

## Response shape

```json
{ "content": "..." }
```
