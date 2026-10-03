// Push Patch encounters in the Patients drawer: panel replaces the generic status selector + charge box.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';

const list = vi.fn();
const get = vi.fn();
const decide = vi.fn();
vi.mock('../../api/operations.js', () => ({
  listPatientRecordsAdmin: (...a: unknown[]) => list(...a),
  getPatientRecordAdmin: (...a: unknown[]) => get(...a),
  decidePushPatchAdmin: (...a: unknown[]) => decide(...a),
  refundEncounterAdmin: vi.fn(), updateEncounterStateAdmin: vi.fn(), chargeEncounterAdmin: vi.fn(),
  exportClinicalPacketAdmin: vi.fn(), generateCoordinatorBriefAdmin: vi.fn(), draftPlanOfActionAdmin: vi.fn(),
  sendPlanOfActionAdmin: vi.fn(), sendConsentRequestAdmin: vi.fn(), sendToProviderAdmin: vi.fn(),
}));

import PatientsAdmin from './PatientsAdmin.svelte';

const encs = (ppState: string) => [
  { encounterId: 'pp-1', category: 'push-patch', state: ppState, visitType: 'async', lane: 'push-patch', amountCents: 14900, createdAt: '2026-10-01T00:00:00Z', updatedAt: '' },
  { encounterId: 'rx-1', category: 'glp1', state: 'script-written', visitType: 'async', lane: 'glp1', createdAt: '2026-10-01T00:00:00Z', updatedAt: '' },
];
const record = (ppState: string) => ({
  contactId: 'c1', demographics: { firstName: 'Pat', lastName: 'Lee', email: 'pat@example.com' }, consents: null, cardOnFile: null,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '', encounters: encs(ppState), audit: [], briefs: [], plans: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  list.mockResolvedValue({ listPatientRecordsAdmin: [record('sent-to-provider')] });
  get.mockResolvedValue({ getPatientRecordAdmin: record('sent-to-provider') });
});

async function open() {
  render(PatientsAdmin);
  await fireEvent.click(await screen.findByText('Pat Lee'));
  await screen.findByText(/Paid at checkout/);
}

describe('PatientsAdmin · Push Patch encounter', () => {
  it('shows the Push Patch panel with Approve/Decline, and not the status buttons or charge box, for that encounter only', async () => {
    await open();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeTruthy();
    // generic charge box exists exactly once: for the glp1 encounter, not the push-patch one
    expect(screen.getAllByText(/Approve & charge/)).toHaveLength(1);
    // generic transition row (Advance → …) shows only for the glp1 encounter; pp-1 (sent-to-provider) has none
    expect(screen.getAllByText('Advance')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Script written' })).toBeNull();
  });

  it('approving calls decidePushPatchAdmin and re-reads the patient', async () => {
    decide.mockResolvedValue({ decidePushPatchAdmin: { ok: true, state: 'script-written', mailOk: true } });
    await open();
    get.mockResolvedValue({ getPatientRecordAdmin: record('script-written') });
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Confirm approve' }));
    await waitFor(() => expect(screen.getByText('Approved')).toBeTruthy());
    expect(decide).toHaveBeenCalledWith({ contactId: 'c1', encounterId: 'pp-1', action: 'approve' });
    // approved push-patch is NOT "ready to charge" and shows no charge box: still just the glp1 one
    expect(screen.getAllByText(/Approve & charge/)).toHaveLength(1);
  });
});
