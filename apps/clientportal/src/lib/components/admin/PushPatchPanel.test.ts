import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';

const decide = vi.fn();
vi.mock('../../api/operations.js', () => ({
  decidePushPatchAdmin: (...a: unknown[]) => decide(...a),
  refundEncounterAdmin: vi.fn(),
}));

import PushPatchPanel from './PushPatchPanel.svelte';

const enc = (o: Record<string, unknown> = {}) => ({
  encounterId: 'pp-1', category: 'push-patch', state: 'sent-to-provider', visitType: 'async', lane: 'push-patch',
  amountCents: 14900, createdAt: '', updatedAt: '', ...o,
}) as any;
const mount = (e = enc(), onchanged = vi.fn()) => { render(PushPatchPanel, { contactId: 'c1', enc: e, name: 'Pat Lee', onchanged }); return onchanged; };

beforeEach(() => vi.clearAllMocks());

describe('PushPatchPanel', () => {
  it('renders nothing for non push-patch encounters', () => {
    const { container } = render(PushPatchPanel, { contactId: 'c1', enc: enc({ lane: 'glp1' }), name: 'x', onchanged: vi.fn() });
    expect(container.textContent?.trim()).toBe('');
  });

  it('shows what was paid, with (test) for test orders, and the plain-words state', () => {
    mount(enc({ testOrder: true, amountCents: 200 }));
    expect(screen.getByText('Paid at checkout: $2.00 (test)')).toBeTruthy();
    expect(screen.getByText('Awaiting physician review')).toBeTruthy();
  });

  it.each([['script-written', 'Approved'], ['declined', 'Declined']])('%s reads "%s" and offers no Approve/Decline', (state, label) => {
    mount(enc({ state }));
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Decline' })).toBeNull();
  });

  it('shows decidedBy and the pharmacy order time when present', () => {
    mount(enc({ state: 'script-written', decidedAt: '2026-10-03T10:00:00Z', decidedBy: 'admin:tj', genesisOrderSentAt: '2026-10-03T10:00:05Z' }));
    expect(screen.getByText(/Decided .* by admin tj/)).toBeTruthy();
    expect(screen.getByText(/Order sent to pharmacy:/)).toBeTruthy();
  });

  it('has no generic status selector or charge controls', () => {
    mount();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByText(/charge/i)).toBeNull();
  });

  it('Approve confirms first (Cancel does nothing), then calls the mutation and refreshes', async () => {
    decide.mockResolvedValue({ decidePushPatchAdmin: { ok: true, state: 'script-written', mailOk: true } });
    const onchanged = mount();
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.getByText("Approve this order? This emails the patient's welcome and sends the order to the pharmacy.")).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(decide).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm approve' }));
    await waitFor(() => expect(onchanged).toHaveBeenCalled());
    expect(decide).toHaveBeenCalledWith({ contactId: 'c1', encounterId: 'pp-1', action: 'approve' });
  });

  it('Decline confirms with the refund promise, then calls the mutation with action decline', async () => {
    decide.mockResolvedValue({ decidePushPatchAdmin: { ok: true, state: 'declined', mailOk: true } });
    const onchanged = mount();
    await fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(screen.getByText('Decline? The patient is told a refund comes within 10 business days.')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm decline' }));
    await waitFor(() => expect(onchanged).toHaveBeenCalled());
    expect(decide).toHaveBeenCalledWith({ contactId: 'c1', encounterId: 'pp-1', action: 'decline' });
  });

  it('warns when the decision is recorded but an email failed', async () => {
    decide.mockResolvedValue({ decidePushPatchAdmin: { ok: true, state: 'script-written', mailOk: false } });
    mount();
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm approve' }));
    await waitFor(() => expect(screen.getByText(/email failed to send/)).toBeTruthy());
  });

  it('already_decided shows a message and still refreshes', async () => {
    decide.mockResolvedValue({ decidePushPatchAdmin: { ok: false, code: 'already_decided', state: 'declined' } });
    const onchanged = mount();
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm approve' }));
    await waitFor(() => expect(screen.getByText(/Already decided \(Declined\)/)).toBeTruthy());
    expect(onchanged).toHaveBeenCalled();
  });

  it('other failures show the error and do not refresh', async () => {
    decide.mockResolvedValue({ decidePushPatchAdmin: { ok: false, code: 'decision_failed', error: 'try again' } });
    const onchanged = mount();
    await fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm decline' }));
    await waitFor(() => expect(screen.getByText('try again')).toBeTruthy());
    expect(onchanged).not.toHaveBeenCalled();
  });

  it('keeps the refund behaviour for declined + pending', () => {
    mount(enc({ state: 'declined', refundStatus: 'pending', refundDueBy: '2099-01-01' }));
    expect(screen.getByRole('button', { name: 'Issue refund' })).toBeTruthy();
  });
});
