# Repository Guidelines

## Project Structure & Module Organization
- `apps/mobile/` – Expo client (screens in `src/screens/`, shared UI in `src/components/`, services under `src/services/`). `metro.config.js` keeps Metro aware of the monorepo.
- `convex/` – Convex schema (`schema.ts/js`), queries (`queries/`), mutations (`mutations/`), cron jobs, and generated bindings (`_generated/`). Always run `npx convex codegen` after you touch this tree.
- `packages/shared/` – cross-cutting TypeScript utilities and types consumed by both client and backend via barrel exports.
- Documentation lives in `docs/`; keep product notes (`receipts_warranties_poc.md`), OCR setup (`google-vision-integration.md`), and any runbooks here.
- Environment samples belong in the repo root (`.env.example`). The app resolves `.env` then `.env.local` before anything else.

## Build, Test, and Development Commands
- `npm install` (root) — install workspace dependencies with npm v10+ for deterministic lockfiles.
- `npm run dev:mobile -- --clear` — `npx expo start --clear` for local development; attach a simulator or Expo Go client.
- `npx convex dev` — run Convex locally against your dev deployment. Use `npx convex push` when you are ready to update a remote deployment.
- `npm run lint` — `eslint --ext .ts,.tsx apps/mobile/src packages/shared/src convex` with Prettier integration.
- `npm test` — reserved for Jest suites (UI + Convex harness once added).

## Coding Style & Naming Conventions
Use strict TypeScript throughout. Prettier formatting: 2-space indent, single quotes, trailing commas. React components should be `PascalCase`, hooks prefixed with `use*`, Convex mutations/queries named `{verb}{Noun}` (e.g. `addCoupon`). Keep inline styles minimal; shared values belong in configuration modules (`packages/shared/config.ts`).

## Data Sync & Features
- The `BenefitsProvider` hydrates from AsyncStorage, syncs with Convex, and exposes `add*`/`remove*` helpers. Deletions immediately update local state and fire Convex mutations in the background.
- Coupons and warranties live in Convex tables with `createdAt` timestamps; reminder logic will eventually run via `checkExpiringBenefits` cron.
- `AddBenefitScreen` lets contributors capture a benefit photo (camera or gallery), transcodes to JPEG with `expo-image-manipulator`, runs Google Vision OCR via `analyzeBenefitImage`, and pre-fills coupon/warranty fields before saving.
- Successful saves dispatch a `CommonActions.reset` back to `Wallet`, so avoid stacking navigations when linking into `AddBenefitScreen`; always assume the stack is collapsed after creation.
- Navigation buttons use `NoFeedbackPressable` from `apps/mobile/src/components/` to avoid pressed-state flashes when transitioning screens; reuse it for future navigation triggers.
- Shared UI colors live under `apps/mobile/src/theme/colors.ts`; import from there instead of hardcoding hex values to keep the mobile palette consistent.
- Wallet UI pulls prominent stats and skeleton placeholders from `BenefitOverviewScreen`; when adding new sections, lean on `spacing` constants (`apps/mobile/src/theme/spacing.ts`) to stay aligned.
- The Add flow now surfaces an action sheet (see `AppsNavigator` headerRight) and haptic helpers in `utils/haptics.ts`; reuse these utilities rather than calling `expo-haptics` directly.
- Add Benefit screen supports inline validation (see `couponErrors`/`warrantyErrors`)—prefer extending that structure instead of new alerts when you add fields.

## Testing Guidelines
Target Jest + React Native Testing Library for the Expo app and Convex’s testing harness for backend logic. Place mobile tests in `apps/mobile/__tests__/` mirroring screen/component names (`BenefitOverviewScreen.test.tsx`) and backend tests in `convex/__tests__/`. Aim for ≥80 % coverage on capture/import flows, sync logic, and reminder scheduling.

## Commit & Pull Request Guidelines
Use Conventional Commits (`feat:`, `fix:`, `chore:`) referencing issue IDs when possible. PRs should summarize scope, list manual/automated test results, and attach UI screenshots/emulator recordings for visible changes. Request review before merging, ensure CI (lint, future tests) passes, and squash merge to keep history tidy.

## Security & Configuration Tips
Never commit secrets. `EXPO_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`, and `CONVEX_AUTH_TOKEN` belong in `.env.local`. Rotate tokens immediately if they leak and document the rotation in your PR. Lock mobile builds to minimum OS versions and use Expo’s EAS secrets management before generating release builds.
- Google Vision credentials live in Convex environment variables (`GOOGLE_VISION_PROJECT_ID`, `GOOGLE_VISION_CLIENT_EMAIL`, `GOOGLE_VISION_PRIVATE_KEY`). Set them with `npx convex env set` and mirror public flags in `.env.local` only when necessary.
