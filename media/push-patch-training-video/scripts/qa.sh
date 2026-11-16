#!/usr/bin/env bash
# QA: grab a frame every STEP seconds from a render and tile them into contact sheets.
#   bash scripts/qa.sh <video.mp4> <outdir> [step=3] [cols=5] [cellWidth=384]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
VID="$1"; OUT="$2"; STEP="${3:-3}"; COLS="${4:-5}"; CW="${5:-384}"
rm -rf "$OUT/frames"; mkdir -p "$OUT/frames"
swift "$HERE/frames.swift" "$VID" "$OUT/frames" "$STEP" 2>/dev/null
files=( "$OUT"/frames/*.jpg )
per=$(( COLS * 4 ))
n=0
for ((i=0; i<${#files[@]}; i+=per)); do
  n=$((n+1))
  swift "$HERE/sheet.swift" "$OUT/sheet$(printf %02d $n).jpg" "$COLS" "$CW" "${files[@]:i:per}" 2>/dev/null
done
