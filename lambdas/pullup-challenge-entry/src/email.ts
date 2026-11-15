import { sendInfo, esc } from './notify';
import type { Entry } from './validate';

const CONSULT = 'https://www.my4mlife.com/consult?lane=peptides&src=pullup';
const PATCH = 'https://www.my4mlife.com/go/push-patch';
const TAGLINE = "Don't lose your identity and your dignity while you still have a choice.";
const FINE = "One code per order, single use, no cash value. Prescription products require a provider's review; the provider decides.";
// Greeting allowlist: a name-like first word, else "there" (keeps links/markup typed into Name out of a Dr. TJ email).
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}'\u2019-]{0,39}$/u;

/** Entrant email from Dr. TJ with the 50% code. Throws if email-sender fails. */
export async function sendEntrantCode(e: Entry, code: string, now: Date = new Date()): Promise<void> {
  const word = e.name.split(/\s+/)[0];
  const first = NAME_RE.test(word) ? word : 'there';
  const expiry = new Date(now.getTime() + 90 * 86400_000).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago',
  });
  const video = e.round === 'final' ? 'your January video' : 'your day-one video';
  const paras = [
    `Hi ${first},`,
    `Thanks for posting ${video}. Showing up is the whole point, and you're competing only with yourself.`,
    `Your code: ${code}`,
    `It's 50% off one peptide order, good for 90 days (through ${expiry}).`,
    'How to use it:',
    `1. Not sure which peptide fits you? Most people aren't. Book your free care coordinator call: ${CONSULT} It comes with a free telemedicine visit, and the provider decides whether a peptide is right for you. Tell the coordinator your code.`,
    `2. Already know you want the Push Patch? Enter the code at checkout (tap "Add promotion code") at ${PATCH}`,
  ];
  if (e.round === 'start') {
    paras.push('Keep training. Post your January video between January 1 and January 7, 2027 and enter it at my4mlife.com/pullup for a second 50% code.');
  }
  paras.push('Dr. TJ', TAGLINE, FINE);
  const text = paras.join('\n\n');
  const html = paras.map((p) => {
    // Only the greeting carries user input; the rest is static copy (the consult URL keeps a literal & in href).
    const h = (p.startsWith('Hi ') ? esc(p) : p).replace(/(https:\/\/[^\s<]+)/g, '<a href="$1">$1</a>').replace(code, `<strong>${code}</strong>`);
    return `<p>${h}</p>`;
  }).join('\n');
  await sendInfo(e.email, 'Your 50% peptide code: Peptide Pull-Up Challenge', text, html);
}
