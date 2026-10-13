#!/bin/bash
# Sends TJ's personal Push Patch email to ONE person via the email-sender Lambda
# as {kind:'info', from:'drtj'} → "Dr. TJ <drtj@my4mlife.com>" (replies to drtj@).
# Copy: docs/launch/push-patch/launch-posts-2026-10-06.md
#   v1 = Email 1 (friends and family, sent 2026-10-07 / 2026-10-13)
#   v2 = Email 1b (warm list from the Instinct review, 2026-10-13)
# ALWAYS show TJ the recipients + greetings and wait for his explicit "send".
#
# Usage: infra/scripts/push-patch-ff-send.sh "<first name>" <email> [v1|v2] [--dry-run]
set -euo pipefail
NAME="$1"; TO="$2"; COPY="${3:-v1}"; MODE="${4:-}"
OUT="$(mktemp -d)"
python3 - "$NAME" "$TO" "$COPY" > "$OUT/payload.json" <<'PY'
import json, sys, html, re
name, to, copy = sys.argv[1:]
url = "https://my4mlife.com/go/push-patch?utm_source=email&utm_medium=personal&utm_campaign=push-patch-launch&utm_content=friends-family"
V1 = dict(
  subject="Something new I'd love you to try first",
  paras=["Before we announce this to anyone else, I wanted you to be among the first to see it.",
    "This week My4MLife is launching the Push Patch. It delivers peptide and NAD+ blends through your skin using a small electrical charge, so there's no needle at all. You press it on like a piece of athletic tape, wear it for 12 hours, and you're done for the week. Each set is six patches, enough for six weeks.",
    "A few things you should know:",
    ["There are seven blends to choose from, including ones for energy and recovery, tissue repair, and skin. The page explains each one.",
     "When you order, you'll answer five quick safety questions, then fill out a short health form. One of our network's licensed physicians reviews it, usually within an hour during business hours.",
     "Once you're approved, your kit ships straight to you: prepared in 1 to 3 business days, then 3 to 5 days by ground.",
     "Sets are $650 for the NAD+ blends and $550 for Glutathione Radiance."],
    "Here's the page, where you can pick a blend and order in a couple of minutes:"],
  button="See the Push Patch blends",
  after=["I'd genuinely value your honest feedback on the whole experience, from the page to the questionnaire to the box arriving at your door. Just reply to this email and tell me."],
  sign="Thank you for being in my corner,")
V2 = dict(
  subject="An early look, just for you: peptides without the needle",
  paras=["Before we announce this publicly, I wanted you to be among the first to see it.",
    "You've probably been hearing about peptides from everywhere: BPC-157, NAD+, GHK-Cu. Everyone has a protocol, and most of them start with a needle. This week My4MLife is launching the Push Patch, which delivers those same peptide and NAD+ blends through your skin with no needle at all.",
    "Here's why I'm excited about it:",
    ["**More NAD+, not less.** In the manufacturer's testing, one patch a week delivered 276% more total NAD+ than daily 50 mg injections, and 163% more than a 500 mg weekly IV.",
     "**Steady delivery, not a spike.** An injection hits all at once, and your body clears peptides like BPC-157 and KPV within hours. The patch keeps delivering for 12 hours.",
     "**No needle routine.** No syringes, sharps containers, bruised injection sites, or afternoons in an IV chair. You press it on like a piece of athletic tape and wear it for 12 hours. Most people feel a light tingle or nothing at all. Then you're done for the week."],
    "**It's also a better value than it first looks.** Each set is six patches, so it covers six weeks, not the usual monthly cycle. If you were getting NAD+ and glow-peptide injections, you'd typically pay $800 to $1,000 a month. A Push Patch set is $650 for six weeks, which works out to about $470 a month. Glutathione Radiance is $550.",
    "How ordering works:",
    ["There are seven blends, including ones for energy and recovery, tissue repair, and skin. The page explains each one.",
     "You'll answer five quick safety questions, then fill out a short health form. One of our network's licensed physicians reviews it, usually within an hour during business hours.",
     "Once you're approved, your kit ships straight to you: prepared in 1 to 3 business days, then 3 to 5 days by ground."]],
  button="Pick your blend",
  after=["If you have any questions about which blend fits you, just reply to this email. I'll answer you personally.",
    "I'm sharing this with you first because I think it can make a real difference for you. Here's to feeling your best."],
  sign=None)
C = {"v1": V1, "v2": V2}[copy]
def h(t): return re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", html.escape(t))
def plain(t): return t.replace("**", "")
P = lambda t: f'<p style="margin:0 0 14px">{h(t)}</p>'
body, text = [P(f"Hi {name},")], [f"Hi {name},"]
for p in C["paras"]:
    if isinstance(p, list):
        body.append('<ul style="margin:0 0 14px;padding-left:20px">' + "".join(f'<li style="margin:0 0 6px">{h(b)}</li>' for b in p) + "</ul>")
        text.append("\n".join(f"- {plain(b)}" for b in p))
    else:
        body.append(P(p)); text.append(plain(p))
body.append(f'<p style="margin:0 0 18px"><a href="{url}" style="display:inline-block;background:#1A2E1E;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">{html.escape(C["button"])} &rarr;</a></p>')
text.append(url)
for p in C["after"]:
    body.append(P(p)); text.append(plain(p))
if C["sign"]:
    body.append(f'<p style="margin:0 0 14px">{h(C["sign"])}<br>Dr. TJ</p>'); text.append(f'{C["sign"]}\nDr. TJ')
else:
    body.append(P("Dr. TJ")); text.append("Dr. TJ")
page = '<div style="font-family:system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.55;color:#1a1a1a;max-width:560px">' + "".join(body) + "</div>"
print(json.dumps({"kind":"info","from":"drtj","to":to,"subject":C["subject"],"html":page,"text":"\n\n".join(text) + "\n"}))
PY
if [ "$MODE" = "--dry-run" ]; then cat "$OUT/payload.json"; exit 0; fi
aws lambda invoke --region us-east-2 --function-name my4mlife-email-sender \
  --cli-binary-format raw-in-base64-out --payload "fileb://$OUT/payload.json" "$OUT/out.json" >/dev/null
echo "$TO -> $(cat "$OUT/out.json")"
