# Cognitive Training Tool References — Search Results

## Summary
Found **active references** to cognitive training tools in the current codebase. No evidence of removal in git history.

## Current References (Working Tree)

### 1. `/apps/clientportal/src/lib/content/cognitive.ts` (ACTIVE)
- **Dual N-Back (iOS)** — Link: `https://apps.apple.com/us/app/dual-n-back/id507031600`
- **Duolingo** — Link: `https://duolingo.com`
- **Lumosity** — Link: `https://lumosity.com`
- **Protocol**: "3–4 sessions per week of dual n-back, 15–20 minutes each" + 30 min daily reading

### 2. `/apps/clientportal/src/lib/content/factors.ts`
- **Factor 07 (Cognitive)**: References "dual n-back" and "Lumosity" in resource list
- Tools mention: "Dual n-back is the only cognitive training with peer-reviewed transfer to real-world intelligence"
- Resource guidance: "The combination of dual n-back + long-form reading is the most evidence-backed cognitive protocol available"

### 3. `/apps/clientportal/src/lib/renderer.ts`
- **Line 770**: "Download the dual n-back app and complete your first session before Saturday."
- **Line 956**: Week 4 tracker: "Continue dual n-back 3–4× per week."
- **Line 1047**: Content pillar: "Cognitive practice — dual n-back and reading schedule"

### 4. `/apps/clientportal/src/lib/coach/prompts.ts`
- **Line 26**: Month 3 coaching: "intensifying cognitive training exercises" in peak protocol phase

## Git History

**Initial commit**: `90e6be6f` (2026-04-19) — "Port client portal to Svelte 5 + TS..."
- This was the first introduction of `cognitive.ts` with Lumosity and dual n-back
- No prior history; no removals detected

## Not Found
- BrainHQ, Peak, Elevate, CogniFit, Cambridge Brain Games, Happy Neuron, Mensa Workout, Brainwell — **no references**

## Note
The tools are production-ready in the current codebase — no migration or cleanup needed unless TJ explicitly requests removal.
