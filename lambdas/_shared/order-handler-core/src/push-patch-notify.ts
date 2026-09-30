// Fulfillment email for Genesis Push Patch orders (direct-buy, ships from Genesis).
// Catalog is an embedded copy of website/src/data/pushPatch.ts — keep in sync.
const BLENDS: Record<string, { name: string; formula: string }> = {
  'push-patch-nad-ghk': { name: 'NAD+ Restore', formula: 'NAD+ 1300 mg / GHK-Cu 5 mg' },
  'push-patch-bpc-nad-ghk': { name: 'Repair', formula: 'BPC-157 2000 mcg / NAD+ 250 mg / GHK-Cu 5 mg' },
  'push-patch-kpv-nad-ghk': { name: 'Calm Gut', formula: 'KPV 10 mg / NAD+ 250 mg / GHK-Cu 5 mg' },
  'push-patch-nad-motsc-ghk': { name: 'Metabolic', formula: 'NAD+ 1300 mg / MOTS-c 5 mg / GHK-Cu 5 mg' },
  'push-patch-enhanced-glow': { name: 'Enhanced Glow', formula: 'NAD+ 250 mg / TB-500 2 mg / BPC-157 2000 mcg / GHK-Cu 15 mg' },
  'push-patch-wolverine': { name: 'Wolverine', formula: 'NAD+ 250 mg / TB-500 2 mg / BPC-157 2000 mcg / GHK-Cu 5 mg' },
  'push-patch-glutathione-ghk': { name: 'Glutathione Glow', formula: 'Glutathione 500 mg / GHK-Cu 5 mg' },
};
const WEAR: Record<string, string> = { '12h': '12-hour (active)', '14h': '14-hour (sensitive skin)' };

const esc = (s: string): string =>
  s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string));

type PatchSession = {
  id: string;
  amount_total?: number | null;
  metadata?: Record<string, string> | null;
  customer_details?: { email?: string | null; name?: string | null; phone?: string | null } | null;
  shipping_details?: { name?: string | null; address?: Record<string, string | null> | null } | null;
};

export async function notifyPushPatchOrder(
  session: PatchSession,
  deps: { send: (payload: Record<string, unknown>) => Promise<void> },
): Promise<void> {
  const skuId = (session.metadata?.['skuIds'] ?? '').split(',')[0]?.trim() ?? '';
  const blend = BLENDS[skuId] ?? { name: skuId || 'Unknown blend', formula: '(unknown — check Stripe)' };
  const wear = WEAR[session.metadata?.['wear'] ?? ''] ?? `Unspecified (${session.metadata?.['wear'] ?? 'none'})`;
  const ship = session.shipping_details;
  const a = ship?.address ?? {};
  const address = [ship?.name, a['line1'], a['line2'], `${a['city'] ?? ''}, ${a['state'] ?? ''} ${a['postal_code'] ?? ''}`, a['country']]
    .filter(Boolean).map((l) => esc(String(l))).join('<br>');
  const cd = session.customer_details;
  const amount = `$${((session.amount_total ?? 0) / 100).toFixed(2)}`;
  await deps.send({
    kind: 'info',
    to: process.env['PUSH_PATCH_FULFILLMENT_EMAIL'] ?? 'drtj@my4mlife.com',
    subject: `New Push Patch order — ${blend.name} (${WEAR[session.metadata?.['wear'] ?? ''] ?? 'wear?'})`,
    html: `<p><strong>New Push Patch order — fulfill via Genesis</strong></p>
<p>Blend: ${esc(blend.name)}<br>Formula: ${esc(blend.formula)}<br>Wear time: ${esc(wear)}<br>Quantity: 6 patches (6 weeks)<br>Amount: ${amount}<br>Order/session: ${esc(session.id)}</p>
<p>Customer: ${esc(cd?.name ?? '')} ${esc(cd?.email ?? '')} ${esc(cd?.phone ?? '')}</p>
<p><strong>Ship to:</strong><br>${address || '(no shipping address on session — check Stripe dashboard)'}</p>`,
  });
}
