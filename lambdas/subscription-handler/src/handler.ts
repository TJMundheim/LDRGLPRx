import { processEvent } from '@my4mlife/subscription-handler-core';

interface EventBridgeStripeEvent {
  id: string;
  'detail-type': string;
  detail: {
    id: string;
    type: string;
    livemode: boolean;
  };
}

// Thin EventBridge wrapper — all logic lives in subscription-handler-core.
// TODO: Wire EventBridge rule on partner bus (blocked on P2 partner bus setup).
// Rule should match detail-type: customer.subscription.created|updated|deleted
// Target DeadLetterConfig.Arn = my4mlife-stripe-events-dlq ARN (requires P5.1).
export const handler = async (event: EventBridgeStripeEvent): Promise<void> => {
  const { id, type, livemode } = event.detail;
  await processEvent({ id, type, livemode });
};
