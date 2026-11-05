# TJ steps: everything only you can do in App Store Connect

For Dr. TJ. Each step is one click path. Apple renames menus sometimes, so where I could not confirm today's exact wording, the step is marked **(unverified)** and says what to look for instead. Sources I did check: Apple's screenshot specifications page, Apple's Small Business Program page, Apple's subscription help pages, and guides from other companies that match them. I had no sign-in to App Store Connect, so I could not look at the live screens.

Order matters. Do not skip ahead: nothing can be sold until Part 1 is finished, and the subscriptions cannot be attached until Part 3 is finished.

Prerequisite: your Apple Developer Program enrollment is approved (Part 0) and you can sign in at https://appstoreconnect.apple.com as the **Account Holder**. Only the Account Holder can accept the paid agreement and sign tax forms.

Where Claude can prepare is marked **Claude can prepare**.

## Part 0. Enroll as the LLC (the pricing doc's recommendation; 30 minutes, then a wait)

Apple's rules, from its enrollment page: an **organization** account shows the company as the seller and needs a D-U-N-S number, a public website on the company's domain, a work email on that domain and your authority to sign for the company. An **individual** account needs none of that, and shows your personal legal name as the seller. Your site and `drtj@my4mlife.com` cover the website and email.

1. Find the LLC's exact registered name on its state paperwork. D-U-N-S and Apple must match it letter for letter.
2. Look up the D-U-N-S at https://developer.apple.com/enroll/duns-lookup/. It's free. **Don't pay Dun & Bradstreet for anything**; if they try to sell you a faster service, you don't need it.
3. If there is no number, request one from the same page. Apple says up to 5 business days, plus about 2 more before Apple can see it. Allow longer. **(unverified)** how long this really takes today.
4. When Apple can see the number, go to https://developer.apple.com/programs/enroll/, sign in with your Apple Account, choose **Organization**, and pay the $99. Apple may phone you to confirm you can sign for the company. Answer it.
5. **If the organization account isn't approved by Dec 1:** decide whether to enroll as an individual to hold the Jan 4 launch, and move the app to the company later. The last safe submission date in the launch plan is Dec 14. Your name would show as the seller until then.

None of this holds up the real-meal test, which uses your free Apple ID.

## Part 1. Paperwork (about 45 minutes, then Apple takes hours to 2 days)

### 1. Paid Apps Agreement
1. Go to https://appstoreconnect.apple.com and sign in.
2. Click **Business** on the home screen. **(unverified)** Older accounts call it **Agreements, Tax, and Banking**; look for the same three things under either name.
3. Under **Agreements**, find **Paid Apps** (Free Apps is already there; leave it).
4. Click **View and Agree to Terms**, read, tick the box, click **Agree**.
5. The status will say it needs banking and tax. That's next.

### 2. Banking
1. Same Business page, **Banking**, then **Add Bank Account**.
2. Enter the account that should receive the money. If you enrolled as the LLC, use an account in the LLC's name. **(unverified)** whether Apple rejects a mismatch. Apple asks for routing and account number.
3. Save. The status shows **Processing** or **Pending Verification** for up to two business days.
**You do this yourself; Claude never enters bank details.**

### 3. Tax forms
1. Business page, **Tax Forms** (or Tax).
2. For a US person or company: complete the **W-9** (name, address, tax ID type and number, signature). A non-US person would be asked for a W-8 instead.
3. There are also US-only tax forms for some states and Apple's own checks: complete whatever the page lists in red as required.
4. Submit.
**You do this yourself; Claude never enters a tax ID.**

### 4. Small Business Program (do this BEFORE your first sale)
Why: Apple takes 15% instead of 30% on subscription sales. The lower rate starts about 15 days after the end of the fiscal month you are approved, so enrolling after your first sale costs real money.
1. Go to https://developer.apple.com/app-store/small-business-program/ while signed in as the Account Holder.
2. Click **Enroll**. **(unverified)** Apple's page may route you into App Store Connect.
3. Answer the questions: you earned under $1 million last year, and list any other developer accounts you control (answer honestly).
4. Submit and keep the confirmation.
Status: the Paid Apps Agreement must be accepted first (Step 1). A forum report says approval can take weeks. **(unverified)** timing.

### 5. Wait for Active
Back on the Business page, Paid Apps should say **Active** once banking and tax clear. If it still says Pending after 2 business days, use **Contact Us** on that page.

## Part 2. Create the app record

1. App Store Connect home, **Apps**, then the blue **+** at the top left, **New App**.
2. Fill in:
   - Platforms: **iOS**
   - Name: `Count Yourself Skinny`
   - Primary language: **English (U.S.)**
   - Bundle ID: pick `com.my4mlife.countyourselfskinny` from the list. **On a new account it won't be in the list:** do Part 2a first, then come back.
   - SKU: `cys-ios` (any private label; you will never see it again)
   - User Access: **Full Access**
3. Click **Create**.
4. On the left, **App Information**: set Category (Health & Fitness, secondary Lifestyle), Content Rights, and the Privacy Policy URL, using the values in `listing.md`.
5. **Age Rating** (App Information, then Age Rating, **Edit**): answer every question yourself, honestly. `listing.md` section 5 explains the 18+ reasoning.
6. **App Privacy** (left menu): enter the privacy label table from `listing.md` section 6, then click **Publish**. First turn on "Discard client IP data" in PostHog.
7. **Pricing and Availability**: Price **Free** (the app is free; Pro is a subscription). Availability: **United States** only at launch.

### 2a. Bundle ID and HealthKit (do this before Part 2 on a new account)
1. https://developer.apple.com/account then **Certificates, Identifiers & Profiles**, **Identifiers**, **+**.
2. Choose **App IDs**, then **App**, Continue.
3. Description `Count Yourself Skinny`. Bundle ID: **Explicit**, `com.my4mlife.countyourselfskinny`.
4. In the capability list tick **HealthKit**. Continue, then **Register**.
Leave the `.dev` id alone. It belongs to the free test build and never goes to Apple's store.

## Part 3. Subscriptions (needs the app record from Part 2)

1. Open the app, left menu **Subscriptions** (under Monetization). **(unverified)** It may sit under Features.
2. **Create** a subscription group. Reference name: `Count Yourself Skinny Pro`. Click Create.
3. In the group, add the localization: Group display name `Count Yourself Skinny Pro`, language English.
4. Click **+** to create the first subscription:
   - Reference Name: `Pro Yearly`
   - Product ID: `cys.pro.yearly` **Permanent. Type it exactly. It cannot be reused even if deleted.**
   - Subscription Duration: **1 Year**
   - Click **Create**.
5. On the subscription page:
   - **Subscription Prices**, **Add Subscription Price**, choose **United States**, price **$4.99**. Apple may show a "preserve prices in other countries" question; since you sell in the US only, choose to leave other countries off. **(unverified)**
   - **Availability**: United States only.
   - **App Store Localization**, add English: Display Name `Pro Yearly`, Description `Chew counting, chime and trends`.
   - **Review Information**: upload a screenshot of the paywall (the file `screenshots/06-first-meal-free.png` is a good one; Apple wants at least 640 x 920) and a short note: "Paywall shown after the free meal, or from Trends."
   - Do **not** add an introductory offer or promotional offer.
6. Repeat for the second subscription: Reference Name `Pro Monthly`, Product ID `cys.pro.monthly`, Duration **1 Month**, price **$0.99**, display name `Pro Monthly`, same description and screenshot.
7. Order the plans: in the group, set **Yearly** as the top level (Level 1) and **Monthly** below it. The app lists the yearly plan first regardless.
8. Status will say **Missing Metadata** until every field above is filled. When both say **Ready to Submit**, you are done with this part.

Do not submit them yet. They go in with the app version (Part 6).

## Part 4. Build and upload from Xcode (on your Mac)

**Claude can prepare:** regenerate the project, bump the build number, and set the Team once you tell Claude your Team ID (Xcode, Settings, Accounts shows it). Claude will run the test suite first.

1. Install the current released (not beta) Xcode from the Mac App Store. **(unverified)** If your Mac still has an Xcode beta open for iOS 27, use the released one for the upload.
2. Open `apps/count-yourself-skinny-ios/CountYourselfSkinny.xcodeproj`.
3. Xcode, **Settings**, **Accounts**, **+**, add your Apple Account (the one in the developer program). Select it and click **Download Manual Profiles** if it asks.
4. Click the project (blue icon top left), then the target **CountYourselfSkinny**, tab **Signing & Capabilities**. Just under the tabs is a small row: **All**, **Debug**, **Release**. Click **Release**. The real-meal test had you set **Debug** to your Personal Team, and that doesn't carry over.
5. Tick **Automatically manage signing**. Team: pick your paid team (not "Personal Team"). The Bundle Identifier should read `com.my4mlife.countyourselfskinny`, with no `.dev`.
6. Check that the **HealthKit** capability is listed. It only shows under Release. If a red error mentions the App ID, press **Try Again**.
7. Make sure the top bar shows the destination **Any iOS Device (arm64)**.
8. Menu **Product**, **Archive**. Wait a few minutes. The Organizer window opens by itself.
   The Archive command uses the **Release** configuration: that build has HealthKit and no Developer section, which is what Apple should get.
9. In the Organizer select the new archive, click **Distribute App**, choose **App Store Connect**, then **Distribute** (or **Upload**). Accept the defaults (upload symbols, manage version and build number: leave ticked). Click **Upload**.
10. When it says **Upload Successful**, App Store Connect needs 10 to 30 minutes to process. You get an email.
If Xcode complains about a missing icon or a red banner, copy the message to Claude. Claude can fix those.

## Part 5. TestFlight (strongly recommended before submitting)

1. App Store Connect, your app, **TestFlight** tab. The build appears after processing, first with a yellow "Processing" mark.
2. If it asks **Missing Compliance**: click **Manage**, answer that the app uses no non-exempt encryption (the app already declares this with `ITSAppUsesNonExemptEncryption = false`, so the question usually does not appear).
3. Left side, **Internal Testing**, **+**, create a group (for example "TJ"), add yourself by email, and tick **Enable automatic distribution**. Internal testers need no Apple review.
4. On your iPhone, install the free **TestFlight** app, open the invitation email, install, and run the checklist at the bottom of the app's `README.md`, "Only testable on a real iPhone". The big one is the real-AirPods meal. Use this build to record the demo video.
5. To test subscriptions, just buy in the TestFlight build. TestFlight purchases aren't charged, and renewals run fast so you can watch one lapse. You don't need a Sandbox Apple Account for this. **(unverified)** from memory of Apple's TestFlight notes: read the confirmation sheet before you approve it, and confirm it says you won't be charged.
6. For the 5 outside testers in the pricing doc, use an **External Testing** group instead. It needs Apple's beta review of the first build (allow a day or two), so upload well before the date you want them testing. **(unverified)** review timing.

## Part 6. Fill the version page and submit

1. App Store Connect, your app, left side **iOS App**, **1.0 Prepare for Submission**. Change the **Version** box from `1.0` to `1.0.0`, to match the build. If they differ, the build won't appear in step 4. **(unverified)**
2. **Screenshots**: upload the 6 files from `screenshots/` into the 6.9-inch slot, in numeric order.
3. **Promotional Text, Description, Keywords, Support URL, Marketing URL, Copyright**: paste from `listing.md`. A first version usually has no What's New box. Skip it if it isn't there.
4. **Build**: click **+ Add Build** (or "Select a build before you submit your app") and choose the build you uploaded.
5. **In-App Purchases and Subscriptions** section on this same page: click **+** and tick **both** `cys.pro.yearly` and `cys.pro.monthly`. **If you skip this, the reviewer's paywall cannot load plans.** This is the step people miss. Apple requires the first subscription to go in with a new app version. **(unverified)** It may live as "Add for Review" on the subscription page.
6. **App Review Information**: your contact details, sign-in not required, paste the Notes from `listing.md`, attach the demo video.
7. **Version Release**: choose **Manually release this version**, so approval does not go live by surprise. You press the button when you're ready. The launch plan has the app live by Dec 8, quietly, ahead of the Jan 4 public push.
8. Top right, **Add for Review**, then **Submit to App Review**. If it lists problems, fix them first.
9. Watch your email. Typical review is 1 to 2 days. If rejected, send the message to Claude; most rejections are a one-line answer or a small metadata change.

## Where Claude can prepare, in one list
- Done in this folder: listing text with checked counts, 6 screenshots plus the generator, review notes, demo video script, these steps.
- On request: bump the build number, set the Team ID in the project, run all tests, regenerate the project, trim or compress the demo video, answer a rejection message, re-take screenshots from a TestFlight build.
- Never Claude: banking, tax forms, agreements, age rating answers, sandbox sign-ins, pressing Submit.

## What I could not verify
- Exact current menu names in App Store Connect (Business vs Agreements, Tax, and Banking; where Subscriptions sits; Add for Review wording). I had no account access.
- That iPhone screen recording captures the chime while AirPods are connected (test it first).
- Review video file size limit.
- How long the Small Business Program approval takes today.
- Whether the 15% rate also applies to the first sale if you enroll after the agreement but before launch (Apple's page says it starts 15 days after the end of the fiscal month of approval; check the page when you enroll).
