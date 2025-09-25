<p align="center">
  <img src="public/assets/logo.svg" width="260" alt="myShareNote Logo" />
</p>

# myShareNote — Guardians of Decentralization 🚀

Open‑source, privacy‑friendly UI to track hashrate, payouts and shares in real time via Nostr. Bring your own relay, keep control of your data — simple, fast, and flexible.

• Specs and philosophy (the soul of ShareNote) ➜ https://sharenote.xyz

## Highlights

- ⛏️ Live mining stats: hashrate, shares, payouts
- 🧭 BYO Relay + npubs (Nostr)
- 🌓 Built‑in dark mode + customizable theme
- 🌍 i18n: EN / RU / CN

## Quick Start

Prereqs: Node.js ≥ 18, npm or yarn

1. Install

```bash
git clone https://github.com/devxaro/sharenote.git
cd sharenote
npm install
```

2. Dev

```bash
npm run dev
```

Open http://localhost:3000

3. Build

```bash
npm run build
```

## Theme Customization 🎨

All theme and color settings are static and centralized in `src/config/config.ts` and exposed as tokens in `src/styles/colors.ts`.

### Primary/Secondary colors

Edit in `src/config/config.ts`:

- `THEME_PRIMARY_COLOR` — main brand color (default: `#9c27b0`)
- `THEME_PRIMARY_COLOR_1` — light variant (default: `#a86dcb`)
- `THEME_PRIMARY_COLOR_2` — lighter variant (default: `#d49de9`)
- `THEME_PRIMARY_COLOR_3` — accent variant (default: `#ff8bda`)
- `THEME_SECONDARY_COLOR` — secondary color (default: `#f44336`)

These feed the centralized tokens in `src/styles/colors.ts`:

- `PRIMARY_COLOR`, `PRIMARY_COLOR_1`, `PRIMARY_COLOR_2`, `PRIMARY_COLOR_3`
- `THEME_PRIMARY`, `THEME_SECONDARY` (used by MUI palette)

Update once, reflect everywhere — no need to touch components.

### Dark mode

Edit in `src/config/config.ts`:

- `DARK_MODE_ENABLED` = `true|false`
- `DARK_MODE_FORCE` = `true|false`
- `DARK_MODE_DEFAULT` = `'light' | 'dark'`

Dark mode toggle appears in the footer when enabled. If `DARK_MODE_FORCE` is `true`, the app always uses dark mode and hides the toggle.

### Homepage behavior

Edit in `src/config/config.ts`:

- `HOME_PAGE_ENABLED` = `true|false`

If disabled, the app redirects to `/address/:addr` when an address exists, otherwise to 404.

## Relay & Explorer (app basics) 🔧

Provide your relay and npubs in Settings. You can prefill via env or `.env.local`:

- `NEXT_PUBLIC_RELAY_URL`
- `NEXT_PUBLIC_PAYOUTS_PUBLIC_KEY`
- `NEXT_PUBLIC_SHARES_PUBLIC_KEY`
- `NEXT_PUBLIC_EXPLORER_URL`

These defaults are read in `src/config/config.ts` and can be changed in the UI at runtime.

## Internationalization 🌐

Translations live in `src/config/translations`. Add or adjust keys there; language can be switched from the header.

## Contributing 🤝

Issues and PRs are welcome. Keep the theme tokens centralized and avoid hard‑coded colors in components.

## License

MIT
