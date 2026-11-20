import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';

vi.mock('../api/operations.js', () => ({
  listDrawingEvents: vi.fn(),
  listDrawingEntrants: vi.fn(),
}));
import * as ops from '../api/operations.js';
import DrawingPanel from '../components/admin/DrawingPanel.svelte';

const events = [
  { tag: 'talk-old', entrantCount: 1, lastEntryAt: '2026-11-10T00:00:00Z' },
  { tag: 'talk-austin', entrantCount: 3, lastEntryAt: '2026-11-19T00:00:00Z' },
];
const entrants = [
  { contactId: 'a', display: 'Jane D.' },
  { contactId: 'b', display: 'Tom S.' },
  { contactId: 'c', display: 'Cher' },
];

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
  (ops.listDrawingEvents as any).mockResolvedValue({ drawingEvents: events });
  (ops.listDrawingEntrants as any).mockResolvedValue({ drawingEntrants: entrants });
});

async function clickDraw() {
  await screen.findByRole('button', { name: /^draw$/i });
  await waitFor(() => expect(screen.getByRole('button', { name: /^draw$/i })).not.toBeDisabled());
  await fireEvent.click(screen.getByRole('button', { name: /^draw$/i }));
}

describe('DrawingPanel', () => {
  it('defaults to the most recent tag and shows its entrant count', async () => {
    render(DrawingPanel);
    await waitFor(() => expect(ops.listDrawingEntrants).toHaveBeenCalledWith('talk-austin'));
    expect(await screen.findByTestId('entrant-count')).toHaveTextContent('3');
  });

  it('draws 1st, 2nd, 3rd without repeats, then stops at the max', async () => {
    render(DrawingPanel);
    await clickDraw();
    await clickDraw();
    await clickDraw();
    const winners = screen.getAllByTestId('winner').map((w) => w.textContent ?? '');
    expect(winners).toHaveLength(3);
    expect(winners[0]).toContain('1st');
    expect(winners[1]).toContain('2nd');
    expect(winners[2]).toContain('3rd');
    for (const n of ['Jane D.', 'Tom S.', 'Cher']) expect(winners.join('|')).toContain(n);
    expect(screen.queryByRole('button', { name: /^draw$/i })).toBeNull();
    expect(screen.getByRole('button', { name: /draw another/i })).toBeInTheDocument();
  });

  it('a double-tap on Draw draws only one name', async () => {
    render(DrawingPanel);
    await clickDraw();
    await fireEvent.click(screen.getByRole('button', { name: /^draw$/i }));
    expect(screen.getAllByTestId('winner')).toHaveLength(1);
  });

  it('keeps winners across a remount via sessionStorage, and Reset (confirmed) clears them', async () => {
    const { unmount } = render(DrawingPanel);
    await clickDraw();
    unmount();
    render(DrawingPanel);
    expect(await screen.findAllByTestId('winner')).toHaveLength(1);

    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    await fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getAllByTestId('winner')).toHaveLength(1);
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    await fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.queryAllByTestId('winner')).toHaveLength(0);
  });

  it('Refresh entrants re-queries and updates the count', async () => {
    render(DrawingPanel);
    await screen.findByTestId('entrant-count');
    (ops.listDrawingEntrants as any).mockResolvedValue({ drawingEntrants: [...entrants, { contactId: 'd', display: 'New P.' }] });
    await fireEvent.click(screen.getByRole('button', { name: /refresh entrants/i }));
    await waitFor(() => expect(screen.getByTestId('entrant-count')).toHaveTextContent('4'));
  });

  it('shows an empty state with zero entrants and no Draw button enabled', async () => {
    (ops.listDrawingEntrants as any).mockResolvedValue({ drawingEntrants: [] });
    render(DrawingPanel);
    expect(await screen.findByTestId('entrant-count')).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: /^draw$/i })).toBeDisabled();
  });
});
