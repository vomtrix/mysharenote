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
    timestamp: 'timestamp',
    chain: 'chain'
  },
  35505: {
    d: 'id',
    height: 'blockHeight',
    b: 'blockHash',
    fee: 'fee',
    amount: 'amount',
    shares: 'shares',
    totalshares: 'totalShares',
    timestamp: 'timestamp',
    chain: 'chainId'
  },
  35510: {
    z: 'zBits',
    hh: 'heightHash',
    d: 'headerHash',
    dd: 'headerHex',
    a: 'address'
  }
};
