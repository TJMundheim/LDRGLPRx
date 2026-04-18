# LDRGLPRx — Handoff (Current State)

## Project
GLP-1 weight loss telehealth marketing site (modeled after medvi.org). Static HTML, no build step.

- **Working dir:** `/Users/thomasmundheim/Desktop/Development/LDRGLPRx/`
- **Git remote:** `github.com/TJMundheim/LDRGLPRx` (branch: `main`, in sync with origin)
- **Intended domain:** `ldrglprx.com` (NOT YET REGISTERED — user plans to buy)
- **Local preview:** `python3 -m http.server 8000` from the project root

## AWS
- `aws-cli/2.34.32` installed via pkg installer
- `~/.aws/credentials` + `~/.aws/config` configured
- IAM user: `tmundheim`, account `879696522760`, region `us-east-2`
- Output format: not set (defaults to json)
- **No AWS resources created yet** — deployment is pending domain purchase

## Planned deployment (not built)
- Target bucket name: `website-ldrglprx`
- Deployment must be via a single `deploy.sh` script (no CloudFormation, no direct CLI)
- Script should handle both infra bootstrap AND content sync (detect & create missing)
- HTTPS via CloudFront + ACM (us-east-1 cert), custom domain to be attached after purchase
- `deploy.sh` has NOT been written yet

## File inventory
| File | Purpose |
|---|---|
| `index.html` | Landing page — hero, treatments, about GLP-1, how it works, FAQ, intake form |
| `about.html` | Our Story, Values, Medical Team, Pharmacy Partners, stats, FAQ |
| `blog.html` | 3 full articles on a single page (TLDR + rich content each) — SEE "Pending Split" below |
| `bmi-calculator.html` | Interactive BMI tool + GLP-1 eligibility indicator, FAQ |
| `contact.html` | Contact cards, form, emergency notice, FAQ |
| `referral.html` | Give $50 / Get $50 referral program, FAQ |
| `links.html` | Linktree-style link hub |
| `privacy.html`, `terms.html`, `consent.html` | Legal pages |
| `404.html` | 404 page (noindex) |
| `cookie-banner.js` | Cookie consent banner |
| `robots.txt` | Permissive, points to sitemap.xml |
| `sitemap.xml` | 10 URLs, lastmod `2026-04-18` |
| `images/` | Static images (og-image.jpg, hero.jpg, etc.) |

## SEO / AEO state (just completed)
Every indexed page has full JSON-LD structured data:

| Page | Schemas present |
|---|---|
| `index.html` | Organization, WebSite, MedicalBusiness (3 services), WebPage, BreadcrumbList, **FAQPage (8 Q)** |
| `blog.html` | Organization, WebSite, Blog, BreadcrumbList, 3× MedicalWebPage, **FAQPage (6 Q)** |
| `about.html` | Organization (with knowsAbout), AboutPage, BreadcrumbList, **FAQPage (5 Q)** — visible FAQ section added |
| `bmi-calculator.html` | Organization, WebApplication (with AggregateRating), MedicalWebPage, HowTo (5 steps), BreadcrumbList, **FAQPage (6 Q)** — visible FAQ section added |
| `referral.html` | Organization, WebPage, BreadcrumbList, **FAQPage (4 Q)** |
| `contact.html` | Organization (3 ContactPoints with hours), ContactPage, BreadcrumbList, **FAQPage (4 Q)** — visible FAQ section added |
| `privacy.html` | Organization, PrivacyPolicy, BreadcrumbList |
| `terms.html` | Organization, TermsOfService, BreadcrumbList |
| `consent.html` | Organization, MedicalWebPage, BreadcrumbList |
| `links.html` | Organization, CollectionPage, BreadcrumbList |
| `404.html` | None (noindex) |

**TLDR blocks:** visible `<aside class="tldr-box">` at top of each of the 3 blog articles with summary paragraph + 6 bullet points. AEO-optimized for LLM extraction.

**Sitemap:** bumped all `lastmod` to `2026-04-18`, added `links.html`.

**llms.txt:** intentionally NOT added — user doesn't want one.

## Pending / open work

### 1. Blog split (AGREED, NOT STARTED)
User wants `blog.html` split into separate article pages for SEO (avoid one URL hosting all 3 posts). Decided structure:
- Keep `blog.html` as listing page (cards with excerpts + TLDR previews + "Read full article" links)
- Create `/blog/semaglutide-vs-tirzepatide.html`
- Create `/blog/what-to-expect-first-month-glp1.html`
- Create `/blog/am-i-eligible-for-glp1.html`
- Each article gets its own canonical, JSON-LD (Article/MedicalWebPage + Breadcrumb + per-article FAQPage), related-reading links
- Listing page gets `Blog` + `ItemList` schema
- Plan was to extract shared CSS to `/blog/article.css` to avoid 4× CSS duplication
- Update `sitemap.xml` with the 3 new article URLs
- `/blog/` directory has already been created (empty)

### 2. Split other pages (USER-REQUESTED, UNDECIDED SCOPE)
User said "other pages need split outs too not just blogs." Candidates proposed:
- **Treatments split** (highest AEO value): `index.html#treatments` → `/treatments/semaglutide.html`, `/treatments/tirzepatide.html`, `/treatments/oral-glp1.html` — each drug gets its own rankable page
- **About split** (lower value): `about.html` → `/about/team.html`, `/about/pharmacy-partners.html`
- **Awaiting user confirmation** on which to do before implementing

### 3. Domain + deployment
- User needs to register `ldrglprx.com` first (registrar TBD — Route 53 is simplest)
- Then write `deploy.sh` (specs above under "Planned deployment")

### 4. Nice-to-haves (not requested, flag if relevant)
- robots.txt could add explicit allow lines for GPTBot/ClaudeBot/PerplexityBot (AEO)
- Open Graph images could be made page-specific (most pages share `images/og-image.jpg`)

## Git
```
main (clean, synced with origin)
Recent commits:
  042a486 Update HANDOFF with all completed pages and marketing features
  605f908 Add legal pages, about, contact, SEO infrastructure, and marketing
  df53208 Initial launch of LDRGLPRx marketing site
```
All SEO/AEO work done this session is **uncommitted** — user has not asked for a commit.

## User preferences observed
- Terse responses preferred
- Don't over-engineer; confirm scope before big refactors
- No emojis unless asked
- No llms.txt
- Deployment must go through `deploy.sh`, not direct CLI or CloudFormation
