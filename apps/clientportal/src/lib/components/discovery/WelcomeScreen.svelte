<script lang="ts">
  import AvatarPlaceholder from './AvatarPlaceholder.svelte';

  interface Props {
    onStart: () => void;
    /** Optional HeyGen/Synthesia video URL — null shows placeholder */
    videoUrl?: string;
  }
  let { onStart, videoUrl }: Props = $props();
</script>

<section class="welcome" aria-labelledby="welcome-headline">
  <div class="welcome-inner">

    <div class="badge">4M PROGRAM</div>

    <h1 id="welcome-headline" class="headline">
      What if everything you've tried<br>
      was solving the wrong problem?
    </h1>

    <p class="subhead">
      A brain optimization program built on the four pillars: Mind, Muscle, Mitigate, Motivate.<br>
      <span class="subhead-quiet">Root cause. Daily practice. Brain-first.</span>
    </p>

    <div class="avatar-block">
      <AvatarPlaceholder {videoUrl} />
    </div>

    <div class="truth-block" aria-label="Does this sound familiar?">
      <p class="truth-intro">Before we start — does any of this sound familiar?</p>
      <ul class="truth-list" role="list">
        <li>You wake up tired. Not one-more-coffee tired — the kind that doesn't go away.</li>
        <li>Brain fog that never fully lifts.</li>
        <li>You hit a wall at 2pm and can't find the word you've used a thousand times.</li>
        <li>Energy that quits before your day does.</li>
        <li>The sense that you're slower than you used to be — and nobody has a real answer.</li>
      </ul>
      <p class="truth-note">
        The problem was never your effort.<br>
        It was the information. The system gave you symptoms — and never showed you the root cause.
      </p>
    </div>

    <div class="not-your-fault">
      <p class="nyf-headline">This is not your fault.</p>
      <p class="nyf-body">
        You didn't fail. You were failed — by an industry that profits from your confusion
        and a medical system designed to treat disease, not build performance.
      </p>
    </div>

    <div class="cta-block">
      <p class="cta-time">3 minutes · No account required · Results instantly</p>
      <button
        class="btn-primary"
        onclick={onStart}
        aria-describedby="cta-description"
      >
        Start your 3-minute intake
      </button>
      <p class="cta-description" id="cta-description">
        Your answers drive a personalized protocol — not a generic quiz.
        Your responses guide your weekly focus.
      </p>
    </div>

  </div>
</section>

<style>
  .welcome {
    min-height: 100vh;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 48px 20px 64px;
    background: var(--bg, #0f1117);
  }

  .welcome-inner {
    max-width: 640px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .badge {
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent, #4a9eff);
    font-weight: 600;
  }

  .headline {
    font-size: clamp(1.65rem, 4vw, 2.4rem);
    font-weight: 700;
    line-height: 1.2;
    color: var(--text, #e8eaf0);
    margin: 0;
  }

  .subhead {
    font-size: 1.05rem;
    color: var(--text-muted, #9ba3b2);
    line-height: 1.6;
    margin: 0;
  }

  .subhead-quiet {
    font-size: 0.9rem;
    opacity: 0.75;
  }

  .avatar-block {
    border-radius: 10px;
    overflow: hidden;
  }

  .truth-block {
    background: var(--card-bg, #161a26);
    border: 1px solid var(--border, rgba(255,255,255,0.08));
    border-radius: 10px;
    padding: 24px 28px;
  }

  .truth-intro {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted, #9ba3b2);
    margin: 0 0 14px;
  }

  .truth-list {
    list-style: none;
    padding: 0;
    margin: 0 0 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .truth-list li {
    padding-left: 20px;
    position: relative;
    color: var(--text, #e8eaf0);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .truth-list li::before {
    content: '→';
    position: absolute;
    left: 0;
    color: var(--accent, #4a9eff);
  }

  .truth-note {
    color: var(--text-muted, #9ba3b2);
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0;
    font-style: italic;
  }

  .not-your-fault {
    border-left: 3px solid var(--accent, #4a9eff);
    padding: 12px 20px;
  }

  .nyf-headline {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text, #e8eaf0);
    margin: 0 0 8px;
  }

  .nyf-body {
    color: var(--text-muted, #9ba3b2);
    font-size: 0.95rem;
    line-height: 1.6;
    margin: 0;
  }

  .cta-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
  }

  .cta-time {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted, #9ba3b2);
    margin: 0;
  }

  .btn-primary {
    background: var(--accent, #4a9eff);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 14px 36px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    letter-spacing: 0.02em;
    transition: background 0.15s;
  }

  .btn-primary:hover {
    background: #3a8fe8;
  }

  .btn-primary:focus-visible {
    outline: 2px solid var(--accent, #4a9eff);
    outline-offset: 3px;
  }

  .cta-description {
    color: var(--text-muted, #9ba3b2);
    font-size: 0.82rem;
    line-height: 1.5;
    margin: 0;
    max-width: 400px;
  }
</style>
