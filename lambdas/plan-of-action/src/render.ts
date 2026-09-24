// Link allowlist enforcement + deterministic, escaped HTML/text rendering of a plan.
import { DISCLAIMER, ALLOWED_ORIGINS, ALLOWED_PATHS, ALLOWED_PATH_PREFIXES } from './prompt';
import type { PlanJson } from './bedrock';

/** Standard closing block appended to every plan (TJ: automatic, not optional).
 *  Links only to the hosted /stack and /meals pages — never an Amazon link (Associates ToS). */
export const STACK_URL = 'https://my4mlife.com/stack?utm_source=plan';
export const MEALS_URL = 'https://my4mlife.com/meals/week-1?utm_source=plan';

const esc = (v: unknown) =>
  String(v ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));

/** Throws 'link not allowed' if any URL in the plan falls outside the fixed allowlist. */
export function validateLinks(plan: PlanJson): void {
  const links = [
    plan.next_step_cta?.url,
    ...(plan.plan_steps ?? []).map((s) => s.link),
  ].filter((l): l is string => !!l);

  for (const link of links) {
    let url: URL;
    try {
      url = new URL(link);
    } catch {
      throw new Error('link not allowed');
    }
    const pathAllowed =
      ALLOWED_PATHS.includes(url.pathname) ||
      ALLOWED_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(`${prefix}/`));
    if (!ALLOWED_ORIGINS.includes(url.origin) || !pathAllowed) {
      throw new Error('link not allowed');
    }
  }
}

/** Renders the patient-facing plan email. Every dynamic string is HTML-escaped. */
export function renderPlan(plan: PlanJson, firstName?: string): { html: string; text: string } {
  const name = esc(firstName || 'there');
  const greeting = esc(plan.greeting) || `Hi ${name},`;

  const stepsHtml = (plan.plan_steps ?? [])
    .map((s) => `<li style="margin-bottom:14px"><strong>${esc(s.step)}</strong><br>
      <span style="color:#555;font-size:14px">${esc(s.why)}</span>${s.link ? ` — <a href="${esc(s.link)}">${esc(s.link)}</a>` : ''}</li>`)
    .join('');

  const stepsText = (plan.plan_steps ?? [])
    .map((s, i) => `${i + 1}. ${s.step}\n   ${s.why}${s.link ? `\n   ${s.link}` : ''}`)
    .join('\n\n');

  const ctaLabel = esc(plan.next_step_cta?.label);
  const ctaUrl = esc(plan.next_step_cta?.url);

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto">
<div style="background:#1A2E1E;color:#fff;padding:20px;text-align:center">
  <h1 style="margin:0;font-size:20px">My4MLife</h1>
  <p style="margin:6px 0 0;font-size:12px;color:#c9d6cc">Don't lose your identity and your dignity while you still have a choice.</p>
</div>
<div style="padding:24px">
  <p>${greeting}</p>
  <p style="color:#333;line-height:1.5">${esc(plan.summary_of_call)}</p>
  <h2 style="font-size:16px;color:#1A2E1E">Your plan</h2>
  <ol>${stepsHtml}</ol>
  <p style="text-align:center;margin:28px 0">
    <a href="${ctaUrl}" style="background:#1A2E1E;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600">${ctaLabel}</a>
  </p>
  <div style="margin:28px 0 0;padding-top:18px;border-top:1px solid #eee">
    <h2 style="font-size:16px;color:#1A2E1E;margin:0 0 6px">Your stack and your meals, one click</h2>
    <p style="color:#333;line-height:1.5;margin:0 0 8px">Everything on your plan is listed on one page, with the exact product for each line: <a href="${STACK_URL}">${STACK_URL}</a></p>
    <p style="color:#333;line-height:1.5;margin:0">A full month of dinners built around the protocol: <a href="${MEALS_URL}">${MEALS_URL}</a></p>
  </div>
  <p style="font-size:11px;color:#888;border-top:1px solid #eee;padding-top:12px;margin-top:24px">${esc(DISCLAIMER)}</p>
</div>
</div>`;

  const text = `My4MLife
Don't lose your identity and your dignity while you still have a choice.

${plan.greeting || `Hi ${firstName || 'there'},`}

${plan.summary_of_call}

Your plan:
${stepsText}

${plan.next_step_cta?.label}: ${plan.next_step_cta?.url}

Your stack and your meals, one click
Everything on your plan is listed on one page, with the exact product for each line: ${STACK_URL}
A full month of dinners built around the protocol: ${MEALS_URL}

${DISCLAIMER}`;

  return { html, text };
}
