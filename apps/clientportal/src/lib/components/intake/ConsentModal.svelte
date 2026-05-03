<script lang="ts">
  // Used at consult-booking time for HIPAA-grade consent capture. Not wired during Protégé sign-up (app-only flow needs only lightweight TOS/Privacy acknowledgement).
  /**
   * ConsentModal — scrollable overlay showing full legal document text.
   * Emits `onClose` when dismissed. Parent tracks whether it was opened.
   */
  interface Props {
    title: string;
    text: string;
    onClose: () => void;
  }
  let { title, text, onClose }: Props = $props();

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') onClose();
  }

  function handleBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={handleBackdrop} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">
  <div class="modal-panel">
    <div class="modal-header">
      <h2 id="modal-title">{title}</h2>
      <button class="close-btn" onclick={onClose} aria-label="Close document">✕</button>
    </div>
    <div class="modal-body" role="document">
      <pre class="doc-text">{text}</pre>
    </div>
    <div class="modal-footer">
      <button class="btn-done" onclick={onClose}>Close</button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.72);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .modal-panel {
    background: #1a1f2e;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    width: 100%;
    max-width: 680px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0,0,0,0.6);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 22px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
  }

  h2 {
    font-size: 1rem;
    font-weight: 700;
    color: #e8eaf0;
    margin: 0;
    line-height: 1.3;
    flex: 1;
    padding-right: 12px;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: #9ba3b2;
    font-size: 1.1rem;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    flex-shrink: 0;
    transition: color 0.15s, background 0.15s;
  }

  .close-btn:hover {
    color: #e8eaf0;
    background: rgba(255,255,255,0.07);
  }

  .close-btn:focus-visible {
    outline: 2px solid #1D9E75;
    outline-offset: 2px;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px 22px;
    overscroll-behavior: contain;
  }

  .modal-body:focus-visible {
    outline: 2px solid #1D9E75;
    outline-offset: -2px;
  }

  .doc-text {
    font-family: inherit;
    font-size: 0.82rem;
    color: #c8cdd8;
    line-height: 1.75;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
  }

  .modal-footer {
    padding: 14px 22px 18px;
    border-top: 1px solid rgba(255,255,255,0.08);
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  .btn-done {
    background: #1D9E75;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 24px;
    font-size: 0.92rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-done:hover { background: #17875F; }
  .btn-done:focus-visible { outline: 2px solid #1D9E75; outline-offset: 3px; }
</style>
