import type { ConfigContext, ExpoConfig } from 'expo/config';
import path from 'path';
import dotenv from 'dotenv';

const loadEnv = () => {
  const root = path.resolve(__dirname, '..', '..');
  dotenv.config({ path: path.join(root, '.env') });
  dotenv.config({ path: path.join(root, '.env.local') });
};

loadEnv();

const baseConfig = require('./app.json');

export default ({ config }: ConfigContext): ExpoConfig => {
  const envUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
  const existingExtra = baseConfig.expo?.extra ?? {};

  return {
    ...config,
    ...baseConfig.expo,
    extra: {
      ...existingExtra,
      EXPO_PUBLIC_CONVEX_URL: envUrl ?? existingExtra.EXPO_PUBLIC_CONVEX_URL ?? '',
    },
  };
};
