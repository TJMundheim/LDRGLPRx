# Plan: Uninsured Decade gender-neutral pass + Count Yourself Skinny publish-ready + AirPods test guide (2026-10-31)

## Context
Marla (estate attorney, writing *The Uninsured Decade* foreword) says the book must be gender-neutral in tone: at least half the time the woman holds the documents and helps decide on care, and often she decides alone because her husband already has cognitive issues. Separately, TJ wants *Count Yourself Skinny* (book v2, 82pp) "enterprise level and ready to go," and he tests the CYS iOS app's AirPods Chew Lab on his own iPhone tomorrow. Prose work, so TDD is replaced by grep-checkable completion criteria. Main only, no worktrees, no deploys; the orchestrator commits.

## Tasks

### [P1] Uninsured Decade — gender-neutral rewrite + render v3  [parallel]
model: opus
Edit docs/book-uninsured-decade/draft/_MASTER.md. The reader = "the one who holds the documents and makes the care decisions," of either sex. Use spouse/partner language. Rewrite assumptions that the reader is a male earner with a wife as caregiver. Keep Dr. TJ's first-person male voice, and keep sex-specific statistics (35% men / 48% women). Add one honest passage, early (Ch1 or the opening): the decider is very often the wife or partner, sometimes entirely, because her husband is the one declining. Write in context; never do a mechanical men→people swap. Keep the locked rules in docs/book-uninsured-decade/README.md (honesty spine, endorse the professional partner, 30% individual, tagline in Ch6). Update the README gender line. Render draft v3 PDF via render.py and copy it to ~/Desktop. Write a change log to docs/book-uninsured-decade/gender-pass-2026-10-31.md.
✓ DONE WHEN: The-Uninsured-Decade-draft-v3.pdf exists and the change log lists every edited passage

### [P1] Count Yourself Skinny — rules audit, fixes, KDP readiness, render v3  [parallel]
model: opus
Audit docs/book-cys/draft/_MASTER.md against the standing rules listed in docs/plan/ud-gender-neutral-cys-ready-2026-10-31.md#cys-rules. Fix violations, typos and inconsistencies in place. Check KDP basics: copyright page, trim, front/back matter, page count. Render v3 via docs/book-cys/render.py and copy it to ~/Desktop. Write docs/book-cys/readiness-2026-10-31.md covering: fixes made, gaps only TJ can close (ISBN, cover file, price, app-availability claims vs. reality: the app is not yet in the App Store), and a ready/not-ready verdict per item.
✓ DONE WHEN: Count-Yourself-Skinny-v3.pdf exists and readiness-2026-10-31.md has a verdict line for every KDP item

### [P1] AirPods Chew Lab test guide  [parallel]
model: sonnet
Read apps/count-yourself-skinny-ios (README, project.yml, ChewLabView/ChewDetector). Write docs/launch/cys/airpods-test-guide-2026-11-01.md for a non-technical user:
- installing on his own iPhone from Xcode with a free personal team (cable/Wi-Fi, Developer Mode, trusting the developer profile);
- which AirPods models work;
- how to open Chew Lab, what to watch during one meal, how to export the CSV and send it back;
- what to note (count vs. his own count of 20 chews).
Verify the bundle ID, signing settings and the build command against the repo. Make no code changes.
✓ DONE WHEN: the guide exists and every Xcode/menu step it names matches the project files

### [REVIEW] Review  [sequential — runs last]
model: opus
- [ ] UD: no mechanical scrub; sex-specific statistics intact; locked rules intact; the decider passage reads true
- [ ] CYS: zero rule violations on re-grep; the readiness list is honest
- [ ] Guide steps match the project
- [ ] No secrets; commit to main + HANDOFF START HERE + memory updated
✓ DONE WHEN: all items checked and the commit is pushed to origin/main

## CYS rules
- No printed age ranges.
- Sex-specific only where physiology differs, neutral elsewhere; no "men and women" filler.
- Protein-first is 30–40 g after fasted training.
- Electrolytes: half a scoop + creatine before the lift, half after. Print stays de-branded.
- No product or affiliate brand names in print; point readers to my4mlife.com.
- The identity/dignity tagline ("Don't lose your identity and your dignity while you still have a choice.") appears only at the bridge point in the last chapter.
- No "coming soon"; nothing promised that isn't orderable or schedulable now.
- The funnel goes to my4mlife.com/assessment.
- "Cohort Workbook" → "The Logbook".
