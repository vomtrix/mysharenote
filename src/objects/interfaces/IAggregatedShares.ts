export interface IAggregatedShares {
  xLabels: string[];
  workers: string[];
  dataByWorker: number[][]; // Amounts in LOKI per bin
}

