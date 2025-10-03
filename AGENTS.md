# Repository Guidelines

## Project Structure & Module Organization
- Adopt a monorepo layout as code lands: `apps/mobile/` for the Expo client (structure screens under `src/screens/`, components under `src/components/`, assets in `assets/`), `convex/` for backend schema, actions, and cron jobs, and `packages/shared/` for cross-cutting TypeScript utilities that both sides consume through barrel exports.
- Keep documentation in `docs/`; existing product notes (`receipts_warranties_poc.md`) should stay versioned alongside future architecture digests.
- Store environment samples in `.env.example` at repo root and load per package with platform-appropriate tooling (`expo-env`, `convex dev`).

## Build, Test, and Development Commands
- `npm install` (root) — install workspace dependencies once the root `package.json` is added; prefer npm v10+ for deterministic lockfiles.
- `npm run dev:mobile` → `npx expo start --clear` for local mobile development; attach a simulator or Expo Go client.
- `npm run dev:backend` → `npx convex dev` to run database/functions locally with hot reload.
- `npm run lint` → `eslint --ext .ts,.tsx apps/mobile/src packages/shared src` with Prettier integration.
- `npm test` → `jest --watch` to execute unit/integration suites; ensure it runs clean before pushing.

## Coding Style & Naming Conventions
Use TypeScript everywhere with `strict` mode enabled. Format with Prettier’s default 2-space indentation, single quotes, and trailing commas. Name React components with `PascalCase`, hooks with `use*`, Convex functions `{verb}{Noun}` (e.g., `processReceipt`). File names should mirror exports (`ReceiptList.tsx`, `useReceipts.ts`). Keep styles in Tailwind/NativeWind class utilities; avoid inline magic numbers—promote constants to `packages/shared/config.ts`.

## Testing Guidelines
Target Jest + React Native Testing Library for UI and Convex’s testing harness for backend logic. Place mobile tests in `apps/mobile/__tests__/` mirroring screen/component names (`ReceiptList.test.tsx`) and backend tests in `convex/__tests__/`. Strive for ≥80% statement coverage on receipt capture, OCR parsing, and notification scheduling. Include fixture photos under `apps/mobile/test-data/` and mock external services (Expo Notifications, Vision API) via lightweight adapters.

## Commit & Pull Request Guidelines
History currently contains only `Initial commit`; grow it with Conventional Commits (`feat:`, `fix:`, `chore:`) referencing issue IDs when available. Each PR must summarize scope, list manual/automated test results, and attach UI screenshots or emulator recordings for visible changes. Request review before merging, ensure CI (lint, test) passes, and squash merge to keep history tidy.

## Security & Configuration Tips
Never commit secrets; store `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CONVEX_DEPLOYMENT`, and `VISION_API_KEY` in local `.env` files. Rotate keys immediately if leaked and document rotations in the PR. Lock mobile builds to the minimum supported OS versions and enable Expo’s EAS secrets management before any release build.
