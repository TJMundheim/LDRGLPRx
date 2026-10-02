# Push Patch landing page copy — `/go/push-patch` (draft for TJ review)

Task P1-E of `docs/plan/push-patch-2026-09-30.md`. Status: DRAFT, not deployed. Rewritten 2026-09-30 to TJ's new direction (needle-free lead, own look, technical voice). Updated 2026-09-30 with TJ's final decisions: prices stay; 12-hour only; no clinician-clearance copy; no refunds ("All sales are final."); no shipping details; Genesis tagline dropped; new headline; one-click buy button on every blend card; thank-you page.

How to read this file:
- `[TJ CONFIRM]` after a sentence means TJ must approve that sentence (or the fact behind it) before it ships. In the page source these are Astro comments `{/* TJ CONFIRM: ... */}`, so they never appear in the shipped HTML.
- Facts taken from the Genesis one-pager (iontophoresis, needle-free and pain-free, bypasses the digestive tract, 12-hour sustained delivery, single-use patches applied like kinesiology tape, 6 patches per set, one per week for six weeks, 12-hour wear only) are the only un-flagged product facts. The kit contents come from TJ's product photos and are flagged until Genesis confirms them.
- **Audience:** (1) people already using peptides who are tired of injecting ("needle fatigue"); (2) people who have never started because of needles.
- **Voice:** technical product voice, empathetic and insider on the injection routine, never mocking. The page is about the Push Patch delivery technology. Dr. TJ is not mentioned on this page. My4MLife appears as a small header wordmark, a "Brought to you by My4MLife" line (hero and footer) and the footer links.
- **Look:** near-standalone, NOT the site theme. Deep-slate/near-black sections alternating with cool light-grey and white, one cyan accent, Inter for headings (no Playfair serif), monospace for formula and spec labels. Scoped styles in the page; every section sets its own background so it renders the same in light or dark system settings.
- **Hard rules applied:** may help / may support only; never treat / cure / heal; no regulatory-approval claim about the patch; no age anywhere; no emoji; never "men and women"; no mention of the gut-brain prescription products; doses appear only inside each blend card's formula line; tagline once, in the footer.
- **Kit prep (updated 2026-10-01):** steps now follow the manufacturer IFU (mix the blend with the sterile water provided, wet the pad, apply, pull the activation tab, wear 12 hours, remove with warm soapy water, wait 24 hours before reusing a site). No water volume is printed (IFU 2 ml vs brochure 1.5 ml). The pain-point block stays needle-specific.

---

## 1. Top bar

- Mark: `My4MLife` (small wordmark, links home)
- Tag: `Needle-free delivery`

## 2. Hero (dark)

**Headline (H1):** Stop sticking yourself.

**Sub-headline (inside the H1, smaller, cyan):** Same peptides. No needle. One patch a week.

(No kicker pill and no big stat badge under the H1, TJ 2026-10-01; the stats live once, in the hero stats panel below.)

**Delivery line (bold, directly under the H1):** An injection spikes and clears, often in under an hour. The patch keeps delivering for 12.

**Sub-line:** Done with syringes, sharps containers and bracing for the morning stick? Or are needles the reason you've never started? The Push Patch delivers peptide and NAD+ blends through your skin, steadily, over 12 hours. [TJ CONFIRM: speaks to both audiences]

(Genesis's four-line tagline was dropped entirely, TJ 2026-09-30.)

**CTA:** `Choose your blend` (scrolls to the blend grid; PostHog `lp_patch_cta_hero`)

**Chips:** No needles · No pills · No IV chair · One patch a week

**Line:** Brought to you by My4MLife

**Hero row (after chips and the "Brought to you by" line; two columns on desktop, stacked at <=720px: photo, stats, chart):**
- **Left (~42%):** `/images/push-patch/pouches.jpg` (real Genesis packaging, three "12 HOUR" pouches), rounded. Alt: Three black Push Patch pouches labeled 12 HOUR: NAD+ with GHK-Cu, BPC-157 and NAD+ with GHK-Cu, and KPV and NAD+.
- **Right (stats panel, `id="auc"`, dark-styled):**
  - Two stat tiles (NAD+ only):
    - **276%** more NAD+ in your system than daily 50 mg injections*
    - **163%** more NAD+ in your system than a 500 mg weekly IV*
  - **Source line (tiny muted):** *Total exposure over time (area under the curve), data from Push Patch, LLC. Delivery data only; individual results vary. (The * links to this panel, `#auc`.)
  - **Schematic (inline SVG, dark panel):** dashed "Injection" curve that peaks and tapers vs a solid cyan "Push Patch: 12 hours" plateau. Caption: Illustration of delivery pattern; measured figures above. [TJ CONFIRM: schematic only; measured figures are the stat tiles]
  - [TJ CONFIRM: permission to publish Push Patch LLC AUC figures]

---

## 3. Pain points (light)

**Eyebrow:** If you've been injecting

**H2:** You know the routine.

- Sticking yourself with a needle, week after week.
- Pinching belly fat at 6 a.m. and bracing for the stick.
- Rotating injection sites and still finding bruises and little lumps.
- A sharps container on the bathroom shelf.
- Packing syringes every time you travel.
- Skipping a dose because you just couldn't face the needle tonight.

[TJ CONFIRM: pain-point lines; empathetic insider language, no medical claims. Vial/reconstitution lines removed because the kit itself includes a vial]

**Turn (large):** One patch. Once a week. No needle.

**For people who never started (callout):** **Never started because of needles?** If needles are the reason you've never started, there is no needle at any step. You mix the blend, wet the pad, apply the patch like a strip of kinesiology tape, and wear it.

---

## 4. The technology (white)

**Eyebrow:** The delivery technology

**H2:** Iontophoresis: a small charge does the work a needle used to do

**Lead:** The Push Patch uses iontophoresis. A small electrical charge moves charged molecules through the skin, so the blend reaches you without an injection. Iontophoresis is an established delivery technology used in medicine for decades. [TJ CONFIRM: "used in medicine for decades" is the approved substitute for any regulatory language about the patch; do not add to it]

**Four spec tiles:**
- **Route — Through the skin.** Bypasses the digestive tract. Nothing to swallow. [TJ CONFIRM: phrase exactly as the one-pager; no percentage claims about the route]
- **Curve — Steady, not a spike.** Delivered over 12 hours instead of all at once.
- **Setup — Nothing to inject.** No needles, no pills, no IV chair. Applied like kinesiology tape.
- **Frequency — Once a week.** One single-use patch a week. Six patches, six weeks.

**Sub-section H3:** Why steady beats a spike

**Body:** Area under the curve (AUC) is the total amount of a molecule in your system over time. Peptides like BPC-157 and KPV clear from the bloodstream quickly after an injection, often within an hour or a few hours, so most of the day is spent below the level you injected for. The Push Patch releases its blend slowly and continuously over 12 hours. [TJ CONFIRM: permission to publish Push Patch LLC AUC figures]

(Stat tiles, source line and schematic moved to the hero stats panel, TJ 2026-10-01. This section is text only.)

Do not quote the BPC-157, KPV or glutathione multiples from the deck: they were measured at a different patch frequency than our once-weekly set.

---

## 5. Injection vs. Push Patch (light)

**Eyebrow:** Side by side

**H2:** Injection vs. Push Patch

| | Injection | Push Patch |
|---|---|---|
| Needle | Yes, at every dose | None |
| How often | Often daily or several times a week, depending on the protocol | One patch a week |
| Delivery curve | Fast spike, then cleared, often within hours | Steady release over 12 hours |
| Route | Under the skin, through a needle | Through the skin, moved by a small electrical charge |
| Setup | Syringes, needles, a sharps container | Mix the blend, wet the pad, apply like kinesiology tape, wear |

**Fine line:** A comparison of delivery method only, not of results. Individual experience varies.

[TJ CONFIRM: injection frequency and setup rows are general descriptions of self-injected peptide protocols]

---

## 6. How to wear it (white)

**Eyebrow:** How to wear it

**H2:** Prepare. Apply. Wear.

1. **Prepare.** Add the sterile water provided to the powder vial, cap it and shake to mix. Press the white pad of the patch against the open vial, turn it over, and wet the whole pad.
2. **Apply.** On clean, dry skin, peel the backing and press the patch down flat, like kinesiology tape. Pull the activation tab all the way out.
3. **Wear.** Wear it for 12 hours, then remove it: wet it with warm soapy water and peel slowly. Wait at least 24 hours before using the same spot again. One patch a week for six weeks.

**Small print under the steps:** Full instructions are printed in every kit. Follow the insert in your kit for the exact amount of water.

Source: manufacturer IFU "Handling Instructions for PushPatch Kits+" (research doc `genesis-site-research-2026-10-01.md` section 2). No water volume is printed because the IFU (2 ml) and the patient brochure (1.5 ml) disagree. The arm/shoulder placement was removed; the IFU does not name a site.

---

## 7. Choose your blend (light) — the purchase point (zero-friction buy)

**Eyebrow:** Choose your blend

**H2:** Seven blends. Six patches each. Six weeks.

**Lead:** Every blend ships as a six-patch set. Blends with NAD+ are $650; the Glutathione blend has no NAD+ and is $550. Not sure which fits? NAD+ Restore is the simplest place to start. [TJ CONFIRM: the "simplest place to start" recommendation]

**Banner (bold, directly above the cards):** More in your system. No needle.
**Banner sub-line (smaller):** One patch a week, delivering for 12 hours.

Each card shows name, price, the one-line benefit, the exact formula from the catalog (small monospace), and its own primary button. Formulas and doses appear nowhere else on the page.

| skuId | Display name | Formula (from catalog) | Price | One-line benefit |
|---|---|---|---|---|
| push-patch-nad-ghk | **NAD+ Restore** (proposed) | NAD+ 1300 mg / GHK-Cu 5 mg | $650 | A high-dose NAD+ blend that may help support cellular energy, with GHK-Cu, which may support skin and tissue quality. [TJ CONFIRM] |
| push-patch-bpc-nad-ghk | **Repair** (proposed) | BPC-157 2000 mcg / NAD+ 250 mg / GHK-Cu 5 mg | $650 | BPC-157 is a peptide studied for tissue repair; paired with NAD+ and GHK-Cu, this blend may support recovery after hard training. [TJ CONFIRM] |
| push-patch-kpv-nad-ghk | **Calm Gut** (proposed) | KPV 10 mg / NAD+ 250 mg / GHK-Cu 5 mg | $650 | KPV is a peptide studied for its role in the body's inflammatory signaling; this blend may help support a calmer, steadier feeling day to day. [TJ CONFIRM] |
| push-patch-nad-motsc-ghk | **Metabolic** (proposed) | NAD+ 1300 mg / MOTS-c 5 mg / GHK-Cu 5 mg | $650 | MOTS-c is a peptide studied for its role in mitochondrial and metabolic signaling; this blend may support energy and metabolic health. [TJ CONFIRM] |
| push-patch-enhanced-glow | **Enhanced Glow** (Genesis name) | NAD+ 250 mg / TB-500 2 mg / BPC-157 2000 mcg / GHK-Cu 15 mg | $650 | Our highest-GHK-Cu blend, which may help support skin appearance and tissue quality, with TB-500, BPC-157 and NAD+ in support. [TJ CONFIRM] |
| push-patch-wolverine | **Wolverine** (Genesis name) | NAD+ 250 mg / TB-500 2 mg / BPC-157 2000 mcg / GHK-Cu 5 mg | $650 | For people who train hard: TB-500 and BPC-157 are peptides studied for tissue repair, and this blend may support faster recovery between sessions. [TJ CONFIRM] |
| push-patch-glutathione-ghk | **Glutathione Radiance** (proposed) | Glutathione 500 mg / GHK-Cu 5 mg | $550 | Glutathione is one of the body's main antioxidants; this NAD+-free blend may help support skin quality and general wellbeing. [TJ CONFIRM] |

### Proposed display names (for TJ approval)

The two Genesis names stay exactly as they are: **Enhanced Glow** and **Wolverine**. The five unnamed blends are proposed as:

| Blend | Proposed name | Why | Alternates if TJ dislikes it |
|---|---|---|---|
| NAD+ 1300 / GHK-Cu 5 | **NAD+ Restore** | Plain, leads with the headline ingredient, no condition implied | NAD+ Core, Foundation |
| BPC-157 / NAD+ 250 / GHK-Cu 5 | **Repair** | Matches the "studied for tissue repair" framing of BPC-157 without naming a condition | Rebuild, Recover |
| KPV / NAD+ 250 / GHK-Cu 5 | **Calm Gut** | Signals the KPV lane in two words. Risk: "gut" edges toward a health-area claim and sits close to the existing gut brand; safer alternates listed | Steady, Calm |
| NAD+ 1300 / MOTS-c / GHK-Cu | **Metabolic** | Names the lane MOTS-c is studied for. Risk: "metabolic" can read as a weight-loss claim; safer alternates listed | Drive, Engine |
| Glutathione 500 / GHK-Cu 5 | **Glutathione Radiance** | Says what is in it and pairs with "Enhanced Glow" so the skin-lane blends read as a family | Clear, Glow |

[TJ CONFIRM: all five names]. If TJ changes any, `website/src/data/pushPatch.ts`, the Stripe Product names (P1-B) and the fulfillment email catalog (P2-B) change too.

**Buy button (one per card):** `Buy — $650` (`Buy — $550` on Glutathione Radiance). One click POSTs `{skuId}` (no wear option) to `/api/checkout-session` and redirects to the returned Stripe Checkout URL. While waiting the button reads `Opening checkout…`. Errors show inline under that card: 503 -> "This blend isn't available yet."; other failures -> a generic try-again line. PostHog: `lp_patch_view` on load, `lp_patch_checkout {skuId}` on click.

**Under the grid:** Secure checkout by Stripe. Apple Pay, Google Pay and cards accepted. Not cleared? Full refund. Final once shipped.

**Process line (under the grid, small print):** After checkout: a 2-minute health questionnaire, physician review within an hour during business hours, then your kit ships direct. Prepared within 1–3 business days, then ground delivery in 3–5 business days.

**Small line:** All six-patch sets are one-time purchases, not subscriptions. [TJ CONFIRM: one-time, no auto-ship]

**Safety line (under the small print):** Not for use if you have epilepsy or seizures, a pacemaker, or metal implants near the patch site, are pregnant, or have a recent wound, skin graft or scar at the patch site. (List taken verbatim from the IFU contraindications. No "consult your doctor" gate; TJ 2026-10-01.)

---

## 8. What arrives at your door (dark)

**Eyebrow:** In the box

**H2:** What arrives at your door

**Image:** `/images/push-patch/kit-contents.jpg`. Alt: Push Patch kit contents: a shaped adhesive patch with a round pad, a small amber blend vial, and a clear graduated tube.

Per six-week set:
- **6** Single-use patches, one for each week of the six-week set.
- **6** Powder vials of blend, one for each patch.
- **6** Sterile water ampules, one for each blend.

[TJ CONFIRM: per-set counts. The IFU shows one amber powder vial and one sterile-water ampule per kit; one of each per patch is assumed. The photo's "graduated tube" may be the ampule.]

**Trust line (under the list):** Every active ingredient is third-party tested. Certificates of analysis (HPLC purity and mass-spec identity) for BPC-157, NAD+, GHK-Cu, glutathione, KPV, TB-500 and MOTS-c are available on request. (Genesis publishes all seven CoAs; research doc section 3.)

Shipping details: allowed as of TJ 2026-10-02. The only shipping line is: "Prepared within 1–3 business days, then ground delivery in 3–5 business days." (under-grid process line and FAQ 9).

---

## 9. FAQ — "Before you order" (10 items)

1. **Is there a needle anywhere in the process?** No. The Push Patch is needle-free. There are no syringes and no injection at any step. You mix the blend, wet the pad, apply the patch like a strip of kinesiology tape, and wear it.
2. **Does it hurt, and what about sensitive skin?** Iontophoresis uses a small electrical charge and is described as pain-free. Most people describe the feeling as a light tingle or nothing at all. Do not apply a patch to broken or irritated skin. [TJ CONFIRM: "light tingle" is an assumption; skin-contact warning wording from Genesis]
3. **I already inject peptides. Can I switch to the patch?** Yes, many people switch. The formula on each blend card shows exactly what is in that patch, so you can compare it with what you use now.
4. **What is iontophoresis, and is it established?** Iontophoresis uses a small electrical charge to move charged molecules through the skin. It is an established delivery technology used in medicine for decades. The Push Patch applies it in a wearable, single-use patch. [TJ CONFIRM: no regulatory or approval statements beyond this]
5. **How long do I wear a patch, and how often?** One patch a week for six weeks. Wear each patch for 12 hours, then remove it: wet it with warm soapy water and peel slowly. Wait at least 24 hours before using the same spot again.
6. **What is actually in my blend?** The formula on each blend card is exactly what is in your patch, with the amounts shown. Six of the seven blends contain NAD+; the Glutathione blend does not.
7. **Who should not use the Push Patch?** Do not use it if you have epilepsy or seizures, a pacemaker, or metal implants near the patch site, are pregnant, or have a recent wound, skin graft or scar at the patch site.
8. **What is your refund policy?** Not cleared? Full refund. Final once shipped.
9. **How long does shipping take?** Prepared within 1–3 business days, then ground delivery in 3–5 business days. At checkout you enter your shipping address, and you confirm it again after payment before anything ships.
10. **I have a question before I order. Who do I ask?** Start with our care coordinator at /consult. They can help you choose a blend and answer questions about wear. [TJ CONFIRM: /consult vs a plain email address for pre-purchase questions]

---

## 10. Closing block (dark)

**H2:** Retire the sharps container.

**Body:** One patch a week, applied like tape, worn for 12 hours. No needles, no pills, no IV chair.

**CTA:** `Choose your blend` (PostHog `lp_patch_cta_close`)

## 11. Footer (dark)

- Brought to you by My4MLife
- Tagline (verbatim, once on the page, standing rule 2026-09-08): Don't lose your identity and your dignity while you still have a choice.
- Disclaimer (patch-specific; shared `MedicalDisclaimer` not used because of its GLP-1 / compounded-medication language): *These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, prevent or alleviate any condition. Results vary by person.* [TJ CONFIRM: legal wording; no regulatory-approval claim about the patch]
- Links: Privacy / Terms / my4mlife.com.
- "Begin with the end in mind." is intentionally not on this page (near-standalone product page).

---

## 12. Images

Live on the page now (real Genesis product photos supplied by TJ, 2026-09-30):
- `website/public/images/push-patch/pouches.jpg` — hero.
- `website/public/images/push-patch/kit-contents.jpg` — What arrives at your door.

No lifestyle placeholder is used. Optional future render (Artlist / Google Imagen, TJ generates, Fable places) for the How-to-wear section, saved as `website/public/images/push-patch/apply.jpg`:

> A warm, candid photograph of a woman and a man standing side by side in a bright living room, both dressed in casual athletic clothing. The woman is gently pressing a small, flat, skin-toned patch onto the man's upper arm, the way you would smooth a strip of tape, and both are smiling at the moment. Natural window light, muted warm tones, soft background of a sofa and a plant, no medical equipment, editorial lifestyle photography, horizontal frame. No text or logos.

Check any render for: no alcohol of any kind, no visible text, patch clearly on the upper arm or shoulder, nobody who reads as elderly or as a teenager. (The earlier hero and recovery prompts are retired with the new clinical look.)

---

## 13. Open questions TJ must resolve before launch

1. **Kit contents** (section 8). Confirm 6/6/6 per set (patches, powder vials, sterile water ampules) and that full instructions are printed in every kit. Prep steps now follow the IFU. [TJ CONFIRM]
2. **The five display names** and **every per-blend benefit line** (section 7). [TJ CONFIRM]
3. **Injection-comparison wording** (section 5) and **pain-point lines** (section 3). [TJ CONFIRM]

Resolved by TJ 2026-09-30 (no longer open): clinician clearance not needed; no refunds; shipping left unmentioned; Genesis tagline dropped; 12-hour only; prices unchanged.

---

## 14. Thank-you page — `/go/push-patch/thank-you` (dark, noindex)

Stripe success target. Same standalone look as the landing page.

- Top mark: My4MLife
- Kicker: Genesis Push Patch
- **H1:** Order received.
- Body: Your Push Patch set is being prepared. A receipt is on its way to your email.
- Line: Watch your inbox for a shipping confirmation email. (No timing stated.)
- Footer: Brought to you by My4MLife; tagline (Don't lose your identity and your dignity while you still have a choice.); the patch disclaimer.
- PostHog: `lp_patch_purchase {sku}` with `sku` read from the `?sku=` query parameter.

---
Update 2026-10-01 (P2-D): the refund line is now "Not cleared? Full refund. Final once shipped." (replaces "All sales are final." above, in the under-grid line and FAQ 8), and a process line was added under the grid: "After checkout: a 2-minute health questionnaire, physician review within an hour during business hours, then your kit ships direct."
