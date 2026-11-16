#!/usr/bin/env bash
# Trim + transcode the source phone video into short H.264 clips (macOS avconvert, no ffmpeg needed).
# Source: TJ's 2026-11-14 tutorial (540x960 HEVC, captions burned in). Audio is muted in Remotion.
# Face/caption avoidance is handled by the crop rectangles in src/clips.ts.
set -euo pipefail
SRC="${SRC:-$HOME/Downloads/First_Patches_Tutorial_Captioned_HQ.MOV}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/clips"
mkdir -p "$OUT"
# name start duration
while read -r name start dur; do
  [ -z "$name" ] && continue
  echo "-> $name ($start s + $dur s)"
  avconvert --source "$SRC" --output "$OUT/$name.mp4" --preset PresetHighestQuality \
    --start "$start" --duration "$dur" --replace >/dev/null
done <<'LIST'
kit 4 7
vialfull 18 5
squeeze 43 11
dropper 56 14
mix 78 6
drip 91 20
alcohol 111 6
roller 116.5 8
redness 126.5 4
prep 136 6
peel 144 14
apply 160 37
LIST
ls -la "$OUT"
