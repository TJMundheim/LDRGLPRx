<script lang="ts">
  import { readAuditRecap, type AuditRecap } from '../auth/auditRecap';

  const recap: AuditRecap | null = readAuditRecap();

  const CATEGORIES: { slug: string; label: string; blurb: string }[] = [
    { slug: 'gut',                   label: 'Gut Health',         blurb: 'Leaky gut, bloat, food sensitivity' },
    { slug: 'sleep',                 label: 'Sleep',              blurb: 'Deep sleep, recovery, circadian rhythm' },
    { slug: 'weight',                label: 'Weight',             blurb: 'GLP-1, body composition, BMI' },
    { slug: 'nutrition',             label: 'Nutrition',          blurb: 'Diet quality, eliminations, fuel' },
    { slug: 'erectile-dysfunction',  label: 'Sexual Function',    blurb: 'Erectile + libido optimization' },
    { slug: 'environment',           label: 'Environment',        blurb: 'Light, air, water, EMF, grounding' },
    { slug: 'cognitive',             label: 'Cognitive',          blurb: 'Brain fog, focus, memory' },
    { slug: 'hormones',              label: 'Hormones / TRT',     blurb: 'Testosterone, vitality, drive' },
  ];

  const MARKETING = 'https://my4mlife.com';
</script>

<div class="gate">
  <header class="gate-head">
    <h1>Welcome to My4MLife</h1>
    <p class="tag">Begin with the end in mind.</p>
  </header>

  {#if recap && recap.top3 && recap.top3.length > 0}
    <section class="priorities">
      <h2>Your top priorities</h2>
      <p class="sub">From your personalized assessment — these are the categories with the highest opportunity for you.</p>
      <div class="priority-grid">
        {#each recap.top3 as p (p.slug)}
          <a class="priority-card" href={`${MARKETING}/solutions/${p.slug}`} target="_blank" rel="noopener">
            <div class="priority-label">{p.label}</div>
            <div class="priority-score">Score: {p.score}</div>
            {#if p.description}<div class="priority-desc">{p.description}</div>{/if}
            <div class="priority-cta">Explore solution →</div>
          </a>
        {/each}
      </div>
    </section>
  {:else}
    <section class="priorities no-recap">
      <h2>Haven't taken the personalized assessment yet?</h2>
      <p class="sub">
        The 10-question assessment pinpoints where to start. <a href={`${MARKETING}/assessment`} target="_blank" rel="noopener">Take the assessment →</a>
      </p>
    </section>
  {/if}

  <section class="locked">
    <div class="lock-icon" aria-hidden="true">🔒</div>
    <h2>The 4M App unlocks with any purchase</h2>
    <p>
      Even our smallest SKU includes full app access for as long as you remain a member —
      Week 1 protocol, daily routines, nudges, supplement tracking, and progress charts.
    </p>
  </section>

  <section class="tiles">
    <h3>Recommended starting points</h3>
    <div class="tile-grid">
      {#each CATEGORIES as c (c.slug)}
        <a class="tile" href={`${MARKETING}/solutions/${c.slug}`} target="_blank" rel="noopener">
          <div class="tile-label">{c.label}</div>
          <div class="tile-blurb">{c.blurb}</div>
        </a>
      {/each}
    </div>
  </section>

  <footer class="gate-foot">
    <p>Your account is saved. Once you make a purchase, log back in and the full app unlocks.</p>
  </footer>
</div>

<style>
  .gate {
    max-width: 920px;
    margin: 0 auto;
    padding: 48px 24px 80px;
    color: #2e2a24;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .gate-head { text-align: center; margin-bottom: 36px; }
  .gate-head h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 40px; font-weight: 700; margin: 0 0 8px; color: #1f1b14;
    letter-spacing: -0.01em;
  }
  .tag { font-style: italic; color: #7a6e5a; margin: 0; font-size: 16px; }

  section { background: #fbf6ec; border: 1px solid #e6dcc4; border-radius: 12px; padding: 28px; margin-bottom: 24px; }
  section h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 24px; font-weight: 600; margin: 0 0 8px; color: #2e2a24;
  }
  section h3 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 20px; font-weight: 600; margin: 0 0 16px; color: #2e2a24;
  }
  .sub { color: #6b6253; margin: 0 0 18px; font-size: 14px; }
  .sub a { color: #1D9E75; font-weight: 600; }

  .priority-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
  .priority-card {
    background: #fffdf7; border: 1px solid #e6dcc4; border-radius: 10px; padding: 16px;
    text-decoration: none; color: inherit; transition: transform .15s, border-color .15s;
  }
  .priority-card:hover { transform: translateY(-2px); border-color: #1D9E75; }
  .priority-label { font-weight: 700; font-size: 15px; color: #1f1b14; }
  .priority-score { font-size: 12px; color: #7a6e5a; margin-top: 2px; }
  .priority-desc { font-size: 13px; color: #4a4338; margin-top: 8px; line-height: 1.5; }
  .priority-cta { font-size: 12px; color: #1D9E75; font-weight: 700; margin-top: 10px; }

  .locked { text-align: center; background: #f5ebd5; border-color: #d8c896; }
  .lock-icon { font-size: 32px; margin-bottom: 8px; }
  .locked p { color: #5a503e; font-size: 15px; line-height: 1.6; margin: 0 auto; max-width: 560px; }

  .tile-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .tile {
    background: #fffdf7; border: 1px solid #e6dcc4; border-radius: 10px; padding: 14px;
    text-decoration: none; color: inherit; transition: transform .15s, border-color .15s, background .15s;
  }
  .tile:hover { transform: translateY(-2px); border-color: #1D9E75; background: #f7f1df; }
  .tile-label { font-weight: 700; font-size: 14px; color: #1f1b14; }
  .tile-blurb { font-size: 12px; color: #6b6253; margin-top: 4px; line-height: 1.4; }

  .gate-foot { text-align: center; padding: 16px; color: #7a6e5a; font-size: 13px; }
  .gate-foot p { margin: 0; }
</style>
