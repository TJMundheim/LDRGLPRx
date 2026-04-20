<script lang="ts">
  interface Props {
    /** When set, embeds a <video>. When null/undefined, shows placeholder. */
    videoUrl?: string;
    caption?: string;
  }
  // TODO: wire HeyGen/Synthesia URL via videoUrl prop when avatar is rendered
  let { videoUrl, caption = 'AI avatar presentation — Dr. TJ (rendering pending)' }: Props = $props();
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
    <div class="avatar-placeholder" role="img" aria-label={caption}>
      <div class="play-btn" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="52" height="52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="23" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>
          <polygon points="19,14 37,24 19,34" fill="rgba(255,255,255,0.85)"/>
        </svg>
      </div>
      <p class="avatar-caption">{caption}</p>
    </div>
  {/if}
</div>

<style>
  .avatar-wrap {
    width: 100%;
    max-width: 480px;
    margin: 0 auto;
    border-radius: 10px;
    overflow: hidden;
  }

  .avatar-video {
    width: 100%;
    display: block;
    border-radius: 10px;
  }

  .avatar-placeholder {
    aspect-ratio: 16 / 9;
    background: linear-gradient(135deg, #1a1e2e 0%, #12162a 100%);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    cursor: default;
  }

  .play-btn {
    opacity: 0.8;
  }

  .avatar-caption {
    color: rgba(255,255,255,0.5);
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-align: center;
    margin: 0;
    padding: 0 16px;
  }
</style>
