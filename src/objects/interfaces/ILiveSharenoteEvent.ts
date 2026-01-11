export interface IAuxiliaryBlock {
  chain?: string;
  height?: number;
  hash?: string;
  solved?: boolean;
  /**
   * Target sharenote label miners need to beat for this block.
   */
  blockSharenote?: string;
  blockSharenoteZBits?: number;
}

export interface ILiveSharenoteEvent {
  id: string;
  timestamp: number;
  content?: string;
  blockHeight?: number;
  solved?: boolean;
  parentBlock?: IAuxiliaryBlock;
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
  auxBlocks?: IAuxiliaryBlock[];
}
