import { processEvent } from '@my4mlife/order-handler-core';

interface EventBridgeEvent {
  id: string;
  'detail-type': string;
  detail: {
    id: string;
    type: string;
    livemode: boolean;
  };
}

export async function handler(event: EventBridgeEvent): Promise<void> {
  const { id, type, livemode } = event.detail;

  if (!id || !type) {
    throw new Error(`Invalid EventBridge detail: missing id or type. Got: ${JSON.stringify(event.detail)}`);
  }

  await processEvent({ id, type, livemode: Boolean(livemode) });
}
