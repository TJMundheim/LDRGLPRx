# Chew Lab test guide — your iPhone + your AirPods

For: Dr. TJ. Date: 2026-11-01. Time needed: about 30 minutes to install (first time), then one meal.

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
4. **Team:** no team is pre-selected (it is left blank on purpose). Click the **Team** drop-down and choose your name followed by **(Personal Team)**. Leave **Automatically manage signing** checked. Leave the Bundle Identifier as is: `com.my4mlife.countyourselfskinny`.
   - If Xcode shows a red "bundle identifier is not available" or "failed to register" message: change the Bundle Identifier by adding your initials at the end, for example `com.my4mlife.countyourselfskinny.tj`. This is only for this test.
5. **Plug in the iPhone** with the cable. Unlock it. When it asks **Trust This Computer?** tap **Trust** and enter your iPhone passcode.
6. **Turn on Developer Mode on the iPhone** (iOS 16 and newer requires this):
   Settings → Privacy & Security → scroll to the bottom → **Developer Mode** → switch on → tap **Restart** → after it restarts, unlock and tap **Turn On** → enter passcode.
   - The Developer Mode line only appears after the iPhone has been plugged in and Xcode has seen it. If you don't see it, finish step 7 first (the first Run attempt will make it appear), turn it on, then press Run again.
7. At the top center of the Xcode window there is a device menu next to the name "CountYourselfSkinny". Click it and pick **your iPhone** (not a "Simulator" iPhone).
8. Press the **Run** button (the ▶ triangle at top left, or press **⌘R**). Wait for "Build Succeeded". The app installs on your phone. The first build takes a couple of minutes.
9. It will fail to open the first time with an "Untrusted Developer" message. That is normal. On the iPhone: **Settings → General → VPN & Device Management** → under **Developer App** tap your Apple ID email → **Trust** → **Trust** again.
10. Open **Count Yourself Skinny** from the iPhone home screen (or press Run again).
    - It may ask permission to read Steps from Health. You can tap **Allow** or **Don't Allow**; it does not matter for this test.

**Good to know:** apps installed with a free Apple ID **stop opening after 7 days**. If that happens, plug in the phone and press Run again in Xcode.

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
8. **Threshold k** slider: leave it in the middle (2.50) for the first tests. Lower counts more chews (and more false ones); higher is stricter.

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

**Test C: the screen customers will use (added 2026-11-04; do it after you've sent the recording in section 5)**

1. Go back to the home screen. In the **Developer** section, switch **Pretend Pro** on. It stands in for a subscription and turns itself off each time the app restarts.
2. Tap **Count my chews**. The first time, it offers a calibration of about 2 minutes: hold still, then chew along with the beat for three rounds of 32. Have some food or gum ready, and tap **Start**. If you get an error, tap **Try Again** once, write down what it said, and move on.
3. Start some music on the iPhone, then tap **Start meal** and eat for a few minutes.
4. Check these and write down yes or no:
   - Did the count roughly match your own?
   - At 32, did you hear a chime in your AirPods?
   - Did the music keep playing through the chime?
   - Did the screen stay on without touching it?
5. Tap **Finish**. Does the summary look right? Then go back and tap **Trends**: does your meal show up?

## 5. Send me the recording

Do this right after the meal, before leaving Chew Lab and before tapping Reset counts. **The recording is held in the app's memory only; it is lost if you tap Reset counts or close the app.**

1. In Chew Lab, scroll to **Session capture**. Confirm **Samples recorded** is a big number (a 20-minute meal is about 30,000).
2. Tap **Export CSV**. The iPhone's share sheet opens (the standard Share menu).
3. Choose one:
   - **Mail** → type `drtj@my4mlife.com` as the To address → Send. (Or choose AirDrop to your Mac and email it from there.)
   - **AirDrop** → tap your Mac (the Mac needs to be awake with AirDrop set to "Everyone" or "Contacts only") → find the file in the Mac's Downloads folder.
4. The file is named like `chewlab-2026-11-01T18-30-00Z.csv`. In the email, include your notes from section 6.
5. If you get a pop-up "Nothing to export": turn on **Record session** and chew for a bit first.

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

Also write: which AirPods you used, the **Threshold k** number, and whether the green "AirPods connected" showed.

## 7. If something goes wrong

| Problem | Fix |
|---|---|
| **Samples recorded stays at 0 / count never moves / says "AirPods not connected" after Start** | Check the AirPods are in your ears and connected to **this** iPhone (Control Center → AirPods shown). Put them in, tap **Stop** then **Start**. Make sure you allowed Motion: Settings → Count Yourself Skinny → turn **Motion & Fitness** on. Check your AirPods model is on the list in section 1; older AirPods don't send motion. |
| **"Not supported on this device/simulator"** | You picked a Simulator, not your real iPhone, in Xcode's device menu (section 2, step 7). Choose your iPhone and press Run again. |
| **"Untrusted Developer" when opening the app** | iPhone: Settings → General → VPN & Device Management → your Apple ID → **Trust** (section 2, step 9). |
| **Xcode says "Developer Mode disabled" or the iPhone isn't listed** | Turn on Settings → Privacy & Security → **Developer Mode** and restart the iPhone (section 2, step 6). Unplug and replug the cable and unlock the phone. |
| **Xcode shows "Signing for CountYourselfSkinny requires a development team"** | Section 2, step 4: choose **(Personal Team)** in the Team drop-down. If the list is empty, sign in at Xcode → Settings → Accounts. |
| **Red error about the bundle identifier or "HealthKit" capability** | Add your initials to the bundle identifier (section 2, step 4). If the error mentions HealthKit and will not go away, tell me; I will remove HealthKit for the test build. |
| **App stopped opening after about a week** | Free Apple ID installs expire after 7 days. Plug in and press Run again. |
| **Count seems way too high or too low** | Normal for a first test. That is the point of the CSV. Write down which and send it. You can try Threshold k lower (more sensitive) or higher (stricter), and note the k value you used. |

---
*Source for every label and step above: `apps/count-yourself-skinny-ios/README.md`, `project.yml`, `Sources/Views/HomeView.swift`, `Sources/Views/ChewLabView.swift`, `Sources/Motion/ChewDetector.swift`. Deployment target iOS 17.0; bundle id `com.my4mlife.countyourselfskinny`; no signing team preset.*
