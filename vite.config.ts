/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  test: {
    // jsdom for everything: the pure-logic suites are unaffected by it, and a
    // single environment avoids per-file configuration.
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./src/test/setup.ts'],
    // Mocks are restored between tests so no suite can leak state into
    // another, which keeps the run order irrelevant.
    restoreMocks: true,
    clearMocks: true,
    // Integration tests mount lazily-loaded route chunks; the default 5s is
    // tight on a cold module graph. Not a substitute for determinism — no test
    // waits on a timer, they all wait on an assertion becoming true.
    testTimeout: 15_000
  }
});
