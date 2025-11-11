interface KeysMap {
  [key: string]: string;
}

export const beautifierConfig: Record<number, KeysMap> = {
  35502: {
    hash: 'hashrate',
    all: 'hashrate',
    worker: 'worker',
    a: 'address'
  },
  35503: {
    d: 'id',
    height: 'blockHeight',
    workers: 'workerId',
    b: 'blockHash',
    amount: 'amount',
    shares: 'shares',
    totalshares: 'totalShares',
    eph: 'paymentHeight',
    timestamp: 'timestamp'
  },
  35505: {
    d: 'id',
    height: 'blockHeight',
    b: 'blockHash',
    fee: 'fee',
    amount: 'amount',
    shares: 'shares',
    totalshares: 'totalShares',
    timestamp: 'timestamp'
  },
  35510: {
    z: 'zBits',
    h: 'blockHeight',
    hh: 'heightHash',
    d: 'headerHash',
    dd: 'headerHex',
    a: 'address'
  }
};
