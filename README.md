<p align="center">
  <img src="public/assets/logo.svg" width="260" alt="myShareNote Logo" />
</p>

# Track Your Shares

Real‑time shares tracking (hashrate, shares, payouts) via the Sharenote specs and your own Nostr relay. Open‑source, privacy‑first.

Learn more about the sharenote concept at https://sharenote.xyz

## Highlights

- ⛏️ Live mining stats via ShareNote events
- 🧭 Bring‑your‑own relay and npubs
- 🌓 Customizable theme; dark mode
- 🌍 i18n (EN / RU / CN)

## Quick Start

Prereqs: Node.js ≥ 18, npm or yarn

```bash
npm install
npm run dev
# open http://localhost:3000
```

Build:

```bash
npm run build
```

## Configure (env or .env.local)

- `NEXT_PUBLIC_RELAY_URL`
- `NEXT_PUBLIC_NOSTR_PRIVATE_KEY`
- `NEXT_PUBLIC_PAYER_PUBLIC_KEY`
- `NEXT_PUBLIC_WORK_PROVIDER_PUBLIC_KEY`
- `NEXT_PUBLIC_EXPLORER_URL`

These are read in `src/config/config.ts` and adjustable from Settings.

## Theme Customization 🎨

Theme is configurable in `src/config/config.ts`.

- Colors: `THEME_PRIMARY_COLOR`, `THEME_SECONDARY_COLOR`, `THEME_PRIMARY_COLOR_1`, `THEME_PRIMARY_COLOR_2`, `THEME_PRIMARY_COLOR_3`
- Dark mode: `DARK_MODE_ENABLED`, `DARK_MODE_FORCE`, `DARK_MODE_DEFAULT`
- Text: `THEME_TEXT_LIGHT_PRIMARY`, `THEME_TEXT_LIGHT_SECONDARY`, `THEME_TEXT_DARK_PRIMARY`, `THEME_TEXT_DARK_SECONDARY`
- Charts: `THEME_CHART_AREA_TOP`, `THEME_CHART_AREA_BOTTOM`
- Behavior: `HOME_PAGE_ENABLED`

## Internationalization 🌐

Translations live in `src/config/translations`. Language can be switched from the header.

## Contributing 🤝

Issues and PRs are welcome. Keep theme tokens centralized and avoid hard‑coded colors in components.

## License

MIT
