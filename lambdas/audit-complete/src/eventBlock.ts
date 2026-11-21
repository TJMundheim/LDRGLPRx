/** Talk/event welcome block: shown only when the assessment src is a `talk` or `talk-*` tag. */
const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));

export function isTalkSource(src: unknown): src is string {
  return typeof src === 'string' && /^talk(-|$)/i.test(src.trim());
}

export function buildEventBlock(src: unknown, zoomTime: string | undefined): string {
  if (!isTalkSource(src)) return '';
  const tag = src.trim().toLowerCase();
  const t = (zoomTime ?? '').trim();
  const when = !t || t.toUpperCase() === 'TBD' ? 'Monday evenings' : `Mondays at ${esc(t)}`;
  return `<div style="margin:20px 0;padding:22px;border:2px solid #d4af5a;border-radius:10px;background:#fbf7ec">
<p style="color:#0a1628;font-size:16px;font-weight:700;line-height:1.5;margin:0 0 12px">You're entered in tonight's signed-book drawing. Winners are drawn at the end of the talk.</p>
<p style="color:#222;font-size:14px;line-height:1.55;margin:0 0 12px">Join us ${when} on Zoom with Dr. TJ. Every session is recorded and the recording is emailed to you.</p>
<p style="color:#222;font-size:14px;line-height:1.55;margin:0">Want to talk it through? Reply to this email or <a href="https://www.my4mlife.com/consult?src=${encodeURIComponent(tag)}" style="color:#1a3656;font-weight:600">book a free 15-minute call with a care coordinator</a>. We never call unless you ask.</p>
</div>`;
}
