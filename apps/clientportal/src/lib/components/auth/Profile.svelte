<script lang="ts">
  import { currentUser, setUser, clearUser } from '../../auth/store.svelte.js';
  import { updatePrimaryEmail, getCurrentUser, signOut } from '../../auth/cognito.js';
  import { updateSecondaryEmail } from '../../api/operations.js';

  // Primary email change flow
  let changingPrimary = $state(false);
  let newPrimaryEmail = $state('');
  let verificationCode = $state('');
  let awaitingVerification = $state(false);
  let primaryError = $state('');
  let primarySuccess = $state('');

  // Secondary email
  let secondaryEmailInput = $state('');
  let secondaryError = $state('');
  let secondarySuccess = $state('');

  async function submitNewPrimaryEmail(e: SubmitEvent) {
    e.preventDefault();
    primaryError = '';
    primarySuccess = '';
    try {
      await updatePrimaryEmail(newPrimaryEmail.trim());
      awaitingVerification = true;
    } catch (err) {
      primaryError = err instanceof Error ? err.message : 'Failed to update email.';
    }
  }

  async function submitPrimaryVerification(e: SubmitEvent) {
    e.preventDefault();
    primaryError = '';
    try {
      await updatePrimaryEmail(newPrimaryEmail.trim(), verificationCode.trim());
      // Re-hydrate user from token
      const updated = getCurrentUser();
      if (updated) setUser(updated);
      primarySuccess = 'Primary email updated.';
      changingPrimary = false;
      awaitingVerification = false;
      newPrimaryEmail = '';
      verificationCode = '';
    } catch (err) {
      primaryError = err instanceof Error ? err.message : 'Invalid verification code.';
    }
  }

  async function saveSecondaryEmail(e: SubmitEvent) {
    e.preventDefault();
    secondaryError = '';
    secondarySuccess = '';
    try {
      await updateSecondaryEmail(secondaryEmailInput.trim() || null);
      secondarySuccess = 'Secondary email saved.';
    } catch (err) {
      secondaryError = err instanceof Error ? err.message : 'Failed to save secondary email.';
    }
  }

  function handleSignOut() {
    signOut();
    clearUser();
  }
</script>

<div class="profile">
  <h2>Profile</h2>

  {#if currentUser.value}
    <section>
      <p class="field-label">Primary Email</p>
      <p class="field-value">{currentUser.value.email}</p>
      {#if !changingPrimary}
        <button type="button" onclick={() => { changingPrimary = true; primaryError = ''; primarySuccess = ''; }}>
          Change email
        </button>
        {#if primarySuccess}<p class="success">{primarySuccess}</p>{/if}
      {:else if !awaitingVerification}
        <form onsubmit={submitNewPrimaryEmail}>
          <label for="new-primary-email">New email address</label>
          <input id="new-primary-email" type="email" bind:value={newPrimaryEmail} required />
          {#if primaryError}<p class="error">{primaryError}</p>{/if}
          <button type="submit">Send verification code</button>
          <button type="button" onclick={() => { changingPrimary = false; }}>Cancel</button>
        </form>
      {:else}
        <form onsubmit={submitPrimaryVerification}>
          <label for="verify-code">Verification code sent to {newPrimaryEmail}</label>
          <input id="verify-code" type="text" bind:value={verificationCode} required />
          {#if primaryError}<p class="error">{primaryError}</p>{/if}
          <button type="submit">Verify</button>
          <button type="button" onclick={() => { awaitingVerification = false; }}>Back</button>
        </form>
      {/if}
    </section>

    <section>
      <form onsubmit={saveSecondaryEmail}>
        <label for="secondary-email">Secondary Email (optional, notifications only)</label>
        <input id="secondary-email" type="email" bind:value={secondaryEmailInput} placeholder="backup@example.com" />
        {#if secondaryError}<p class="error">{secondaryError}</p>{/if}
        {#if secondarySuccess}<p class="success">{secondarySuccess}</p>{/if}
        <button type="submit">Save Secondary Email</button>
      </form>
    </section>

    <section>
      <button type="button" class="signout-btn" onclick={handleSignOut}>Sign Out</button>
    </section>
  {/if}
</div>

<style>
  .profile { max-width: 480px; margin: 40px auto; padding: 0 16px; }
  h2 { font-size: 1.4rem; margin-bottom: 24px; }
  section { margin-bottom: 32px; padding-bottom: 32px; border-bottom: 1px solid #eee; }
  section:last-child { border-bottom: none; }
  .field-label { font-size: 0.8rem; font-weight: 600; color: var(--mc-faint); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px; }
  .field-value { font-size: 1rem; color: var(--mc-ink); margin: 0 0 12px; }
  label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; color: var(--mc-ink); }
  input {
    width: 100%;
    box-sizing: border-box;
    padding: 9px 12px;
    border: 1px solid #d0d5dd;
    border-radius: 8px;
    font-size: 1rem;
    outline: none;
  }
  input:focus { border-color: var(--mc-good-bright); }
  button {
    margin-top: 10px;
    margin-right: 8px;
    padding: 8px 16px;
    background: var(--mc-good-bright);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }
  button[type="button"]:not(.signout-btn) { background: #e8f5ef; color: var(--mc-good-bright); }
  .signout-btn { background: #f5e8e8; color: var(--mc-crit-bright); }
  .error { color: var(--mc-crit-bright); font-size: 0.85rem; margin: 6px 0 0; }
  .success { color: var(--mc-good-bright); font-size: 0.85rem; margin: 6px 0 0; }
</style>
