// The partner agreement: parse version, fill placeholders, render markdown to HTML, hash.
import { createHash } from 'node:crypto';
import md from 'agreement-md';

export const AGREEMENT_MD: string = md;
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c]);

export function parseVersion(text: string): string {
  const m = /Version\s+(PA-[\w-]+)/.exec(text);
  if (!m) throw new Error('agreement has no "Version PA-..." line');
  return m[1];
}

export type Vars = Record<'BUSINESS' | 'SIGNER_NAME' | 'SIGNER_TITLE' | 'PARTNER_CODE' | 'CLIENT_OFFER' | 'COMMISSION' | 'EFFECTIVE_DATE', string>;

export function fillAgreement(text: string, vars: Vars): string {
  const out = text.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in vars ? vars[k as keyof Vars] : m));
  const left = out.match(/\{\{\w+\}\}/);
  if (left) throw new Error(`unfilled placeholder ${left[0]}`);
  return out;
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'long', day: 'numeric' });

const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

/** Minimal markdown: #/##/### headings, -/* and 1. lists, ---, **bold**, *italic*, paragraphs. Everything is escaped. */
export function toHtml(text: string): string {
  const out: string[] = [];
  let list = '';
  const close = () => { if (list) { out.push(`</${list}>`); list = ''; } };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    const li = /^([-*]|\d+\.)\s+(.*)$/.exec(line);
    if (li) {
      const kind = /\d/.test(li[1]) ? 'ol' : 'ul';
      if (list !== kind) { close(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline(li[2])}</li>`);
      continue;
    }
    close();
    if (!line) continue;
    if (h) out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
    else if (/^(-{3,}|\*{3,})$/.test(line)) out.push('<hr>');
    else out.push(`<p>${inline(line)}</p>`);
  }
  close();
  return out.join('');
}
