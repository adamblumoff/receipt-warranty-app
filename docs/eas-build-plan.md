# Option 1: EAS Build Plan for Local OCR Support

This plan keeps the fast local OCR path while pushing all native iOS work to Expo's macOS builders.

## 1. Prerequisites
- Expo account with access to the project (`expo login`).
- `eas-cli` installed (`npm install -g eas-cli`).
- Apple Developer credentials (App Store Connect access) for signing.
- Android Keystore (optional for Android builds; iOS is the priority).
- Verify bundle identifiers in `apps/mobile/app.config.ts`:
  - iOS `bundleIdentifier`: `com.adamblumoff.receiptwarrantyapp`
  - Android `package`: `com.adamblumoff.receiptwarrantyapp`

## 2. Configure EAS
1. From `apps/mobile/`, run `eas login`.
2. Configure the project once: `eas build:configure` (will read `eas.json`).
3. Commit any changes EAS makes (credentials, etc.).

`apps/mobile/eas.json` contains three profiles:
- `development`: internal dev client with `developmentClient: true`.
- `preview`: internal distribution build for QA.
- `production`: store-ready build.

Example command for local dev client:
```bash
cd apps/mobile
EAS_NO_VCS=1 eas build --profile development --platform ios
```

## 3. Build & Install Dev Client
1. Trigger the development build (see command above).
2. Once finished, download/install the build on the device (Expo provides an install link/QR).
3. Start the JS bundle with `npm run dev:mobile -- --dev-client` (or `npx expo start --dev-client`).
4. Install the Expo dev client build to unlock native modules as needed.

## 4. Handling Secrets
- EAS prompts for Apple credentials. Store them in `eas secret` or Expo dashboard.
- Existing `.env` files are loaded at build time (see `app.config.ts`). For production secrets, prefer EAS environment variables.

## 5. Android (optional follow-up)
- Build internal Android client: `eas build --profile development --platform android`.
- Use the same dev server (`--dev-client`).

## 6. CI/CD Considerations
- Branch protection: run `eas build --profile preview` for QA.
- Promote to production using `eas submit --platform ios --profile production`.

## 7. Runbook Summary
1. Login (`eas login`).
2. `cd apps/mobile && eas build --profile development --platform ios`.
3. Install dev build on device.
4. Start dev server with `--dev-client`.
5. Iterate quickly; when ready, use `preview` or `production` profiles.
