import { address, networks } from 'flokicoinjs-lib';
import { NetworkTypeType } from '@objects/Enums';
import { IDataPoint } from '@objects/interfaces/IDatapoint';

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