<script lang="ts">
  interface Props {
    /** When set, embeds a <video>. When null/undefined, shows placeholder. */
    videoUrl?: string;
    caption?: string;
  }
  let { videoUrl, caption = 'AI avatar presentation — Dr. TJ (rendering pending)' }: Props = $props();

  let showTranscript = $state(false);

  const transcript = [
    "I'm Dr. TJ. If you're watching this, you already know something isn't right.",
    "You're tired in a way sleep doesn't fix. The focus you used to have is slipping. You're doing the things you were told to do — and it's not working.",
    "The problem was never your effort. It was the information.",
    "The 4M program — Mind, Muscle, Mitigate, Motivate — is four weeks of root-cause work. Daily practice. Real precision.",
    "This 3-minute intake is how we find out if you're a fit. Let's begin."
  ];

  function handlePlayClick() {
    if (videoUrl) return;
    showTranscript = !showTranscript;
  }
</script>

<div class="avatar-wrap" aria-label={caption}>
  {#if videoUrl}
    <video
      class="avatar-video"
      src={videoUrl}
      controls
      preload="metadata"
      aria-label="Dr. TJ AI avatar presentation"
    >
      <track kind="captions" />
    </video>
  {:else}
    <button
      type="button"
      class="avatar-placeholder"
      onclick={handlePlayClick}
      aria-label={showTranscript ? 'Hide intro transcript' : 'Show intro transcript'}
      aria-expanded={showTranscript}
    >
      <div class="play-btn" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="52" height="52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="23" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>
          {#if showTranscript}
            <rect x="17" y="15" width="5" height="18" fill="rgba(255,255,255,0.85)"/>
            <rect x="26" y="15" width="5" height="18" fill="rgba(255,255,255,0.85)"/>
          {:else}
            <polygon points="19,14 37,24 19,34" fill="rgba(255,255,255,0.85)"/>
          {/if}
        </svg>
      </div>
      <p class="avatar-caption">
        {showTranscript ? 'Tap to hide transcript' : 'Tap play for intro preview'}
      </p>
    </button>
    {#if showTranscript}
      <div class="transcript" role="region" aria-label="Dr. TJ intro transcript">
        {#each transcript as line}
          <p>{line}</p>
        {/each}
        <p class="transcript-note">Avatar video is in production. Transcript shown for preview.</p>
      </div>
    {/if}
  {/if}
</div>

<style>
  .avatar-wrap {
    width: 100%;
    max-width: 480px;
    margin: 0 auto;
    border-radius: 10px;
  }

  .avatar-video {
    width: 100%;
    display: block;
    border-radius: 10px;
  }

  .avatar-placeholder {
    width: 100%;
    aspect-ratio: 16 / 9;
    background: linear-gradient(135deg, #1a1e2e 0%, #12162a 100%);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    cursor: pointer;
    color: inherit;
    font: inherit;
    padding: 0;
    transition: background 0.15s, border-color 0.15s;
  }

  .avatar-placeholder:hover {
    border-color: rgba(255,255,255,0.25);
    background: linear-gradient(135deg, #1f2438 0%, #151a32 100%);
  }

  .avatar-placeholder:focus-visible {
    outline: 2px solid var(--accent, #4a9eff);
    outline-offset: 3px;
  }

  .play-btn {
    opacity: 0.85;
    transition: opacity 0.15s, transform 0.15s;
  }

  .avatar-placeholder:hover .play-btn {
    opacity: 1;
    transform: scale(1.05);
  }

  .avatar-caption {
    color: rgba(255,255,255,0.6);
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-align: center;
    margin: 0;
    padding: 0 16px;
  }

  .transcript {
    margin-top: 12px;
    padding: 16px 18px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .transcript p {
    margin: 0;
    color: rgba(232,234,240,0.92);
    font-size: 0.92rem;
    line-height: 1.55;
  }

  .transcript-note {
    color: rgba(255,255,255,0.45) !important;
    font-size: 0.75rem !important;
    font-style: italic;
    padding-top: 6px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
</style>
