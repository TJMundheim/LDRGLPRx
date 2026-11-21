#!/bin/bash
# Sends ONE speaking-outreach email from a batch file via the email-sender Lambda
# as {kind:'info', from:'drtj'} → "Dr. TJ <drtj@my4mlife.com>" (replies to drtj@).
# Batch files: docs/launch/speaking/batch-*.md (sections "## N. ...", "**To:**", "**Subject:**", body, "[signature]").
# ALWAYS show TJ the drafts and wait for his explicit "send".
#
# Usage: infra/scripts/speaking-outreach-send.sh <batch.md> <section number> [--dry-run]
set -euo pipefail
BATCH="$1"; N="$2"; MODE="${3:-}"
OUT="$(mktemp -d)"
python3 - "$BATCH" "$N" > "$OUT/payload.json" <<'PY'
import json, sys, html, re
path, n = sys.argv[1], sys.argv[2]
src = open(path).read()
m = re.search(rf"^## {n}\. .*?$(.*?)(?=^## \d+\. |\Z)", src, re.S | re.M)
if not m: sys.exit(f"section {n} not found")
sec = m.group(1)
to = re.search(r"^\*\*To:\*\* (\S+)", sec, re.M)
if not to: sys.exit(f"section {n} has no **To:** address")
subject = re.search(r"^\*\*Subject:\*\* (.+)$", sec, re.M).group(1).strip()
body = sec[sec.index("**Subject:**"):].split("\n", 1)[1].split("[signature]")[0].strip()
def h(t):
    t = html.escape(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    return re.sub(r"\*(.+?)\*", r"<em>\1</em>", t)
plain = lambda t: t.replace("**", "").replace("*", "")
P = lambda t: f'<p style="margin:0 0 14px">{t}</p>'
parts, text = [], []
for block in re.split(r"\n\s*\n", body):
    lines = [l for l in block.strip().splitlines() if l.strip()]
    runs = []  # consecutive bullet lines form one list; other lines form one paragraph
    for l in lines:
        b = l.startswith("- ")
        if runs and runs[-1][0] == b: runs[-1][1].append(l)
        else: runs.append((b, [l]))
    for b, ls in runs:
        if b:
            parts.append('<ul style="margin:0 0 14px;padding-left:20px">' + "".join(f'<li style="margin:0 0 6px">{h(l[2:])}</li>' for l in ls) + "</ul>")
            text.append("\n".join(plain(l) for l in ls))
        else:
            t = " ".join(ls); parts.append(P(h(t))); text.append(plain(t))
sig_html = ('<p style="margin:18px 0 0">Dr. TJ Mundheim<br>Health-span educator &middot; Founder, My4MLife<br>'
            '<a href="https://www.my4mlife.com/speaking" style="color:#1A2E1E">my4mlife.com/speaking</a><br>'
            "<em>Don't lose your identity and your dignity while you still have a choice.</em></p>")
sig_text = "Dr. TJ Mundheim\nHealth-span educator · Founder, My4MLife\nmy4mlife.com/speaking\nDon't lose your identity and your dignity while you still have a choice."
page = '<div style="font-family:system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.55;color:#1a1a1a;max-width:560px">' + "".join(parts) + sig_html + "</div>"
print(json.dumps({"kind": "info", "from": "drtj", "to": to.group(1).strip().lower(), "subject": subject, "html": page, "text": "\n\n".join(text) + "\n\n" + sig_text + "\n"}))
PY
if [ "$MODE" = "--dry-run" ]; then cat "$OUT/payload.json"; exit 0; fi
aws lambda invoke --region us-east-2 --function-name my4mlife-email-sender \
  --cli-binary-format raw-in-base64-out --payload "fileb://$OUT/payload.json" "$OUT/out.json" >/dev/null
echo "#$N $(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["to"])' "$OUT/payload.json") -> $(cat "$OUT/out.json")"
