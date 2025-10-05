# Receipt Warranty Vault

This monorepo hosts the Expo mobile client and a Convex backend for tracking coupons and warranties.

## Prerequisites
- Node.js 20 or newer (use `nvm install 20.19.4` if needed)
- npm 10 (bundled with recent Node releases)
- Convex CLI (`npm install -g convex` or run through `npx`)
- Expo tooling (`npm install -g expo` optional)

## Environment
Duplicate `.env.example` to `.env.local` in the repo root and fill in your Convex deployment values:

```
EXPO_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
CONVEX_DEPLOYMENT=<deployment-name>
CONVEX_AUTH_TOKEN=<token>
```

When the Expo app starts it reads `.env`/`.env.local` via `app.config.ts` and exposes `EXPO_PUBLIC_CONVEX_URL` to the mobile client.

## Install & Run
```
npm install
npx convex dev            # terminal 1, spins up your dev deployment
npm run dev:mobile -- --clear   # terminal 2, launches Expo with cache cleared
```

Open the tunnel QR code in Expo Go or press `i`/`a` for simulator/emulator. The mobile client hydrates from local storage, syncs with Convex, and falls back to seeded data the first time.

## Development Workflow
- `npm run lint` – ESLint (TypeScript + React Native + Prettier)
- `npm run test` – Runs the Google Vision fixture sweep (see **OCR regression check** below)
- `npx convex push` – apply schema/mutations to your deployment
- `npx convex codegen` – regenerate typed API every time you change Convex functions

## Using the App
- **Add benefits:** Use the “Add sample coupon/warranty” buttons or wire real capture flows.
- **Delete benefits:** From any coupon/warranty detail view, tap “Delete …” to remove it. Removals sync to Convex and persist across reloads.
- **Refresh:** Pull down on the wallet screen to refetch from Convex; offline cache keeps the UI populated if the network is unavailable.

## Folder Overview
- `apps/mobile` – Expo app (screens, providers, services, Metro config)
- `convex` – Convex schema, queries, mutations, and generated API bindings
- `packages/shared` – Shared TypeScript types/constants as well as OCR fixtures/helpers
- `docs` – product/design notes (`receipts_warranties_poc.md`, etc.)

For detailed contributor practices see [AGENTS.md](./AGENTS.md).

### OCR regression check

`npm test` loads the sample coupons and warranties in `packages/shared/fixtures/` and pushes each image through the shared Vision pipeline. The script:

1. Reads Google Vision credentials from `.env`/`.env.local` (same variables used by Convex: `GOOGLE_VISION_CLIENT_EMAIL`, `GOOGLE_VISION_PRIVATE_KEY`, `GOOGLE_VISION_PROJECT_ID`).
2. Logs merchants, descriptions, and detected expiry/coverage dates for every fixture.
3. Emits warnings (without failing) when the parser can’t extract a field so you can track accuracy over time.

Use this command before shipping parser tweaks or adding new fixtures. If you need to bypass the check locally, run `SKIP_OCR_TESTS=1 npm test`.
