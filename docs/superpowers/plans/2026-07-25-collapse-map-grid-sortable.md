# Graduated collapse for Grid + collapseBelow for Sortable — Implementation Plan (#318)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `collapseBelow` on `<Grid>` and (new) on `<Sortable arrangement="grid">` accepts either the existing breakpoint string (binary collapse) or a breakpoint→columns map (graduated collapse, e.g. `{ md: 6, sm: 1 }`).

**Architecture:** The map form works by (a) container-query CSS rules on new per-breakpoint "step" classes that set `grid-template-columns` from per-breakpoint inline custom properties (`--grid-columns-md` etc.) injected by the container, and (b) per-item clamped spans computed in JS — the container provides its collapse map via a React context, each Item stamps `--grid-item-span-<bp>` / `--sortable-item-span-<bp>` inline with its span clamped to the step's column count. Step blocks are declared lg → md → sm so at a narrow width the smallest matching breakpoint wins by source order. The legacy string form is untouched (Grid) / mirrored (Sortable).

**Tech Stack:** React 18, TypeScript, SCSS modules, CSS container queries, Vitest + RTL (globals on — no `describe/it/expect` imports).

## Global Constraints

- Repo: `/home/dpws/projects/design-system`, branch `feat/collapse-map` (already checked out).
- Tokens-only SCSS; `grid-column` needs `// stylelint-disable-next-line property-disallowed-list -- <reason>` on the line above (see existing examples in `Grid.module.scss`).
- Every new/changed exported prop and type gets full JSDoc (package CLAUDE.md rule 7).
- Tests: Vitest globals — do NOT import `describe/it/expect/vi`. Import `render, screen` from `@testing-library/react`.
- Run tests from repo root: `npx vitest run packages/design-system/src/components/Grid/Grid.test.tsx` (or the Sortable path).
- Commit after each task; conventional-commit messages.

---

### Task 1: Shared collapse plumbing (`_internal`)

**Files:**

- Create: `packages/design-system/src/components/_internal/collapse.scss`
- Create: `packages/design-system/src/components/_internal/collapse.ts`
- Modify: `packages/design-system/src/components/_internal/gridSpan.ts` (add clamp resolver)
- Modify: `packages/design-system/src/components/Grid/Grid.tokens.scss` (drop the moved SCSS vars)
- Modify: `packages/design-system/src/components/Grid/Grid.module.scss` (repoint `tokens.$grid-collapse-*` → `bp.$collapse-*`)
- Test: `packages/design-system/src/components/_internal/gridSpan.test.ts` (create if absent, else extend)

**Interfaces:**

- Produces: SCSS `$collapse-sm: 480px / $collapse-md: 640px / $collapse-lg: 768px` (namespace `bp` via `@use '../_internal/collapse' as bp;`).
- Produces: `type CollapseBreakpoint = 'sm' | 'md' | 'lg'`, `type CollapseColumnsMap = Partial<Record<CollapseBreakpoint, number>>`, `const CollapseColumnsContext: React.Context<CollapseColumnsMap | null>`, `const COLLAPSE_BREAKPOINTS: readonly CollapseBreakpoint[]` (order `['lg','md','sm']`), `function collapseTrackTemplate(columns: number): string` → `` `repeat(${columns}, minmax(0, 1fr))` ``.
- Produces: `function resolveCollapsedGridItemSpan(span: GridItemSpan | undefined, columns: number): string` in `gridSpan.ts`.

- [ ] **Step 1: Write failing tests for the clamp resolver** — append to (or create) `gridSpan.test.ts`:

```ts
import { resolveCollapsedGridItemSpan } from './gridSpan';

describe('resolveCollapsedGridItemSpan (#318)', () => {
  it('returns auto for a span-less item', () => {
    expect(resolveCollapsedGridItemSpan(undefined, 6)).toBe('auto');
  });
  it('keeps spans smaller than the step columns', () => {
    expect(resolveCollapsedGridItemSpan(3, 6)).toBe('span 3');
    expect(resolveCollapsedGridItemSpan('25%', 6)).toBe('span 3');
  });
  it('clamps spans >= step columns to the full row', () => {
    expect(resolveCollapsedGridItemSpan(9, 6)).toBe('1 / -1');
    expect(resolveCollapsedGridItemSpan('75%', 6)).toBe('1 / -1');
    expect(resolveCollapsedGridItemSpan(6, 6)).toBe('1 / -1');
  });
  it('full-row spans and single-column steps are always 1 / -1', () => {
    expect(resolveCollapsedGridItemSpan('100%', 6)).toBe('1 / -1');
    expect(resolveCollapsedGridItemSpan('full', 6)).toBe('1 / -1');
    expect(resolveCollapsedGridItemSpan(3, 1)).toBe('1 / -1');
    expect(resolveCollapsedGridItemSpan(undefined, 1)).toBe('auto');
  });
});
```

- [ ] **Step 2: Run** `npx vitest run packages/design-system/src/components/_internal/gridSpan.test.ts` — expect FAIL (function not exported).

- [ ] **Step 3: Implement.**

`_internal/collapse.scss`:

```scss
// Container-width collapse thresholds shared by Grid's `collapseBelow` and
// Sortable's grid-arrangement `collapseBelow`. SCSS constants (not CSS custom
// properties): container-query conditions can't read custom properties.
// Keep in sync with the CollapseBreakpoint JSDoc in collapse.ts.
$collapse-sm: 480px;
$collapse-md: 640px;
$collapse-lg: 768px;
```

`_internal/collapse.ts`:

```ts
import { createContext } from 'react';

/**
 * Container-width threshold for `collapseBelow` on Grid / Sortable (grid
 * arrangement). `sm` 480px / `md` 640px / `lg` 768px — measured against the
 * grid's OWN width (container query), not the viewport.
 */
export type CollapseBreakpoint = 'sm' | 'md' | 'lg';

/**
 * Graduated collapse: breakpoint → column count. Below each breakpoint the
 * grid re-templates to that many equal columns and every item's span is
 * clamped to fit. E.g. `{ md: 6, sm: 1 }` = 12-col grid above 640px, 6-col
 * between 480–640px, single column below 480px. When several breakpoints
 * match, the smallest wins.
 */
export type CollapseColumnsMap = Partial<Record<CollapseBreakpoint, number>>;

/** Largest → smallest; step CSS is declared in this order so the smallest matching breakpoint wins by source order. */
export const COLLAPSE_BREAKPOINTS: readonly CollapseBreakpoint[] = ['lg', 'md', 'sm'];

/**
 * The container's graduated-collapse map, provided by Grid / Sortable (grid
 * arrangement) to their Items so each can stamp per-breakpoint clamped span
 * custom properties. `null` when the container has no map-form collapse.
 */
export const CollapseColumnsContext = createContext<CollapseColumnsMap | null>(null);

/** Track template for a collapse step — mirrors Grid's fixed-column template. */
export function collapseTrackTemplate(columns: number): string {
  return `repeat(${columns}, minmax(0, 1fr))`;
}
```

Append to `_internal/gridSpan.ts`:

```ts
/**
 * Resolve a span against a graduated-collapse step's column count: spans that
 * fit keep their track count, spans >= the step's columns clamp to the full
 * row (`1 / -1`), full-row spans stay full-row, span-less stays `auto`.
 */
export function resolveCollapsedGridItemSpan(
  span: GridItemSpan | undefined,
  columns: number,
): string {
  if (span === undefined) return 'auto';
  if (span === 'full' || span === '100%' || columns <= 1) return '1 / -1';
  const tracks = typeof span === 'number' ? span : FRACTION_TRACKS[span];
  return tracks >= columns ? '1 / -1' : `span ${tracks}`;
}
```

In `Grid.tokens.scss`: delete the `$grid-collapse-sm/md/lg` block and its comment; leave a pointer comment `// Collapse breakpoints live in ../_internal/collapse.scss (shared with Sortable).`
In `Grid.module.scss`: add `@use '../_internal/collapse' as bp;` at top and replace `tokens.$grid-collapse-sm|md|lg` with `bp.$collapse-sm|md|lg` in the three `@container` conditions.

- [ ] **Step 4: Run** the gridSpan test (PASS) plus `npx vitest run packages/design-system/src/components/Grid/Grid.test.tsx` and `cd packages/design-system && npm run lint:css` — all green.

- [ ] **Step 5: Commit** — `feat(internal): shared collapse breakpoints, map context, clamped span resolver (#318)`

---

### Task 2: Grid — map form of `collapseBelow`

**Files:**

- Modify: `packages/design-system/src/components/Grid/Grid.tsx`
- Modify: `packages/design-system/src/components/Grid/GridItem.tsx`
- Modify: `packages/design-system/src/components/Grid/Grid.module.scss`
- Modify: `packages/design-system/src/components/Grid/index.ts`, `packages/design-system/src/index.ts`
- Test: `packages/design-system/src/components/Grid/Grid.test.tsx`

**Interfaces:**

- Consumes: everything Task 1 produces.
- Produces: `GridFixedColumns.collapseBelow?: GridCollapseBreakpoint | CollapseColumnsMap`; `GridCollapseBreakpoint` becomes an alias of `CollapseBreakpoint`; `CollapseColumnsMap` re-exported from `Grid/index.ts` and `src/index.ts`. Step classes `styles.stepSm/stepMd/stepLg`.

- [ ] **Step 1: Write failing tests** — append to `Grid.test.tsx`:

```tsx
describe('Grid graduated collapse (#318)', () => {
  it('map form adds collapsible + one step class per breakpoint and injects step templates', () => {
    render(
      <Grid columns={12} collapseBelow={{ md: 6, sm: 1 }} data-testid="grid">
        <div>a</div>
      </Grid>,
    );
    const el = screen.getByTestId('grid');
    expect(el.className).toMatch(/collapsible/);
    expect(el.className).toMatch(/stepMd/);
    expect(el.className).toMatch(/stepSm/);
    expect(el.className).not.toMatch(/stepLg/);
    expect(el.className).not.toMatch(/collapseMd/);
    expect(el.style.getPropertyValue('--grid-columns-md')).toBe('repeat(6, minmax(0, 1fr))');
    expect(el.style.getPropertyValue('--grid-columns-sm')).toBe('repeat(1, minmax(0, 1fr))');
    expect(el.style.getPropertyValue('--grid-columns-lg')).toBe('');
  });

  it('Grid.Item under a map grid stamps clamped per-breakpoint spans', () => {
    render(
      <Grid columns={12} collapseBelow={{ md: 6, sm: 1 }}>
        <Grid.Item span="75%" data-testid="wide">
          w
        </Grid.Item>
        <Grid.Item span={3} data-testid="narrow">
          n
        </Grid.Item>
        <Grid.Item data-testid="plain">p</Grid.Item>
      </Grid>,
    );
    const wide = screen.getByTestId('wide');
    expect(wide.style.getPropertyValue('--grid-item-span')).toBe('span 9');
    expect(wide.style.getPropertyValue('--grid-item-span-md')).toBe('1 / -1');
    expect(wide.style.getPropertyValue('--grid-item-span-sm')).toBe('1 / -1');
    const narrow = screen.getByTestId('narrow');
    expect(narrow.style.getPropertyValue('--grid-item-span-md')).toBe('span 3');
    expect(narrow.style.getPropertyValue('--grid-item-span-sm')).toBe('1 / -1');
    const plain = screen.getByTestId('plain');
    expect(plain.style.getPropertyValue('--grid-item-span-md')).toBe('auto');
  });

  it('Grid.Item outside a map grid stamps no per-breakpoint spans', () => {
    render(
      <Grid columns={12} collapseBelow="md">
        <Grid.Item span={3} data-testid="cell">
          c
        </Grid.Item>
      </Grid>,
    );
    expect(screen.getByTestId('cell').style.getPropertyValue('--grid-item-span-md')).toBe('');
  });

  it('TS: map form is invalid on an auto-fit grid', () => {
    // @ts-expect-error — collapseBelow (map form included) requires `columns`.
    const Invalid = <Grid minColumnWidth="200px" collapseBelow={{ md: 6 }} />;
    void Invalid;
  });
});
```

- [ ] **Step 2: Run** `npx vitest run packages/design-system/src/components/Grid/Grid.test.tsx` — new tests FAIL.

- [ ] **Step 3: Implement.**

`Grid.tsx`:

- Imports: `import { CollapseColumnsContext, COLLAPSE_BREAKPOINTS, collapseTrackTemplate, type CollapseBreakpoint, type CollapseColumnsMap } from '../_internal/collapse';`
- Replace the local breakpoint type with a re-export alias (KEEP the existing JSDoc line, now extended):

```ts
/** Container-width threshold below which a fixed-column grid collapses. `sm` 480px / `md` 640px / `lg` 768px. */
export type GridCollapseBreakpoint = CollapseBreakpoint;
export type { CollapseColumnsMap };
```

- `GridFixedColumns.collapseBelow?: GridCollapseBreakpoint | CollapseColumnsMap;` — extend the existing JSDoc with a paragraph:

```
   * Also accepts a graduated breakpoint→columns map, e.g.
   * `collapseBelow={{ md: 6, sm: 1 }}`: below 640px the grid re-templates to
   * 6 columns (item spans clamp to fit — a span wider than the step becomes a
   * full row), and below 480px to a single column. Use when jumping straight
   * from N columns to 1 wastes tablet widths. When several breakpoints match,
   * the smallest wins. Only `Grid.Item` children get span clamping; plain
   * children auto-place into the step's tracks.
```

- In the component body:

```ts
const collapseMap = typeof collapseBelow === 'object' ? collapseBelow : undefined;
const collapseKeys = collapseMap
  ? COLLAPSE_BREAKPOINTS.filter((b) => collapseMap[b] !== undefined)
  : [];
const stepVars = Object.fromEntries(
  collapseKeys.map((b) => [`--grid-columns-${b}`, collapseTrackTemplate(collapseMap![b]!)]),
);
```

- className: replace the two `collapseBelow && …` clsx lines with:

```ts
      collapseBelow && styles.collapsible,
      typeof collapseBelow === 'string' && collapseClass[collapseBelow],
      ...collapseKeys.map((b) => stepClass[b]),
```

with `const stepClass: Record<CollapseBreakpoint, string> = { sm: styles.stepSm, md: styles.stepMd, lg: styles.stepLg };` next to `collapseClass`.

- style: `style={{ ...(style as CSSProperties), ...stepVars, ['--grid-columns' as string]: template }}`
- Wrap the returned `<Tag …/>` in the provider only when a map is present:

```tsx
const grid = ( <Tag …/> );
return collapseMap ? (
  <CollapseColumnsContext.Provider value={collapseMap}>{grid}</CollapseColumnsContext.Provider>
) : ( grid );
```

- Add one `@example` to the Grid JSDoc (graduated dashboard: `collapseBelow={{ md: 6, sm: 1 }}`) and extend the `@remarks Grid.Item` note with one line about clamping.

`GridItem.tsx`:

```ts
import { useContext } from 'react';
import { CollapseColumnsContext } from '../_internal/collapse';
import {
  resolveGridItemSpan,
  resolveCollapsedGridItemSpan,
  type GridItemSpan,
} from '../_internal/gridSpan';
// in the body:
const collapseMap = useContext(CollapseColumnsContext);
const collapseVars = collapseMap
  ? Object.fromEntries(
      (Object.keys(collapseMap) as (keyof typeof collapseMap)[]).map((b) => [
        `--grid-item-span-${b}`,
        resolveCollapsedGridItemSpan(span, collapseMap[b]!),
      ]),
    )
  : undefined;
// style: { ...(style as CSSProperties), ...collapseVars, ['--grid-item-span' as string]: resolved ?? 'auto' }
```

(Same always-stamp rationale as `--grid-item-span`: custom properties inherit, so every map key present on the container gets stamped on every Item.)

`Grid.module.scss` — append after the existing three legacy `@container` blocks (order lg → md → sm is REQUIRED; note the specificity comment):

```scss
// --- graduated (map) collapse ------------------------------------------
// Step track templates + per-item clamped spans are computed in Grid.tsx /
// GridItem.tsx and injected inline (--grid-columns-<bp>, --grid-item-span-<bp>).
// Declared lg → md → sm so when several steps match at a narrow width the
// smallest breakpoint wins by source order (equal specificity).
@container (max-width: #{bp.$collapse-lg}) {
  .collapsible.stepLg {
    grid-template-columns: var(--grid-columns-lg);

    > .item {
      // stylelint-disable-next-line property-disallowed-list -- graduated collapse override is Grid's own placement mechanism, same sanction as `.item` above
      grid-column: var(--grid-item-span-lg, auto);
    }
  }
}

@container (max-width: #{bp.$collapse-md}) {
  .collapsible.stepMd {
    grid-template-columns: var(--grid-columns-md);

    > .item {
      // stylelint-disable-next-line property-disallowed-list -- graduated collapse override is Grid's own placement mechanism, same sanction as `.item` above
      grid-column: var(--grid-item-span-md, auto);
    }
  }
}

@container (max-width: #{bp.$collapse-sm}) {
  .collapsible.stepSm {
    grid-template-columns: var(--grid-columns-sm);

    > .item {
      // stylelint-disable-next-line property-disallowed-list -- graduated collapse override is Grid's own placement mechanism, same sanction as `.item` above
      grid-column: var(--grid-item-span-sm, auto);
    }
  }
}
```

`Grid/index.ts`: add `CollapseColumnsMap` to the type exports from `./Grid`.
`src/index.ts`: add `CollapseColumnsMap` to the Grid type-export block.

- [ ] **Step 4: Run** `npx vitest run packages/design-system/src/components/Grid/Grid.test.tsx` (PASS) and `cd packages/design-system && npm run typecheck && npm run lint:css`.

- [ ] **Step 5: Commit** — `feat(Grid): graduated collapseBelow map — per-step templates + clamped item spans (#318)`

---

### Task 3: Sortable — `collapseBelow` (string + map)

**Files:**

- Modify: `packages/design-system/src/components/Sortable/Sortable.tsx`
- Modify: `packages/design-system/src/components/Sortable/Sortable.module.scss`
- Modify: `packages/design-system/src/index.ts` (no new Sortable type names needed — prop reuses `GridCollapseBreakpoint`/`CollapseColumnsMap`; only touch if Task 2 didn't already export `CollapseColumnsMap`)
- Test: `packages/design-system/src/components/Sortable/Sortable.test.tsx`

**Interfaces:**

- Consumes: Task 1's `CollapseColumnsContext`, `COLLAPSE_BREAKPOINTS`, `collapseTrackTemplate`, `CollapseBreakpoint`, `CollapseColumnsMap`, `resolveCollapsedGridItemSpan`, SCSS `bp.$collapse-*`.
- Produces: `SortableProps.collapseBelow?: CollapseBreakpoint | CollapseColumnsMap`.

- [ ] **Step 1: Write failing tests** — append to `Sortable.test.tsx` (match the file's existing render helpers/style; a minimal grid render is `<Sortable arrangement="grid" collapseBelow=… data-testid="ol"><Sortable.Item id="a">A</Sortable.Item></Sortable>`):

```tsx
describe('Sortable collapseBelow (#318)', () => {
  it('string form adds collapsible + collapse class on the grid <ol>', () => {
    render(
      <Sortable arrangement="grid" collapseBelow="md" data-testid="ol">
        <Sortable.Item id="a">A</Sortable.Item>
      </Sortable>,
    );
    const ol = screen.getByTestId('ol');
    expect(ol.className).toMatch(/collapsible/);
    expect(ol.className).toMatch(/collapseMd/);
  });

  it('map form adds step classes, injects step templates, items stamp clamped spans', () => {
    render(
      <Sortable arrangement="grid" collapseBelow={{ md: 6, sm: 1 }} data-testid="ol">
        <Sortable.Item id="a" span="75%" data-testid="wide">
          A
        </Sortable.Item>
        <Sortable.Item id="b" span={3} data-testid="narrow">
          B
        </Sortable.Item>
      </Sortable>,
    );
    const ol = screen.getByTestId('ol');
    expect(ol.className).toMatch(/collapsible/);
    expect(ol.className).toMatch(/stepMd/);
    expect(ol.className).toMatch(/stepSm/);
    expect(ol.style.getPropertyValue('--sortable-columns-md')).toBe('repeat(6, minmax(0, 1fr))');
    const wide = screen.getByTestId('wide');
    expect(wide.style.getPropertyValue('--sortable-item-span-md')).toBe('1 / -1');
    expect(wide.style.getPropertyValue('--sortable-item-span-sm')).toBe('1 / -1');
    const narrow = screen.getByTestId('narrow');
    expect(narrow.style.getPropertyValue('--sortable-item-span-md')).toBe('span 3');
  });

  it('collapseBelow is inert in list arrangement', () => {
    render(
      <Sortable collapseBelow="md" data-testid="ol">
        <Sortable.Item id="a">A</Sortable.Item>
      </Sortable>,
    );
    const ol = screen.getByTestId('ol');
    expect(ol.className).not.toMatch(/collapsible/);
    expect(ol.className).not.toMatch(/collapseMd/);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run packages/design-system/src/components/Sortable/Sortable.test.tsx` — new tests FAIL.

- [ ] **Step 3: Implement.**

`Sortable.tsx`:

- Imports: add `useContext` is already imported; add `import { CollapseColumnsContext, COLLAPSE_BREAKPOINTS, collapseTrackTemplate, type CollapseBreakpoint, type CollapseColumnsMap } from '../_internal/collapse';` and extend the gridSpan import with `resolveCollapsedGridItemSpan`.
- `SortableProps` — add after `columns`:

```ts
  /**
   * Responsive collapse for the grid arrangement — mirrors `Grid`'s
   * `collapseBelow` exactly (same breakpoints, same container-query
   * mechanism). Ignored unless `arrangement="grid"`.
   * - `'sm' | 'md' | 'lg'` — below the container-width threshold (480 / 640 /
   *   768px of the LIST'S OWN width) every item spans the full row: a single
   *   visual column.
   * - `{ lg?: n, md?: n, sm?: n }` — graduated: below each breakpoint the grid
   *   re-templates to that many columns and item spans clamp to fit (a span
   *   wider than the step becomes a full row). E.g. `{ md: 6, sm: 1 }`.
   *
   * ❌ Anti-pattern: a collapsible Sortable must get its width from its
   * parent — `container-type: inline-size` zeroes the list's contribution to
   * intrinsic sizing (same caveat as `Grid`'s `collapseBelow`).
   */
  collapseBelow?: CollapseBreakpoint | CollapseColumnsMap;
```

- In `SortableRoot` (after `const isGrid = …`):

```ts
const collapse = isGrid ? collapseBelow : undefined;
const collapseMap = typeof collapse === 'object' ? collapse : undefined;
const collapseKeys = collapseMap
  ? COLLAPSE_BREAKPOINTS.filter((b) => collapseMap[b] !== undefined)
  : [];
```

- Class maps next to the component (module scope):

```ts
const collapseClass: Record<CollapseBreakpoint, string> = {
  sm: styles.collapseSm,
  md: styles.collapseMd,
  lg: styles.collapseLg,
};
const stepClass: Record<CollapseBreakpoint, string> = {
  sm: styles.stepSm,
  md: styles.stepMd,
  lg: styles.stepLg,
};
```

- `<ol>` className:

```ts
className={clsx(
  isGrid ? styles.grid : styles.list,
  collapse && styles.collapsible,
  typeof collapse === 'string' && collapseClass[collapse],
  ...collapseKeys.map((b) => stepClass[b]),
  className,
)}
```

- `<ol>` style (grid branch): merge step template vars:

```ts
style={
  isGrid
    ? {
        ...style,
        ...Object.fromEntries(
          collapseKeys.map((b) => [
            `--sortable-columns-${b}`,
            collapseTrackTemplate(collapseMap![b]!),
          ]),
        ),
        ['--sortable-columns' as string]: columns,
      }
    : style
}
```

- Provide the map to items — wrap the ENTIRE existing JSX return (DndContext) in the provider only when `collapseMap` is set (the DragOverlay clone can keep stamping vars; they're inert outside the `<ol>`):

```tsx
const tree = ( <DndContext …>…</DndContext> );
return collapseMap ? (
  <CollapseColumnsContext.Provider value={collapseMap}>{tree}</CollapseColumnsContext.Provider>
) : ( tree );
```

- `SortableItem`: read `const collapseMap = useContext(CollapseColumnsContext);` and merge into the `<li>` style object:

```ts
...(collapseMap
  ? Object.fromEntries(
      (Object.keys(collapseMap) as CollapseBreakpoint[]).map((b) => [
        `--sortable-item-span-${b}`,
        resolveCollapsedGridItemSpan(span, collapseMap[b]!),
      ]),
    )
  : undefined),
```

- Extend the `@remarks Grid arrangement` JSDoc block on SortableRoot with one sentence pointing at `collapseBelow` parity, and add one `@example` variant line is NOT needed (keep the grid example, add `collapseBelow={{ md: 6, sm: 1 }}` to it).

`Sortable.module.scss` — add `@use '../_internal/collapse' as bp;` at top, then append (mirrors Grid, including the specificity comments):

```scss
// --- collapseBelow (grid arrangement) ----------------------------------
// Mirrors Grid's collapseBelow: only collapsible lists become size
// containers, so existing lists get zero containment changes.
.collapsible {
  container-type: inline-size;
}

// Binary (string) collapse — below the threshold every item spans the full
// row. Double class gives specificity (0,2,0) so the collapse beats any
// single-class consumer grid-column rule; vs `.item` it wins by source order.
@container (max-width: #{bp.$collapse-sm}) {
  .collapsible.collapseSm > * {
    // stylelint-disable-next-line property-disallowed-list -- collapse override is Sortable's own placement mechanism, mirrors Grid
    grid-column: 1 / -1;
  }
}

@container (max-width: #{bp.$collapse-md}) {
  .collapsible.collapseMd > * {
    // stylelint-disable-next-line property-disallowed-list -- collapse override is Sortable's own placement mechanism, mirrors Grid
    grid-column: 1 / -1;
  }
}

@container (max-width: #{bp.$collapse-lg}) {
  .collapsible.collapseLg > * {
    // stylelint-disable-next-line property-disallowed-list -- collapse override is Sortable's own placement mechanism, mirrors Grid
    grid-column: 1 / -1;
  }
}

// Graduated (map) collapse — step templates + per-item clamped spans are
// computed in Sortable.tsx and injected inline (--sortable-columns-<bp>,
// --sortable-item-span-<bp>). Declared lg → md → sm so the smallest matching
// breakpoint wins by source order (equal specificity).
@container (max-width: #{bp.$collapse-lg}) {
  .collapsible.stepLg {
    grid-template-columns: var(--sortable-columns-lg);

    > .item {
      // stylelint-disable-next-line property-disallowed-list -- graduated collapse override is Sortable's own placement mechanism, mirrors Grid
      grid-column: var(--sortable-item-span-lg, auto);
    }
  }
}

@container (max-width: #{bp.$collapse-md}) {
  .collapsible.stepMd {
    grid-template-columns: var(--sortable-columns-md);

    > .item {
      // stylelint-disable-next-line property-disallowed-list -- graduated collapse override is Sortable's own placement mechanism, mirrors Grid
      grid-column: var(--sortable-item-span-md, auto);
    }
  }
}

@container (max-width: #{bp.$collapse-sm}) {
  .collapsible.stepSm {
    grid-template-columns: var(--sortable-columns-sm);

    > .item {
      // stylelint-disable-next-line property-disallowed-list -- graduated collapse override is Sortable's own placement mechanism, mirrors Grid
      grid-column: var(--sortable-item-span-sm, auto);
    }
  }
}
```

- [ ] **Step 4: Run** `npx vitest run packages/design-system/src/components/Sortable/Sortable.test.tsx` (PASS) and `cd packages/design-system && npm run typecheck && npm run lint:css`.

- [ ] **Step 5: Commit** — `feat(Sortable): collapseBelow for grid arrangement — binary + graduated map (#318)`

---

### Task 4: Docs + playground demos

**Files:**

- Modify: `packages/design-system/AGENTS.md` (Grid + Sortable sections)
- Modify: `packages/playground/src/pages/components/GridDemo.tsx`
- Modify: `packages/playground/src/pages/components/SortableDemo.tsx`

**Interfaces:** Consumes the public API from Tasks 2–3. Playground imports ONLY from `@eocrm/design-system`.

- [ ] **Step 1: AGENTS.md** — in the Grid section, extend the `collapseBelow` mention with the map form (one sentence + a `collapseBelow={{ md: 6, sm: 1 }}` snippet line). In the Sortable section, add: `collapseBelow` (grid arrangement only) mirrors Grid — string for binary collapse, `{ md: 6, sm: 1 }` for graduated. Match the surrounding TL;DR style; read the neighboring sections first.

- [ ] **Step 2: GridDemo.tsx** — after the existing "Grid.Item span + collapseBelow" section, add a sibling section "Graduated collapse (breakpoint→columns map)" reusing that section's resizable-box pattern, with `<Grid columns={12} gap="md" collapseBelow={{ md: 6, sm: 1 }}>` and the same span children; description explains: 12 cols wide, 6 cols under 640px (spans clamp), 1 col under 480px. Copy the surrounding section component's exact structure (title/description/source props).

- [ ] **Step 3: SortableDemo.tsx** — extend the existing grid-arrangement section (or add a sibling section if the demo file uses one section per feature) so the grid example passes `collapseBelow={{ md: 6, sm: 1 }}` inside a resizable container mirroring GridDemo's pattern; description notes parity with Grid's collapseBelow.

- [ ] **Step 4: Verify** — from repo root: `make test && make build-lib && make lint && npm run format:check` (format may require `npx prettier --write` on touched files first), then `make build` (playground typecheck+bundle).

- [ ] **Step 5: Commit** — `docs: graduated collapse demos + AGENTS.md notes (#318)`

---

## Self-review notes

- Spec coverage: issue part 1 (Sortable collapseBelow) = Task 3; part 2 (graduated map for both) = Tasks 1–3; consumer-facing docs = Task 4.
- Deliberately NOT changing the legacy string mechanism on Grid (`> * { grid-column: 1/-1 }`) — it's more robust for plain children than a 1-column template, and existing consumers depend on its exact specificity story.
- Deliberately NOT validating map values at runtime (garbage columns counts) — consistent with the documented-not-validated stance on `columns`/fraction spans.
- `Card` fill prop mentioned in the issue's "Consumer status" is NOT in scope — the issue proposes no DS change for it.
