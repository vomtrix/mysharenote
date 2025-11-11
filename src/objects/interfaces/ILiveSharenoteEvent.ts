export interface ILiveSharenoteEvent {
  id: string;
  timestamp: number;
  content?: string;
  blockHeight?: number;
  workerId?: string;
  worker?: string;
  tags?: Array<(string | number)[]>;
  metadata?: Record<string, unknown>;
  sharenote?: string;
  zLabel?: string;
  zBits?: number;
  heightHash?: string;
  headerHash?: string;
  headerHex?: string;
  address?: string;
}
