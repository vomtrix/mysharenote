export interface IShareEvent {
  id: string;
  workerId: string;
  blockHeight: number;
  blockHash: string;
  paymentHeight: number;
  amount: number;
  shares: number;
  totalShares: number;
  timestamp: string;
  status?: BlockStatusEnum;
}

export enum BlockStatusEnum {
  New = 'NEW',
  Valid = 'VALID',
  Orphan = 'ORPHAN',
  Checked = 'CHECKED'
}
