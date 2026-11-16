#!/usr/bin/env bash
# Render all three cuts (H.264) and copy them + the voice samples to ~/Desktop/Push-Patch-Training.
set -euo pipefail
cd "$(dirname "$0")/.."
DEST="${DEST:-$HOME/Desktop/Push-Patch-Training}"
mkdir -p out "$DEST"
pnpm exec remotion render Main16x9  out/push-patch-how-to-16x9.mp4  --concurrency=8
pnpm exec remotion render Main9x16  out/push-patch-how-to-9x16.mp4  --concurrency=8
pnpm exec remotion render Short9x16 out/push-patch-short-9x16.mp4   --concurrency=8
cp out/push-patch-how-to-16x9.mp4 out/push-patch-how-to-9x16.mp4 out/push-patch-short-9x16.mp4 "$DEST/"
cp public/audio/sample-ruth.mp3 "$DEST/voice-sample-ruth.mp3"
cp public/audio/sample-matthew.mp3 "$DEST/voice-sample-matthew.mp3"
ls -la "$DEST"
