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
    // Pure-logic tests only — no DOM environment is needed, which keeps the
    // test stack to a single dev dependency.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Tests never reach the network; nothing here talks to Supabase.
    restoreMocks: true
  }
});
