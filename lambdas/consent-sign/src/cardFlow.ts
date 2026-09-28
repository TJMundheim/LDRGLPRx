// Orchestration for the card step: open a SetupIntent, or verify and store the
// one the browser just confirmed. Keeps handler.ts thin.
import { getEncounter, readCardOnFile, writeCardOnFile, writeCardAudit } from './store';
import { createSetupSession, confirmSavedCard } from './stripeSetup';
import { renderCardStep, renderCardError, renderDone, productLine } from './card';
import { sendMail, NOTIFY_TO } from './mail';

export interface CardCtx {
  contactId: string;
  encounterId: string;
  name: string;
  email: string;
  query: string;
  record: Record<string, any>;
}

async function laneOf(ctx: CardCtx): Promise<{ laneLabel?: string; priceCents?: number }> {
  const enc = await getEncounter(ctx.contactId, ctx.encounterId);
  const laneLabel = typeof enc?.laneLabel === 'string' ? enc.laneLabel : undefined;
  const priceCents = typeof enc?.priceCents === 'number' ? enc.priceCents : undefined;
  return { laneLabel, priceCents };
}

/** GET (or post-sign) — render step 2 with a fresh SetupIntent. */
export async function showCardStep(ctx: CardCtx): Promise<string> {
  const { laneLabel, priceCents } = await laneOf(ctx);
  const session = await createSetupSession({
    contactId: ctx.contactId,
    encounterId: ctx.encounterId,
    email: ctx.email,
    name: ctx.name,
    existingCustomerId: readCardOnFile(ctx.record).stripeCustomerId,
  });
  return renderCardStep({
    laneLabel, priceCents, query: ctx.query,
    clientSecret: session.clientSecret, publishableKey: session.publishableKey,
  });
}

/** POST ?step=card — verify with Stripe, then persist. */
export async function saveCard(ctx: CardCtx, setupIntentId: string): Promise<string> {
  if (!setupIntentId) return renderCardError(ctx.query, 'No card was submitted.');

  const card = await confirmSavedCard(setupIntentId, ctx.contactId);
  if (!card) return renderCardError(ctx.query, 'That card was not confirmed. Please try again.');

  const savedAt = new Date().toISOString();
  await writeCardOnFile(ctx.contactId, { ...card, savedAt });
  await writeCardAudit(ctx.contactId, ctx.encounterId, savedAt, card.brand, card.last4);

  const { laneLabel, priceCents } = await laneOf(ctx);
  const line = productLine(laneLabel, priceCents);
  const tail = card.last4 ? ` ${card.brand ?? 'card'} ····${card.last4}` : '';
  await sendMail(
    NOTIFY_TO,
    `[Card saved] ${ctx.name} — ${laneLabel ?? 'prescription'}`,
    `<p>${ctx.name} (${ctx.email}) saved a card on ${savedAt}.</p><p>${line}${tail}</p><p>Encounter: ${ctx.encounterId}</p>`,
    `${ctx.name} (${ctx.email}) saved a card on ${savedAt}. ${line}${tail}. Encounter: ${ctx.encounterId}`,
  );

  return renderDone(card.brand, card.last4);
}
