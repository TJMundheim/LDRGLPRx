// Nurture sequence content for assessment-taken-but-no-purchase members.
//
// Three stages:
//   stage 1 — fires ~15 min after assessment completion (SQS DelaySeconds cap is 900s)
//   stage 2 — fires ~3 days later (requires EventBridge Scheduler — see README TODO)
//   stage 3 — fires ~7 days later (requires EventBridge Scheduler — see README TODO)
//
// For launch, stage 1 is the only stage wired through SQS. Stages 2 + 3 are content-ready
// but their scheduling needs EventBridge Scheduler integration to clear SQS's 15-minute
// delay ceiling.

export type NurtureStage = 1 | 2 | 3;

interface TemplateContext {
  firstName: string;
  introZoomUrl: string;
  /** Comma-separated top category labels from the assessment (e.g. "Gut, Sleep, Hormones"). */
  topCategories: string;
}

const fallback = (s: string | undefined, alt: string) => (s && s.trim()) || alt;

export function emailTemplate(stage: NurtureStage, ctx: TemplateContext): { subject: string; body: string } {
  const first = fallback(ctx.firstName, 'there');
  const top = fallback(ctx.topCategories, 'your priorities');
  const zoom = ctx.introZoomUrl || 'https://my4mlife.com/audit';

  if (stage === 1) {
    return {
      subject: `${first}, your 4M results — and what to do with them`,
      body: `${first},

Thanks for taking the Personalized Assessment. Your top categories came back as: ${top}.

That's useful information — but only if you do something with it. Most men get results like this, nod, close the tab, and life continues. The next twenty years of your mind are decided by whether you turn data into action.

Two ways to start, depending on where you are:

1. **The protocol path.** Pick your top category, order the matching supplement (or both — they stack), and start tomorrow morning. No consult required for the OTC line.

2. **The clinical path.** Book the Comprehensive Consult — $199, includes a full wellness lab with hormone panel. You'll know your testosterone, metabolic markers, and inflammation before any decisions get made. Most men in our demographic find something worth acting on.

If you'd like to hear how the 4M framework fits together before you decide, here's a short intro from Dr. TJ:

${zoom}

Hit me back if you want me to dig into any of your results.

— The My4MLife concierge`,
    };
  }

  if (stage === 2) {
    return {
      subject: `${first} — three days since your assessment`,
      body: `${first},

Quick check-in. Three days ago you took the Personalized Assessment. Your top categories — ${top} — are still sitting there, waiting on a decision.

I'm not going to badger you. But two things worth saying:

The 4M framework isn't "buy more supplements." It's a sequence: gut first, then sleep, then everything else gets easier. If your gut category scored high, that's almost always the first move regardless of what else came up. The reason is the gut-brain axis — about 90% of your serotonin and 50% of your dopamine are made in the gut. Fix the gut, the rest of the categories often improve on their own.

Second: the comprehensive consult ($199, includes the full wellness lab and hormone panel) is what most men in our demographic find the most useful starting point. You leave with actual numbers, not guesses.

If money is the friction, the OTC protocol can start at under $80/month with the first-purchase discount. If time is the friction, the consult is a single 30-minute call.

If neither of those is the friction — what is? Reply and tell me. Sometimes the right answer is "not now," and that's fine.

— The My4MLife concierge`,
    };
  }

  // stage 3
  return {
    subject: `${first} — last note from us (for a while)`,
    body: `${first},

One week since you took the assessment. I'm not going to keep emailing — you have my address if you change your mind.

A few things worth landing on, in case any of them help:

- Your results aren't going anywhere. Sign back in any time and they're still there.
- If you want to talk to a real person before buying anything, reply to this email and someone from the team will reach out.
- If you already have lab results from the last 6 months, the $99 consult skips the new lab order — bring your numbers and we'll work from those.
- The free 4M App stays open to you the moment you make any purchase. Today, next month, next year — the door's the same.

The next twenty years of your mind are decided by what you do now. We'll be here when you're ready.

— The My4MLife concierge`,
  };
}

export function smsTemplate(stage: NurtureStage, ctx: TemplateContext): string {
  const first = fallback(ctx.firstName, '');
  const greet = first ? `${first}, ` : '';
  if (stage === 1) {
    return `${greet}your 4M results are ready. Pick a starting protocol or book the comprehensive consult ($199, includes full hormone panel): https://my4mlife.com/audit — The My4MLife concierge`;
  }
  if (stage === 2) {
    return `${greet}3 days since your 4M assessment. Gut + comprehensive lab is the most-leveraged starting point for most men in your demo. https://my4mlife.com/consult`;
  }
  return `${greet}last check-in. Your 4M results stay saved if you want to come back. https://my4mlife.com`;
}
