import { NetworkTypeType } from '@objects/Enums';

export const RELAY_URL: string = process.env.NEXT_PUBLIC_RELAY_URL!;

const fallbackExplorer =
  process.env.NEXT_PUBLIC_FLOKICOIN_EXPLORER_URL || 'https://flokichain.info';
export const EXPLORER_URL: string = fallbackExplorer;
export const PAYER_PUBLIC_KEY: string = process.env.NEXT_PUBLIC_PAYER_PUBLIC_KEY!;
export const WORK_PROVIDER_PUBLIC_KEY: string = process.env.NEXT_PUBLIC_WORK_PROVIDER_PUBLIC_KEY!;
export const ORHAN_BLOCK_MATURITY: number = process.env.ORHAN_BLOCK_MATURITY
  ? parseInt(process.env.ORHAN_BLOCK_MATURITY, 10) || 5
  : 5;
export const DEFAULT_NETWORK_ENV: string | undefined = process.env.NEXT_PUBLIC_NETWORK;
export const DEFAULT_NETWORK: NetworkTypeType = (() => {
  const normalized = DEFAULT_NETWORK_ENV?.trim().toUpperCase();
  switch (normalized) {
    case NetworkTypeType.Testnet:
      return NetworkTypeType.Testnet;
    case NetworkTypeType.Regtest:
      return NetworkTypeType.Regtest;
    case NetworkTypeType.Mainnet:
    default:
      return NetworkTypeType.Mainnet;
  }
})();

export type ChainKey =
  | 'bellscoin'
  | 'dogecoin'
  | 'flokicoin'
  | 'pepecoin'
  | 'litecoin'
  | 'trumpcoin';

export type ChainMetadata = {
  chainIds: string[];
  currencySymbol: string;
  decimals: number;
  explorerUrl: string;
};

const explorerFromEnv = (envValue: string | undefined, fallback?: string) =>
  envValue?.trim() || fallback || EXPLORER_URL;

export const CHAIN_METADATA: Record<ChainKey, ChainMetadata> = {
  flokicoin: {
    chainIds: ['21', '0x21'],
    currencySymbol: 'FLC',
    decimals: 8,
    explorerUrl: explorerFromEnv(process.env.NEXT_PUBLIC_FLOKICOIN_EXPLORER_URL)
  },
  pepecoin: {
    chainIds: ['3f', '0x3f'],
    currencySymbol: 'PEP',
    decimals: 8,
    explorerUrl: explorerFromEnv(process.env.NEXT_PUBLIC_PEPECOIN_EXPLORER_URL)
  },
  bellscoin: {
    chainIds: ['10', '0x10'],
    currencySymbol: 'BEL',
    decimals: 8,
    explorerUrl: explorerFromEnv(process.env.NEXT_PUBLIC_BELLSCOIN_EXPLORER_URL)
  },
  dogecoin: {
    chainIds: ['62', '0x62'],
    currencySymbol: 'DOGE',
    decimals: 8,
    explorerUrl: explorerFromEnv(process.env.NEXT_PUBLIC_DOGECOIN_EXPLORER_URL)
  },
  litecoin: {
    chainIds: ['2', '0x2'],
    currencySymbol: 'LTC',
    decimals: 8,
    explorerUrl: explorerFromEnv(process.env.NEXT_PUBLIC_LITECOIN_EXPLORER_URL)
  },
  trumpcoin: {
    chainIds: ['a8', '0x80'],
    currencySymbol: 'TRUMP',
    decimals: 8,
    explorerUrl: explorerFromEnv(process.env.NEXT_PUBLIC_TRUMPCOIN_EXPLORER_URL)
  }
};

export const DEFAULT_CHAIN_EXPLORERS: Record<ChainKey, string> = Object.entries(
  CHAIN_METADATA
).reduce((acc, [name, meta]) => {
  acc[name as ChainKey] = meta.explorerUrl;
  return acc;
}, {} as Record<ChainKey, string>);

export const SOCIAL_URLS: Record<string, string> = {
  github: 'https://github.com/entanglo/viaflc-shares'
};

export const FAQ_LINKS: Record<string, string> = {
  shareNote: 'https://sharenote.xyz',
  nostr: 'https://nostr.com',
  relayGuide: 'https://github.com/nostr-protocol/nostr#relays',
  templateReview: 'https://docs.sharenote.com/template-review',
  wofPaper: 'https://docs.flokicoin.org/wof',
  sharenoteFep: 'https://docs.flokicoin.org/wof/sharenote'
};

// UI/Theme configuration (static values; not env-driven)
export const THEME_PRIMARY_COLOR: string = '#1983daff';
export const THEME_SECONDARY_COLOR: string = '#d19810';
export const THEME_PRIMARY_COLOR_1: string = '#72b9f3ff';
export const THEME_PRIMARY_COLOR_2: string = '#90caf9';
export const THEME_PRIMARY_COLOR_3: string = 'q';
export const THEME_BADGE_RATIO_FAIL: string = '#FF4D4F'; // error red
export const THEME_BADGE_RATIO_WARN: string = '#FFB020'; // amber warning
export const THEME_BADGE_RATIO_SUCCESS: string = '#2ED573'; // mempool green
export const THEME_BADGE_RATIO_EXCEED: string = '#6F42C1'; // accent purple
export const WORKER_COLORS: string[] = [
  '#3A9BE8', // sky blue
  '#FF8B5C', // warm coral
  '#4DD17A', // fresh green
  '#2EC4FF', // electric blue
  '#7C4DFF', // vibrant purple
  '#43A0FF', // bright azure
  '#3BC8B5', // aqua teal
  '#FF6F91', // lively pink
  '#FFB347', // sunset orange
  '#9C7CFF', // soft violet
  '#2FBF71', // emerald
  '#FF6898', // candy rose
  '#FF9F43', // amber glow
  '#C06CFF', // lavender punch
  '#56D3FF' // icy cyan
];

export const DARK_MODE_ENABLED: boolean = false;
export const DARK_MODE_FORCE: boolean = false;
export const DARK_MODE_DEFAULT: 'light' | 'dark' = 'light';

// Text colors
export const THEME_TEXT_LIGHT_PRIMARY: string = '#1f1f1f';
export const THEME_TEXT_LIGHT_SECONDARY: string = '#555555';
export const THEME_TEXT_DARK_PRIMARY: string = '#e0e0e0';
export const THEME_TEXT_DARK_SECONDARY: string = '#a6a6a6';

// Charts (area gradient colors)
export const THEME_CHART_AREA_TOP: string = 'rgba(98, 158, 241, 0.4)';
export const THEME_CHART_AREA_BOTTOM: string = 'rgba(22, 123, 246, 0)';

// App behavior (static option)
export const HOME_PAGE_ENABLED: boolean = false;
export const LOADER_IDLE_MS: number = 3000;
