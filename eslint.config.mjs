export default [
  {
    ignores: ['node_modules', 'dist']
  },
  {
    files: ['apps/mobile/**/*.{ts,tsx}', 'packages/shared/**/*.ts', 'convex/**/*.ts'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      'no-console': 'warn'
    }
  }
];
