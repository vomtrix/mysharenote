import { nip19 } from 'nostr-tools';

const HEX_REGEX = /^[0-9a-f]{64}$/i;

const toHexFromBytes = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const decodeNpubToHex = (value: string): string | undefined => {
  if (!nip19.NostrTypeGuard.isNPub(value)) return undefined;

  try {
    const decoded = nip19.decode(value);
    if (decoded.type !== 'npub') return undefined;

    if (decoded.data instanceof Uint8Array) {
      return toHexFromBytes(decoded.data);
    }

    if (typeof decoded.data === 'string' && HEX_REGEX.test(decoded.data)) {
      return decoded.data;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

export const isHexPublicKey = (value: string | undefined | null): boolean =>
  !!value && HEX_REGEX.test(value.trim());

export const normalizePublicKeyInput = (value: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error('Empty public key');
  }

  const npubHex = decodeNpubToHex(trimmed);
  if (npubHex) return npubHex;

  if (isHexPublicKey(trimmed)) return trimmed.toLowerCase();

  throw new Error('Invalid public key');
};

export const publicKeyInputToDisplayValue = (value: string | undefined | null): string => {
  if (!value) return '';
  const trimmed = value.trim();
  if (isHexPublicKey(trimmed)) {
    try {
      return nip19.npubEncode(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
};

export const isValidPublicKeyInput = (value: string | undefined | null): boolean => {
  if (!value) return false;
  try {
    normalizePublicKeyInput(value);
    return true;
  } catch {
    return false;
  }
};

export const toHexPublicKey = (value: string | undefined | null): string => {
  if (!value) {
    throw new Error('Empty public key');
  }
  return normalizePublicKeyInput(value);
};
