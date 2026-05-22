# Pagination + CursorPagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<Pagination>` (numbered with prev/next + sibling windowing) and `<CursorPagination>` (prev/next-only for streams without total). Both controlled-only, both lean, both demo'd via one tabs-based playground page. Unblocks DataTable v1.

**Architecture:** Two separate components in their own folders (`packages/design-system/src/components/Pagination/` and `.../CursorPagination/`), mirroring the DatePicker / DateRangePicker split. The windowing algorithm is extracted as `paginationRange.ts` (pure function, tested in isolation against MUI's algorithm). Demo follows the `DatePickersDemo` precedent — single umbrella file with `<Tabs>` switching, synced to `?variant=` query param.

**Tech Stack:** React 19, TypeScript, SCSS modules (CSS variables only), Vitest, `clsx`, `lucide-react` (ChevronLeft / ChevronRight).

**Spec:** `docs/superpowers/specs/2026-05-22-pagination-design.md`

---

## File Structure

```
packages/design-system/src/components/Pagination/
  paginationRange.ts             — pure windowing function (no React)
  paginationRange.test.ts        — algorithm edge cases from the spec table
  Pagination.tsx                 — numbered component
  Pagination.module.scss         — tokens only, no layout (Rule 4)
  Pagination.test.tsx
  index.ts                       — barrel
packages/design-system/src/components/CursorPagination/
  CursorPagination.tsx           — prev/next-only component
  CursorPagination.module.scss
  CursorPagination.test.tsx
  index.ts
packages/design-system/src/index.ts          — re-export both + types + util
packages/design-system/AGENTS.md             — two new sections
packages/playground/src/pages/components/PaginationDemo.tsx
                                              — umbrella with Tabs + inline panels
packages/playground/src/App.tsx              — route
packages/playground/src/layout/AppShell/AppShell.tsx
                                              — sidebar entry (Navigation group)
packages/playground/src/pages/components/ComponentsIndex.tsx
                                              — overview grid card
packages/playground/src/pages/mockups/registry.ts
                                              — `ComponentName` union extension
```

---

## Task 1: Pre-flight

**Files:** (none — verification only)

- [ ] **Step 1: Verify branch + hooks**

```bash
cd /home/dpws/projects/design-system
git rev-parse --abbrev-ref HEAD   # expect: feat/pagination
git config --get core.hooksPath   # expect: .husky/_
test -x .husky/pre-push && echo OK || echo MISSING
```

If branch is wrong: `git checkout main && git pull && git checkout -b feat/pagination`. If hooks missing: `npm install`.

- [ ] **Step 2: Verify clean working tree**

```bash
git status --short
```

Expect: empty (the spec is committed). If anything is dirty, stop and ask.

---

## Task 2: `paginationRange` — pure windowing utility (TDD)

**Files:**

- Create: `packages/design-system/src/components/Pagination/paginationRange.ts`
- Create: `packages/design-system/src/components/Pagination/paginationRange.test.ts`

- [ ] **Step 1: Write the failing test first**

Create `packages/design-system/src/components/Pagination/paginationRange.test.ts` with the full edge-case table from the spec:

```ts
import { paginationRange, type PaginationItem } from './paginationRange';

describe('paginationRange', () => {
  // The source of truth for the algorithm is the spec's edge-case table.
  // Each case is verified against MUI's usePagination behaviour.
  const cases: Array<{
    name: string;
    current: number;
    count: number;
    siblings: number;
    expected: PaginationItem[];
  }> = [
    {
      name: 'current=1, count=1, siblings=1',
      current: 1,
      count: 1,
      siblings: 1,
      expected: [1],
    },
    {
      name: 'current=1, count=5, siblings=1',
      current: 1,
      count: 5,
      siblings: 1,
      expected: [1, 2, 3, 4, 5],
    },
    {
      name: 'current=1, count=7, siblings=1 (= totalSlots exactly)',
      current: 1,
      count: 7,
      siblings: 1,
      expected: [1, 2, 3, 4, 5, 6, 7],
    },
    {
      name: 'current=1, count=10, siblings=1 (only end ellipsis)',
      current: 1,
      count: 10,
      siblings: 1,
      expected: [1, 2, 3, 4, 5, 'ellipsis-end', 10],
    },
    {
      name: 'current=2, count=10, siblings=1 (only end ellipsis)',
      current: 2,
      count: 10,
      siblings: 1,
      expected: [1, 2, 3, 4, 5, 'ellipsis-end', 10],
    },
    {
      name: 'current=5, count=10, siblings=1 (both ellipses)',
      current: 5,
      count: 10,
      siblings: 1,
      expected: [1, 'ellipsis-start', 4, 5, 6, 'ellipsis-end', 10],
    },
    {
      name: 'current=9, count=10, siblings=1 (only start ellipsis)',
      current: 9,
      count: 10,
      siblings: 1,
      expected: [1, 'ellipsis-start', 6, 7, 8, 9, 10],
    },
    {
      name: 'current=10, count=10, siblings=1 (only start ellipsis)',
      current: 10,
      count: 10,
      siblings: 1,
      expected: [1, 'ellipsis-start', 6, 7, 8, 9, 10],
    },
    {
      name: 'siblings=0, current=5, count=10 (tight totalSlots=5)',
      current: 5,
      count: 10,
      siblings: 0,
      expected: [1, 'ellipsis-start', 5, 'ellipsis-end', 10],
    },
    {
      name: 'siblings=0, current=1, count=5 (fits)',
      current: 1,
      count: 5,
      siblings: 0,
      expected: [1, 2, 3, 4, 5],
    },
    {
      name: 'siblings=2, current=5, count=10 (gap-of-1 on left collapses to "2")',
      current: 5,
      count: 10,
      siblings: 2,
      expected: [1, 2, 3, 4, 5, 6, 7, 'ellipsis-end', 10],
    },
    {
      name: 'siblings=2, current=6, count=12 (both ellipses, totalSlots=9)',
      current: 6,
      count: 12,
      siblings: 2,
      expected: [1, 'ellipsis-start', 4, 5, 6, 7, 8, 'ellipsis-end', 12],
    },
    {
      name: 'siblings=2, current=5, count=9 (fits at totalSlots=9)',
      current: 5,
      count: 9,
      siblings: 2,
      expected: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
  ];

  it.each(cases)('$name', ({ current, count, siblings, expected }) => {
    expect(paginationRange(current, count, siblings)).toEqual(expected);
  });

  it('returns a constant slot count once ellipsis is needed (siblingCount=1, count=20)', () => {
    // Whichever page is current in a long list, the slot count should be
    // totalSlots = siblings*2 + 5 = 7. This is what keeps the pagination
    // row from jumping width as the user clicks between pages.
    for (let current = 1; current <= 20; current++) {
      expect(paginationRange(current, 20, 1)).toHaveLength(7);
    }
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```bash
cd /home/dpws/projects/design-system
npm test --workspace=@eocrm/design-system --run -- src/components/Pagination/paginationRange 2>&1 | tail -10
```

Expected: FAIL with `Cannot find module './paginationRange'` (the source file doesn't exist yet).

- [ ] **Step 3: Implement `paginationRange.ts`**

Create `packages/design-system/src/components/Pagination/paginationRange.ts`:

```ts
/**
 * Discrete item in a pagination row — either a page number or one of the
 * two ellipsis markers. The two ellipsis tokens differ so React can give
 * each a stable key when both are present.
 */
export type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end';

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Compute the items to render in a numbered pagination row.
 *
 * Mirrors MUI's `usePagination` algorithm with `boundaryCount = 1` (the
 * first and last pages are always shown). Total slot count when an
 * ellipsis is rendered: `siblingCount * 2 + 5` — 2 boundaries + 1 current
 * + 2*siblings + 2 ellipses. For `siblingCount = 1`, that's 7 slots; the
 * row's width stays constant as the user clicks between pages.
 *
 * Special rules:
 * - When `pageCount <= totalSlots`, returns a contiguous `[1, 2, …, pageCount]`
 *   (no ellipsis needed).
 * - When the sibling window starts at exactly `boundary + 2`, the would-be
 *   ellipsis collapses to the single missing number (gap-of-1 rule) —
 *   showing the number is visually cleaner than showing "…" for one page.
 *
 * Assumes valid input: callers must clamp `currentPage` to `[1, pageCount]`
 * and ensure `pageCount >= 1` before invocation. The component layer
 * handles clamping; this pure function does not.
 */
export function paginationRange(
  currentPage: number,
  pageCount: number,
  siblingCount: number,
): PaginationItem[] {
  const boundaryCount = 1;
  const totalSlots = siblingCount * 2 + boundaryCount * 2 + 3;

  if (pageCount <= totalSlots) {
    return range(1, pageCount);
  }

  const startPages = range(1, boundaryCount);
  const endPages = range(pageCount - boundaryCount + 1, pageCount);

  const siblingsStart = Math.max(
    Math.min(currentPage - siblingCount, pageCount - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2,
  );

  const siblingsEnd = Math.min(
    Math.max(currentPage + siblingCount, boundaryCount + siblingCount * 2 + 2),
    endPages[0] - 2,
  );

  return [
    ...startPages,
    ...(siblingsStart > boundaryCount + 2
      ? (['ellipsis-start'] as const)
      : boundaryCount + 1 < pageCount - boundaryCount
        ? [boundaryCount + 1]
        : []),
    ...range(siblingsStart, siblingsEnd),
    ...(siblingsEnd < pageCount - boundaryCount - 1
      ? (['ellipsis-end'] as const)
      : pageCount - boundaryCount > boundaryCount
        ? [pageCount - boundaryCount]
        : []),
    ...endPages,
  ];
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm test --workspace=@eocrm/design-system --run -- src/components/Pagination/paginationRange 2>&1 | tail -10
```

Expected: PASS — 14 test cases pass (13 from `it.each` + 1 constant-slot-count check).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/Pagination/paginationRange.ts \
        packages/design-system/src/components/Pagination/paginationRange.test.ts
git commit -m "Pagination: paginationRange utility — windowing algorithm + tests"
```

---

## Task 3: `<Pagination>` component (TSX + SCSS)

**Files:**

- Create: `packages/design-system/src/components/Pagination/Pagination.tsx`
- Create: `packages/design-system/src/components/Pagination/Pagination.module.scss`

- [ ] **Step 1: Write `Pagination.tsx`**

```tsx
import { forwardRef, type HTMLAttributes } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { paginationRange } from './paginationRange';
import styles from './Pagination.module.scss';

/** Visual size. Tracks the Button / Input scale. */
export type PaginationSize = 'sm' | 'md' | 'lg';

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  /**
   * Current 1-indexed page. Values outside `[1, pageCount]` clamp at
   * render time (defensive — same precedent as `clampHeading` in
   * `<EmptyState>`).
   */
  currentPage: number;

  /**
   * Total number of pages. Values `< 1` clamp to `1`. The component still
   * renders when `pageCount === 1` (single disabled-current button + both
   * prev/next disabled) so consumers don't have to conditionally hide it.
   */
  pageCount: number;

  /**
   * Called with the new 1-indexed page when the user clicks prev, next,
   * or a page number. Not fired when the user clicks the current page
   * (the button is `disabled`).
   */
  onPageChange: (page: number) => void;

  /**
   * How many page-number buttons to show on each side of `currentPage`.
   * Default `1`. Set to `0` for the tightest possible display (sidebar /
   * narrow column) or `2` for wider footers. Boundary is fixed at 1 —
   * first and last pages are always shown.
   */
  siblingCount?: number;

  /**
   * Visual size — `'sm'` (24px), `'md'` (32px, default), `'lg'` (40px).
   * Tracks the Button / Input scale so Pagination sits cleanly inside
   * a `<Cluster>` next to those components.
   */
  size?: PaginationSize;

  /**
   * When `true`, all buttons (prev / next / numbers) are disabled. Use
   * during page transitions (loading, saving) to prevent double-clicks.
   */
  disabled?: boolean;

  /**
   * Accessible name for the `<nav>` wrapper. Defaults to `'Pagination'`.
   * Override when multiple paginations appear on the same page (e.g.,
   * `'Top pagination'` / `'Bottom pagination'`).
   */
  'aria-label'?: string;
}

function clampPageCount(pageCount: number): number {
  if (!Number.isFinite(pageCount) || pageCount < 1) return 1;
  return Math.floor(pageCount);
}

function clampCurrent(currentPage: number, pageCount: number): number {
  if (!Number.isFinite(currentPage) || currentPage < 1) return 1;
  if (currentPage > pageCount) return pageCount;
  return Math.floor(currentPage);
}

function clampSiblings(siblingCount: number): number {
  if (!Number.isFinite(siblingCount) || siblingCount < 0) return 0;
  return Math.floor(siblingCount);
}

/**
 * Numbered pagination — '◀ Previous   1 2 … 5 6 7 … 99 100   Next ▶'.
 * Controlled; consumer owns `currentPage`.
 *
 * @example
 * const [page, setPage] = useState(1);
 * <Pagination currentPage={page} pageCount={20} onPageChange={setPage} />
 *
 * @example
 * // Tight display for sidebar / narrow column:
 * <Pagination
 *   currentPage={5}
 *   pageCount={100}
 *   onPageChange={setPage}
 *   siblingCount={0}
 *   size="sm"
 * />
 *
 * @example
 * // Loading lock — disable while data refetches:
 * <Pagination
 *   currentPage={page}
 *   pageCount={pageCount}
 *   onPageChange={setPage}
 *   disabled={isFetching}
 * />
 *
 * @remarks When NOT to use
 * - Cursor / keyset pagination (no total page count) → use
 *   `<CursorPagination>`.
 * - "Load more" infinite scroll → just
 *   `<Button onClick={loadMore} loading={isLoading}>Load more</Button>`.
 *
 * @remarks A11y
 * - Wrapper is `<nav aria-label="Pagination">` (override via `aria-label`
 *   when multiple paginations sit on the same page).
 * - The current page is rendered as a disabled `<button>` with
 *   `aria-current="page"` — the W3C ARIA APG pattern for
 *   "current item, not actionable."
 * - Prev/next chevron icons get `aria-hidden`; the buttons carry
 *   `aria-label="Previous page" / "Next page"` for screen readers.
 * - Ellipses are decorative `<span aria-hidden>` — not focusable.
 */
export const Pagination = forwardRef<HTMLElement, PaginationProps>(function Pagination(
  {
    currentPage,
    pageCount,
    onPageChange,
    siblingCount = 1,
    size = 'md',
    disabled = false,
    className,
    'aria-label': ariaLabel,
    ...props
  },
  ref,
) {
  const clampedCount = clampPageCount(pageCount);
  const clampedCurrent = clampCurrent(currentPage, clampedCount);
  const items = paginationRange(clampedCurrent, clampedCount, clampSiblings(siblingCount));

  // {...props} last so consumer overrides win (Pattern A). className is
  // destructured above and re-injected into clsx() so consumer-supplied
  // class names compose, rather than replacing the component's.
  return (
    <nav
      ref={ref}
      aria-label={ariaLabel ?? 'Pagination'}
      className={clsx(styles.pagination, styles[`size-${size}`], className)}
      {...props}
    >
      <button
        type="button"
        className={clsx(styles.button, styles.navButton)}
        onClick={() => onPageChange(clampedCurrent - 1)}
        disabled={disabled || clampedCurrent === 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} aria-hidden />
        <span>Previous</span>
      </button>

      {items.map((item) => {
        if (item === 'ellipsis-start' || item === 'ellipsis-end') {
          return (
            <span key={item} className={styles.ellipsis} aria-hidden>
              …
            </span>
          );
        }
        const isCurrent = item === clampedCurrent;
        return (
          <button
            key={item}
            type="button"
            className={clsx(styles.button, styles.pageButton, isCurrent && styles.current)}
            onClick={() => onPageChange(item)}
            // Current page is disabled — keeps the button-shaped slot in
            // the layout AND prevents the no-op same-page click. ARIA APG.
            disabled={disabled || isCurrent}
            aria-current={isCurrent ? 'page' : undefined}
            aria-label={isCurrent ? `Page ${item}, current page` : `Go to page ${item}`}
          >
            {item}
          </button>
        );
      })}

      <button
        type="button"
        className={clsx(styles.button, styles.navButton)}
        onClick={() => onPageChange(clampedCurrent + 1)}
        disabled={disabled || clampedCurrent === clampedCount}
        aria-label="Next page"
      >
        <span>Next</span>
        <ChevronRight size={16} aria-hidden />
      </button>
    </nav>
  );
});
```

- [ ] **Step 2: Write `Pagination.module.scss`**

```scss
.pagination {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: inherit;
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  user-select: none;
  transition:
    background-color 120ms ease,
    border-color 120ms ease,
    color 120ms ease;

  &:hover:not(:disabled) {
    background: var(--color-bg-muted);
  }

  &:active:not(:disabled) {
    background: var(--color-bg-sunken);
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    color: var(--color-fg-disabled);
  }
}

.pageButton {
  min-width: var(--size-md);
  height: var(--size-md);
  padding: 0;
}

.navButton {
  height: var(--size-md);
  padding: 0 var(--space-2);
}

// Current-page button — accent palette. Override the `.button` defaults
// AND `:disabled` (since current is rendered as disabled, but should look
// "selected," not "unavailable").
.current {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-accent-fg);

  &:disabled {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-accent-fg);
    cursor: default;
  }
}

.ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--size-md);
  height: var(--size-md);
  color: var(--color-fg-muted);
  user-select: none;
}

// Size modifiers — scale height + min-width + horizontal padding.
.size-sm {
  font-size: var(--font-size-sm);

  .pageButton,
  .ellipsis {
    min-width: var(--size-sm);
    height: var(--size-sm);
  }

  .navButton {
    height: var(--size-sm);
    padding: 0 var(--space-2);
  }
}

.size-md {
  font-size: var(--font-size-md);
}

.size-lg {
  font-size: var(--font-size-md);

  .pageButton,
  .ellipsis {
    min-width: var(--size-lg);
    height: var(--size-lg);
  }

  .navButton {
    height: var(--size-lg);
    padding: 0 var(--space-3);
  }
}
```

- [ ] **Step 3: Run gates**

```bash
npm run typecheck 2>&1 | tail -5
npm run lint:css 2>&1 | tail -5
```

Expected: both clean. If stylelint flags `rule-empty-line-before` or `scss/double-slash-comment-empty-line-before`, fix by adding blank lines before the affected rules/comments — same landmine as Skeleton and EmptyState.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/Pagination/Pagination.tsx \
        packages/design-system/src/components/Pagination/Pagination.module.scss
git commit -m "Pagination: numbered nav with sibling windowing — TSX + SCSS"
```

---

## Task 4: `<Pagination>` tests

**Files:**

- Create: `packages/design-system/src/components/Pagination/Pagination.test.tsx`

- [ ] **Step 1: Write the tests**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders a <nav> with a default aria-label of "Pagination"', () => {
    const { container } = render(
      <Pagination currentPage={1} pageCount={5} onPageChange={() => {}} />,
    );
    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute('aria-label', 'Pagination');
  });

  it('respects a custom aria-label', () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        pageCount={5}
        onPageChange={() => {}}
        aria-label="Top pagination"
      />,
    );
    expect(container.querySelector('nav')).toHaveAttribute('aria-label', 'Top pagination');
  });

  it('renders prev + next + every page number (small pageCount)', () => {
    render(<Pagination currentPage={1} pageCount={5} onPageChange={() => {}} />);
    expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
    expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Page 1, current page/ })).toBeInTheDocument();
    for (const page of [2, 3, 4, 5]) {
      expect(screen.getByRole('button', { name: `Go to page ${page}` })).toBeInTheDocument();
    }
  });

  it('renders ellipses for long page counts (not as buttons)', () => {
    const { container } = render(
      <Pagination currentPage={5} pageCount={20} onPageChange={() => {}} />,
    );
    // Two ellipses appear when current is in the middle of a long list.
    const ellipses = container.querySelectorAll('[aria-hidden="true"]');
    // Filter to just the ellipsis characters (the chevron icons are also aria-hidden).
    const ellipsisTextNodes = Array.from(ellipses).filter((el) => el.textContent === '…');
    expect(ellipsisTextNodes).toHaveLength(2);
    // Ellipses are <span>, not <button>.
    for (const node of ellipsisTextNodes) {
      expect(node.tagName).toBe('SPAN');
    }
  });

  it('marks the current page with aria-current="page" and disables it', () => {
    render(<Pagination currentPage={3} pageCount={5} onPageChange={() => {}} />);
    const current = screen.getByRole('button', { name: /Page 3, current page/ });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current).toBeDisabled();
  });

  it('disables prev on page 1', () => {
    render(<Pagination currentPage={1} pageCount={5} onPageChange={() => {}} />);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).not.toBeDisabled();
  });

  it('disables next on the last page', () => {
    render(<Pagination currentPage={5} pageCount={5} onPageChange={() => {}} />);
    expect(screen.getByLabelText('Previous page')).not.toBeDisabled();
    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });

  it('disables every button when disabled=true', () => {
    render(<Pagination currentPage={2} pageCount={5} onPageChange={() => {}} disabled />);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).toBeDisabled();
    for (const page of [1, 2, 3, 4, 5]) {
      const name = page === 2 ? /Page 2, current page/ : new RegExp(`Go to page ${page}`);
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
  });

  it('clicking a page number fires onPageChange with that page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} pageCount={5} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: 'Go to page 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('clicking prev fires onPageChange(currentPage - 1)', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={3} pageCount={5} onPageChange={onPageChange} />);
    await user.click(screen.getByLabelText('Previous page'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('clicking next fires onPageChange(currentPage + 1)', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={3} pageCount={5} onPageChange={onPageChange} />);
    await user.click(screen.getByLabelText('Next page'));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('clicking the (disabled) current page does not fire onPageChange', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={3} pageCount={5} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: /Page 3, current page/ }));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('clamps currentPage > pageCount without crashing', () => {
    render(<Pagination currentPage={99} pageCount={5} onPageChange={() => {}} />);
    // The last page should be rendered as current.
    expect(screen.getByRole('button', { name: /Page 5, current page/ })).toBeInTheDocument();
  });

  it('clamps currentPage < 1 to page 1', () => {
    render(<Pagination currentPage={0} pageCount={5} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: /Page 1, current page/ })).toBeInTheDocument();
  });

  it('clamps pageCount < 1 to 1 (single-page edge case)', () => {
    const { container } = render(
      <Pagination currentPage={1} pageCount={0} onPageChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /Page 1, current page/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).toBeDisabled();
    expect(container.querySelectorAll('nav button').length).toBe(3); // prev + page 1 + next
  });

  it('applies the size class', () => {
    const { container, rerender } = render(
      <Pagination currentPage={1} pageCount={3} onPageChange={() => {}} size="sm" />,
    );
    expect((container.querySelector('nav') as HTMLElement).className).toMatch(/size-sm/);
    rerender(<Pagination currentPage={1} pageCount={3} onPageChange={() => {}} size="lg" />);
    expect((container.querySelector('nav') as HTMLElement).className).toMatch(/size-lg/);
  });

  it('defaults to size="md"', () => {
    const { container } = render(
      <Pagination currentPage={1} pageCount={3} onPageChange={() => {}} />,
    );
    expect((container.querySelector('nav') as HTMLElement).className).toMatch(/size-md/);
  });

  it('forwards ref to the outer <nav>', () => {
    const ref = createRef<HTMLElement>();
    render(<Pagination ref={ref} currentPage={1} pageCount={3} onPageChange={() => {}} />);
    expect(ref.current?.tagName).toBe('NAV');
  });

  it('merges className without replacing', () => {
    const { container } = render(
      <Pagination currentPage={1} pageCount={3} onPageChange={() => {}} className="my-cls" />,
    );
    const nav = container.querySelector('nav') as HTMLElement;
    expect(nav.className).toMatch(/my-cls/);
    expect(nav.className).toMatch(/pagination/);
  });

  it('respects siblingCount=0 (tight display)', () => {
    render(<Pagination currentPage={5} pageCount={10} onPageChange={() => {}} siblingCount={0} />);
    // With siblings=0, current=5, count=10: [1, ellipsis-start, 5, ellipsis-end, 10]
    expect(screen.getByRole('button', { name: 'Go to page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Page 5, current page/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to page 10' })).toBeInTheDocument();
    // Pages 2, 3, 4, 6, 7, 8, 9 should NOT be rendered as buttons.
    for (const page of [2, 3, 4, 6, 7, 8, 9]) {
      expect(screen.queryByRole('button', { name: `Go to page ${page}` })).not.toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npm test --workspace=@eocrm/design-system --run -- src/components/Pagination 2>&1 | tail -10
```

Expected: PASS — 20 tests pass (14 from paginationRange + 19 from Pagination = 33 total in the Pagination folder; the report shows 19 from this new file).

Note: vitest globals are auto-loaded (`describe`, `it`, `expect`, `vi`) per `packages/design-system/CLAUDE.md` Rule 1.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/Pagination/Pagination.test.tsx
git commit -m "Pagination: unit tests — slots, ARIA, clamps, sizes, ref"
```

---

## Task 5: `<CursorPagination>` component (TSX + SCSS)

**Files:**

- Create: `packages/design-system/src/components/CursorPagination/CursorPagination.tsx`
- Create: `packages/design-system/src/components/CursorPagination/CursorPagination.module.scss`

- [ ] **Step 1: Write `CursorPagination.tsx`**

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { PaginationSize } from '../Pagination/Pagination';
import styles from './CursorPagination.module.scss';

export interface CursorPaginationProps extends HTMLAttributes<HTMLElement> {
  /**
   * Whether a previous page exists. When `false`, the previous button is
   * rendered as `disabled` (layout stays stable; consumer doesn't have to
   * conditionally hide it).
   */
  hasPrevious: boolean;

  /** Whether a next page exists. */
  hasNext: boolean;

  /** Called when the user clicks previous (not fired when disabled). */
  onPrevious: () => void;

  /** Called when the user clicks next (not fired when disabled). */
  onNext: () => void;

  /**
   * Label for the previous button. Defaults to `'Previous'`. Override for
   * domain phrasing (`'Newer'` in a reverse-chronological feed,
   * `'Older'` for the next direction).
   */
  previousLabel?: ReactNode;

  /** Label for the next button. Defaults to `'Next'`. */
  nextLabel?: ReactNode;

  /**
   * Visual size — `'sm'` / `'md'` (default) / `'lg'`. Shares the
   * `<Pagination>` size scale so the two components match when used
   * alongside each other.
   */
  size?: PaginationSize;

  /** When `true`, both buttons are disabled regardless of has-prev/-next. */
  disabled?: boolean;

  /**
   * Accessible name for the wrapper `<nav>`. Defaults to `'Pagination'`.
   */
  'aria-label'?: string;
}

/**
 * Cursor pagination — prev / next pair for streams without a known total
 * page count (activity feeds, infinite scroll, keyset-paginated APIs).
 *
 * Controlled — consumer owns the cursor state. The component just renders
 * the two buttons and fires `onPrevious` / `onNext`.
 *
 * @example
 * <CursorPagination
 *   hasPrevious={hasPrev}
 *   hasNext={hasNext}
 *   onPrevious={loadPrevious}
 *   onNext={loadNext}
 * />
 *
 * @example
 * // Activity feed with reversed direction labels:
 * <CursorPagination
 *   hasPrevious={hasNewer}
 *   hasNext={hasOlder}
 *   onPrevious={loadNewer}
 *   onNext={loadOlder}
 *   previousLabel="Newer"
 *   nextLabel="Older"
 * />
 *
 * @remarks When NOT to use
 * - When you have a total page count → use `<Pagination>` (numbered, with
 *   jump-to-page and progress indication).
 *
 * @remarks A11y
 * - Wrapper is `<nav aria-label="Pagination">` (overridable for
 *   disambiguation).
 * - Buttons are native `<button disabled>` when `hasPrevious` /
 *   `hasNext` is false — screen readers announce "dimmed" and skip them
 *   during Tab navigation.
 */
export const CursorPagination = forwardRef<HTMLElement, CursorPaginationProps>(
  function CursorPagination(
    {
      hasPrevious,
      hasNext,
      onPrevious,
      onNext,
      previousLabel = 'Previous',
      nextLabel = 'Next',
      size = 'md',
      disabled = false,
      className,
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) {
    // {...props} last so consumer overrides win (Pattern A).
    return (
      <nav
        ref={ref}
        aria-label={ariaLabel ?? 'Pagination'}
        className={clsx(styles.cursorPagination, styles[`size-${size}`], className)}
        {...props}
      >
        <button
          type="button"
          className={styles.button}
          onClick={onPrevious}
          disabled={disabled || !hasPrevious}
        >
          <ChevronLeft size={16} aria-hidden />
          <span>{previousLabel}</span>
        </button>

        <button
          type="button"
          className={styles.button}
          onClick={onNext}
          disabled={disabled || !hasNext}
        >
          <span>{nextLabel}</span>
          <ChevronRight size={16} aria-hidden />
        </button>
      </nav>
    );
  },
);
```

- [ ] **Step 2: Write `CursorPagination.module.scss`**

```scss
.cursorPagination {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  height: var(--size-md);
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: inherit;
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  user-select: none;
  transition:
    background-color 120ms ease,
    border-color 120ms ease,
    color 120ms ease;

  &:hover:not(:disabled) {
    background: var(--color-bg-muted);
  }

  &:active:not(:disabled) {
    background: var(--color-bg-sunken);
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    color: var(--color-fg-disabled);
  }
}

.size-sm {
  font-size: var(--font-size-sm);

  .button {
    height: var(--size-sm);
    padding: 0 var(--space-2);
  }
}

.size-md {
  font-size: var(--font-size-md);
}

.size-lg {
  font-size: var(--font-size-md);

  .button {
    height: var(--size-lg);
    padding: 0 var(--space-4);
  }
}
```

- [ ] **Step 3: Run gates**

```bash
npm run typecheck 2>&1 | tail -5
npm run lint:css 2>&1 | tail -5
```

Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/CursorPagination/CursorPagination.tsx \
        packages/design-system/src/components/CursorPagination/CursorPagination.module.scss
git commit -m "CursorPagination: prev/next-only nav for streams without total"
```

---

## Task 6: `<CursorPagination>` tests

**Files:**

- Create: `packages/design-system/src/components/CursorPagination/CursorPagination.test.tsx`

- [ ] **Step 1: Write the tests**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { CursorPagination } from './CursorPagination';

describe('CursorPagination', () => {
  const noop = () => {};

  it('renders a <nav> with the default aria-label', () => {
    const { container } = render(
      <CursorPagination hasPrevious hasNext onPrevious={noop} onNext={noop} />,
    );
    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute('aria-label', 'Pagination');
  });

  it('renders default "Previous" and "Next" labels', () => {
    render(<CursorPagination hasPrevious hasNext onPrevious={noop} onNext={noop} />);
    expect(screen.getByRole('button', { name: /Previous/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/ })).toBeInTheDocument();
  });

  it('renders custom labels when provided', () => {
    render(
      <CursorPagination
        hasPrevious
        hasNext
        onPrevious={noop}
        onNext={noop}
        previousLabel="Newer"
        nextLabel="Older"
      />,
    );
    expect(screen.getByRole('button', { name: /Newer/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Older/ })).toBeInTheDocument();
  });

  it('disables previous when hasPrevious=false', () => {
    render(<CursorPagination hasPrevious={false} hasNext onPrevious={noop} onNext={noop} />);
    expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Next/ })).not.toBeDisabled();
  });

  it('disables next when hasNext=false', () => {
    render(<CursorPagination hasPrevious hasNext={false} onPrevious={noop} onNext={noop} />);
    expect(screen.getByRole('button', { name: /Previous/ })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();
  });

  it('disables both when disabled=true (even if has-prev / has-next are true)', () => {
    render(<CursorPagination hasPrevious hasNext onPrevious={noop} onNext={noop} disabled />);
    expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();
  });

  it('clicking previous fires onPrevious', async () => {
    const user = userEvent.setup();
    const onPrevious = vi.fn();
    render(<CursorPagination hasPrevious hasNext onPrevious={onPrevious} onNext={noop} />);
    await user.click(screen.getByRole('button', { name: /Previous/ }));
    expect(onPrevious).toHaveBeenCalledOnce();
  });

  it('clicking next fires onNext', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<CursorPagination hasPrevious hasNext onPrevious={noop} onNext={onNext} />);
    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('does not fire onPrevious when the button is disabled', async () => {
    const user = userEvent.setup();
    const onPrevious = vi.fn();
    render(<CursorPagination hasPrevious={false} hasNext onPrevious={onPrevious} onNext={noop} />);
    await user.click(screen.getByRole('button', { name: /Previous/ }));
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it('applies the size class', () => {
    const { container, rerender } = render(
      <CursorPagination hasPrevious hasNext onPrevious={noop} onNext={noop} size="sm" />,
    );
    expect((container.querySelector('nav') as HTMLElement).className).toMatch(/size-sm/);
    rerender(<CursorPagination hasPrevious hasNext onPrevious={noop} onNext={noop} size="lg" />);
    expect((container.querySelector('nav') as HTMLElement).className).toMatch(/size-lg/);
  });

  it('forwards ref to the outer <nav>', () => {
    const ref = createRef<HTMLElement>();
    render(<CursorPagination ref={ref} hasPrevious hasNext onPrevious={noop} onNext={noop} />);
    expect(ref.current?.tagName).toBe('NAV');
  });

  it('merges className', () => {
    const { container } = render(
      <CursorPagination hasPrevious hasNext onPrevious={noop} onNext={noop} className="my-cls" />,
    );
    const nav = container.querySelector('nav') as HTMLElement;
    expect(nav.className).toMatch(/my-cls/);
    expect(nav.className).toMatch(/cursorPagination/);
  });

  it('flows custom aria-label through to the <nav>', () => {
    const { container } = render(
      <CursorPagination
        hasPrevious
        hasNext
        onPrevious={noop}
        onNext={noop}
        aria-label="Feed pagination"
      />,
    );
    expect(container.querySelector('nav')).toHaveAttribute('aria-label', 'Feed pagination');
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npm test --workspace=@eocrm/design-system --run -- src/components/CursorPagination 2>&1 | tail -10
```

Expected: PASS — 13 tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/CursorPagination/CursorPagination.test.tsx
git commit -m "CursorPagination: unit tests — labels, disabled states, callbacks, ref"
```

---

## Task 7: Barrels + `src/index.ts` re-exports

**Files:**

- Create: `packages/design-system/src/components/Pagination/index.ts`
- Create: `packages/design-system/src/components/CursorPagination/index.ts`
- Modify: `packages/design-system/src/index.ts`

- [ ] **Step 1: Pagination barrel**

Create `packages/design-system/src/components/Pagination/index.ts`:

```ts
export { Pagination } from './Pagination';
export type { PaginationProps, PaginationSize } from './Pagination';
export { paginationRange } from './paginationRange';
export type { PaginationItem } from './paginationRange';
```

- [ ] **Step 2: CursorPagination barrel**

Create `packages/design-system/src/components/CursorPagination/index.ts`:

```ts
export { CursorPagination } from './CursorPagination';
export type { CursorPaginationProps } from './CursorPagination';
```

Note: `PaginationSize` is exported only from the Pagination barrel — `CursorPagination` re-imports it (`import type { PaginationSize } from '../Pagination/Pagination'`). One source of truth.

- [ ] **Step 3: Top-level re-export**

Open `packages/design-system/src/index.ts`. Find the alphabetical slot for `Pagination` (between `Input` family and `Popover`), and for `CursorPagination` (between `Cluster` and `DatePicker`). Add:

For CursorPagination (somewhere near the existing alphabetical area):

```ts
export { CursorPagination } from './components/CursorPagination';
export type { CursorPaginationProps } from './components/CursorPagination';
```

For Pagination:

```ts
export { Pagination, paginationRange } from './components/Pagination';
export type { PaginationProps, PaginationSize, PaginationItem } from './components/Pagination';
```

Verify by reading the file and placing entries in the right alphabetical order with the existing exports.

- [ ] **Step 4: Gates**

```bash
npm run typecheck 2>&1 | tail -3
npm run build 2>&1 | tail -3
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/Pagination/index.ts \
        packages/design-system/src/components/CursorPagination/index.ts \
        packages/design-system/src/index.ts
git commit -m "Pagination + CursorPagination: barrels + src/index.ts re-exports (Rule 5)"
```

---

## Task 8: Playground demo (tabs-based) + 4 wiring places

**Files:**

- Create: `packages/playground/src/pages/components/PaginationDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Create `PaginationDemo.tsx` (umbrella + both panels)**

Mirrors `DatePickersDemo.tsx` — one umbrella component does the header + Tabs + variant switching synced to `?variant=`. Both panels are local functions in the same file (only ~10 examples total, no need to split).

```tsx
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CursorPagination, Cluster, Pagination, Select, Stack, Tabs } from '@eocrm/design-system';
import { DemoBody } from './DemoBody';
import { Example } from './Example';
import styles from './DemoLayout.module.scss';
import paginationTsx from '@lib-source/components/Pagination/Pagination.tsx?raw';
import paginationScss from '@lib-source/components/Pagination/Pagination.module.scss?raw';
import cursorPaginationTsx from '@lib-source/components/CursorPagination/CursorPagination.tsx?raw';
import cursorPaginationScss from '@lib-source/components/CursorPagination/CursorPagination.module.scss?raw';

type Variant = 'pagination' | 'cursor-pagination';

const VARIANTS: Variant[] = ['pagination', 'cursor-pagination'];

function isVariant(v: string | null): v is Variant {
  return v !== null && (VARIANTS as string[]).includes(v);
}

function PaginationDemoPanel() {
  const [page, setPage] = useState(1);
  const [pageMid, setPageMid] = useState(5);
  const [pageTight, setPageTight] = useState(5);
  const [pageWide, setPageWide] = useState(5);
  const [pageWithSize, setPageWithSize] = useState(1);
  // Select values are strings (see SelectProps in the library), so the
  // page-size state is stored as a string and parsed when used.
  const [pageSize, setPageSize] = useState('10');
  const pageSizeNum = Number(pageSize);

  return (
    <DemoBody
      tsxSource={paginationTsx}
      scssSource={paginationScss}
      tsxFilename="Pagination.tsx"
      scssFilename="Pagination.module.scss"
      componentName="Pagination"
    >
      <Example
        title="Basic"
        description="Default md size. Click prev / next / a page number to update."
        code={`const [page, setPage] = useState(1);
<Pagination currentPage={page} pageCount={10} onPageChange={setPage} />`}
      >
        <Pagination currentPage={page} pageCount={10} onPageChange={setPage} />
      </Example>

      <Example
        title="Middle of a long list"
        description="With pageCount=20 and current=5, both ellipses appear. Total slot count stays at 7."
        code={`<Pagination currentPage={5} pageCount={20} onPageChange={setPage} />`}
      >
        <Pagination currentPage={pageMid} pageCount={20} onPageChange={setPageMid} />
      </Example>

      <Example
        title="Single page"
        description="Edge case — pageCount=1 still renders (single disabled-current button + both prev/next disabled). Consumer doesn't have to conditionally hide it."
        code={`<Pagination currentPage={1} pageCount={1} onPageChange={() => {}} />`}
      >
        <Pagination currentPage={1} pageCount={1} onPageChange={() => {}} />
      </Example>

      <Example
        title="siblingCount=0 (tight)"
        description="For sidebar / narrow column use. Hides the sibling pages — just first, current, last + ellipses."
        code={`<Pagination
  currentPage={5}
  pageCount={100}
  onPageChange={setPage}
  siblingCount={0}
/>`}
      >
        <Pagination
          currentPage={pageTight}
          pageCount={100}
          onPageChange={setPageTight}
          siblingCount={0}
        />
      </Example>

      <Example
        title="siblingCount=2 (wide)"
        description="For full-width footers. Two sibling pages on each side of current — totalSlots = 9."
        code={`<Pagination
  currentPage={6}
  pageCount={20}
  onPageChange={setPage}
  siblingCount={2}
/>`}
      >
        <Pagination
          currentPage={pageWide}
          pageCount={20}
          onPageChange={setPageWide}
          siblingCount={2}
        />
      </Example>

      <Example
        title="Sizes — sm / md / lg"
        description="sm for tight footers and sidebars, md (default) for DataTable, lg for hero / standalone."
        code={`<Stack gap="md">
  <Pagination size="sm" currentPage={3} pageCount={10} onPageChange={setPage} />
  <Pagination size="md" currentPage={3} pageCount={10} onPageChange={setPage} />
  <Pagination size="lg" currentPage={3} pageCount={10} onPageChange={setPage} />
</Stack>`}
      >
        <Stack gap="md">
          <Pagination size="sm" currentPage={3} pageCount={10} onPageChange={() => {}} />
          <Pagination size="md" currentPage={3} pageCount={10} onPageChange={() => {}} />
          <Pagination size="lg" currentPage={3} pageCount={10} onPageChange={() => {}} />
        </Stack>
      </Example>

      <Example
        title="Disabled (loading lock)"
        description="Lock the whole nav while data is refetching to prevent double-clicks."
        code={`<Pagination currentPage={3} pageCount={10} onPageChange={setPage} disabled />`}
      >
        <Pagination currentPage={3} pageCount={10} onPageChange={() => {}} disabled />
      </Example>

      <Example
        title="Composed with <Select> for page size"
        description="The canonical DataTable footer shape — page-size selector on one side, pagination on the other. Pagination doesn't ship a page-size selector itself; the consumer composes it."
        code={`const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState('10');
const pageSizeNum = Number(pageSize);

<Cluster justify="between" align="center" wrap>
  <Cluster gap="sm" align="center">
    <span>Rows per page</span>
    <Select
      value={pageSize}
      onChange={(value) => {
        setPageSize(value as string);
        setPage(1); // reset to first page when page size changes
      }}
      options={[
        { value: '10', label: '10' },
        { value: '25', label: '25' },
        { value: '50', label: '50' },
      ]}
    />
  </Cluster>
  <Pagination
    currentPage={page}
    pageCount={Math.ceil(240 / pageSizeNum)}
    onPageChange={setPage}
    size="sm"
  />
</Cluster>`}
      >
        <Cluster justify="between" align="center" wrap>
          <Cluster gap="sm" align="center">
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
              Rows per page
            </span>
            <Select
              value={pageSize}
              onChange={(value) => {
                setPageSize(value as string);
                setPageWithSize(1);
              }}
              options={[
                { value: '10', label: '10' },
                { value: '25', label: '25' },
                { value: '50', label: '50' },
              ]}
            />
          </Cluster>
          <Pagination
            currentPage={pageWithSize}
            pageCount={Math.ceil(240 / pageSizeNum)}
            onPageChange={setPageWithSize}
            size="sm"
          />
        </Cluster>
      </Example>
    </DemoBody>
  );
}

function CursorPaginationDemoPanel() {
  // Mini state machine for the "real" cursor demo — clamps within [0, 5]
  // pretend-pages so the buttons disable at the boundaries.
  const [cursor, setCursor] = useState(2);
  const hasPrev = cursor > 0;
  const hasNext = cursor < 5;

  return (
    <DemoBody
      tsxSource={cursorPaginationTsx}
      scssSource={cursorPaginationScss}
      tsxFilename="CursorPagination.tsx"
      scssFilename="CursorPagination.module.scss"
    >
      <Example
        title="Basic"
        description="Both buttons enabled — has both directions to navigate."
        code={`<CursorPagination
  hasPrevious={hasPrev}
  hasNext={hasNext}
  onPrevious={loadPrevious}
  onNext={loadNext}
/>`}
      >
        <Stack gap="xs">
          <CursorPagination
            hasPrevious={hasPrev}
            hasNext={hasNext}
            onPrevious={() => setCursor((c) => c - 1)}
            onNext={() => setCursor((c) => c + 1)}
          />
          <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
            cursor = {cursor} (range 0–5)
          </code>
        </Stack>
      </Example>

      <Example
        title="At the start (hasPrevious=false)"
        description="Previous is disabled. Layout doesn't shift — the button stays in the row."
        code={`<CursorPagination
  hasPrevious={false}
  hasNext={true}
  onPrevious={loadPrevious}
  onNext={loadNext}
/>`}
      >
        <CursorPagination hasPrevious={false} hasNext onPrevious={() => {}} onNext={() => {}} />
      </Example>

      <Example
        title="At the end (hasNext=false)"
        description="Next is disabled. Same layout shape."
        code={`<CursorPagination
  hasPrevious={true}
  hasNext={false}
  onPrevious={loadPrevious}
  onNext={loadNext}
/>`}
      >
        <CursorPagination hasPrevious hasNext={false} onPrevious={() => {}} onNext={() => {}} />
      </Example>

      <Example
        title="Custom labels — 'Newer' / 'Older'"
        description="For reverse-chronological feeds where 'Previous' means going to more recent items."
        code={`<CursorPagination
  hasPrevious={hasNewer}
  hasNext={hasOlder}
  onPrevious={loadNewer}
  onNext={loadOlder}
  previousLabel="Newer"
  nextLabel="Older"
/>`}
      >
        <CursorPagination
          hasPrevious
          hasNext
          onPrevious={() => {}}
          onNext={() => {}}
          previousLabel="Newer"
          nextLabel="Older"
        />
      </Example>
    </DemoBody>
  );
}

export function PaginationDemo() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('variant');
  const active: Variant = isVariant(raw) ? raw : 'pagination';

  return (
    <Stack gap="lg">
      <header className={styles.header}>
        <span className={styles.eyebrow}>Component</span>
        <h1 className={styles.title}>Pagination</h1>
        <p className={styles.description}>
          Numbered nav with windowing for lists with a known total, plus a cursor variant for
          streams without one. Both controlled.
        </p>
      </header>

      <Tabs
        items={[
          { id: 'pagination', label: 'Pagination' },
          { id: 'cursor-pagination', label: 'CursorPagination' },
        ]}
        activeId={active}
        onChange={(id) => setParams({ variant: id }, { replace: true })}
      />

      {active === 'pagination' && <PaginationDemoPanel />}
      {active === 'cursor-pagination' && <CursorPaginationDemoPanel />}
    </Stack>
  );
}
```

- [ ] **Step 2: Wire `App.tsx` route**

Open `packages/playground/src/App.tsx`. Add the import alphabetically:

```ts
import { PaginationDemo } from './pages/components/PaginationDemo';
```

Then add the route inside the `<Routes>` (alphabetical by path):

```tsx
<Route path="/components/pagination" element={<PaginationDemo />} />
```

- [ ] **Step 3: Wire sidebar (`AppShell.tsx`)**

Open `packages/playground/src/layout/AppShell/AppShell.tsx`. Add `ArrowLeftRight` (or another suitable lucide icon, e.g., `ListOrdered`) to the `lucide-react` import if not already present. Add to the Navigation group (or wherever fits — current grouping shows Pagination would sit in a new or existing Navigation-style group; following `EmptyState`'s precedent, it can go under Display alphabetically or under Forms if there's no Navigation group). Recommended placement: under Display, between `EmptyState` and `Skeleton`:

```tsx
{ to: '/components/pagination', label: 'Pagination', icon: ListOrdered, end: false },
```

If a Navigation group doesn't yet exist, just place under Display alphabetically. Pagination's natural sibling is the data-display set (Table, Skeleton, EmptyState).

- [ ] **Step 4: Wire `ComponentsIndex.tsx`**

Open `packages/playground/src/pages/components/ComponentsIndex.tsx`. Add the `Pagination` import from `@eocrm/design-system` if needed, and `ListOrdered` from `lucide-react`. Add a card alphabetically:

```tsx
{
  to: '/components/pagination',
  name: 'Pagination',
  description:
    'Numbered nav with windowing (▶ Previous 1 … 5 6 7 … 99 100 Next ◀), plus a cursor variant. Both controlled, no built-in page size.',
  preview: <Pagination currentPage={3} pageCount={10} onPageChange={() => {}} size="sm" />,
},
```

- [ ] **Step 5: Wire `registry.ts`**

Open `packages/playground/src/pages/mockups/registry.ts`. Add `'Pagination'` and `'CursorPagination'` to the `ComponentName` union, alphabetically:

```ts
export type ComponentName =
  | 'Button'
  | ...
  | 'CursorPagination'
  | ...
  | 'Pagination'
  | ...;
```

(Exact placement depends on existing union — slot them alphabetically.)

- [ ] **Step 6: Gates + smoke**

```bash
cd /home/dpws/projects/design-system
npm run typecheck 2>&1 | tail -5
npm run build 2>&1 | tail -5
# If a dev server is running on localhost:8080 (started with `make up`):
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/components/pagination
```

Expected: typecheck + build clean; if dev server is running, curl returns 200.

- [ ] **Step 7: Commit**

```bash
git add packages/playground/src/
git commit -m "PaginationDemo: tabs-based umbrella + sidebar + index + registry wiring"
```

---

## Task 9: AGENTS.md sections

**Files:**

- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Add two sections**

Add the sections alphabetically in the Display area (where Calendar / EmptyState / Skeleton already live), or — preferably — group them together since they're sibling primitives. Two new sections — `<CursorPagination>` and `<Pagination>`.

Insert before `<Popover>` (or wherever fits the existing alphabetical / thematic groupings — the existing AGENTS.md ordering is loose):

```markdown
### `<CursorPagination>` — prev / next for streams without total

\`\`\`tsx
<CursorPagination
  hasPrevious={hasPrev}
  hasNext={hasNext}
  onPrevious={loadPrev}
  onNext={loadNext}
/>
\`\`\`

- Two-button prev / next nav. Controlled — consumer owns the cursor / has-prev / has-next.
- Buttons are native `<button disabled>` when `hasPrevious` / `hasNext` is false — no layout shift.
- `previousLabel` / `nextLabel` accept `ReactNode` — override for reverse-chronological feeds (`'Newer'` / `'Older'`).
- Use `<Pagination>` (numbered) when you have a known total page count. CursorPagination is for streams.
- No load-more variant — that's `<Button onClick={loadMore} loading={isLoading}>Load more</Button>`.

### `<Pagination>` — numbered nav with windowing

\`\`\`tsx
const [page, setPage] = useState(1);
<Pagination currentPage={page} pageCount={20} onPageChange={setPage} />
\`\`\`

- Controlled-only — consumer owns `currentPage`. No internal state.
- Sibling windowing — `siblingCount` (default `1`) controls how many pages on each side of current. Boundary fixed at 1 (first + last always shown). Slot count stays constant once ellipses kick in (`siblingCount * 2 + 5`) — the row's width doesn't jump as the user clicks.
- Current page is rendered as a disabled `<button>` with `aria-current="page"` (the W3C ARIA APG pattern).
- Sizes: `'sm'` (24px) / `'md'` (32px, default) / `'lg'` (40px) — tracks the Button / Input scale so Pagination sits cleanly next to a `<Button>` in a Cluster.
- Out-of-range `currentPage` / `pageCount` clamp at render time (defensive — same precedent as `<EmptyState>`'s `clampHeading`).
- **Not bundled**: page-size selector, count caption ("Showing 11–20 of 240"). Compose those with `<Select>` and `<Text>` — keeps Pagination focused on navigation.
- For streams without a total → use `<CursorPagination>`.
- For "load more" → use `<Button>` directly.
```

- [ ] **Step 2: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "AGENTS.md: document <Pagination> + <CursorPagination>"
```

---

## Task 10: Final gates + Hard Rule 8 review cycle + PR

- [ ] **Step 1: Prettier write**

```bash
cd /home/dpws/projects/design-system
npx prettier --write \
  "packages/design-system/src/components/Pagination/**/*.{ts,tsx,scss}" \
  "packages/design-system/src/components/CursorPagination/**/*.{ts,tsx,scss}" \
  "packages/design-system/src/index.ts" \
  "packages/design-system/AGENTS.md" \
  "packages/playground/src/pages/components/PaginationDemo.tsx" \
  "packages/playground/src/App.tsx" \
  "packages/playground/src/layout/AppShell/AppShell.tsx" \
  "packages/playground/src/pages/components/ComponentsIndex.tsx" \
  "packages/playground/src/pages/mockups/registry.ts" \
  "docs/superpowers/specs/2026-05-22-pagination-design.md" \
  "docs/superpowers/plans/2026-05-22-pagination.md" \
  2>&1 | tail -10
git add -A packages/ docs/
git diff --cached --quiet || git commit -m "Prettier: format Pagination + CursorPagination + demo"
```

- [ ] **Step 2: Full gates**

```bash
npm test --workspace=@eocrm/design-system --run 2>&1 | tail -6
npm run typecheck 2>&1 | tail -3
npm run lint:css 2>&1 | tail -3
npm run build 2>&1 | tail -3
npx prettier --check \
  "packages/**/src/**/*.{ts,tsx,scss}" \
  "packages/design-system/AGENTS.md" \
  "docs/superpowers/**/2026-05-22-pagination*.md" \
  2>&1 | tail -3
npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -cE "\.test\."
```

Expected: tests pass (counts: 14 paginationRange + 19 Pagination + 13 CursorPagination = 46 new; total ~986); typecheck/lint/build/prettier clean; pack count = 0.

- [ ] **Step 3: Push**

```bash
git push -u origin feat/pagination 2>&1 | tail -8
```

The Husky pre-push hook re-runs prettier + stylelint + typecheck.

- [ ] **Step 4: Hard Rule 8 review cycle 1**

Dispatch a fresh-context `general-purpose` reviewer (Opus, read-only). Brief on:

- Required reading: `packages/design-system/CLAUDE.md` (all 8 rules), `packages/design-system/AGENTS.md`, `docs/superpowers/specs/2026-05-22-pagination-design.md`.
- Scope: full diff `origin/main..HEAD`.
- Specific landmines:
  1. `paginationRange` matches MUI's algorithm — verify the 13 edge-case entries from the spec's table all produce the expected output (the test file covers these, but reviewer should sanity-check the algorithm).
  2. Current-page button has BOTH `aria-current="page"` AND `disabled` (W3C ARIA APG pattern). One without the other is wrong.
  3. Rule 4 — no margin / position / flex-grow / etc. on either component's root. Internal `padding`, `min-width`, `height` are fine (they're internal sizing, not layout).
  4. `lucide-react` is imported from both components — pre-existing latent peer-dep bug NOT fixed in this PR (the existing 8 components have the same issue). Confirm the reviewer doesn't flag it as critical/important on this PR; it's an explicit non-goal.
  5. `PaginationSize` is exported only from the Pagination barrel; CursorPagination re-imports — confirm one source of truth.
  6. Spread order — `{...props}` last on both components (Pattern A). Verify the inline comment is present.
  7. Demo follows DatePickers' tabs pattern (header + Tabs + `?variant=` query param sync + DemoBody panels). Confirm.
  8. The current-page button's `.current` SCSS class must override the base `.button:disabled` color (otherwise the accent palette becomes disabled-gray when current). Verify the cascade order in `Pagination.module.scss`.
- Output: Critical / Important / Nice-to-have / Regression-watch + final verdict.

- [ ] **Step 5: Apply review fixes**

For each Critical and Important finding, fix and commit. For Nice-to-have, judgment call. For skipped items, document the skip rationale in the commit body.

Re-run gates. Re-push. Re-spawn reviewer until verdict is `clean enough to stop`.

- [ ] **Step 6: Open PR**

```bash
gh pr create --title "Pagination + CursorPagination: numbered nav with windowing + cursor variant" --body "$(cat <<'EOF'
## Summary

Two new primitives — the third PR in the Skeleton → EmptyState → Pagination → DataTable v1 sequence.

- **`<Pagination>`** — numbered nav with sibling windowing. Controlled. `siblingCount` knob (default 1) for tight vs wide displays. Current page is rendered as a disabled `<button aria-current="page">` (W3C ARIA APG pattern). Out-of-range `currentPage` / `pageCount` clamp at render time.
- **`<CursorPagination>`** — prev / next pair for streams without a total. Controlled. Custom labels (`'Newer'` / `'Older'`) for reverse-chronological feeds.
- **`paginationRange`** — pure windowing utility, tested in isolation against MUI's `usePagination` (13 edge-case entries from the spec's table, plus a constant-slot-count invariant).
- **No built-in page-size selector or count caption** — consumer composes with `<Select>` and text. DataTable v1 will own those concerns in its own footer.
- **Demo follows the DatePickers tabs pattern** — single umbrella file with `<Tabs>` switching between the two variants, synced to `?variant=` query param.

Both components reuse the existing Button visual vocabulary (size scale, focus ring, hover/active states) so they sit cleanly in a `<Cluster>` next to a `<Button>`. No new tokens. No new dependencies (lucide-react is already used by 8 existing components — the latent peer-dep declaration bug is flagged but not fixed in this PR).

## Test plan

- [x] `npm test --run` — 46 new tests (14 paginationRange + 19 Pagination + 13 CursorPagination)
- [x] `npm run typecheck` clean
- [x] `npm run lint:css` clean
- [x] `npm run build` clean
- [x] `npx prettier --check` clean
- [x] `npm pack --dry-run -w @eocrm/design-system` — 0 test files in tarball; Pagination + CursorPagination source files present
- [x] Manual smoke: 8 Pagination + 4 CursorPagination demo examples render; tab switching syncs to `?variant=`
- [x] Hard Rule 8 review cycle — final verdict: clean enough to stop

## Design spec / plan

- Spec: \`docs/superpowers/specs/2026-05-22-pagination-design.md\`
- Plan: \`docs/superpowers/plans/2026-05-22-pagination.md\`

## Out of scope (deferred)

- Load-more variant — \`<Button onClick={loadMore} loading={isLoading}>Load more</Button>\` is the entire feature.
- Page-size selector and count caption — composed by consumers (DataTable owns its own in v1).
- \`lucide-react\` peer-dep declaration fix — pre-existing latent bug across 8 components; deserves its own scoped follow-up.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

**Spec coverage:**

- §Architecture (two separate components, paginationRange extracted) → Tasks 2, 3, 5.
- §`<Pagination>` Public API (every prop) → Task 3 (TSX implements the full interface).
- §`<CursorPagination>` Public API → Task 5.
- §Visual / tokens table → Tasks 3 (Pagination SCSS), 5 (CursorPagination SCSS).
- §Windowing algorithm + edge case table → Task 2 (test cases + algorithm match the spec exactly).
- §Rendering / markup → Tasks 3, 5.
- §A11y → Tasks 3, 5 (JSDoc) + Tasks 4, 6 (tests verify aria-current, disabled states, etc).
- §States → Tasks 4, 6 (test coverage).
- §Tests → Tasks 2 (paginationRange), 4 (Pagination), 6 (CursorPagination).
- §Playground demo (tabs-based) → Task 8.
- §AGENTS.md → Task 9.
- §Risks / open questions → all resolved decisions reflected in code (clamping, disabled current, ARIA pattern).

**Type consistency:**

- `PaginationSize` defined once (in Pagination.tsx), re-exported from Pagination's barrel only, re-imported by CursorPagination via relative path. ✓
- `PaginationItem` defined in paginationRange.ts, re-exported from Pagination's barrel. ✓
- All four type names (`PaginationProps`, `PaginationSize`, `PaginationItem`, `CursorPaginationProps`) re-exported from `src/index.ts`. ✓
- `paginationRange` is the function name, exported from both the Pagination barrel and `src/index.ts`. ✓

**Placeholder scan:** All steps contain complete code. No TBD / TODO / "similar to" references.
