# LDRGLPRx — Project Handoff

## Project Overview
A GLP-1 weight loss telehealth marketing website modeled after medvi.org. The goal is a full platform that promotes GLP-1 medications, takes orders, processes payments, interfaces with telemedicine providers, communicates with pharmacies, and maintains HIPAA compliance.

## Current State
**Project folder:** `/Users/thomasmundheim/Desktop/Development/LDRGLPRx/`
**GitHub:** `github.com/TJMundheim/LDRGLPRx`
**Live (once Pages enabled):** `https://tjmundheim.github.io/LDRGLPRx/`

## All Files Built

### Main Pages
| File | Description |
|------|-------------|
| `index.html` | Landing page — hero, treatments, how it works, testimonials, FAQ, intake form, floating social bar, newsletter popup |
| `about.html` | Our Story, Values, Medical Team bios, Pharmacy Partners, stats |
| `blog.html` | 3 SEO articles: Semaglutide vs Tirzepatide, First Month Guide, Eligibility Guide |
| `bmi-calculator.html` | Interactive BMI calculator with GLP-1 eligibility checker |
| `contact.html` | Contact cards, form, emergency notice, FAQ quick-links |
| `referral.html` | Give $50/Get $50 program with link generator + share buttons |
| `links.html` | Linktree-style page for Instagram/TikTok bios |
| `404.html` | Styled error page |

### Legal / Compliance
| File | Description |
|------|-------------|
| `privacy.html` | HIPAA-compliant Privacy Policy (12 sections, TOC) |
| `terms.html` | Terms of Service (comprehensive legal terms) |
| `consent.html` | Medical & Telehealth Consent with interactive checkbox form |

### Infrastructure
| File | Description |
|------|-------------|
| `sitemap.xml` | All 9 pages with priorities and lastmod |
| `robots.txt` | Allows all crawlers, points to sitemap |
| `cookie-banner.js` | Cookie consent banner + GA4 placeholder |
| `images/` | 6 stock photos: hero, science, semaglutide, injection, pills, telehealth |

## Features

### Marketing Already Wired In
- [x] Full SEO meta tags on every page (Open Graph, Twitter Cards, Schema.org)
- [x] 3 SEO-optimized blog articles
- [x] Floating social sidebar (FB, IG, X, TikTok, YT, LinkedIn) on main page
- [x] Newsletter popup (30s delay, localStorage-dismissible)
- [x] Referral program with share buttons (SMS, email, WhatsApp, FB, X)
- [x] Lead magnet (BMI calculator)
- [x] Share buttons on blog articles
- [x] Cookie consent banner
- [x] Linktree-style page for social media bios
- [x] Sitemap + robots.txt

### What Still Needs Manual Setup
- [ ] Create real social media accounts → update links in all pages
- [ ] Enable GitHub Pages at: https://github.com/TJMundheim/LDRGLPRx/settings/pages
- [ ] Buy a real domain (ldrglprx.com recommended)
- [ ] Set up Google Business Profile (free)
- [ ] Create Google Analytics 4 account → replace `G-XXXXXXXXXX` in cookie-banner.js
- [ ] Submit sitemap to Google Search Console
- [ ] Set up email service (Mailchimp free tier or Brevo)
- [ ] Connect intake/contact forms to a real backend (JotForm HIPAA plan recommended, $34/mo)

## Still To Build (Future Phases)

### Phase 2 — Real Hosting
- Enable GitHub Pages (or deploy to Netlify/Vercel)
- Buy custom domain
- Configure SSL (automatic with GH Pages/Netlify)

### Phase 3 — Replace Stock Photos
- Currently using free Unsplash/Pexels photos in `/images/`
- Consider commissioning custom photography for hero + team

### Phase 4 — Payment Processing
- Stripe account with BAA signed
- Product pages with checkout flow
- Subscription billing

### Phase 5 — Telemedicine Integration
- Partner with OpenLoop, Wheel, or similar
- Integrate scheduling API or embed widget

### Phase 6 — Pharmacy Interface
- Partner with licensed compounding pharmacy
- HL7/FHIR or direct API integration
- Automated Rx routing + order tracking

### Phase 7 — HIPAA Backend
- HIPAA-eligible cloud (AWS + BAA)
- Encrypted database for patient records
- Role-based access + audit logging
- Patient authentication with MFA

### Phase 8 — Legal
- Healthcare attorney review of all legal pages
- State-by-state telehealth licensing
- FDA prescription drug advertising compliance

## Design System
- **Colors:** Primary `#0f4c75`, Accent `#00b894`, Dark `#0a1628`
- **Fonts:** Playfair Display (headings), Inter (body)
- **Icons:** Font Awesome 6.5 via CDN
- **Border radius:** 12px cards, 20px large cards, 50px buttons

## Related Project
- **Budget App:** `/Users/thomasmundheim/Desktop/Development/Budget/`
- GitHub: `github.com/TJMundheim/budget-1st-draft`

## Important Notes
- Prices ($249-$399/mo) are placeholders
- Testimonials are fictional
- Doctor bios in About Us are placeholders
- All forms are front-end only (need backend)
- Social media links point to platform homepages (need real URLs)
- SSH key configured on this Mac for GitHub access
