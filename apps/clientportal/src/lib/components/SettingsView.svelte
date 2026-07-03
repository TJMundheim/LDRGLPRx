<script lang="ts">
  /**
   * Settings page. Reachable from the sidebar via portalAction('goTo', 'settings').
   *
   * Sections:
   *   1. Account — email (read-only) + Sign Out.
   *   2. Eating window — picker with current value preselected.
   *   3. Bonus targets — toggle for profile.bonusTargetsEnabled.
   */
  import EatingWindowPicker from './EatingWindowPicker.svelte';
  import { signOut } from '../auth/cognito.js';
  import { clearUser } from '../auth/store.svelte.js';
  import { upsertMyProfile } from '../api/operations';

  interface Props {
    email: string | null;
    eatingWindowStart: string | null;
    eatingWindowEnd: string | null;
    bonusTargetsEnabled: boolean;
    onUpdated: (patch: {
      eatingWindowStart?: string;
      eatingWindowEnd?: string;
      bonusTargetsEnabled?: boolean;
    }) => void;
  }

  let { email, eatingWindowStart, eatingWindowEnd, bonusTargetsEnabled, onUpdated }: Props = $props();

  let bonusOn = $state(bonusTargetsEnabled);
  let bonusSaving = $state(false);
  let savedMsg = $state('');

  function handleSignOut(): void {
    signOut();
    clearUser();
  }

  async function saveEatingWindow(start: string, end: string): Promise<void> {
    await upsertMyProfile({ eatingWindowStart: start, eatingWindowEnd: end });
    onUpdated({ eatingWindowStart: start, eatingWindowEnd: end });
    savedMsg = 'Eating window saved.';
    setTimeout(() => { savedMsg = ''; }, 2200);
  }

  async function toggleBonus(): Promise<void> {
    const next = !bonusOn;
    bonusSaving = true;
    try {
      await upsertMyProfile({ bonusTargetsEnabled: next });
      bonusOn = next;
      onUpdated({ bonusTargetsEnabled: next });
    } catch (e) {
      console.warn('[settings] bonus toggle failed', e);
    } finally {
      bonusSaving = false;
    }
  }
</script>

<div class="settings">
  <h1>Settings</h1>

  <section class="card">
    <h2>Account</h2>
    <div class="row">
      <span class="label">Email</span>
      <span class="value">{email ?? '—'}</span>
    </div>
    <button class="signout" onclick={handleSignOut}>Sign Out</button>
  </section>

  <section class="card">
    <h2>Eating window</h2>
    <p class="sub">Your daily eating window anchors the Today view. Adjust anytime.</p>
    <EatingWindowPicker
      initialStart={eatingWindowStart}
      initialEnd={eatingWindowEnd}
      submitLabel="Save eating window"
      onSave={saveEatingWindow}
    />
    {#if savedMsg}<div class="ok">{savedMsg}</div>{/if}
  </section>

  <section class="card">
    <h2>Bonus targets</h2>
    <div class="toggle-row">
      <div>
        <div class="toggle-label">Show me bonus daily targets</div>
        <div class="toggle-sub">Adds cold shower and 10,000 steps to your daily list. Off by default.</div>
      </div>
      <button
        class="toggle"
        class:on={bonusOn}
        onclick={toggleBonus}
        disabled={bonusSaving}
        role="switch"
        aria-checked={bonusOn}
        aria-label="Show bonus daily targets"
      >
        <span class="knob"></span>
      </button>
    </div>
  </section>
</div>

<style>
  .settings {
    max-width: 640px;
    margin: 0 auto;
    padding: 32px 24px 80px;
    display: flex; flex-direction: column; gap: 24px;
  }
  h1 {
    margin: 0;
    color: #e8eaf0;
    font-size: 1.7rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }
  .card {
    background: #0f1117;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 22px 22px 24px;
    display: flex; flex-direction: column; gap: 14px;
  }
  h2 {
    margin: 0;
    color: #e8eaf0;
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .sub {
    margin: -6px 0 0;
    font-size: 0.85rem;
    color: #9ba3b2;
    line-height: 1.5;
  }
  .row {
    display: flex; justify-content: space-between; align-items: baseline;
    padding: 4px 0;
  }
  .label {
    font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase; color: #9ba3b2;
  }
  .value { color: #e8eaf0; font-size: 0.95rem; }
  .signout {
    align-self: flex-start;
    background: transparent;
    border: 1px solid rgba(224, 92, 42, 0.6);
    color: var(--mc-crit-b);
    padding: 9px 16px;
    border-radius: 8px;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s;
  }
  .signout:hover { background: rgba(224, 92, 42, 0.1); }
  .ok { color: var(--mc-good-bright); font-size: 0.85rem; }

  .toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px;
  }
  .toggle-label { color: #e8eaf0; font-size: 0.95rem; font-weight: 600; }
  .toggle-sub { color: #9ba3b2; font-size: 0.8rem; margin-top: 4px; line-height: 1.5; }
  .toggle {
    width: 48px; height: 28px;
    border-radius: 999px;
    background: rgba(255,255,255,0.12);
    border: none;
    position: relative;
    cursor: pointer;
    transition: background 0.18s;
    flex-shrink: 0;
    padding: 0;
  }
  .toggle .knob {
    position: absolute;
    top: 3px; left: 3px;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: var(--mc-panel-2);
    transition: transform 0.18s;
  }
  .toggle.on { background: var(--mc-good-bright); }
  .toggle.on .knob { transform: translateX(20px); }
  .toggle:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
