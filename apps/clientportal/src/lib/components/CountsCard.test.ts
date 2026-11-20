import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';

const recordAdherence = vi.fn();
vi.mock('../api/operations.js', () => ({ recordAdherence: (...a: unknown[]) => recordAdherence(...a) }));
vi.mock('../toast/toast.svelte.js', () => ({ pushToast: vi.fn() }));

import CountsCard from './CountsCard.svelte';

const weekDates = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'];
const base = { today: '2026-11-18', weekDates, weekStart: new Date(2026, 10, 16) };

describe('CountsCard', () => {
  beforeEach(() => { recordAdherence.mockReset(); recordAdherence.mockResolvedValue({}); });

  it('shows labelled inputs, numeric keyboard, and only days up to today', () => {
    render(CountsCard, { props: { ...base, entries: [], onEntries: vi.fn() } });
    expect(screen.getByLabelText(/Steps/)).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByLabelText(/Sleep last night/)).toHaveAttribute('inputmode', 'decimal');
    expect(screen.getByLabelText(/Water before noon/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/2026-11-19/)).toBeNull();
    expect(screen.getByLabelText(/2026-11-16/)).toBeInTheDocument();
  });

  it('saves with source manual and logs the 10k action for 10,000+ steps', async () => {
    const onEntries = vi.fn();
    render(CountsCard, { props: { ...base, entries: [], onEntries } });
    await fireEvent.input(screen.getByLabelText(/Steps/), { target: { value: '10,200' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save counts' }));
    await waitFor(() => expect(onEntries).toHaveBeenCalled());
    const inputs = recordAdherence.mock.calls.map(c => c[0]);
    const steps = inputs.find(i => i.actionId === 'count-steps');
    expect(steps).toMatchObject({ date: '2026-11-18', completed: true, value: 10200 });
    expect(JSON.parse(steps.notes).source).toBe('manual');
    expect(inputs.some(i => i.actionId === '10k-steps')).toBe(true);
    const next = onEntries.mock.calls[0][0] as Array<{ dateActionId: string }>;
    expect(next.filter(r => r.dateActionId === '2026-11-18#10k-steps')).toHaveLength(1);
  });

  it('does not add a local 10k row when that write fails, but still saves counts', async () => {
    recordAdherence.mockImplementation(async (i: any) => { if (i.actionId === '10k-steps') throw new Error('x'); return {}; });
    const onEntries = vi.fn();
    render(CountsCard, { props: { ...base, entries: [], onEntries } });
    await fireEvent.input(screen.getByLabelText(/Steps/), { target: { value: '12000' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save counts' }));
    await waitFor(() => expect(onEntries).toHaveBeenCalled());
    const next = onEntries.mock.calls[0][0] as Array<{ dateActionId: string }>;
    expect(next.map(r => r.dateActionId)).toEqual(['2026-11-18#count-steps']);
  });

  it('saves a past day of this week when picked', async () => {
    render(CountsCard, { props: { ...base, entries: [], onEntries: vi.fn() } });
    await fireEvent.click(screen.getByLabelText(/2026-11-16/));
    await fireEvent.input(screen.getByLabelText(/Sleep last night/), { target: { value: '7.5' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save counts' }));
    await waitFor(() => expect(recordAdherence).toHaveBeenCalled());
    expect(recordAdherence.mock.calls[0][0]).toMatchObject({ date: '2026-11-16', actionId: 'count-sleep', value: 7.5 });
  });

  it('blocks save on invalid input and shows an alert', async () => {
    render(CountsCard, { props: { ...base, entries: [], onEntries: vi.fn() } });
    await fireEvent.input(screen.getByLabelText(/Water before noon/), { target: { value: '99' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save counts' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(recordAdherence).not.toHaveBeenCalled();
  });

  it('loads saved values and offers Update', () => {
    render(CountsCard, { props: { ...base, entries: [{ dateActionId: '2026-11-18#count-chews', value: 25 }], onEntries: vi.fn() } });
    expect(screen.getByLabelText(/Chews per bite/)).toHaveValue('25');
    expect(screen.getByRole('button', { name: 'Update counts' })).toBeInTheDocument();
  });
});
