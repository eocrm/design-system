# Highlight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `Highlight`, a generic primitive that draws a temporary inset attention ring and glow on any single child block, and can optionally scroll it into view and focus it (#628).

**Architecture:** `Highlight` renders no DOM of its own. It `cloneElement`s its single child, merging in a class, `data-highlight="on"|"fading"` and a ref. The lifecycle runs on timers (hold `duration`, then a fixed 260ms fade), with `onDone` and the scroll/focus flags read from a ref, so their identity changes never restart anything. All styling is an inset outline plus an inset box-shadow, so `overflow` on the child or its parent can't clip it.

**Tech Stack:** React 19 (ref is a regular prop, `child.props.ref`), CSS modules + SCSS, Vitest + RTL (jsdom, globals), playground (Vite).

**Spec:** `docs/superpowers/specs/2026-10-06-highlight-design.md`

## Global Constraints

- Tokens only in `.module.scss`. Raw values are allowed only in `Highlight.tokens.scss` (the same precedent as `Kbd.tokens.scss`).
- No layout properties in the component SCSS (Rule 4): no margin, position, width or flex.
- Decorative only: never add `role`, `aria-*` or `tabIndex` to the child.
- `duration` default `3000`. The fade is a fixed `260ms` (mirrors `--transition-slow`).
- Scroll: `{ block: 'center', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' }`. Focus: `{ preventScroll: true }`.
- Clearing `active` early never calls `onDone`. `duration={Infinity}` never ends.
- Vitest globals: don't import `describe/it/expect/vi`.
- Playground imports come from `@eocrm/design-system` only.
- ESLint has `react-hooks` recommended on (#624). Don't write refs during render and don't call `setState` synchronously in an effect body. Use the render-phase "adjust state on prop change" pattern and timer callbacks, as shown below.
- Commit messages: plain, no Co-Authored-By, no session link.

## Review Focus

1. **The child already has a `className` and a `ref`.** Both must survive: the classes are concatenated and the consumer's ref still receives the node. (Task 1 test "merges className and keeps the child's ref".)
2. **The parent re-renders with a new inline `onDone` every render.** The timer must not restart, and `onDone` must fire exactly once. (Task 1 test "new onDone identity does not restart the timer".)
3. **`active` is cleared mid-fade.** The ring is removed and `onDone` is not called. (Task 1 test "clearing active during the fade cancels onDone".)
4. **Unmount while active.** No timer fires after unmount: no `onDone` and no state-update warning. (Task 1 test "unmount clears timers".)
5. **`jsdom`/old browsers without `matchMedia`.** No crash, and the motion path is assumed. (The guard is in the code. Every Task 1 test runs without a `matchMedia` stub except the reduced-motion ones.)

---

### Task 1: `Highlight` component + tests + exports

**Files:**

- Create: `packages/design-system/src/components/Highlight/Highlight.tsx`
- Create: `packages/design-system/src/components/Highlight/Highlight.module.scss`
- Create: `packages/design-system/src/components/Highlight/Highlight.tokens.scss`
- Create: `packages/design-system/src/components/Highlight/Highlight.test.tsx`
- Create: `packages/design-system/src/components/Highlight/index.ts`
- Modify: `packages/design-system/src/index.ts`. Add the exports right after the `LiveRegion` exports (lines 33–34).

**Interfaces:**

- Produces: `Highlight(props: HighlightProps): ReactElement`, and `export interface HighlightProps { active: boolean; duration?: number; onDone?: () => void; scrollIntoView?: boolean; focus?: boolean; children: ReactElement }`.

- [ ] **Step 1: Write the failing tests**

`packages/design-system/src/components/Highlight/Highlight.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import { Highlight } from './Highlight';

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

const block = () => screen.getByTestId('block');

beforeEach(() => {
  vi.useFakeTimers();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  // @ts-expect-error -- jsdom has no matchMedia; remove any per-test stub
  delete window.matchMedia;
});

describe('Highlight', () => {
  it('renders no wrapper and leaves an inactive child untouched', () => {
    const { container } = render(
      <Highlight active={false}>
        <div data-testid="block" className="own" />
      </Highlight>,
    );
    expect(container.firstChild).toBe(block());
    expect(block()).toHaveAttribute('class', 'own');
    expect(block()).not.toHaveAttribute('data-highlight');
  });

  it('merges className and keeps the child ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Highlight active>
        <div data-testid="block" className="own" ref={ref} />
      </Highlight>,
    );
    expect(block().className).toMatch(/^own \S+$/);
    expect(block()).toHaveAttribute('data-highlight', 'on');
    expect(ref.current).toBe(block());
  });

  it('runs on → fading → done and calls onDone once', () => {
    const onDone = vi.fn();
    render(
      <Highlight active duration={1000} onDone={onDone}>
        <div data-testid="block" />
      </Highlight>,
    );
    expect(block()).toHaveAttribute('data-highlight', 'on');
    act(() => vi.advanceTimersByTime(1000));
    expect(block()).toHaveAttribute('data-highlight', 'fading');
    expect(onDone).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(260));
    expect(block()).not.toHaveAttribute('data-highlight');
    expect(block()).not.toHaveAttribute('class');
    expect(onDone).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(10_000));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('defaults duration to 3000ms', () => {
    render(
      <Highlight active>
        <div data-testid="block" />
      </Highlight>,
    );
    act(() => vi.advanceTimersByTime(2999));
    expect(block()).toHaveAttribute('data-highlight', 'on');
    act(() => vi.advanceTimersByTime(1));
    expect(block()).toHaveAttribute('data-highlight', 'fading');
  });

  it('never ends with duration={Infinity}', () => {
    const onDone = vi.fn();
    render(
      <Highlight active duration={Infinity} onDone={onDone}>
        <div data-testid="block" />
      </Highlight>,
    );
    act(() => vi.advanceTimersByTime(60_000));
    expect(block()).toHaveAttribute('data-highlight', 'on');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('clearing active during the fade removes the ring and cancels onDone', () => {
    const onDone = vi.fn();
    const { rerender } = render(
      <Highlight active duration={1000} onDone={onDone}>
        <div data-testid="block" />
      </Highlight>,
    );
    act(() => vi.advanceTimersByTime(1100));
    expect(block()).toHaveAttribute('data-highlight', 'fading');
    rerender(
      <Highlight active={false} duration={1000} onDone={onDone}>
        <div data-testid="block" />
      </Highlight>,
    );
    expect(block()).not.toHaveAttribute('data-highlight');
    act(() => vi.advanceTimersByTime(10_000));
    expect(onDone).not.toHaveBeenCalled();
  });

  it('new onDone identity on re-render does not restart the timer', () => {
    const calls: number[] = [];
    function Host() {
      const [n, setN] = useState(0);
      return (
        <>
          <button onClick={() => setN((x) => x + 1)}>tick</button>
          <Highlight active duration={1000} onDone={() => calls.push(n)}>
            <div data-testid="block" />
          </Highlight>
        </>
      );
    }
    render(<Host />);
    act(() => vi.advanceTimersByTime(900));
    act(() => screen.getByText('tick').click());
    act(() => vi.advanceTimersByTime(100 + 260));
    // Fired on the original schedule, through the LATEST callback.
    expect(calls).toEqual([1]);
  });

  it('re-triggers when active toggles false → true', () => {
    const onDone = vi.fn();
    const el = (active: boolean) => (
      <Highlight active={active} duration={1000} onDone={onDone}>
        <div data-testid="block" />
      </Highlight>
    );
    const { rerender } = render(el(true));
    act(() => vi.advanceTimersByTime(1260));
    expect(onDone).toHaveBeenCalledTimes(1);
    rerender(el(false));
    rerender(el(true));
    expect(block()).toHaveAttribute('data-highlight', 'on');
    act(() => vi.advanceTimersByTime(1260));
    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it('unmount clears timers', () => {
    const onDone = vi.fn();
    const { unmount } = render(
      <Highlight active duration={1000} onDone={onDone}>
        <div data-testid="block" />
      </Highlight>,
    );
    unmount();
    act(() => vi.advanceTimersByTime(10_000));
    expect(onDone).not.toHaveBeenCalled();
  });

  it('scrolls and focuses on activation only when asked', () => {
    const { rerender } = render(
      <Highlight active={false} scrollIntoView focus>
        <div data-testid="block" tabIndex={-1} />
      </Highlight>,
    );
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    const focusSpy = vi.spyOn(block(), 'focus');
    rerender(
      <Highlight active scrollIntoView focus>
        <div data-testid="block" tabIndex={-1} />
      </Highlight>,
    );
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      block: 'center',
      inline: 'nearest',
      behavior: 'smooth',
    });
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(block()).toHaveFocus();
  });

  it('does not scroll or focus without the flags', () => {
    render(
      <Highlight active>
        <div data-testid="block" tabIndex={-1} />
      </Highlight>,
    );
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    expect(block()).not.toHaveFocus();
  });

  it('under reduced motion: instant scroll, no fading phase', () => {
    mockReducedMotion(true);
    const onDone = vi.fn();
    render(
      <Highlight active duration={1000} onDone={onDone} scrollIntoView>
        <div data-testid="block" />
      </Highlight>,
    );
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'auto' }),
    );
    act(() => vi.advanceTimersByTime(1000));
    expect(block()).not.toHaveAttribute('data-highlight');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('adds no ARIA, role or tabindex to the child', () => {
    render(
      <Highlight active focus>
        <div data-testid="block" />
      </Highlight>,
    );
    const attrs = Array.from(block().attributes).map((a) => a.name);
    expect(attrs.filter((n) => n === 'role' || n === 'tabindex' || n.startsWith('aria-'))).toEqual(
      [],
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd packages/design-system && npx vitest run src/components/Highlight`
Expected: FAIL. `Cannot find module './Highlight'`.

- [ ] **Step 3: Write the tokens and styles**

`Highlight.tokens.scss`:

```scss
:root {
  // ─── Ring (inset outline) ──────────────────────────────────────────────
  --highlight-ring: var(--ring-accent);
  --highlight-ring-width: var(--ring-width);

  // ─── Glow (inset box-shadow) ───────────────────────────────────────────
  --highlight-glow: color-mix(in srgb, var(--ring-accent) 22%, transparent);
  --highlight-glow-peak: color-mix(in srgb, var(--ring-accent) 45%, transparent);
  --highlight-glow-blur: var(--space-4);

  // ─── Motion ────────────────────────────────────────────────────────────
  --highlight-pulse-duration: 700ms;
  --highlight-fade: var(--transition-slow); // Highlight.tsx FADE_MS mirrors this (260ms)
}
```

`Highlight.module.scss`:

```scss
@use './Highlight.tokens';

// Inset on purpose: the child's own `overflow: hidden` (Card) and its
// parent's `overflow: auto` (a DashboardCanvas cell) would clip an outset
// ring or glow. Outline + box-shadow only, so there's no layout shift.
// `[data-highlight]` lifts specificity above the child's own single-class rules
// (CSS-module order between files isn't guaranteed).
// Known limit: Chrome doesn't paint box-shadow on <tr>, so table rows get the
// ring only.
.highlight[data-highlight] {
  outline: var(--highlight-ring-width) solid var(--highlight-ring);
  outline-offset: calc(-1 * var(--highlight-ring-width));
  box-shadow: inset 0 0 var(--highlight-glow-blur) var(--highlight-glow);
  transition:
    outline-color var(--highlight-fade),
    box-shadow var(--highlight-fade);
  animation: highlight-pulse var(--highlight-pulse-duration) ease-out;
}

.highlight[data-highlight='fading'] {
  outline-color: transparent;
  box-shadow: inset 0 0 var(--highlight-glow-blur) transparent;
}

@keyframes highlight-pulse {
  from {
    box-shadow: inset 0 0 var(--highlight-glow-blur) var(--highlight-glow-peak);
  }
}

@media (prefers-reduced-motion: reduce) {
  .highlight[data-highlight] {
    animation: none;
    transition: none;
  }
}
```

- [ ] **Step 4: Write the component**

`Highlight.tsx`:

```tsx
import {
  Children,
  cloneElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type Ref,
} from 'react';
import { mergeRefs } from '../_internal/refs';
import styles from './Highlight.module.scss';

/** Mirrors `--highlight-fade` (`--transition-slow`, 260ms). */
const FADE_MS = 260;

export interface HighlightProps {
  /**
   * Turns the highlight on. Each false → true change starts it once: the ring
   * shows, the optional scroll and focus run, and after `duration` it fades
   * out and `onDone` fires. Setting it back to false early removes the ring at
   * once WITHOUT calling `onDone`. Keeping it `true` doesn't restart anything;
   * toggle false → true to highlight again.
   */
  active: boolean;
  /**
   * How long the ring holds before fading, in ms. `Infinity` keeps it on
   * until `active` goes false. Default: `3000`.
   */
  duration?: number;
  /**
   * Called once, after the fade ends (straight after `duration` under
   * `prefers-reduced-motion`). Typically clears the consumer's `active`
   * state. Not called when `active` is cleared early or on unmount.
   */
  onDone?: () => void;
  /**
   * On activation, scroll the child to the vertical centre of its scroll
   * container. Smooth, or instant under `prefers-reduced-motion`.
   * Default: `false`.
   */
  scrollIntoView?: boolean;
  /**
   * On activation, move focus to the child (`preventScroll`, so it never
   * fights `scrollIntoView`). The child must be focusable: give a
   * non-interactive block (`Card`, `<section>`, `<tr>`) `tabIndex={-1}`.
   * Highlight never adds it for you. Default: `false`.
   */
  focus?: boolean;
  /**
   * Exactly one element that forwards `ref` and `className`: any DS
   * component, or a native element such as `<tr>` or `<li>`. Highlight
   * renders no wrapper of its own.
   */
  children: ReactElement;
}

type Stage = 'on' | 'fading' | 'done';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Temporary attention ring + glow on any single block, with optional scroll and focus.
 * @see docs/components/Highlight.md
 */
export function Highlight({
  active,
  duration = 3000,
  onDone,
  scrollIntoView = false,
  focus = false,
  children,
}: HighlightProps) {
  const child = Children.only(children) as ReactElement<{
    className?: string;
    ref?: Ref<HTMLElement>;
  }>;
  const nodeRef = useRef<HTMLElement | null>(null);
  // Set when a run finishes, so a later `duration` change can't re-arm the
  // timers and call onDone twice. Reset on each activation.
  const doneRef = useRef(false);
  const [stage, setStage] = useState<Stage>('on');

  // Render-phase reset on a false → true change (React's "adjust state when a
  // prop changes" pattern): a new activation always starts at 'on'.
  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setStage('on');
  }

  // Latest callbacks and flags, so a new identity on each render never
  // restarts the timers or re-runs scroll/focus.
  const latest = useRef({ onDone, scrollIntoView, focus });
  useEffect(() => {
    latest.current = { onDone, scrollIntoView, focus };
  });

  // Activation side effects: scroll + focus, once per false → true change.
  useEffect(() => {
    if (!active) return;
    doneRef.current = false;
    const node = nodeRef.current;
    if (!node) return;
    if (latest.current.scrollIntoView) {
      node.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
    if (latest.current.focus) node.focus({ preventScroll: true });
  }, [active]);

  // Lifecycle timers: hold → (fade) → done.
  useEffect(() => {
    // Declared after the activation effect, so doneRef is already reset in the same commit.
    if (!active || doneRef.current || !Number.isFinite(duration)) return;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      doneRef.current = true;
      setStage('done');
      latest.current.onDone?.();
    };
    const holdTimer = setTimeout(() => {
      if (prefersReducedMotion()) {
        finish();
      } else {
        setStage('fading');
        fadeTimer = setTimeout(finish, FADE_MS);
      }
    }, duration);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(fadeTimer);
    };
  }, [active, duration]);

  const phase = active && stage !== 'done' ? stage : undefined;
  const className =
    [child.props.className, phase && styles.highlight].filter(Boolean).join(' ') || undefined;

  return cloneElement(child, {
    className,
    'data-highlight': phase,
    ref: mergeRefs(nodeRef, child.props.ref),
  } as object);
}
```

Changing `duration` mid-hold restarts the hold (it's an effect dependency). After a run finishes, `doneRef` stops a `duration` change from re-arming it.

`index.ts`:

```ts
export { Highlight } from './Highlight';
export type { HighlightProps } from './Highlight';
```

`src/index.ts`, after the `LiveRegion` lines:

```ts
export { Highlight } from './components/Highlight';
export type { HighlightProps } from './components/Highlight';
```

- [ ] **Step 5: Add a test for the duration-change double-fire** (append to the describe block):

```tsx
it('changing duration after it finished does not fire onDone again', () => {
  const onDone = vi.fn();
  const el = (duration: number) => (
    <Highlight active duration={duration} onDone={onDone}>
      <div data-testid="block" />
    </Highlight>
  );
  const { rerender } = render(el(1000));
  act(() => vi.advanceTimersByTime(1260));
  rerender(el(2000));
  act(() => vi.advanceTimersByTime(10_000));
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(block()).not.toHaveAttribute('data-highlight');
});
```

- [ ] **Step 6: Run the tests and verify they pass**

Run: `cd packages/design-system && npx vitest run src/components/Highlight src/publicApi.test.ts`
Expected: PASS. Then run `npx eslint src/components/Highlight` and `npx stylelint "src/components/Highlight/*.scss"`. Both should be clean.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/Highlight packages/design-system/src/index.ts
git commit -m "feat(Highlight): generic attention ring with optional scroll and focus (#628)"
```

---

### Task 2: Docs, AI-PRIMER, manifest

**Files:**

- Create: `packages/design-system/docs/components/Highlight.md`
- Modify: `packages/design-system/AI-PRIMER.md`. Add the line after the `Banner` line (~line 217).
- Modify: `packages/design-system/src/_meta/manifest.ts` and `packages/design-system/scripts/generate-manifest.mjs`. In both `// Feedback` blocks, add `Highlight: 'Feedback',` after `Banner`.
- Regenerate: `src/components.manifest.json` (`npm run build:manifest`). Fill the props table with `npm run build:docs`.

**Interfaces:** Consumes `HighlightProps` from Task 1.

- [ ] **Step 1: Write `docs/components/Highlight.md`**

````markdown
# `<Highlight>` — temporary attention ring on any block

```tsx
const [justAdded, setJustAdded] = useState<string | null>(null);

<Highlight active={row.id === justAdded} onDone={() => setJustAdded(null)}>
  <Table.Row>…</Table.Row>
</Highlight>;
```

Draws an inset accent ring and a soft glow on its single child for `duration` ms (default 3000), then fades it out and calls `onDone`. It renders **no wrapper**: it clones the child and adds a class, `data-highlight` and a ref. So it works on `<tr>`, `<li>`, grid cells and any DS component that forwards `ref` and `className`. It's decorative only: no role, `aria-*` or `tabIndex` changes. Announce the event yourself (for example `<LiveRegion>` "Widget added").

<!-- props:start -->
<!-- props:end -->

- **Bring it to the user's attention in one call:** `<Highlight active scrollIntoView focus>`. On activation it scrolls the child to the centre (instantly under `prefers-reduced-motion`) and focuses it with `preventScroll`. A non-interactive child needs `tabIndex={-1}` to take focus.
- **Inside a `DashboardCanvas`:** wrap what `renderItem` returns:

  ```tsx
  renderItem={(id) => (
    <Highlight active={id === addedId} scrollIntoView focus onDone={() => setAddedId(null)}>
      <DashboardWidget tabIndex={-1} title={widgets[id].title}>…</DashboardWidget>
    </Highlight>
  )}
  ```

- The ring is **inset**, so `overflow: hidden` on the child (`Card`) or `overflow: auto` on its parent (a canvas cell) never clips it.
- Under `prefers-reduced-motion` the ring is static (no pulse, no fade). `onDone` fires straight after `duration`.
- `duration={Infinity}` keeps it on until `active` goes false.
- While it's active, the highlight replaces the child's own `box-shadow` and `outline`.
- Chrome doesn't paint `box-shadow` on `<tr>`, so table rows get the ring without the glow.

**When NOT to use:**

- To mark a persistent selected or current state, use the component's own selected styling (`aria-selected`, `aria-current`).
- To show focus, use `:focus-visible`.
- To report an error, use `Field`'s invalid state or an `Alert`.

#### Anti-patterns

- ❌ `<Highlight active>{'text'}</Highlight>` or multiple children. It needs exactly one element child that forwards `ref` and `className`.
- ❌ Expecting `onDone` after clearing `active` yourself. It only fires when the highlight runs its course.
- ❌ Leaving `active` true forever with the default duration and expecting it to re-flash. Toggle it false → true to re-trigger.
- ❌ Relying on the ring alone to tell screen-reader users something changed. Pair it with a `LiveRegion` announcement.
- ❌ `focus` on a child that can't take focus. Add `tabIndex={-1}`.
````

- [ ] **Step 2: Add the AI-PRIMER line** after `- [\`Banner\`](docs/components/Banner.md) — …`:

```markdown
- [`Highlight`](docs/components/Highlight.md) — temporary attention ring on any block (+ optional scroll/focus)
```

- [ ] **Step 3: Add the CLUSTERS entries** in BOTH files, inside `// Feedback`, after `Banner: 'Feedback',`:

```ts
  Highlight: 'Feedback',
```

- [ ] **Step 4: Regenerate and check**

```bash
cd packages/design-system && npm run build:docs && npm run build:manifest
npx vitest run src/_meta
```

Expected: the `Highlight.md` props table is filled in between the markers, and the `_meta` tests pass. Check that `git diff src/components.manifest.json` only adds the Highlight entry. The manifest can be nondeterministic: if unrelated keys reorder, re-run once, and revert any unrelated churn.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/docs/components/Highlight.md packages/design-system/AI-PRIMER.md packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs packages/design-system/src/components.manifest.json
git commit -m "docs(Highlight): component doc, primer line, manifest cluster (#628)"
```

---

### Task 3: Playground demo + wiring

**Files:**

- Create: `packages/playground/src/pages/components/HighlightDemo.tsx`
- Modify: `packages/playground/src/App.tsx`. Add the import next to `ToastDemo` (line ~127) and `<Route path="/components/highlight" element={<HighlightDemo />} />` next to the toast route (~268).
- Modify: `packages/playground/src/layout/AppShell/navItems.ts`. In the `Feedback` group, after Banner: `{ to: '/components/highlight', label: 'Highlight', icon: Sparkles, end: false },`. Add `Sparkles` to the `lucide-react` import.
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`. Add an entry after the Banner entry.
- Modify: `packages/playground/src/pages/components/overviewSchematics.tsx`. Add a `Highlight` schematic.
- Modify: `packages/playground/src/pages/mockups/registry.ts`. Add `| 'Highlight'` to the `ComponentName` union, in alphabetical position near `'Grid'`/`'Image'`.

**Interfaces:** Consumes `Highlight` from `@eocrm/design-system`.

- [ ] **Step 1: Write the demo**

`HighlightDemo.tsx` (three Examples, each with a live body and a `code` string mirroring it):

```tsx
import { useState } from 'react';
import {
  Button,
  Card,
  DashboardCanvas,
  type DashboardCanvasValue,
  Highlight,
  LiveRegion,
  Stack,
  Table,
  Text,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';
```

Before writing the bodies, open `packages/playground/src/pages/components/DashboardCanvasDemo.tsx` and `TableDemo.tsx` to copy the exact `Table` sub-component names and a `DashboardCanvas` parent with a concrete width.

The three examples:

1. **"Widget added to a dashboard":**
   - A `DashboardCanvas` (`readOnly`, `columns={12}`) inside a parent with a fixed height (`style={{ height: 320, overflow: 'auto' }}`; inline style is fine in the playground) and a starting value of 6 items, 4×3 each.
   - An "Add widget" button appends `{ id: \`w${n}\`, x: 0, y: <max y+h>, w: 4, h: 3 }`and sets`addedId`.
   - `renderItem` = `<Highlight active={id === addedId} scrollIntoView focus onDone={() => setAddedId(null)}><Card tabIndex={-1}><Card.Body>Widget {id}</Card.Body></Card></Highlight>`.
   - A `<LiveRegion>` announces "Widget {id} added".
2. **"Just-created table row":** a small `Table`. "Create contact" prepends a row and highlights it (no scroll or focus).
3. **"Deep-linked section":**
   - Three `Card` sections in a fixed-height scroll box.
   - A "Jump to Billing" button sets `active` on the Billing section with `scrollIntoView focus duration={Infinity}`. A "Clear" button turns it off, which shows the persist-until-cleared mode.
   - Description: "Under prefers-reduced-motion the ring is static and the scroll is instant."

Pass `name="Highlight" componentName="Highlight"` plus a description and `files={getComponentFiles('Highlight')}` to `DemoLayout`.

- [ ] **Step 2: Wire it up.** Add the route, nav item (with the `Sparkles` import), registry union member, and this index entry after Banner:

```tsx
  {
    to: '/components/highlight',
    name: 'Highlight',
    description:
      'Temporary inset attention ring + glow on any block — a just-added widget, a new row, a deep-linked section. Optional scroll into view and focus.',
    preview: SCHEMATICS['Highlight'],
  },
```

Add this schematic (it uses the existing `Row`/`Panel`/`Box` helpers in that file; check their prop names at the top of `overviewSchematics.tsx`):

```tsx
  Highlight: (
    <Row gap={10} style={{ alignItems: 'center' }}>
      <Panel w={60} h={44} />
      <Panel
        w={60}
        h={44}
        style={{ outline: '2px solid var(--ring-accent)', outlineOffset: -2 }}
      />
      <Panel w={60} h={44} />
    </Row>
  ),
```

- [ ] **Step 3: Verify in the browser.** Run the playground on port 8090 (`cd packages/playground && npx vite --port 8090 --strictPort`), then open `/components/highlight`. Check that:
  - "Add widget" scrolls the new widget to centre, focuses it, shows the ring, fades it after about 3s, and the ring isn't clipped by the cell.
  - The table row gets the ring.
  - Billing stays highlighted until you click "Clear".
  - It looks right in dark theme too.

  Close the browser afterwards.

- [ ] **Step 4: Typecheck + lint**

```bash
cd /home/dpws/projects/design-system && make lint && npx tsc -p packages/playground --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src
git commit -m "feat(playground): Highlight demo + wiring (#628)"
```

---

### Task 4: Full gates

- [ ] Run from the repo root and read each exit code:

```bash
make test; echo "test=$?"
make build-lib; echo "build=$?"
make lint; echo "lint=$?"
npm run format:check; echo "fmt=$?"
npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'   # expect 0
```

- [ ] Fix anything red, then commit. Next comes the `pre-push-review` skill (variant A, Standard tier). That's the controller's job after this plan.
