# My4MLife Site — New Visitor QA Walkthrough
Date: 2026-04-28
Scope: marketing site at https://www.my4mlife.com

---

## Critical issues (ship blockers)

- [ ] **STALE DEPLOY — latest source code not live.** The most recent committed version of `website/src/components/Navbar.astro` (commit `4efec201`) contains high-intent SEO nav labels (`Gut Health / Leaky Gut`, `Testosterone Therapy`, `GLP-1 Weight Loss`, `Brain Optimization`, `Peptides`) and links to `/solutions/peptides`. The live site still serves the prior build with generic short labels (`Gut Health`, `Hormones`, `Weight`, `Sleep`, `Cognitive`) and no Peptides link. Every change after commit `91fad473` is invisible to visitors. **All issues flagged below should be re-verified after redeployment.**
  - Source file: `website/src/components/Navbar.astro` lines 63–67
  - Severity: **Critical** — SEO and content changes are not visible to any visitor.

- [ ] **/consult 404s everywhere it is used as a primary CTA.** The path `/consult` is referenced in four locations as the main consultation booking CTA and returns HTTP 404. No consult page exists in `website/src/pages/`. Visitors hitting "Schedule Your Comprehensive 4M Consult" go to a dead end.
  - `website/src/pages/index.astro` line 25
  - `website/src/layouts/SolutionPage.astro` line 62
  - `website/src/pages/assessment.astro` line 153
  - `website/src/pages/solutions/nutrition.astro` line 47 (label also wrong — see Content issues)
  - Severity: **Critical** — the primary paid-conversion CTA is broken sitewide.

- [ ] **/solutions/peptides 404s and is linked from the navbar (source).** The source Navbar.astro links to `/solutions/peptides` on desktop (line 67) and mobile (line 136). No such page exists. When the stale deploy is corrected, this will become a live 404.
  - Severity: **Critical** — will surface immediately on redeploy.

---

## Functional issues (broken links, dead CTAs, wrong destinations)

- [ ] **Blog "Related Posts" links all 404.** Every related-post card in all three blog posts uses root-level paths without the `/blog/` prefix. These return HTTP 404.
  - `website/src/pages/blog/am-i-eligible-for-glp1.astro` lines 131, 135 — links to `/semaglutide-vs-tirzepatide`, `/what-to-expect-first-month-glp1`
  - `website/src/pages/blog/what-to-expect-first-month-glp1.astro` lines 130, 134 — same issue
  - `website/src/pages/blog/semaglutide-vs-tirzepatide.astro` lines 153, 157 — same issue
  - Fix hint: change to `/blog/semaglutide-vs-tirzepatide`, etc.

- [ ] **Blog breadcrumb "Home" link 404s.** All three blog posts have breadcrumb links using `href="/index"` (line 21 in each file). `/index` returns HTTP 404. Should be `/`.
  - `website/src/pages/blog/am-i-eligible-for-glp1.astro` line 21
  - `website/src/pages/blog/what-to-expect-first-month-glp1.astro` line 21
  - `website/src/pages/blog/semaglutide-vs-tirzepatide.astro` line 23

- [ ] **Footer "Live Coaching" link 404s.** `website/src/components/Footer.astro` line 36 links to `/live-coaching`, which returns HTTP 404. No page exists at that path.

- [ ] **Footer "Resources" link 404s.** `website/src/components/Footer.astro` line 37 links to `/resources`, which returns HTTP 404.

- [ ] **Footer "Press" link 404s.** `website/src/components/Footer.astro` line 48 links to `/press`, which returns HTTP 404.

- [ ] **/downloads/morning-protocol 404s.** The Morning Routine solution page has a primary download CTA pointing to `/downloads/morning-protocol`, which returns HTTP 404. No file exists at that path.
  - `website/src/pages/solutions/morning-routine.astro` line 47

- [ ] **`/#get-started` anchor does not exist on the homepage.** The About page (lines 23, 219) links to `/#get-started`. No element with `id="get-started"` exists in `website/src/pages/index.astro` or `website/src/layouts/BaseLayout.astro`. Clicking these CTAs silently scrolls to the top of the homepage with no visible feedback.

- [ ] **/sitemap.xml 404s; robots.txt references `/sitemap-index.xml`.** The `robots.txt` Sitemap directive points to `https://my4mlife.com/sitemap-index.xml` (HTTP 200), but `/sitemap.xml` returns HTTP 404. Not a hard error, but any tool submitting `/sitemap.xml` will fail. Confirm the correct sitemap URL is what's been submitted to Google Search Console.

- [ ] **Social footer icons all use `href="#"`.** Facebook, Instagram, X/Twitter, and LinkedIn icons in `website/src/components/Footer.astro` lines 67–70 link to `#`. Users who click them stay on the current page with no indication these are placeholder links.

- [ ] **Nutrition page CTA label "Get Sourcing Guide" goes to `/consult` (404).** The label implies a downloadable guide but routes to a consultation booking page that doesn't exist.
  - `website/src/pages/solutions/nutrition.astro` line 47

---

## Content issues (brand residue, confusing terms, missing rewrites)

- [ ] **"Essential Manage" brand name appears on multiple live pages.** The old brand name persists in page titles, meta tags, JSON-LD, and visible body copy across several pages. Visitor-visible instances:
  - `/tiers` — `<title>` reads "Essential Manage | 4M Protégé + Insider Membership"; body copy line 85: "Two ways to engage with Essential Manage…"
  - `/4m-cohort` — `<title>` reads "…| Essential Manage"; JSON-LD `"name": "Essential Manage"` (line 16 of source)
  - `/genesis-rpa` — `<title>` reads "Genesis RPA — Regenerative Protein Array | Essential Manage"; body copy mentions "Essential Manage Longevity tier members" (source line 225)
  - `/protocols` — title and description both say "Essential Manage" (source lines 4–5)
  - `/biomeaxisforge` — `<title>` includes "| Essential Manage" (source line 4)
  - Files: `website/src/pages/tiers.astro`, `website/src/pages/4m-cohort.astro`, `website/src/pages/genesis-rpa.astro`, `website/src/pages/protocols.astro`, `website/src/pages/biomeaxisforge.astro`

- [ ] **Blog section is entirely GLP-1 / weight-loss focused.** All three published blog posts are about GLP-1 medications (Semaglutide vs Tirzepatide, eligibility, first-month expectations). The blog index `<title>` is "GLP-1 Weight Loss Blog — My4MLife Health Articles." For a brain-healthspan brand targeting cognitive aging in men 35–60, this signals a narrow, old-positioning tone that does not match the 4M framework.
  - `website/src/pages/blog.astro` — title on line 4; post list lines 27–65

- [ ] **/bmi-calculator page H1 and title are "Free GLP-1 Eligibility Check."** This page exists at a BMI calculator URL but is entirely framed around GLP-1 prescription eligibility — inconsistent with the broader 4M brain-optimization brand identity. Acceptable if this is intentional for a weight-loss acquisition funnel, but it is off-brand in isolation.

- [ ] **`/4m-cohort` page title and JSON-LD org name use "Essential Manage."** A visitor sharing or bookmarking this page sees the old brand name in browser tabs and social previews.

- [ ] **The `/links` page has no visible content.** The page returns HTTP 200 but renders no H1, no H2, and no external links visible in the parsed output. If this is a link-in-bio style page it appears empty to visitors (or requires JS that may not run in some environments). Source: `website/src/pages/links.astro`.

---

## SEO / metadata issues

- [ ] **Solution pages have no `<meta name="keywords">` tag.** All six primary solution pages (`/solutions/gut`, `/solutions/hormones`, `/solutions/weight`, `/solutions/cognitive`, `/solutions/sleep`, `/solutions/stress`) render zero keywords meta tags. The `SolutionPage.astro` layout does not inject a keywords tag. Keyword tags are low-signal for Google but matter for other crawlers and AEO (given that robots.txt explicitly invites GPTBot, ClaudeBot, PerplexityBot, etc.).
  - `website/src/layouts/SolutionPage.astro`

- [ ] **`/solutions/gut` — "leaky gut" does not appear in H1, title, or meta description.** The page title is "Gut Health | My4MLife" and the meta description reads "Most cognitive decline starts in the gut — decades before you feel it." Neither contains "leaky gut," which is the highest-intent search term for this category. "Leaky gut" appears zero times in the rendered page body.

- [ ] **`/solutions/hormones` — "testosterone therapy" and "TRT" have minimal presence.** The title is "Hormone Health | My4MLife." "TRT" appears twice in body copy; "testosterone therapy" appears zero times. For high-intent visitors searching "testosterone therapy" or "TRT clinic," this page will underperform.

- [ ] **`/solutions/cognitive` — "brain optimization" and "biohacking" both appear zero times** in the rendered page. The title is "Cognitive Performance | My4MLife." Missing explicit high-intent terms.

- [ ] **OG image for most pages is an SVG logo (`/logos/concept-13/lockup-color.svg`).** Facebook, LinkedIn, and Twitter/X do not render SVGs as social preview images. Shared links for the homepage and all solution pages will show a broken or blank preview image. Only `/4m-cohort` uses a JPG OG image (`/images/og-image.jpg`), but that JPG itself returns HTTP 404.

- [ ] **`/images/og-image.jpg` referenced by `/4m-cohort` returns HTTP 404.** OG image for the primary program sales page is broken.
  - `website/src/pages/4m-cohort.astro` — `og:image` property

- [ ] **Canonical URLs use non-www (`https://my4mlife.com/`) while the site is served at `https://www.my4mlife.com/`.** Both domains return HTTP 200 without a redirect. Google will treat them as separate URLs until a canonical redirect or consistent canonical tag is in place. All canonicals in `website/src/layouts/SolutionPage.astro` and `website/src/components/SEO.astro` use `https://my4mlife.com/...` but the CloudFront distribution serves at `www.my4mlife.com`. Either the www domain should 301 to non-www (or vice versa), or all canonical tags should be updated to match the serving domain.

- [ ] **`/sitemap-index.xml` is present but no `sitemap.xml` exists.** The sitemap index format is fine, but the discrepancy between what the robots.txt references and what tools typically check (`/sitemap.xml`) may cause issues with automated submission or third-party audits.

- [ ] **`rel="apple-touch-icon"` points to an SVG (`/logos/concept-13/app-icon.svg`).** iOS does not support SVG for apple-touch-icon. The icon will fall back to a screenshot on iOS home screen bookmarks. A PNG version is needed.
  - `website/src/layouts/BaseLayout.astro` and `website/src/components/SEO.astro`

---

## Visual / responsive concerns (static analysis only)

- [ ] **Desktop nav "Take the Free Assessment ›" button is the only nav CTA visible on mobile in the rendered source.** The desktop `<ul class="nav-links">` is replaced by the mobile accordion. However, the mobile flat-solutions block still uses short labels (`Gut Health`, `Hormones`, `Weight`, `Sleep`, `Cognitive`) matching the stale deploy — not the SEO-optimized labels in current source. Once redeployed, mobile labels will reflect the new verbose names, which may overflow at small font sizes if not styled for wrapping.

- [ ] **Dropdown trigger buttons have no visible text label.** The "Environmental Factors" and "More" dropdown buttons in the rendered HTML contain only the chevron SVG with no label text between the button tags in the live render. In the source `Navbar.astro` the button text is present (lines 72, 88–89). This could be a CSS truncation issue on the live (stale) build or a rendering artifact.

---

## Suggested polish (not blocking but worth doing)

- [ ] **Assessment results CTA chain is good but "Schedule Your Comprehensive 4M Consult" as secondary CTA leads to 404.** Once `/consult` is created, this flow (assessment → results → app OR consult) will be clean. The copy is appropriate.

- [ ] **`/tiers` page H1 references "Essential Manage" in body text.** Even after title fixes, the phrase "Two ways to engage with Essential Manage…" will remain visible to visitors unless the body copy is also updated.

- [ ] **`/genesis-rpa` body copy line references "Essential Manage Longevity tier" — a tier that does not exist in the current tier structure** (`/tiers` shows Protégé, Insider, and Insider Concierge). This creates a confusing visitor experience.
  - `website/src/pages/genesis-rpa.astro` line 225

- [ ] **`/protocols` page is not linked from the main nav, footer, or homepage.** It's reachable only by direct URL. If it's intended to be a public-facing page, it needs a navigation entry or an inbound link.

- [ ] **`/biomeaxisforge` and `/genesis-rpa` are not linked from the main nav, footer, or homepage.** Same as above — no navigation path from main site to these product pages.

- [ ] **`/logos` page is public and reachable.** A brand/press assets page at `/logos` is publicly accessible without being linked from the nav or footer. If it is a press-only resource, consider password-protecting or restricting it.

- [ ] **Blog lacks any brain-health or 4M-related posts.** Three GLP-1 posts only. A new visitor arriving from a cognitive health search who explores the blog will find content mismatched to the brand's stated focus.

- [ ] **`/4m-cohort` page FAQ answers contain the phrase "We have never had a Month 1 where someone followed the protocol and saw nothing."** This is strong marketing language embedded in a FAQ schema block. While not a compliance concern per standing instructions, it sets an absolute expectation that could harm credibility if any user has a poor experience.

- [ ] **`rel="noopener"` is missing on some external `target="_blank"` links.** Most app.my4mlife.com links include `rel="noopener"` but spot-checking shows inconsistency. Full audit of all `target="_blank"` anchors is warranted.

---

## Verified working

- [x] Homepage (/) — HTTP 200, title and meta description present and on-brand, favicon linked
- [x] /assessment — HTTP 200, H1 present, assessment form exists, "Continue in the My4MLife App" CTA correctly targets `https://app.my4mlife.com/?source=public-assessment`
- [x] /solutions/gut — HTTP 200, 4-section structure (Problem / Insulting Behaviors / Eliminate / Solution Path) intact
- [x] /solutions/hormones — HTTP 200, 4-section structure intact
- [x] /solutions/weight — HTTP 200, 4-section structure intact, GLP-1 keywords present
- [x] /solutions/cognitive — HTTP 200, 4-section structure intact
- [x] /solutions/sleep — HTTP 200, 4-section structure intact
- [x] /solutions/stress — HTTP 200
- [x] /solutions/environment/* (air, emf, grounding, light, water) — all HTTP 200
- [x] /solutions/pain-acute, /solutions/pain-chronic, /solutions/allergies, /solutions/dental — all HTTP 200
- [x] /solutions/nutritional-supplements, /solutions/substance-use, /solutions/nutrition — all HTTP 200
- [x] /solutions/morning-routine, /solutions/purpose-goals, /solutions/self-image — all HTTP 200
- [x] /solutions/financial-stress, /solutions/health-knowledge, /solutions/healthcare-access — all HTTP 200
- [x] /solutions/vitamin-d — HTTP 200 (note: likely the same as nutritional-supplements per prior notes)
- [x] /blog — HTTP 200
- [x] /blog/am-i-eligible-for-glp1 — HTTP 200
- [x] /blog/semaglutide-vs-tirzepatide — HTTP 200
- [x] /blog/what-to-expect-first-month-glp1 — HTTP 200
- [x] /4m-cohort — HTTP 200
- [x] /tiers — HTTP 200
- [x] /about — HTTP 200
- [x] /contact — HTTP 200
- [x] /privacy — HTTP 200
- [x] /terms — HTTP 200
- [x] /consent — HTTP 200
- [x] /referral — HTTP 200
- [x] /links — HTTP 200 (but appears to have no visible content — see Content issues)
- [x] /genesis-rpa — HTTP 200
- [x] /biomeaxisforge — HTTP 200
- [x] /protocols — HTTP 200
- [x] /bmi-calculator — HTTP 200
- [x] /robots.txt — HTTP 200, AEO crawlers explicitly allowed, sitemap directive present
- [x] /sitemap-index.xml — HTTP 200
- [x] /favicon.svg — HTTP 200
- [x] Sign In button in nav → `https://app.my4mlife.com` (correct destination, serves "4M Client Portal")
- [x] "Get the My4MLife App" CTA on homepage → `https://app.my4mlife.com` (correct)
- [x] app.my4mlife.com — HTTP 200, serves "4M Client Portal" (Svelte PWA)
- [x] All solution pages reachable from nav dropdown "More" menu — all HTTP 200
- [x] All Environmental Factors dropdown pages — all HTTP 200
- [x] Footer solution links (Gut, Hormones, Weight, Sleep, Cognitive, Stress) — all HTTP 200
- [x] Footer legal links (Privacy, Terms, Consent) — all HTTP 200

---

## Summary counts

| Severity | Count |
|---|---|
| Critical (ship blockers) | 3 |
| Functional (broken links, dead CTAs) | 9 |
| Content (brand residue, off-brand content) | 5 |
| SEO / metadata | 8 |
| Visual / responsive | 2 |
| Suggested polish | 8 |
| **Total issues** | **35** |

Total pages walked: **55** (47 internal pages + 8 supporting paths: robots.txt, sitemap-index.xml, favicon, app subdomain, images/og-image.jpg, 3 blog posts)
