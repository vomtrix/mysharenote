export const RELAY_URL: string = process.env.NEXT_PUBLIC_RELAY_URL!;
export const EXPLORER_URL: string = process.env.NEXT_PUBLIC_EXPLORER_URL!;
export const PAYER_PUBLIC_KEY: string = process.env.NEXT_PUBLIC_PAYER_PUBLIC_KEY!;
export const WORK_PROVIDER_PUBLIC_KEY: string = process.env.NEXT_PUBLIC_WORK_PROVIDER_PUBLIC_KEY!;
export const ELECTRUM_API_URL: string = `${EXPLORER_URL}/api`;
export const ORHAN_BLOCK_MATURITY: number = process.env.ORHAN_BLOCK_MATURITY
  ? parseInt(process.env.ORHAN_BLOCK_MATURITY, 10) || 5
  : 5;

export const SOCIAL_URLS: Record<string, string> = {
  github: 'https://github.com/vomtrix/mysharenote'
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
export const THEME_PRIMARY_COLOR: string = '#6F42C1'; // mempool purple accent
export const THEME_SECONDARY_COLOR: string = '#2ED3A3'; // green-cyan accent
export const THEME_PRIMARY_COLOR_1: string = '#8C5CF6'; // lighter purple for hover
export const THEME_PRIMARY_COLOR_2: string = '#A98DFB'; // soft violet tint
export const THEME_PRIMARY_COLOR_3: string = '#C3B5FF'; // pale lavender glow
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
export const THEME_CHART_AREA_TOP: string = 'rgba(156, 39, 176, 0.4)';
export const THEME_CHART_AREA_BOTTOM: string = 'rgba(156, 39, 176, 0.0)';

// App behavior (static option)
export const HOME_PAGE_ENABLED: boolean = true;

// Loader behavior
export const LOADER_IDLE_MS: number = 3000;
