# Google Vision Integration Guide

## Overview
Use Google Cloud Vision to extract structured details from uploaded coupon and warranty images. This guide covers project setup, secret management, Convex backend wiring, and Expo client changes tailored to the receipt-warranty app.

## Prerequisites
- Google Cloud account with billing enabled.
- `gcloud` CLI v.450+ installed locally (optional but recommended).
- Existing Convex deployment (`npx convex dev` / `push`) and Expo mobile app running with `.env.local` configured.

## 1. Create and Configure the Google Cloud Project
1. `gcloud projects create receipt-warranty-vision` (replace with your ID) or create via console.
2. Set it as default: `gcloud config set project receipt-warranty-vision`.
3. Enable the API: `gcloud services enable vision.googleapis.com`.
4. Create a service account (e.g., `vision-runner`) scoped to the project.
5. Grant **Cloud Vision API User** and **Storage Object Viewer** (if you plan to read from GCS) roles.
6. Generate a JSON key and store it securely outside the repo (e.g., `~/.config/gcp/vision-runner.json`).

## 2. Manage Secrets Safely
1. Extract credentials:
   - `client_email`
   - `private_key` (escape newlines when pasting)
   - `project_id`
2. Add them to Convex: `npx convex env set GOOGLE_VISION_CLIENT_EMAIL` etc.
3. Mirror the values in `.env.local` for Expo under matching names (e.g., `EXPO_PUBLIC_VISION_PROJECT_ID`) if the client needs to display feature flags.
4. Never commit raw JSON keys; rotate immediately if exposure occurs.

## 3. Install Backend Dependencies
Run: `npm install @google-cloud/vision google-auth-library --workspace @receipt-warranty/convex`.
Add `jimp` to preprocess low-quality uploads (denoise + upscale) before passing them to Vision. This keeps heavy image tooling on the backend only.
Create a thin upload helper (`convex/mutations/uploads.ts`) returning `ctx.storage.generateUploadUrl()` so the mobile app can request signed URLs without touching the built-in storage module directly.

## 4. Implement Convex Action
1. Create `convex/actions/vision.ts` and add a top-level `'use node';` directive.
2. Instantiate the Vision client:
   ```ts
   const client = new ImageAnnotatorClient({
     credentials: {
       client_email: process.env.GOOGLE_VISION_CLIENT_EMAIL,
       private_key: process.env.GOOGLE_VISION_PRIVATE_KEY,
     },
     projectId: process.env.GOOGLE_VISION_PROJECT_ID,
   });
   ```
3. Expose actions such as `analyzeBenefitImage` that accept a Convex storage ID, normalize the uploaded bytes (handles raw uploads or `multipart/form-data` from React Native), instantiate a `GoogleAuth` client (scoped to `https://www.googleapis.com/auth/cloud-platform`), run both `textDetection` and `documentTextDetection`, and return normalized field suggestions (merchant, purchase date, expiry, total).
4. Update `convex/cron.ts` if reminder scheduling should react to parsed expiry dates.
5. Run `npx convex codegen` after adding the action or upload mutation.

## 5. Wire the Expo Client
1. Extend `apps/mobile/src/providers/BenefitsProvider.tsx` with a helper (`analyzeBenefitImage`) that requests a signed URL via `api.mutations.uploads.generateUploadUrl`, uploads the file, then calls the `analyzeBenefitImage` action. Surface optimistic UI updates without reintroducing the loading jitter fix.
2. Surface parsing results on add/edit screens for confirmation before mutation submission.
3. Guard behavior when `EXPO_PUBLIC_VISION_ENABLED !== 'true'` to allow manual entry fallback.

## 6. Testing & Observability
- Create Convex harness tests (`convex/__tests__/vision.test.ts`) mocking Vision responses.
- Add React Native tests under `apps/mobile/__tests__/` for provider flows, stubbing the action response.
- Log failures in the action with context ID; avoid returning raw Vision errors to the client.

## 7. Deployment Checklist
- Confirm the service account key is stored in your secret manager (1Password, Doppler, etc.).
- Verify Convex environment variables with `npx convex env list`.
- Run `npx convex dev` and ensure the action compiles.
- Rebuild Expo (`npm run dev:mobile -- --clear`) so new env vars load.
- Document the feature flag and secrets in `AGENTS.md` and `docs/receipts_warranties_poc.md`.

## Troubleshooting
- **401 Unauthorized**: check service account roles and that credentials match the project.
- **ENOTFOUND Vision endpoint**: corporate VPNs may block outbound traffic; retry off VPN.
- **Convex build fails**: ensure `"use node";` is present and the action exports only functions, not default exports.
- **Expo warns about missing URL**: confirm `.env.local` contains `EXPO_PUBLIC_CONVEX_URL` and restart Metro with `--clear`.

## Next Steps
- Automate key rotation reminders alongside the existing `checkExpiringBenefits` cron.
- Add an onboarding checklist to `AGENTS.md` once OCR is live.
