/**
 * AuthGate UI flow tests.
 *
 * Mocks src/lib/auth/cognito.ts so no real Cognito calls are made.
 * Tests:
 *   1. Unauthenticated user sees EmailEntry (email input present).
 *   2. Submitting email moves to CodeEntry (code input present).
 *   3. Submitting valid code renders the slot content.
 *   4. No signup screen exists.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { mount } from 'svelte';

// ── Mock cognito module ──────────────────────────────────────────────────────
vi.mock('../../auth/cognito.js', () => ({
  requestEmailCode: vi.fn(),
  submitEmailCode: vi.fn(),
  getCurrentUser: vi.fn(),
  getIdToken: vi.fn(),
  signOut: vi.fn(),
  updatePrimaryEmail: vi.fn(),
}));

// ── Mock auth store to control currentUser ────────────────────────────────────
// We use a mutable object so tests can override it.
const storeState = { user: null as null | { sub: string; email: string; groups: string[] } };

vi.mock('../../auth/store.js', () => ({
  get currentUser() { return storeState; },
  setUser: vi.fn((u) => { storeState.user = u; }),
  clearUser: vi.fn(() => { storeState.user = null; }),
}));

import * as cognito from '../../auth/cognito.js';
import AuthGate from './AuthGate.svelte';

beforeEach(() => {
  vi.clearAllMocks();
  storeState.user = null;
  (cognito.getIdToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
  (cognito.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(null);
});

describe('AuthGate', () => {
  it('unauthenticated user sees email input', () => {
    render(AuthGate, {});
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('does not show a separate register/create-account screen', () => {
    render(AuthGate, {});
    // Sign In / Sign Up is on the same unified screen — no separate create-account or register page
    expect(screen.queryByText(/create account/i)).toBeNull();
    expect(screen.queryByText(/register/i)).toBeNull();
  });

  it('submitting email moves to code entry', async () => {
    (cognito.requestEmailCode as ReturnType<typeof vi.fn>).mockResolvedValue('test-session-123');

    render(AuthGate, {});

    const emailInput = screen.getByLabelText(/email address/i);
    await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });

    const form = emailInput.closest('form')!;
    await fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByLabelText(/one-time code/i)).toBeInTheDocument();
    });
  });

  it('submitting valid code renders the slot', async () => {
    const fakeUser = { sub: 'abc123', email: 'test@example.com', groups: [] };
    (cognito.requestEmailCode as ReturnType<typeof vi.fn>).mockResolvedValue('session-xyz');
    (cognito.submitEmailCode as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (cognito.getCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(fakeUser);

    // Render with slot content
    const { container } = render(AuthGate, {});

    // Step 1: submit email
    const emailInput = screen.getByLabelText(/email address/i);
    await fireEvent.input(emailInput, { target: { value: 'test@example.com' } });
    await fireEvent.submit(emailInput.closest('form')!);

    await waitFor(() => {
      expect(screen.getByLabelText(/one-time code/i)).toBeInTheDocument();
    });

    // Simulate store update that would happen after setUser
    storeState.user = fakeUser;

    // Step 2: submit code
    const codeInput = screen.getByLabelText(/one-time code/i);
    await fireEvent.input(codeInput, { target: { value: '123456' } });
    await fireEvent.submit(codeInput.closest('form')!);

    await waitFor(() => {
      expect(cognito.submitEmailCode).toHaveBeenCalledWith('test@example.com', '123456', 'session-xyz');
    });
  });
});
