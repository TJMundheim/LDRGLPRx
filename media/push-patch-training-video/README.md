# Push Patch training video (Remotion)

First cut of the Push Patch "how to apply" video, built from
`docs/launch/push-patch/training-video-script-v2.md`.

Outputs: `Main16x9` (1920x1080), `Main9x16` (1080x1920, re-laid out), `Short9x16` (~30 s).
Audio, clips and renders are git-ignored; regenerate them with the commands below.

This folder is **not** part of the pnpm workspace. Always install with `--ignore-workspace`.

## Commands

```sh
cd media/push-patch-training-video
pnpm install --ignore-workspace

# 1. Narration (Amazon Polly, voice Ruth, engine generative; AWS CLI, us-east-1)
#    -> public/audio/<scene>.mp3, public/audio/sample-{ruth,matthew}.mp3, src/generated/timing.json
pnpm audio            # add -- --force to re-synthesize existing files

# 2. Ambient music bed (procedural, no samples) -> public/audio/music.wav
pnpm music

# 3. Clips from TJ's phone video (macOS avconvert) -> public/clips/*.mp4
#    default source: ~/Downloads/First_Patches_Tutorial_Captioned_HQ.MOV (override with SRC=...)
pnpm clips

# 4. Preview / render
pnpm studio           # interactive preview
pnpm render           # renders all three cuts, copies them + voice samples to ~/Desktop/Push-Patch-Training

# 5. QA contact sheets (frame every 3 s)
bash scripts/qa.sh out/push-patch-how-to-16x9.mp4 /tmp/qa16 3 4 480
```

## How it fits together

- `scripts/narration.json`: narration per scene (SSML). Edit text here, then `pnpm audio`.
- `scripts/polly.mjs`: Polly's generative engine returns no speech marks, so word/sentence marks come
  from the neural engine for the same SSML and are mapped onto the generative audio. Every sentence
  start and `<break>` is snapped to the matching pause detected in the generative waveform; words in
  between are scaled linearly. Scene lengths come from the measured audio duration plus padding.
- `src/clips.ts`: shot list. Each shot has a `safe` rectangle in source pixels: crops never show
  anything above it (TJ's face in some table shots) or below y=772 (burned-in source captions).
- `src/Main.tsx` / `src/Short.tsx`: scene lists. `src/illustrations/`: SVG animations.
- Captions are burned in, in a dark band at the top of the frame, two lines max.
