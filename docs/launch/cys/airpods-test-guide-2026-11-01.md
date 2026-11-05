# Chew Lab test guide — your iPhone + your AirPods

For: Dr. TJ. Date: 2026-11-01, updated 2026-11-04 (first-run screens, free meal). Time needed: about 30 minutes to install (first time), then three lunches you'd eat anyway.

This test build installs with a free Apple ID, before paid enrollment. **Apple Health is switched off in it.** The Steps row says "Tap to connect steps"; after you tap it, it stays at 0 and says "No steps yet. If Health access is off, turn it on in Settings > Privacy & Security > Health." That is expected. You don't need to change anything in Settings. Steps come back in the App Store build.

What you are testing: the Count Yourself Skinny app listens to your AirPods' head-motion sensors and counts your chews. You will check whether its count matches yours, then send the recorded data back so it can be tuned.

---

## 1. Before you start

- [ ] **AirPods that work:** AirPods Pro (any), AirPods (3rd generation or newer), or AirPods Max. Older AirPods (1st or 2nd generation) will not work.
- [ ] **iPhone:** needs iOS 17.0 or newer. Check: Settings → General → About → iOS Version.
- [ ] **Charge both** the iPhone and the AirPods (at least half).
- [ ] You need a **cable** to plug the iPhone into the Mac (the one that charges it).
- [ ] Your **Apple ID** email and password (the same one you use on the iPhone).

## 2. Install the app on your iPhone (one time)

You do this on the Mac.

1. In Finder, open: `Development` → `LDRGLPRx` → `apps` → `count-yourself-skinny-ios`, and double-click **CountYourselfSkinny.xcodeproj**. Xcode opens.
   - Full path: `/Users/thomasmundheim/Development/LDRGLPRx/apps/count-yourself-skinny-ios/CountYourselfSkinny.xcodeproj`
2. **Sign in with your Apple ID** (skip if already signed in): top menu **Xcode → Settings… → Accounts**, click **+** at the bottom left, choose **Apple ID**, sign in.
3. In Xcode's left sidebar click the blue **CountYourselfSkinny** project icon at the very top. In the middle, under **Targets**, click **CountYourselfSkinny**. Click the **Signing & Capabilities** tab.
4. Just under the tabs you will see a small row: **All**, **Debug**, **Release**. Click **Debug**. That is the build you are installing. Ignore anything shown under **Release**, including HealthKit or any red error there.
5. **Team:** no team is pre-selected (it is left blank on purpose). Click the **Team** drop-down and choose your name followed by **(Personal Team)**. Leave **Automatically manage signing** checked. Leave the Bundle Identifier as is: `com.my4mlife.countyourselfskinny.dev`. The `.dev` ending keeps this test separate from the App Store name.
   - If Xcode shows a red "bundle identifier is not available" or "failed to register" message: change the Bundle Identifier by adding your initials at the end, for example `com.my4mlife.countyourselfskinny.dev.tj`. This is only for this test.
6. **Plug in the iPhone** with the cable. Unlock it. When it asks **Trust This Computer?** tap **Trust** and enter your iPhone passcode.
7. **Turn on Developer Mode on the iPhone** (iOS 16 and newer requires this):
   Settings → Privacy & Security → scroll to the bottom → **Developer Mode** → switch on → tap **Restart** → after it restarts, unlock and tap **Turn On** → enter passcode.
   - The Developer Mode line only appears after the iPhone has been plugged in and Xcode has seen it. If you don't see it, finish step 8 first (the first Run attempt will make it appear), turn it on, then press Run again.
8. At the top center of the Xcode window there is a device menu next to the name "CountYourselfSkinny". Click it and pick **your iPhone** (not a "Simulator" iPhone).
9. Press the **Run** button (the ▶ triangle at top left, or press **⌘R**). Wait for "Build Succeeded". The app installs on your phone. The first build takes a couple of minutes.
10. It will fail to open the first time with an "Untrusted Developer" message. That is normal. On the iPhone: **Settings → General → VPN & Device Management** → under **Developer App** tap your Apple ID email → **Trust** → **Trust** again.
11. Open **Count Skinny** from the iPhone home screen (or press Run again). That is the short name under the icon. Inside, the app's title still reads Count Yourself Skinny.
    - It will not ask about Health in this build.
12. The first time it opens, you get two screens, once each:
    - **Before you start.** Read it and tap **Continue**.
    - **Share usage events?** Tap **No** or **Yes**. Nothing is sent from this test build either way. You can change it later under **About**.
13. The home screen shows a card, **What's your chew number?** Tap **Not now** for this test. The row stays on the home screen for later.

**Good to know:** apps installed with a free Apple ID **stop opening after 7 days**. If that happens, plug in the phone and press Run again in Xcode.

You won't see the "What comes after skinny?" card on the home screen during this test. It stays hidden until a 30-day streak or 12 weeks of use.

## 3. Open Chew Lab

1. On the app's home screen, scroll to the section headed **Developer**. (It only exists in this test build. App Store customers never see it.)
2. Tap **Chew Lab — AirPods prototype**.
3. Put your AirPods in your ears (both). Make sure they are connected to this iPhone (the little AirPods pop-up appears or they show in Control Center).
4. At the top of the Chew Lab screen you will see one of:
   - **"AirPods not connected"** (grey) — normal until you tap Start; then it should turn to green **"AirPods connected"** within a few seconds.
   - **"Not supported on this device/simulator"** (orange) — see "If something goes wrong" below.
5. Scroll down to the **Controls** section and tap **Start**. The first time, the phone asks for **Motion & Fitness / Motion access** — tap **Allow**.
6. What you should see:
   - A big number = **chews this bite** (counting up to 32; at 32 it buzzes strongly, adds 1 to **bites**, and starts over at 0).
   - Small numbers under it: **chews/min**, **session total**, **bites**.
   - A **Signal** line graph with a dashed orange line (the line that a movement has to rise above to count as a chew).
   - Each chew gives a light tap on the phone if "Haptic tick on each chew" is on. (If you hold the phone, you will feel it. For the test you can switch that off.)
7. The button now says **Stop**. Tap **Stop** when finished.
8. **Threshold k** slider: leave it where it starts (2.50) for the first tests. Lower counts more chews (and more false ones); higher is stricter.

**Keep the app open and the screen on while testing.** Leaving the Chew Lab screen stops counting. For the meal, set the phone down on the table, screen up, and temporarily set Settings → Display & Brightness → Auto-Lock → **Never** (put it back to your usual setting afterwards).

## 4. The test

**Test A: one bite, 20 chews (do this first, takes 2 minutes)**

1. In Chew Lab, scroll to **Session capture** and switch **Record session** on. Then in **Controls** tap **Reset counts** (so everything starts at 0) and tap **Start**.
   - Check: **Samples recorded** is climbing (about 25 per second). If it stays at 0, see Problems below.
2. Take one bite of something chewy (a piece of steak, an apple, nuts).
3. Chew exactly **20 times**, counting in your head. Chew at a normal pace. Don't talk, don't turn your head.
4. Look at the big number. Write your count (20) and the app's count in the table in section 6.
5. Take 3 more bites with different foods (soft, crunchy, chewy). **Do not tap Reset counts between bites** (it erases the recording). Instead, before each bite note the big number, and after 20 chews note it again; the difference is the app's count. If the number passes 32 it buzzes and starts over at 0; just add it up.
6. Tap **Stop**, then do the export in section 5 now, so Test A has its own file. Then tap **Reset counts** and go on to Test B.

**Test B: a normal meal**

1. Make sure **Record session** is still on, tap **Start** again, and check **Samples recorded** is climbing from 0.
2. Eat a normal meal. Count your **bites** roughly (the real number of forkfuls). Include some normal talking and looking around, and note when you did it.
3. At the end tap **Stop**. **Do not tap Reset counts.**
4. Compare: how many bites did you take versus what the **bites** number says (the app counts one bite per 32 chews, so it is a rough guide, and the **session total** number tells you the total chews it counted).

Write down anything odd: "talking while chewing," "turned head to look at TV," "drank water," "laughed."

**The three lunches that decide Gate 1** (added 2026-11-04; the pricing doc's pass mark is "within 20% of a hand count on 2 of 3 meals")

Nobody can hand-count a whole lunch, so count a sample. Do Test B three times, each with its own CSV: one quiet lunch, one where you talk, one with TV or music on. In each lunch:

1. Pick **5 bites** spread through the meal. Before each one, read **session total** and write it down. Chew normally, counting in your head. When you swallow, read **session total** again. Write your count next to the two numbers.
2. Count your **real bites** for the whole meal, roughly.
3. At the end write down the final **session total**, and tap **Stop**. Export the CSV (section 5).

Claude scores two things for each lunch. Do the 5 bites match your count within 20%? And is the final session total within 20% of (real bites x your average chews on those 5 bites)? The second one is what catches false counts from talking between bites. A lunch passes only if both hold.

**Test C: the screen customers will use (added 2026-11-04; do it after you've sent the recording in section 5)**

This is the free meal a new customer gets. Leave **Pretend Pro** off until step 6.

1. Go back to the home screen. **Count my chews** should say **Free meal** on the right.
2. Tap **Count my chews**, then the small **Tune to me** link under **Start meal**. The **Tune it to you** screen takes about 2 minutes. Have some food or gum ready, and tap **Start**. Sit still for 20 seconds, then chew in time with the buzz for three rounds of 32. When it says **Done**, tap **Save**. If it says **That didn't work**, tap **Try Again** once. If that fails too, write down what it said and tap **Skip for now**.
3. Leave the app, start some music on the iPhone, and come back. Tap **Start meal** and eat for a few minutes (at least 30 seconds, or it isn't saved).
4. Check these and write down yes or no:
   - Did the count roughly match your own?
   - At 32, did you hear a chime in your AirPods?
   - Did the music keep playing through the chime?
   - Did the screen stay on without touching it?
5. Tap **Finish**. A screen slides up that says **That was your free meal.** with your meal's numbers and the prices. Do the numbers look right? Don't buy anything. Tap **Not now** at the bottom (scroll down if you don't see it). Behind it is **Meal done** with the same summary and a **See Pro** button.
6. Tap the back arrow at the top left. **Count my chews** now says **Pro**. In the **Developer** section, switch **Pretend Pro** on. It stands in for a subscription and turns itself off each time the app restarts. Tap **Trends**: does your meal show up? Meals under 30 seconds aren't counted.

The free meal is used up once a meal is saved with at least one completed round of 32 chews. A false chew, or talking, that never reaches 32 does not use it. To get it back for another try, delete the app from the iPhone and press Run in Xcode again. You'll see the two first-run screens again.

## 5. Send me the recording

Do this right after the meal, before leaving Chew Lab and before tapping Reset counts. **The recording is held in the app's memory only; it is lost if you tap Reset counts or close the app.**

1. In Chew Lab, scroll to **Session capture**. Confirm **Samples recorded** is a big number (a 20-minute meal is about 30,000).
2. Tap **Export CSV**. The iPhone's share sheet opens (the standard Share menu).
3. Choose one:
   - **Mail** → type `drtj@my4mlife.com` as the To address → Send. (Or choose AirDrop to your Mac and email it from there.)
   - **AirDrop** → tap your Mac (the Mac needs to be awake with AirDrop set to "Everyone" or "Contacts only") → find the file in the Mac's Downloads folder.
4. The file is named like `chewlab-2026-11-01T18-30-00Z.csv`. In the email, include your notes from section 6.
5. If **Export CSV** is greyed out, nothing was recorded: turn on **Record session**, tap **Start**, and chew for a bit first.

## 6. What to write down

Copy this onto paper or into Notes. Fill it in as you go.

| Bite # | Food | My count | App count | Notes (talking, head turn, drank, laughed) |
|---|---|---|---|---|
| 1 | | 20 | | |
| 2 | | 20 | | |
| 3 | | 20 | | |
| 4 | | 20 | | |

Meal test:

| Total real bites | App "session total" | App "bites" | Start time | Anything odd |
|---|---|---|---|---|
| | | | | |

The three lunches (one table per lunch: quiet, talking, TV or music):

| Sampled bite | Session total before | Session total after | My count | Notes |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

Real bites this lunch: ____ Final session total: ____

Also write: which AirPods you used, the **Threshold k** number, and whether the green "AirPods connected" showed.

## 7. If something goes wrong

| Problem | Fix |
|---|---|
| **Samples recorded stays at 0 / count never moves / says "AirPods not connected" after Start** | Check the AirPods are in your ears and connected to **this** iPhone (Control Center → AirPods shown). Put them in, tap **Stop** then **Start**. Make sure you allowed Motion: Settings → Apps → Count Skinny (on older iOS, Settings → Count Skinny) → turn **Motion & Fitness** on. Check your AirPods model is on the list in section 1; older AirPods don't send motion. |
| **"Not supported on this device/simulator"** | You picked a Simulator, not your real iPhone, in Xcode's device menu (section 2, step 8). Choose your iPhone and press Run again. |
| **"Untrusted Developer" when opening the app** | iPhone: Settings → General → VPN & Device Management → your Apple ID → **Trust** (section 2, step 10). |
| **Xcode says "Developer Mode disabled" or the iPhone isn't listed** | Turn on Settings → Privacy & Security → **Developer Mode** and restart the iPhone (section 2, step 7). Unplug and replug the cable and unlock the phone. |
| **Xcode shows "Signing for CountYourselfSkinny requires a development team"** | Section 2, step 5: choose **(Personal Team)** in the Team drop-down. If the list is empty, sign in at Xcode → Settings → Accounts. |
| **Red error about the bundle identifier** | Add your initials to the bundle identifier (section 2, step 5). |
| **Red error mentioning "HealthKit"** | Check you are on the **Debug** tab (section 2, step 4). Debug has no HealthKit, so the error should only appear under **Release**, where you can ignore it. If it blocks **Run** on your iPhone, tell me exactly what it says. |
| **Steps says "Tap to connect steps", then stays at 0 with "No steps yet"** | Expected. Apple Health is off in this test build, and the app only asks for Health when you tap Steps or start the morning walk. |
| **Xcode says you have reached a limit of apps or App IDs** | A free Apple ID allows only a few of its own apps on one iPhone, and a limited number of new identifiers per week. Delete another app you installed from Xcode, or wait the number of days it says. |
| **The Team drop-down went blank** | It does this after the project is regenerated. Pick your **(Personal Team)** again (section 2, step 5). |
| **App stopped opening after about a week** | Free Apple ID installs expire after 7 days. Plug in and press Run again. |
| **Count seems way too high or too low** | Normal for a first test. That is the point of the CSV. Write down which and send it. You can try Threshold k lower (more sensitive) or higher (stricter), and note the k value you used. |

---
*Source for every label and step above: `apps/count-yourself-skinny-ios/README.md`, `project.yml`, `Sources/Views/HomeView.swift`, `Sources/Views/FirstRunView.swift`, `Sources/Views/PaywallView.swift`, `Sources/Views/ChewLabView.swift`, `Sources/Views/MealView.swift`, `Sources/Views/CalibrationView.swift`, `Sources/Motion/ChewDetector.swift`. Deployment target iOS 17.0; Debug bundle id `com.my4mlife.countyourselfskinny.dev`; no HealthKit in Debug; no signing team preset. Chew Lab, first-run, free-meal and paywall labels are checked by `UITests/CYSUITests.swift`, the free meal against a simulated sensor. Xcode's own menus and iPhone Settings paths were not checked against a live screen.*
