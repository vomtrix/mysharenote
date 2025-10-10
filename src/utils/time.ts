import dayjs from '@utils/dayjsSetup';

export const fromEpoch = (value: number | string) => {
  const n = typeof value === 'number' ? value : parseInt(value as string, 10);
  const ms = n > 1e12 ? n : n * 1000;
  // Use timezone-aware Day.js instance so formatting follows user timezone
  // Default timezone is set in dayjsSetup via Intl resolvedOptions
  // If default TZ isn't set, this falls back to environment behavior
  // but still keeps a consistent API surface.
  // @ts-ignore tz is added by plugin in dayjsSetup
  return (dayjs as any).tz ? (dayjs as any).tz(ms) : dayjs(ms);
};
