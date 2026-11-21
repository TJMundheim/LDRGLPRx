# My4MLife talk deck ("Body, Brain, Bank") and presenter script

Current version: **v4.4** (35 slides, 36-page presenter script). Edit the sources here and rebuild; never hand-edit the PPTX.

## Files
- `build.js` - pptxgenjs deck generator (all slide text and most notes live here)
- `notes_v1.json` - older per-slide speaker notes that build.js reuses (`note(n)`)
- `bg2.py` - background art (PIL), `qr.py` - QR codes, `script.py` - presenter-script PDF
- `render_slides.sh` - exports slide JPEGs via Keynote, `dump_text.py` - dumps slide text + notes (for diffing versions)
- `HANDOFF_Presentations_v6.md` - history and design decisions

## Editions (one source, three talks)
- `--edition=main` (default): the full talk.
- `--edition=evening`: advisor client evening, about 35 minutes plus the host's 5. Drops slides 10, 11, 12, 18, 19 (step curve, morning walk, never-miss-twice, 4M framework, quick check-in); "Your speaker tonight"; adds "The other half of the answer" handoff slide; drawing moves after the host's remarks.
- `--edition=guest`: 10-minute guest spot inside an advisor's own dinner seminar (chew count, midlife, raise-your-hand, 42%, who writes the check, Medicare $0, the bill, the premium + calculator, one-QR close). Script lineage: docs/launch/uninsured-decade/dinner-guest-slot.md.
- `--host="Jane Smith"` puts the host's name on the handoff/close slides; without it they say "Your host" / "Thank you for having me".
- Edition speaker notes live in `notes_editions.json` (keyed by main-deck slide number; `host` and `close` for the edition-only slides).
- Example: `node build.js ~/Downloads/My4MLife_Talk_Advisor_10min_v4_4.pptx --edition=guest --host="Jane Smith"`, then render into `slides_guest` and run script.py with that folder.

## One-time setup
```
cd docs/talk
pnpm install --ignore-workspace      # not part of the repo pnpm workspace
python3 -m pip install --user "reportlab<4.3" "qrcode[pil]" pypdf python-pptx
```
Notes: system Python is 3.9, so reportlab must be <4.3 (4.3+ needs 3.10). Tested with pptxgenjs 4.0.1, react/react-dom 19.3.1, react-icons 5.7.0, sharp 0.35.5, jszip 3.10.2 (package.json), reportlab 4.2.5, qrcode 8.2, python-pptx 1.0.2, pypdf 6.15.0, Node 24.

build.js calls the pptx skill's `apply_theme.js`. Set `PPTX_SKILL_SCRIPTS` to the full path of that file to override; the default is the local Claude app copy under `~/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/.../skills/pptx/scripts/apply_theme.js`. build.js points NODE_PATH at `docs/talk/node_modules` so that script finds pptxgenjs and jszip.

## Rebuild for a talk
1. QR codes with the event tag (must be `talk-<event>`, e.g. `talk-rotary-dec`; default is `talk-general`):
   `python3 qr.py talk-rotary-dec`
2. Deck: `node build.js ~/Downloads/My4MLife_Talk_v4_4.pptx`
3. Slide images: `./render_slides.sh ~/Downloads/My4MLife_Talk_v4_4.pptx slides`
   (opens Keynote, exports JPEGs, quits without saving; first run may ask for Automation permission for Keynote; images land in `slides/` as sl-01.jpg ...)
4. Script PDF: `python3 script.py ~/Downloads/My4MLife_Talk_v4_4.pptx ~/Downloads/My4MLife_Talk_Presenter_Script_v4_4.pdf 4.4 slides`

Keynote renders differ slightly from PowerPoint (fonts), so images are for the presenter script and layout checks only.

## Checking a change
`python3 dump_text.py old.pptx > a.txt; python3 dump_text.py new.pptx > b.txt; diff a.txt b.txt`

## Ignored by git
node_modules, *.pptx, *.pdf, slides/ (see .gitignore). The QR PNGs and images are tracked inputs; regenerate QR PNGs per event.

## Latest finished files
`release/` holds ONLY the current deck + presenter script (force-added past .gitignore). On each new version: replace both files (`git rm` the old ones, `git add -f` the new), so the repo never piles up old binaries. Git history keeps earlier versions if ever needed.
