// jsdom doesn't implement window.scrollTo. Modal's useScrollLock invokes
// it on unlock; stub it so the warnings don't flood test output. Tests that
// actually need to verify scrollTo calls do it via vi.spyOn locally.
if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
  // Replace only if not already replaced by a test spy.
  const original = window.scrollTo;
  window.scrollTo = ((...args: unknown[]) => {
    // No-op in jsdom. Real browser behavior is tested via Playwright.
    void args;
  }) as typeof window.scrollTo;
  // Preserve original for restoration if a test needs it.
  (window as unknown as { __originalScrollTo?: typeof window.scrollTo }).__originalScrollTo = original;
}

// Extends Vitest's `expect` with the @testing-library/jest-dom matchers
// (toBeInTheDocument, toHaveAttribute, toBeDisabled, etc.) and registers
// their TypeScript augmentations.
//
// With `globals: true` in vitest.config.ts, @testing-library/react also
// auto-registers its own afterEach cleanup — no manual hook needed here.
import '@testing-library/jest-dom/vitest';
