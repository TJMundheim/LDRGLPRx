<script lang="ts">
  /**
   * One-time onboarding modal that asks the user to pick an eating window.
   * Shown by App.svelte when `profile.eatingWindowStart == null`.
   *
   * No skip option. The recommended default (9–6) is preselected, so a
   * single tap on "Save and continue" completes onboarding.
   */
  import EatingWindowPicker from './EatingWindowPicker.svelte';

  interface Props {
    onSaved: (start: string, end: string) => void | Promise<void>;
  }
  let { onSaved }: Props = $props();
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="ewm-title">
  <div class="card">
    <h2 id="ewm-title">Set your eating window</h2>
    <p class="sub">We recommend 9 AM to 6 PM. You can change this anytime in Settings.</p>
    <EatingWindowPicker submitLabel="Save and continue" onSave={onSaved} />
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0;
    background: rgba(8, 12, 20, 0.78);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 10000;
    padding: 20px;
  }
  .card {
    background: #0f1117;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 28px 28px 24px;
    width: 100%;
    max-width: 440px;
    box-shadow: 0 12px 48px rgba(0,0,0,0.5);
  }
  h2 {
    margin: 0 0 6px;
    font-size: 1.3rem;
    color: #e8eaf0;
    font-weight: 700;
    letter-spacing: 0.01em;
  }
  .sub {
    margin: 0 0 20px;
    font-size: 0.9rem;
    color: #9ba3b2;
    line-height: 1.5;
  }
</style>
