# Voice & Brand Brief — "Begin with the End in Mind"

**Read this before drafting any chapter.** This is the shared briefing for every chapter agent.

## The book

- **Title:** *Begin with the End in Mind*
- **Tagline:** *Don't lose your identity. You still have a choice.*
- **Author:** Dr. TJ Mundheim, DC — for My4MLife
- **Audience:** Men aged ~50-65 in their peak-power decade — business owners, executives, fathers, husbands. Successful. Privately afraid of cognitive decline. NOT framed as "active grandpa" — framed as men still leading, still building, still chosen.
- **Length target overall:** 150-180 pages. **Per chapter target: 2,500-3,200 words (~8-10 book pages).** Shorter for Part V sections (1,000-1,500 words each).
- **Format:** Prose narrative, not bulletpoint dump. Subheads okay (3-5 per chapter). Pull-quotes welcomed. Real-world specificity over abstract claims.

## The 4M framework — the spine

Mind is the destination. Muscle, Mitigate, and Motivate are the three pillars that protect it.

- **Mind** — cognitive healthspan. What we're protecting. Both the start and the end of the cycle.
- **Mitigate** — *"Stop hurting yourself first. Then add what works."* The pillar that removes the chronic insults driving neuroinflammation (gut, sleep, environment, hormones, ED canary, substance use).
- **Muscle** — *"Strong body, sharp mind. Resistance training is neuroprotection."* The engine — nutrition, weight, GLP-1, strength, sarcopenia, pain management.
- **Motivate** — *"What sustains the work — and what closes the loop."* The why — purpose, identity, accountability, structural enablers.

The framework one-liner to anchor (from `website/src/pages/pillars/mind.astro:37`):

> "Mind is both the start and the end of the 4M cycle. Begin with the end in mind. Every other pillar serves this destination. Muscle builds the physical infrastructure the brain requires. Mitigate removes the chronic insults driving neuroinflammation. Motivate sustains the compliance that makes the other three work. All roads lead back here."

## Voice — Dr. TJ

- **First-person, conversational, direct.** No corporate hedging. "I" + "you" + "we" freely.
- **Clinical depth without jargon.** When a technical term is required (e.g., glymphatic, endothelial, vagal), define it on first use in one sentence then move on.
- **Pragmatic urgency, not panic.** "You still have a choice" energy — the fear is real, but agency is the actual subject.
- **Specific over abstract.** Numbers and mechanisms beat slogans. "Penile arteries are 1–2 mm; coronary arteries are 3–4 mm" beats "ED is a warning sign."
- **No condescension.** Reader is a 55-year-old successful man, not a patient.
- **Authority by experience.** Use "in my practice," "I've watched men," "the patients who get this right" — earned, not borrowed.
- **No emojis.** No "Let's dive in!" or other coach-speak. No exclamation points except at moments of genuine emphasis.
- **Disclaimer-aware but not legalistic.** This is education, not prescription. Trust the reader to know that.

## Required recurring phrases (use freely; do not paraphrase)

- *"Begin with the end in mind"* — the tagline, the title. Use as recurring anchor.
- *"Don't lose your identity. You still have a choice."* — the book's sub-promise.
- *"Eliminate the insulting behavior"* — the Mitigate frame. Use whenever talking about what to STOP doing.
- *"Mind is the destination"* / *"what we're protecting"* — used wherever 4M is referenced.
- *"The gut-brain seal"* / *"NS = NeuroSeal"* — the Biome NS product line's required positioning.
- *"ED is the canary in the coal mine"* — the ED chapter's central frame.
- *"Two Paths to Act"* — when explaining OTC vs Rx options.
- *"Stop hurting yourself first. Then add what works."* — Mitigate's hero line.
- *"Strong body, sharp mind. Resistance training is neuroprotection."* — Muscle's hero line.
- *"Best mind possible until your last day of life."* — the mission, used sparingly.
- *"Don't roll the dice"* / *"Take action now"* — closing-energy lines.

## Brand rules (hard)

- Wordmark is **My4MLife** — single word, exact casing M-y-4-M-L-i-f-e. Domain stays lowercase.
- Author is **Dr. TJ Mundheim** (informal: **Dr. TJ**). Never "TJ Mundheim, DC" outside the title page.
- The 4 Ms are **Mind / Muscle / Mitigate / Motivate** — in that order, capitalized, when listed.
- Products mentioned by name:
  - **Biome NS Ultra** (OTC powder) + **Biome NS Rx** (Rx — BPC-157 + L-Glutamine + Aloe)
  - **ArmorVita** (vitamin D + K2 + boron + astaxanthin OTC stack)
  - **SleepRestore** (OTC) + **SleepRestore Rx** (nattokinase)
  - **MitoVita** (creatine + L-citrulline + beetroot + electrolytes — in development)
  - **Genesis RPA** (regenerative medicine flagship)
  - **OmegaCN Prime** (omega-3 + ubiquinol)
- The 25/25/15 Protégé discount lock: 25% off first purchase, 25% off autoship, 15% off ongoing one-time reorders. Do not deviate.
- **Compliance pre-cleared.** Do not insert hedging like "consult your doctor before" beyond a single book-level disclaimer.

## Strategic endpoint of the book

Every chapter — but especially the closing chapters — drives the reader to ONE outcome: **take the free 4M Assessment at my4mlife.com/assessment, become a Protégé, plug into the system, and start the protocol.** The book is a funnel. It converts. The ebook's job is to make a reader who finishes the last page unable to imagine NOT starting tomorrow.

## Where to find source material

- **Corpus manifest:** `/Users/thomasmundheim/Desktop/Development/LDRGLPRx/docs/book/corpus-manifest.md` — read this first to know where your chapter's source lives. Every chapter has explicit file paths.
- **Pillar pages:** `website/src/pages/pillars/{mind,muscle,mitigate,motivate}.astro` — best framing source.
- **Solution pages:** `website/src/pages/solutions/*.astro` — per-service depth.
- **Blogs:** `website/src/pages/blog/*.astro` — long-form deep dives, especially the "Eliminate the Insulting Behavior" series and the ED canary post.
- **Audit:** `website/src/data/audit-questions.ts` — clean book-ready prose in the `categoryNote` field.
- **Memory** (TJ's standing brand rules and locked decisions): `~/.claude/projects/-Users-thomasmundheim-Desktop-Development-LDRGLPRx/memory/MEMORY.md` and the linked files.

## Output

Each agent writes ONE chapter to a single Markdown file at the assigned path. Use clean Markdown:
- `# Chapter N — Title` at the top
- `## Subheads` for sections
- `>` for pull-quotes
- Standard prose between

Do not include navigation, footers, or "next chapter" links. The master assembly handles structure.

When you finish, return a 3-bullet summary of what the chapter covers + word count. No need to print the chapter back.
