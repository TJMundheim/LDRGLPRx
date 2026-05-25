import { processEvent } from '@my4mlife/refund-dispute-handler-core';

interface EventBridgeEvent {
  id: string;
  'detail-type': string;
  detail: {
    id: string;
    type?: string;
    livemode: boolean;
  };
}

export const handler = async (event: EventBridgeEvent): Promise<void> => {
  const { id, livemode } = event.detail;
  // detail-type is the Stripe event type (e.g. "charge.refunded")
  const type = event['detail-type'];

  if (!id || !type) {
    throw new Error(`Missing required fields: id=${id} type=${type}`);
  }

  await processEvent({ id, type, livemode: livemode ?? false });
};
