import dayjs from '@utils/dayjsSetup';

export const fromEpoch = (value: number | string) => {
  const n = typeof value === 'number' ? value : parseInt(value as string, 10);
  const ms = n > 1e12 ? n : n * 1000;
  return dayjs(ms);
};
