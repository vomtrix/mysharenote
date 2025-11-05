export interface IHashrateEvent {
  id: string;
  worker?: string;
  hashrate: number;
  address: string;
  timestamp: number;
  meanSharenote?: string | number;
  meanTime?: number;
  lastShareTimestamp?: number;
  workers?: Record<string, number>;
  workerDetails?: Record<
    string,
    {
      hashrate?: number;
      sharenote?: string | number;
      meanSharenote?: string | number;
      meanTime?: number;
      lastShareTimestamp?: number;
      userAgent?: string;
    }
  >;
}
