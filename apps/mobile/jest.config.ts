import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo/ios/android',
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
};

export default config;
