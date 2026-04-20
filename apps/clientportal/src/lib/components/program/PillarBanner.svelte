<script lang="ts">
  import type { Pillar } from '../../content/pillars';

  interface Props {
    pillar: Pillar;
  }

  const { pillar }: Props = $props();
</script>

<div class="pillar-banner" style="--ac: #1D9E75;">
  <div class="numeral">{pillar.numeral}</div>
  <div class="body">
    <div class="week-label">Week {pillar.week}</div>
    <div class="name">{pillar.name}</div>
    <div class="tagline">{pillar.tagline}</div>
    <p class="description">{pillar.description}</p>
  </div>
</div>

<style>
  .pillar-banner {
    display: flex;
    gap: 1.25rem;
    align-items: flex-start;
    background: #0d1117;
    border: 1px solid #2a2a2a;
    border-left: 4px solid var(--ac);
    border-radius: 8px;
    padding: 1.25rem 1.5rem;
    color: #f0f0f0;
    font-family: inherit;
  }

  .numeral {
    font-size: 3rem;
    font-weight: 900;
    line-height: 1;
    color: var(--ac);
    letter-spacing: -0.02em;
    flex-shrink: 0;
    min-width: 3.5rem;
    text-align: right;
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .week-label {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #888;
  }

  .name {
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #fff;
    line-height: 1.1;
  }

  .tagline {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--ac);
    margin-top: 0.1rem;
  }

  .description {
    font-size: 0.85rem;
    color: #aaa;
    line-height: 1.55;
    margin: 0.4rem 0 0;
  }
</style>
