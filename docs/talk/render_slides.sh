#!/bin/bash
# Usage: ./render_slides.sh deck.pptx out_dir
# Opens the deck in Keynote, exports one JPEG per slide, quits Keynote without saving.
# Output files are named by Keynote (e.g. out_dir/<deck>.001.jpeg); renamed here to sl-01.jpg ... for script.py.
set -e
DECK="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
OUT="$2"; mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
rm -f "$OUT"/*.jpg "$OUT"/*.jpeg
open -a Keynote; sleep 4
osascript <<EOF
tell application "Keynote"
  set d to open (POSIX file "$DECK")
  delay 3
  export d to (POSIX file "$OUT") as slide images with properties {image format:JPEG, skipped slides:false}
  close d saving no
  quit saving no
end tell
EOF
i=0
for f in $(ls "$OUT"/*.jpeg "$OUT"/*.jpg 2>/dev/null | sort); do
  i=$((i+1)); mv "$f" "$OUT/sl-$(printf %02d $i).jpg" 2>/dev/null || true
done
echo "Rendered $i slide images to $OUT"
