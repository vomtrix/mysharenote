import { CHAIN_METADATA, ChainKey, DEFAULT_CHAIN_EXPLORERS, EXPLORER_URL } from '@config/config';

export const CHAIN_ICONS: Record<string, string> = {
  bellscoin: '/assets/coins/bellscoin.png',
  dogecoin: '/assets/coins/dogecoin.png',
  flokicoin: '/assets/coins/flokicoin.png',
  pepecoin: '/assets/coins/pepecoin.png',
  litecoin: '/assets/coins/litecoin.png',
  trumpcoin: '/assets/coins/trumpcoin.png'
};

const normalizeChainIdentifier = (chain?: string) => {
  if (!chain) return undefined;
  return chain.trim().toLowerCase().replace(/^0x/, '');
};

const chainIdToName = new Map<string, ChainKey>();
Object.entries(CHAIN_METADATA).forEach(([name, meta]) => {
  meta.chainIds.forEach((id) => {
    const normalized = normalizeChainIdentifier(id);
    if (normalized) {
      chainIdToName.set(normalized, name as ChainKey);
    }
  });
});

export const CHAIN_ID_TO_NAME: Record<string, ChainKey> = Object.fromEntries(chainIdToName);

const getNormalizedChainName = (chain?: string) => {
  const normalized = normalizeChainIdentifier(chain);
  if (!normalized) return undefined;
  const mappedName = CHAIN_ID_TO_NAME[normalized] ?? normalized;
  return mappedName;
};

export const getChainName = (chain?: string) => getNormalizedChainName(chain);

export const getChainMetadata = (chain?: string) => {
  const name = getNormalizedChainName(chain);
  if (!name) return undefined;
  const meta = CHAIN_METADATA[name as ChainKey];
  if (!meta) return undefined;
  return { ...meta, name: name as ChainKey };
};

export const getChainIconPath = (chain?: string) => {
  const normalized = getNormalizedChainName(chain);
  if (!normalized) return undefined;
  return CHAIN_ICONS[normalized];
};

export const getExplorerBaseUrl = (
  chain?: string,
  overrides?: Partial<Record<ChainKey, string>>
) => {
  const normalized = getNormalizedChainName(chain);
  if (normalized && overrides?.[normalized as ChainKey]) {
    return overrides[normalized as ChainKey] as string;
  }

  if (normalized && DEFAULT_CHAIN_EXPLORERS[normalized as ChainKey]) {
    return DEFAULT_CHAIN_EXPLORERS[normalized as ChainKey];
  }

  return overrides?.flokicoin || DEFAULT_CHAIN_EXPLORERS.flokicoin || EXPLORER_URL;
};
