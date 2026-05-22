# Pagination + CursorPagination — design spec

**Date:** 2026-05-22
**Branch:** `feat/pagination`
**Scope:** Two new primitives — `<Pagination>` (numbered with prev/next, sibling windowing, ellipses) and `<CursorPagination>` (prev/next-only for streams without a total count).

## Goal

Ship the two pagination shapes the CRM actually needs:

- `<Pagination>` for any list with a known total — DataTable v1, archive views, search results, paginated mockup lists.
- `<CursorPagination>` for streams without a stable total — eventual use in activity feeds, infinite-scroll-with-load-more patterns, anything keyset-paginated by the backend.

Both are leaf, props-driven components. Consumer owns the page state; the component is pure layout + a11y.

## Why now

- **DataTable v1 is blocked on this PR.** Its footer composes `<Pagination>`.
- Mockup lists currently have no consistent pagination treatment. Nothing inlines this today — greenfield.
- Cursor pagination has no current consumer, but the API shape diverges enough from numbered that bolting it onto Pagination later would be a breaking change. Easier to ship both together with the right boundaries from day one.

## Non-goals

- **No load-more variant.** `<Button onClick={loadMore} loading={isLoading}>Load more</Button>` is the entire feature. Don't wrap it.
- **No built-in page-size selector.** Consumer composes `<Select>` next to Pagination. DataTable will own its own page-size selector in its footer.
- **No built-in "Showing 11–20 of 240" count caption.** Consumer composes the caption. DataTable owns its own.
- **No `boundaryCount` prop.** Boundary is hardcoded to 1 (always show first + last page). Add the prop later if a consumer asks.
- **No internal state.** Both components are fully controlled. Pagination has no internal `currentPage`; CursorPagination has no internal cursor.
- **No infinite-scroll observer.** Not a pagination concern.
- **No URL/query-string integration.** Consumer wires `currentPage` to `useSearchParams` themselves if they want.
- **No `lucide-react` peer-dep fix.** The library has a pre-existing latent bug — lucide-react is imported by 8 components but only declared in the playground. Pagination uses `lucide-react` (matching precedent) but does NOT fix the declaration; that's a separate scoped follow-up PR.

## Architecture

Two separate components in two folders. Both export from `src/index.ts`. Mirrors the `DatePicker` / `DateRangePicker` split — related-but-distinct, never polymorphic.

```
packages/design-system/src/components/Pagination/
  Pagination.tsx              ← numbered with sibling windowing
  Pagination.module.scss
  Pagination.test.tsx
  paginationRange.ts          ← pure function: (currentPage, pageCount, siblingCount) => Array<number | 'ellipsis'>
  paginationRange.test.ts
  index.ts

packages/design-system/src/components/CursorPagination/
  CursorPagination.tsx
  CursorPagination.module.scss
  CursorPagination.test.tsx
  index.ts
```

**Why `paginationRange.ts` is extracted:** the windowing algorithm has a half-dozen edge cases (pageCount < window, current near boundary, sibling window overlapping boundary, etc.) that deserve isolated unit tests. Keeping it as a pure function makes the component itself trivial.

## `<Pagination>` — public API

```ts
export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  /**
   * Current 1-indexed page. Out-of-range values clamp to [1, pageCount].
   * Controlled — Pagination has no internal state.
   */
  currentPage: number;

  /**
   * Total number of pages. Must be >= 1. When `pageCount === 1`, the
   * component still renders (single page button + disabled prev/next) so
   * the consumer doesn't have to conditionally show/hide it.
   */
  pageCount: number;

  /**
   * Called when the user clicks a page number or prev/next.
   * Receives the new 1-indexed page.
   */
  onPageChange: (page: number) => void;

  /**
   * How many page-number buttons to show on each side of `currentPage`.
   * Defaults to `1`. Set to `0` for the tightest possible display
   * (e.g., sidebar use), or `2` for wider footers.
   * Boundary count is fixed at 1 — first and last page are always shown.
   */
  siblingCount?: number;

  /**
   * Visual size. Tracks the Button/Input scale.
   * - `'sm'` — 24px target (tight footers, sidebar)
   * - `'md'` — 32px target (default, DataTable footer)
   * - `'lg'` — 40px target (hero / standalone use)
   */
  size?: PaginationSize;

  /**
   * When `true`, all buttons are disabled. Use during page transitions
   * (loading, saving) to prevent double-clicks.
   */
  disabled?: boolean;

  /**
   * Accessible name for the `<nav>` wrapper. Defaults to `'Pagination'`.
   * Override when multiple paginations on the page need distinguishing
   * (e.g., `'Top pagination'` / `'Bottom pagination'` for a long table).
   */
  'aria-label'?: string;
}

export type PaginationSize = 'sm' | 'md' | 'lg';
```

## `<CursorPagination>` — public API

```ts
export interface CursorPaginationProps extends HTMLAttributes<HTMLElement> {
  /**
   * Whether a previous page exists. When `false`, the previous button is
   * disabled (still rendered for layout stability).
   */
  hasPrevious: boolean;

  /**
   * Whether a next page exists. When `false`, the next button is disabled.
   */
  hasNext: boolean;

  /**
   * Called when the user clicks the previous button. Only fired when
   * `hasPrevious === true`.
   */
  onPrevious: () => void;

  /**
   * Called when the user clicks the next button. Only fired when
   * `hasNext === true`.
   */
  onNext: () => void;

  /**
   * Label for the previous button. Defaults to `'Previous'`. Override for
   * domain-specific phrasing (e.g., `'Newer'` for an activity feed,
   * `'Older'` for the next direction).
   */
  previousLabel?: ReactNode;

  /**
   * Label for the next button. Defaults to `'Next'`.
   */
  nextLabel?: ReactNode;

  /**
   * Visual size. Same scale as `<Pagination>` for inline consistency.
   */
  size?: PaginationSize;

  /**
   * When `true`, both buttons are disabled.
   */
  disabled?: boolean;

  /**
   * Accessible name for the `<nav>` wrapper. Defaults to `'Pagination'`.
   */
  'aria-label'?: string;
}
```

## Visual / tokens

Reuses existing tokens — no new tokens.

| Visual                          | Token / value                                    |
| ------------------------------- | ------------------------------------------------ |
| Button height (sm / md / lg)    | `--size-sm` / `--size-md` / `--size-lg`          |
| Button min-width                | matches height (square buttons for page numbers) |
| Button padding (prev/next text) | `--space-2` left/right                           |
| Gap between buttons             | `--space-1`                                      |
| Button border                   | `1px solid var(--color-border-default)`          |
| Button background (idle)        | `var(--color-bg)`                                |
| Button background (hover)       | `var(--color-bg-muted)`                          |
| Button background (current)     | `var(--color-accent)`                            |
| Button fg (current)             | `var(--color-accent-fg)`                         |
| Button fg (disabled)            | `var(--color-fg-disabled)`                       |
| Ellipsis fg                     | `var(--color-fg-muted)`                          |
| Focus ring                      | `--focus-ring` mixin                             |
| Font size (sm)                  | `--font-size-sm`                                 |
| Font size (md, lg)              | `--font-size-md`                                 |
| Border radius                   | `--radius-md`                                    |

No new tokens. Reuses the existing Button visual vocabulary so Pagination sits inside `<Cluster>` next to a `<Button>` without visual mismatch.

## Windowing algorithm — `paginationRange`

Pure function. Signature:

```ts
export type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end';

export function paginationRange(
  currentPage: number,
  pageCount: number,
  siblingCount: number,
): PaginationItem[];
```

Two distinct ellipsis tokens (`'ellipsis-start'` / `'ellipsis-end'`) so each can carry a stable React key. Same shape as MUI's `usePagination`.

### Algorithm contract

Follow MUI's `usePagination` algorithm (already battle-tested, has the edge cases right). The key invariants:

1. **Constant slot count when pagination has ellipsis.** `totalSlots = siblingCount * 2 + 5` — first + last + 1 current + 2×sibling + 2×ellipsis. For `siblingCount=1`, that's 7. For `siblingCount=0`, 5. For `siblingCount=2`, 9. This is what keeps the pagination row from jumping width as the user clicks between pages.
2. **First and last pages always shown.** (Boundary count fixed at 1.)
3. **Sibling window slides near the boundaries.** When current is near page 1, the left ellipsis is replaced by additional numbers (and similarly near the end). The sibling window itself is anchored on current when current is in the "middle," but its start/end clamp toward the boundaries when current approaches an edge, so the total slot count stays constant.
4. **No ellipsis when `pageCount <= totalSlots`.** Just `[1, 2, …, pageCount]`.
5. **Gap-of-1 collapses to a number, not an ellipsis.** When the sibling window starts exactly at `boundary + 2`, the algorithm renders the gap as the single missing number (e.g., `[1, 2, 3, 4, …]`), not `[1, 'ellipsis', 3, 4, …]` — collapsing a 1-page gap into an ellipsis is visually worse than just showing the number.

The implementation plan will encode MUI's exact formulas; the spec stays at the contract level.

### Edge cases (table is the source of truth for tests)

All entries below are verified against MUI's `usePagination`. The test suite for `paginationRange` must match exactly.

| Input                            | Expected output                                                                 | Items |
| -------------------------------- | ------------------------------------------------------------------------------- | ----- |
| current=1, count=1, siblings=1   | `[1]`                                                                           | 1     |
| current=1, count=5, siblings=1   | `[1, 2, 3, 4, 5]`                                                               | 5     |
| current=1, count=7, siblings=1   | `[1, 2, 3, 4, 5, 6, 7]` (= totalSlots, fits exactly)                            | 7     |
| current=1, count=10, siblings=1  | `[1, 2, 3, 4, 5, 'ellipsis-end', 10]`                                           | 7     |
| current=2, count=10, siblings=1  | `[1, 2, 3, 4, 5, 'ellipsis-end', 10]`                                           | 7     |
| current=5, count=10, siblings=1  | `[1, 'ellipsis-start', 4, 5, 6, 'ellipsis-end', 10]`                            | 7     |
| current=9, count=10, siblings=1  | `[1, 'ellipsis-start', 6, 7, 8, 9, 10]`                                         | 7     |
| current=10, count=10, siblings=1 | `[1, 'ellipsis-start', 6, 7, 8, 9, 10]`                                         | 7     |
| current=0, count=10, siblings=1  | Clamps to current=1 → same as `current=1`                                       | 7     |
| current=99, count=10, siblings=1 | Clamps to current=10 → same as `current=10`                                     | 7     |
| current=5, count=10, siblings=0  | `[1, 'ellipsis-start', 5, 'ellipsis-end', 10]`                                  | 5     |
| current=1, count=5, siblings=0   | `[1, 2, 3, 4, 5]` (= totalSlots=5)                                              | 5     |
| current=5, count=10, siblings=2  | `[1, 2, 3, 4, 5, 6, 7, 'ellipsis-end', 10]` (gap-of-1 on left collapses to "2") | 9     |
| current=6, count=12, siblings=2  | `[1, 'ellipsis-start', 4, 5, 6, 7, 8, 'ellipsis-end', 12]` (both ellipses)      | 9     |
| current=5, count=9, siblings=2   | `[1, 2, 3, 4, 5, 6, 7, 8, 9]` (= totalSlots=9)                                  | 9     |

Clamping (current and pageCount) happens **before** the algorithm runs, inside `<Pagination>`'s component code. The pure function can assume valid input.

## Rendering

### `<Pagination>` markup (simplified)

```tsx
<nav aria-label={ariaLabel ?? 'Pagination'} className={...}>
  <button onClick={() => onPageChange(currentPage - 1)} disabled={disabled || currentPage === 1} aria-label="Previous page">
    <ChevronLeft size={16} aria-hidden />
    <span>Previous</span>
  </button>

  {range.map((item, i) => {
    if (item === 'ellipsis-start' || item === 'ellipsis-end') {
      return <span key={item} className={styles.ellipsis} aria-hidden>…</span>;
    }
    const isCurrent = item === clampedCurrent;
    return (
      <button
        key={item}
        onClick={() => onPageChange(item)}
        // Current page is rendered as a disabled button — it keeps the
        // button-shaped slot in the row (layout stays stable as user clicks
        // through pages) and naturally prevents the "click current page"
        // no-op from firing onPageChange.
        disabled={disabled || isCurrent}
        aria-current={isCurrent ? 'page' : undefined}
        aria-label={isCurrent ? `Page ${item}, current page` : `Go to page ${item}`}
      >
        {item}
      </button>
    );
  })}

  <button onClick={() => onPageChange(currentPage + 1)} disabled={disabled || currentPage === pageCount} aria-label="Next page">
    <span>Next</span>
    <ChevronRight size={16} aria-hidden />
  </button>
</nav>
```

### `<CursorPagination>` markup

```tsx
<nav aria-label={ariaLabel ?? 'Pagination'} className={...}>
  <button onClick={onPrevious} disabled={disabled || !hasPrevious}>
    <ChevronLeft size={16} aria-hidden />
    <span>{previousLabel ?? 'Previous'}</span>
  </button>
  <button onClick={onNext} disabled={disabled || !hasNext}>
    <span>{nextLabel ?? 'Next'}</span>
    <ChevronRight size={16} aria-hidden />
  </button>
</nav>
```

## A11y

- `<nav aria-label="Pagination">` wraps everything (landmark).
- Current page button has `aria-current="page"` (the standard ARIA pattern; not `aria-selected`).
- Page-number buttons have descriptive `aria-label` (`"Go to page 5"` / `"Page 3, current page"`) so screen readers announce intent, not just the digit.
- Prev/next buttons have `aria-label="Previous page"` / `"Next page"` (so screen readers don't read the chevron icon's text content alone).
- Chevron icons get `aria-hidden` (the button's `aria-label` carries the meaning).
- Ellipsis is decorative `<span aria-hidden>` (NOT a button; not focusable).
- Disabled buttons get `disabled` attribute (the standard; native HTML handles screen-reader announcement and focus skipping).

No custom keyboard handling — Tab + Enter is the entire interaction model. Native button semantics handle the rest.

## States

### `<Pagination>`

- `pageCount === 1` — single page button (highlighted as current). Prev + next both disabled.
- `currentPage === 1` — prev disabled.
- `currentPage === pageCount` — next disabled.
- `disabled === true` — all buttons disabled.
- `currentPage` out of range — clamped to `[1, pageCount]` before render. Defensive guard (matches `clampHeading` in EmptyState).
- `pageCount < 1` — clamped to 1.

### `<CursorPagination>`

- `hasPrevious === false` — prev disabled.
- `hasNext === false` — next disabled.
- Both false — both disabled (the consumer probably shouldn't render the component in this state, but we don't enforce it).
- `disabled === true` — both disabled regardless of `hasPrevious` / `hasNext`.

## Tests

### `paginationRange.test.ts` (pure function)

- All edge cases from the table above.
- Returns exactly the right number of items for each case.
- `'ellipsis-start'` and `'ellipsis-end'` only appear in the expected positions (not interchangeable).

### `Pagination.test.tsx`

- Renders the right page-number buttons for various (currentPage, pageCount, siblingCount) combos.
- Clicking a page number calls `onPageChange(page)`.
- Clicking prev calls `onPageChange(currentPage - 1)`.
- Clicking next calls `onPageChange(currentPage + 1)`.
- Prev disabled on page 1.
- Next disabled on last page.
- `disabled` prop disables all buttons.
- `aria-current="page"` is set on the current page button.
- Current page button is disabled (so clicking it does nothing — verified by `expect(button).toBeDisabled()` rather than asserting onPageChange wasn't called, since the disabled attribute is the actual mechanism).
- Out-of-range `currentPage` clamps without crashing.
- Out-of-range `pageCount` (0 or negative) clamps to 1.
- Ellipsis is not a button (not in `getAllByRole('button')`).
- `ref` forwards to the outer `<nav>`.
- `className` merges.
- Custom `aria-label` overrides the default.

### `CursorPagination.test.tsx`

- Renders previous + next buttons with default labels.
- Custom `previousLabel` / `nextLabel` render.
- Prev disabled when `hasPrevious=false`.
- Next disabled when `hasNext=false`.
- Clicking prev fires `onPrevious`; clicking next fires `onNext`.
- `disabled` prop disables both.
- `ref` forwards to `<nav>`.

## Playground demo

Tabs-based umbrella demo, matching the DatePickers precedent (single route, single sidebar entry, `<Tabs>` for variant switching synced to `?variant=` query param).

`PaginationDemo.tsx` is the umbrella — header + Tabs + variant switching. Two panels rendered inline as local functions (file is small enough — ~10 examples total — to not need separate panel files):

- **`Pagination` tab** — examples for the numbered component:
  1. Basic (currentPage=1, pageCount=10)
  2. Middle (currentPage=5, pageCount=20)
  3. Single page (pageCount=1) — "always render" edge case
  4. siblingCount=0 (tight display)
  5. siblingCount=2 (wide display)
  6. Sizes (sm / md / lg side by side)
  7. Disabled (loading lock pattern)
  8. Composed with `<Select>` for page size — the canonical DataTable footer shape, ahead of DataTable v1

- **`CursorPagination` tab** — examples for the cursor component:
  1. Basic (hasPrevious=true, hasNext=true)
  2. At-edge states (start: hasPrevious=false; end: hasNext=false)
  3. Custom labels ("Newer" / "Older")

Tab values: `'pagination'` and `'cursor-pagination'`. Active tab synced to `?variant=` query param via `useSearchParams` so refresh / back-button preserve the active variant — same pattern as `DatePickersDemo.tsx`.

## AGENTS.md

Two sections, alphabetically adjacent:

- `<CursorPagination>` — prev/next for streams without total
- `<Pagination>` — numbered nav with windowing

Cross-link: each mentions the other as the right tool for the other shape.

## Risks / open questions

- **Clicking the current page button** — resolved: current page is rendered as `disabled`. Both prevents the no-op `onPageChange` call and keeps the button shape in the layout so the row width doesn't shift. Tests will verify the disabled attribute is set and `aria-current="page"` is also set.
- **`pageCount < 1`** — clamp to 1 silently or throw? **Clamp**. Matches `clampHeading` precedent. A dev passing 0 is in a transient state (data still loading); throwing would be hostile.
- **Disabled current-page button — ARIA semantics**: `aria-current="page"` plus `disabled` is the W3C ARIA APG's recommended pattern for "current item in a list, not actionable". Both attributes must be set; the disabled-only or aria-current-only variants are both wrong.
- **`lucide-react` missing from the library's `peerDependencies`** — pre-existing latent bug across 8 components, NOT fixed in this PR (out of scope). Flag for a follow-up PR. Adding Pagination uses two more lucide imports (`ChevronLeft`, `ChevronRight`) so the surface area grows, but the failure mode for an external consumer is the same regardless of how many imports there are.
- **Future load-more variant** — explicitly deferred. If a consumer wants load-more later, they compose `<Button onClick={loadMore} loading={isLoading}>Load more</Button>` directly. No new component needed.

## File layout

```
packages/design-system/src/components/Pagination/
  Pagination.tsx
  Pagination.module.scss
  Pagination.test.tsx
  paginationRange.ts
  paginationRange.test.ts
  index.ts

packages/design-system/src/components/CursorPagination/
  CursorPagination.tsx
  CursorPagination.module.scss
  CursorPagination.test.tsx
  index.ts

packages/playground/src/pages/components/PaginationDemo.tsx
```

Top-level `src/index.ts` re-exports `Pagination`, `PaginationProps`, `PaginationSize`, `PaginationItem`, `paginationRange`, `CursorPagination`, `CursorPaginationProps`.

`paginationRange` is exported because DataTable v1 may want to compute its own range for advanced footer layouts (e.g., rendering the count caption from the same range data). It's a pure utility, no harm in exposing it.
