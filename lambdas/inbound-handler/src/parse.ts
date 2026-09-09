// Raw mail parsing + loop guard. Keeps the concierge from replying to its own
// notifications, other My4MLife automation, or auto-generated bounces/OOO mail.
import { simpleParser, ParsedMail } from 'mailparser';

const AUTO_DOMAINS = new Set(['my4mlife.com', 'inbox.my4mlife.com']);

export interface ParsedInbound {
  fromEmail: string;
  originalTo: string;
  subject: string;
  body: string;
  messageId: string;
  autoSubmitted?: string;
}

export function shouldSkip(inbound: Pick<ParsedInbound, 'fromEmail' | 'autoSubmitted' | 'subject'>): string | null {
  const domain = inbound.fromEmail.split('@')[1]?.toLowerCase();
  if (domain && AUTO_DOMAINS.has(domain)) return `from domain ${domain} is internal`;
  if (inbound.autoSubmitted && inbound.autoSubmitted.toLowerCase() !== 'no') return `Auto-Submitted: ${inbound.autoSubmitted}`;
  if (inbound.subject?.startsWith('[Concierge')) return 'subject looks like our own notification';
  return null;
}

function firstAddress(field: ParsedMail['to']): string {
  if (!field) return '';
  const obj = Array.isArray(field) ? field[0] : field;
  return (obj?.value?.[0]?.address ?? '').toLowerCase().trim();
}

export async function parseInbound(raw: string, sesMessageId: string): Promise<ParsedInbound> {
  const parsed = await simpleParser(raw);
  const fromEmail = (parsed.from?.value?.[0]?.address ?? '').toLowerCase().trim();
  const autoHeader = parsed.headers.get('auto-submitted');
  return {
    fromEmail,
    originalTo: firstAddress(parsed.to),
    subject: parsed.subject ?? '(no subject)',
    body: parsed.text ?? '',
    messageId: parsed.messageId ?? sesMessageId,
    autoSubmitted: typeof autoHeader === 'string' ? autoHeader : undefined,
  };
}
