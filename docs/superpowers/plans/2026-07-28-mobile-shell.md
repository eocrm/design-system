# Mobile Shell — `AppLayout` Overlay Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every playground mockup usable on a phone by giving `AppLayout` an overlay-sidebar mode, then wiring the playground shell and mockup call-sites to it.

**Architecture:** Below a viewport threshold, `AppLayout` stops rendering its `sidebar` slot in the flex row and renders it inside the existing `<Drawer side="left">` instead, freeing the content column to claim the full viewport width. The threshold is evaluated with `useBelowBreakpoint`, a hook that already exists privately inside `Rail.tsx` and gets extracted to `_internal/collapse` and exported. Mockups are then fixed with props only — no new CSS anywhere in `pages/mockups/**`.

**Tech Stack:** React 19, TypeScript, CSS Modules + SCSS, Vitest + @testing-library/react, vite (playground).

Spec: `docs/superpowers/specs/2026-07-28-mobile-shell-design.md`

## Global Constraints

- **Tokens, not raw values.** No raw colors / spacing / radii in any `.module.scss` outside `tokens.scss`. Stylelint enforces via `scale-unlimited/declaration-strict-value`.
- **Breakpoint scale is fixed**: `sm` 480px / `md` 640px / `lg` 768px. Defined once in `src/components/_internal/collapse.ts` (`COLLAPSE_BREAKPOINT_PX`) and `src/components/_internal/collapse.scss` (`$collapse-sm/-md/-lg`). Do NOT add a new breakpoint or a fourth value.
- **The chosen overlay threshold is `lg` (768px).**
- **Mockup files (`packages/playground/src/pages/mockups/**`) may not gain** `\*.module.scss`, inline `style={{}}`, or raw HTML elements. Prop changes only. (playground CLAUDE.md Hard rule 6.)
- **Playground imports use `@eocrm/design-system`**, never relative paths into the library.
- **Component-scoped tokens** live in `<Name>.tokens.scss` under `:root`, never inline in the module.
- **Pattern A prop spreading**: `{...props}` goes LAST on layout primitives so consumer overrides win.
- **Every library behavior change needs**: unit tests alongside the component, a demo page update, JSDoc `@remarks`, and an `AGENTS.md` TL;DR entry.
- **Branch + PR required** for all code/config changes; direct pushes to `main` are prohibited. The `pre-push` husky hook (prettier + stylelint + typecheck) must pass — never bypass with `--no-verify`.
- **Test commands must run from the package directory**, not the repo root:
  - Library tests: `cd packages/design-system && npx vitest run <path>`
  - Typecheck: `npm run typecheck` (repo root, runs all workspaces)
  - Stylelint: `npm run lint:css` (repo root)
- **Dev server for visual checks binds port 8091**, never the default.

---

### Task 1: Extract and export `useBelowBreakpoint`

The hook already exists, fully written, as a private function in `Rail.tsx:64`. Move it verbatim — do NOT rewrite it. It already handles the two cases that matter: SSR (`false` server snapshot) and Safari <13.1's missing `MediaQueryList.addEventListener`.

**Files:**

- Modify: `packages/design-system/src/components/_internal/collapse.ts`
- Modify: `packages/design-system/src/components/Rail/Rail.tsx:64-96` (delete the local copy, import instead)
- Modify: `packages/design-system/src/index.ts`
- Test: `packages/design-system/src/components/_internal/collapse.test.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: `useBelowBreakpoint(breakpoint: CollapseBreakpoint | undefined): boolean` — exported from `_internal/collapse` and re-exported from the package root. Task 2 and Task 5 both call it.

- [ ] **Step 1: Write the failing test**

Append to `packages/design-system/src/components/_internal/collapse.test.ts`. Note this file is `.ts`, not `.tsx` — `renderHook` needs no JSX, so keep it that way. Add `renderHook` and `act` to the existing imports at the top of the file (add a `import { renderHook, act } from '@testing-library/react';` line if the file has no testing-library import yet).

```ts
describe('useBelowBreakpoint', () => {
  // jsdom implements no `window.matchMedia`, so install a width-driven stub that
  // fires real `change` events — this exercises the subscription path, not just
  // the initial read.
  const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');

  afterEach(() => {
    if (original) Object.defineProperty(window, 'matchMedia', original);
    else delete (window as { matchMedia?: unknown }).matchMedia;
  });

  function stubMatchMedia(initialWidth: number) {
    let width = initialWidth;
    const listeners = new Set<() => void>();
    const limit = (query: string) => Number(/max-width:\s*(\d+)px/.exec(query)?.[1] ?? NaN);
    const stub = (query: string) => ({
      media: query,
      get matches() {
        return width <= limit(query);
      },
      addEventListener: (_type: string, listener: () => void) => void listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => void listeners.delete(listener),
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: stub as unknown as typeof window.matchMedia,
    });
    return {
      resizeTo(next: number) {
        width = next;
        act(() => {
          for (const listener of listeners) listener();
        });
      },
    };
  }

  it('returns false when no breakpoint is given', () => {
    stubMatchMedia(320);
    const { result } = renderHook(() => useBelowBreakpoint(undefined));
    expect(result.current).toBe(false);
  });

  it('returns true below the threshold and false above it', () => {
    stubMatchMedia(700);
    const { result } = renderHook(() => useBelowBreakpoint('lg'));
    expect(result.current).toBe(true);
  });

  it('is inclusive at the threshold value', () => {
    stubMatchMedia(768);
    const { result } = renderHook(() => useBelowBreakpoint('lg'));
    expect(result.current).toBe(true);
  });

  it('updates when the viewport crosses the threshold', () => {
    const mm = stubMatchMedia(1200);
    const { result } = renderHook(() => useBelowBreakpoint('lg'));
    expect(result.current).toBe(false);
    mm.resizeTo(500);
    expect(result.current).toBe(true);
    mm.resizeTo(1000);
    expect(result.current).toBe(false);
  });

  it('returns false when matchMedia is unavailable', () => {
    delete (window as { matchMedia?: unknown }).matchMedia;
    const { result } = renderHook(() => useBelowBreakpoint('sm'));
    expect(result.current).toBe(false);
  });
});
```

Add `useBelowBreakpoint` to the existing import from `./collapse` at the top of the test file.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/design-system && npx vitest run src/components/_internal/collapse.test.ts
```

Expected: FAIL — `useBelowBreakpoint is not exported from './collapse'`.

- [ ] **Step 3: Move the hook into `_internal/collapse.ts`**

Append to `packages/design-system/src/components/_internal/collapse.ts`. Add `useMemo` and `useSyncExternalStore` to the file's `react` import (it currently imports only `createContext`).

```ts
/**
 * Subscribes to `(max-width: <breakpoint>px)` on the VIEWPORT and reports
 * whether it currently matches. `false` when no breakpoint is given, and on a
 * server / any environment without `matchMedia`.
 *
 * Viewport, not container — use this only where a container query would be
 * circular, i.e. where the thing being measured is what the collapse changes:
 * `Rail` (its own width IS the collapse) and `AppLayout`'s overlay sidebar (the
 * sidebar's presence in the row IS the collapse). For content that re-templates
 * inside a box of stable width, prefer the container-query `collapseBelow`
 * classes instead — see the type doc above.
 */
export function useBelowBreakpoint(breakpoint: CollapseBreakpoint | undefined): boolean {
  // `max-width` is inclusive, matching the `@container (max-width: …)` form the
  // SCSS breakpoints use — the threshold matches AT the breakpoint value.
  const query = breakpoint ? `(max-width: ${COLLAPSE_BREAKPOINT_PX[breakpoint]}px)` : null;

  const [subscribe, getSnapshot] = useMemo(() => {
    const supported =
      query !== null && typeof window !== 'undefined' && typeof window.matchMedia === 'function';
    if (!supported) return [() => () => {}, () => false] as const;
    const mql = window.matchMedia(query);
    return [
      (onStoreChange: () => void) => {
        // Safari < 13.1 exposes `matchMedia` but no `addEventListener` on the
        // MediaQueryList — only the deprecated `addListener`. Feature-detecting
        // `matchMedia` alone would throw here during commit and take the app
        // down rather than degrading, so detect the subscription API too.
        if (typeof mql.addEventListener === 'function') {
          mql.addEventListener('change', onStoreChange);
          return () => mql.removeEventListener('change', onStoreChange);
        }
        mql.addListener(onStoreChange);
        return () => mql.removeListener(onStoreChange);
      },
      () => mql.matches,
    ] as const;
  }, [query]);

  // Server snapshot is `false`: SSR has no viewport, so the markup matches the
  // consumer's own value and the client corrects on hydration.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
```

- [ ] **Step 4: Delete the local copy from `Rail.tsx`**

Delete the entire `useBelowBreakpoint` function (currently `Rail.tsx:64-96`, the block starting at the `/**\n * Subscribes to \`(max-width: …`comment and ending with the closing`}` of the function). Then:

- Remove `useMemo` and `useSyncExternalStore` from the `react` import **only if no other code in `Rail.tsx` still uses them** — `useMemo` IS still used (the `ctx` memo and the `body`/`footer` split memo), so keep `useMemo` and remove only `useSyncExternalStore`.
- Update the existing `_internal/collapse` import:

```ts
import {
  COLLAPSE_BREAKPOINT_PX,
  useBelowBreakpoint,
  type CollapseBreakpoint,
} from '../_internal/collapse';
```

`COLLAPSE_BREAKPOINT_PX` may now be unused in `Rail.tsx` — if typecheck flags it, drop it from the import.

- [ ] **Step 5: Export from the package root**

In `packages/design-system/src/index.ts`, find the existing block that exports `CollapseBreakpoint` (around line 396) and add a value export next to it:

```ts
export { useBelowBreakpoint } from './components/_internal/collapse';
```

Place it adjacent to the existing `CollapseBreakpoint` type export so the breakpoint surface stays together.

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd packages/design-system && npx vitest run src/components/_internal/collapse.test.ts src/components/Rail/Rail.test.tsx
```

Expected: PASS. The `Rail` `collapseBelow` suite must still pass unchanged — that's the regression guard proving the extraction was behavior-preserving.

- [ ] **Step 7: Typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/_internal/collapse.ts \
        packages/design-system/src/components/_internal/collapse.test.ts \
        packages/design-system/src/components/Rail/Rail.tsx \
        packages/design-system/src/index.ts
git commit -m "refactor(collapse): extract useBelowBreakpoint from Rail and export it"
```

---

### Task 2: `AppLayout` overlay-sidebar mode

**Files:**

- Modify: `packages/design-system/src/components/AppLayout/AppLayout.tsx`
- Modify: `packages/design-system/src/components/AppLayout/AppLayout.module.scss`
- Modify: `packages/design-system/src/i18n/messages.ts`
- Modify: `packages/design-system/src/i18n/en.ts`
- Modify: `packages/design-system/src/i18n/ru.ts`
- Test: `packages/design-system/src/components/AppLayout/AppLayout.test.tsx`

**Interfaces:**

- Consumes: `useBelowBreakpoint(bp)` from Task 1; `useControllableState` from `_internal/useControllableState`; `Drawer` from `../Drawer`.
- Produces: `AppLayoutProps` gains `sidebarOverlayBelow?: CollapseBreakpoint`, `sidebarOpen?: boolean`, `onSidebarOpenChange?: (open: boolean) => void`. Task 5 consumes all three.

- [ ] **Step 1: Add the i18n key**

In `packages/design-system/src/i18n/messages.ts`, add a namespace. Keys are ordered alphabetically, so `appLayout` goes immediately after `alert`:

```ts
appLayout: {
  /** aria-label on the overlay sidebar dialog (mobile drawer). It has no
        Drawer.Header, so without this the dialog would be unnamed. */
  sidebar: string;
}
```

In `en.ts`, after the `alert` entry:

```ts
  appLayout: {
    sidebar: 'Sidebar navigation',
  },
```

In `ru.ts`, in the same position:

```ts
  appLayout: {
    sidebar: 'Боковая навигация',
  },
```

- [ ] **Step 2: Write the failing tests**

Append to `packages/design-system/src/components/AppLayout/AppLayout.test.tsx`. Add `userEvent` to the imports (`import userEvent from '@testing-library/user-event';`) and `act` from `@testing-library/react`.

```tsx
describe('AppLayout sidebarOverlayBelow', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');

  afterEach(() => {
    if (original) Object.defineProperty(window, 'matchMedia', original);
    else delete (window as { matchMedia?: unknown }).matchMedia;
  });

  function stubMatchMedia(initialWidth: number) {
    let width = initialWidth;
    const listeners = new Set<() => void>();
    const limit = (query: string) => Number(/max-width:\s*(\d+)px/.exec(query)?.[1] ?? NaN);
    const stub = (query: string) => ({
      media: query,
      get matches() {
        return width <= limit(query);
      },
      addEventListener: (_t: string, l: () => void) => void listeners.add(l),
      removeEventListener: (_t: string, l: () => void) => void listeners.delete(l),
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: stub as unknown as typeof window.matchMedia,
    });
    return {
      resizeTo(next: number) {
        width = next;
        act(() => {
          for (const l of listeners) l();
        });
      },
    };
  }

  it('renders the sidebar in the flow above the threshold', () => {
    stubMatchMedia(1200);
    render(
      <AppLayout sidebar={<nav data-testid="rail">nav</nav>} sidebarOverlayBelow="lg">
        content
      </AppLayout>,
    );
    expect(screen.getByTestId('rail')).toBeInTheDocument();
    // In-flow means no dialog wrapper.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('rail').parentElement!.className).toMatch(/sidebar/);
  });

  it('moves the sidebar into a left drawer below the threshold', async () => {
    stubMatchMedia(500);
    render(
      <AppLayout sidebar={<nav data-testid="rail">nav</nav>} sidebarOverlayBelow="lg" sidebarOpen>
        content
      </AppLayout>,
    );
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('data-side', 'left');
    expect(dialog).toContainElement(screen.getByTestId('rail'));
  });

  it('does not apply the pinned wrapper to the drawer-hosted sidebar', async () => {
    // sidebarPinned sets sticky/100dvh on the IN-FLOW wrapper. Applying it
    // inside the drawer would size the rail to the window, not the drawer.
    stubMatchMedia(500);
    render(
      <AppLayout
        sidebar={<nav data-testid="rail">nav</nav>}
        sidebarOverlayBelow="lg"
        sidebarPinned
        sidebarOpen
      >
        content
      </AppLayout>,
    );
    await screen.findByRole('dialog');
    expect(screen.getByTestId('rail').parentElement!.className).not.toMatch(/sidebarPinned/);
  });

  it('swaps between in-flow and overlay when the viewport crosses the threshold', async () => {
    const mm = stubMatchMedia(1200);
    render(
      <AppLayout sidebar={<nav data-testid="rail">nav</nav>} sidebarOverlayBelow="lg" sidebarOpen>
        content
      </AppLayout>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    mm.resizeTo(500);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    mm.resizeTo(1200);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('fires onSidebarOpenChange(false) on Escape', async () => {
    stubMatchMedia(500);
    const onChange = vi.fn();
    render(
      <AppLayout
        sidebar={<nav data-testid="rail">nav</nav>}
        sidebarOverlayBelow="lg"
        sidebarOpen
        onSidebarOpenChange={onChange}
      >
        content
      </AppLayout>,
    );
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('names the overlay dialog so it is not an unlabelled dialog', async () => {
    stubMatchMedia(500);
    render(
      <AppLayout sidebar={<nav data-testid="rail">nav</nav>} sidebarOverlayBelow="lg" sidebarOpen>
        content
      </AppLayout>,
    );
    expect(await screen.findByRole('dialog', { name: 'Sidebar navigation' })).toBeInTheDocument();
  });

  it('ignores sidebarOpen entirely when sidebarOverlayBelow is unset', () => {
    stubMatchMedia(320);
    render(
      <AppLayout sidebar={<nav data-testid="rail">nav</nav>} sidebarOpen>
        content
      </AppLayout>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('rail').parentElement!.className).toMatch(/sidebar/);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd packages/design-system && npx vitest run src/components/AppLayout/AppLayout.test.tsx
```

Expected: FAIL — `sidebarOverlayBelow` is not a known prop; no dialog is rendered.

- [ ] **Step 4: Implement the props and render branch**

Replace the body of `packages/design-system/src/components/AppLayout/AppLayout.tsx`. Keep the existing file-level JSDoc; add the new `@remarks` block from Task 4 later.

New imports at the top:

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { useBelowBreakpoint, type CollapseBreakpoint } from '../_internal/collapse';
import { useControllableState } from '../_internal/useControllableState';
import { Drawer } from '../Drawer';
import styles from './AppLayout.module.scss';
```

New props on the interface (add after `sidebarPinned`):

```tsx
  /**
   * Move the sidebar out of the flow and into a left-anchored `<Drawer>` while
   * the **viewport** is at or below a width threshold: `'sm'` 480px / `'md'`
   * 640px / `'lg'` 768px. Omit for no responsive behavior (the default) — the
   * sidebar always renders in the flow.
   *
   * Below the threshold the content column claims the full viewport width, and
   * the sidebar is reachable only by opening the drawer. Render your own
   * trigger (a hamburger in the `topBar`) and drive `sidebarOpen` — AppLayout
   * deliberately renders no trigger of its own, since where it belongs in the
   * bar is the consumer's call. Use the exported `useBelowBreakpoint` hook to
   * show that trigger only while the overlay mode is active.
   *
   * `sidebarPinned` is ignored below the threshold: the drawer owns the
   * sidebar's box there, and a `sticky; height: 100dvh` wrapper inside it would
   * size the rail to the window instead of the drawer.
   *
   * Measures the viewport (`matchMedia`), not a container — the sidebar's
   * presence in the row is exactly what the threshold changes, so a container
   * query would be circular. Same scale and same basis as `<Rail collapseBelow>`.
   */
  sidebarOverlayBelow?: CollapseBreakpoint;
  /**
   * Open state of the overlay sidebar. Optional — omit for uncontrolled (the
   * drawer manages its own state and still closes on Esc / backdrop). Has no
   * effect unless `sidebarOverlayBelow` is set and the viewport is below it.
   */
  sidebarOpen?: boolean;
  /** Fires whenever the overlay sidebar opens or closes — Esc, backdrop click, swipe, or programmatic. */
  onSidebarOpenChange?: (open: boolean) => void;
```

New component body:

```tsx
export const AppLayout = forwardRef<HTMLDivElement, AppLayoutProps>(function AppLayout(
  {
    topBar,
    sidebar,
    sidebarPinned,
    sidebarOverlayBelow,
    sidebarOpen,
    onSidebarOpenChange,
    children,
    className,
    ...props
  },
  ref,
) {
  const t = useTranslation();
  const overlay = useBelowBreakpoint(sidebarOverlayBelow) && sidebar != null;

  // Uncontrolled fallback so Esc / backdrop still close the drawer when the
  // consumer passes `sidebarOverlayBelow` without wiring open state.
  const [open, setOpen] = useControllableState<boolean>({
    value: sidebarOpen,
    defaultValue: false,
    onChange: onSidebarOpenChange,
  });

  // Pattern A — props last: AppLayout is a consumer-overridable layout
  // primitive (like Stack/Card), so {...props} wins over our defaults.
  // Topology: a row of [full-height sidebar | a column of (topBar, main)] — so
  // the sidebar spans the whole height and the top bar sits only over the
  // content column, matching the CRM shell (see playground AppShell).
  return (
    <div ref={ref} className={clsx(styles.root, className)} {...props}>
      {sidebar != null && !overlay && (
        <div className={clsx(styles.sidebar, sidebarPinned && styles.sidebarPinned)}>{sidebar}</div>
      )}
      <div className={styles.body}>
        {topBar != null && <div className={styles.topBar}>{topBar}</div>}
        <div className={styles.main}>{children}</div>
      </div>
      {overlay && (
        <Drawer
          open={open}
          onOpenChange={setOpen}
          side="left"
          size="sm"
          className={styles.overlaySidebar}
          aria-label={t('appLayout.sidebar')}
        >
          {sidebar}
        </Drawer>
      )}
    </div>
  );
});
```

Note `overlay` folds in the `sidebar != null` check, so `sidebarOverlayBelow` with no sidebar renders nothing extra.

- [ ] **Step 5: Add the overlay-sidebar SCSS**

Append to `packages/design-system/src/components/AppLayout/AppLayout.module.scss`:

```scss
// Overlay sidebar (sidebarOverlayBelow): the Drawer panel is 320px
// (--size-drawer-sm, the sanctioned nav-drawer width) but a <Rail> inside sets
// its own 240px width and would leave a dead strip. Rebinding the rail's own
// width token — its documented override surface — makes the rail fill the
// panel instead. Scoped to this class so it can't leak to an in-flow rail.
.overlaySidebar {
  --rail-width-expanded: 100%;
  --rail-width-collapsed: 100%;
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd packages/design-system && npx vitest run src/components/AppLayout/AppLayout.test.tsx
```

Expected: PASS, including the pre-existing `sidebarPinned` and structural-class suites.

- [ ] **Step 7: Run the full library suite for regressions**

```bash
cd packages/design-system && npx vitest run
```

Expected: PASS. Pay attention to `Drawer` and `Rail` suites — this task adds a new `Drawer` consumer.

- [ ] **Step 8: Lint and typecheck**

```bash
npm run typecheck && npm run lint:css
```

Expected: both clean.

- [ ] **Step 9: Commit**

```bash
git add packages/design-system/src/components/AppLayout packages/design-system/src/i18n
git commit -m "feat(AppLayout): overlay sidebar below a viewport threshold"
```

---

### Task 3: Narrow-viewport content gutter

**Files:**

- Modify: `packages/design-system/src/components/AppLayout/AppLayout.tokens.scss`

**Interfaces:**

- Consumes: nothing.
- Produces: no API change — a token default that varies by viewport.

- [ ] **Step 1: Add the narrow-viewport override**

Append to `packages/design-system/src/components/AppLayout/AppLayout.tokens.scss`, after the existing `:root` block:

```scss
// Narrow viewports: --space-6 (24px) each side costs a 380px phone 48px of its
// width. Step the gutter down so content keeps its room. A consumer override in
// their own scope still wins — this only moves the DEFAULT.
@media (max-width: 640px) {
  :root {
    --app-layout-content-padding: var(--space-4);
  }
}
```

The 640px literal here matches `$collapse-md`. It is deliberately NOT the `lg` overlay threshold: the gutter should shrink only once the screen is genuinely phone-sized, which is a narrower condition than "the rail has gone off-canvas".

- [ ] **Step 2: Verify stylelint accepts it**

```bash
npm run lint:css
```

Expected: clean. If `declaration-strict-value` complains about the raw `640px` in the media query, note that media-query conditions cannot read CSS custom properties — check how `Modal.module.scss:214` and `PageHeader.module.scss:147` express their existing 640px breakpoints and match that form exactly.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/AppLayout/AppLayout.tokens.scss
git commit -m "feat(AppLayout): step the content gutter down on narrow viewports"
```

---

### Task 4: Library docs — JSDoc, AGENTS.md, demo page

Required by the repo's core invariant: a library behavior change is not complete without `@remarks` prose, an `AGENTS.md` TL;DR, and demo coverage.

**Files:**

- Modify: `packages/design-system/src/components/AppLayout/AppLayout.tsx` (JSDoc only)
- Modify: `packages/design-system/AGENTS.md:1492-1506`
- Modify: `packages/playground/src/pages/components/AppLayoutDemo.tsx`

**Interfaces:**

- Consumes: the props from Task 2.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the `@remarks` block**

In `AppLayout.tsx`, add to the component's JSDoc, after the existing `@remarks Scrolling` block:

```
 * @remarks Responsive sidebar
 * `sidebarOverlayBelow` moves the sidebar into a left `<Drawer>` below a
 * viewport threshold, freeing the content column to claim the full width. It
 * measures the **viewport** (`matchMedia`), matching `<Rail collapseBelow>` and
 * unlike `<Grid collapseBelow>`'s container query — the sidebar's presence in
 * the row is what the threshold changes, so a container query would be
 * circular. AppLayout renders **no trigger**: put a hamburger in your `topBar`
 * and gate it on the exported `useBelowBreakpoint` hook, so it appears only
 * while the overlay is active. `sidebarPinned` is ignored below the threshold.
 *
 * @remarks Anti-patterns
 * - ❌ Setting `sidebarOverlayBelow` without rendering a trigger. The sidebar
 *   becomes unreachable below the threshold — there is no built-in way to open it.
 * - ❌ Duplicating the threshold as a raw media query in consumer CSS to hide
 *   the trigger. Use `useBelowBreakpoint(bp)` with the same token so the two
 *   can't drift.
 * - ❌ Reaching for `<Rail collapseBelow>` and `sidebarOverlayBelow` together
 *   at the same breakpoint. The rail would render icon-only inside a drawer
 *   that already has room for labels. Pick one behavior per width.
```

- [ ] **Step 2: Add the `AGENTS.md` TL;DR entry**

In `packages/design-system/AGENTS.md`, in the `<AppLayout>` section, add a bullet after the existing `**sidebarPinned**` bullet (line 1506):

```markdown
- **`sidebarOverlayBelow`** (default: none): below a **viewport** threshold (`'sm'` 480 / `'md'` 640 / `'lg'` 768) the sidebar leaves the flow and renders in a left `<Drawer>`, so the content column gets the full viewport width — the fix for a 240px rail eating a phone screen. Drive it with `sidebarOpen` / `onSidebarOpenChange` (both optional; uncontrolled still closes on Esc and backdrop). **AppLayout renders no trigger** — put a hamburger in your `topBar` and gate it with the exported `useBelowBreakpoint(bp)` hook so it only shows while the overlay is active. `sidebarPinned` is ignored below the threshold (the drawer owns the sidebar's box there). Measures the viewport, not a container — same basis as `<Rail collapseBelow>`, since the sidebar's presence in the row is exactly what the threshold changes.
```

- [ ] **Step 3: Add demo coverage**

`AppLayoutDemo.tsx` already defines `Frame`, `Bar`, and `Side` helpers and uses raw divs with inline styles (demo pages are playground tooling — Hard rule 6 does not apply). Reuse those helpers.

Two honest caveats to state in the demo prose, because they are real and will confuse a reader otherwise: the threshold measures the **real browser viewport**, not the demo `Frame`, so the overlay only engages when the actual window is under 768px; and `Drawer` portals to `document.body`, so the opened panel covers the whole page rather than sitting inside the frame.

Add `useState` to the `react` import, `Menu` to the `lucide-react` import, and `TopBar` + `useBelowBreakpoint` to the `@eocrm/design-system` import. Then add this `Example` before the closing `</DemoLayout>`:

```tsx
<Example
  title="Responsive sidebar (sidebarOverlayBelow)"
  description="Below the threshold the sidebar leaves the flow and opens in a left Drawer, so the content column gets the full viewport width. Narrow the browser window under 768px to see it engage — the threshold reads the real viewport, not this framed preview, and the drawer portals to document.body so it covers the page rather than the frame. AppLayout renders no trigger: the hamburger below is the demo's own, gated on useBelowBreakpoint('lg')."
  code={`function Demo() {
  const [navOpen, setNavOpen] = useState(false);
  const isOverlay = useBelowBreakpoint('lg');

  return (
    <AppLayout
      sidebarOverlayBelow="lg"
      sidebarOpen={navOpen}
      onSidebarOpenChange={setNavOpen}
      sidebar={<Side />}
      topBar={
        <TopBar>
          <TopBar.Start>
            {isOverlay && (
              <TopBar.IconButton aria-label="Open navigation" onClick={() => setNavOpen(true)}>
                <Menu size={16} />
              </TopBar.IconButton>
            )}
          </TopBar.Start>
        </TopBar>
      }
    >
      <Page>
        <Title order={2} size="md">Content</Title>
        <Text tone="muted">Full viewport width once the sidebar goes off-canvas.</Text>
      </Page>
    </AppLayout>
  );
}`}
>
  <Frame>
    <OverlaySidebarDemo />
  </Frame>
</Example>
```

And define the live component above `export function AppLayoutDemo`:

```tsx
function OverlaySidebarDemo() {
  const [navOpen, setNavOpen] = useState(false);
  const isOverlay = useBelowBreakpoint('lg');

  return (
    <AppLayout
      sidebarOverlayBelow="lg"
      sidebarOpen={navOpen}
      onSidebarOpenChange={setNavOpen}
      sidebar={<Side />}
      topBar={
        <TopBar>
          <TopBar.Start>
            {isOverlay && (
              <TopBar.IconButton aria-label="Open navigation" onClick={() => setNavOpen(true)}>
                <Menu size={16} />
              </TopBar.IconButton>
            )}
          </TopBar.Start>
        </TopBar>
      }
    >
      <Page>
        <Title order={2} size="md">
          Content
        </Title>
        <Text tone="muted">Full viewport width once the sidebar goes off-canvas.</Text>
      </Page>
    </AppLayout>
  );
}
```

- [ ] **Step 4: Verify the demo renders**

```bash
cd packages/playground && npx vite --port 8091 --strictPort
```

Open `http://localhost:8091/components/app-layout` and confirm the new example renders and the drawer opens. Narrow the window below 768px to see the overlay engage.

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write packages/design-system/AGENTS.md packages/design-system/src/components/AppLayout/AppLayout.tsx packages/playground/src/pages/components/AppLayoutDemo.tsx
git add packages/design-system/AGENTS.md packages/design-system/src/components/AppLayout/AppLayout.tsx packages/playground/src/pages/components/AppLayoutDemo.tsx
git commit -m "docs(AppLayout): document the overlay sidebar mode"
```

---

### Task 5: Playground `AppShell` consumes `AppLayout`

**Files:**

- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.module.scss`

**Interfaces:**

- Consumes: `AppLayout` (Task 2), `useBelowBreakpoint` (Task 1).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Replace the shell markup**

In `AppShell.tsx`:

Add to the `@eocrm/design-system` import: `AppLayout`, `useBelowBreakpoint`. Add `Menu` to the `lucide-react` import.

Add state and the close-on-navigate effect, next to the existing `collapsed` state:

```tsx
// Below 768px the rail lives in an overlay drawer (AppLayout sidebarOverlayBelow).
const [navOpen, setNavOpen] = useState(false);
const isOverlayNav = useBelowBreakpoint('lg');

// Close the overlay nav after navigating — otherwise the drawer stays open
// over the page the user just chose.
useEffect(() => {
  setNavOpen(false);
}, [pathname]);
```

Replace the returned JSX — the outer `<div className={styles.shell}>` through the closing `</div>` — with:

```tsx
return (
  <AppLayout
    sidebarPinned
    sidebarOverlayBelow="lg"
    sidebarOpen={navOpen}
    onSidebarOpenChange={setNavOpen}
    sidebar={
      <Rail
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        aria-label={inComponents ? 'Component navigation' : 'Mockup navigation'}
        className={styles.appRail}
      >
        {/* …existing Rail children, unchanged… */}
      </Rail>
    }
    topBar={
      <TopBar>
        <TopBar.Start>
          {isOverlayNav && (
            <TopBar.IconButton aria-label="Open navigation" onClick={() => setNavOpen(true)}>
              <Menu size={16} />
            </TopBar.IconButton>
          )}
          <CommandSearch ref={searchRef} />
        </TopBar.Start>
        <TopBar.End>{/* …existing TopBar.End children, unchanged… */}</TopBar.End>
      </TopBar>
    }
  >
    {children}
  </AppLayout>
);
```

Move the existing `<Rail>` children and `<TopBar.End>` children across verbatim — do not rewrite them.

Note the `data-rail-collapsed` attribute on the old wrapper is dropped: it existed only to drive the grid track width, and `AppLayout`'s sidebar is `flex: none` at intrinsic width, so it now tracks the rail automatically.

- [ ] **Step 2: Gut the shell SCSS**

`AppShell.module.scss` should end up containing ONLY the `.brand` rule and the `.appRail` rule. Delete:

- The entire `:root` block (`--sidebar-width`, `--sidebar-width-collapsed`, `--topbar-height`, `--z-sidebar`, `--z-topbar`)
- `.shell`, `.shell[data-rail-collapsed]`, `.sidebarWrap`, `.topbarWrap`, `.content`
- The eight already-dead classes: `.nav`, `.navSection`, `.navGroup`, `.navItem`, `.navItemActive`, `.navFooter`, `.switchLink`, `.switchArrow`

Verify nothing else references them before deleting:

```bash
cd packages/playground/src && for c in nav navSection navGroup navItem navItemActive navFooter switchLink switchArrow shell sidebarWrap topbarWrap content; do echo "$c: $(grep -rn "styles\.$c\b" --include='*.tsx' . | wc -l)"; done
```

Expected: all zero after Step 1 (they were already zero for the eight dead ones before it).

- [ ] **Step 3: Verify the shell renders and measure the fix**

```bash
cd packages/playground && npx vite --port 8091 --strictPort
```

Then in a browser at a 380px viewport, on `http://localhost:8091/mockups/dashboard`, evaluate:

```js
({ vw: document.documentElement.clientWidth, docW: document.documentElement.scrollWidth });
```

Expected: `docW` equals `vw` (380), down from 720. This is the primary success criterion of the whole plan.

- [ ] **Step 4: Verify the desktop shell is unchanged**

At a 1400px viewport, walk `/mockups/dashboard`, `/mockups/contacts`, and `/components/app-layout`. The rail, top bar, and content gutter must look identical to before. Check specifically that:

- The rail still pins its footer to the viewport bottom on a tall page (that's `sidebarPinned` working).
- The sticky `TopBar` still paints over page content on scroll — the old `--z-topbar: 200` is gone, so this is the flagged z-index risk. If content shows through the bar, add a `z-index` to `AppLayout`'s `.topBar` rule using an existing `--z-*` token, and note it in the PR.

- [ ] **Step 5: Verify the drawer behavior**

At 380px: the hamburger appears in the top bar; tapping it opens the rail over the content; the rail fills the drawer with no dead strip on its right; Esc closes it; clicking the backdrop closes it; choosing a nav item navigates AND closes the drawer.

- [ ] **Step 6: Typecheck, lint, format**

```bash
npm run typecheck && npm run lint:css && npx prettier --check packages/playground/src/layout/AppShell/
```

Expected: all clean.

- [ ] **Step 7: Commit**

```bash
git add packages/playground/src/layout/AppShell/
git commit -m "refactor(playground): shell consumes AppLayout, gains a mobile nav drawer"
```

---

### Task 6: Mockup call-site props

Prop changes only. No `.module.scss`, no inline styles, no raw HTML — so no `components/TODO.md` entry is needed.

**Files:**

- Modify: `packages/playground/src/pages/mockups/Dashboard/Dashboard.tsx:81,102`
- Modify: `packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx:94`
- Modify: `packages/playground/src/pages/mockups/MemberProfile/MemberProfile.tsx:266,297`
- Modify: `packages/playground/src/pages/mockups/Login/Login.tsx:94`

**Interfaces:**

- Consumes: `Grid collapseBelow` and `FormRow` / `Constrain` props that all already exist in the shipped library. No dependency on Tasks 1–5.
- Produces: nothing.

- [ ] **Step 1: Collapse the Dashboard stat row**

`Dashboard.tsx:81` — the three-up stat cards. Below 640px go to two columns, below 480px to one:

```tsx
<Grid columns={3} gap="md" collapseBelow={{ md: 2, sm: 1 }}>
```

- [ ] **Step 2: Collapse the Dashboard two-column section**

`Dashboard.tsx:102`:

```tsx
<Grid columns={2} gap="md" collapseBelow="md">
```

- [ ] **Step 3: Collapse the ContactDetail two-column section**

`ContactDetail.tsx:94`:

```tsx
<Grid columns={2} gap="md" collapseBelow="md">
```

- [ ] **Step 4: Let the MemberProfile form rows reflow**

`MemberProfile.tsx:266` and `:297` — drop the `columns` prop entirely. `FormRow`'s own JSDoc says the default is responsive auto-fit and calls forcing `columns` for two fields that should reflow on mobile an anti-pattern:

```tsx
<FormRow>
```

- [ ] **Step 5: Fix the Login fixed width**

`Login.tsx:94` — `width` sets a fixed `width` and is why Login overflows to 472px on a 380px screen even though it renders outside the shell:

```tsx
<Constrain maxWidth="md">
```

- [ ] **Step 6: Verify each page at 380px**

With the dev server on 8091, check `docW === vw` and that the collapsed layouts read correctly on:

- `/mockups/dashboard` — stats stack to one column, no card is squeezed
- `/mockups/contact-detail` — the two-column section stacks
- `/mockups/member-profile` — form fields go full width
- `/mockups/login` — the card fits with no horizontal scroll

- [ ] **Step 7: Typecheck and commit**

```bash
npm run typecheck
git add packages/playground/src/pages/mockups/
git commit -m "fix(mockups): collapse fixed grids and unpin the Login card width on mobile"
```

---

### Task 7: Visual sweep and review loops

The sweep could not be specified up front — before Task 5 every page rendered at 720px, so nothing reflowed honestly enough to inspect.

**Files:**

- Modify: whichever mockup or library files the sweep turns up. Mockup fixes remain prop-only.

**Interfaces:**

- Consumes: everything from Tasks 1–6.
- Produces: the final state.

- [ ] **Step 1: Sweep all 15 mockup routes at 390px**

With the dev server on 8091 and a 390px viewport, walk every route: `dashboard`, `contacts`, `contact-detail`, `deals`, `members`, `member-profile`, `tenants`, `tenant-detail`, `audit`, `settings`, `roles`, `custom-fields`, `login`, `404`, `error`.

For each, confirm `document.documentElement.scrollWidth === document.documentElement.clientWidth`, then look at it. Known things to check specifically:

- `PageHeader` action clusters — do buttons wrap or overflow?
- `Kanban` on `/mockups/deals` — column height and horizontal scroll should feel deliberate.
- `DataTable` toolbar on `/mockups/audit` — filter controls wrapping.
- `Tabs` on `contact-detail` / `roles` / `custom-fields` — should scroll horizontally, not squash.
- `Cluster` rows generally — wrap behavior.

Wide tables scrolling horizontally is **expected and accepted** (`Tenants` has 10 columns). Do not build a card-stack mode; that is an explicit non-goal.

- [ ] **Step 2: Fix what the sweep found**

Mockup fixes are prop-only. If something can only be fixed with CSS, that is a library gap: add an entry to `packages/design-system/src/components/TODO.md` per playground Hard rule 6, rather than reaching for inline styles.

- [ ] **Step 3: Desktop regression pass**

At 1400px, walk the same 15 routes plus a few `/components/*` demo pages. Nothing above 768px should look different from `main`.

- [ ] **Step 4: Run every gate**

```bash
npm run typecheck && npm run lint:css && npm run format:check && npm test
```

Expected: all clean.

- [ ] **Step 5: Run the mandatory pre-push review loop**

This branch touches BOTH `packages/design-system/**` (Hard rule 8) and `packages/playground/src/pages/mockups/**` (Hard rule 7). Invoke the `pre-push-review` skill and follow it exactly, running the loop until a fresh reviewer says it is clean enough to stop. Do not skip it because the diff feels small.

- [ ] **Step 6: Commit and open the PR**

```bash
git add -A
git commit -m "fix(mockups): mobile polish from the 390px sweep"
git push -u origin <branch>
gh pr create --title "feat: mobile shell — AppLayout overlay sidebar" --body "…"
```

Wait for `Quality / check` to pass before merging.

---

## Notes for the implementer

- **Branch first.** `git checkout main && git pull` then `git checkout -b feat/mobile-shell`. Never branch from a stale `main`.
- **Verify hooks are installed** before starting: `git config --get core.hooksPath` must print `.husky/_`, and `test -x .husky/pre-push` must exit 0. If either fails, run `npm install`.
- **Tasks 1–5 must run in order** (each consumes the previous). Task 6 is independent of 1–5 and could be done in parallel, but its verification step needs Task 5's shell fix to be meaningful — so verify it after.
- **The one measurement that matters**: `document.documentElement.scrollWidth` must equal `clientWidth` at 380px on every route. It is 720px today.
