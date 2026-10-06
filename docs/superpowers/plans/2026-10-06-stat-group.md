# StatGroup / StatTile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `StatGroup` + `StatTile`, a responsive grid of KPI tiles (label, value, trend, footnote, icon) with a loading state, for eocrm dashboard widgets (issue #630).

**Architecture:** `StatGroup` wraps `Grid as="ul"` (auto-fit, clamped min column) and provides `loading` via context. `StatTile` is an `<li>` filled tile. The kpi variant's trend markup moves to `_internal/Trend`, which both `DashboardWidget` and `StatTile` render; each styles it with its own tokens.

**Tech Stack:** React 19 + TypeScript, CSS Modules (SCSS), lucide-react, Vitest + Testing Library, Vite playground.

**Spec:** `docs/superpowers/specs/2026-10-06-stat-group-design.md`

## Global Constraints

- Branch `feat/stat-group` (already created, spec committed). Never push to `main`.
- Library code: `forwardRef` + spread HTML attrs (Pattern A, consumer wins, with a one-line comment), JSDoc on every exported member; component JSDoc = one-line summary + `@see docs/components/<Name>.md`.
- SCSS: tokens only (`var(--…)`), component tokens in `<Name>.tokens.scss` defaulting to primitives. No `margin`/`position`/`top…`/`flex: 1`/`flex-grow`/`align-self`/`width` (except 100%)/`grid-column` in component SCSS, except the native `<ul>` margin/padding reset with a `// stylelint-disable-next-line property-disallowed-list -- native <ul> … reset` comment (same as `Card.module.scss`).
- Every user-visible string via `useTranslation()`; new keys in `src/i18n/messages.ts`, `en.ts`, `ru.ts`.
- **Do not rename existing i18n keys.** `dashboardWidget.trendUp/trendDown/trendFlat` stay where they are (consumers can override them through `I18nProvider overrides`; a rename would silently drop those overrides). The shared Trend reads them.
- Tests: Vitest globals (no imports of `describe/it/expect/vi`). No exact counts on extensible collections. No redundant smoke tests.
- Playground imports only from `@eocrm/design-system`.
- Commit messages: plain, no Co-Authored-By, no session link, no "Generated with" footer.
- Run tests from `packages/design-system` (`npx vitest run <path>`); run the full gate from the repo root.

## Review Focus

1. **Narrow cell**: a `StatGroup` in a 200px-wide widget must not overflow horizontally. One column, tile shrinks (the `min(…, 100%)` clamp). Pinned in Task 2 (inline template assertion); visual check in Task 4.
2. **`value={0}`**: zero is real data, not "no data"; must render `0`, not "—". Pinned in Task 2.
3. **Loading with no data yet**: consumers pass `trend={data?.trend}` (undefined) while loading. Tiles must still show a trend skeleton so the layout does not jump, and must not show a stale footnote. Pinned in Task 2.
4. **Consumer `aria-label` / `className` / `data-*` on StatGroup** must reach the `<ul>`, and `role="list"` must survive (Safari drops list semantics on `list-style: none` lists without it). Pinned in Task 2.
5. **DashboardWidget kpi trend unchanged** after extraction: same hidden word, same `data-sentiment`, same class hook. Pinned by the existing `DashboardWidget.test.tsx` trend tests in Task 1 (run, do not edit).

---

### Task 1: Extract the shared Trend from DashboardWidget

**Files:**

- Create: `packages/design-system/src/components/_internal/Trend.tsx`
- Modify: `packages/design-system/src/components/DashboardWidget/DashboardWidget.tsx`
- Test: `packages/design-system/src/components/DashboardWidget/DashboardWidget.test.tsx` (existing, unchanged)

**Interfaces:**

- Produces: `Trend({ trend, className }: { trend: DashboardWidgetTrend; className?: string }): JSX.Element` from `src/components/_internal/Trend.tsx`. Renders `<div className={className} data-sentiment={…}>` → aria-hidden lucide icon (16px), `VisuallyHidden` direction word + trailing space, `<span>{trend.label}</span>`.
- `DashboardWidgetTrend` stays defined and exported from `DashboardWidget.tsx` (unchanged public type).

- [ ] **Step 1: Confirm the existing trend tests pass before refactoring (baseline)**

Run: `cd packages/design-system && npx vitest run src/components/DashboardWidget`
Expected: PASS (these tests pin the behaviour the refactor must keep).

- [ ] **Step 2: Create `_internal/Trend.tsx`**

```tsx
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { VisuallyHidden } from '../VisuallyHidden';
import { useTranslation } from '../../i18n/useTranslation';
import type { DashboardWidgetTrend } from '../DashboardWidget/DashboardWidget';

const DEFAULT_SENTIMENT = { up: 'positive', down: 'negative', flat: 'neutral' } as const;
const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;
const TREND_WORD = { up: 'trendUp', down: 'trendDown', flat: 'trendFlat' } as const;

/**
 * Internal: KPI trend line shared by DashboardWidget (kpi) and StatTile. Markup only;
 * the caller's `className` sets size and colours (style `[data-sentiment]` per component).
 */
export function Trend({ trend, className }: { trend: DashboardWidgetTrend; className?: string }) {
  const t = useTranslation();
  const Icon = TREND_ICON[trend.direction];
  return (
    <div
      className={className}
      data-sentiment={trend.sentiment ?? DEFAULT_SENTIMENT[trend.direction]}
    >
      <Icon size={16} aria-hidden="true" />
      <VisuallyHidden>{t(`dashboardWidget.${TREND_WORD[trend.direction]}`)} </VisuallyHidden>
      <span>{trend.label}</span>
    </div>
  );
}
```

(The `import type` back into DashboardWidget is erased at compile time, so there is no runtime cycle.)

- [ ] **Step 3: Use it in DashboardWidget**

In `DashboardWidget.tsx`:

- Remove the `lucide-react` import, `DEFAULT_SENTIMENT`, `TREND_ICON`, `TrendIcon`, `TREND_WORD`.
- Add `import { Trend } from '../_internal/Trend';`
- Replace the kpi trend block

```tsx
{
  trend && (
    <div
      className={styles.trend}
      data-sentiment={trend.sentiment ?? DEFAULT_SENTIMENT[trend.direction]}
    >
      <TrendIcon direction={trend.direction} />
      <VisuallyHidden>{t(`dashboardWidget.${TREND_WORD[trend.direction]}`)} </VisuallyHidden>
      <span>{trend.label}</span>
    </div>
  );
}
```

with

```tsx
{
  trend && <Trend trend={trend} className={styles.trend} />;
}
```

`VisuallyHidden` and `t` are still used by the skeleton, so keep those imports.

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `cd packages/design-system && npx vitest run src/components/DashboardWidget src/publicApi.test.ts`
Expected: PASS, unchanged.
Run (repo root): `npx tsc -p packages/design-system --noEmit && npx eslint packages/design-system/src/components/_internal/Trend.tsx packages/design-system/src/components/DashboardWidget`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/_internal/Trend.tsx packages/design-system/src/components/DashboardWidget/DashboardWidget.tsx
git commit -m "refactor(DashboardWidget): extract shared Trend for reuse by StatTile (#630)"
```

---

### Task 2: StatGroup + StatTile components

**Files:**

- Create: `packages/design-system/src/components/StatGroup/StatGroupContext.ts`
- Create: `packages/design-system/src/components/StatGroup/StatGroup.tsx`
- Create: `packages/design-system/src/components/StatGroup/StatGroup.module.scss`
- Create: `packages/design-system/src/components/StatGroup/StatTile.tsx`
- Create: `packages/design-system/src/components/StatGroup/StatTile.module.scss`
- Create: `packages/design-system/src/components/StatGroup/StatTile.tokens.scss`
- Create: `packages/design-system/src/components/StatGroup/index.ts`
- Create: `packages/design-system/src/components/StatGroup/StatGroup.test.tsx`
- Modify: `packages/design-system/src/i18n/messages.ts`, `en.ts`, `ru.ts` (new `stat` namespace)
- Modify: `packages/design-system/src/index.ts` (exports)

**Interfaces:**

- Consumes: `Trend` from Task 1 (`../_internal/Trend`), `DashboardWidgetTrend` from `../DashboardWidget/DashboardWidget`, `Grid` + `GridGap` from `../Grid`, `Skeleton` from `../Skeleton`, `VisuallyHidden` from `../VisuallyHidden`.
- Produces (public, via `src/index.ts`): `StatGroup`, `StatTile`, types `StatGroupProps`, `StatTileProps`, `StatTrend`.
- i18n keys: `stat.loading` ("Loading…" / "Загрузка…"), `stat.noData` ("No data" / "Нет данных").

- [ ] **Step 1: Add i18n keys**

`messages.ts`, directly after the `dashboardWidget` block:

```ts
stat: {
  /** Visually hidden text in a StatTile's value slot while its StatGroup is `loading` (read when browsing; not a live region). */
  loading: string;
  /** Visually hidden text beside the "—" shown when a StatTile's `value` is null/undefined. */
  noData: string;
}
```

`en.ts` after `dashboardWidget`:

```ts
  stat: {
    loading: 'Loading…',
    noData: 'No data',
  },
```

`ru.ts` after `dashboardWidget`:

```ts
  stat: {
    loading: 'Загрузка…',
    noData: 'Нет данных',
  },
```

- [ ] **Step 2: Write the failing tests** — `StatGroup/StatGroup.test.tsx`

```tsx
import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import { StatGroup, StatTile } from './index';

const UP = { label: '12.4% vs previous period', direction: 'up' } as const;

describe('StatGroup', () => {
  it('renders a list of tiles, forwards ref, merges className, spreads props (Pattern A)', () => {
    const ref = createRef<HTMLUListElement>();
    render(
      <StatGroup ref={ref} aria-label="Key metrics" className="mine" data-x="1">
        <StatTile label="Pipeline value" value="€1.24M" />
        <StatTile label="Open deals" value="48" />
      </StatGroup>,
    );
    const list = screen.getByRole('list', { name: 'Key metrics' });
    expect(ref.current).toBe(list);
    expect(list.tagName).toBe('UL');
    expect(list).toHaveAttribute('role', 'list');
    expect(list).toHaveClass('mine');
    expect(list).toHaveAttribute('data-x', '1');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Pipeline value€1.24M', 'Open deals48']);
  });

  it('clamps the auto-fit min column to the container (default 11rem, custom value)', () => {
    const { rerender } = render(
      <StatGroup aria-label="g">
        <StatTile label="a" value="1" />
      </StatGroup>,
    );
    const list = screen.getByRole('list');
    expect(list.style.getPropertyValue('--grid-columns')).toBe(
      'repeat(auto-fit, minmax(min(11rem, 100%), 1fr))',
    );
    rerender(
      <StatGroup aria-label="g" minColumnWidth="200px">
        <StatTile label="a" value="1" />
      </StatGroup>,
    );
    expect(list.style.getPropertyValue('--grid-columns')).toBe(
      'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
    );
  });

  it('loading: aria-busy, labels and icons kept, value/trend/footnote replaced by skeletons + hidden text', () => {
    render(
      <StatGroup aria-label="g" loading>
        <StatTile
          label="Pipeline value"
          value="€1.24M"
          trend={UP}
          footnote="2 deals excluded"
          icon={<svg data-testid="icon" />}
        />
        <StatTile label="Open deals" value={undefined} />
      </StatGroup>,
    );
    const list = screen.getByRole('list');
    expect(list).toHaveAttribute('aria-busy', 'true');
    const [first, second] = within(list).getAllByRole('listitem');
    expect(first).toHaveTextContent('Pipeline value');
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(first).not.toHaveTextContent('€1.24M');
    expect(first).not.toHaveTextContent('12.4%');
    expect(first).not.toHaveTextContent('2 deals excluded');
    expect(within(first).getByText('Loading…')).toBeInTheDocument();
    // trend skeleton present even when the consumer has no trend yet (no layout jump)
    expect(second.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2);
    expect(within(second).getByText('Loading…')).toBeInTheDocument();
  });

  it('not loading: no aria-busy, no loading text', () => {
    render(
      <StatGroup aria-label="g">
        <StatTile label="a" value="1" />
      </StatGroup>,
    );
    expect(screen.getByRole('list')).not.toHaveAttribute('aria-busy');
    expect(screen.queryByText('Loading…')).toBeNull();
  });
});

describe('StatTile', () => {
  const inGroup = (tile: React.ReactNode) => render(<StatGroup aria-label="g">{tile}</StatGroup>);

  it('reads label, value, trend, footnote in order; forwards ref; merges className', () => {
    const ref = createRef<HTMLLIElement>();
    inGroup(
      <StatTile
        ref={ref}
        className="t"
        label="Pipeline value"
        value="€1.24M"
        trend={UP}
        footnote="2 deals in other currencies not included"
      />,
    );
    const li = screen.getByRole('listitem');
    expect(ref.current).toBe(li);
    expect(li).toHaveClass('t');
    expect(li).toHaveTextContent(
      'Pipeline value€1.24MIncrease 12.4% vs previous period2 deals in other currencies not included',
    );
  });

  it.each([null, undefined])(
    'value=%s → visible dash (aria-hidden) + hidden "No data"',
    (value) => {
      inGroup(<StatTile label="Win rate" value={value} />);
      const li = screen.getByRole('listitem');
      expect(within(li).getByText('—')).toHaveAttribute('aria-hidden', 'true');
      expect(within(li).getByText('No data')).toBeInTheDocument();
    },
  );

  it('value={0} is data, not "no data"', () => {
    inGroup(<StatTile label="Overdue" value={0} />);
    const li = screen.getByRole('listitem');
    expect(li).toHaveTextContent('Overdue0');
    expect(within(li).queryByText('No data')).toBeNull();
  });

  it.each([
    ['up', undefined, 'positive', 'Increase'],
    ['down', undefined, 'negative', 'Decrease'],
    ['flat', undefined, 'neutral', 'No change'],
    ['up', 'negative', 'negative', 'Increase'],
  ] as const)('trend %s / sentiment %s → %s', (direction, sentiment, expected, word) => {
    inGroup(<StatTile label="l" value="1" trend={{ label: 'x', direction, sentiment }} />);
    const trend = screen.getByText('x').closest('[data-sentiment]')!;
    expect(trend).toHaveAttribute('data-sentiment', expected);
    expect(trend).toHaveTextContent(`${word} x`);
  });

  it('renders the icon beside the label and omits empty optional slots', () => {
    inGroup(<StatTile label="Deals" value="3" icon={<svg data-testid="icon" />} />);
    const li = screen.getByRole('listitem');
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(li.querySelector('[data-sentiment]')).toBeNull();
    expect(li).toHaveTextContent(/^Deals3$/);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd packages/design-system && npx vitest run src/components/StatGroup`
Expected: FAIL (cannot resolve `./index`).

- [ ] **Step 4: Implement**

`StatGroupContext.ts`:

```ts
import { createContext } from 'react';

/** Internal: StatGroup's `loading`, read by each StatTile. */
export const StatGroupLoadingContext = createContext(false);
```

`StatGroup.tsx`:

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import clsx from 'clsx';
import { Grid, type GridGap } from '../Grid';
import { StatGroupLoadingContext } from './StatGroupContext';
import styles from './StatGroup.module.scss';

export interface StatGroupProps extends HTMLAttributes<HTMLUListElement> {
  /**
   * Minimum tile width before the grid drops a column (auto-fit). Any CSS length.
   * Clamped to the group's width, so in a cell narrower than one column a single
   * tile shrinks instead of overflowing. Default `'11rem'`.
   */
  minColumnWidth?: string;
  /** Gap between tiles. `xs` (4) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32). */
  gap?: GridGap;
  /**
   * Loading state for every tile: labels and icons stay; each value and trend becomes a
   * skeleton with visually hidden "Loading…" in the value slot, and footnotes hide.
   * Sets `aria-busy` on the list. Deliberately NO live region: a dashboard loads many
   * widgets at once, so announcements would flood screen readers. Default `false`.
   */
  loading?: boolean;
  /** `StatTile` elements. */
  children?: ReactNode;
}

/**
 * Responsive grid of KPI tiles (`StatTile`) with a shared loading state.
 * @see docs/components/StatGroup.md
 */
// {...rest} last (Pattern A) so the consumer's aria-label / data-* / className reach the <ul>.
export const StatGroup = forwardRef<HTMLUListElement, StatGroupProps>(function StatGroup(
  { minColumnWidth = '11rem', gap = 'md', loading = false, className, children, ...rest },
  ref,
) {
  return (
    <StatGroupLoadingContext.Provider value={loading}>
      <Grid
        ref={ref as Ref<HTMLElement>}
        as="ul"
        // role="list": Safari drops list semantics from list-style:none lists.
        role="list"
        minColumnWidth={`min(${minColumnWidth}, 100%)`}
        gap={gap}
        aria-busy={loading || undefined}
        className={clsx(styles.root, className)}
        {...rest}
      >
        {children}
      </Grid>
    </StatGroupLoadingContext.Provider>
  );
});
```

`StatGroup.module.scss`:

```scss
.root {
  list-style: none;
  // stylelint-disable-next-line property-disallowed-list -- native <ul> margin reset
  margin: 0;
  // stylelint-disable-next-line property-disallowed-list -- native <ul> padding reset
  padding: 0;
}
```

(If stylelint does not flag `padding`, drop that disable comment; stylelint's `--report-needless-disables` may reject it. Check `Card.module.scss:185-190` and mirror exactly what lints there.)

`StatTile.tokens.scss`:

```scss
:root {
  --stat-tile-bg: var(--color-bg-muted);
  --stat-tile-radius: var(--radius-md);
  --stat-tile-padding: var(--space-3);
  --stat-tile-gap: var(--space-1);
  --stat-tile-label-gap: var(--space-2);
  --stat-tile-label-size: var(--font-size-md);
  --stat-tile-label-fg: var(--color-fg-muted);
  --stat-tile-value-size: var(--font-size-3xl);
  --stat-tile-value-size-narrow: var(--font-size-2xl);
  --stat-tile-value-weight: var(--font-weight-semibold);
  --stat-tile-value-line-height: var(--line-height-tight);
  --stat-tile-value-fg: var(--color-fg);
  --stat-tile-trend-size: var(--font-size-md);
  --stat-tile-trend-gap: var(--space-1);
  --stat-tile-trend-positive: var(--color-success);
  --stat-tile-trend-negative: var(--color-danger);
  --stat-tile-trend-neutral: var(--color-fg-muted);
  --stat-tile-footnote-size: var(--font-size-sm);
  --stat-tile-footnote-fg: var(--color-fg-muted);
}
```

(`--color-bg-muted`, not `bg-subtle`: `bg-subtle` is `#fafbfc` on a white card, so the fill would be invisible. Footnote uses `fg-muted`: `fg-subtle` on `bg-muted` is about 4.3:1, under AA for 12px text.)

`StatTile.module.scss`:

```scss
@use './StatTile.tokens';

.root {
  // Size container for the narrow rule below. Safe: the Grid track sizes the tile, not its content.
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: var(--stat-tile-gap);
  min-width: 0;
  padding: var(--stat-tile-padding);
  border-radius: var(--stat-tile-radius);
  background: var(--stat-tile-bg);
}

.label {
  display: flex;
  align-items: center;
  gap: var(--stat-tile-label-gap);
  min-width: 0;
  color: var(--stat-tile-label-fg);
  font-size: var(--stat-tile-label-size);
}

.icon {
  display: inline-flex;
  flex-shrink: 0;
}

.value {
  color: var(--stat-tile-value-fg);
  font-size: var(--stat-tile-value-size);
  font-weight: var(--stat-tile-value-weight);
  line-height: var(--stat-tile-value-line-height);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.trend {
  display: flex;
  align-items: center;
  gap: var(--stat-tile-trend-gap);
  font-size: var(--stat-tile-trend-size);
}

.trend[data-sentiment='positive'] {
  color: var(--stat-tile-trend-positive);
}

.trend[data-sentiment='negative'] {
  color: var(--stat-tile-trend-negative);
}

.trend[data-sentiment='neutral'] {
  color: var(--stat-tile-trend-neutral);
}

.footnote {
  color: var(--stat-tile-footnote-fg);
  font-size: var(--stat-tile-footnote-size);
}

// SCSS constant because container-query conditions can't read custom properties.
// ponytail: fixed threshold; make it a prop if a widget needs another.
$narrow-below: 160px;

@container (max-width: #{$narrow-below}) {
  .value {
    font-size: var(--stat-tile-value-size-narrow);
  }

  // Decorative (the consumer's IconTile is aria-hidden by default), so display:none loses nothing.
  .icon {
    display: none;
  }
}
```

`StatTile.tsx`:

```tsx
import { forwardRef, useContext, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Skeleton } from '../Skeleton';
import { VisuallyHidden } from '../VisuallyHidden';
import { Trend } from '../_internal/Trend';
import type { DashboardWidgetTrend } from '../DashboardWidget/DashboardWidget';
import { useTranslation } from '../../i18n/useTranslation';
import { StatGroupLoadingContext } from './StatGroupContext';
import styles from './StatTile.module.scss';

/** Tile trend: same shape as `DashboardWidgetTrend` (`label`, `direction`, optional `sentiment`). */
export type StatTrend = DashboardWidgetTrend;

export interface StatTileProps extends Omit<HTMLAttributes<HTMLLIElement>, 'children'> {
  /** What the number is, e.g. "Pipeline value". Read first by screen readers. */
  label: ReactNode;
  /**
   * The pre-formatted value: an integer, currency or percentage (`"€1.24M"`, `"38%"`).
   * Required so "no data" is explicit: pass `null` (or `undefined`) and the tile shows
   * "—" with visually hidden "No data". `0` is data and renders as `0`.
   */
  value: ReactNode;
  /**
   * Delta under the value, e.g. `{ label: '12.4% vs previous period', direction: 'up' }`.
   * Arrow + hidden "Increase / Decrease / No change"; colour from `sentiment`, which
   * defaults from `direction` (up → positive). Override when up is bad (overdue tasks).
   */
  trend?: StatTrend;
  /** Small muted note under the trend, e.g. "2 deals in other currencies not included". Hidden while loading. */
  footnote?: ReactNode;
  /** Decorative icon before the label, typically `<IconTile size="sm" … />`. Hidden in very narrow tiles. */
  icon?: ReactNode;
}

/**
 * One KPI tile (label, value, trend, footnote) inside a `StatGroup`.
 * @see docs/components/StatTile.md
 */
// {...rest} last (Pattern A) so the consumer can add data-* / handlers to the <li>.
export const StatTile = forwardRef<HTMLLIElement, StatTileProps>(function StatTile(
  { label, value, trend, footnote, icon, className, ...rest },
  ref,
) {
  const t = useTranslation();
  const loading = useContext(StatGroupLoadingContext);

  return (
    <li ref={ref} className={clsx(styles.root, className)} {...rest}>
      <div className={styles.label}>
        {icon != null && <span className={styles.icon}>{icon}</span>}
        <span>{label}</span>
      </div>
      {loading ? (
        <>
          <div className={styles.value}>
            <Skeleton variant="text" width="60%" />
            <VisuallyHidden>{t('stat.loading')}</VisuallyHidden>
          </div>
          {/* Always, even without a trend prop: loading data usually has no trend yet. */}
          <div className={styles.trend}>
            <Skeleton variant="text" width="45%" />
          </div>
        </>
      ) : (
        <>
          <div className={styles.value}>
            {value == null ? (
              <>
                <span aria-hidden="true">—</span>
                <VisuallyHidden>{t('stat.noData')}</VisuallyHidden>
              </>
            ) : (
              value
            )}
          </div>
          {trend && <Trend trend={trend} className={styles.trend} />}
          {footnote != null && <div className={styles.footnote}>{footnote}</div>}
        </>
      )}
    </li>
  );
});
```

`index.ts`:

```ts
export { StatGroup } from './StatGroup';
export type { StatGroupProps } from './StatGroup';
export { StatTile } from './StatTile';
export type { StatTileProps, StatTrend } from './StatTile';
```

`src/index.ts`, directly after the DashboardWidget export block (around line 811):

```ts
export { StatGroup, StatTile } from './components/StatGroup';
export type { StatGroupProps, StatTileProps, StatTrend } from './components/StatGroup';
```

Notes for the implementer:

- Confirm `Skeleton` renders `aria-hidden="true"` (its docs say it is aria-hidden by design). The loading test counts aria-hidden nodes in a tile; if Skeleton marks itself differently, assert on whatever Skeleton actually renders (read `Skeleton.tsx`), keeping the intent: a value skeleton AND a trend skeleton exist.
- If `Grid`'s typings reject `role` / `aria-busy` / `ref`, fix with the narrowest cast. Do not change Grid.
- The `'Pipeline value€1.24M…'` text assertions assume `VisuallyHidden` content counts in `textContent` (it does: it is clipped, not removed).

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/design-system && npx vitest run src/components/StatGroup src/publicApi.test.ts src/components/DashboardWidget`
Expected: PASS.

- [ ] **Step 6: Lint + typecheck**

Run (repo root): `npx tsc -p packages/design-system --noEmit && npx eslint packages/design-system/src/components/StatGroup && npx stylelint "packages/design-system/src/components/StatGroup/*.scss"`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/StatGroup packages/design-system/src/i18n packages/design-system/src/index.ts
git commit -m "feat(StatGroup): StatGroup + StatTile KPI tiles (#630)"
```

---

### Task 3: Docs, AI-PRIMER, manifest

**Files:**

- Create: `packages/design-system/docs/components/StatGroup.md`
- Create: `packages/design-system/docs/components/StatTile.md`
- Modify: `packages/design-system/AI-PRIMER.md` (two index lines after the `DashboardWidget` line, ~line 173)
- Modify: `packages/design-system/src/_meta/manifest.ts` and `packages/design-system/scripts/generate-manifest.mjs` (CLUSTERS, Display, after `DashboardWidget`)
- Regenerated: `packages/design-system/src/components.manifest.json`

Two docs because the props-table generator assigns a `<X>Props` type to the doc whose name is its prefix: `StatTileProps` is not prefixed `StatGroup`, so it needs `StatTile.md` (same split as `Radio.md` / `RadioGroup.md`). The manifest is keyed by component folder, so one `StatGroup` CLUSTERS entry covers both.

- [ ] **Step 1: Write `docs/components/StatGroup.md`**

````markdown
# `<StatGroup>` — responsive grid of KPI tiles

```tsx
<DashboardWidget title="Key metrics">
  <StatGroup aria-label="Key metrics" loading={isLoading}>
    <StatTile
      label="Pipeline value"
      value={formatCurrency(pipeline)}
      trend={{ label: '12.4% vs previous period', direction: 'up' }}
      footnote="2 deals in other currencies not included"
      icon={<IconTile icon={<Euro size={14} />} color="blue" size="sm" />}
    />
    <StatTile label="Win rate" value={winRate ?? null} />
    <StatTile
      label="Overdue tasks"
      value="17"
      trend={{ label: '4 vs previous period', direction: 'up', sentiment: 'negative' }}
    />
  </StatGroup>
</DashboardWidget>
```

TL;DR: a `<ul>` grid of 1–8 [`StatTile`](StatTile.md)s for a dashboard widget that shows several numbers at once. Tiles reflow by available width (`minColumnWidth`, auto-fit). In a cell narrower than one column a single tile shrinks instead of overflowing, and very narrow tiles drop the icon and shrink the value. Put it in `DashboardWidget` `variant="standard"`: its body scrolls if the tiles overflow the cell.

**Loading:** `loading` keeps labels and icons and replaces each value and trend with a skeleton, so the placeholder has the real layout. Each tile's value slot carries visually hidden "Loading…" (read when browsing the tiles), and the list gets `aria-busy`. There is deliberately no live region: a dashboard loads many widgets at once, and per-widget announcements would flood screen readers. Announce "dashboard loaded" once at page level if needed. Footnotes hide while loading (they describe data that is not there yet).

**Accessibility:** give the group a name (`aria-label`, or `aria-labelledby` pointing at the widget title). Screen readers read each tile in DOM order: label, value, trend ("Increase 12.4% vs previous period"), footnote.

<!-- props:start -->
<!-- props:end -->

**When NOT to use:**

- One number per card: use `DashboardWidget variant="kpi"`.
- Key/value facts that are not metrics (owner, stage, created date): use `DefinitionList`.
- A chart or a list of records: use `DashboardWidget variant="chart"` / `"list"`.

#### Anti-patterns

- ❌ Hand-composing `Grid` + `IconTile` + `Text` tiles. You lose the trend semantics, the "no data" text and the loading state.
- ❌ `<StatTile>` outside a `StatGroup`. It renders an `<li>` and reads `loading` from the group.
- ❌ `value="—"` for missing data. Pass `value={null}` so screen readers hear "No data" instead of silence or "em dash".
- ❌ Unformatted values (`value={1240000}`). Format with `Intl.NumberFormat` (or the app's formatter) before passing.
- ❌ Colouring a "bad" increase with `direction: 'down'`. Keep `direction` truthful and set `sentiment: 'negative'`.
- ❌ More than about 8 tiles in one widget. Split into two widgets.
````

- [ ] **Step 2: Write `docs/components/StatTile.md`**

````markdown
# `<StatTile>` — one KPI tile inside a StatGroup

```tsx
<StatGroup aria-label="Sales performance">
  <StatTile
    label="Revenue"
    value="€86,400"
    trend={{ label: '3.1% vs previous period', direction: 'down' }}
  />
</StatGroup>
```

TL;DR: label, large value, optional trend, footnote and icon, on a filled tile. Only valid as a child of [`StatGroup`](StatGroup.md), which owns the grid, the `<ul>` and the loading state. See `StatGroup.md` for loading and accessibility.

- `value={null}` / `undefined` shows "—" with visually hidden "No data". `0` is data and renders as `0`.
- `trend` is the same shape as `DashboardWidgetTrend`. `sentiment` defaults from `direction` (up → positive, down → negative, flat → neutral); override it when up is bad.
- `icon` is decorative and rendered as-is before the label; pass an `IconTile` (`size="sm"`). It hides in very narrow tiles.

<!-- props:start -->
<!-- props:end -->

**When NOT to use:** a single KPI card (`DashboardWidget variant="kpi"`), or a standalone tile outside a group.

#### Anti-patterns

- ❌ Wrapping `StatTile` in another element inside `StatGroup`: the `<li>` must be a direct child of the `<ul>`.
- ❌ Putting interactive controls in a tile. Tiles are read-only; link out from the widget's actions instead.
````

- [ ] **Step 3: AI-PRIMER lines** after the `DashboardWidget` line:

```markdown
- [`StatGroup`](docs/components/StatGroup.md) — responsive grid of KPI tiles for a dashboard widget, with loading skeletons
- [`StatTile`](docs/components/StatTile.md) — one KPI tile (label, value, trend, footnote, icon) inside a StatGroup
```

- [ ] **Step 4: CLUSTERS** in both `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs`, in the Display block after `DashboardWidget: 'Display',`:

```ts
  StatGroup: 'Display',
```

- [ ] **Step 5: Regenerate docs + manifest**

Run: `cd packages/design-system && npm run build:docs && npm run build:manifest`
Expected: `wrote …/StatGroup.md`, `wrote …/StatTile.md`; manifest JSON updated with a `StatGroup` entry. Open both docs and check the props tables list `minColumnWidth`, `gap`, `loading`, `children` / `label`, `value`, `trend`, `footnote`, `icon` with their JSDoc, and that no line contains an issue reference like `(#630)` (the generator's `--check` fails on those).

- [ ] **Step 6: Run the meta tests**

Run: `cd packages/design-system && npx vitest run src/_meta`
Expected: PASS (docs drift + manifest drift).

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/docs/components/StatGroup.md packages/design-system/docs/components/StatTile.md packages/design-system/AI-PRIMER.md packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs packages/design-system/src/components.manifest.json
git commit -m "docs(StatGroup): component docs, primer lines, manifest cluster (#630)"
```

---

### Task 4: Playground demo + wiring

**Files:**

- Create: `packages/playground/src/pages/components/StatGroupDemo.tsx`
- Modify: `packages/playground/src/App.tsx` (import + route)
- Modify: `packages/playground/src/layout/AppShell/navItems.ts` (Display group, after DashboardWidget)
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx` (card after DashboardWidget)
- Modify: `packages/playground/src/pages/components/overviewSchematics.tsx` (`StatGroup` schematic)
- Modify: `packages/playground/src/pages/mockups/registry.ts` (`| 'StatGroup'` after `| 'DashboardWidget'`)

**Interfaces:**

- Consumes: `StatGroup`, `StatTile`, `DashboardWidget`, `IconTile`, `Grid`, `Stack`, `Switch` from `@eocrm/design-system`.

- [ ] **Step 1: Create `StatGroupDemo.tsx`**

```tsx
import { useState } from 'react';
import {
  DashboardWidget,
  Grid,
  IconTile,
  Stack,
  StatGroup,
  StatTile,
  Switch,
} from '@eocrm/design-system';
import { CheckSquare, Euro, Handshake, Percent } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

function Tiles() {
  return (
    <>
      <StatTile
        label="Pipeline value"
        value="€1.24M"
        trend={{ label: '12.4% vs previous period', direction: 'up' }}
        footnote="2 deals in other currencies not included"
        icon={<IconTile icon={<Euro size={14} />} color="blue" size="sm" />}
      />
      <StatTile
        label="Win rate"
        value={null}
        footnote="No closed deals yet"
        icon={<IconTile icon={<Percent size={14} />} color="green" size="sm" />}
      />
      <StatTile
        label="Overdue tasks"
        value="17"
        trend={{ label: '4 vs previous period', direction: 'up', sentiment: 'negative' }}
        icon={<IconTile icon={<CheckSquare size={14} />} color="red" size="sm" />}
      />
      <StatTile
        label="Open deals"
        value="48"
        trend={{ label: 'vs previous period', direction: 'flat' }}
        icon={<IconTile icon={<Handshake size={14} />} color="purple" size="sm" />}
      />
    </>
  );
}

export function StatGroupDemo() {
  const [loading, setLoading] = useState(false);

  return (
    <DemoLayout
      name="StatGroup"
      componentName="StatGroup"
      description="Responsive grid of KPI tiles (StatTile: label, value, trend, footnote, icon) for a dashboard widget that shows several numbers at once. Reflows by width; loading keeps the labels and skeletons the numbers."
      files={getComponentFiles('StatGroup')}
    >
      <Example
        title="In a dashboard widget"
        description="Four tiles in a standard DashboardWidget. Win rate has no data (value={null} → “—” + hidden “No data”). Overdue tasks going up is bad, so sentiment overrides direction. Toggle Loading for the skeleton."
        code={`<DashboardWidget title="Key metrics">
  <StatGroup aria-label="Key metrics" loading={loading}>
    <StatTile
      label="Pipeline value"
      value="€1.24M"
      trend={{ label: '12.4% vs previous period', direction: 'up' }}
      footnote="2 deals in other currencies not included"
      icon={<IconTile icon={<Euro size={14} />} color="blue" size="sm" />}
    />
    <StatTile label="Win rate" value={null} footnote="No closed deals yet" />
    <StatTile
      label="Overdue tasks"
      value="17"
      trend={{ label: '4 vs previous period', direction: 'up', sentiment: 'negative' }}
    />
    <StatTile label="Open deals" value="48" trend={{ label: 'vs previous period', direction: 'flat' }} />
  </StatGroup>
</DashboardWidget>`}
      >
        <Stack gap="md">
          <Switch checked={loading} onChange={setLoading}>
            Loading
          </Switch>
          <div style={{ height: 300 }}>
            <DashboardWidget title="Key metrics">
              <StatGroup aria-label="Key metrics" loading={loading}>
                <Tiles />
              </StatGroup>
            </DashboardWidget>
          </div>
        </Stack>
      </Example>

      <Example
        title="Narrow cells"
        description="The same tiles in 320px and 200px cells: one column, and the 200px cell is narrower than minColumnWidth, so the tile shrinks instead of overflowing. Below ~160px of tile width the icon hides and the value steps down a size."
        code={`<div style={{ width: 200, height: 420 }}>
  <DashboardWidget title="Key metrics">
    <StatGroup aria-label="Key metrics">…</StatGroup>
  </DashboardWidget>
</div>`}
      >
        <Grid minColumnWidth="200px" gap="md">
          <div style={{ width: 320, height: 420 }}>
            <DashboardWidget title="Key metrics">
              <StatGroup aria-label="Key metrics (320px)">
                <Tiles />
              </StatGroup>
            </DashboardWidget>
          </div>
          <div style={{ width: 200, height: 420 }}>
            <DashboardWidget title="Key metrics">
              <StatGroup aria-label="Key metrics (200px)">
                <Tiles />
              </StatGroup>
            </DashboardWidget>
          </div>
        </Grid>
      </Example>
    </DemoLayout>
  );
}
```

(Check `IconTile`'s `color` accepts `blue`, `green`, `red`, `purple`: read `PaletteColor` in `packages/design-system/src/palette`. Swap in valid names if any are missing. Check the lucide icons exist in the installed lucide-react version: `Euro`, `Percent`, `CheckSquare`, `Handshake`.)

- [ ] **Step 2: Wire it in**

`App.tsx`: next to the `DashboardWidgetDemo` import (~line 69):

```tsx
import { StatGroupDemo } from './pages/components/StatGroupDemo';
```

and after the dashboard-widget route (~line 207):

```tsx
<Route path="/components/stat-group" element={<StatGroupDemo />} />
```

`navItems.ts`: after the DashboardWidget entry (~line 274), using an already-imported icon if one fits. Otherwise add `Gauge` to the lucide import:

```ts
      { to: '/components/stat-group', label: 'StatGroup', icon: Gauge, end: false },
```

`ComponentsIndex.tsx`: after the DashboardWidget card (~line 303):

```tsx
  {
    to: '/components/stat-group',
    name: 'StatGroup',
    description: 'Responsive grid of KPI tiles: value, label, trend and footnote, with loading skeletons.',
    preview: SCHEMATICS['StatGroup'],
  },
```

`overviewSchematics.tsx`: after the `DashboardWidget` schematic (~line 1473). Four tinted tiles, exactly one solid-accent focal element:

```tsx
  StatGroup: (
    <Row gap={6}>
      {[0, 1, 2].map((i) => (
        <Box key={i} w={44} h={44} style={{ padding: 6 }}>
          <Col gap={5}>
            <Bar w={24} />
            {i === 0 ? <Solid w={28} h={10} /> : <Bar w={28} />}
            <Bar w={18} />
          </Col>
        </Box>
      ))}
    </Row>
  ),
```

(Read the top of `overviewSchematics.tsx` to confirm `Box`, `Bar`, `Solid`, `Row`, `Col` and their props; adjust to the real primitive signatures.)

`registry.ts`: add `| 'StatGroup'` after `| 'DashboardWidget'`.

- [ ] **Step 3: Typecheck + lint the playground**

Run (repo root): `make lint`
Expected: no errors.

- [ ] **Step 4: Visual check (Review Focus 1)**

Start the playground on port 8090+ (never the default port): `npm run dev --workspace packages/playground -- --port 8091`. Open `/components/stat-group` with Playwright at 1280px and in dark mode. Check:

- Tiles are filled, value 29px, trend 14px in green / red / muted.
- The 200px cell has no horizontal overflow (`document.querySelectorAll('[aria-label^="Key metrics (200"] li')` each have `scrollWidth <= clientWidth`), and the icon is hidden there.
- Loading shows the labels plus skeleton bars and no footnotes.

Kill the dev server and the Playwright Chrome afterwards.

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src
git commit -m "feat(playground): StatGroup demo (#630)"
```

---

### Task 5: Full gate

- [ ] **Step 1: Run every gate from the repo root, reading exit codes**

```bash
cd /home/dpws/projects/design-system
make test && make build-lib && make lint && npm run format:check && echo GATES-OK
npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'
```

Expected: `GATES-OK`; the grep count is `0`. If `format:check` fails, run `npx prettier --write` on the listed files and commit `style: prettier`.
