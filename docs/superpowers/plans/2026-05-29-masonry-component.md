# Masonry Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `<Masonry>` layout primitive that packs variable-height children into N columns by greedy shortest-column-first placement (true height-balanced masonry), with a `Grid`-mirrored API.

**Architecture:** A `forwardRef` `<div>` (display:flex) containing N column `<div>`s; children are wrapped in measured cells. Pure helpers (`balanceColumns` / `columnsForWidth` / `roundRobinColumns` / `distributionsEqual`) compute the distribution; a `useLayoutEffect` + guarded `ResizeObserver` measure cell heights + container width and rebalance (container resize → column count; child resize → repack when images settle). First paint is round-robin (SSR/no-JS safe), corrected after measurement. jsdom has no layout/ResizeObserver, so the algorithm is unit-tested via the pure helpers and the component tests assert structure only.

**Tech Stack:** React 19 + TypeScript, `clsx`, `mergeRefs` (`../_internal/refs`), SCSS modules, Vitest (globals, jsdom, RTL). Branch: `feat/masonry-component` (already checked out).

**Spec:** `docs/superpowers/specs/2026-05-29-masonry-component-design.md`

---

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/design-system/src/components/Masonry/masonryUtils.ts` | NEW — pure helpers (`balanceColumns`, `columnsForWidth`, `roundRobinColumns`, `distributionsEqual`) |
| `packages/design-system/src/components/Masonry/Masonry.tokens.scss` | NEW — `--masonry-gap-*` tokens |
| `packages/design-system/src/components/Masonry/Masonry.module.scss` | NEW — flex/column styles + gap classes |
| `packages/design-system/src/components/Masonry/Masonry.tsx` | NEW — component (forwardRef + measure/rebalance) |
| `packages/design-system/src/components/Masonry/Masonry.test.tsx` | NEW — unit tests (helpers + component) |
| `packages/design-system/src/components/Masonry/index.ts` | NEW — exports |
| `packages/design-system/src/index.ts` | MODIFY — re-export Masonry + types |
| `packages/design-system/src/_meta/manifest.ts` | MODIFY — `Masonry: 'Layout'` in `CLUSTERS` |
| `packages/design-system/scripts/generate-manifest.mjs` | MODIFY — `Masonry: 'Layout'` in its CLUSTERS copy |
| `packages/design-system/src/components.manifest.json` | REGEN — `npm run build:manifest` |
| `packages/design-system/AGENTS.md` | MODIFY — `<Masonry>` TL;DR (Layout section) |
| `packages/playground/src/pages/components/MasonryDemo.tsx` | NEW — demo |
| `packages/playground/src/App.tsx` | MODIFY — `/components/masonry` route |
| `packages/playground/src/layout/AppShell/AppShell.tsx` | MODIFY — Layout nav entry + `GalleryVerticalEnd` import |
| `packages/playground/src/pages/components/ComponentsIndex.tsx` | MODIFY — overview card |

---

## Task 1: The `<Masonry>` component (TDD)

**Files:** all under `packages/design-system/src/components/Masonry/`.

- [ ] **Step 1: Create `Masonry.tokens.scss`**

```scss
:root {
  --masonry-gap-xs: var(--space-1);
  --masonry-gap-sm: var(--space-2);
  --masonry-gap-md: var(--space-3);
  --masonry-gap-lg: var(--space-4);
  --masonry-gap-xl: var(--space-6);
  --masonry-gap-2xl: var(--space-8);
}
```

- [ ] **Step 2: Create `Masonry.module.scss`**

```scss
@use './Masonry.tokens';

.masonry {
  display: flex;
  align-items: flex-start;
  width: 100%;
}

.column {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-width: 0;
}

.cell {
  width: 100%;
}

.gapXs {
  gap: var(--masonry-gap-xs);
}
.gapSm {
  gap: var(--masonry-gap-sm);
}
.gapMd {
  gap: var(--masonry-gap-md);
}
.gapLg {
  gap: var(--masonry-gap-lg);
}
.gapXl {
  gap: var(--masonry-gap-xl);
}
.gap2xl {
  gap: var(--masonry-gap-2xl);
}
```

- [ ] **Step 3: Write the failing test** — `Masonry.test.tsx`

```tsx
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Masonry } from './Masonry';
import {
  balanceColumns,
  columnsForWidth,
  roundRobinColumns,
  distributionsEqual,
} from './masonryUtils';

describe('masonryUtils', () => {
  describe('balanceColumns', () => {
    it('round-robins equal-height items', () => {
      expect(balanceColumns([10, 10, 10, 10], 2)).toEqual([
        [0, 2],
        [1, 3],
      ]);
    });
    it('packs into the shortest column (a tall item gets its own column)', () => {
      expect(balanceColumns([100, 10, 10, 10], 2)).toEqual([[0], [1, 2, 3]]);
    });
    it('returns empty columns for no items', () => {
      expect(balanceColumns([], 3)).toEqual([[], [], []]);
    });
    it('leaves trailing columns empty when items < columns', () => {
      expect(balanceColumns([5], 3)).toEqual([[0], [], []]);
    });
    it('clamps columnCount to at least 1', () => {
      expect(balanceColumns([1, 2], 0)).toEqual([[0, 1]]);
    });
  });

  describe('columnsForWidth', () => {
    it('computes how many columns fit', () => {
      expect(columnsForWidth(1000, 240, 16)).toBe(3);
    });
    it('never returns fewer than 1', () => {
      expect(columnsForWidth(100, 240, 16)).toBe(1);
      expect(columnsForWidth(0, 240, 16)).toBe(1);
    });
  });

  describe('roundRobinColumns', () => {
    it('distributes by index across columns', () => {
      expect(roundRobinColumns(6, 3)).toEqual([
        [0, 3],
        [1, 4],
        [2, 5],
      ]);
    });
    it('clamps columnCount to at least 1', () => {
      expect(roundRobinColumns(2, 0)).toEqual([[0, 1]]);
    });
  });

  describe('distributionsEqual', () => {
    it('is true for identical distributions', () => {
      expect(distributionsEqual([[0, 1], [2]], [[0, 1], [2]])).toBe(true);
    });
    it('is false when an item moves columns', () => {
      expect(distributionsEqual([[0, 1], [2]], [[0], [1, 2]])).toBe(false);
    });
  });
});

describe('Masonry', () => {
  it('renders all children', () => {
    render(
      <Masonry columns={3}>
        <div>alpha</div>
        <div>bravo</div>
        <div>charlie</div>
        <div>delta</div>
      </Masonry>,
    );
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('bravo')).toBeInTheDocument();
    expect(screen.getByText('charlie')).toBeInTheDocument();
    expect(screen.getByText('delta')).toBeInTheDocument();
  });

  it('renders one column container per column (fixed columns)', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Masonry ref={ref} columns={3}>
        <div>a</div>
        <div>b</div>
        <div>c</div>
      </Masonry>,
    );
    expect(ref.current).not.toBeNull();
    // The root's direct children are exactly the column containers.
    expect(ref.current!.children).toHaveLength(3);
  });

  it('applies the gap class (default md, overridable) to the root', () => {
    const ref = createRef<HTMLDivElement>();
    const { rerender } = render(
      <Masonry ref={ref} columns={2}>
        <div>a</div>
      </Masonry>,
    );
    expect(ref.current!.className).toMatch(/gapMd/);
    rerender(
      <Masonry ref={ref} columns={2} gap="lg">
        <div>a</div>
      </Masonry>,
    );
    expect(ref.current!.className).toMatch(/gapLg/);
  });

  it('forwards ref to the root and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Masonry ref={ref} columns={2} className="custom">
        <div>a</div>
      </Masonry>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current!.className).toMatch(/custom/);
  });

  it('renders without throwing in responsive mode when ResizeObserver is unavailable (jsdom)', () => {
    expect(() =>
      render(
        <Masonry minColumnWidth="200px">
          <div>x</div>
          <div>y</div>
        </Masonry>,
      ),
    ).not.toThrow();
  });
});
```

- [ ] **Step 4: Run the test — verify it FAILS**

Run: `cd packages/design-system && npx vitest run src/components/Masonry/Masonry.test.tsx`
Expected: FAIL — `Failed to resolve import "./Masonry"` / `"./masonryUtils"` (not created yet).

- [ ] **Step 5: Create `masonryUtils.ts`**

```ts
/** Greedy shortest-column-first packing. Returns `columnCount` arrays of child indices. */
export function balanceColumns(heights: number[], columnCount: number): number[][] {
  const cols = Math.max(1, Math.floor(columnCount));
  const out: number[][] = Array.from({ length: cols }, () => []);
  const colHeights = new Array<number>(cols).fill(0);
  heights.forEach((h, i) => {
    let min = 0;
    for (let c = 1; c < cols; c++) {
      if (colHeights[c] < colHeights[min]) min = c;
    }
    out[min].push(i);
    colHeights[min] += h;
  });
  return out;
}

/** How many columns of `minColumnPx` (+ `gapPx` between) fit in `width`. Never < 1. */
export function columnsForWidth(width: number, minColumnPx: number, gapPx: number): number {
  if (width <= 0 || minColumnPx <= 0) return 1;
  return Math.max(1, Math.floor((width + gapPx) / (minColumnPx + gapPx)));
}

/** Index-order distribution across columns (the pre-measure / SSR first paint). */
export function roundRobinColumns(itemCount: number, columnCount: number): number[][] {
  const cols = Math.max(1, Math.floor(columnCount));
  const out: number[][] = Array.from({ length: cols }, () => []);
  for (let i = 0; i < itemCount; i++) out[i % cols].push(i);
  return out;
}

/** Deep-equal two column distributions (used to skip no-op state updates). */
export function distributionsEqual(a: number[][], b: number[][]): boolean {
  if (a.length !== b.length) return false;
  for (let c = 0; c < a.length; c++) {
    if (a[c].length !== b[c].length) return false;
    for (let i = 0; i < a[c].length; i++) {
      if (a[c][i] !== b[c][i]) return false;
    }
  }
  return true;
}
```

- [ ] **Step 6: Create `Masonry.tsx`**

```tsx
import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { mergeRefs } from '../_internal/refs';
import {
  balanceColumns,
  columnsForWidth,
  distributionsEqual,
  roundRobinColumns,
} from './masonryUtils';
import styles from './Masonry.module.scss';

/** Gap between columns and between items. Same token scale as Grid/Stack. */
export type MasonryGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Pixel value of each gap token (mirrors --space-1/2/3/4/6/8). Used only for
// the responsive column-count math; the rendered gap uses the token classes.
const GAP_PX: Record<MasonryGap, number> = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32 };

const gapClass: Record<MasonryGap, string> = {
  xs: styles.gapXs,
  sm: styles.gapSm,
  md: styles.gapMd,
  lg: styles.gapLg,
  xl: styles.gapXl,
  '2xl': styles.gap2xl,
};

interface MasonryBaseProps {
  /** `xs`(4) / `sm`(8) / `md`(12, default) / `lg`(16) / `xl`(24) / `2xl`(32). */
  gap?: MasonryGap;
  children?: ReactNode;
}
interface MasonryFixedColumns extends MasonryBaseProps, HTMLAttributes<HTMLDivElement> {
  /** Fixed number of columns. Mutually exclusive with `minColumnWidth`. */
  columns: number;
  minColumnWidth?: never;
}
interface MasonryResponsive extends MasonryBaseProps, HTMLAttributes<HTMLDivElement> {
  /** Min column width (px) for a responsive column count. Default `'240px'`. */
  minColumnWidth?: string;
  columns?: never;
}
export type MasonryProps = MasonryFixedColumns | MasonryResponsive;

/**
 * Height-balanced masonry layout. Packs variable-height children into columns,
 * placing each into the currently-shortest column so the result reads
 * left→right in source order with balanced column heights (Pinterest-style).
 *
 * Pick exactly one of `columns` (fixed N) or `minColumnWidth` (responsive count
 * from container width). TypeScript enforces this; neither → `minColumnWidth="240px"`.
 *
 * Heights are measured on the client; a `ResizeObserver` rebalances on container
 * resize and when child content settles (e.g. images finish loading). Before
 * measurement (and without JS) children render round-robin across the columns.
 *
 * @example
 * // Responsive photo wall.
 * <Masonry minColumnWidth="220px" gap="md">
 *   {photos.map((p) => <Image key={p.id} src={p.src} alt={p.alt} aspectRatio={p.ratio} />)}
 * </Masonry>
 *
 * @example
 * // Fixed 3-column card wall.
 * <Masonry columns={3} gap="lg">
 *   {notes.map((n) => <Card key={n.id}>{n.body}</Card>)}
 * </Masonry>
 *
 * @remarks When NOT to use
 * - Equal-height tiles / true 2D rows → use `<Grid>`.
 * - A single vertical column → use `<Stack>`.
 * - Wrapping rows of unequal items (toolbars, tag lists) → use `<Cluster>`.
 *
 * @remarks Anti-patterns
 * - ❌ Interactive / stateful children (videos, focus-holding forms). Rebalancing
 *   re-parents items between columns, so React remounts them — Masonry is for
 *   display content (image walls, card galleries).
 * - ❌ Expecting a single top-to-bottom reading column. Items are distributed
 *   across columns; order is left→right by placement.
 */
export const Masonry = forwardRef<HTMLDivElement, MasonryProps>(function Masonry(
  { gap = 'md', columns, minColumnWidth, className, children, ...rest },
  ref,
) {
  const items = useMemo(() => Children.toArray(children).filter(isValidElement), [children]);
  const itemCount = items.length;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<Array<HTMLDivElement | null>>([]);

  const minColPx = minColumnWidth ? parseFloat(minColumnWidth) : 240;
  const fixedColumnCount = columns != null ? Math.max(1, Math.floor(columns)) : null;
  const initialCount = fixedColumnCount ?? 1;

  const [columnCount, setColumnCount] = useState(initialCount);
  const [cols, setCols] = useState<number[][]>(() => roundRobinColumns(itemCount, initialCount));

  const recompute = useCallback(() => {
    const nextCount =
      fixedColumnCount ?? columnsForWidth(rootRef.current?.offsetWidth ?? 0, minColPx, GAP_PX[gap]);
    const heights = Array.from(
      { length: itemCount },
      (_, i) => cellRefs.current[i]?.getBoundingClientRect().height ?? 0,
    );
    const next = balanceColumns(heights, nextCount);
    setColumnCount((prev) => (prev === nextCount ? prev : nextCount));
    setCols((prev) => (distributionsEqual(prev, next) ? prev : next));
  }, [fixedColumnCount, minColPx, gap, itemCount]);

  useLayoutEffect(() => {
    recompute();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => recompute());
    if (rootRef.current) ro.observe(rootRef.current);
    for (let i = 0; i < itemCount; i++) {
      const el = cellRefs.current[i];
      if (el) ro.observe(el);
    }
    return () => ro.disconnect();
  }, [recompute, itemCount]);

  // Guard against a transient columnCount/distribution mismatch (the frame
  // between the two setState calls): fall back to round-robin for that render.
  const distribution =
    cols.length === columnCount ? cols : roundRobinColumns(itemCount, columnCount);

  return (
    <div
      ref={mergeRefs(ref, rootRef)}
      className={clsx(styles.masonry, gapClass[gap], className)}
      {...rest}
    >
      {distribution.map((indices, col) => (
        <div key={col} className={clsx(styles.column, gapClass[gap])}>
          {indices.map((i) => (
            <div
              key={i}
              className={styles.cell}
              ref={(el) => {
                cellRefs.current[i] = el;
              }}
            >
              {items[i]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});
```

- [ ] **Step 7: Create `index.ts`**

```ts
export { Masonry } from './Masonry';
export type { MasonryProps, MasonryGap } from './Masonry';
```

- [ ] **Step 8: Run the test — verify it PASSES**

Run: `cd packages/design-system && npx vitest run src/components/Masonry/Masonry.test.tsx`
Expected: PASS — all tests green (helpers + component).

- [ ] **Step 9: Commit**

```bash
git add packages/design-system/src/components/Masonry
git commit -m "feat(Masonry): height-balanced masonry layout primitive"
```

---

## Task 2: Library wiring (export + manifest + AGENTS)

**Files:** `src/index.ts`, `src/_meta/manifest.ts`, `scripts/generate-manifest.mjs`, `src/components.manifest.json`, `AGENTS.md` (all under `packages/design-system/`).

- [ ] **Step 1: Re-export from `src/index.ts`**

Add directly after the `Grid` export block (which ends at the `} from './components/Grid';` line):

```ts
export { Masonry } from './components/Masonry';
export type { MasonryProps, MasonryGap } from './components/Masonry';
```

- [ ] **Step 2: Classify in BOTH manifest sources**

In `packages/design-system/src/_meta/manifest.ts`, add to the `CLUSTERS` map next to `Grid: 'Layout',`:

```ts
  Masonry: 'Layout',
```

In `packages/design-system/scripts/generate-manifest.mjs`, add the SAME line to its CLUSTERS object (the `.mjs` is the script `npm run build:manifest` actually runs; the two must stay in sync).

- [ ] **Step 3: Regenerate the committed manifest**

Run: `cd packages/design-system && npm run build:manifest`
Expected: `src/components.manifest.json` gains a `Masonry` entry with `tier: 'primitive'`, `cluster: 'Layout'`, `composes: []`. Stage the regenerated file.

- [ ] **Step 4: Add the AGENTS.md TL;DR** (in the Layout section, near `<Grid>`):

````markdown
### `<Masonry>` — height-balanced masonry layout

```tsx
<Masonry minColumnWidth="220px" gap="md">
  {photos.map((p) => (
    <Image key={p.id} src={p.src} alt={p.alt} aspectRatio={p.ratio} />
  ))}
</Masonry>
```

Packs variable-height children into columns (greedy shortest-column-first) →
left→right reading order, balanced heights. Measures on the client + rebalances
via `ResizeObserver`.

- `columns: number` **xor** `minColumnWidth: string` (default `'240px'`, px).
- `gap`: `xs`|`sm`|`md` (default)|`lg`|`xl`|`2xl`.

**When NOT to use:** equal-height tiles → `<Grid>`; one column → `<Stack>`;
wrapping rows → `<Cluster>`. Display content only — rebalancing remounts children.
````

- [ ] **Step 5: Verify library gates (structure + manifest meta-tests)**

Run: `make build-lib && make test`
Expected: typecheck clean; all tests pass, including `structure.test.ts` (Masonry has the 4 required files + index export) and the manifest meta-test.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/index.ts packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs packages/design-system/src/components.manifest.json packages/design-system/AGENTS.md
git commit -m "feat(Masonry): export + manifest classification + AGENTS entry"
```

---

## Task 3: Playground demo + nav wiring

**Files:** `MasonryDemo.tsx` (NEW), `App.tsx`, `AppShell.tsx`, `ComponentsIndex.tsx` (all under `packages/playground/src/`).

- [ ] **Step 1: Create `packages/playground/src/pages/components/MasonryDemo.tsx`**

```tsx
import { Masonry, Image, Card, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

// Variable-height numbered tiles so the left→right balancing is visible.
const HEIGHTS = [80, 140, 100, 60, 120, 90, 160, 70, 110, 130, 95, 150];
const TILES = HEIGHTS.map((h, i) => ({ n: i + 1, h }));

function Tile({ n, h }: { n: number; h: number }) {
  return (
    <div
      style={{
        height: h,
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-accent-subtle-bg)',
        color: 'var(--color-accent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 18,
      }}
    >
      {n}
    </div>
  );
}

const PHOTOS = [
  { src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&q=80', r: '4 / 3' },
  { src: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400&q=80', r: '3 / 4' },
  { src: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&q=80', r: '1 / 1' },
  { src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80', r: '16 / 9' },
  { src: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=400&q=80', r: '3 / 4' },
  { src: 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=400&q=80', r: '4 / 3' },
];

export function MasonryDemo() {
  return (
    <DemoLayout
      name="Masonry"
      componentName="Masonry"
      description="Packs variable-height children into columns, placing each into the shortest column (height-balanced, left→right reading order). Responsive column count or a fixed number. For equal-height tiles use Grid; for one column use Stack."
      files={getComponentFiles('Masonry')}
    >
      <Example
        title="Responsive"
        description="minColumnWidth sets the target column width; the column count reflows with the container. Numbers read left→right across the top row."
        code={`<Masonry minColumnWidth="160px" gap="sm">{tiles}</Masonry>`}
      >
        <Masonry minColumnWidth="160px" gap="sm">
          {TILES.map((t) => (
            <Tile key={t.n} n={t.n} h={t.h} />
          ))}
        </Masonry>
      </Example>

      <Example
        title="Fixed columns"
        description="A fixed number of equal-width columns at any container width."
        code={`<Masonry columns={3} gap="md">{tiles}</Masonry>`}
      >
        <Masonry columns={3} gap="md">
          {TILES.map((t) => (
            <Tile key={t.n} n={t.n} h={t.h} />
          ))}
        </Masonry>
      </Example>

      <Example
        title="Photo wall"
        description="The canonical use: Image children of varied aspect ratios. Masonry rebalances once the images load."
        code={`<Masonry minColumnWidth="200px" gap="sm">{photos.map(p => <Image … aspectRatio={p.r} />)}</Masonry>`}
      >
        <Masonry minColumnWidth="200px" gap="sm">
          {PHOTOS.map((p) => (
            <Image key={p.src} src={p.src} alt="" aspectRatio={p.r} />
          ))}
        </Masonry>
      </Example>

      <Example
        title="Card wall"
        description="Cards of differing content length pack into balanced columns."
        code={`<Masonry minColumnWidth="240px" gap="md">{cards}</Masonry>`}
      >
        <Masonry minColumnWidth="240px" gap="md">
          {[
            'Short note.',
            'A medium note that runs onto a second line so its card is a bit taller than the others.',
            'Tiny.',
            'Another note with enough text to wrap across two or three lines and change the height meaningfully versus its neighbours.',
            'Mid-length note here.',
            'One more.',
          ].map((body, i) => (
            <Card key={i} padding="md">
              <Text size="sm">{body}</Text>
            </Card>
          ))}
        </Masonry>
      </Example>
    </DemoLayout>
  );
}
```

(Demo pages are NOT mockups — inline `style` for the demo tiles is fine here, matching other demos.)

- [ ] **Step 2: Add the route in `App.tsx`**

Add the import alongside the other component-demo imports:

```tsx
import { MasonryDemo } from './pages/components/MasonryDemo';
```

Add the route in the `/components/*` block (e.g. right after the `/components/grid` route):

```tsx
            <Route path="/components/masonry" element={<MasonryDemo />} />
```

- [ ] **Step 3: Add the sidebar nav entry in `AppShell.tsx`**

Add `GalleryVerticalEnd` to the `lucide-react` import block (confirm it isn't already imported; if the icon is unavailable in the installed lucide version, use `LayoutGrid` — already imported — or `Rows3`). Then add to the `Layout` group in `componentGroups`, right after the `Grid` item:

```tsx
      { to: '/components/masonry', label: 'Masonry', icon: GalleryVerticalEnd, end: false },
```

- [ ] **Step 4: Add the overview card in `ComponentsIndex.tsx`**

Add `import { Masonry } from '@eocrm/design-system';` to the import block, then add an entry to the `items` array (match the existing `{ to, name, description, preview }` shape):

```tsx
  {
    to: '/components/masonry',
    name: 'Masonry',
    description: 'Height-balanced columns for variable-height items.',
    preview: (
      <div style={{ width: '100%', maxWidth: '260px' }}>
        <Masonry columns={3} gap="sm">
          {[40, 64, 28, 52, 36, 48].map((h, i) => (
            <div
              key={i}
              style={{ height: h, borderRadius: 'var(--radius-sm)', background: 'var(--color-accent-subtle-bg)' }}
            />
          ))}
        </Masonry>
      </div>
    ),
  },
```

- [ ] **Step 5: Build the playground**

Run: `make build`
Expected: typecheck + bundle pass. If `GalleryVerticalEnd` doesn't resolve, swap to an imported layout icon and rebuild.

- [ ] **Step 6: Commit**

```bash
git add packages/playground/src/pages/components/MasonryDemo.tsx packages/playground/src/App.tsx packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/pages/components/ComponentsIndex.tsx
git commit -m "feat(playground): Masonry demo + route + nav + index card"
```

---

## Task 4: Gates + Hard-rule-8 library review loop

Mandatory — the change touches `packages/design-system/**`.

- [ ] **Step 1: Run all gates**

```bash
make test
make build-lib
make lint
make build
npm pack --dry-run -w @eocrm/design-system    # no test files in the tarball
```
All must pass.

- [ ] **Step 2: Spawn a fresh-context reviewer** (`general-purpose`) on `git diff main..HEAD`. Have it read `packages/design-system/CLAUDE.md` + the spec, then review the 10 Rule-8 categories. Specifically verify:
  - The pure helpers match their tests and the greedy algorithm is correct; `distributionsEqual`/functional-setState prevent render loops; the `ResizeObserver` guard is correct (jsdom-safe); `useLayoutEffect` deps don't cause an infinite loop (recompute is memoized; setState is no-op when unchanged).
  - Rule 4 (Masonry is a documented layout-owning exception — flex/`width:100%` only, no margins/positioning), Rule 5 (export + types), Rule 6 (forwardRef + spread + mergeRefs), Rule 7 (JSDoc + examples + @remarks), Rule 1 (tests meaningful — pure algorithm covered directly since jsdom lacks layout).
  - Manifest correctly regenerated (Masonry: primitive/Layout) in BOTH `manifest.ts` and `generate-manifest.mjs`.
  - The remount-on-rebalance tradeoff is documented, not a silent surprise.
  Ask for Critical/Important/Nice-to-have/Regression-watch + verdict (`clean enough to stop` / `keep iterating`).

- [ ] **Step 3: Fix every Critical + Important.** Document deliberate skips.
- [ ] **Step 4: Re-run gates.**
- [ ] **Step 5: Spawn another reviewer**; repeat 3–5 until `clean enough to stop` with 0 Critical / 0 Important.
- [ ] **Step 6: Commit any fixes** (`git commit -m "fix(Masonry): address review findings"`).

---

## Task 5: Visual verification + PR

- [ ] **Step 1: Visual check** — `make dev` (or reuse the running playground on :8080), drive a browser (Playwright MCP) to `http://localhost:8080/components/masonry`. Confirm: responsive tiles balance with the top row reading 1·2·3 left→right; fixed `columns={3}`; the photo wall packs into balanced columns after images load; resizing the window reflows the column count. Screenshot. Also check the console has no NEW errors on the page.

- [ ] **Step 2: Push** — `git push -u origin feat/masonry-component` (fix any prettier issues the pre-push hook reports with `prettier --write`, never `--no-verify`).

- [ ] **Step 3: Open the PR**

```bash
gh pr create --base main --title "Add Masonry component (height-balanced layout)" --body "$(cat <<'EOF'
## Summary
A `<Masonry>` layout primitive: packs variable-height children into columns by greedy shortest-column-first placement (true height-balanced masonry, left→right reading order). API mirrors `Grid` (`columns` xor `minColumnWidth`, `gap` token scale). Pure `balanceColumns`/`columnsForWidth`/`roundRobinColumns` helpers (unit-tested directly); `ResizeObserver`-driven rebalance (guarded for SSR/jsdom); round-robin first paint. Layout cluster, primitive tier, no i18n. Tests, demo, exports, manifest, and AGENTS entry included.

## Test Plan
- [x] make test / build-lib / lint / build green; npm pack excludes tests
- [x] Hard-rule-8 review loop → clean
- [x] Visual check at /components/masonry (responsive, fixed columns, photo wall, reflow)
- [ ] CI Quality / check

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Wait for `Quality / check`.**

---

## Self-review checklist

1. **Spec coverage:** greedy shortest-column (balanceColumns, Task 1) ✓; columns xor minColumnWidth (props, Task 1) ✓; gap token scale (tokens+scss+GAP_PX, Task 1) ✓; measure + ResizeObserver rebalance + round-robin first paint (Masonry.tsx, Task 1) ✓; pure-helper testability (Task 1 tests) ✓; Rule-4 layout-owning (scss) ✓; export/manifest(both files)/AGENTS (Task 2) ✓; demo/route/nav/index card (Task 3) ✓; Rule-8 loop (Task 4) ✓; no i18n ✓.
2. **Placeholders:** none — full source for utils/scss/tokens/test/tsx/index, exact wiring edits, exact demo, exact commands.
3. **Type/name consistency:** `balanceColumns`/`columnsForWidth`/`roundRobinColumns`/`distributionsEqual`, `MasonryProps`/`MasonryGap`, `GAP_PX`/`gapClass`, `columnCount`/`cols`/`distribution`, `cellRefs`/`rootRef` used consistently across utils, component, and tests.
