# Push Patch landing page copy — `/go/push-patch` (draft for TJ review)

Task P1-E of `docs/plan/push-patch-2026-09-30.md`. Status: DRAFT, nothing here is live.

How to read this file:
- `[TJ CONFIRM]` after a sentence means TJ must approve that sentence (or the fact behind it) before it ships. Every benefit sentence carries the flag because the Genesis one-pager only supports the delivery facts and the tagline, not the per-ingredient benefits.
- Facts taken from the Genesis one-pager (iontophoresis, needle-free and pain-free, bypasses the digestive tract, 12 or 14 hour sustained delivery, single-use patches applied like kinesiology tape, 6 patches per set plus supplies, one per week for six weeks, 12-hour for active people, 14-hour for sensitive skin, the four-line tagline) are the only un-flagged product facts. Everything else is marked.
- Voice: care-coordinator / assembled-team voice. Dr. TJ appears as educator and overseer only. He is not the prescriber, reviewer, or treating clinician, and the copy never says otherwise.
- Hard rules applied: may help / may support only; no disease language; no age anywhere; no emoji; no mention of the gut-brain prescription products; BPC-157 appears only inside its own blend; tagline verbatim in the closing block.

---

## 1. Top bar (same pattern as `go/gut-repair.astro`)

- Mark: `My4MLife`
- Tag: `Needle-free. Pain-free.` [TJ CONFIRM]

## 2. Hero

**Kicker:** Genesis Push Patch

**Headline (H1):** More energy. Better focus. Faster recovery. Needle free. [TJ CONFIRM: this is Genesis's tagline; confirm we may use it verbatim as our headline]

**Subhead:** A small patch on your upper arm delivers peptide and NAD+ blends through your skin for 12 or 14 hours at a time. No injections. No pills. One patch a week for six weeks. [TJ CONFIRM]

**Support line (under the subhead):** Pick your blend, pick your wear time, check out in about a minute. [TJ CONFIRM: confirms the "one-click, no coordinator call, no visit" path and the eligibility/intake story; see open questions]

**Primary CTA label:** `Choose your blend` (scrolls to the blend picker)

**Sticky / picker button label (the P2-D button):** `Order — $650` (label updates to the selected blend's price, `$550` for Glutathione Glow)

**Trust row (three short chips under the CTA):**
- Needle-free and pain-free
- Sustained delivery for 12 or 14 hours
- Six patches, six weeks

---

## 3. How it works

**Section H2:** A patch instead of a needle or a pill

**Lead:** The Push Patch uses iontophoresis, a delivery method that applies a minimal electrical charge to move molecules through the skin. Iontophoresis is an established delivery technology used in medicine for decades. [TJ CONFIRM: the "used in medicine for decades" wording is the approved substitute for any regulatory language about the patch; do not add to it]

Three steps, written for the page as a simple numbered row:

1. **Apply.** Each patch is single-use and goes on like kinesiology tape, on clean skin of the upper arm or shoulder. [TJ CONFIRM: upper arm/shoulder placement; the one-pager says "like kinesiology tape" but the exact placement site must come from Genesis's instructions]
2. **Wear.** The patch delivers for 12 or 14 hours, a sustained delivery rather than a single spike. Choose 12-hour if you are active and want to train or work in it; choose 14-hour if your skin is sensitive. [TJ CONFIRM: the one-pager ties 12-hour to active people and 14-hour to sensitive skin; confirm the plain-language version]
3. **Repeat weekly.** One patch a week for six weeks. A set is six patches plus the supplies to apply them. [TJ CONFIRM: "supplies" contents, see section 6]

**Three benefit chips under the steps:**
- **Needle-free and pain-free.** The charge moves the molecules; you feel a patch, not a shot.
- **Bypasses the digestive tract.** What is in the patch goes through the skin instead of through your stomach. [TJ CONFIRM: phrase as "bypasses the digestive tract" exactly as the one-pager does; do not add absorption-percentage claims]
- **Sustained, not spiky.** Delivery runs over 12 or 14 hours.

**Fine line under the chips:** Individual experience varies. [TJ CONFIRM]

---

## 4. Choose your blend

**Section H2:** Seven blends. One set each: six patches, six weeks.

**Lead:** Every blend ships as a six-patch set. Six of the seven contain NAD+ and are $650. The Glutathione blend has no NAD+ and is $550. Not sure which one fits? Start with NAD+ Restore, the simplest blend, or ask the care coordinator below. [TJ CONFIRM: "start with NAD+ Restore" is a soft recommendation I wrote; approve or delete]

Each card shows name, formula (exact from the catalog), price, and the one-line benefit below. Benefit sentences use may help / may support language only and describe what an ingredient is studied for, never a condition. Every line needs TJ approval.

| skuId | Display name | Formula (from catalog) | Price | One-line benefit |
|---|---|---|---|---|
| push-patch-nad-ghk | **NAD+ Restore** (proposed) | NAD+ 1300 mg / GHK-Cu 5 mg | $650 | A high-dose NAD+ blend that may help support cellular energy, with GHK-Cu, which may support skin and tissue quality. [TJ CONFIRM] |
| push-patch-bpc-nad-ghk | **Repair** (proposed) | BPC-157 2000 mcg / NAD+ 250 mg / GHK-Cu 5 mg | $650 | BPC-157 is a peptide studied for tissue repair; paired with NAD+ and GHK-Cu, this blend may support recovery after hard training. [TJ CONFIRM] |
| push-patch-kpv-nad-ghk | **Calm Gut** (proposed) | KPV 10 mg / NAD+ 250 mg / GHK-Cu 5 mg | $650 | KPV is a peptide studied for its role in the body's inflammatory signaling; this blend may help support a calmer, steadier feeling day to day. [TJ CONFIRM] |
| push-patch-nad-motsc-ghk | **Metabolic** (proposed) | NAD+ 1300 mg / MOTS-c 5 mg / GHK-Cu 5 mg | $650 | MOTS-c is a peptide studied for its role in mitochondrial and metabolic signaling; this blend may support energy and metabolic health. [TJ CONFIRM] |
| push-patch-enhanced-glow | **Enhanced Glow** (Genesis name) | NAD+ 250 mg / TB-500 2 mg / BPC-157 2000 mcg / GHK-Cu 15 mg | $650 | Our highest-GHK-Cu blend, which may help support skin appearance and tissue quality, with TB-500, BPC-157 and NAD+ in support. [TJ CONFIRM] |
| push-patch-wolverine | **Wolverine** (Genesis name) | NAD+ 250 mg / TB-500 2 mg / BPC-157 2000 mcg / GHK-Cu 5 mg | $650 | For people who train hard: TB-500 and BPC-157 are peptides studied for tissue repair, and this blend may support faster recovery between sessions. [TJ CONFIRM] |
| push-patch-glutathione-ghk | **Glutathione Glow** (proposed) | Glutathione 500 mg / GHK-Cu 5 mg | $550 | Glutathione is one of the body's main antioxidants; this NAD+-free blend may help support skin quality and general wellbeing. [TJ CONFIRM] |

### Proposed display names (for TJ approval)

The two Genesis names stay exactly as they are: **Enhanced Glow** and **Wolverine**. The five unnamed blends are proposed as:

| Blend | Proposed name | Why | Alternates if TJ dislikes it |
|---|---|---|---|
| NAD+ 1300 / GHK-Cu 5 | **NAD+ Restore** | Plain, leads with the headline ingredient, no condition implied | NAD+ Core, Foundation |
| BPC-157 / NAD+ 250 / GHK-Cu 5 | **Repair** | Matches the "studied for tissue repair" framing of BPC-157 without naming a condition | Rebuild, Recover |
| KPV / NAD+ 250 / GHK-Cu 5 | **Calm Gut** | Signals the KPV lane in two words. Risk: "gut" edges toward a health-area claim and sits close to the existing gut brand; safer alternates listed | Steady, Calm |
| NAD+ 1300 / MOTS-c / GHK-Cu | **Metabolic** | Names the lane MOTS-c is studied for. Risk: "metabolic" can read as a weight-loss claim; safer alternates listed | Drive, Engine |
| Glutathione 500 / GHK-Cu 5 | **Glutathione Glow** | Says what is in it and pairs with "Enhanced Glow" so the skin-lane blends read as a family | Clear, Glow |

[TJ CONFIRM: all five names]. These match the placeholders already in the plan's catalog table and P1-A module; if TJ changes any, `website/src/data/pushPatch.ts`, the Stripe Product names (P1-B) and the fulfillment email catalog (P2-B) change too.

**Picker footer:** NAD+ is in six of the seven blends. All six-patch sets are one-time purchases, not subscriptions. [TJ CONFIRM: one-time purchase, no auto-ship; Genesis offers patient auto-ship but the plan sells one-time]

**Wear-time picker (below the blends):**
- Label: `Wear time`
- Option 1: `12-hour (active)`; helper: For people who train or stay on the move.
- Option 2: `14-hour (sensitive skin)`; helper: A longer, gentler delivery for sensitive skin.
- Note: Same price either way.

---

## 5. Why a patch (short, benefit-led band; optional, cut if the page runs long)

**H2:** Built for people who plan to keep their edge

Pills and powders have to survive your digestive tract. Needles are needles. A weekly patch is a third way: something you put on, forget about, and take off at the end of the day. [TJ CONFIRM: "pills and powders have to survive digestion" is a comparison claim of mine; approve or delete]

Dr. TJ built My4MLife around one idea: the best mind and body possible, for as long as possible. Recovery and energy are how you keep showing up. Dr. TJ speaks as a health-span educator and does not provide medical care through this platform. [TJ CONFIRM: this wording follows the 2026-09-08 "Dr. TJ only" rule; do not add a title]

---

## 6. What's in the box

**H2:** What arrives at your door

- Six single-use patches, one for each week of the six-week set.
- The supplies to apply them. [TJ CONFIRM: the one-pager says "plus supplies" without a list; we need the exact contents, for example skin prep, the device/controller if any, adhesive strip, instructions]
- A simple week-by-week guide: apply on the same day each week, wear it for your chosen 12 or 14 hours, remove it, repeat. [TJ CONFIRM: a printed guide is not in the one-pager; confirm whether Genesis or we provide it]

**Under the list:** Ships from My4MLife. [TJ CONFIRM: we ship from our own stock first and move to Genesis drop-ship later; the page must not name the shipper until that is settled, so this line may need to become "Ships to the United States" only]

---

## 7. FAQ (8 items)

**1. How fast does my order ship, and where?**
We ship within the United States. You will get a confirmation email when you check out and a shipping update when the set goes out. Expect your set within [X] business days of ordering. [TJ CONFIRM: the ship speed, the shipping cost (free or flat), any states we cannot ship to, and the carrier]

**2. How long do I wear a patch, and how often?**
One patch a week for six weeks. You choose 12-hour or 14-hour wear at checkout. Choose 12-hour if you are active; choose 14-hour if your skin is sensitive. The price is the same. [TJ CONFIRM: confirm the wear instructions and whether the patch is removed after 12/14 hours or worn through the week; the one-pager says "one per week" and "sustained delivery over 12 or 14 hours", so the page must be explicit about removal]

**3. Does it hurt, and what about sensitive skin?**
No needles and no injection. Iontophoresis uses a minimal electrical charge and is described as pain-free. Most people describe the feeling as a light tingle or nothing at all. [TJ CONFIRM: the "light tingle" line is my assumption about how iontophoresis feels; confirm with Genesis or delete] If your skin is sensitive, choose the 14-hour option, which was designed for sensitive skin. Do not apply a patch to broken or irritated skin. [TJ CONFIRM: skin-contact warning wording from Genesis]

**4. What is actually in my blend?**
The formula on each card is exactly what is in your patch, with the amounts shown. Six of the seven blends contain NAD+, and the Glutathione blend does not. Not sure which to choose? The care coordinator can walk you through the options. [TJ CONFIRM: the care coordinator is allowed to discuss blend choice but does not give medical advice; confirm that scope]

**5. What is iontophoresis, and is it established?**
Iontophoresis uses a minimal electrical charge to move molecules through the skin. It is an established delivery technology used in medicine for decades. The Push Patch applies that idea to a wearable patch. [TJ CONFIRM: do not add any regulatory or approval statements about the patch beyond this]

**6. Who should check with a clinician first?**
Anyone who is pregnant or nursing, has an implanted electronic device such as a pacemaker, has a known skin condition at the application site, or takes regular prescription medication should talk to their own healthcare provider before using a patch. [TJ CONFIRM: this is a standard-caution list I wrote, not sourced from Genesis; legal/Genesis must supply the actual contraindications, especially for implanted devices and the electrical charge]

**7. What is your refund policy?**
Questions about an order or a refund go to refunds@my4mlife.com, and our full policy is at /refund-policy. [TJ CONFIRM: the existing policy covers supplements case-by-case (unopened, unused within 14 days of delivery) and Rx as non-refundable once shipped; the Push Patch is neither category cleanly. Decide which rule applies, and then this answer should state it in one sentence, for example "Unopened sets may be returned within 14 days of delivery." Not drafted as a promise until TJ decides]

**8. I have a question before I order. Who do I ask?**
Start with our care coordinator at /consult. They can help you choose a blend and answer questions about wear and shipping. [TJ CONFIRM: the plan sends questions to /consult; /consult currently runs in coordinator mode and begins an intake, so confirm that is the right door for a pre-purchase question or whether we should use a plain email address instead]

---

## 8. Closing block

**H2:** Put it on. Get on with your week.

**Body:** One patch a week. Six weeks. More energy, better focus, faster recovery, and not a needle in sight. [TJ CONFIRM: same tagline claims as the headline; "may help" is implied, but the closing repeats outcomes, so confirm wording or soften to "may help you feel"]

**CTA label:** `Choose your blend` (scrolls to picker) and then the picker button `Order — $650`.

**Tagline (verbatim, required on every surface, standing rule 2026-09-08):**

Don't lose your identity and your dignity while you still have a choice.

## 9. Footer block

- Suggested line above the disclaimer: `Begin with the end in mind.` (brand tagline, in the `em` style used by gut-repair's closing).
- Disclaimer (required): *These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, prevent or alleviate any condition. Results vary by person. Dr. TJ speaks as a health-span educator and does not provide medical care through this platform.* [TJ CONFIRM: legal wording; the page must not claim regulatory approval of the patch. Also note the shared `MedicalDisclaimer` component carries GLP-1 and compounded-medication language that will read oddly on this page; P2-D should use a patch-specific disclaimer instead, TJ/legal to approve]
- Links: Privacy / Terms / Refund policy / my4mlife.com.

---

## 10. Artlist image prompts (3)

Plain prose, to paste into Artlist (Google Imagen). TJ generates; Fable places. No flags, no text on the image, no alcohol, no printed age. Across the three images the subjects split evenly: image 1 shows one woman, image 2 shows one man, image 3 shows one woman and one man, so the set has two women and two men. Subjects are active adults in midlife; no prompt states a number of years or an age range.

**Prompt 1: the morning routine (hero, woman)**
A candid, natural-light photograph of a woman with short silver-streaked dark hair standing in a bright kitchen early in the morning, wearing a fitted sleeveless athletic top. A small, flat, skin-toned rectangular patch sits on her upper arm near the shoulder, like a piece of kinesiology tape, clearly visible but understated. She is smiling slightly as she reaches for a glass of water, a pair of running shoes by the door behind her. Warm sunrise light from a window on her left, shallow depth of field, calm and confident mood, editorial lifestyle photography, horizontal frame with open space on the right for a headline. No text or logos.

**Prompt 2: recovery after a workout (benefit band, man)**
A candid photograph of a fit man with short graying hair and a light stubble, sitting on a wooden bench in a sunlit home gym after a workout, towel over one shoulder, looking relaxed and satisfied. A small, flat, skin-toned patch is applied on his upper arm just below the shoulder. A water bottle and a set of dumbbells rest on the floor nearby. Soft natural light, true-to-life skin texture, no heavy retouching, editorial lifestyle photography, horizontal frame with open space on the left. No text or logos.

**Prompt 3: applying it at home (how-it-works, a woman and a man)**
A warm, candid photograph of a woman and a man standing side by side in a bright living room, both dressed in casual athletic clothing. The woman is gently pressing a small, flat, skin-toned patch onto the man's upper arm, the way you would smooth a strip of tape, and both are smiling at the moment. Natural window light, muted warm tones, soft background of a sofa and a plant, no medical equipment, editorial lifestyle photography, horizontal frame. No text or logos.

Notes for Fable when placing:
- Save as `website/public/images/scenes/push-patch-hero.jpg`, `push-patch-recovery.jpg`, `push-patch-apply.jpg` (about 1800 px, JPEG quality 80) once TJ supplies them. Until then P2-D uses existing `/images/scenes/` placeholders.
- Check each result for: no alcohol of any kind, no visible text, patch clearly on the upper arm or shoulder, nobody who reads as elderly or as a teenager.

---

## 11. Open questions TJ must resolve before launch

1. **Eligibility and clinician oversight.** The plan sells with no consult and no telemedicine visit. The copy therefore says nothing about a prescription, a clinician, or medical review, and deliberately avoids "no prescription needed". Confirm with Genesis and legal what (if any) screening, intake form or clinician sign-off is required, and what the page may and may not say. [TJ CONFIRM]
2. **Contraindications** (FAQ 6). Genesis or legal must supply the real list, especially for the electrical charge and implanted devices. [TJ CONFIRM]
3. **Supplies in the set** (section 6). Exact contents. [TJ CONFIRM]
4. **Refund rule** (FAQ 7). Decide between the supplement rule and a no-returns rule. [TJ CONFIRM]
5. **Shipping speed, cost and states** (FAQ 1). [TJ CONFIRM]
6. **Tagline as headline** (section 2). Genesis's line, used verbatim with their permission. [TJ CONFIRM]
7. **The five display names** (section 4). [TJ CONFIRM]
8. **Every per-blend benefit line** (section 4). These describe ingredient research themes, not results, but they are my drafting, not Genesis's. [TJ CONFIRM]
