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

const createDateFromValue = (value: number | string) => {
  const numeric = typeof value === 'number' ? value : parseInt(value, 10);
  if (Number.isNaN(numeric)) return undefined;
  const ms = numeric > 1e12 ? numeric : numeric * 1000;
  if (!Number.isFinite(ms)) return undefined;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const toDateFromMaybeSeconds = (value: number | undefined | null): Date | undefined => {
  if (value === undefined || value === null) return undefined;
  return createDateFromValue(value);
};

export const formatRelativeTime = (date: Date): string => {
  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  if (hours === 0 && minutes === 0) return `${seconds}s ago`;
  if (hours === 0) return `${minutes}m ${seconds.toString().padStart(2, '0')}s ago`;
  if (hours < 24) return `${hours}h ${minutes.toString().padStart(2, '0')}m ago`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  const dayPart = days === 1 ? '1 day' : `${days} days`;
  if (days < 7) {
    return `${dayPart} ${remHours}h ago`;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const formatRelativeFromTimestamp = (
  value: number | string | Date | undefined | null,
  fallback = '--'
): string => {
  if (value === undefined || value === null) return fallback;
  const date = value instanceof Date ? value : createDateFromValue(value as number | string);
  if (!date) return fallback;
  return formatRelativeTime(date);
};
