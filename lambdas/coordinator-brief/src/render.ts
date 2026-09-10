// Renders the Bedrock-generated Brief into an HTML one-pager (email body) and
// a plain-text fallback. All dynamic strings are escaped.
import type { Brief } from './bedrock';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c]);

export interface BriefHeader {
  name: string;
  phone: string;
  bestTime: string;
}

const list = (items: string[] | undefined) => (items ?? []).map((i) => `<li>${esc(i)}</li>`).join('');

export function renderHtml(header: BriefHeader, brief: Brief): string {
  const redFlags = brief.red_flags ?? [];
  const redFlagsBlock = redFlags.length
    ? `<div style="background:#fff4f4;border:1px solid #e0a0a0;border-radius:8px;padding:12px;margin:16px 0">
        <p style="margin:0 0 6px;font-weight:700;color:#900">Red flags — review before the call</p>
        <ul style="margin:0;padding-left:18px;color:#900">${list(redFlags)}</ul>
      </div>`
    : '';

  const assessmentRows = (brief.assessment_readout ?? [])
    .map((a) => `<tr><td style="padding:4px 10px 4px 0;color:#555">${esc(a.category)}</td><td style="padding:4px 10px">${esc(a.score)}</td><td style="padding:4px;color:#555">${esc(a.note)}</td></tr>`)
    .join('');

  const lanesRows = (brief.recommended_lanes ?? [])
    .map((l) => `<tr><td style="padding:4px 10px 4px 0;font-weight:600">${esc(l.lane)}</td><td style="padding:4px 10px">${esc(l.visit_type)}</td><td style="padding:4px 10px">${esc(l.price)}</td><td style="padding:4px;color:#555">${esc(l.rationale)}</td></tr>`)
    .join('');

  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;color:#1A2E1E">
    <h1 style="font-size:18px;margin:0 0 4px">Pre-call brief — ${esc(header.name)}</h1>
    <p style="font-size:13px;color:#666;margin:0 0 16px">${esc(header.phone)} &middot; call ${esc(header.bestTime)}</p>
    <p style="font-size:14px;line-height:1.6">${esc(brief.summary)}</p>
    <h2 style="font-size:14px;margin-top:20px">Why now</h2>
    <p style="font-size:14px;line-height:1.6">${esc(brief.why_now)}</p>
    ${redFlagsBlock}
    <h2 style="font-size:14px;margin-top:20px">Assessment readout</h2>
    <table style="border-collapse:collapse;font-size:13px"><tbody>${assessmentRows}</tbody></table>
    <h2 style="font-size:14px;margin-top:20px">Recommended lanes</h2>
    <table style="border-collapse:collapse;font-size:13px"><tbody>${lanesRows}</tbody></table>
    <h2 style="font-size:14px;margin-top:20px">Questions to ask</h2>
    <ul style="font-size:14px;line-height:1.6">${list(brief.questions_to_ask)}</ul>
    <h2 style="font-size:14px;margin-top:20px">Suggested plan outline</h2>
    <ul style="font-size:14px;line-height:1.6">${list(brief.suggested_plan_outline)}</ul>
  </div>`;
}

export function renderText(header: BriefHeader, brief: Brief): string {
  const lines: string[] = [
    `Pre-call brief — ${header.name}`,
    `${header.phone} - call ${header.bestTime}`,
    '',
    brief.summary ?? '',
    '',
    'Why now:',
    brief.why_now ?? '',
  ];
  if ((brief.red_flags ?? []).length) {
    lines.push('', 'RED FLAGS:', ...(brief.red_flags ?? []).map((f) => `- ${f}`));
  }
  lines.push('', 'Assessment readout:');
  for (const a of brief.assessment_readout ?? []) lines.push(`- ${a.category}: ${a.score} (${a.note})`);
  lines.push('', 'Recommended lanes:');
  for (const l of brief.recommended_lanes ?? []) lines.push(`- ${l.lane} [${l.visit_type}, ${l.price}]: ${l.rationale}`);
  lines.push('', 'Questions to ask:');
  for (const q of brief.questions_to_ask ?? []) lines.push(`- ${q}`);
  lines.push('', 'Suggested plan outline:');
  for (const p of brief.suggested_plan_outline ?? []) lines.push(`- ${p}`);
  return lines.join('\n');
}
