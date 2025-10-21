import { address, networks } from 'flokicoinjs-lib';
import { NetworkTypeType } from '@objects/Enums';
import { IDataPoint } from '@objects/interfaces/IDatapoint';
import { BlockStatusEnum, IShareEvent } from '@objects/interfaces/IShareEvent';

export const setWidthStyle = (width?: any) => {
  if (width && typeof width === 'number') {
    return { width: `${width}px !important` };
  }
  if (width && typeof width === 'string') {
    return { width: `${width} !important` };
  }
  return {};
};

export const isMobileDevice = (): boolean => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  return (
    /Android/i.test(userAgent) ||
    /webOS/i.test(userAgent) ||
    /iPhone/i.test(userAgent) ||
    /iPad/i.test(userAgent) ||
    /iPod/i.test(userAgent) ||
    /BlackBerry/i.test(userAgent) ||
    /IEMobile/i.test(userAgent) ||
    /Opera Mini/i.test(userAgent)
  );
};

export const hexStringToUint8Array = (hexString: string): Uint8Array => {
  if (hexString.length !== 64) {
    throw new Error('Invalid hex string length. Should be 64 characters (32 bytes).');
  }
  const array = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    array[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return array;
};

export const validateAddress = (addr: string, network?: string) => {
  try {
    let currentNet;
    switch (network) {
      case NetworkTypeType.Testnet:
        currentNet = networks.testnet;
        break;
      case NetworkTypeType.Regtest:
        currentNet = networks.regtest;
        break;
      default:
        currentNet = networks.bitcoin;
        break;
    }
    address.toOutputScript(addr, currentNet);
    return true;
  } catch {
    return false;
  }
};

export const getTimeBeforeDaysInSeconds = (days: number): number =>
  Math.ceil(Date.now() / 1000) - days * 24 * 60 * 60;

export const truncateAddress = (addr: string) => {
  return `${addr.slice(0, 10)}...${addr.slice(-10)}`;
};

export const lokiToFlc = (amount: number) => (amount / 100000000).toFixed(6);
export const lokiToFlcNumber = (amount: number) => parseFloat(lokiToFlc(amount));

export const calculateSMA = (data: IDataPoint[], period: number): IDataPoint[] => {
  const smaData: IDataPoint[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const avg = slice.reduce((sum, point) => sum + point.value, 0) / period;
    smaData.push({ time: data[i].time, value: parseFloat(avg.toFixed(2)) });
  }
  return smaData;
};

export const addRandomNumber = (number: number): number => {
  const randomNumber = Math.floor(Math.random() * 5) + 1;
  return number + randomNumber;
};

export const formatHashrate = (hpsStr: any) => {
  const hps = BigInt(Math.round(Number(hpsStr)));

  const units = ['H/s', 'kH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s'];

  // figure out which unit to use
  let unitIndex = 0;
  let tmp = hps;
  while (tmp >= 1000n && unitIndex < units.length - 1) {
    tmp /= 1000n;
    unitIndex++;
  }

  // compute a scaled value * 100 (for two decimal places)
  const scale = 1000n ** BigInt(unitIndex);
  const scaledTimes100 = (hps * 100n) / scale;

  // split into integer and fractional parts
  const integerPart = scaledTimes100 / 100n;
  const fractionPart = scaledTimes100 % 100n;

  // pad fractional part to two digits
  const fracStr = fractionPart.toString().padStart(2, '0');

  return `${integerPart}.${fracStr} ${units[unitIndex]}`;
};

// Format a number using thousands shorthand: 1k, 2.5k, 100k
// - Integers show without decimals (e.g., 1k, 100k)
// - Non-integers keep one decimal (e.g., 2.5k)
export const formatK = (v: number | null | undefined): string => {
  if (v === null || v === undefined || Number.isNaN(v)) return '';
  const abs = Math.abs(v);
  if (abs >= 1000) {
    const val = v / 1000;
    const str = Number.isInteger(val) ? val.toString() : val.toFixed(1);
    return `${str}k`;
  }
  return `${v}`;
};

export const shareChipColor = (status: BlockStatusEnum) => {
  switch (status) {
    case BlockStatusEnum.Orphan:
      return 'error';
    case BlockStatusEnum.New:
    case BlockStatusEnum.Valid:
      return;
    default:
      return 'warning';
  }
};

export const shareChipVariant = (status: BlockStatusEnum) => {
  switch (status) {
    case BlockStatusEnum.New:
    case BlockStatusEnum.Valid:
      return;
    default:
      return 'outlined';
  }
};

export const makeIdsSignature = (ids: any[]): string => {
  const input = ids.join('\u001F');
  const FNV_OFFSET = 0x811c9dc5; // 2166136261
  const FNV_PRIME = 0x01000193; // 16777619

  let h1 = FNV_OFFSET >>> 0;
  for (let i = 0; i < input.length; i++) {
    h1 ^= input.charCodeAt(i);
    h1 = (h1 * FNV_PRIME) >>> 0;
  }

  let h2 = FNV_OFFSET >>> 0;
  for (let i = input.length - 1; i >= 0; i--) {
    h2 ^= input.charCodeAt(i);
    h2 = (h2 * FNV_PRIME) >>> 0;
  }

  const combined = (BigInt(h1) << 32n) | BigInt(h2);
  return combined.toString(36);
};
