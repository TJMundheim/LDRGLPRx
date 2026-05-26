# My4MLife Operating Model

Locked **2026-05-25** by TJ. The architectural doctrine for an AI-agent-operated business.

## Three principles

### 1. One source of truth

Every fact about the business lives in our DynamoDB. Customers, orders, events, RSVPs, support tickets, content, agent decisions, vendor responses — all of it. No business state lives only in Stripe, only in Zoom, only in Calendly, only in Mailchimp.

If it happened, our DB knows about it.

### 2. Tools, not platforms

Vendors are **functions an agent calls**, not **places where data lives**.

- Stripe is a tool: agent calls `createCharge`, writes the result back to our DB.
- Zoom is a tool: agent calls `createMeeting`, writes the meeting record into our `Events` table.
- Mailgun is a tool: agent calls `sendEmail`, writes the send-log to our DB.
- Twilio / SNS / SES are tools: agent calls `sendSMS` or `sendEmail`, logs every dispatch.

We keep vendors for things that are load-bearing infrastructure no one would rebuild — payment rails, video calls, identity, hosting, model providers, model APIs. Everything else (scheduling, RSVPs, reminders, support workflows, content publishing, retention campaigns) is logic the agent owns end-to-end, reading and writing to our DB and calling vendor tools as needed.

**The forbidden pattern:** signing up for a SaaS that holds business data only on their servers (e.g. Calendly holding our RSVPs; HubSpot holding our customer relationships; Mailchimp holding our subscriber lists). If we adopt a SaaS, its job is to be a tool — and any data it produces about our business gets mirrored into our DDB.

### 3. Agents with bounded authority

A small set of specialized agents, each with a defined scope and a defined approval line.

| Agent | Scope | Autonomous | Needs TJ approval |
|---|---|---|---|
| Engineering | Code, deploys, infra | All reversible changes | Schema migrations, prod data deletes, new vendor contracts |
| Marketing | Page copy, ads, blog | Drafts + low-spend tests | Mass emails to existing members, ad budget over $X |
| Support | Member questions, account issues | Standard responses + refunds under $X | Bans, large refunds, escalations |
| Ops | Schedule Zooms, send reminders, manage logistics | Everything routine | New recurring events, cancellations, time-shift on schedule |
| Sales / Growth | Outreach, follow-ups, funnel ops | Personalized 1:1 follow-ups | Cohort-wide pricing changes, partnerships |

Each agent has read access to all of DDB and a defined subset of tools (Lambdas + vendor APIs). The approval line is the only thing that gets configured per agent.

## TJ operates at four touch points only

1. **Intent** — "Launch BiomeAxisForge by June 15" / "Run a re-engagement campaign for lapsed Protégés." Orchestrator translates intent into agent tasks.
2. **Approvals** — a queue comes via email (v1) or SMS (v2), one item at a time with context. Tap-to-approve.
3. **Daily digest** — once a day: what agents did, what they decided autonomously, what's pending approval, what's flagged. 5-minute read.
4. **Principle updates** — change of mind or new learning ("never recommend X to Y" / "we no longer require Z") gets written to memory once; every agent picks it up.

TJ does not review every Zoom invite, RSVP, or support ticket. Agents act; only anomalies escalate.

## Core tables

Every new domain extends the data model in DDB. Current foundation tables:

- `Contact` — every person who's interacted with us (lead → Protégé → customer → Graduate / banned)
- `Orders`, `Subscriptions`, `Touchpoints` — Stripe pipeline state
- `Conversations` — chat history with AI concierge
- `Events`, `EventRSVPs`, `EventReminders` — Zoom + future event ops
- `AgentRuns` — every agent invocation, what it decided, what tools it called, what it wrote
- `ApprovalRequests` — pending + completed TJ approvals
- `RetryState` — Stripe event retry tracking

When an agent needs a new entity type, it adds the table (via `infra/dynamodb/deploy.sh`, idempotent), uses it, documents it here.

## Forbidden anti-patterns

- "Quick adoption" of a SaaS dashboard where data only lives there
- Hardcoding business logic into vendor UI configuration (Calendly workflows, Mailchimp segments, Klaviyo flows) — that logic belongs in our agents
- Agent tools that don't write their outcomes back to DDB
- Skipping the AgentRuns log for "small" autonomous actions
- Asking TJ to confirm reversible actions (the approval line exists for a reason)
- New vendor signups without an explicit decision: is it infrastructure, or is it a tool with data we'll mirror?
