export interface AgentRun {
  runId: string;
  agent: string;
  startedAt: string;
  summary?: string;
  autonomousDecisions?: number;
  toolCalls?: number;
  needsAttention?: boolean;
  escalationNote?: string;
}

export interface ApprovalRequest {
  requestId: string;
  summary: string;
  createdAt: string;
  status: string;
}

export interface Contact {
  contactId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface Event {
  eventId: string;
  title: string;
  startsAt: string;
  zoomLink?: string;
}

export interface DigestResult {
  markdown: string;
  html: string;
}

function ageLabel(iso: string, now: Date): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

function mdToHtml(md: string): string {
  return `<html><body><pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;max-width:700px">${md.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c])}</pre></body></html>`;
}

export function composeDigest(
  runs: AgentRun[],
  approvals: ApprovalRequest[],
  newProteges: Contact[],
  upcomingEvents: Event[],
  now: Date = new Date(),
): DigestResult {
  const dateLabel = now.toISOString().slice(0, 10);

  // group runs by agent
  const byAgent: Record<string, AgentRun[]> = {};
  for (const r of runs) {
    (byAgent[r.agent] ??= []).push(r);
  }
  const totalDecisions = runs.reduce((s, r) => s + (r.autonomousDecisions ?? 0), 0);
  const totalTools = runs.reduce((s, r) => s + (r.toolCalls ?? 0), 0);

  const runBullets = Object.entries(byAgent).map(([agent, rs]) => {
    const summaries = rs.map((r) => r.summary).filter(Boolean).join('; ');
    return `- **${agent}** — ${rs.length} run${rs.length > 1 ? 's' : ''}${summaries ? `: ${summaries}` : ''}`;
  });

  const protegeBullets = newProteges.map((c) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || c.contactId;
    return `- ${name}`;
  });

  const approvalBullets = approvals.map((a) => `- **${a.requestId}** — ${a.summary} *(${ageLabel(a.createdAt, now)})*`);

  const eventBullets = upcomingEvents.map((e) => {
    const dt = new Date(e.startsAt).toUTCString().replace(' GMT', ' UTC');
    return `- **${e.title}** — ${dt}${e.zoomLink ? ` ([Zoom](${e.zoomLink}))` : ''}`;
  });

  const flags = runs.filter((r) => r.needsAttention);
  const flagBullets = flags.map((r) => `- **${r.agent}** — ${r.escalationNote ?? 'needs attention'}`);

  const markdown = [
    `# My4MLife Daily Digest — ${dateLabel}`,
    '',
    `## What happened in the last 24 hours`,
    `- ${newProteges.length} new Protégé signup${newProteges.length !== 1 ? 's' : ''}${newProteges.length ? ':' : ''}`,
    ...protegeBullets.map((b) => `  ${b}`),
    `- ${runs.length} agent run${runs.length !== 1 ? 's' : ''}`,
    ...runBullets,
    `- ${totalDecisions} autonomous decision${totalDecisions !== 1 ? 's' : ''}`,
    `- ${totalTools} tool call${totalTools !== 1 ? 's' : ''}`,
    '',
    `## Awaiting your approval (${approvals.length})`,
    ...(approvals.length ? approvalBullets : ['- None']),
    '',
    `## Upcoming this week`,
    ...(upcomingEvents.length ? eventBullets : ['- None']),
    '',
    `## Anomalies + flags`,
    ...(flags.length ? flagBullets : ['- None']),
  ].join('\n');

  return { markdown, html: mdToHtml(markdown) };
}
