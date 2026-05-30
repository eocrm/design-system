# `<ErrorState>` + `<Screen>` + 404/Error Mockups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship two library primitives — `<ErrorState>` (page-status block) and `<Screen>` (full-bleed screen layout) — then build 404 + error-boundary mockups (in-app + standalone variants) on them and refactor the Login mockup onto `<Screen>`.

**Architecture:** `<ErrorState>` mirrors `<EmptyState>`'s stacked-content shape (icon · title · description · actions) plus a `tone` (neutral/danger), an `extra` slot, page-level defaults (`size="lg"`, `headingLevel={1}`), and a `role="alert"` on danger. `<Screen>` is a layout-owning primitive (the documented Rule-4 exception, like `Page`/`Rail`) providing header/centered-main/footer slots, a `fill` (viewport/block) and a tinted `backdrop`. The four mockups are thin compositions; the AppShell full-bleed guard generalizes from one path to a `Set`.

**Tech Stack:** React 18 + TypeScript, CSS Modules + SCSS (token-only), Vitest + React Testing Library, npm workspaces, react-router-dom (playground only), lucide-react icons (playground only).

**Branch:** `feat/error-state-screen` (already created off `main`; the spec doc is already committed there).

---

## Conventions every task follows

- **Library gates** (Tasks 1–3, run from `packages/design-system/`): `npm test`, `npm run typecheck`, `npm run lint:css`, `npm run build`. TDD single-file run: `npx vitest run src/components/<Name>/<Name>.test.tsx`.
- **Playground gates** (Tasks 4–7, run from repo root): `make build` (typecheck + bundle) and `make lint`. `make test` runs the full suite.
- **Spread order:** Pattern A (`{...props}`/`{...rest}` last) for both new components — they have no locked ARIA contract a consumer mustn't override (ErrorState's `role="alert"` is a _default_ the consumer may override).
- **No i18n** on either component (every string is consumer-supplied, like `EmptyState`). Mockups use plain English strings (mockups are playground; Hard rule 9 is library-only).
- Commit messages end with the `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` trailer.

## File structure (what each new/changed file is responsible for)

**Library — new:**

- `packages/design-system/src/components/ErrorState/ErrorState.tsx` — component + props + JSDoc.
- `packages/design-system/src/components/ErrorState/ErrorState.module.scss` — layout/typography (tokens only).
- `packages/design-system/src/components/ErrorState/ErrorState.tokens.scss` — component tokens (default to primitives).
- `packages/design-system/src/components/ErrorState/ErrorState.test.tsx` — unit tests.
- `packages/design-system/src/components/ErrorState/index.ts` — re-export.
- `packages/design-system/src/components/Screen/Screen.tsx` / `.module.scss` / `.tokens.scss` / `.test.tsx` / `index.ts` — same shape.

**Library — modified:** `src/index.ts` (re-exports), `src/_meta/manifest.ts` + `scripts/generate-manifest.mjs` (CLUSTERS), `src/components.manifest.json` (regenerated), `AGENTS.md` (TL;DRs), `src/components/TODO.md` (tick AuthScreen).

**Playground — new mockups:** `src/pages/mockups/NotFound/NotFound.tsx` + `NotFoundStandalone.tsx`, `src/pages/mockups/AppError/AppError.tsx` + `AppErrorStandalone.tsx`.

**Playground — new demos:** `src/pages/components/ErrorStateDemo.tsx`, `src/pages/components/ScreenDemo.tsx`.

**Playground — modified:** `src/App.tsx` (routes), `src/layout/AppShell/AppShell.tsx` (guard + nav), `src/pages/components/ComponentsIndex.tsx` (cards), `src/pages/mockups/registry.ts` (union + entries + Login), `src/pages/mockups/Login/Login.tsx` (refactor).

---

## Task 1: `<ErrorState>` library component

**Files:**

- Create: `packages/design-system/src/components/ErrorState/ErrorState.tsx`
- Create: `packages/design-system/src/components/ErrorState/ErrorState.module.scss`
- Create: `packages/design-system/src/components/ErrorState/ErrorState.tokens.scss`
- Create: `packages/design-system/src/components/ErrorState/ErrorState.test.tsx`
- Create: `packages/design-system/src/components/ErrorState/index.ts`
- Modify: `packages/design-system/src/index.ts` (after the EmptyState export block, line 138)
- Modify: `packages/design-system/src/_meta/manifest.ts` (CLUSTERS, after `EmptyState: 'Display',` line 88)
- Modify: `packages/design-system/scripts/generate-manifest.mjs` (CLUSTERS, after `EmptyState: 'Display',` line 66)
- Regenerate: `packages/design-system/src/components.manifest.json`

- [ ] **Step 1: Write the failing test** — `ErrorState.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders the title as a semantic heading (default h1)', () => {
    render(<ErrorState title="Page not found" />);
    expect(screen.getByRole('heading', { name: 'Page not found' }).tagName).toBe('H1');
  });

  it('headingLevel={2} renders as h2; out-of-range clamps to h1', () => {
    const { rerender } = render(<ErrorState title="X" headingLevel={2} />);
    expect(screen.getByRole('heading', { name: 'X' }).tagName).toBe('H2');
    // @ts-expect-error — intentional invalid value to test runtime clamp
    rerender(<ErrorState title="X" headingLevel={9} />);
    expect(screen.getByRole('heading', { name: 'X' }).tagName).toBe('H1');
  });

  it('defaults to size="lg", align="center", tone="neutral"', () => {
    const { container } = render(<ErrorState title="X" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/size-lg/);
    expect(root.className).toMatch(/align-center/);
    expect(root.className).toMatch(/tone-neutral/);
  });

  it('applies size + align class names', () => {
    const { container, rerender } = render(<ErrorState title="X" size="sm" align="start" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-sm/);
    expect((container.firstChild as HTMLElement).className).toMatch(/align-start/);
    rerender(<ErrorState title="X" size="md" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-md/);
  });

  it('tone="danger" sets role="alert" and the danger tone class', () => {
    const { container } = render(<ErrorState title="X" tone="danger" />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveAttribute('role', 'alert');
    expect(root.className).toMatch(/tone-danger/);
  });

  it('tone="neutral" (default) sets no role', () => {
    const { container } = render(<ErrorState title="X" />);
    expect(container.firstChild).not.toHaveAttribute('role');
  });

  it('a consumer role prop overrides the danger default', () => {
    const { container } = render(<ErrorState title="X" tone="danger" role="status" />);
    expect(container.firstChild).toHaveAttribute('role', 'status');
  });

  it('renders icon / description / actions / extra when provided, omits when not', () => {
    const { container } = render(
      <ErrorState
        title="X"
        icon={<svg data-testid="icon" />}
        description="desc"
        actions={<button type="button">Go</button>}
        extra={<span data-testid="extra">ID 1</span>}
      />,
    );
    expect(container.querySelector('[data-testid="icon"]')).toBeInTheDocument();
    expect(screen.getByText('desc')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
    expect(screen.getByTestId('extra')).toBeInTheDocument();

    const { container: bare } = render(<ErrorState title="X" />);
    expect(bare.querySelector('[class*="icon"]')).toBeNull();
    expect(bare.querySelector('p')).toBeNull();
    expect(bare.querySelector('[class*="actions"]')).toBeNull();
    expect(bare.querySelector('[class*="extra"]')).toBeNull();
  });

  it('renders extra after actions in DOM order', () => {
    const { container } = render(
      <ErrorState
        title="X"
        actions={<button type="button">Go</button>}
        extra={<span data-testid="extra">ID</span>}
      />,
    );
    const actions = container.querySelector('[class*="actions"]')!;
    const extra = container.querySelector('[class*="extra"]')!;
    // eslint-disable-next-line no-bitwise
    expect(actions.compareDocumentPosition(extra) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders the outer element as <section> and forwards ref to it', () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<ErrorState title="X" ref={ref} />);
    expect(container.firstChild?.nodeName).toBe('SECTION');
    expect(ref.current?.tagName).toBe('SECTION');
  });

  it('merges className and spreads other attrs onto the section', () => {
    const { container } = render(<ErrorState title="X" className="my-cls" data-foo="bar" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/my-cls/);
    expect(root).toHaveAttribute('data-foo', 'bar');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/ErrorState/ErrorState.test.tsx`
Expected: FAIL — `Failed to resolve import './ErrorState'`.

- [ ] **Step 3: Create the tokens** — `ErrorState.tokens.scss`

```scss
// ErrorState.tokens.scss — Component-scoped tokens for <ErrorState>. Mirrors the
// EmptyState scale (gap + padding + type) and adds per-tone icon colors. The
// internal 48ch description max-width literal lives in the .module.scss and
// stays a raw value (readable-width cap, not a token).
:root {
  // Size — outer gap + padding
  --error-state-gap-sm: var(--space-2);
  --error-state-gap-md: var(--space-3);
  --error-state-gap-lg: var(--space-4);
  --error-state-padding-sm: var(--space-3);
  --error-state-padding-md: var(--space-6);
  --error-state-padding-lg: var(--space-10);

  // Icon — tinted per tone
  --error-state-icon-fg-neutral: var(--color-fg-muted);
  --error-state-icon-fg-danger: var(--color-danger);
  --error-state-icon-line-height: var(--line-height-none);

  // Title
  --error-state-title-fg: var(--color-fg);
  --error-state-title-font-weight: var(--font-weight-semibold);
  --error-state-title-line-height: var(--line-height-tight);
  --error-state-title-font-size-sm: var(--font-size-sm);
  --error-state-title-font-size-md: var(--font-size-md);
  --error-state-title-font-size-lg: var(--font-size-xl);

  // Description
  --error-state-description-fg: var(--color-fg-subtle);
  --error-state-description-line-height: var(--line-height-normal);
  --error-state-description-font-size-sm: var(--font-size-sm);
  --error-state-description-font-size-md: var(--font-size-md);
}
```

- [ ] **Step 4: Create the styles** — `ErrorState.module.scss`

```scss
@use './ErrorState.tokens';

.errorState {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.align-center {
  align-items: center;
  text-align: center;
}

.align-start {
  align-items: flex-start;
  text-align: start;
}

// Size modifiers — gap between stacked children + outer padding.
.size-sm {
  gap: var(--error-state-gap-sm);
  padding: var(--error-state-padding-sm);
}

.size-md {
  gap: var(--error-state-gap-md);
  padding: var(--error-state-padding-md);
}

.size-lg {
  gap: var(--error-state-gap-lg);
  padding: var(--error-state-padding-lg);
}

// Icon — color comes from the tone modifier below. Consumer-supplied SVG
// inherits via currentColor (lucide convention).
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: var(--error-state-icon-line-height);
}

.tone-neutral .icon {
  color: var(--error-state-icon-fg-neutral);
}

.tone-danger .icon {
  color: var(--error-state-icon-fg-danger);
}

// stylelint-disable property-disallowed-list -- defensive reset of user-agent <h*> margins; not a layout property on the component box.
.title {
  margin: 0;
  color: var(--error-state-title-fg);
  font-weight: var(--error-state-title-font-weight);
  line-height: var(--error-state-title-line-height);
}
// stylelint-enable property-disallowed-list

.size-sm .title {
  font-size: var(--error-state-title-font-size-sm);
}

.size-md .title {
  font-size: var(--error-state-title-font-size-md);
}

.size-lg .title {
  font-size: var(--error-state-title-font-size-lg);
}

// stylelint-disable property-disallowed-list -- `margin: 0` resets the user-agent
// <p> margin; `max-width: 48ch` caps readable line length. Neither is a layout
// property on the component box.
.description {
  margin: 0;
  color: var(--error-state-description-fg);
  line-height: var(--error-state-description-line-height);
  max-width: 48ch;
}
// stylelint-enable property-disallowed-list

.size-sm .description {
  font-size: var(--error-state-description-font-size-sm);
}

.size-md .description,
.size-lg .description {
  font-size: var(--error-state-description-font-size-md);
}

// Shrink-to-fit wrappers around the consumer's slots. inline-flex keeps a lone
// child from stretching the column when align="start". Spacing above comes from
// .errorState's gap, not padding here.
.actions {
  display: inline-flex;
  align-items: center;
}

.extra {
  display: inline-flex;
  align-items: center;
}
```

- [ ] **Step 5: Create the component** — `ErrorState.tsx`

```tsx
import { createElement, forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './ErrorState.module.scss';

/** Visual size. Tracks the typography + spacing scale (mirrors EmptyState). */
export type ErrorStateSize = 'sm' | 'md' | 'lg';

/** Horizontal alignment of the stacked content. */
export type ErrorStateAlign = 'center' | 'start';

/** Status tone — drives the icon tint and the danger live-region. */
export type ErrorStateTone = 'neutral' | 'danger';

/** Valid `<h*>` heading levels. */
export type ErrorStateHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface ErrorStateProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /**
   * Icon rendered above the title. Pass a lucide icon (sized by the consumer —
   * lg=48, md=32, sm=24), custom SVG, or any ReactNode. The icon's color is set
   * by `tone`; pass `aria-hidden="true"` on it when purely decorative.
   */
  icon?: ReactNode;

  /**
   * Required title, rendered as a semantic heading (default `<h1>` — it's
   * usually the page heading). Accepts ReactNode for inline emphasis.
   */
  title: ReactNode;

  /** Optional description rendered below the title. */
  description?: ReactNode;

  /**
   * Optional action(s) below the description — a `<Button>` or a
   * `<Cluster gap="sm">` of buttons. Keep to ONE primary action.
   */
  actions?: ReactNode;

  /**
   * Optional supplemental content rendered below the actions — e.g. an
   * `Error ID: …` line or a "view status" link. Reads as metadata, not primary
   * copy. Distinct from `description`, which sits above the actions.
   */
  extra?: ReactNode;

  /**
   * Status tone. Defaults to `'neutral'`.
   * - `'neutral'` — informational (404 / not-found). Icon uses `--color-fg-muted`.
   * - `'danger'` — an error (500 / crash). Icon uses `--color-danger`, and the
   *   wrapper gets `role="alert"` so an error-boundary fallback announces on
   *   mount. Override the role by passing your own `role`.
   */
  tone?: ErrorStateTone;

  /**
   * Visual size. Defaults to `'lg'` (full-page hero). Use `'sm'` / `'md'` when
   * the state is embedded in a smaller surface.
   */
  size?: ErrorStateSize;

  /**
   * Horizontal alignment of the stacked content. Defaults to `'center'`.
   * Use `'start'` in a tight column where centering looks stranded.
   */
  align?: ErrorStateAlign;

  /**
   * Heading level for `title`. Defaults to `1` (page-level). Lower it when the
   * screen is nested under an existing heading. Values outside `1–6` clamp to `1`.
   */
  headingLevel?: ErrorStateHeadingLevel;
}

function clampHeading(level: ErrorStateHeadingLevel | undefined): ErrorStateHeadingLevel {
  if (level === undefined) return 1;
  if (level < 1 || level > 6) return 1;
  return level;
}

/**
 * Page-level status / result screen — the dedicated component `<EmptyState>`
 * points to for "page-level 404 / 500" and the danger-tinted, live-region error
 * treatment it intentionally doesn't ship. Renders an optional icon, a required
 * title (semantic heading, default `<h1>`), an optional description, optional
 * action(s), and an optional `extra` slot (e.g. an error ID), stacked
 * vertically with token-correct spacing.
 *
 * Use `<EmptyState>` for "nothing here" inside a surface; use
 * `<Alert tone="error">` for an in-flow, dismissible banner. ErrorState is a
 * whole-screen state.
 *
 * @example
 * // 404 — neutral tone
 * <ErrorState
 *   icon={<Compass size={48} aria-hidden="true" />}
 *   title="Page not found"
 *   description="The page you're looking for doesn't exist or has been moved."
 *   actions={<Button onClick={goHome}>Go to homepage</Button>}
 * />
 *
 * @example
 * // Error-boundary fallback — danger tone announces via role="alert"
 * <ErrorState
 *   tone="danger"
 *   icon={<TriangleAlert size={48} aria-hidden="true" />}
 *   title="Something went wrong"
 *   description="An unexpected error occurred. We've logged it."
 *   actions={
 *     <Cluster gap="sm" justify="center">
 *       <Button onClick={reset}>Try again</Button>
 *       <Button variant="secondary" onClick={goHome}>Go home</Button>
 *     </Cluster>
 *   }
 *   extra={<Text size="sm" tone="muted">Error ID: a1b2-c3d4</Text>}
 * />
 *
 * @example
 * // Centered inside a Screen (standalone page)
 * <Screen backdrop="accent">
 *   <ErrorState title="Page not found" actions={<Button>Go home</Button>} />
 * </Screen>
 *
 * @remarks When NOT to use
 * - **In-surface empty state** (empty table, no search results) → `<EmptyState>`.
 *   ErrorState is page-level; EmptyState lives inside a card / section.
 * - **In-flow notification** (a banner above a form) → `<Alert tone="error">`.
 * - **A status the tone scale doesn't cover** (warning / success) → extend the
 *   `ErrorStateTone` union; don't repurpose `danger`.
 *
 * @remarks Anti-patterns
 * - Multiple primary buttons. One clear primary; secondaries are
 *   `variant="secondary"` / `ghost`.
 * - A long sentence as `title` — it's the page heading, keep it short.
 *
 * @remarks A11y
 * - `tone="danger"` sets `role="alert"` so a boundary fallback is announced
 *   assertively on mount. Override by passing `role`.
 * - The icon is NOT auto-`aria-hidden` — pass `aria-hidden="true"` for a
 *   decorative icon (the title carries the meaning).
 */
export const ErrorState = forwardRef<HTMLElement, ErrorStateProps>(function ErrorState(
  {
    icon,
    title,
    description,
    actions,
    extra,
    tone = 'neutral',
    size = 'lg',
    align = 'center',
    headingLevel,
    className,
    ...props
  },
  ref,
) {
  const headingTag = `h${clampHeading(headingLevel)}` as const;

  // role="alert" on danger so an error-boundary fallback announces on mount.
  // Set before {...props} (Pattern A) so a consumer can override role/aria-*.
  return (
    <section
      ref={ref}
      role={tone === 'danger' ? 'alert' : undefined}
      className={clsx(
        styles.errorState,
        styles[`size-${size}`],
        styles[`align-${align}`],
        styles[`tone-${tone}`],
        className,
      )}
      {...props}
    >
      {icon != null && <span className={styles.icon}>{icon}</span>}
      {createElement(headingTag, { className: styles.title }, title)}
      {description != null && <p className={styles.description}>{description}</p>}
      {actions != null && <div className={styles.actions}>{actions}</div>}
      {extra != null && <div className={styles.extra}>{extra}</div>}
    </section>
  );
});
```

- [ ] **Step 6: Create the barrel** — `ErrorState/index.ts`

```ts
export { ErrorState } from './ErrorState';
export type {
  ErrorStateProps,
  ErrorStateSize,
  ErrorStateAlign,
  ErrorStateTone,
  ErrorStateHeadingLevel,
} from './ErrorState';
```

- [ ] **Step 7: Re-export from `src/index.ts`** — insert immediately after the EmptyState block (after line 138, `} from './components/EmptyState';`)

```ts
export { ErrorState } from './components/ErrorState';
export type {
  ErrorStateProps,
  ErrorStateSize,
  ErrorStateAlign,
  ErrorStateTone,
  ErrorStateHeadingLevel,
} from './components/ErrorState';
```

- [ ] **Step 8: Classify in BOTH manifest sources.** In `src/_meta/manifest.ts`, add to `CLUSTERS` right after `EmptyState: 'Display',`:

```ts
  ErrorState: 'Display',
```

In `scripts/generate-manifest.mjs`, add the identical line after its `EmptyState: 'Display',`.

- [ ] **Step 9: Regenerate the manifest**

Run: `cd packages/design-system && npm run build:manifest`
Expected: `src/components.manifest.json` updated to include an `"ErrorState"` entry with `"cluster": "Display"`, `"tier": "primitive"`.

- [ ] **Step 10: Run the test to verify it passes**

Run: `cd packages/design-system && npx vitest run src/components/ErrorState/ErrorState.test.tsx`
Expected: PASS (all cases).

- [ ] **Step 11: Run the full library gates**

Run: `cd packages/design-system && npm test && npm run typecheck && npm run lint:css && npm run build`
Expected: all green (includes `structure.test` — ErrorState has its 4 files + is re-exported — and the manifest drift test — json matches CLUSTERS).

- [ ] **Step 12: Commit**

```bash
git add packages/design-system/src/components/ErrorState packages/design-system/src/index.ts \
  packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs \
  packages/design-system/src/components.manifest.json
git commit -m "feat: add <ErrorState> page-status primitive

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `<Screen>` library component

**Files:**

- Create: `packages/design-system/src/components/Screen/Screen.tsx`
- Create: `packages/design-system/src/components/Screen/Screen.module.scss`
- Create: `packages/design-system/src/components/Screen/Screen.tokens.scss`
- Create: `packages/design-system/src/components/Screen/Screen.test.tsx`
- Create: `packages/design-system/src/components/Screen/index.ts`
- Modify: `packages/design-system/src/index.ts` (after the Page export, line 182)
- Modify: `packages/design-system/src/_meta/manifest.ts` (CLUSTERS, after `Page: 'Layout',`)
- Modify: `packages/design-system/scripts/generate-manifest.mjs` (CLUSTERS, after `Page: 'Layout',`)
- Regenerate: `packages/design-system/src/components.manifest.json`

- [ ] **Step 1: Write the failing test** — `Screen.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Screen } from './Screen';

describe('Screen', () => {
  it('renders children inside the main slot', () => {
    render(<Screen>hello</Screen>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('defaults to fill="viewport", backdrop="none", align="center"', () => {
    const { container } = render(<Screen>x</Screen>);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/fillViewport/);
    expect(root.className).not.toMatch(/backdrop/);
    // main carries the align class
    const main = root.querySelector('[class*="main"]') as HTMLElement;
    expect(main.className).toMatch(/alignCenter/);
  });

  it('fill="block" swaps the fill class', () => {
    const { container } = render(<Screen fill="block">x</Screen>);
    expect((container.firstChild as HTMLElement).className).toMatch(/fillBlock/);
  });

  it('applies each backdrop class', () => {
    const { container, rerender } = render(<Screen backdrop="plain">x</Screen>);
    expect((container.firstChild as HTMLElement).className).toMatch(/backdropPlain/);
    rerender(<Screen backdrop="accent">x</Screen>);
    expect((container.firstChild as HTMLElement).className).toMatch(/backdropAccent/);
    rerender(<Screen backdrop="danger">x</Screen>);
    expect((container.firstChild as HTMLElement).className).toMatch(/backdropDanger/);
  });

  it('align="start" swaps the main align class', () => {
    const { container } = render(<Screen align="start">x</Screen>);
    const main = (container.firstChild as HTMLElement).querySelector(
      '[class*="main"]',
    ) as HTMLElement;
    expect(main.className).toMatch(/alignStart/);
  });

  it('renders header and footer when provided', () => {
    render(
      <Screen header={<span data-testid="hdr">H</span>} footer={<span data-testid="ftr">F</span>}>
        x
      </Screen>,
    );
    expect(screen.getByTestId('hdr')).toBeInTheDocument();
    expect(screen.getByTestId('ftr')).toBeInTheDocument();
  });

  it('root has only the main child when header/footer omitted; three when both provided', () => {
    const { container } = render(<Screen>x</Screen>);
    expect((container.firstChild as HTMLElement).children).toHaveLength(1);
    const { container: c2 } = render(
      <Screen header={<i />} footer={<i />}>
        x
      </Screen>,
    );
    expect((c2.firstChild as HTMLElement).children).toHaveLength(3);
  });

  it('forwards ref to the root div and merges className / spreads attrs', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Screen ref={ref} className="my-cls" data-foo="bar">
        x
      </Screen>,
    );
    expect(ref.current).toBe(container.firstChild);
    expect((container.firstChild as HTMLElement).className).toMatch(/my-cls/);
    expect(container.firstChild).toHaveAttribute('data-foo', 'bar');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/Screen/Screen.test.tsx`
Expected: FAIL — `Failed to resolve import './Screen'`.

- [ ] **Step 3: Create the tokens** — `Screen.tokens.scss`

```scss
// Screen.tokens.scss — Component-scoped tokens for <Screen>. Padding, the
// block-fill min-height, and the three backdrops. Backdrop gradients reference
// color primitives for their stops (geometry percentages are not tokenized
// values); custom-property declarations are exempt from declaration-strict-value.
:root {
  --screen-padding: var(--space-6);
  --screen-block-min-height: 60vh;

  --screen-backdrop-plain: var(--color-bg-subtle);
  --screen-backdrop-accent: radial-gradient(
    120% 90% at 50% -8%,
    var(--color-accent-subtle-bg) 0%,
    var(--color-bg-subtle) 52%
  );
  --screen-backdrop-danger: radial-gradient(
    120% 90% at 50% -8%,
    var(--color-danger-bg-subtle) 0%,
    var(--color-bg-subtle) 55%
  );
}
```

- [ ] **Step 4: Create the styles** — `Screen.module.scss`

```scss
@use './Screen.tokens';

// Screen is a layout-owning primitive — the documented exception to the
// "no layout properties on components" rule (like Page / Rail). It takes over
// the viewport (min-height) and grows its main slot (flex) because laying out a
// full-bleed screen is its entire job. (stylelint's property-disallowed-list
// blocks flex-grow / flex-basis but not the `flex` shorthand or min-height, so
// no disable is needed here.)
.root {
  display: flex;
  flex-direction: column;
  padding: var(--screen-padding);
}

.fillViewport {
  min-height: 100vh;
}

.fillBlock {
  min-height: var(--screen-block-min-height);
}

.main {
  flex: 1;
  display: grid;
}

.alignCenter {
  place-items: center;
}

.alignStart {
  place-items: start center;
}

.backdropPlain {
  background: var(--screen-backdrop-plain);
}

.backdropAccent {
  background: var(--screen-backdrop-accent);
}

.backdropDanger {
  background: var(--screen-backdrop-danger);
}
```

- [ ] **Step 5: Create the component** — `Screen.tsx`

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Screen.module.scss';

/** How tall the screen is. */
export type ScreenFill = 'viewport' | 'block';

/** Backdrop treatment behind the centered content. */
export type ScreenBackdrop = 'none' | 'plain' | 'accent' | 'danger';

/** Vertical placement of the main content. */
export type ScreenAlign = 'center' | 'start';

export interface ScreenProps extends HTMLAttributes<HTMLDivElement> {
  /** The centered main content. */
  children: ReactNode;

  /** Pinned-top slot — a back link, wordmark, etc. Omit for none. */
  header?: ReactNode;

  /** Pinned-bottom slot — legal / footer links. Omit for none. */
  footer?: ReactNode;

  /**
   * Screen height. Defaults to `'viewport'`.
   * - `'viewport'` — `min-height: 100vh`; a true standalone page (login,
   *   standalone 404 / error).
   * - `'block'` — fills its container instead of the viewport; use when the
   *   Screen is embedded inside the app shell's content area (the in-app
   *   404 / error variants).
   */
  fill?: ScreenFill;

  /**
   * Backdrop behind the content. Defaults to `'none'` (transparent — inherits
   * the surface; use with `fill="block"` inside the shell).
   * - `'plain'` — solid subtle surface.
   * - `'accent'` — accent-tinted radial (the login backdrop).
   * - `'danger'` — danger-tinted radial (standalone error screen).
   */
  backdrop?: ScreenBackdrop;

  /** Vertical placement of the main content. Defaults to `'center'`. */
  align?: ScreenAlign;
}

const fillClass: Record<ScreenFill, string> = {
  viewport: styles.fillViewport,
  block: styles.fillBlock,
};

const backdropClass: Record<ScreenBackdrop, string | undefined> = {
  none: undefined,
  plain: styles.backdropPlain,
  accent: styles.backdropAccent,
  danger: styles.backdropDanger,
};

const alignClass: Record<ScreenAlign, string> = {
  center: styles.alignCenter,
  start: styles.alignStart,
};

/**
 * Full-bleed / centered screen layout — a page-root primitive for chromeless
 * screens that render OUTSIDE the app shell: sign-in, 404, error-boundary
 * fallback, onboarding. Lays out an optional pinned `header`, a vertically +
 * horizontally centered main slot (`children`), and an optional pinned
 * `footer`, over an optional tinted backdrop.
 *
 * Screen is a layout-owning primitive — like `<Page>` / `<Rail>` it is the
 * documented exception to "no layout properties on components": taking over the
 * viewport and centering its main slot is its entire job.
 *
 * @example
 * // Standalone 404 — full viewport, accent backdrop, brand + legal chrome
 * <Screen
 *   backdrop="accent"
 *   header={<Link to="/">← Home</Link>}
 *   footer={<Cluster gap="lg"><Link>Privacy</Link><Link>Terms</Link></Cluster>}
 * >
 *   <ErrorState title="Page not found" actions={<Button>Go home</Button>} />
 * </Screen>
 *
 * @example
 * // In-app variant — fills the shell content area, no backdrop
 * <Screen fill="block">
 *   <ErrorState title="Page not found" />
 * </Screen>
 *
 * @remarks When NOT to use
 * - A normal page inside the app shell → `<Page>` (it provides section rhythm,
 *   not full-bleed chrome).
 * - Centering a small element inside an existing layout → `<Cluster
 *   justify="center">` / `<Stack align="center">`. Screen is a page root.
 *
 * @remarks Anti-patterns
 * - Nesting `<Screen>` inside `<Page>` or another `<Screen>` (compounds
 *   layout). The in-app variants use `fill="block"` + `backdrop="none"` so they
 *   don't fight the shell.
 */
export const Screen = forwardRef<HTMLDivElement, ScreenProps>(function Screen(
  {
    children,
    header,
    footer,
    fill = 'viewport',
    backdrop = 'none',
    align = 'center',
    className,
    ...rest
  },
  ref,
) {
  // {...rest} last so consumer overrides win (Pattern A).
  return (
    <div
      ref={ref}
      className={clsx(styles.root, fillClass[fill], backdropClass[backdrop], className)}
      {...rest}
    >
      {header != null && <div className={styles.header}>{header}</div>}
      <div className={clsx(styles.main, alignClass[align])}>{children}</div>
      {footer != null && <div className={styles.footer}>{footer}</div>}
    </div>
  );
});
```

> Note: `styles.header` / `styles.footer` are not declared in the SCSS (the flex column already pins them top/bottom). Referencing an undefined CSS-module class yields `undefined` → no class attribute, which is fine; adding empty rulesets would trip `block-no-empty`. The structural test asserts child count, not class names.

- [ ] **Step 6: Create the barrel** — `Screen/index.ts`

```ts
export { Screen } from './Screen';
export type { ScreenProps, ScreenFill, ScreenBackdrop, ScreenAlign } from './Screen';
```

- [ ] **Step 7: Re-export from `src/index.ts`** — insert immediately after the Page export (after line 182, `export type { PageProps, PageGap } from './components/Page';`)

```ts
export { Screen } from './components/Screen';
export type { ScreenProps, ScreenFill, ScreenBackdrop, ScreenAlign } from './components/Screen';
```

- [ ] **Step 8: Classify in BOTH manifest sources.** In `src/_meta/manifest.ts` add to `CLUSTERS` right after `Page: 'Layout',`:

```ts
  Screen: 'Layout',
```

In `scripts/generate-manifest.mjs`, add the identical line after its `Page: 'Layout',`.

- [ ] **Step 9: Regenerate the manifest**

Run: `cd packages/design-system && npm run build:manifest`
Expected: `src/components.manifest.json` gains a `"Screen"` entry with `"cluster": "Layout"`, `"tier": "primitive"`.

- [ ] **Step 10: Run the test to verify it passes**

Run: `cd packages/design-system && npx vitest run src/components/Screen/Screen.test.tsx`
Expected: PASS.

- [ ] **Step 11: Run the full library gates**

Run: `cd packages/design-system && npm test && npm run typecheck && npm run lint:css && npm run build`
Expected: all green.

- [ ] **Step 12: Commit**

```bash
git add packages/design-system/src/components/Screen packages/design-system/src/index.ts \
  packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs \
  packages/design-system/src/components.manifest.json
git commit -m "feat: add <Screen> full-bleed layout primitive

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: AGENTS.md TL;DRs for both components

**Files:**

- Modify: `packages/design-system/AGENTS.md` — add a `<Screen>` section after the `<Page>` section (currently ends ~line 916, before `### \`<Grid>\``) and an `<ErrorState>`section after the`<EmptyState>`section (currently ends ~line 1897, before`### \`<Progress>\``).

- [ ] **Step 1: Add the `<Screen>` section** after the `<Page>` block (insert before `### \`<Grid>\` — 2D layout primitive`):

````markdown
### `<Screen>` — full-bleed / centered screen layout

```tsx
// Standalone (full viewport) — auth / 404 / error
<Screen
  backdrop="accent"
  header={<Link to="/">← Home</Link>}
  footer={<Cluster gap="lg"><Link>Privacy</Link><Link>Terms</Link></Cluster>}
>
  <ErrorState title="Page not found" actions={<Button>Go home</Button>} />
</Screen>

// In-app variant — fills the shell content area instead of the viewport
<Screen fill="block">
  <ErrorState title="Page not found" />
</Screen>
```

- Page-root layout for **chromeless** screens that render outside the app shell (sign-in, 404, error, onboarding). Three slots: pinned `header`, centered `children` (main), pinned `footer`.
- `fill`: `'viewport'` (**default**, `min-height:100vh`) / `'block'` (fills its container — use inside the shell content area).
- `backdrop`: `'none'` (**default**, transparent) / `'plain'` (subtle solid) / `'accent'` (soft accent wash — the login backdrop) / `'danger'` (danger wash — standalone error).
- `align`: `'center'` (default) / `'start'` — vertical placement of the main slot.
- Layout-owning primitive (the `<Page>` / `<Rail>` exception to "no layout properties"). Don't nest inside `<Page>` or another `<Screen>`. For a normal in-shell page use `<Page>`; to center a small element use `<Cluster>` / `<Stack>`.
````

- [ ] **Step 2: Add the `<ErrorState>` section** after the `<EmptyState>` block (insert before `### \`<Progress>\` — linear progress bar`):

````markdown
### `<ErrorState>` — page-level status / result screen

```tsx
// 404 — neutral
<ErrorState
  icon={<Compass size={48} aria-hidden="true" />}
  title="Page not found"
  description="The page you're looking for doesn't exist or has been moved."
  actions={<Button>Go to homepage</Button>}
/>

// Error-boundary fallback — danger tone → role="alert"
<ErrorState
  tone="danger"
  icon={<TriangleAlert size={48} aria-hidden="true" />}
  title="Something went wrong"
  actions={<Button>Try again</Button>}
  extra={<Text size="sm" tone="muted">Error ID: a1b2-c3d4</Text>}
/>
```

- Page-level sibling of `<EmptyState>` — the component EmptyState's docs point to for "page-level 404 / 500" and danger-tinted error states. Use `<EmptyState>` for "nothing here" inside a surface; use `<Alert tone="error">` for an in-flow banner.
- Slots: `icon`, `title` (required, semantic heading), `description`, `actions`, and `extra` (below the actions — error ID, status link).
- `tone`: `'neutral'` (default — 404; muted icon) / `'danger'` (error; red icon + `role="alert"` on the wrapper so a boundary fallback announces on mount, overridable via `role`).
- `size`: `sm` / `md` / `lg` (**default** — full-page hero). `align`: `'center'` (default) / `'start'`.
- `headingLevel` defaults to `1` (the page h1); lower it when nested. Values outside 1–6 clamp to 1.
- No automatic `aria-hidden` on the icon — pass it for a decorative icon. No i18n — all copy is consumer-supplied.
````

- [ ] **Step 3: Format + verify**

Run: `npx prettier --check packages/design-system/AGENTS.md` (if it reports issues, run `npx prettier --write packages/design-system/AGENTS.md`).
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "docs: AGENTS.md TL;DRs for <ErrorState> + <Screen>

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Demo pages + component nav wiring

**Files:**

- Create: `packages/playground/src/pages/components/ErrorStateDemo.tsx`
- Create: `packages/playground/src/pages/components/ScreenDemo.tsx`
- Modify: `packages/playground/src/App.tsx` (imports + 2 component routes)
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx` (Display + Layout nav items + 2 lucide imports)
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx` (imports + 2 grid items)
- Modify: `packages/playground/src/pages/mockups/registry.ts` (add `'ErrorState'` + `'Screen'` to the `ComponentName` union — needed by the demos' `componentName` prop and the Task 5/6 entries)

- [ ] **Step 1: Extend the `ComponentName` union** in `registry.ts`. Add `| 'ErrorState'` after `| 'EmptyState'` (line 28) and `| 'Screen'` after `| 'Rail'` (line 54):

```ts
  | 'EmptyState'
  | 'ErrorState'
```

```ts
  | 'Rail'
  | 'Screen'
```

- [ ] **Step 2: Create `ErrorStateDemo.tsx`**

```tsx
import { Button, Cluster, ErrorState, Text } from '@eocrm/design-system';
import { Compass, TriangleAlert } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function ErrorStateDemo() {
  return (
    <DemoLayout
      name="ErrorState"
      componentName="ErrorState"
      description="Page-level status / result block for 404 and error screens — icon, title, description, actions, and an extra slot. Sibling to EmptyState; tone drives the icon tint and (for danger) a live region."
      files={getComponentFiles('ErrorState')}
    >
      <Example
        title="Not found (neutral)"
        description="The default tone. size defaults to lg (full-page hero), headingLevel to 1."
        code={`<ErrorState
  icon={<Compass size={48} aria-hidden="true" />}
  title="Page not found"
  description="We couldn't find that page. It may have been moved or deleted."
  actions={
    <Cluster gap="sm" justify="center">
      <Button>Back to dashboard</Button>
      <Button variant="secondary">Search</Button>
    </Cluster>
  }
/>`}
      >
        <ErrorState
          icon={<Compass size={48} aria-hidden="true" />}
          title="Page not found"
          description="We couldn't find that page. It may have been moved or deleted."
          actions={
            <Cluster gap="sm" justify="center">
              <Button>Back to dashboard</Button>
              <Button variant="secondary">Search</Button>
            </Cluster>
          }
        />
      </Example>

      <Example
        title="Error (danger + extra)"
        description={`tone="danger" tints the icon red and sets role="alert"; extra holds a support reference below the actions.`}
        code={`<ErrorState
  tone="danger"
  icon={<TriangleAlert size={48} aria-hidden="true" />}
  title="Something went wrong"
  description="An unexpected error occurred. We've logged it and our team is on it."
  actions={<Button>Try again</Button>}
  extra={<Text size="sm" tone="muted">Error ID: a1b2-c3d4</Text>}
/>`}
      >
        <ErrorState
          tone="danger"
          icon={<TriangleAlert size={48} aria-hidden="true" />}
          title="Something went wrong"
          description="An unexpected error occurred. We've logged it and our team is on it."
          actions={<Button>Try again</Button>}
          extra={
            <Text size="sm" tone="muted">
              Error ID: a1b2-c3d4
            </Text>
          }
        />
      </Example>

      <Example
        title="Sizes"
        description="sm / md / lg (default). Pair the icon size with the state size (24 / 32 / 48)."
        code={`<ErrorState size="sm" icon={<Compass size={24} aria-hidden="true" />} title="Not found" />
<ErrorState size="md" icon={<Compass size={32} aria-hidden="true" />} title="Not found" />
<ErrorState size="lg" icon={<Compass size={48} aria-hidden="true" />} title="Not found" />`}
      >
        <Cluster gap="xl" align="start">
          <ErrorState size="sm" icon={<Compass size={24} aria-hidden="true" />} title="Not found" />
          <ErrorState size="md" icon={<Compass size={32} aria-hidden="true" />} title="Not found" />
          <ErrorState size="lg" icon={<Compass size={48} aria-hidden="true" />} title="Not found" />
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 3: Create `ScreenDemo.tsx`**

```tsx
import { Button, Cluster, ErrorState, Link, Screen, Stack, Text } from '@eocrm/design-system';
import { Compass, TriangleAlert } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function ScreenDemo() {
  return (
    <DemoLayout
      name="Screen"
      componentName="Screen"
      description="Full-bleed / centered screen layout for chromeless pages — auth, 404, error, onboarding. Header + centered main + footer, with an optional tinted backdrop."
      files={getComponentFiles('Screen')}
    >
      <Example
        title="Block fill, accent backdrop"
        description={`fill="block" fills its container (not the viewport) so it's safe to embed here. backdrop="accent" paints the soft accent wash used by the login screen.`}
        code={`<Screen fill="block" backdrop="accent">
  <ErrorState
    icon={<Compass size={48} aria-hidden="true" />}
    title="Page not found"
    actions={<Button>Go to homepage</Button>}
  />
</Screen>`}
      >
        <Screen fill="block" backdrop="accent">
          <ErrorState
            icon={<Compass size={48} aria-hidden="true" />}
            title="Page not found"
            description="The page you're looking for doesn't exist or has been moved."
            actions={<Button>Go to homepage</Button>}
          />
        </Screen>
      </Example>

      <Example
        title="Danger backdrop + header / footer slots"
        description="Header is pinned top, footer pinned bottom, main centered between."
        code={`<Screen
  fill="block"
  backdrop="danger"
  header={<Text weight="bold">eocrm</Text>}
  footer={<Cluster gap="lg"><Link href="#">Privacy</Link><Link href="#">Status</Link></Cluster>}
>
  <ErrorState tone="danger" title="Something went wrong" actions={<Button>Reload</Button>} />
</Screen>`}
      >
        <Screen
          fill="block"
          backdrop="danger"
          header={
            <Cluster justify="start">
              <Text as="span" weight="bold">
                eocrm
              </Text>
            </Cluster>
          }
          footer={
            <Cluster justify="center" gap="lg">
              <Link href="#" variant="muted">
                Privacy
              </Link>
              <Link href="#" variant="muted">
                Status
              </Link>
            </Cluster>
          }
        >
          <ErrorState
            tone="danger"
            icon={<TriangleAlert size={48} aria-hidden="true" />}
            title="Something went wrong"
            description="An unexpected error occurred."
            actions={<Button>Reload</Button>}
            extra={
              <Text size="sm" tone="muted">
                Error ID: a1b2-c3d4
              </Text>
            }
          />
        </Screen>
      </Example>

      <Example
        title="Live full-viewport screens"
        description={`fill="viewport" (the default) takes over the whole window — see it in the mockups.`}
        code={`<Screen backdrop="accent">…</Screen>  // fill defaults to "viewport"`}
      >
        <Stack gap="sm">
          <Link as={RouterLink} to="/mockups/404-standalone" variant="default">
            404 — standalone page →
          </Link>
          <Link as={RouterLink} to="/mockups/error-standalone" variant="default">
            Error — standalone page →
          </Link>
          <Link as={RouterLink} to="/mockups/login" variant="default">
            Login →
          </Link>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 4: Wire routes in `App.tsx`.** Add imports near the other component-demo imports (e.g. after line 64 `import { EmptyStateDemo } ...`):

```tsx
import { ErrorStateDemo } from './pages/components/ErrorStateDemo';
import { ScreenDemo } from './pages/components/ScreenDemo';
```

Add routes inside `<Routes>` next to the EmptyState route (after line 152):

```tsx
<Route path="/components/error-state" element={<ErrorStateDemo />} />
<Route path="/components/screen" element={<ScreenDemo />} />
```

- [ ] **Step 5: Wire nav in `AppShell.tsx`.** Add two lucide imports to the existing `lucide-react` import block (Task 5/6 also use these; importing once here is fine):

```tsx
  Compass,
  TriangleAlert,
```

In `componentGroups`, add to the **Display** group's `items` (after the EmptyState entry, line 171):

```tsx
      { to: '/components/error-state', label: 'ErrorState', icon: TriangleAlert, end: false },
```

Add to the **Layout** group's `items` (after the Page entry, line 124):

```tsx
      { to: '/components/screen', label: 'Screen', icon: AppWindow, end: false },
```

(`AppWindow` is already imported at line 33.)

- [ ] **Step 6: Add overview cards in `ComponentsIndex.tsx`.** Add imports near the other library imports (after line 48 `import { EmptyState } ...`):

```tsx
import { ErrorState } from '@eocrm/design-system';
import { Screen } from '@eocrm/design-system';
import { Compass } from 'lucide-react';
```

Add two entries to the `items` array (place near the EmptyState card; the array order drives grid order):

```tsx
  {
    to: '/components/error-state',
    name: 'ErrorState',
    description: 'Page-level 404 / error status block — icon, title, actions, error ID.',
    preview: (
      <div style={{ width: '100%', maxWidth: '260px' }}>
        <ErrorState size="sm" icon={<Compass size={24} aria-hidden="true" />} title="Page not found" />
      </div>
    ),
  },
  {
    to: '/components/screen',
    name: 'Screen',
    description: 'Full-bleed / centered screen layout for auth, 404, and error pages.',
    preview: (
      <div style={{ width: '100%', maxWidth: '260px', height: '96px' }}>
        <Screen fill="block" backdrop="accent">
          <Text size="sm" tone="muted">
            Full-bleed screen
          </Text>
        </Screen>
      </div>
    ),
  },
```

(`Text` is already imported in `ComponentsIndex.tsx` at line 16.)

- [ ] **Step 7: Run the playground gates**

Run: `make build && make lint`
Expected: typecheck + bundle succeed; stylelint clean. (Visually optional: `make dev`, open `/components/error-state` and `/components/screen`.)

- [ ] **Step 8: Commit**

```bash
git add packages/playground/src/pages/components/ErrorStateDemo.tsx \
  packages/playground/src/pages/components/ScreenDemo.tsx \
  packages/playground/src/App.tsx packages/playground/src/layout/AppShell/AppShell.tsx \
  packages/playground/src/pages/components/ComponentsIndex.tsx \
  packages/playground/src/pages/mockups/registry.ts
git commit -m "feat(playground): ErrorState + Screen demo pages + nav wiring

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 404 mockups (in-app + standalone)

**Files:**

- Create: `packages/playground/src/pages/mockups/NotFound/NotFound.tsx`
- Create: `packages/playground/src/pages/mockups/NotFound/NotFoundStandalone.tsx`
- Modify: `packages/playground/src/App.tsx` (imports + 2 routes)
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx` (full-bleed guard → Set; add `Not found` nav item)
- Modify: `packages/playground/src/pages/mockups/registry.ts` (add the `404` entry)

- [ ] **Step 1: Create `NotFound.tsx` (in-app variant)**

```tsx
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Button, Cluster, ErrorState, Link, Screen } from '@eocrm/design-system';
import { Compass } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <Screen
      fill="block"
      footer={
        <Cluster justify="center">
          <Link as={RouterLink} to="/mockups/404-standalone" variant="muted">
            View as standalone page →
          </Link>
        </Cluster>
      }
    >
      <ErrorState
        tone="neutral"
        icon={<Compass size={48} aria-hidden="true" />}
        title="Page not found"
        description="We couldn't find that page. It may have been moved or deleted."
        actions={
          <Cluster gap="sm" justify="center">
            <Button onClick={() => navigate('/mockups/dashboard')}>Back to dashboard</Button>
            <Button variant="secondary" onClick={() => navigate('/mockups/contacts')}>
              Search
            </Button>
          </Cluster>
        }
      />
    </Screen>
  );
}
```

- [ ] **Step 2: Create `NotFoundStandalone.tsx` (full-bleed variant)**

```tsx
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Button, Cluster, ErrorState, Link, Screen, Stack, Text } from '@eocrm/design-system';
import { Compass } from 'lucide-react';

export function NotFoundStandalone() {
  const navigate = useNavigate();
  return (
    <Screen
      backdrop="accent"
      header={
        <Cluster justify="start">
          <Link as={RouterLink} to="/mockups" variant="muted">
            ← Back to mockups
          </Link>
        </Cluster>
      }
      footer={
        <Cluster justify="center" gap="lg">
          <Link href="/legal/privacy" variant="muted">
            Privacy
          </Link>
          <Link href="/legal/terms" variant="muted">
            Terms
          </Link>
          <Link href="/status" variant="muted">
            Status
          </Link>
        </Cluster>
      }
    >
      <Stack gap="lg" align="center">
        <Text as="span" size="xl" weight="bold">
          eocrm
        </Text>
        <ErrorState
          tone="neutral"
          icon={<Compass size={48} aria-hidden="true" />}
          title="Page not found"
          description="The page you're looking for doesn't exist or has been moved."
          actions={
            <Cluster gap="sm" justify="center">
              <Button onClick={() => navigate('/mockups')}>Go to homepage</Button>
              <Button variant="secondary" onClick={() => navigate(-1)}>
                Go back
              </Button>
            </Cluster>
          }
        />
      </Stack>
    </Screen>
  );
}
```

- [ ] **Step 3: Wire routes in `App.tsx`.** Add imports near the mockup imports (after line 13 `import { Login } ...`):

```tsx
import { NotFound } from './pages/mockups/NotFound/NotFound';
import { NotFoundStandalone } from './pages/mockups/NotFound/NotFoundStandalone';
```

Add routes after the login route (line 98):

```tsx
<Route path="/mockups/404" element={<NotFound />} />
<Route path="/mockups/404-standalone" element={<NotFoundStandalone />} />
```

- [ ] **Step 4: Generalize the full-bleed guard in `AppShell.tsx`.** Add a module constant just above `const mockupItems` (line 80):

```tsx
// Routes that render OUTSIDE the shell chrome (no Rail / TopBar) so they read
// like real standalone screens — login + the standalone 404 / error variants.
const FULL_BLEED_PATHS = new Set(['/mockups/login', '/mockups/404-standalone']);
```

Replace the existing guard (lines 269–273):

```tsx
// Full-bleed routes render outside the shell chrome (no Rail / TopBar) so a
// login screen reads like a real auth page, not a page inside the CRM.
if (pathname === '/mockups/login') {
  return <>{children}</>;
}
```

with:

```tsx
// Full-bleed routes render outside the shell chrome (no Rail / TopBar) so they
// read like real standalone screens, not pages inside the CRM.
if (FULL_BLEED_PATHS.has(pathname)) {
  return <>{children}</>;
}
```

Add a `Not found` item to `mockupItems` (after the Login entry, line 89; `Compass` was imported in Task 4 Step 5):

```tsx
  { to: '/mockups/404', label: 'Not found', icon: Compass, end: true },
```

- [ ] **Step 5: Add the registry entry** in `registry.ts`. Insert into `MOCKUPS` after the `login` entry (after line 316, before the closing `]`):

```ts
  {
    slug: '404',
    title: 'Not found',
    path: '/mockups/404',
    blurb: '404 page — the not-found state, shown in-app and as a standalone full-bleed page.',
    usesComponents: ['Button', 'Cluster', 'ErrorState', 'Link', 'Screen', 'Stack', 'Text'],
  },
```

- [ ] **Step 6: Run the playground gates**

Run: `make build && make lint`
Expected: green. (Visual check optional: `/mockups/404` shows the in-app empty state inside the shell; `/mockups/404-standalone` is full-bleed with the accent backdrop and no Rail/TopBar; the toggle link navigates between them.)

- [ ] **Step 7: Commit**

```bash
git add packages/playground/src/pages/mockups/NotFound \
  packages/playground/src/App.tsx packages/playground/src/layout/AppShell/AppShell.tsx \
  packages/playground/src/pages/mockups/registry.ts
git commit -m "feat(playground): 404 mockup (in-app + standalone)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Error mockups (in-app + standalone)

**Files:**

- Create: `packages/playground/src/pages/mockups/AppError/AppError.tsx`
- Create: `packages/playground/src/pages/mockups/AppError/AppErrorStandalone.tsx`
- Modify: `packages/playground/src/App.tsx` (imports + 2 routes)
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx` (extend the guard Set; add `Error` nav item)
- Modify: `packages/playground/src/pages/mockups/registry.ts` (add the `error` entry)

(Named `AppError`, not `Error`, to avoid shadowing the global `Error`.)

- [ ] **Step 1: Create `AppError.tsx` (in-app variant)**

```tsx
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Button, Cluster, ErrorState, Link, Screen, Text } from '@eocrm/design-system';
import { TriangleAlert } from 'lucide-react';

export function AppError() {
  const navigate = useNavigate();
  return (
    <Screen
      fill="block"
      footer={
        <Cluster justify="center">
          <Link as={RouterLink} to="/mockups/error-standalone" variant="muted">
            View as standalone page →
          </Link>
        </Cluster>
      }
    >
      <ErrorState
        tone="danger"
        icon={<TriangleAlert size={48} aria-hidden="true" />}
        title="Something went wrong"
        description="An unexpected error occurred. We've logged it and our team is on it."
        actions={
          <Cluster gap="sm" justify="center">
            <Button onClick={() => navigate(0)}>Try again</Button>
            <Button variant="secondary" onClick={() => navigate('/mockups/dashboard')}>
              Back to dashboard
            </Button>
          </Cluster>
        }
        extra={
          <Text size="sm" tone="muted">
            Error ID: a1b2-c3d4
          </Text>
        }
      />
    </Screen>
  );
}
```

- [ ] **Step 2: Create `AppErrorStandalone.tsx` (full-bleed variant)**

```tsx
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Button, Cluster, ErrorState, Link, Screen, Stack, Text } from '@eocrm/design-system';
import { TriangleAlert } from 'lucide-react';

export function AppErrorStandalone() {
  const navigate = useNavigate();
  return (
    <Screen
      backdrop="danger"
      header={
        <Cluster justify="start">
          <Link as={RouterLink} to="/mockups" variant="muted">
            ← Back to mockups
          </Link>
        </Cluster>
      }
      footer={
        <Cluster justify="center" gap="lg">
          <Link href="/legal/privacy" variant="muted">
            Privacy
          </Link>
          <Link href="/legal/terms" variant="muted">
            Terms
          </Link>
          <Link href="/status" variant="muted">
            Status
          </Link>
        </Cluster>
      }
    >
      <Stack gap="lg" align="center">
        <Text as="span" size="xl" weight="bold">
          eocrm
        </Text>
        <ErrorState
          tone="danger"
          icon={<TriangleAlert size={48} aria-hidden="true" />}
          title="Something went wrong"
          description="The app hit an unexpected error. Reloading usually fixes it."
          actions={
            <Cluster gap="sm" justify="center">
              <Button onClick={() => navigate(0)}>Reload</Button>
              <Button variant="secondary" onClick={() => navigate('/mockups')}>
                Go to homepage
              </Button>
            </Cluster>
          }
          extra={
            <Text size="sm" tone="muted">
              Error ID: a1b2-c3d4
            </Text>
          }
        />
      </Stack>
    </Screen>
  );
}
```

- [ ] **Step 3: Wire routes in `App.tsx`.** Add imports after the NotFound imports (from Task 5 Step 3):

```tsx
import { AppError } from './pages/mockups/AppError/AppError';
import { AppErrorStandalone } from './pages/mockups/AppError/AppErrorStandalone';
```

Add routes after the 404 routes:

```tsx
<Route path="/mockups/error" element={<AppError />} />
<Route path="/mockups/error-standalone" element={<AppErrorStandalone />} />
```

- [ ] **Step 4: Extend the guard + nav in `AppShell.tsx`.** Update `FULL_BLEED_PATHS` (added in Task 5 Step 4) to include the error standalone route:

```tsx
const FULL_BLEED_PATHS = new Set([
  '/mockups/login',
  '/mockups/404-standalone',
  '/mockups/error-standalone',
]);
```

Add an `Error` item to `mockupItems` after the `Not found` item (`TriangleAlert` was imported in Task 4 Step 5):

```tsx
  { to: '/mockups/error', label: 'Error', icon: TriangleAlert, end: true },
```

- [ ] **Step 5: Add the registry entry** in `registry.ts`. Insert into `MOCKUPS` after the `404` entry (from Task 5 Step 5):

```ts
  {
    slug: 'error',
    title: 'Error',
    path: '/mockups/error',
    blurb: 'Error-boundary fallback — "something went wrong", shown in-app and as a standalone page.',
    usesComponents: ['Button', 'Cluster', 'ErrorState', 'Link', 'Screen', 'Stack', 'Text'],
  },
```

- [ ] **Step 6: Run the playground gates**

Run: `make build && make lint`
Expected: green. (Visual check optional: `/mockups/error` in-app shows the danger state + Error ID + toggle; `/mockups/error-standalone` is full-bleed with the danger backdrop.)

- [ ] **Step 7: Commit**

```bash
git add packages/playground/src/pages/mockups/AppError \
  packages/playground/src/App.tsx packages/playground/src/layout/AppShell/AppShell.tsx \
  packages/playground/src/pages/mockups/registry.ts
git commit -m "feat(playground): error-boundary mockup (in-app + standalone)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Refactor Login onto `<Screen>` + close the AuthScreen TODO

**Files:**

- Modify: `packages/playground/src/pages/mockups/Login/Login.tsx` (replace the two inline-style wrapper `<div>`s with `<Screen>`)
- Modify: `packages/playground/src/pages/mockups/registry.ts` (add `'Screen'` to the Login entry's `usesComponents`)
- Modify: `packages/design-system/src/components/TODO.md` (tick the `<AuthScreen>` entry, superseded by `<Screen>`)

- [ ] **Step 1: Rewrite `Login.tsx`.** Replace the import line + the entire returned JSX wrapper. Keep ALL form internals (state, `submit`, `onEnter`, the Card and its contents) unchanged — only the outer chrome changes. Update the import to add `Screen` and the return statement:

```tsx
import { useState, type KeyboardEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  BrandIcon,
  Button,
  Card,
  Checkbox,
  Cluster,
  Divider,
  Input,
  Link,
  PasswordInput,
  Screen,
  Stack,
  Text,
  Title,
} from '@eocrm/design-system';
```

Replace the `return (` block (lines 48–181, from the opening `/* TODO: replace when <AuthScreen> ships … */` comment through the final `</div>`) with:

```tsx
return (
  <Screen
    backdrop="accent"
    header={
      <Cluster justify="start">
        <Link as={RouterLink} to="/mockups" variant="muted">
          ← Back to mockups
        </Link>
      </Cluster>
    }
    footer={
      <Cluster justify="center" gap="lg">
        <Link href="/legal/privacy" variant="muted">
          Privacy
        </Link>
        <Link href="/legal/terms" variant="muted">
          Terms
        </Link>
        <Link href="/status" variant="muted">
          Status
        </Link>
      </Cluster>
    }
  >
    <Stack gap="lg" align="center">
      <Text as="span" size="xl" weight="bold">
        eocrm
      </Text>

      <Card padding="lg">
        <Stack gap="lg">
          <Stack gap="xs">
            <Title order={1} size="lg">
              Sign in
            </Title>
            <Text size="sm" tone="muted">
              Welcome back. Enter your email to continue to your workspace.
            </Text>
          </Stack>

          <Button variant="secondary">
            <BrandIcon name="google" size={16} />
            Continue with Google
          </Button>

          <Divider>OR</Divider>

          {formError && (
            <Alert tone="error" title="Couldn't sign you in">
              {formError}
            </Alert>
          )}

          <Stack gap="md">
            <Stack gap="xs">
              <Text as="label" htmlFor="login-email" weight="medium" size="sm">
                Email
              </Text>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                  if (formError) setFormError(null);
                }}
                onKeyDown={onEnter}
                invalid={!!emailError}
                aria-describedby={emailError ? 'login-email-error' : undefined}
              />
              {emailError && (
                <Text id="login-email-error" size="sm" tone="danger">
                  {emailError}
                </Text>
              )}
            </Stack>

            <Stack gap="xs">
              <Cluster justify="between" align="baseline">
                <Text as="label" htmlFor="login-password" weight="medium" size="sm">
                  Password
                </Text>
                <Link href="/forgot-password" variant="default">
                  Forgot?
                </Link>
              </Cluster>
              <PasswordInput
                id="login-password"
                autoComplete="current-password"
                placeholder="••••••••"
                capsLockWarning
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                  if (formError) setFormError(null);
                }}
                onKeyDown={onEnter}
                invalid={!!passwordError}
                aria-describedby={passwordError ? 'login-password-error' : undefined}
              />
              {passwordError && (
                <Text id="login-password-error" size="sm" tone="danger">
                  {passwordError}
                </Text>
              )}
            </Stack>
          </Stack>

          <Checkbox label="Keep me signed in" defaultChecked />

          <Button variant="primary" onClick={submit}>
            Sign in
          </Button>
        </Stack>
      </Card>
    </Stack>
  </Screen>
);
```

- [ ] **Step 2: Update the Login registry entry** in `registry.ts`. Add `'Screen'` to the `login` entry's `usesComponents` array (alphabetically, after `'PasswordInput'`, before `'Stack'`):

```ts
      'PasswordInput',
      'Screen',
      'Stack',
```

- [ ] **Step 3: Tick the AuthScreen TODO** in `packages/design-system/src/components/TODO.md`. Change the heading on line 30 from:

```markdown
### [ ] `<AuthScreen>` (or `<AuthLayout>`) — full-viewport centered surface with a tinted backdrop for auth pages
```

to:

```markdown
### [x] `<AuthScreen>` (or `<AuthLayout>`) — full-viewport centered surface with a tinted backdrop for auth pages
```

And replace the `**Deferred:** …` line (line 33) with a shipped note:

```markdown
**Superseded:** 2026-05-30 — shipped as the general `<Screen>` layout primitive (`packages/design-system/src/components/Screen/`), not a single-purpose `<AuthScreen>`. `<Screen>` provides `header` / centered-main / `footer` slots, a `fill` (viewport / block) and a tinted `backdrop` (none / plain / accent / danger). The Login mockup's two wrapper `<div>`s were refactored onto `<Screen backdrop="accent">`, and the standalone 404 / error mockups use it too.
```

- [ ] **Step 4: Run the playground gates**

Run: `make build && make lint`
Expected: green. (Visual check optional: `/mockups/login` looks identical to before — accent backdrop, centered card, back link, footer — with no inline styles in the source.)

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/pages/mockups/Login/Login.tsx \
  packages/playground/src/pages/mockups/registry.ts \
  packages/design-system/src/components/TODO.md
git commit -m "refactor(playground): Login onto <Screen>; close AuthScreen TODO

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Full gates + review-fix loops + finish

This task runs the repo-wide gates and the two CLAUDE.md review-fix loops (library Hard rule 8 + mockup Hard rule 7), fixing any findings, then hands off to `finishing-a-development-branch` for the PR.

- [ ] **Step 1: Repo-wide gates**

Run from repo root:

```bash
make test && make build && make lint
( cd packages/design-system && npm run typecheck && npm run lint:css && npm pack --dry-run -w @eocrm/design-system )
```

Expected: all green; `npm pack --dry-run` lists no `*.test.tsx` and no internal-only paths in the tarball (the new `ErrorState` / `Screen` dirs ship their `.tsx` / `.scss` / `index.ts` but not tests).

- [ ] **Step 2: Library review-fix loop (Hard rule 8).** Spawn a fresh-context `general-purpose` review agent scoped to `packages/design-system/` (the new `ErrorState` + `Screen` dirs, `src/index.ts`, manifest, `AGENTS.md`, `TODO.md`). Brief it on the 10 categories (bugs, a11y, API inconsistencies, type safety, Rules 1–7, test coverage, token discipline, SCSS, cross-package leakage, package/distribution) and to read `CLAUDE.md` + `AGENTS.md` first. Fix every Critical + Important; document any deliberate skip. Re-run gates, re-review until the verdict is `clean enough to stop`.

- [ ] **Step 3: Mockup review-fix loop (Hard rule 7).** Spawn a fresh-context `general-purpose` review agent scoped to the changed mockup files (`NotFound/`, `AppError/`, `Login/Login.tsx`, `registry.ts`). Brief it on the 10 mockup categories (esp. Rule-6 compliance — no inline `style`, no raw HTML; registry sync; realism; a11y/landmarks; one h1 per page; no stale TODOs). Verify the Login refactor removed both escape-hatch `<div style>`s and that the `<AuthScreen>` TODO is ticked. Fix Critical + Important; re-run `make build && make lint && make test`; re-review until `clean enough to stop`.

- [ ] **Step 4: Finish the branch.** Use the `superpowers:finishing-a-development-branch` skill → push `feat/error-state-screen` and open a PR. PR summary covers: two new primitives (`<ErrorState>`, `<Screen>`), four mockups (404 + error, in-app + standalone), the Login refactor, and the AuthScreen TODO closure. Wait for the `Quality / check` status check to pass before merging.

---

## Self-review (against the spec)

**Spec coverage:**

- `<ErrorState>` (props, tone neutral/danger, extra, lg/h1 defaults, role="alert", tokens mirroring EmptyState, no i18n) → Task 1. ✓
- `<Screen>` (fill viewport/block, backdrop none/plain/accent/danger, header/footer/align, layout-owning, token radials, no i18n) → Task 2. ✓
- Library bookkeeping (index re-exports, CLUSTERS ×2 + regen, AGENTS.md, structure-test 4 files, JSDoc anti-patterns) → Tasks 1–3. ✓
- Four mockups as 2 entries + standalone toggle → Tasks 5–6. ✓
- AppShell guard → Set → Task 5 (login + 404-standalone), Task 6 (adds error-standalone). ✓
- Nav (Not found / Error), registry entries + ComponentName union → Tasks 4 (union), 5, 6. ✓
- Demo pages + component nav + ComponentsIndex cards → Task 4. ✓
- Login refactor onto `<Screen>` + AuthScreen TODO ticked → Task 7. ✓
- Review loops + finish → Task 8. ✓

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N" — every step has concrete code or an exact edit. Lucide icon names (`Compass`, `TriangleAlert`) verified to exist. Token names (`--color-fg`, `--color-fg-subtle`, `--color-fg-muted`, `--color-danger`, `--color-accent-subtle-bg`, `--color-danger-bg-subtle`, `--color-bg-subtle`, `--space-*`, `--font-*`, `--line-height-*`) verified against `tokens.scss` / `EmptyState.tokens.scss`.

**Type consistency:** `ErrorStateTone` = `'neutral' | 'danger'` used identically in props, SCSS class (`tone-${tone}`), and tests. `ScreenFill`/`ScreenBackdrop`/`ScreenAlign` map to the exact class names asserted in `Screen.test.tsx` (`fillViewport`/`fillBlock`, `backdropPlain/Accent/Danger`, `alignCenter/alignStart`, `main`). Re-export type lists match the barrel files. Registry `usesComponents` for both new mockup entries (`Button`, `Cluster`, `ErrorState`, `Link`, `Screen`, `Stack`, `Text`) match what the four mockup files import.
