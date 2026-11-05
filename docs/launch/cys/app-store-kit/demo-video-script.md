# App Review demo video: shot list for Dr. TJ

Why: Apple's reviewers don't have your AirPods, and the chew counter only works with them. A short video proves the feature is real. One take is fine, no editing needed. Target length about 70 seconds: the meal alone has to run past 30 seconds or the app won't save it.

You need: your iPhone with the app installed from TestFlight (not the Debug build, which has no Apple Health), AirPods Pro, AirPods (3rd generation or later) or AirPods Max connected, a small snack you can chew (a few almonds or a bite of apple), a quiet room. **This must be a fresh install with the first meal unused**, because the free meal is the part Apple needs to see. To reset: delete the app, reinstall from TestFlight.

## Before you press record (2 minutes)
1. Open the app once. Tap through the two first-run screens, answer the Apple Health question, and tap **Not now** on the chew number card. None of that needs to be in the video. Then scroll Home so **Count my chews** and **Trends** are on screen: they sit near the bottom.
2. Turn on Do Not Disturb, so no banner appears in the video.
3. Raise the volume to about half so the chime is clear.
4. Add Screen Recording to Control Center if it isn't there: Settings > Control Center > the green + next to Screen Recording.
5. Do a 5-second test recording first (steps below) and play it back with sound on. If you hear nothing at the chime, see "If the chime isn't captured."
6. Put the AirPods in and confirm they are connected (Control Center shows them).

## How to record
1. Swipe down from the top-right corner to open Control Center.
2. **Press and hold** the Screen Recording button (the circle in a circle), not a tap. A panel opens.
3. Make sure the microphone button in that panel is **off** (grey). Tap it to turn it on only if you want to speak over the video. Reviewers don't need your voice.
4. Tap **Start Recording**. A 3-second countdown runs. Swipe Control Center away and begin.
5. To stop: tap the red clock or red pill at the top of the screen, then **Stop**. The video is saved to Photos.

**How sound is captured:** iPhone screen recording records the sound the phone plays (the app's chime) even while it is playing into your AirPods. The microphone toggle only adds your voice and the room. Unverified by me: confirm in your 5-second test.

## Shot list (about 70 seconds)
Say nothing, or read the line in quotes if you turn the microphone on.

| Time | What you do | What the reviewer sees |
|---|---|---|
| 0:00 to 0:04 | Start on the Home screen, scrolled to the bottom. Hold still. | The "Count my chews" row marked "Free meal". |
| 0:04 to 0:06 | Tap **Count my chews**. | The meal screen: "Put in your AirPods, take a bite, and start." "Your first counted meal is free." |
| 0:06 to 0:09 | Tap **Start meal**. If the Motion permission box appears, tap **Allow**. If the tuning screen appears, tap **Skip for now**. | The counting screen starts at 0. |
| 0:09 to 0:45 | Eat your snack at a normal pace, phone held where the camera can't see you but the screen is clear. Keep chewing past the chime until at least 35 seconds have gone by. | The big number climbs with each chew, up to 32, with a chime at 32. The next chew starts over at 1 and the bite count goes up. |
| 0:45 to 0:47 | Tap **Finish**. **Don't finish before 35 seconds:** a meal under 30 seconds isn't saved and no paywall follows. | The meal ends. |
| 0:47 to 0:55 | Wait. | The paywall appears with the meal's result, "That was your free meal.", then the plans: **$4.99 a year** and **$0.99 a month**. |
| 0:55 to 1:01 | Scroll the paywall slowly to show Restore Purchases, Terms of Use and Privacy Policy. Tap **Not now**. | "Meal done" with the meal summary. |
| 1:01 to 1:04 | Tap the back arrow at the top left. | Home. "Count my chews" now says "Pro". |
| 1:04 to 1:10 | Tap **Trends**. | The paywall again (Trends is Pro). End recording. |

If the first take used up the free meal and you need another, delete the app and reinstall it.

## If the chime isn't captured
Use a second phone or a friend: film the screen of the first phone with the sound on, in one steady shot. Or turn the microphone toggle on in the recording panel and hold the phone near your ear. Either is fine for review.

## After recording
1. Open Photos, find the video, tap Share > Save to Files or AirDrop it to your Mac. Name it `cys-review-demo.mov`.
2. Check it plays with sound and shows no personal messages, notifications or other apps.
3. In App Store Connect, on the version page under **App Review Information**, use the **+** next to Attachment to add the video. Size limit and file types: unverified here; Apple accepts common video files, keep it under 100 MB.
4. The review notes in `listing.md` already refer to this video. Keep the video and the notes in step.

## Where Claude can help
Claude can write the notes (done) and trim or compress the video if you drop it in the project folder. Claude cannot record it: it needs your AirPods.
