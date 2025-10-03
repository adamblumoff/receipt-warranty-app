import Constants from 'expo-constants';
import { ConvexReactClient } from 'convex/react';

const fallbackUrl = 'http://localhost:8187';

const resolveConfiguredUrl = (): string | undefined => {
  const candidates = [Constants.expoConfig?.extra, Constants.manifest?.extra];
  for (const extra of candidates) {
    if (extra && typeof extra === 'object' && extra !== null) {
      const value = (extra as Record<string, unknown>).EXPO_PUBLIC_CONVEX_URL;
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
  }
  return undefined;
};

const configuredUrl = resolveConfiguredUrl();
const convexUrl = configuredUrl ?? fallbackUrl;

if (!configuredUrl) {
  console.warn(
    `EXPO_PUBLIC_CONVEX_URL not found in Expo config. Falling back to ${fallbackUrl}. Convex operations will fail until a valid endpoint is supplied.`,
  );
}

export const convexClient = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});
