<script lang="ts">
  import { membershipTiers } from '../../content/tiers';

  // Deduplicate all features across membership tiers into a flat list
  const allFeatures = $derived((): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const tier of membershipTiers) {
      for (const f of tier.features) {
        // Normalise "Everything in X" rows out of deduped list — show as tier row indicator instead
        if (f.toLowerCase().startsWith('everything in')) continue;
        if (!seen.has(f)) {
          seen.add(f);
          result.push(f);
        }
      }
    }
    return result;
  });

  function tierHasFeature(tierId: string, feature: string): boolean {
    const tier = membershipTiers.find(t => t.id === tierId);
    if (!tier) return false;
    // Direct match
    if (tier.features.includes(feature)) return true;
    // "Everything in X" inheritance — find the parent and check recursively
    for (const f of tier.features) {
      if (f.toLowerCase().startsWith('everything in ')) {
        const parentName = f.replace(/^everything in /i, '').trim();
        const parentTier = membershipTiers.find(t => t.name.toLowerCase() === parentName.toLowerCase());
        if (parentTier && tierHasFeature(parentTier.id, feature)) return true;
      }
    }
    return false;
  }
</script>

<div class="table-wrap" role="region" aria-label="Membership tier feature comparison">
  <table class="comparison-table">
    <thead>
      <tr>
        <th scope="col" class="feature-col">Feature</th>
        {#each membershipTiers as tier}
          <th scope="col" class="tier-col">{tier.name}</th>
        {/each}
      </tr>
      <tr class="price-row">
        <td class="feature-col price-label">Starting price</td>
        {#each membershipTiers as tier}
          <td class="tier-col">
            {#if tier.monthlyUSD === 0}
              <span class="price-free">Free</span>
            {:else if tier.monthlyUSD !== undefined}
              <span class="price-val">${tier.monthlyUSD}/mo</span>
            {/if}
          </td>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each allFeatures() as feature}
        <tr>
          <td class="feature-col feature-text">{feature}</td>
          {#each membershipTiers as tier}
            <td class="tier-col check-cell">
              {#if tierHasFeature(tier.id, feature)}
                <span class="check-mark" aria-label="Included">✓</span>
              {:else}
                <span class="no-mark" aria-label="Not included">—</span>
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .table-wrap {
    overflow-x: auto;
    border-radius: 12px;
    border: 1px solid #D8E8DC;
    -webkit-overflow-scrolling: touch;
  }

  .table-wrap:focus-visible {
    outline: 2px solid #1D9E75;
    outline-offset: 2px;
  }

  .comparison-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
    min-width: 640px;
  }

  thead {
    background: #F0F8F2;
  }

  .feature-col {
    min-width: 200px;
    text-align: left;
    padding: 12px 16px;
    font-weight: 700;
    color: #1A2E1E;
    border-bottom: 1.5px solid #D8E8DC;
    vertical-align: middle;
    position: sticky;
    left: 0;
    background: inherit;
  }

  .tier-col {
    min-width: 110px;
    text-align: center;
    padding: 12px 10px;
    font-weight: 700;
    color: #1A2E1E;
    border-bottom: 1.5px solid #D8E8DC;
    border-left: 1px solid #E8F0E8;
    vertical-align: middle;
  }

  .price-row .feature-col,
  .price-row .tier-col {
    background: #F7FBF7;
    border-bottom: 1.5px solid #D8E8DC;
    font-weight: 500;
    color: #5A7A5E;
  }

  .price-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #7A9A7E;
    font-weight: 700;
  }

  .price-free {
    color: #1D9E75;
    font-weight: 700;
    font-size: 0.85rem;
  }

  .price-val {
    color: #1D9E75;
    font-weight: 700;
    font-size: 0.85rem;
  }

  tbody tr {
    border-bottom: 1px solid #EAF2EA;
  }

  tbody tr:last-child {
    border-bottom: none;
  }

  tbody tr:hover {
    background: #F7FBF7;
  }

  tbody tr:hover .feature-col {
    background: #F7FBF7;
  }

  .feature-text {
    color: #3A5A44;
    font-weight: 500;
    line-height: 1.4;
  }

  .check-cell {
    text-align: center;
    vertical-align: middle;
  }

  .check-mark {
    color: #1D9E75;
    font-weight: 700;
    font-size: 0.95rem;
  }

  .no-mark {
    color: #C8DCC8;
    font-size: 0.85rem;
  }
</style>
