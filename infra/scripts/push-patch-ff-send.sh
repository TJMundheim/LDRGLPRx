#!/bin/bash
# Sends TJ's personal friends-and-family Push Patch email to ONE person via the
# email-sender Lambda as {kind:'info', from:'drtj'} → "Dr. TJ <drtj@my4mlife.com>".
# Copy = docs/launch/push-patch/launch-posts-2026-10-06.md, Email 1.
# ALWAYS show TJ the recipient + greeting and wait for his explicit "send".
#
# Usage: infra/scripts/push-patch-ff-send.sh "<first name>" <email> [--dry-run]
set -euo pipefail
NAME="$1"; TO="$2"; MODE="${3:-}"
OUT="$(mktemp -d)"
python3 - "$NAME" "$TO" > "$OUT/payload.json" <<'PY'
import json, sys, html
name, to = sys.argv[1:]
url = "https://my4mlife.com/go/push-patch?utm_source=email&utm_medium=personal&utm_campaign=push-patch-launch&utm_content=friends-family"
intro = [
  f"Hi {name},",
  "Before we announce this to anyone else, I wanted you to be among the first to see it.",
  "This week My4MLife is launching the Push Patch. It delivers peptide and NAD+ blends through your skin using a small electrical charge, so there's no needle at all. You press it on like a piece of athletic tape, wear it for 12 hours, and you're done for the week. Each set is six patches, enough for six weeks.",
  "A few things you should know:",
]
bullets = [
  "There are seven blends to choose from, including ones for energy and recovery, tissue repair, and skin. The page explains each one.",
  "When you order, you'll answer five quick safety questions, then fill out a short health form. One of our network's licensed physicians reviews it, usually within an hour during business hours.",
  "Once you're approved, your kit ships straight to you: prepared in 1 to 3 business days, then 3 to 5 days by ground.",
  "Sets are $650 for the NAD+ blends and $550 for Glutathione Radiance.",
]
lead = "Here's the page, where you can pick a blend and order in a couple of minutes:"
outro = [
  "I'd genuinely value your honest feedback on the whole experience, from the page to the questionnaire to the box arriving at your door. Just reply to this email and tell me.",
]
sign = ["Thank you for being in my corner,", "Dr. TJ"]
P = lambda t: f'<p style="margin:0 0 14px">{html.escape(t)}</p>'
body = "".join(P(t) for t in intro)
body += '<ul style="margin:0 0 14px;padding-left:20px">' + "".join(f'<li style="margin:0 0 6px">{html.escape(b)}</li>' for b in bullets) + "</ul>"
body += P(lead)
body += f'<p style="margin:0 0 18px"><a href="{url}" style="display:inline-block;background:#1A2E1E;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">See the Push Patch blends &rarr;</a></p>'
body += "".join(P(t) for t in outro)
body += f'<p style="margin:0 0 14px">{html.escape(sign[0])}<br>{html.escape(sign[1])}</p>'
page = f'<div style="font-family:system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.55;color:#1a1a1a;max-width:560px">{body}</div>'
text = "\n\n".join(intro) + "\n" + "\n".join(f"- {b}" for b in bullets) + f"\n\n{lead}\n{url}\n\n" + "\n\n".join(outro) + f"\n\n{sign[0]}\n{sign[1]}\n"
print(json.dumps({"kind":"info","from":"drtj","to":to,"subject":"Something new I'd love you to try first","html":page,"text":text}))
PY
if [ "$MODE" = "--dry-run" ]; then cat "$OUT/payload.json"; exit 0; fi
aws lambda invoke --region us-east-2 --function-name my4mlife-email-sender \
  --cli-binary-format raw-in-base64-out --payload "fileb://$OUT/payload.json" "$OUT/out.json" >/dev/null
echo "$TO -> $(cat "$OUT/out.json")"
