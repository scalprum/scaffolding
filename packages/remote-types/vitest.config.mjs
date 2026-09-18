import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: './packages/remote-types',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30_000,
  },
});
