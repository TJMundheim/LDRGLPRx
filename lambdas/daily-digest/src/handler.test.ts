import { describe, it, expect, vi, beforeEach } from 'vitest';
import { composeDigest, AgentRun, ApprovalRequest, Contact, Event } from './compose.js';

// --- compose.ts unit tests (pure function, no mocks needed) ---

const NOW = new Date('2026-05-24T11:00:00Z');

const sampleRuns: AgentRun[] = [
  { runId: 'r1', agent: 'ops', startedAt: '2026-05-24T09:00:00Z', summary: 'Sent Zoom reminders', autonomousDecisions: 2, toolCalls: 5 },
  { runId: 'r2', agent: 'marketing', startedAt: '2026-05-24T08:00:00Z', summary: 'Published blog post', autonomousDecisions: 1, toolCalls: 3 },
  { runId: 'r3', agent: 'ops', startedAt: '2026-05-24T10:00:00Z', needsAttention: true, escalationNote: 'Zoom link expired', toolCalls: 1 },
];

const sampleApprovals: ApprovalRequest[] = [
  { requestId: 'a1', summary: 'Send mass email to Protégés', createdAt: '2026-05-24T06:00:00Z', status: 'pending' },
];

const sampleProteges: Contact[] = [
  { contactId: 'c1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
  { contactId: 'c2', firstName: 'Bob', email: 'bob@example.com' },
];

const sampleEvents: Event[] = [
  { eventId: 'e1', title: 'Weekly Zoom Q&A', startsAt: '2026-05-27T18:00:00Z', zoomLink: 'https://zoom.us/j/123' },
];

describe('composeDigest — happy path', () => {
  it('includes protege names', () => {
    const { markdown } = composeDigest(sampleRuns, sampleApprovals, sampleProteges, sampleEvents, NOW);
    expect(markdown).toContain('Alice Smith');
    expect(markdown).toContain('Bob');
  });

  it('groups agent runs by agent', () => {
    const { markdown } = composeDigest(sampleRuns, sampleApprovals, sampleProteges, sampleEvents, NOW);
    expect(markdown).toContain('**ops** — 2 runs');
    expect(markdown).toContain('**marketing** — 1 run');
  });

  it('totals autonomous decisions and tool calls', () => {
    const { markdown } = composeDigest(sampleRuns, sampleApprovals, sampleProteges, sampleEvents, NOW);
    expect(markdown).toContain('3 autonomous decisions');
    expect(markdown).toContain('9 tool calls');
  });

  it('lists pending approvals with age', () => {
    const { markdown } = composeDigest(sampleRuns, sampleApprovals, sampleProteges, sampleEvents, NOW);
    expect(markdown).toContain('a1');
    expect(markdown).toContain('Send mass email');
    expect(markdown).toContain('5h ago');
  });

  it('lists upcoming events', () => {
    const { markdown } = composeDigest(sampleRuns, sampleApprovals, sampleProteges, sampleEvents, NOW);
    expect(markdown).toContain('Weekly Zoom Q&A');
    expect(markdown).toContain('zoom.us');
  });

  it('flags anomalies', () => {
    const { markdown } = composeDigest(sampleRuns, sampleApprovals, sampleProteges, sampleEvents, NOW);
    expect(markdown).toContain('Zoom link expired');
  });

  it('produces html wrapper', () => {
    const { html } = composeDigest(sampleRuns, sampleApprovals, sampleProteges, sampleEvents, NOW);
    expect(html).toContain('<html>');
    expect(html).toContain('Daily Digest');
  });
});

describe('composeDigest — empty state', () => {
  it('handles no activity gracefully', () => {
    const { markdown } = composeDigest([], [], [], [], NOW);
    expect(markdown).toContain('0 new Protégé signups');
    expect(markdown).toContain('0 agent runs');
    expect(markdown).toContain('0 autonomous decisions');
    expect(markdown).toContain('0 tool calls');
    expect(markdown).toContain('Awaiting your approval (0)');
    expect(markdown).toContain('- None');
  });
});

// --- handler.ts integration test with mocked AWS clients ---

describe('handler — mocked AWS', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('happy path: scans tables and invokes email-sender', async () => {
    const mockSend = vi.fn();

    // DDB returns sample data; Lambda invoke returns success
    let callCount = 0;
    mockSend.mockImplementation(async (cmd: any) => {
      const name = cmd.constructor?.name ?? '';
      if (name === 'ScanCommand') {
        callCount++;
        if (callCount === 1) return { Items: sampleRuns };
        if (callCount === 2) return { Items: sampleApprovals };
        if (callCount === 3) return { Items: sampleProteges };
        if (callCount === 4) return { Items: sampleEvents };
      }
      return {}; // Lambda invoke
    });

    vi.doMock('@aws-sdk/client-dynamodb', () => ({
      DynamoDBClient: vi.fn(() => ({ send: mockSend })),
    }));
    vi.doMock('@aws-sdk/lib-dynamodb', () => ({
      DynamoDBDocumentClient: { from: vi.fn(() => ({ send: mockSend })) },
      ScanCommand: vi.fn((input) => ({ constructor: { name: 'ScanCommand' }, ...input })),
    }));
    vi.doMock('@aws-sdk/client-lambda', () => ({
      LambdaClient: vi.fn(() => ({ send: mockSend })),
      InvokeCommand: vi.fn((input) => ({ constructor: { name: 'InvokeCommand' }, ...input })),
    }));

    const { handler } = await import('./handler.js');
    await expect(handler()).resolves.toBeUndefined();

    // Should have called send 5 times: 4 scans + 1 lambda invoke
    expect(mockSend).toHaveBeenCalledTimes(5);
  });

  it('empty state: sends digest with no activity', async () => {
    const mockSend = vi.fn().mockResolvedValue({ Items: [] });

    vi.doMock('@aws-sdk/client-dynamodb', () => ({
      DynamoDBClient: vi.fn(() => ({ send: mockSend })),
    }));
    vi.doMock('@aws-sdk/lib-dynamodb', () => ({
      DynamoDBDocumentClient: { from: vi.fn(() => ({ send: mockSend })) },
      ScanCommand: vi.fn((input) => ({ constructor: { name: 'ScanCommand' }, ...input })),
    }));
    vi.doMock('@aws-sdk/client-lambda', () => ({
      LambdaClient: vi.fn(() => ({ send: mockSend })),
      InvokeCommand: vi.fn((input) => ({ constructor: { name: 'InvokeCommand' }, ...input })),
    }));

    const { handler } = await import('./handler.js');
    await expect(handler()).resolves.toBeUndefined();
    expect(mockSend).toHaveBeenCalledTimes(5);

    // Verify the Lambda payload contains "None" for empty sections
    const invokeCalls = mockSend.mock.calls.filter(([cmd]: any) => cmd?.constructor?.name === 'InvokeCommand' || cmd?.InvocationType === 'Event');
    expect(invokeCalls.length).toBeGreaterThan(0);
  });
});
