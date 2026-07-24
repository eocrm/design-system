# Grid Span + Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Grid.Item` with numeric + fraction spans (12-col base) and `collapseBelow` container-query collapse for fixed-column grids (issue #314).

**Architecture:** New `GridItem.tsx` beside `Grid.tsx`, attached as `Grid.Item`. Span resolves to a `grid-column` value set as an inline custom property read by one SCSS class. Collapse: `container-type: inline-size` + per-breakpoint `@container` rules forcing children to `1 / -1`. Spec: `docs/superpowers/specs/2026-07-24-grid-span-collapse-design.md`.

**Tech Stack:** React 18 + TS, Vitest + RTL (globals on — never import describe/it/expect/vi), CSS modules.

## Global Constraints

- Tokens for colors/spacing in SCSS; breakpoint literals live as SCSS `$` constants in `Grid.tokens.scss` (query conditions can't read CSS custom properties).
- `Grid`/`Grid.Item` are layout primitives — `grid-column` on the item is sanctioned (Rule-4 note in code comment).
- Full JSDoc on every new prop/type (Rule 7); forwardRef + spread attrs (Rule 6).
- All work on branch `feat/grid-span-collapse` in `/home/dpws/projects/design-system`.
- Tests run from `packages/design-system/` with `npx vitest run <file>`.

---

### Task 1: `Grid.Item` component

**Files:**
- Create: `packages/design-system/src/components/Grid/GridItem.tsx`
- Modify: `packages/design-system/src/components/Grid/Grid.tsx` (attach `Grid.Item`)
- Modify: `packages/design-system/src/components/Grid/Grid.module.scss` (`.item` class)
- Modify: `packages/design-system/src/components/Grid/index.ts` + `packages/design-system/src/index.ts` (type exports)
- Test: `packages/design-system/src/components/Grid/Grid.test.tsx`

**Interfaces:**
- Produces: `GridItemSpan`, `GridItemProps`, `GridItemAs` types; `Grid.Item` static property; `.item` SCSS class reading `--grid-item-span`. Task 2 relies on `.item`'s rule being declared BEFORE the collapse rules in the SCSS file.

- [ ] **Step 1: Write the failing tests** — append to `Grid.test.tsx`:

```tsx
describe('Grid.Item (#314)', () => {
  it('renders a div by default with merged className and no span (auto)', () => {
    const { container } = render(<Grid.Item className="ext">cell</Grid.Item>);
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe('DIV');
    expect(el.className).toContain('ext');
    expect(el.style.getPropertyValue('--grid-item-span')).toBe('');
  });

  it.each([
    [2, 'span 2'],
    ['25%', 'span 3'],
    ['33%', 'span 4'],
    ['50%', 'span 6'],
    ['67%', 'span 8'],
    ['75%', 'span 9'],
    ['100%', '1 / -1'],
    ['full', '1 / -1'],
  ] as const)('span=%s sets --grid-item-span: %s', (span, expected) => {
    const { container } = render(<Grid.Item span={span}>cell</Grid.Item>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--grid-item-span')).toBe(expected);
  });

  it('renders as="li" and forwards the ref to it', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Grid as="ul">
        <Grid.Item as="li" ref={ref} span="50%">
          cell
        </Grid.Item>
      </Grid>,
    );
    expect(ref.current?.tagName).toBe('LI');
  });

  it('spreads HTML attributes', () => {
    render(
      <Grid.Item data-testid="w" aria-label="widget">
        cell
      </Grid.Item>,
    );
    expect(screen.getByTestId('w')).toHaveAttribute('aria-label', 'widget');
  });
});
```

(`createRef` is already imported in this file if other tests use it — check the imports; add it to the react import if missing. `render`/`screen` come from the file's existing imports.)

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/design-system && npx vitest run src/components/Grid/Grid.test.tsx`
Expected: FAIL — `Grid.Item` undefined.

- [ ] **Step 3: Implement.**

`GridItem.tsx` (new file):

```tsx
import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Grid.module.scss';

/**
 * Column span for a `Grid.Item`. Numbers span that many tracks of whatever
 * `columns` the parent Grid declares. Fraction strings assume a 12-column
 * grid (`columns={12}`): `'25%'`→3, `'33%'`→4, `'50%'`→6, `'67%'`→8,
 * `'75%'`→9 tracks. `'100%'` / `'full'` span the entire row (`1 / -1`) and
 * are safe in ANY grid, including auto-fit.
 */
export type GridItemSpan = number | 'full' | '25%' | '33%' | '50%' | '67%' | '75%' | '100%';

/** Elements `Grid.Item` can render as. `'li'` pairs with `<Grid as="ul">`. */
export type GridItemAs = 'div' | 'li' | 'section' | 'article' | 'aside';

/** Fraction → 12-col track count. 100%/full handled separately (1 / -1). */
const FRACTION_TRACKS: Record<string, number> = {
  '25%': 3,
  '33%': 4,
  '50%': 6,
  '67%': 8,
  '75%': 9,
};

export interface GridItemProps extends HTMLAttributes<HTMLElement> {
  /**
   * Column span. Omit for a single track (auto placement).
   * - number — `span N` of the parent's `columns`.
   * - `'25%' | '33%' | '50%' | '67%' | '75%'` — fractions of a 12-column
   *   grid; use with `columns={12}` (other counts won't produce the named
   *   fraction — documented, not validated).
   * - `'100%'` / `'full'` — the entire row; safe with any Grid variant.
   */
  span?: GridItemSpan;
  /** Element to render. Default `'div'`. Use `'li'` inside `<Grid as="ul">`. */
  as?: GridItemAs;
}

/**
 * A cell of `<Grid>` with an explicit column span. Opt-in — plain children
 * are still valid Grid cells. See `GridItemSpan` for the span model
 * (numeric tracks vs 12-col fractions).
 *
 * @example
 * // Dashboard widgets on a 12-column grid, collapsing under 640px.
 * <Grid columns={12} gap="md" collapseBelow="md">
 *   <Grid.Item span="25%"><Card>Small</Card></Grid.Item>
 *   <Grid.Item span="75%"><Card>Wide</Card></Grid.Item>
 *   <Grid.Item span="100%"><Card>Full row</Card></Grid.Item>
 * </Grid>
 *
 * @remarks Anti-patterns
 * - ❌ Fraction spans (other than `'100%'`) with `columns` ≠ 12 — the span
 *   is a fixed track count (e.g. `'50%'` = 6 tracks), so a 4-column grid
 *   overflows into implicit tracks.
 * - ❌ Numeric `span` larger than `columns` — same implicit-track overflow.
 */
export const GridItem = forwardRef<HTMLElement, GridItemProps>(function GridItem(
  { span, as = 'div', className, style, ...rest },
  ref,
) {
  const resolved =
    span === undefined
      ? undefined
      : span === 'full' || span === '100%'
        ? '1 / -1'
        : typeof span === 'number'
          ? `span ${span}`
          : `span ${FRACTION_TRACKS[span]}`;

  const Tag = as as unknown as 'div';
  return (
    // Grid/Stack/Cluster are the layout primitives — `grid-column` via the
    // `.item` class is Grid.Item's sanctioned job (Rule 4 does not apply to
    // the layout family's own placement props).
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={clsx(styles.item, className)}
      style={
        resolved !== undefined
          ? { ...(style as CSSProperties), ['--grid-item-span' as string]: resolved }
          : (style as CSSProperties)
      }
      {...(rest as HTMLAttributes<HTMLDivElement>)}
    />
  );
});
```

`Grid.module.scss` — add AFTER the `.grid` block (and BEFORE any future collapse rules; Task 2 depends on this ordering):

```scss
// Grid.Item placement — the value is resolved in GridItem.tsx and injected
// as an inline custom property (span N / 1 / -1). Declared before the
// collapse rules so a collapsed grid's `1 / -1` override wins by source order.
.item {
  grid-column: var(--grid-item-span, auto);
}
```

`Grid.tsx` — attach the static + re-export (after the `Grid` const):

```tsx
import { GridItem } from './GridItem';
// …
/** Grid with the Item subcomponent attached. */
const GridWithItem = Object.assign(Grid, { Item: GridItem });
export { GridWithItem as Grid };
```

CAREFUL: `Grid` is currently exported inline (`export const Grid = …as <T…>`). Restructure minimally: drop `export` from the const declaration, keep the cast, then `export const GridNamespace…` — the exported name MUST remain `Grid` and keep the generic call signature. Simplest working shape:

```tsx
const GridBase = forwardRef<HTMLElement, GridProps>(function Grid(…) { … }) as <
  T extends GridProps,
>(props: T & { ref?: React.Ref<HTMLElement> }) => ReactElement;

/** … existing JSDoc stays on GridBase's declaration … */
export const Grid = Object.assign(GridBase, { Item: GridItem });
```

(Keep the big JSDoc block attached to the declaration that `index.ts` consumers resolve — move it to the `export const Grid` if needed so editor hover still shows it.)

`components/Grid/index.ts` + `src/index.ts` — add:

```ts
export type { GridItemProps, GridItemSpan, GridItemAs } from './GridItem';
```

and in `src/index.ts` extend the existing Grid type export block with `GridItemProps, GridItemSpan, GridItemAs`.

- [ ] **Step 4: Run to verify pass**

Run: `cd packages/design-system && npx vitest run src/components/Grid/Grid.test.tsx` then `npx tsc --noEmit`
Expected: PASS / clean. (The structure meta-test in `make test` checks component file layout — run `npx vitest run src/structure.test.ts` too; `GridItem.tsx` is a subcomponent file like DropdownMenu's, which the meta-test allows.)

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src
git commit -m "feat(Grid): Grid.Item with numeric + 12-col fraction spans (#314)"
```

---

### Task 2: `collapseBelow` container-query collapse

**Files:**
- Modify: `packages/design-system/src/components/Grid/Grid.tsx`
- Modify: `packages/design-system/src/components/Grid/Grid.module.scss`
- Modify: `packages/design-system/src/components/Grid/Grid.tokens.scss`
- Modify: `packages/design-system/src/index.ts` (type export)
- Test: `packages/design-system/src/components/Grid/Grid.test.tsx`

**Interfaces:**
- Consumes: `.item` rule declared before collapse rules (Task 1).
- Produces: `GridCollapseBreakpoint` type; `collapseBelow` prop on the fixed-columns variant.

- [ ] **Step 1: Write the failing tests** — append to `Grid.test.tsx`:

```tsx
describe('Grid collapseBelow (#314)', () => {
  it('adds the collapsible + breakpoint classes when set', () => {
    const { container } = render(
      <Grid columns={12} collapseBelow="md">
        <div>a</div>
      </Grid>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/collapsible/);
    expect(el.className).toMatch(/collapseMd/);
  });

  it('adds no collapse classes when unset', () => {
    const { container } = render(
      <Grid columns={2}>
        <div>a</div>
      </Grid>,
    );
    expect((container.firstChild as HTMLElement).className).not.toMatch(/collaps/i);
  });
});
```

(jsdom does not evaluate `@container` — class presence is the testable contract; the visual behavior is Task 3's Playwright check.)

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/design-system && npx vitest run src/components/Grid/Grid.test.tsx`
Expected: FAIL — unknown prop / class missing.

- [ ] **Step 3: Implement.**

`Grid.tokens.scss` — append (SCSS constants, not CSS custom properties — `@container` conditions cannot read custom properties):

```scss
// Collapse breakpoints for `collapseBelow` — container-width thresholds.
// SCSS constants (not CSS custom properties): query conditions can't read
// custom properties. Keep in sync with the GridCollapseBreakpoint JSDoc.
$grid-collapse-sm: 480px;
$grid-collapse-md: 640px;
$grid-collapse-lg: 768px;
```

`Grid.module.scss` — append AFTER `.item` (source order is the override mechanism — no `!important`):

```scss
// --- collapseBelow -----------------------------------------------------
// Only grids with `collapseBelow` become size containers, so existing grids
// get zero containment changes.
.collapsible {
  container-type: inline-size;
}

// Below the container threshold every direct child spans the full row —
// the template is untouched but the grid renders as one visual column.
// These rules are declared after `.item` so they win by source order.
@container (max-width: #{Grid.tokens.$grid-collapse-sm}) {
  .collapseSm > * {
    grid-column: 1 / -1;
  }
}

@container (max-width: #{Grid.tokens.$grid-collapse-md}) {
  .collapseMd > * {
    grid-column: 1 / -1;
  }
}

@container (max-width: #{Grid.tokens.$grid-collapse-lg}) {
  .collapseLg > * {
    grid-column: 1 / -1;
  }
}
```

NOTE the `@use` namespace: the file opens with `@use './Grid.tokens';` so the constants are `Grid.tokens.$grid-collapse-sm`… — verify the actual namespace (default namespace for `./Grid.tokens` is `Grid.tokens` → INVALID identifier; use `@use './Grid.tokens' as tokens;` and `tokens.$grid-collapse-sm`, updating the existing `@use` line).

`Grid.tsx`:

```ts
/** Container-width threshold below which a fixed-column grid collapses to one visual column. `sm` 480px / `md` 640px / `lg` 768px. */
export type GridCollapseBreakpoint = 'sm' | 'md' | 'lg';
```

Extend `GridFixedColumns`:

```ts
interface GridFixedColumns extends GridBaseProps, HTMLAttributes<HTMLElement> {
  /** Fixed number of equal-width columns. Mutually exclusive with `minColumnWidth`. */
  columns: number;
  minColumnWidth?: never;
  /**
   * Collapse to a single visual column when the GRID'S OWN width (container
   * query, not viewport) drops below the preset: `sm` 480px / `md` 640px /
   * `lg` 768px. Every child spans the full row below the threshold —
   * `Grid.Item` spans included. Only valid with `columns` (auto-fit grids
   * already reflow).
   */
  collapseBelow?: GridCollapseBreakpoint;
}
```

and `GridAutoFit` gets `collapseBelow?: never;`.

Component body — destructure `collapseBelow` and add to clsx:

```tsx
const collapseClass: Record<GridCollapseBreakpoint, string> = {
  sm: styles.collapseSm,
  md: styles.collapseMd,
  lg: styles.collapseLg,
};
// in clsx(…):
collapseBelow && styles.collapsible,
collapseBelow && collapseClass[collapseBelow],
```

`src/index.ts` — add `GridCollapseBreakpoint` to the Grid type export block.

- [ ] **Step 4: Run to verify pass**

Run: `cd packages/design-system && npx vitest run src/components/Grid/Grid.test.tsx && npx tsc --noEmit` and `cd /home/dpws/projects/design-system && make lint`
Expected: all pass (stylelint must accept the `@container` at-rules).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src
git commit -m "feat(Grid): collapseBelow container-query collapse for fixed-column grids (#314)"
```

---

### Task 3: Docs + demo + visual verification

**Files:**
- Modify: `packages/design-system/src/components/Grid/Grid.tsx` (JSDoc remarks)
- Modify: `packages/design-system/AGENTS.md`
- Modify: `packages/playground/src/pages/components/GridDemo.tsx`

**Interfaces:** consumes everything above; docs only.

- [ ] **Step 1: Update Grid JSDoc** — replace the two remarks lines
  "For per-cell span / placement — same answer; raw CSS Grid." and the
  named-tracks line's span reference with `Grid.Item` guidance, and add the
  dashboard example to the Grid JSDoc:

```
 * @example
 * // Dashboard widgets — 12-column base, fraction spans, collapses under 640px.
 * <Grid columns={12} gap="md" collapseBelow="md">
 *   <Grid.Item span="25%"><Card>KPI</Card></Grid.Item>
 *   <Grid.Item span="75%"><Card>Chart</Card></Grid.Item>
 *   <Grid.Item span="33%"><Card>List</Card></Grid.Item>
 *   <Grid.Item span="67%"><Card>Table</Card></Grid.Item>
 *   <Grid.Item span="100%"><Card>Footer row</Card></Grid.Item>
 * </Grid>
```

- [ ] **Step 2: AGENTS.md** — extend the Grid section: `Grid.Item` span table
  (`25%`→3/12 … `100%`→full row), "fractions need `columns={12}`",
  `collapseBelow` presets with px values, container-not-viewport note, and the
  canonical dashboard snippet above.

- [ ] **Step 3: Playground demo** — add a `SpanCollapseExample` section to
  `GridDemo.tsx` (registered in the sections list) showing the dashboard
  snippet inside a resizable container (wrap in a div with
  `style={{ resize: 'horizontal', overflow: 'auto' }}` so the collapse can be
  demonstrated by dragging), with the code block mirroring the JSDoc example.
  Follow the file's existing `Example` component conventions.

- [ ] **Step 4: Gates**

Run: `cd /home/dpws/projects/design-system && make test && make build-lib && make lint && npm run format:check && make build`
Expected: all pass (`make build` compiles the playground too).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system packages/playground
git commit -m "docs(Grid): Grid.Item + collapseBelow docs, AGENTS.md, playground demo (#314)"
```

- [ ] **Step 6: Visual verification (controller runs this, not a subagent):**
  start the playground on port 8090 (`npm run dev -- --port 8090` in
  `packages/playground`, no browser), Playwright: open `/components/grid`,
  screenshot the span section wide (rows align 25/75, 33/67, 50/50), then
  narrow the resizable container / viewport below 640px and confirm single
  column. Kill the server after.
