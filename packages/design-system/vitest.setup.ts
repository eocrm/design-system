// Extends Vitest's `expect` with the @testing-library/jest-dom matchers
// (toBeInTheDocument, toHaveAttribute, toBeDisabled, etc.) and registers
// their TypeScript augmentations.
//
// With `globals: true` in vitest.config.ts, @testing-library/react also
// auto-registers its own afterEach cleanup — no manual hook needed here.
import '@testing-library/jest-dom/vitest';
