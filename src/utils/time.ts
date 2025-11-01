import dayjs from '@utils/dayjsSetup';

export const fromEpoch = (value: number | string) => {
  const n = typeof value === 'number' ? value : parseInt(value as string, 10);
  const ms = n > 1e12 ? n : n * 1000;
  return (dayjs as any).tz ? (dayjs as any).tz(ms) : dayjs(ms);
};

export const toSeconds = (ts: string | number | undefined): number | null => {
  if (ts === undefined || ts === null) return null;
  const raw = typeof ts === 'number' ? ts : parseInt(ts, 10);
  if (Number.isNaN(raw)) return null;
  return raw > 1e12 ? Math.floor(raw / 1000) : raw;
};
