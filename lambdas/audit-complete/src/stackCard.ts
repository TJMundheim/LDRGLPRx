// Week 1 stack card for the Protégé welcome email.
//
// HARD RULE: no Amazon link (tagged or untagged) may ever appear in an email
// body — Amazon Associates ToS. The tagged product links live on the public
// /stack page; the meals plan lives on the public /meals/week-1 page. The
// email only ever links to those hosted pages, never to Amazon directly.
export const STACK_URL = 'https://my4mlife.com/stack?utm_source=welcome';
export const MEALS_URL = 'https://my4mlife.com/meals/week-1?utm_source=welcome';

export function buildStackCard(): string {
  return `<div style="margin:20px 0;padding:22px;border:2px solid #4a6fa5;border-radius:10px;background:#f2f6fc">
<p style="font-size:12px;font-weight:700;letter-spacing:0.16em;color:#2f4a70;text-transform:uppercase;margin:0 0 8px">Your Week 1 Stack</p>
<h2 style="font-family:Georgia,serif;font-size:22px;color:#0a1628;margin:0 0 6px;line-height:1.2">Every product on one page</h2>
<p style="color:#222;font-size:14px;line-height:1.55;margin:0 0 16px">The Logbook names the protocol; this page names the exact product for each line, one click each, or add the whole Week 1 stack to your Amazon cart at once.</p>
<p style="margin:0 0 16px"><a href="${STACK_URL}" style="background:#4a6fa5;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;font-size:14px">See Your Stack &rarr;</a></p>
<hr style="border:none;border-top:1px solid #d7e2f0;margin:0 0 16px">
<h2 style="font-family:Georgia,serif;font-size:20px;color:#0a1628;margin:0 0 6px;line-height:1.2">Your meals for the month</h2>
<p style="color:#222;font-size:14px;line-height:1.55;margin:0 0 16px">A full month of dinners built around the protocol, week by week.</p>
<p style="margin:0"><a href="${MEALS_URL}" style="background:#4a6fa5;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;font-size:14px">See Your Meals &rarr;</a></p>
</div>`;
}
