#!/bin/bash
# Sends ONE speaking-outreach email from a batch file via the email-sender Lambda
# as {kind:'info', from:'drtj'} → "Dr. TJ <drtj@my4mlife.com>" (replies to drtj@).
# Batch files: docs/launch/speaking/batch-*.md (sections "## N. ...", "**To:**", "**Subject:**", body, "[signature]").
# ALWAYS show TJ the drafts and wait for his explicit "send".
#
# Every real send also mails TJ a copy at drtj@my4mlife.com (TJ 2026-11-21: "copy me"), because these
# sends go through Mailgun and never appear in his Gmail Sent folder.
#
# Usage: infra/scripts/speaking-outreach-send.sh <batch.md> <section number> [--dry-run | --copy-only]
#   --copy-only  mail TJ the copy without sending to the recipient (for emails already sent)
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
invoke() { aws lambda invoke --region us-east-2 --function-name my4mlife-email-sender \
  --cli-binary-format raw-in-base64-out --payload "fileb://$1" "$2" >/dev/null; }
TO="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["to"])' "$OUT/payload.json")"
if [ "$MODE" != "--copy-only" ]; then
  invoke "$OUT/payload.json" "$OUT/out.json"
  echo "#$N $TO -> $(cat "$OUT/out.json")"
fi
# Copy for TJ's inbox (same body, marked as a copy).
python3 - "$OUT/payload.json" > "$OUT/copy.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
note = f'<p style="margin:0 0 16px;padding:10px 12px;background:#f0efec;border-radius:6px;font-size:13px;color:#555">Copy for your records. This speaking email was sent to <strong>{d["to"]}</strong>. Replies come to this inbox.</p>'
print(json.dumps({"kind": "info", "from": "drtj", "to": "drtj@my4mlife.com",
                  "subject": f'[Copy] {d["subject"]} (to {d["to"]})',
                  "html": d["html"].replace(">", ">" + note, 1),
                  "text": f'Copy for your records. Sent to {d["to"]}.\n\n' + d["text"]}))
PY
invoke "$OUT/copy.json" "$OUT/copy-out.json"
echo "#$N copy to TJ -> $(cat "$OUT/copy-out.json")"
