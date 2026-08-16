import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
// Registers the jest-dom matchers AND augments Vitest's Assertion type, so
// `toBeInTheDocument()` type-checks under `tsc --noEmit` as well as running.
import '@testing-library/jest-dom/vitest';

// React Testing Library's automatic cleanup only registers itself when Vitest
// globals are enabled, so it is wired up manually here. Without it, components
// from one test would still be mounted during the next.
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

/**
 * jsdom does not implement matchMedia, which ThemeContext queries on mount.
 * Reports "light" so theme-dependent rendering is deterministic.
 */
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    })
  });
}

/**
 * Fail loudly if any test attempts a real network request.
 *
 * The suite must never reach Supabase: every boundary is mocked. Without this
 * guard a forgotten mock would silently make a live call and produce a flaky,
 * credential-dependent test.
 */
globalThis.fetch = (() => {
  throw new Error(
    'Unexpected network call in tests. Mock the data layer instead of reaching Supabase.'
  );
}) as unknown as typeof fetch;
