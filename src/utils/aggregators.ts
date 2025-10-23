import { toSeconds, fromEpoch } from '@utils/time';
import type { IShareEvent } from '@objects/interfaces/IShareEvent';
import { BlockStatusEnum } from '@objects/interfaces/IShareEvent';
import type { IAggregatedShares } from '@objects/interfaces/IAggregatedShares';

export const aggregateSharesByInterval = (
  shares: IShareEvent[],
  intervalSec: number,
  windowSec: number,
  nowSec?: number,
  options?: { fallbackToLatest?: boolean }
): IAggregatedShares => {
  const now = nowSec ?? Math.floor(Date.now() / 1000);
  const start = now - windowSec;
  const bins = Math.max(1, Math.floor(windowSec / intervalSec));

  const perWorker = new Map<string, Float64Array>();
  const totals = new Float64Array(bins);

  for (let i = 0; i < shares.length; i++) {
    const s = shares[i];
    if (s.status === BlockStatusEnum.Orphan) continue;
    const sec = toSeconds(s.timestamp);
    if (sec === null || sec < start || sec > now) continue;
    const idxRaw = Math.floor((sec - start) / intervalSec);
    const idx = Math.min(bins - 1, Math.max(0, idxRaw));
    let arr = perWorker.get(s.workerId);
    if (!arr) {
      arr = new Float64Array(bins);
      perWorker.set(s.workerId, arr);
    }
    const amt = s.amount || 0;
    arr[idx] += amt;
    totals[idx] += amt;
  }

  const keepIdx: number[] = [];
  for (let i = 0; i < bins; i++) if (totals[i] > 0) keepIdx.push(i);
  if (keepIdx.length === 0) {
    if (options?.fallbackToLatest) {
      let latest = -Infinity;
      for (let i = 0; i < shares.length; i++) {
        const s = shares[i];
        if (s.status === BlockStatusEnum.Orphan) continue;
        const sec = toSeconds(s.timestamp);
        if (sec !== null && sec > latest) latest = sec;
      }
      if (Number.isFinite(latest)) {
        return aggregateSharesByInterval(shares, intervalSec, windowSec, latest, { fallbackToLatest: false });
      }
    }
    return { xLabels: [], workers: [], dataByWorker: [] };
  }

  const allLabels: string[] = Array.from({ length: bins }, (_, i) => {
    const end = start + (i + 1) * intervalSec;
    return fromEpoch(end).format('MMM D, HH:00');
  });
  const xLabels = keepIdx.map((i) => allLabels[i]);

  const workers = Array.from(perWorker.keys()).sort();
  const dataByWorker = workers.map((w) => {
    const base = perWorker.get(w)!;
    return keepIdx.map((i) => base[i]);
  });

  return { xLabels, workers, dataByWorker };
};
