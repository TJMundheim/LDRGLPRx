import { describe, expect, it, vi } from 'vitest';

vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: vi.fn() }) },
  PutCommand: class {},
}));
const invokeChat = vi.fn();
vi.mock('./bedrock', () => ({ invokeChat: (...a: any[]) => invokeChat(...a), embedQuery: vi.fn() }));
vi.mock('./retrieve', async (orig) => ({
  ...(await orig<any>()),
  retrieve: async () => [],
}));

const { scrubReta } = await import('./scrub.mjs');
const { respond } = await import('./handler');
const { buildSystemPrompt } = await import('./prompt');

describe('scrubReta', () => {
  it('replaces any case with Reta', () => {
    expect(scrubReta('Semaglutide vs Tirzepatide vs Retatrutide')).toBe('Semaglutide vs Tirzepatide vs Reta');
    expect(scrubReta('RETATRUTIDE and retatrutide')).toBe('Reta and Reta');
  });
  it('leaves other text alone', () => {
    expect(scrubReta('semaglutide, tirzepatide')).toBe('semaglutide, tirzepatide');
  });
});

describe('output guard', () => {
  it('scrubs the model reply and link labels', async () => {
    invokeChat.mockResolvedValue('Retatrutide is a GLP-3 option. /assessment');
    const r = await respond({ message: 'hi', history: [], sessionId: 's' } as any);
    expect(r.reply).not.toMatch(/retatrutide/i);
    expect(r.reply).toContain('Reta');
    expect(JSON.stringify(r)).not.toMatch(/retatrutide/i);
  });
});

describe('prompt rule', () => {
  it('tells the model never to write the full name', () => {
    expect(buildSystemPrompt({ chunks: [], firstTurn: false })).toMatch(/GLP-3 \(Reta\)/);
  });
});

import { dropCoordinatorMentions } from './scrub.mjs';
describe('dropCoordinatorMentions (GLP exit)', () => {
  it('removes sentences that send people to the coordinator call or mention labs', () => {
    const t = 'Tirzepatide moves more mass. Which one fits is a physician decision after a short health form and a review of your labs. That\'s what the free care coordinator call sets up.\n\nSee your options.';
    const out = dropCoordinatorMentions(t);
    expect(out).not.toMatch(/coordinator/i);
    expect(out).not.toMatch(/labs/i);
    expect(out).toContain('Tirzepatide moves more mass.');
    expect(out).toContain('See your options.');
  });
  it('leaves text without those mentions unchanged', () => {
    expect(dropCoordinatorMentions('Reta engages three pathways. A physician decides.')).toBe('Reta engages three pathways. A physician decides.');
  });
});
