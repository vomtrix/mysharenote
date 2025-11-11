export interface ILiveSharenoteEvent {
  id: string;
  timestamp: number;
  content?: string;
  blockHeight?: number;
  solved?: boolean;
  workerId?: string;
  worker?: string;
  zBits?: number;
  heightHash?: string;
  headerHash?: string;
  headerHex?: string;
  address?: string;
}
