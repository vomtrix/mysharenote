# mySharenote

Dashboard for pools and miners to track sharenotes. Built on the Sharenote Fun Enhancement Proposal (WBET stage compliant) described in [the WoF paper](https://docs.flokicoin.org/wof). For the current Sharenote draft, see [docs.flokicoin.org/wof/sharenote](https://docs.flokicoin.org/wof/sharenote) and the concept overview at [sharenote.xyz](https://sharenote.xyz).

## Why use it

- Pools give miners transparent sharenote/share/payout views.
- Miners can fork and point the UI at their own relay bundle.
- Configuration, theming, and locales mirror the Sharenote spec and the [FEP process](https://docs.flokicoin.org/wof#what-is-a-fep).

## Run locally

Prerequisites: Node.js ≥ 18, npm or yarn.

```bash
npm install
npm run dev
# open http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

## Configure

Set environment variables (or `.env.local`) as provided by your pool:

- `NEXT_PUBLIC_RELAY_URL`
- `NEXT_PUBLIC_PAYER_PUBLIC_KEY`
- `NEXT_PUBLIC_WORK_PROVIDER_PUBLIC_KEY`

They seed `src/config/config.ts` and can be overridden via in-app settings. Do not commit secrets.

## Theming and locales

- Update colour, typography, and feature tokens in `src/config/config.ts`.
- Keep translations in `src/config/translations` aligned across EN, RU, and CN.

## Contributing

PRs are welcome. Focus on Sharenote FEP compliance, pool-operator workflows, and localisation quality.

## License

Creative Commons CC0 1.0 Universal
