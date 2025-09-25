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
  shares: number;
  totalShares: number;
  timestamp: string;
}
