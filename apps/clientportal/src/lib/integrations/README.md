# Integrations — Stubs

These modules define the typed contract for third-party integrations. Each
function currently throws `Not implemented: <reason>` — they exist so the rest
of the app can import real types and be wired up without vendor lock-in.

| File           | Owner decision pending                          |
|----------------|-------------------------------------------------|
| `telemed.ts`   | Provider: Healthie vs. Spruce vs. direct iframe |
| `payments.ts`  | Stripe account + price ids                      |
| `auth.ts`      | Supabase Auth (magic link + passkey) rollout    |

When implementing, preserve the exported function signatures — call sites across
the portal depend on them. Do not add new thrown errors; replace the stubs with
real impls and keep the return shapes stable.
