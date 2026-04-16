# LDRGLPRx — Project Handoff

## Project Overview
A GLP-1 weight loss telehealth marketing website modeled after medvi.org. The goal is a full platform that promotes GLP-1 medications, takes orders, processes payments, interfaces with telemedicine providers, communicates with pharmacies, and maintains HIPAA compliance.

## Current State — Phase 1 + Marketing (COMPLETE)
**Project folder:** `/Users/thomasmundheim/Desktop/Development/LDRGLPRx/`
**Desktop copy of main page:** `/Users/thomasmundheim/Desktop/LDRGLPRx.html`

### Files Built
| File | Description |
|------|-------------|
| `index.html` | Main landing page — hero, treatments, how it works, testimonials, FAQ, intake form |
| `blog.html` | SEO blog with 3 full articles, newsletter signup, share buttons |
| `bmi-calculator.html` | Interactive BMI calculator with GLP-1 eligibility checker |
| `referral.html` | "Give $50, Get $50" referral program with link generator & share buttons |
| `HANDOFF.md` | This file |

### Main Site (index.html) Features
- Fixed navbar with mobile hamburger menu
- Links to: About GLP-1, Treatments, How It Works, Blog, BMI Check, Refer & Save, FAQ, Get Started
- Hero section with CTA buttons and trust badges (HIPAA, Licensed Physicians, Free Shipping, Secure)
- "What is GLP-1" educational section with stats (15%+ weight loss, 100% doctor supervised, 24/7 access)
- Treatments grid: Semaglutide ($299/mo), Tirzepatide ($399/mo), Oral Semaglutide ($249/mo)
- How It Works: 4-step process (Assessment → Consult → Prescription → Ongoing Support)
- Why Choose Us: 6 benefit cards
- Testimonials: 3 patient stories
- FAQ accordion: 6 questions
- CTA banner section
- Get Started intake form (name, email, phone, DOB, state, treatment interest, goals)
- Footer with links + social icons
- Medical disclaimer bar
- **Floating social media sidebar** (Facebook, Instagram, X, TikTok, YouTube, LinkedIn)
- **Newsletter popup** (appears after 30 seconds, dismissible, stored in sessionStorage)
- **Full SEO meta tags**: description, keywords, Open Graph, Twitter Cards, Schema.org JSON-LD

### Blog (blog.html) Features
- 3 full SEO-optimized articles (500-700 words each):
  1. "Semaglutide vs Tirzepatide: Which Is Right for You?" — with comparison table
  2. "What to Expect During Your First Month on GLP-1" — week-by-week breakdown
  3. "Am I Eligible for GLP-1 Weight Loss Medication?" — complete eligibility guide
- Each article has: read time, date, author, share buttons (copy link, X, Facebook)
- Newsletter signup at bottom of each article
- Sidebar with CTA, table of contents, quick facts
- Full SEO meta tags and Schema.org BlogPosting structured data

### BMI Calculator (bmi-calculator.html) Features
- Fully functional JavaScript BMI calculator
- Imperial/metric toggle
- Visual BMI gauge with animated marker
- Color-coded results by category
- GLP-1 eligibility assessment based on BMI:
  - BMI >= 30: likely eligible (green)
  - BMI 27-29.9: conditionally eligible (yellow)
  - BMI < 27: likely not eligible (blue)
- Educational section about BMI and GLP-1 criteria
- Email capture for results (placeholder)
- SEO optimized for "GLP-1 eligibility calculator", "BMI calculator weight loss"

### Referral Program (referral.html) Features
- "Give $50, Get $50" hero with glass-style cards
- 3-step "How It Works" visual
- Referral link generator (random code, e.g., ldrglprx.com/ref/X7K9P)
- Copy-to-clipboard with visual feedback
- Share buttons: Text (sms:), Email (mailto:), WhatsApp, Facebook, X/Twitter
- Mock rewards tracker with milestone tiers (1 referral = $50, 2 = $100, 3 = free month)
- FAQ accordion about the program
- CTA for non-patients

### Marketing Channels Set Up
- [x] **SEO** — Full meta tags, Schema.org structured data, keyword-optimized content on all pages
- [x] **Blog / Content Marketing** — 3 SEO articles targeting high-search GLP-1 queries
- [x] **Social Media Presence** — Floating social bar (FB, IG, X, TikTok, YT, LinkedIn) on all pages
- [x] **Email Marketing** — Newsletter popup on main page + signup forms on blog
- [x] **Referral Program** — Full referral page with link generation and social sharing
- [x] **Lead Magnet** — Free BMI calculator / eligibility checker to capture interest
- [x] **Social Sharing** — Share buttons on all blog articles

### Marketing Channels Still Needed (Manual Setup)
- [ ] Create actual social media accounts (Instagram, TikTok, Facebook, X, YouTube, LinkedIn)
- [ ] Update social links in floating sidebar and footer with real account URLs
- [ ] Set up Google Business Profile (free, google.com/business)
- [ ] Set up Google Analytics (analytics.google.com) — add tracking snippet to all pages
- [ ] Connect email signup forms to Mailchimp/Brevo (free tiers available)
- [ ] Create first batch of social content (educational GLP-1 posts, reels, shorts)
- [ ] Submit sitemap to Google Search Console for indexing
- [ ] Set up Facebook Pixel for retargeting (when ready for paid ads)
- [ ] Post helpful content on Reddit (r/semaglutide, r/tirzepatide, r/loseit)
- [ ] Create a Facebook Group for patient community

## What's NOT Built Yet (Future Phases)

### Phase 2 — GitHub Repo & Hosting
- [ ] Create GitHub repo for LDRGLPRx
- [ ] Push code
- [ ] Set up GitHub Pages or deploy to Netlify/Vercel
- [ ] Get custom domain (ldrglprx.com or similar)
- [ ] Set up SSL certificate (automatic with Netlify/GitHub Pages)

### Phase 3 — Replace Placeholder Images
- [ ] Hero image: person looking healthy/confident
- [ ] About section: science/medical illustration
- [ ] Treatment cards: product photography (vials, pens, tablets)
- [ ] Blog article images
- [ ] Use royalty-free medical stock photos (Unsplash, Pexels) or commission custom photography

### Phase 4 — Payment Processing
- [ ] Integrate Stripe (stripe.com) for payment processing
- [ ] Create product pages with checkout flow
- [ ] Subscription billing for monthly medication plans
- [ ] Stripe requires a business account and must sign a BAA for HIPAA

### Phase 5 — Telemedicine Integration
- [ ] Partner with a telehealth platform (OpenLoop, Wheel, Truepill, etc.)
- [ ] Integrate their API for scheduling consultations
- [ ] Build patient portal for video visits
- [ ] Or embed partner's scheduling widget

### Phase 6 — Pharmacy Interface
- [ ] Partner with licensed compounding pharmacy
- [ ] Integrate via HL7/FHIR or pharmacy API
- [ ] Automated prescription routing from provider → pharmacy
- [ ] Order tracking and shipping notifications to patients

### Phase 7 — HIPAA-Compliant Backend
- [ ] Move to HIPAA-eligible cloud (AWS with BAA, or similar)
- [ ] Encrypted database for patient records (PostgreSQL with encryption at rest)
- [ ] Encrypted data in transit (TLS everywhere)
- [ ] Role-based access control
- [ ] Audit logging for all data access
- [ ] Sign BAAs with all vendors (Stripe, hosting, telehealth, pharmacy)
- [ ] Patient authentication (secure login, MFA)
- [ ] Consent management system

### Phase 8 — Legal & Compliance
- [ ] Hire healthcare attorney
- [ ] Draft Privacy Policy, Terms of Service, Medical Consent forms
- [ ] HIPAA Notice of Privacy Practices
- [ ] State-by-state telehealth licensing compliance
- [ ] Prescription drug advertising compliance (FDA regulations)

### Phase 9 — Additional Features
- [ ] Patient dashboard (view orders, upcoming consults, track progress)
- [ ] Live chat support widget (Intercom, Drift, or Tidio free tier)
- [ ] Google Analytics + conversion tracking
- [ ] A/B testing on landing page headlines/CTAs

## Tech Stack Recommendations for Full Build
- **Frontend:** React or Next.js
- **Backend:** Node.js or Python (Django) with HIPAA-eligible hosting
- **Database:** PostgreSQL with encryption
- **Hosting:** AWS (with BAA) or Azure Healthcare APIs
- **Payments:** Stripe (with BAA)
- **Telehealth:** OpenLoop Health, Wheel, or similar
- **Pharmacy:** Direct API integration with partner pharmacy
- **Auth:** Auth0 or AWS Cognito with MFA
- **Email Marketing:** Mailchimp (free up to 500 contacts) or Brevo (free up to 300 emails/day)
- **Analytics:** Google Analytics 4 (free)

## Design System
- **Colors:** Primary `#0f4c75`, Accent `#00b894`, Dark `#0a1628`
- **Fonts:** Playfair Display (headings), Inter (body) via Google Fonts
- **Icons:** Font Awesome 6.5 via CDN
- **Border radius:** 12px (cards), 20px (large cards), 50px (buttons)
- **Shadows:** `0 4px 20px rgba(0,0,0,0.1)` (medium), `0 10px 40px rgba(0,0,0,0.12)` (large)

## Related Project
- **Budget App:** `/Users/thomasmundheim/Desktop/Development/Budget/`
- GitHub: `github.com/TJMundheim/budget-1st-draft`
- Features: Month navigation, transaction tracking, monthly comparison table

## Important Notes
- Prices shown ($249-$399/mo) are placeholders — update with real pricing
- Testimonials are fictional — replace with real patient stories (with consent) or remove
- Intake form currently shows a success message only — needs backend (JotForm HIPAA plan recommended for quick setup)
- All "Company" and "Legal" footer links are placeholder `#` hrefs — need real pages
- Social media links in floating sidebar point to platform homepages — update with real account URLs
- Newsletter popup and email captures are front-end only — connect to email marketing service
- Referral codes are generated client-side — need backend to actually track referrals
- SSH key is set up on this Mac for GitHub access
- All pages are self-contained single HTML files with inline CSS/JS — no build tools needed
