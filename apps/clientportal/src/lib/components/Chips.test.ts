import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Chips from './Chips.svelte';

describe('Chips', () => {
  it('renders one chip per option under the label', () => {
    render(Chips, { props: { label: 'Sleep', unit: 'hrs', options: [6, 7, 8], value: null, onChange: vi.fn() } });
    expect(screen.getByText('Sleep')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '6' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument();
  });

  it('marks the selected option pressed', () => {
    render(Chips, { props: { label: 'Walk', options: [0, 30], value: 30, onChange: vi.fn() } });
    expect(screen.getByRole('button', { name: '30' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '0' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports a tapped value', async () => {
    const onChange = vi.fn();
    render(Chips, { props: { label: 'Protein', options: [20, 40], value: null, onChange } });
    await fireEvent.click(screen.getByRole('button', { name: '40' }));
    expect(onChange).toHaveBeenCalledWith(40);
  });

  it('clears when the selected chip is tapped again', async () => {
    const onChange = vi.fn();
    render(Chips, { props: { label: 'Protein', options: [20, 40], value: 40, onChange } });
    await fireEvent.click(screen.getByRole('button', { name: '40' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
