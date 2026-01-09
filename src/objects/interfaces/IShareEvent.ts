export interface IShareEvent {
  id: string;
  workerId: string;
  blockHeight: number;
  blockHash: string;
  chainId?: string;
  paymentHeight: number;
  amount: number;
  shares: number | string;
  sharesCount?: number;
  totalShares: number | string;
  totalSharesCount?: number;
  timestamp: string;
  status?: BlockStatusEnum;
}

export enum BlockStatusEnum {
  New = 'NEW',
  Valid = 'VALID',
  Orphan = 'ORPHAN',
  Checked = 'CHECKED'
}
