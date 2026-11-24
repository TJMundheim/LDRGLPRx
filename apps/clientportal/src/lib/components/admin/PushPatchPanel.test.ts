import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';

const decide = vi.fn();
const providers = vi.fn();
vi.mock('../../api/operations.js', () => ({
  decidePushPatchAdmin: (...a: unknown[]) => decide(...a),
  listPushPatchProviders: (...a: unknown[]) => providers(...a),
  refundEncounterAdmin: vi.fn(),
}));

import PushPatchPanel from './PushPatchPanel.svelte';

const enc = (o: Record<string, unknown> = {}) => ({
  encounterId: 'pp-1', category: 'push-patch', state: 'sent-to-provider', visitType: 'async', lane: 'push-patch',
  amountCents: 14900, createdAt: '', updatedAt: '', ...o,
}) as any;
const mount = (e = enc(), onchanged = vi.fn()) => { render(PushPatchPanel, { contactId: 'c1', enc: e, name: 'Pat Lee', onchanged }); return onchanged; };

const MOLINA = { id: 'molina', name: 'Oscar Molina', credentials: 'MD', default: true };
const SMITH = { id: 'smith', name: 'Jane Smith', credentials: 'DO', default: false };
const roster = (...p: unknown[]) => providers.mockResolvedValue({ pushPatchProviders: p });

beforeEach(() => { vi.clearAllMocks(); roster(MOLINA, SMITH); });

describe('PushPatchPanel', () => {
  it('renders nothing for non push-patch encounters', () => {
    const { container } = render(PushPatchPanel, { contactId: 'c1', enc: enc({ lane: 'rx' }), name: 'x', onchanged: vi.fn() });
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
    expect(decide).toHaveBeenCalledWith({ contactId: 'c1', encounterId: 'pp-1', action: 'approve', providerId: 'molina' });
  });

  it('approve confirm shows a "Signing as" select with the default preselected', async () => {
    mount();
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    const sel = (await screen.findByLabelText('Signing as')) as HTMLSelectElement;
    expect(sel.tagName).toBe('SELECT');
    expect(Array.from(sel.options).map((o) => o.textContent?.trim())).toEqual(['Oscar Molina, MD', 'Jane Smith, DO']);
    expect(sel.value).toBe('molina');
  });

  it('preselects the default even when it is not first', async () => {
    roster({ ...SMITH }, { ...MOLINA, default: false }, { id: 'lee', name: 'Ann Lee', credentials: 'MD', default: true });
    mount();
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(((await screen.findByLabelText('Signing as')) as HTMLSelectElement).value).toBe('lee');
  });

  it('approving as another provider passes that providerId', async () => {
    decide.mockResolvedValue({ decidePushPatchAdmin: { ok: true, state: 'script-written', mailOk: true } });
    const onchanged = mount();
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await fireEvent.change(await screen.findByLabelText('Signing as'), { target: { value: 'smith' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm approve' }));
    await waitFor(() => expect(onchanged).toHaveBeenCalled());
    expect(decide).toHaveBeenCalledWith({ contactId: 'c1', encounterId: 'pp-1', action: 'approve', providerId: 'smith' });
  });

  it('a single provider shows read-only text, no select, and still passes its id', async () => {
    roster(MOLINA);
    decide.mockResolvedValue({ decidePushPatchAdmin: { ok: true, state: 'script-written', mailOk: true } });
    const onchanged = mount();
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText('Signing as: Oscar Molina, MD')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm approve' }));
    await waitFor(() => expect(onchanged).toHaveBeenCalled());
    expect(decide).toHaveBeenCalledWith({ contactId: 'c1', encounterId: 'pp-1', action: 'approve', providerId: 'molina' });
  });

  it('if the provider list fails to load, approve still works with no providerId and nothing alarming shows', async () => {
    providers.mockRejectedValue(new Error('boom'));
    decide.mockResolvedValue({ decidePushPatchAdmin: { ok: true, state: 'script-written', mailOk: true } });
    const onchanged = mount();
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(providers).toHaveBeenCalled());
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByText(/Signing as/)).toBeNull();
    expect(screen.queryByText(/boom/)).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm approve' }));
    await waitFor(() => expect(onchanged).toHaveBeenCalled());
    expect(decide).toHaveBeenCalledWith({ contactId: 'c1', encounterId: 'pp-1', action: 'approve' });
  });

  it('decline shows no picker, does not load providers, and sends no providerId', async () => {
    decide.mockResolvedValue({ decidePushPatchAdmin: { ok: true, state: 'declined', mailOk: true } });
    const onchanged = mount();
    await fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(screen.queryByLabelText('Signing as')).toBeNull();
    expect(providers).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm decline' }));
    await waitFor(() => expect(onchanged).toHaveBeenCalled());
    expect(decide).toHaveBeenCalledWith({ contactId: 'c1', encounterId: 'pp-1', action: 'decline' });
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

  describe('GLP-1 order (g1-)', () => {
    const g = (sku = 'glp1-sema', o: Record<string, unknown> = {}) => enc({ encounterId: 'g1-cs_1', lane: 'glp1', category: 'glp1', skuId: sku, ...o });
    const opts = (sel: HTMLElement) => Array.from((sel as HTMLSelectElement).options).map((o) => o.textContent?.trim());
    const approve = async () => { await fireEvent.click(screen.getByRole('button', { name: 'Approve' })); return (await screen.findByLabelText('Weekly dose')) as HTMLSelectElement; };

    it('shows the product name and the 4-week refund wording', () => {
      mount(g('glp1-tirzep'));
      expect(screen.getByText('GLP-2 · Tirzep (tirzepatide)')).toBeTruthy();
      expect(screen.getByText(/one month each, every 4 weeks/)).toBeTruthy();
      expect(screen.queryByText(/6-week/)).toBeNull();
    });

    it.each([
      ['glp1-sema', ['Choose a dose', '0.25 mg', '0.5 mg', '1 mg', '1.7 mg', '2.4 mg', 'Other (type it)']],
      ['glp1-tirzep', ['Choose a dose', '2.5 mg', '5 mg', '7.5 mg', '10 mg', '12.5 mg', '15 mg', 'Other (type it)']],
      ['glp1-reta', ['Choose a dose', '2 mg', '4 mg', '8 mg', '12 mg', 'Other (type it)']],
    ])('%s shows only its own doses', async (sku, expected) => {
      mount(g(sku));
      expect(opts(await approve())).toEqual(expected);
    });

    it('Push Patch shows no dose dropdown', async () => {
      mount();
      await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
      await screen.findByLabelText('Signing as');
      expect(screen.queryByLabelText('Weekly dose')).toBeNull();
    });

    it('Confirm approve is disabled until a dose is chosen, and Other needs text', async () => {
      mount(g());
      const sel = await approve();
      const btn = screen.getByRole('button', { name: 'Confirm approve' }) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
      await fireEvent.change(sel, { target: { value: 'other' } });
      expect(btn.disabled).toBe(true);
      await fireEvent.input(screen.getByLabelText('Type the dose'), { target: { value: '3 mg' } });
      expect(btn.disabled).toBe(false);
    });

    it('sends the chosen dose in the mutation', async () => {
      decide.mockResolvedValue({ decidePushPatchAdmin: { ok: true, state: 'script-written', mailOk: true } });
      const onchanged = mount(g());
      await fireEvent.change(await approve(), { target: { value: '0.5 mg' } });
      await fireEvent.click(screen.getByRole('button', { name: 'Confirm approve' }));
      await waitFor(() => expect(onchanged).toHaveBeenCalled());
      expect(decide).toHaveBeenCalledWith({ contactId: 'c1', encounterId: 'g1-cs_1', action: 'approve', providerId: 'molina', dose: '0.5 mg' });
    });

    it('sends typed Other text as the dose', async () => {
      decide.mockResolvedValue({ decidePushPatchAdmin: { ok: true } });
      mount(g());
      await fireEvent.change(await approve(), { target: { value: 'other' } });
      await fireEvent.input(screen.getByLabelText('Type the dose'), { target: { value: ' 3 mg ' } });
      await fireEvent.click(screen.getByRole('button', { name: 'Confirm approve' }));
      await waitFor(() => expect(decide).toHaveBeenCalled());
      expect((decide.mock.calls[0]![0] as any).dose).toBe('3 mg');
    });

    it('decline sends no dose and shows no dropdown', async () => {
      decide.mockResolvedValue({ decidePushPatchAdmin: { ok: true } });
      mount(g());
      await fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
      expect(screen.queryByLabelText('Weekly dose')).toBeNull();
      await fireEvent.click(screen.getByRole('button', { name: 'Confirm decline' }));
      await waitFor(() => expect(decide).toHaveBeenCalledWith({ contactId: 'c1', encounterId: 'g1-cs_1', action: 'decline' }));
    });

    it('shows the dose_required error', async () => {
      decide.mockResolvedValue({ decidePushPatchAdmin: { ok: false, code: 'dose_required', error: 'Choose a dose first.' } });
      mount(g());
      await fireEvent.change(await approve(), { target: { value: '1 mg' } });
      await fireEvent.click(screen.getByRole('button', { name: 'Confirm approve' }));
      await waitFor(() => expect(screen.getByText('Choose a dose first.')).toBeTruthy());
    });
  });
});
