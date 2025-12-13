export interface IPayoutEvent {
  id: string;
  blockHeight: number;
  blockHash: string;
  fee: number;
  amount: number;
  txId: string;
  txBlockHash: string;
  txBlockHeight: string;
  confirmedTx: boolean;
  shares: number | string;
  sharesCount?: number;
  totalShares: number | string;
  totalSharesCount?: number;
  timestamp: string;
  chainId?: string;
}
