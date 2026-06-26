/**
 * AdminDashboard — Cognito group gating tests.
 *
 * Tests:
 *   1. Non-admin user sees 403 Forbidden component.
 *   2. Admin user sees admin content (operations are mocked).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';

// ── Mock auth store ─────────────────────────────────────────────────────────
// currentUser has a `.value` getter — mirror that shape.
let mockUserValue: null | { sub: string; email: string; groups: string[] } = null;

vi.mock('../../auth/store.svelte.js', () => ({
  get currentUser() {
    return {
      get value() { return mockUserValue; },
    };
  },
  setUser: vi.fn(),
  clearUser: vi.fn(),
}));

// ── Mock admin operations ───────────────────────────────────────────────────
vi.mock('../../api/operations.js', () => ({
  adminListUsers: vi.fn().mockResolvedValue({
    adminListUsers: { items: [{ id: 'u1', primaryEmail: 'a@b.com', groups: [] }], nextToken: null },
  }),
  adminListOutcomes: vi.fn().mockResolvedValue({
    adminListOutcomes: { items: [{ id: 'o1', owner: 'u1' }], nextToken: null },
  }),
  listProteges: vi.fn().mockResolvedValue({
    listProteges: { items: [], nextToken: null },
  }),
  listEventsAdmin: vi.fn().mockResolvedValue({
    listEventsAdmin: [],
  }),
  listPatientRecordsAdmin: vi.fn().mockResolvedValue({
    listPatientRecordsAdmin: [],
  }),
}));

import AdminDashboard from './AdminDashboard.svelte';
import * as ops from '../../api/operations.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockUserValue = null;
  // Restore default resolved values after clearAllMocks
  (ops.adminListUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
    adminListUsers: { items: [{ id: 'u1', primaryEmail: 'a@b.com' }], nextToken: null },
  });
  (ops.adminListOutcomes as ReturnType<typeof vi.fn>).mockResolvedValue({
    adminListOutcomes: { items: [{ id: 'o1', owner: 'u1' }], nextToken: null },
  });
  (ops.listProteges as ReturnType<typeof vi.fn>).mockResolvedValue({
    listProteges: { items: [], nextToken: null },
  });
  (ops.listEventsAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({
    listEventsAdmin: [],
  });
  (ops.listPatientRecordsAdmin as ReturnType<typeof vi.fn>).mockResolvedValue({
    listPatientRecordsAdmin: [],
  });
});

describe('AdminDashboard group gating', () => {
  it('renders 403 when user has no Admins group', async () => {
    mockUserValue = { sub: 'x', email: 'user@test.com', groups: [] };

    render(AdminDashboard, {});

    await waitFor(() => {
      expect(screen.getByText('403')).toBeInTheDocument();
      expect(screen.getByText(/admins only/i)).toBeInTheDocument();
    });

    expect(ops.adminListUsers).not.toHaveBeenCalled();
    expect(ops.adminListOutcomes).not.toHaveBeenCalled();
  });

  it('renders 403 when user is null', async () => {
    mockUserValue = null;

    render(AdminDashboard, {});

    await waitFor(() => {
      expect(screen.getByText('403')).toBeInTheDocument();
    });
  });

  it('renders admin content when user has Admins group', async () => {
    mockUserValue = { sub: 'admin1', email: 'admin@test.com', groups: ['Admins'] };

    render(AdminDashboard, {});

    await waitFor(() => {
      // The dashboard renders a tab button for each admin section.
      // Target buttons specifically — panel content can also contain these words.
      expect(screen.getByRole('button', { name: /prot/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /events/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /patients/i })).toBeInTheDocument();
    });
  });
});
