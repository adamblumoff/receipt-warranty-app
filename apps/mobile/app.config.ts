import type { ConfigContext, ExpoConfig } from 'expo/config';
import dotenv from 'dotenv';
import path from 'path';

const projectRoot = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(projectRoot, '.env') });
dotenv.config({ path: path.join(projectRoot, '.env.local') });

export default ({ config }: ConfigContext): ExpoConfig => {
  const extra = config.extra ?? {};
  const eas = {
    ...(typeof extra.eas === 'object' && extra.eas !== null ? extra.eas : {}),
    projectId: '28387eb9-ca0e-4c7b-a9ef-589f722bbaca',
  };
  return {
    ...config,
    name: 'Receipt Warranty Vault',
    slug: 'receipt-warranty-app',
    scheme: 'receiptwarranty',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    updates: {
      fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ['**/*'],
    plugins: ['expo-notifications'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.adamblumoff.receiptwarrantyapp',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.adamblumoff.receiptwarrantyapp',
      notification: {
        color: '#111827',
      },
    },
    web: {
      bundler: 'metro',
      output: 'single',
    },
    extra: {
      ...extra,
      eas,
      EXPO_PUBLIC_CONVEX_URL: process.env.EXPO_PUBLIC_CONVEX_URL ?? '',
    },
  };
};
