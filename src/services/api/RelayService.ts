import { Filter } from 'nostr-tools';
import { finalizeEvent } from 'nostr-tools';
import { SubscriptionParams } from 'nostr-tools/lib/types/relay';
import { Service } from 'typedi';
import { NostrClient } from '@services/NostrClient';
import { getTimeBeforeDaysInSeconds } from '@utils/helpers';
@Service()
export class RelayService {
  public nostrClient: any;
  public payoutsSubscription: any;
  public sharesSubscription: any;
  public hashratesSubscription: any;
  public liveSharenotesSubscription: any;
  public directMessagesSubscription: any;

  constructor() {}

  subscribePayouts(
    address: string,
    payerPublicKey: string,
    subscriptionParams: SubscriptionParams
  ) {
    this.stopPayouts();

    const filters: Filter[] = [
      {
        kinds: [35505],
        authors: [payerPublicKey],
        since: getTimeBeforeDaysInSeconds(2),
        [`#a`]: [address]
      },
      {
        kinds: [35505],
        authors: [payerPublicKey],
        limit: 500,
        [`#a`]: [address]
      }
    ];

    this.payoutsSubscription = this.nostrClient.subscribeEvent(filters, subscriptionParams);
    return this.payoutsSubscription;
  }

  async stopPayouts() {
    if (this.payoutsSubscription) {
      await this.payoutsSubscription.close();
      this.payoutsSubscription = null;
    }
  }

  subscribeShares(
    address: string,
    workProviderPublicKey: string,
    subscriptionParams: SubscriptionParams
  ) {
    this.stopShares();

    const filters: Filter[] = [
      {
        kinds: [35503],
        authors: [workProviderPublicKey],
        since: getTimeBeforeDaysInSeconds(2),
        [`#a`]: [address]
      },
      {
        kinds: [35503],
        authors: [workProviderPublicKey],
        limit: 500,
        [`#a`]: [address]
      }
    ];

    this.sharesSubscription = this.nostrClient.subscribeEvent(filters, subscriptionParams);
    return this.sharesSubscription;
  }

  async stopShares() {
    if (this.sharesSubscription) {
      await this.sharesSubscription.close();
      this.sharesSubscription = null;
    }
  }

  subscribeLiveSharenotes(
    address: string,
    workProviderPublicKey: string,
    subscriptionParams: SubscriptionParams
  ) {
    this.stopLiveSharenotes();

    const filters: Filter[] = [
      {
        kinds: [35510],
        authors: [workProviderPublicKey],
        limit: 500,
        since: getTimeBeforeDaysInSeconds(1),
        [`#a`]: [address]
      }
    ];

    this.liveSharenotesSubscription = this.nostrClient.subscribeEvent(filters, subscriptionParams);
    return this.liveSharenotesSubscription;
  }

  async stopLiveSharenotes() {
    if (this.liveSharenotesSubscription) {
      await this.liveSharenotesSubscription.close();
      this.liveSharenotesSubscription = null;
    }
  }

  subscribeDirectMessages(
    workProviderPublicKey: string,
    subscriptionParams: SubscriptionParams,
    address?: string
  ) {
    this.stopDirectMessages();

    const filters: Filter[] = [
      {
        kinds: [35515],
        authors: [workProviderPublicKey],
        since: getTimeBeforeDaysInSeconds(7),
        ...(address ? { [`#a`]: [address] } : {})
      },
      {
        kinds: [35515],
        authors: [workProviderPublicKey],
        limit: 500,
        ...(address ? { [`#a`]: [address] } : {})
      }
    ];

    this.directMessagesSubscription = this.nostrClient.subscribeEvent(filters, subscriptionParams);
    return this.directMessagesSubscription;
  }

  async stopDirectMessages() {
    if (this.directMessagesSubscription) {
      await this.directMessagesSubscription.close();
      this.directMessagesSubscription = null;
    }
  }

  subscribeHashrates(
    address: string,
    workProviderPublicKey: string,
    subscriptionParams: SubscriptionParams
  ) {
    this.stopHashrates();

    const filters: Filter[] = [
      {
        kinds: [35502],
        authors: [workProviderPublicKey],
        since: getTimeBeforeDaysInSeconds(1),
        limit: 500,
        [`#a`]: [address]
      }
    ];

    this.hashratesSubscription = this.nostrClient.subscribeEvent(filters, subscriptionParams);
    return this.hashratesSubscription;
  }

  async stopHashrates() {
    if (this.hashratesSubscription) {
      await this.hashratesSubscription.close();
      this.hashratesSubscription = null;
    }
  }

  async connectRelay(relayUrl: string, privateKey?: string) {
    if (!this.nostrClient) {
      this.nostrClient = new NostrClient({ relayUrl, privateKey });
      await this.nostrClient.connect();
    } else {
      const currentRelayUrl = this.nostrClient.relay.url.replace(/\/+$/, '').toLowerCase();
      const newRelayUrl = relayUrl.replace(/\/+$/, '').toLowerCase();
      if (currentRelayUrl != newRelayUrl) {
        await this.stopPayouts();
        await this.stopShares();
        await this.stopHashrates();
        await this.stopLiveSharenotes();
        await this.stopDirectMessages();
        await this.nostrClient.relay.close();
        this.nostrClient = new NostrClient({ relayUrl, privateKey });
        await this.nostrClient.connect();
      }
    }
  }

  async publishDirectMessage(privateKeyHex: string, content: string, address: string) {
    if (!this.nostrClient) {
      throw new Error('Relay not connected');
    }
    const createdAt = Math.floor(Date.now() / 1000);
    const unsignedEvent = {
      kind: 35515,
      created_at: createdAt,
      tags: [['a', address]],
      content
    };
    const signed = finalizeEvent(unsignedEvent as any, privateKeyHex);
    return this.nostrClient.relay.publish(signed);
  }
}
