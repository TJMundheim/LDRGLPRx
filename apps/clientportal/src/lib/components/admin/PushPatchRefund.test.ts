import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';

const refund = vi.fn();
vi.mock('../../api/operations.js', () => ({ refundEncounterAdmin: (...a: unknown[]) => refund(...a) }));

import PushPatchRefund from './PushPatchRefund.svelte';

const enc = (o: Record<string, unknown> = {}) => ({
  encounterId: 'pp-1', category: 'push-patch', state: 'declined', visitType: 'async', lane: 'push-patch',
  refundStatus: 'pending', refundDueBy: '2099-01-01', amountCents: 24900, createdAt: '', updatedAt: '', ...o,
}) as any;

beforeEach(() => vi.clearAllMocks());

describe('PushPatchRefund', () => {
  it('renders nothing for non push-patch encounters', () => {
    const { container } = render(PushPatchRefund, { contactId: 'c1', enc: enc({ lane: 'glp1' }), name: 'Pat Lee', onrefunded: vi.fn() });
    expect(container.textContent?.trim()).toBe('');
  });

  it('shows state, refund status and due date, with an Issue refund button when pending', () => {
    render(PushPatchRefund, { contactId: 'c1', enc: enc(), name: 'Pat Lee', onrefunded: vi.fn() });
    expect(screen.getByText('Refund pending')).toBeTruthy();
    expect(screen.getByText(/Refund due by 2099-01-01/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Issue refund' })).toBeTruthy();
  });

  it('hides the button once refunded', () => {
    render(PushPatchRefund, { contactId: 'c1', enc: enc({ refundStatus: 'refunded' }), name: 'Pat Lee', onrefunded: vi.fn() });
    expect(screen.getByText('Refunded')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Issue refund' })).toBeNull();
  });

  it('confirms first, then calls the mutation and refreshes; Cancel does not call it', async () => {
    refund.mockResolvedValue({ refundEncounterAdmin: { ok: true, refundId: 're_1', amountCents: 24900 } });
    const onrefunded = vi.fn();
    render(PushPatchRefund, { contactId: 'c1', enc: enc(), name: 'Pat Lee', onrefunded });
    await fireEvent.click(screen.getByRole('button', { name: 'Issue refund' }));
    expect(screen.getByText('Refund $249.00 to Pat Lee? This cannot be undone.')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(refund).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Issue refund' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Refund $249.00' }));
    await waitFor(() => expect(onrefunded).toHaveBeenCalled());
    expect(refund).toHaveBeenCalledWith({ contactId: 'c1', encounterId: 'pp-1' });
  });

  it('shows the error and does not refresh when the refund fails', async () => {
    refund.mockResolvedValue({ refundEncounterAdmin: { ok: false, error: 'Order was already sent', code: 'already_shipped' } });
    const onrefunded = vi.fn();
    render(PushPatchRefund, { contactId: 'c1', enc: enc(), name: 'Pat Lee', onrefunded });
    await fireEvent.click(screen.getByRole('button', { name: 'Issue refund' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Refund $249.00' }));
    await waitFor(() => expect(screen.getByText('Order was already sent')).toBeTruthy());
    expect(onrefunded).not.toHaveBeenCalled();
  });

  it('flags due-soon refunds', () => {
    const { container } = render(PushPatchRefund, { contactId: 'c1', enc: enc({ refundDueBy: '2000-01-01' }), name: 'Pat Lee', onrefunded: vi.fn() });
    expect(container.querySelector('.due.hot')).toBeTruthy();
  });
});
