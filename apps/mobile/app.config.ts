import type { ConfigContext, ExpoConfig } from 'expo/config';
import dotenv from 'dotenv';
import path from 'path';

const projectRoot = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(projectRoot, '.env') });
dotenv.config({ path: path.join(projectRoot, '.env.local') });

export default ({ config }: ConfigContext): ExpoConfig => {
  const extra = config.extra ?? {};
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
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
    },
    web: {
      bundler: 'metro',
      output: 'single',
    },
    extra: {
      ...extra,
      EXPO_PUBLIC_CONVEX_URL: process.env.EXPO_PUBLIC_CONVEX_URL ?? '',
    },
  };
};
