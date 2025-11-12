export interface ILiveSharenoteEvent {
  id: string;
  timestamp: number;
  content?: string;
  blockHeight?: number;
  solved?: boolean;
  workerId?: string;
  worker?: string;
  /**
   * formerly numeric zBits; now carries the sharenote label (e.g. "12z12").
   */
  zBits?: number | string;
  heightHash?: string;
  headerHash?: string;
  headerHex?: string;
  address?: string;
}
