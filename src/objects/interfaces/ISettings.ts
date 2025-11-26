import { ChainKey } from '@config/config';

export interface ISettings {
  relay: string;
  network: any;
  payerPublicKey: any;
  workProviderPublicKey: any;
  explorer: string;
  explorers: Record<ChainKey, string>;
}
