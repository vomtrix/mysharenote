import { Filter, getPublicKey, Relay } from 'nostr-tools';
import { SubscriptionParams } from 'nostr-tools/lib/types/relay';
import { hexStringToUint8Array } from '@utils/Utils';

export class NostrClient {
  public relay: Relay;
  private publicKey?: string;
  private privateKey?: string;

  constructor(options: { relayUrl: string; privateKey?: string }) {
    this.relay = new Relay(options.relayUrl);

    if (options.privateKey) {
      this.privateKey = options.privateKey;
      const privateKeyUint8Array = hexStringToUint8Array(options.privateKey);
      this.publicKey = getPublicKey(privateKeyUint8Array);
    }
  }

  async connect() {
    await this.relay.connect();
  }

  subscribeEvent(filters: Filter[], subscriptionParams: SubscriptionParams) {
    return this.relay.subscribe(filters, subscriptionParams);
  }
}
