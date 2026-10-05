# Dashboard widget gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `WidgetPreview`, `CatalogPicker` and `DashboardWidget` (#613) in `@eocrm/design-system`, with a shared internal widget-shape set reused for previews and loading skeletons.

**Architecture:** An internal `WidgetShape` (built from `<Skeleton>` pieces) renders each widget kind in `preview` mode (static, accent hero) or `loading` mode (pulsing, neutral, fills its box). `WidgetPreview` wraps it in a decorative 16:10 box. `CatalogPicker` is an overlay-free surface (search + native-radio category pills + roving-tabindex listbox grid). `DashboardWidget` composes `Card fill` per variant and renders `WidgetShape mode="loading"` when `loading`.

**Tech Stack:** React 19 + TypeScript, CSS Modules (SCSS, tokens only), Vitest + Testing Library (globals), lucide-react icons, npm workspaces.

**Spec:** `docs/superpowers/specs/2026-10-05-dashboard-widget-gallery-design.md` — read it before starting any task.

## Global Constraints

- Branch: `feat/batch-611-613` (already checked out; never create another branch).
- Run vitest from `packages/design-system` (`npx vitest run <path>`); there is no root vitest config. `format:check` / `lint:css` run from the repo ROOT.
- Hard rules in `packages/design-system/CLAUDE.md` apply: tokens only in `.module.scss` (no raw colours/spacing/radii); components own no outer layout (no margin, no `align-self`, no `flex: 1` on the ROOT); `forwardRef` + spread HTML attrs; every user-facing string through `useTranslation()` with keys in `src/i18n/messages.ts`, `en.ts` AND `ru.ts`; JSDoc on every exported prop/type; component JSDoc = one-line summary + `@see docs/components/<Name>.md`; `:focus-visible` not `:focus`.
- Tests use vitest globals (no `describe/it/expect/vi` imports).
- No new dependencies. Icons from `lucide-react` (already a dependency).
- Component tokens live in `<Name>.tokens.scss` inside `:root { … }` and are `@use`d from the module (`@use './<Name>.tokens';`), as `MediaTile.module.scss` does. Do not edit `src/styles/tokens.scss` or generated token files.
- Every new component gets a `CLUSTERS` entry in BOTH `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs` (cluster `'Display'` for WidgetPreview and DashboardWidget, `'Forms'` for CatalogPicker), then `npm run build:manifest` from `packages/design-system`.
- Commit messages: plain, conventional (`feat(WidgetPreview): …`), NO `Co-Authored-By`, NO session links, NO "Generated with" footer.
- Do not push. Do not open a PR.

## Review Focus

1. **Search with surrounding whitespace / mixed case / Cyrillic** (`"  Сделки "` matching `"Сделки по этапам"`) — expected to match via `trim()` + `toLocaleLowerCase()`. Test in Task 2.
2. **Every item unavailable, or the roving target filtered away** — the listbox must still have exactly one `tabIndex=0` option (unavailable options stay focusable) and the target must reset to a visible item. Test in Task 2.
3. **Category pill selected, then the search narrows to zero** — empty state shown, status says 0, and clearing the search restores results within the same category. Test in Task 2.
4. **`DashboardWidget variant="kpi" loading` with `value` and `trend` passed** — the value/trend must NOT render (no stale numbers next to a skeleton); title and actions stay. Test in Task 3.
5. **Consumer passes `aria-hidden={false}` or a `className` to `WidgetPreview`** — must stay `aria-hidden="true"` while merging the className. Test in Task 1.

---

### Task 1: Shared widget shapes + `WidgetPreview`

**Files:**

- Create: `packages/design-system/src/components/WidgetPreview/WidgetShape.tsx` (internal; NOT exported from `src/index.ts`)
- Create: `packages/design-system/src/components/WidgetPreview/WidgetShape.module.scss`
- Create: `packages/design-system/src/components/WidgetPreview/WidgetPreview.tsx`
- Create: `packages/design-system/src/components/WidgetPreview/WidgetPreview.module.scss`
- Create: `packages/design-system/src/components/WidgetPreview/WidgetPreview.tokens.scss`
- Create: `packages/design-system/src/components/WidgetPreview/WidgetPreview.test.tsx`
- Create: `packages/design-system/src/components/WidgetPreview/index.ts`
- Modify: `packages/design-system/src/index.ts` (append exports)
- Modify: `packages/design-system/src/_meta/manifest.ts` + `packages/design-system/scripts/generate-manifest.mjs` (CLUSTERS `WidgetPreview: 'Display'`, next to `MediaTile`)
- Regenerate: `packages/design-system/src/components.manifest.json` (`npm run build:manifest`)

**Interfaces:**

- Produces: `WidgetShape({ kind, mode }: { kind: WidgetShapeKind; mode: WidgetShapeMode })` from `../WidgetPreview/WidgetShape`, with `export type WidgetShapeKind = 'kpi' | 'list' | 'chart' | 'pipeline' | 'activity' | 'lines'` and `export type WidgetShapeMode = 'preview' | 'loading'`. Root element carries `data-widget-shape={kind}` and `data-mode={mode}`; accent pieces carry `data-hero=""` (preview mode only).
- Produces: `WidgetPreview` (forwardRef `<div>`), `WidgetPreviewProps`, `WidgetPreviewVariant = 'kpi' | 'list' | 'chart' | 'pipeline' | 'activity'`.

- [ ] **Step 1: Write the failing tests**

`WidgetPreview.test.tsx`:

```tsx
import { createRef } from 'react';
import { render } from '@testing-library/react';
import { WidgetPreview, type WidgetPreviewVariant } from './WidgetPreview';
import { WidgetShape } from './WidgetShape';

const VARIANTS: WidgetPreviewVariant[] = ['kpi', 'list', 'chart', 'pipeline', 'activity'];

describe('WidgetPreview', () => {
  it.each(VARIANTS)('renders the %s shape in preview mode', (variant) => {
    const { container } = render(<WidgetPreview variant={variant} />);
    const shape = container.querySelector(`[data-widget-shape="${variant}"]`)!;
    expect(shape).toBeInTheDocument();
    expect(shape).toHaveAttribute('data-mode', 'preview');
    // Every variant has at least one accent "hero" piece.
    expect(shape.querySelector('[data-hero]')).not.toBeNull();
  });

  it('is aria-hidden even when the consumer passes aria-hidden={false}', () => {
    const { container } = render(<WidgetPreview variant="kpi" aria-hidden={false} />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('forwards ref and merges className + spreads attributes', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <WidgetPreview ref={ref} variant="chart" className="mine" data-testid="p" />,
    );
    const root = container.firstChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.className).toMatch(/mine/);
    expect(root.className).toMatch(/root/);
    expect(root).toHaveAttribute('data-testid', 'p');
  });

  it('preview pieces are static (no pulse)', () => {
    const { container } = render(<WidgetPreview variant="list" />);
    container.querySelectorAll('[data-widget-shape] span').forEach((el) => {
      expect(el.className).not.toMatch(/pulse/);
    });
  });
});

describe('WidgetShape', () => {
  it.each(['kpi', 'list', 'chart', 'pipeline', 'activity', 'lines'] as const)(
    'loading mode for %s has no accent pieces and pulses',
    (kind) => {
      const { container } = render(<WidgetShape kind={kind} mode="loading" />);
      const shape = container.querySelector(`[data-widget-shape="${kind}"]`)!;
      expect(shape).toHaveAttribute('data-mode', 'loading');
      expect(shape.querySelector('[data-hero]')).toBeNull();
      expect(shape.querySelector('[class*="pulse"]')).not.toBeNull();
    },
  );

  it('is aria-hidden', () => {
    const { container } = render(<WidgetShape kind="lines" mode="loading" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
```

Before writing the pulse assertions, open `src/components/Skeleton/Skeleton.tsx` + `Skeleton.module.scss` and confirm the class name the `animation="pulse"` variant applies (the test matches `/pulse/`). If it is named differently, adjust BOTH pulse assertions to that class name.

- [ ] **Step 2: Run tests to verify they fail**

Run (from `packages/design-system`): `npx vitest run src/components/WidgetPreview`
Expected: FAIL — cannot resolve `./WidgetPreview` / `./WidgetShape`.

- [ ] **Step 3: Implement `WidgetShape`**

`WidgetShape.tsx`:

```tsx
import clsx from 'clsx';
import { Skeleton } from '../Skeleton';
import styles from './WidgetShape.module.scss';

/** Internal: which widget silhouette to draw. `lines` = generic text lines (standard widget loading). */
export type WidgetShapeKind = 'kpi' | 'list' | 'chart' | 'pipeline' | 'activity' | 'lines';
/** Internal: `preview` = static + accent hero (WidgetPreview); `loading` = pulsing, neutral, fills its box. */
export type WidgetShapeMode = 'preview' | 'loading';

// Loading mode repeats rows to fill a tall cell; the root clips the overflow.
const LOADING_ROWS = 12;
const PREVIEW_ROWS = 4;
const BAR_HEIGHTS = ['40%', '65%', '50%', '85%', '70%', '55%'];
const PIPELINE_CARDS = [3, 2, 1];

/**
 * Internal widget silhouette shared by WidgetPreview (preview) and DashboardWidget (loading).
 * Built only from Skeleton pieces; sizes are relative so it scales with its box.
 */
export function WidgetShape({ kind, mode }: { kind: WidgetShapeKind; mode: WidgetShapeMode }) {
  const preview = mode === 'preview';
  const animation = preview ? 'none' : 'pulse';
  // `hero` marks the accent piece(s) — preview mode only, so a loading
  // skeleton never looks like real data.
  const hero = (on: boolean) => (preview && on ? { 'data-hero': '' } : {});
  const piece = (
    cls: string,
    on = false,
    variant: 'text' | 'circular' | 'rectangular' = 'rectangular',
  ) => (
    <Skeleton
      variant={variant}
      animation={animation}
      className={clsx(styles.piece, cls, preview && on && styles.hero)}
      {...hero(on)}
    />
  );
  const rows = preview ? PREVIEW_ROWS : LOADING_ROWS;

  let body;
  switch (kind) {
    case 'kpi':
      body = (
        <div className={styles.kpi}>
          {piece(styles.kpiLabel)}
          {piece(styles.kpiValue, true)}
          {piece(styles.kpiTrend)}
        </div>
      );
      break;
    case 'list':
    case 'activity':
      body = (
        <div className={styles.rows}>
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className={styles.row}>
              {piece(
                kind === 'list' ? styles.avatar : styles.dot,
                kind === 'activity' || i === 0,
                'circular',
              )}
              {piece(clsx(styles.line, i % 3 === 2 && styles.lineShort))}
            </div>
          ))}
        </div>
      );
      break;
    case 'chart':
      body = (
        <div className={styles.chart}>
          {BAR_HEIGHTS.map((h, i) => (
            <div key={i} className={styles.barSlot}>
              {/* height is data-free decoration, set inline so the bars differ */}
              <Skeleton
                variant="rectangular"
                animation={animation}
                className={clsx(
                  styles.piece,
                  styles.bar,
                  preview && styles.hero,
                  preview && i === 3 && styles.heroStrong,
                )}
                style={{ height: h }}
                {...hero(true)}
              />
            </div>
          ))}
        </div>
      );
      break;
    case 'pipeline':
      body = (
        <div className={styles.pipeline}>
          {PIPELINE_CARDS.map((n, col) => (
            <div key={col} className={styles.column}>
              <Skeleton
                variant="rectangular"
                animation={animation}
                className={clsx(
                  styles.piece,
                  styles.stage,
                  preview && col < 2 && styles.hero,
                  preview && col === 0 && styles.heroStrong,
                )}
                {...hero(col < 2)}
              />
              {Array.from({ length: n }, (_, i) => piece(styles.dealCard, false))}
            </div>
          ))}
        </div>
      );
      break;
    default: // 'lines'
      body = (
        <div className={styles.rows}>
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className={styles.row}>
              {piece(clsx(styles.line, i % 3 === 2 && styles.lineShort), false, 'text')}
            </div>
          ))}
        </div>
      );
  }

  return (
    <div className={styles.root} data-widget-shape={kind} data-mode={mode} aria-hidden="true">
      {body}
    </div>
  );
}
```

Fix the `pipeline` deal-card map to pass a `key`: wrap as `Array.from({ length: n }, (_, i) => <Fragment key={i}>{piece(styles.dealCard)}</Fragment>)` (import `Fragment` from `react`); same for any other mapped `piece(...)` call without a keyed wrapper. Run Prettier afterwards (`npx prettier --write` from the repo root) — the snippets above are not formatted.

`WidgetShape.module.scss` (tokens only; sizes are relative; this is the component's own internal layout):

```scss
@use './WidgetPreview.tokens';

.root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

// Skeleton's own --skeleton-bg is the muted surface; previews sit ON a muted
// box, so preview shapes take the darker shape colour instead.
.root[data-mode='preview'] .piece {
  --skeleton-bg: var(--widget-preview-shape);
}

.piece {
  display: block;
}

.hero {
  --skeleton-bg: var(--widget-preview-accent);
}

.heroStrong {
  --skeleton-bg: var(--widget-preview-accent-strong);
}

.kpi {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--widget-shape-gap);
  height: 100%;
}

.kpiLabel {
  width: 40%;
  height: var(--widget-shape-line);
}

.kpiValue {
  width: 60%;
  height: var(--widget-shape-value);
}

.kpiTrend {
  width: 30%;
  height: var(--widget-shape-line);
}

.rows {
  display: flex;
  flex-direction: column;
  gap: var(--widget-shape-gap);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--widget-shape-gap);
}

.avatar {
  flex: none;
  width: var(--widget-shape-avatar);
  height: var(--widget-shape-avatar);
}

.dot {
  flex: none;
  width: var(--widget-shape-dot);
  height: var(--widget-shape-dot);
}

.line {
  flex: 1;
  height: var(--widget-shape-line);
}

.lineShort {
  flex: 0 1 60%;
}

.chart {
  display: flex;
  align-items: flex-end;
  gap: var(--widget-shape-gap);
  height: 100%;
}

.barSlot {
  display: flex;
  flex: 1;
  align-items: flex-end;
  height: 100%;
}

.bar {
  width: 100%;
}

.pipeline {
  display: flex;
  gap: var(--widget-shape-gap);
  height: 100%;
}

.column {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--widget-shape-gap);
}

.stage {
  height: var(--widget-shape-line);
}

.dealCard {
  height: var(--widget-shape-card);
}
```

If stylelint rejects any declaration here (run `npx stylelint packages/design-system/src/components/WidgetPreview/*.scss` from the repo root), fix it the way existing modules do (e.g. `MediaTile.module.scss`), never by adding raw values.

- [ ] **Step 4: Implement `WidgetPreview`**

`WidgetPreview.tokens.scss`:

```scss
:root {
  // Decorative miniature of a widget kind (CatalogPicker previews).
  --widget-preview-bg: var(--color-bg-subtle);
  --widget-preview-radius: var(--radius-md);
  --widget-preview-padding: var(--space-3);
  --widget-preview-aspect: 16 / 10;

  // Shape pieces on the preview box, and the one accent "hero" per kind.
  --widget-preview-shape: var(--color-bg-muted);
  --widget-preview-accent: var(--color-accent-bg-subtle);
  --widget-preview-accent-strong: var(--color-accent);

  // Shared by preview and loading shapes.
  --widget-shape-gap: var(--space-2);
  --widget-shape-line: var(--space-2);
  --widget-shape-value: var(--space-6);
  --widget-shape-avatar: var(--space-4);
  --widget-shape-dot: var(--space-2);
  --widget-shape-card: var(--space-5);
}
```

Then check the result in both themes in the playground in Task 5; if `--color-bg-subtle` vs `--color-bg-muted` is too faint, switch `--widget-preview-shape` to `var(--color-border)` — tokens only.

`WidgetPreview.module.scss`:

```scss
@use './WidgetPreview.tokens';

.root {
  display: block;
  width: 100%;
  aspect-ratio: var(--widget-preview-aspect);
  padding: var(--widget-preview-padding);
  overflow: hidden;
  background: var(--widget-preview-bg);
  border-radius: var(--widget-preview-radius);
}
```

`WidgetPreview.tsx`:

```tsx
import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { WidgetShape } from './WidgetShape';
import styles from './WidgetPreview.module.scss';

/** Widget kind depicted by a WidgetPreview. */
export type WidgetPreviewVariant = 'kpi' | 'list' | 'chart' | 'pipeline' | 'activity';

export interface WidgetPreviewProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Which widget kind the miniature depicts. Required.
   * - `'kpi'` — label, a large value block (accent), a trend line.
   * - `'list'` — rows of avatar + line; first avatar accented.
   * - `'chart'` — a bar series (accented, one bar strong).
   * - `'pipeline'` — stage columns of cards; current stage header strong.
   * - `'activity'` — timeline rows with accented dots.
   */
  variant: WidgetPreviewVariant;
}

/**
 * Decorative, data-free miniature of a dashboard widget kind (for CatalogPicker items).
 * @see docs/components/WidgetPreview.md
 */
// {...rest} FIRST so aria-hidden always wins (Pattern B): the surrounding card names the item.
export const WidgetPreview = forwardRef<HTMLDivElement, WidgetPreviewProps>(function WidgetPreview(
  { variant, className, ...rest },
  ref,
) {
  return (
    <div {...rest} ref={ref} aria-hidden="true" className={clsx(styles.root, className)}>
      <WidgetShape kind={variant} mode="preview" />
    </div>
  );
});
```

`index.ts`:

```ts
export { WidgetPreview } from './WidgetPreview';
export type { WidgetPreviewProps, WidgetPreviewVariant } from './WidgetPreview';
```

Append to `src/index.ts` (after the `StagePath` exports):

```ts
export { WidgetPreview } from './components/WidgetPreview';
export type { WidgetPreviewProps, WidgetPreviewVariant } from './components/WidgetPreview';
```

- [ ] **Step 5: Manifest**

Add `WidgetPreview: 'Display',` under `MediaTile: 'Display',` in BOTH `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs`. Run from `packages/design-system`: `npm run build:manifest`.

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/components/WidgetPreview src/_meta` → PASS. Then `npx tsc --noEmit -p .` → no errors. If `src/structure.test.ts` has gates requiring a docs file / demo for every component directory, they will fail until Tasks 4–5 — run `npx vitest run src/structure.test.ts` and record which assertions fail and why in your report; do not stub docs to silence them.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/WidgetPreview packages/design-system/src/index.ts packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs packages/design-system/src/components.manifest.json
git commit -m "feat(WidgetPreview): decorative widget-kind previews over a shared shape set (#613)"
```

---

### Task 2: `CatalogPicker`

**Files:**

- Create: `packages/design-system/src/components/CatalogPicker/CatalogPicker.tsx`
- Create: `packages/design-system/src/components/CatalogPicker/CatalogPicker.module.scss`
- Create: `packages/design-system/src/components/CatalogPicker/CatalogPicker.tokens.scss`
- Create: `packages/design-system/src/components/CatalogPicker/CatalogPicker.test.tsx`
- Create: `packages/design-system/src/components/CatalogPicker/index.ts`
- Modify: `packages/design-system/src/i18n/messages.ts`, `en.ts`, `ru.ts` (new `catalogPicker` section; place it alphabetically like neighbours)
- Modify: `packages/design-system/src/index.ts`, `src/_meta/manifest.ts`, `scripts/generate-manifest.mjs` (`CatalogPicker: 'Forms'`), regenerate `src/components.manifest.json`

**Interfaces:**

- Consumes: `Input` (`../Input`), `EmptyState` (`../EmptyState`), `useTranslation` (`../../i18n/useTranslation`), `ruPlural` (`./format` in ru.ts).
- Produces: `CatalogPicker`, `CatalogPickerProps`, `CatalogPickerItem`, `CatalogPickerCategory` exactly as in spec §3.

- [ ] **Step 1: i18n keys**

`messages.ts` (new section, JSDoc on every key):

```ts
catalogPicker: {
  /** Placeholder + aria-label of the catalog search input. */
  search: string;
  /** Accessible name of the category pill group. */
  categories: string;
  /** Label of the first category pill that shows every item. */
  all: string;
  /** Function leaf — visible + announced result count ("12 results"). */
  resultCount: (params: { count: number }) => string;
  /** Empty-state title when search/category match nothing. */
  noMatches: string;
}
```

`en.ts`:

```ts
  catalogPicker: {
    search: 'Search…',
    categories: 'Categories',
    all: 'All',
    resultCount: ({ count }) => `${count as number} ${(count as number) === 1 ? 'result' : 'results'}`,
    noMatches: 'No matches',
  },
```

`ru.ts`:

```ts
  catalogPicker: {
    search: 'Поиск…',
    categories: 'Категории',
    all: 'Все',
    resultCount: ({ count }) =>
      `${count as number} ${ruPlural(count as number, ['результат', 'результата', 'результатов'])}`,
    noMatches: 'Ничего не найдено',
  },
```

- [ ] **Step 2: Write the failing tests**

`CatalogPicker.test.tsx`:

```tsx
import { createRef } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatalogPicker, type CatalogPickerItem, type CatalogPickerProps } from './CatalogPicker';

const ITEMS: CatalogPickerItem[] = [
  {
    id: 'deals',
    title: 'Open deals',
    description: 'Deals by owner',
    category: 'sales',
    tags: ['pipeline'],
    preview: <div data-testid="pv-deals" />,
  },
  {
    id: 'revenue',
    title: 'Revenue trend',
    description: 'Monthly revenue',
    category: 'sales',
    badge: <span>New</span>,
  },
  {
    id: 'tasks',
    title: 'Tasks due',
    description: 'Your tasks this week',
    category: 'work',
    disabledReason: 'Already on dashboard',
  },
  { id: 'ru', title: 'Сделки по этапам', category: 'sales' },
];
const CATS = [
  { id: 'sales', label: 'Sales' },
  { id: 'work', label: 'Work' },
];

function setup(props: Partial<CatalogPickerProps> = {}) {
  const onSelect = vi.fn();
  const utils = render(
    <CatalogPicker
      label="Widget catalog"
      items={ITEMS}
      categories={CATS}
      onSelect={onSelect}
      {...props}
    />,
  );
  const listbox = () => screen.getByRole('listbox', { name: 'Widget catalog' });
  const options = () => within(listbox()).getAllByRole('option');
  const search = () => screen.getByRole('searchbox');
  const status = () => screen.getByRole('status');
  return { ...utils, onSelect, listbox, options, search, status };
}

describe('CatalogPicker', () => {
  it('renders every item as an option with preview + badge, and the count', () => {
    const { options, status } = setup();
    expect(options()).toHaveLength(4);
    expect(screen.getByTestId('pv-deals')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(status()).toHaveTextContent('4 results');
  });

  it('names each option by its title and describes it by description + reason', () => {
    const { options } = setup();
    const tasks = options()[2];
    expect(tasks).toHaveAccessibleName('Tasks due');
    expect(tasks).toHaveAccessibleDescription('Your tasks this week Already on dashboard');
    expect(tasks).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Already on dashboard')).toBeVisible();
  });

  it('searches title, description and tags, case-insensitively, trimming whitespace', async () => {
    const { search, options, status } = setup();
    await userEvent.type(search(), '  MONTHLY ');
    expect(options().map((o) => o.textContent)).toEqual([expect.stringContaining('Revenue trend')]);
    await userEvent.clear(search());
    await userEvent.type(search(), 'pipeline');
    expect(options()).toHaveLength(1);
    expect(status()).toHaveTextContent('1 result');
  });

  it('matches Cyrillic case-insensitively', async () => {
    const { search, options } = setup();
    await userEvent.type(search(), '  сДЕЛКИ ');
    expect(options()).toHaveLength(1);
    expect(options()[0]).toHaveAccessibleName('Сделки по этапам');
  });

  it('filters by category; All restores everything', async () => {
    const { options } = setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Work' }));
    expect(options()).toHaveLength(1);
    await userEvent.click(screen.getByRole('radio', { name: 'All' }));
    expect(options()).toHaveLength(4);
    expect(screen.getByRole('radiogroup', { name: 'Categories' })).toBeInTheDocument();
  });

  it('category + zero-match search shows the empty state and 0 count; clearing restores the category results', async () => {
    const { search, status } = setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Sales' }));
    await userEvent.type(search(), 'zzz');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('heading', { name: 'No matches' })).toBeInTheDocument();
    expect(status()).toHaveTextContent('0 results');
    await userEvent.clear(search());
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(3);
  });

  it('renders no pills without categories', () => {
    setup({ categories: undefined });
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('click, Enter and Space select an available item', async () => {
    const { options, onSelect } = setup();
    await userEvent.click(options()[0]);
    expect(onSelect).toHaveBeenLastCalledWith('deals');
    options()[1].focus();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('revenue');
    await userEvent.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(3);
  });

  it('does nothing for an unavailable item', async () => {
    const { options, onSelect } = setup();
    await userEvent.click(options()[2]);
    options()[2].focus();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('has exactly one tab stop in the listbox, even when every item is unavailable', () => {
    const all = ITEMS.map((i) => ({ ...i, disabledReason: 'No access' }));
    const { options } = setup({ items: all });
    expect(options().filter((o) => o.tabIndex === 0)).toHaveLength(1);
  });

  it('ArrowDown from search focuses the first option; arrows/Home/End move by 1 and by row', async () => {
    const { search, options, listbox } = setup();
    listbox().style.gridTemplateColumns = '100px 100px'; // 2 columns (jsdom has no layout)
    search().focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(options()[0]).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(options()[1]).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(options()[3]).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(options()[2]).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(options()[0]).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(options()[3]).toHaveFocus();
    expect(options()[3].tabIndex).toBe(0);
    expect(options().filter((o) => o.tabIndex === 0)).toHaveLength(1);
  });

  it('ArrowUp from the first row returns focus to search', async () => {
    const { search, options, listbox } = setup();
    listbox().style.gridTemplateColumns = '100px 100px';
    options()[1].focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(search()).toHaveFocus();
  });

  it('resets the roving target to the first result when the filter changes', async () => {
    const { search, options } = setup();
    fireEvent.keyDown(options()[0], { key: 'End' }); // target → last option
    expect(options()[3].tabIndex).toBe(0);
    await userEvent.click(screen.getByRole('radio', { name: 'Sales' })); // 3 results
    expect(options()[0].tabIndex).toBe(0);
    expect(options().filter((o) => o.tabIndex === 0)).toHaveLength(1);
    await userEvent.type(search(), 'revenue'); // 1 result
    expect(options()[0].tabIndex).toBe(0);
  });

  it('forwards ref to the root and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = setup({ ref, className: 'mine' } as Partial<CatalogPickerProps>);
    expect(ref.current).toBe(container.firstChild);
    expect((container.firstChild as HTMLElement).className).toMatch(/mine/);
  });
});
```

Note on the `searchbox` role: `<Input type="search">` exposes role `searchbox`. Confirm `Input` passes `type` through (it spreads input attrs).

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/components/CatalogPicker` → FAIL (module not found).

- [ ] **Step 4: Implement**

`CatalogPicker.tsx`:

```tsx
import {
  forwardRef,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { Search } from 'lucide-react';
import { Input } from '../Input';
import { EmptyState } from '../EmptyState';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './CatalogPicker.module.scss';

/** One selectable entry in a CatalogPicker. */
export interface CatalogPickerItem {
  /** Stable id passed to `onSelect`. Unique within `items`. */
  id: string;
  /** Visible title and the option's accessible name. Searched. */
  title: string;
  /** Optional muted description (clamped to 2 lines). Searched; also the option's description. */
  description?: string;
  /** Category id (matches a `CatalogPickerCategory.id`) used by the pill filter. */
  category?: string;
  /** Extra search terms (not rendered). */
  tags?: string[];
  /** Optional badge node (e.g. `<Badge>New</Badge>`) shown on the card. */
  badge?: ReactNode;
  /** Optional preview node shown at the top of the card — typically `<WidgetPreview variant>`. */
  preview?: ReactNode;
  /**
   * Marks the item unavailable (e.g. "Already on dashboard", "No permission"). It stays
   * visible and focusable but dimmed, `aria-disabled`, and `onSelect` is not called; the
   * reason is shown as text and added to the option's description.
   */
  disabledReason?: string;
}

/** A category pill. */
export interface CatalogPickerCategory {
  /** Matches `CatalogPickerItem.category`. */
  id: string;
  /** Visible pill label. */
  label: string;
}

export interface CatalogPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** The catalog. Rendered in the given order. */
  items: CatalogPickerItem[];
  /** Category pills (after a leading localized "All"). Omit or pass `[]` for no pills. */
  categories?: CatalogPickerCategory[];
  /** Called with the item id when an AVAILABLE item is clicked or activated with Enter/Space. */
  onSelect: (id: string) => void;
  /** Accessible name of the results listbox, e.g. "Widget catalog". Required. */
  label: string;
}

const ALL = '';

function matches(item: CatalogPickerItem, q: string) {
  if (!q) return true;
  return [item.title, item.description ?? '', ...(item.tags ?? [])].some((s) =>
    s.toLocaleLowerCase().includes(q),
  );
}

/**
 * Searchable, category-filterable card grid for picking one item from a catalog (e.g. an "Add widget" drawer).
 * @see docs/components/CatalogPicker.md
 */
// {...rest} last (Pattern A) so the consumer can add data-* / style to the root.
export const CatalogPicker = forwardRef<HTMLDivElement, CatalogPickerProps>(function CatalogPicker(
  { items, categories, onSelect, label, className, ...rest },
  ref,
) {
  const t = useTranslation();
  const id = useId();
  const listboxId = `${id}-listbox`;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);
  const [active, setActive] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);

  const q = query.trim().toLocaleLowerCase();
  const visible = useMemo(
    () => items.filter((it) => (category === ALL || it.category === category) && matches(it, q)),
    [items, category, q],
  );
  // Roving target resets to the first result whenever the filter changes.
  const filterKey = `${category}\u0000${q}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setActive(0);
  }
  const current = Math.min(active, Math.max(visible.length - 1, 0));

  const focusOption = (i: number) => {
    setActive(i);
    optionRefs.current[i]?.focus();
  };

  const columns = () => {
    const el = listRef.current;
    if (!el) return 1;
    const tracks = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length;
    return Math.max(tracks, 1);
  };

  const select = (item: CatalogPickerItem) => {
    if (!item.disabledReason) onSelect(item.id);
  };

  const onOptionKeyDown = (e: KeyboardEvent<HTMLDivElement>, i: number) => {
    const last = visible.length - 1;
    const rtl = listRef.current ? getComputedStyle(listRef.current).direction === 'rtl' : false;
    const cols = columns();
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowRight':
        next = Math.min(i + (rtl ? -1 : 1), last);
        break;
      case 'ArrowLeft':
        next = Math.max(i + (rtl ? 1 : -1), 0);
        break;
      case 'ArrowDown':
        next = Math.min(i + cols, last);
        break;
      case 'ArrowUp':
        if (i - cols < 0) {
          e.preventDefault();
          searchRef.current?.focus();
          return;
        }
        next = i - cols;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        select(visible[i]);
        return;
      default:
        return;
    }
    e.preventDefault();
    focusOption(Math.max(next, 0));
  };

  const hasCategories = !!categories && categories.length > 0;

  return (
    <div ref={ref} className={clsx(styles.root, className)} {...rest}>
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={16} aria-hidden className={styles.searchIcon} />
          <Input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('catalogPicker.search')}
            aria-label={t('catalogPicker.search')}
            aria-controls={listboxId}
            className={styles.searchInput}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && visible.length > 0) {
                e.preventDefault();
                focusOption(0);
              }
            }}
          />
        </div>

        {hasCategories && (
          <div
            role="radiogroup"
            aria-label={t('catalogPicker.categories')}
            className={styles.pills}
          >
            {[{ id: ALL, label: t('catalogPicker.all') }, ...categories!].map((c) => (
              <label key={c.id || '__all'} className={styles.pill}>
                <input
                  type="radio"
                  name={`${id}-category`}
                  className={styles.pillInput}
                  checked={category === c.id}
                  onChange={() => setCategory(c.id)}
                />
                <span className={styles.pillLabel}>{c.label}</span>
              </label>
            ))}
          </div>
        )}

        <div role="status" className={styles.count}>
          {t('catalogPicker.resultCount', { count: visible.length })}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState size="sm" title={t('catalogPicker.noMatches')} />
      ) : (
        <div ref={listRef} id={listboxId} role="listbox" aria-label={label} className={styles.grid}>
          {visible.map((item, i) => {
            const descId = `${id}-d-${item.id}`;
            const reasonId = `${id}-r-${item.id}`;
            const describedBy =
              [item.description && descId, item.disabledReason && reasonId]
                .filter(Boolean)
                .join(' ') || undefined;
            return (
              <div
                key={item.id}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                role="option"
                aria-selected={false}
                aria-disabled={item.disabledReason ? true : undefined}
                aria-labelledby={`${id}-t-${item.id}`}
                aria-describedby={describedBy}
                tabIndex={i === current ? 0 : -1}
                className={styles.option}
                onClick={() => select(item)}
                onKeyDown={(e) => onOptionKeyDown(e, i)}
                onFocus={() => setActive(i)}
              >
                {item.preview != null && <div className={styles.preview}>{item.preview}</div>}
                <div className={styles.body}>
                  <div className={styles.titleRow}>
                    <span id={`${id}-t-${item.id}`} className={styles.title}>
                      {item.title}
                    </span>
                    {item.badge != null && <span className={styles.badge}>{item.badge}</span>}
                  </div>
                  {item.description && (
                    <span id={descId} className={styles.description}>
                      {item.description}
                    </span>
                  )}
                  {item.disabledReason && (
                    <span id={reasonId} className={styles.reason}>
                      {item.disabledReason}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
```

Notes for the implementer:

- `Input` may wrap the `<input>` in a container and may already support a leading icon / `startAdornment`-style prop — open `src/components/Input/Input.tsx` first and use its built-in slot if one exists instead of the absolutely positioned `.searchIcon`.
- `ids` built from `item.id` must be valid for `aria-*` references: if ids may contain spaces, use the index (`${id}-t-${i}`) instead. Prefer the index.
- `useState` "reset during render" (`prevFilterKey`) mirrors the Lightbox pattern (#574); do not move it into an effect.

`CatalogPicker.tokens.scss`:

```scss
:root {
  --catalog-picker-gap: var(--space-3);
  --catalog-picker-toolbar-bg: var(--color-bg);
  --catalog-picker-toolbar-padding-block: var(--space-2);
  --catalog-picker-item-min: 11rem;
  --catalog-picker-item-gap: var(--space-2);
  --catalog-picker-item-padding: var(--space-2);
  --catalog-picker-item-radius: var(--radius-md);
  --catalog-picker-item-bg: var(--color-bg);
  --catalog-picker-item-bg-hover: var(--color-bg-hover);
  --catalog-picker-item-border: var(--color-border);
  --catalog-picker-item-disabled-opacity: var(--opacity-disabled);
  --catalog-picker-title-size: var(--font-size-sm);
  --catalog-picker-title-weight: var(--font-weight-semibold);
  --catalog-picker-meta-size: var(--font-size-xs);
  --catalog-picker-meta-fg: var(--color-fg-muted);
  --catalog-picker-pill-gap: var(--space-1);
  --catalog-picker-pill-padding: var(--space-1) var(--space-3);
  --catalog-picker-pill-border: var(--color-border);
  --catalog-picker-pill-fg: var(--color-fg);
  --catalog-picker-pill-bg-checked: var(--color-accent);
  --catalog-picker-pill-fg-checked: var(--color-accent-fg);
  --catalog-picker-ring: var(--ring-accent);
}
```

`11rem` is a raw length: if stylelint or `structure.test.ts` rejects it, express it via an existing size token (e.g. `calc(var(--space-16) * 2.75)`) or ask before adding a design token.

`CatalogPicker.module.scss`:

```scss
@use '../../styles/mixins' as *;
@use './CatalogPicker.tokens';

.root {
  display: flex;
  flex-direction: column;
  gap: var(--catalog-picker-gap);
  min-width: 0;
}

// Internal sticky header: keeps search + pills reachable while the parent
// (Drawer.Body / Modal.Body) scrolls. Not consumer layout.
.toolbar {
  // stylelint-disable-next-line declaration-property-value-disallowed-list -- internal sticky header
  position: sticky;
  // stylelint-disable-next-line property-disallowed-list -- internal sticky header
  top: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--catalog-picker-item-gap);
  padding-block: var(--catalog-picker-toolbar-padding-block);
  background: var(--catalog-picker-toolbar-bg);
}

.pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--catalog-picker-pill-gap);
  border: 0;
}

.pill {
  position: relative;
  display: inline-flex;
  cursor: pointer;
}

// Native radio kept for semantics + arrow keys; visually replaced by the pill.
.pillInput {
  @include visually-hidden;
}

.pillLabel {
  padding: var(--catalog-picker-pill-padding);
  color: var(--catalog-picker-pill-fg);
  font-size: var(--catalog-picker-title-size);
  border: var(--border-width) solid var(--catalog-picker-pill-border);
  border-radius: var(--radius-full);
}

.pillInput:checked + .pillLabel {
  color: var(--catalog-picker-pill-fg-checked);
  background: var(--catalog-picker-pill-bg-checked);
  border-color: var(--catalog-picker-pill-bg-checked);
}

.pillInput:focus-visible + .pillLabel {
  @include focus-ring(var(--catalog-picker-ring));
}

.count {
  color: var(--catalog-picker-meta-fg);
  font-size: var(--catalog-picker-meta-size);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--catalog-picker-item-min), 1fr));
  gap: var(--catalog-picker-item-gap);
}

.option {
  display: flex;
  flex-direction: column;
  gap: var(--catalog-picker-item-gap);
  min-width: 0;
  padding: var(--catalog-picker-item-padding);
  background: var(--catalog-picker-item-bg);
  border: var(--border-width) solid var(--catalog-picker-item-border);
  border-radius: var(--catalog-picker-item-radius);
  cursor: pointer;
}

.option:hover {
  background: var(--catalog-picker-item-bg-hover);
}

.option:focus-visible {
  @include focus-ring(var(--catalog-picker-ring));
}

.option[aria-disabled='true'] {
  cursor: default;
}

// Dim the visuals, not the reason text (it must stay readable).
.option[aria-disabled='true'] :is(.preview, .titleRow, .description) {
  opacity: var(--catalog-picker-item-disabled-opacity);
}

.body {
  display: flex;
  flex-direction: column;
  gap: var(--space-05);
  min-width: 0;
}

.titleRow {
  display: flex;
  align-items: center;
  gap: var(--catalog-picker-item-gap);
  min-width: 0;
}

.title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: var(--catalog-picker-title-size);
  font-weight: var(--catalog-picker-title-weight);
}

.badge {
  flex: none;
}

.description {
  display: -webkit-box;
  overflow: hidden;
  color: var(--catalog-picker-meta-fg);
  font-size: var(--catalog-picker-meta-size);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.reason {
  color: var(--catalog-picker-meta-fg);
  font-size: var(--catalog-picker-meta-size);
  font-style: italic;
}
```

Add `.search`, `.searchIcon`, `.searchInput` rules only if Input has no icon slot (see note). Verify `--opacity-disabled`, `--border-width`, `--space-05`, `--ring-accent`, `--color-accent-fg` exist (grep `packages/design-tokens/generated/web/tokens.scss`); substitute the nearest existing token otherwise. The reason text colour on a dimmed card must pass AA (it is not dimmed — keep it that way).

`index.ts`:

```ts
export { CatalogPicker } from './CatalogPicker';
export type { CatalogPickerProps, CatalogPickerItem, CatalogPickerCategory } from './CatalogPicker';
```

Append the same pair (with `./components/CatalogPicker`) to `src/index.ts`. Add `CatalogPicker: 'Forms',` to both CLUSTERS maps (next to `PillMenu`), run `npm run build:manifest`.

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/components/CatalogPicker src/i18n src/_meta` → PASS; `npx tsc --noEmit -p .` clean; `npx stylelint packages/design-system/src/components/CatalogPicker/*.scss` (repo root) clean. If jsdom's `getComputedStyle` ignores the inline `gridTemplateColumns` the 2-D test sets, stub instead: `vi.spyOn(window, 'getComputedStyle').mockReturnValue({ gridTemplateColumns: '100px 100px', direction: 'ltr' } as CSSStyleDeclaration)` scoped to that test (restore after).

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/CatalogPicker packages/design-system/src/i18n packages/design-system/src/index.ts packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs packages/design-system/src/components.manifest.json
git commit -m "feat(CatalogPicker): searchable, category-filterable catalog card picker (#613)"
```

---

### Task 3: `DashboardWidget`

**Files:**

- Create: `packages/design-system/src/components/DashboardWidget/DashboardWidget.tsx`
- Create: `packages/design-system/src/components/DashboardWidget/DashboardWidget.module.scss`
- Create: `packages/design-system/src/components/DashboardWidget/DashboardWidget.tokens.scss`
- Create: `packages/design-system/src/components/DashboardWidget/DashboardWidget.test.tsx`
- Create: `packages/design-system/src/components/DashboardWidget/index.ts`
- Modify: i18n (`dashboardWidget` section in `messages.ts`, `en.ts`, `ru.ts`), `src/index.ts`, both CLUSTERS maps (`DashboardWidget: 'Display'`, next to `DashboardCanvas`), regenerate manifest.

**Interfaces:**

- Consumes: `Card` (`../Card`: `Card`, `Card.Header` with `headerLevel`/`action`/`className`, `Card.Body` with `scroll`/`className`), `VisuallyHidden` (`../VisuallyHidden`), `WidgetShape` + `WidgetShapeKind` (`../WidgetPreview/WidgetShape`), `useTranslation`.
- Produces: `DashboardWidget`, `DashboardWidgetProps`, `DashboardWidgetVariant`, `DashboardWidgetTrend` exactly as in spec §4.

- [ ] **Step 1: i18n keys**

`messages.ts`:

```ts
dashboardWidget: {
  /** Visually hidden prefix of a KPI trend going up ("Increase"). */
  trendUp: string;
  /** Visually hidden prefix of a KPI trend going down ("Decrease"). */
  trendDown: string;
  /** Visually hidden prefix of a flat KPI trend ("No change"). */
  trendFlat: string;
  /** Visually hidden body text while `loading` (read when browsing the widget; not a live region). */
  loading: string;
}
```

`en.ts`: `dashboardWidget: { trendUp: 'Increase', trendDown: 'Decrease', trendFlat: 'No change', loading: 'Loading…' },`
`ru.ts`: `dashboardWidget: { trendUp: 'Рост', trendDown: 'Снижение', trendFlat: 'Без изменений', loading: 'Загрузка…' },`

- [ ] **Step 2: Write the failing tests**

`DashboardWidget.test.tsx`:

```tsx
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardWidget } from './DashboardWidget';

describe('DashboardWidget', () => {
  it('defaults to standard: heading h3, actions slot, scrolling padded body', () => {
    const { container } = render(
      <DashboardWidget title="Pipeline" actions={<button>Menu</button>}>
        <p>Body</p>
      </DashboardWidget>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Pipeline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveAttribute('data-variant', 'standard');
    expect(root.querySelector('[data-scroll]')).toHaveTextContent('Body');
  });

  it('honours headerLevel', () => {
    render(<DashboardWidget title="T" headerLevel="h2" />);
    expect(screen.getByRole('heading', { level: 2, name: 'T' })).toBeInTheDocument();
  });

  it('list: flush scrolling body', () => {
    const { container } = render(
      <DashboardWidget variant="list" title="Tasks">
        <ul>
          <li>a</li>
        </ul>
      </DashboardWidget>,
    );
    const body = container.querySelector('[data-scroll]') as HTMLElement;
    expect(body.className).toMatch(/flush/);
  });

  it('chart: flush, non-scrolling fill body', () => {
    const { container } = render(
      <DashboardWidget variant="chart" title="Revenue">
        <svg data-testid="plot" />
      </DashboardWidget>,
    );
    expect(container.querySelector('[data-scroll]')).toBeNull();
    expect(screen.getByTestId('plot').parentElement!.className).toMatch(/chartBody/);
  });

  it('kpi: value + trend with hidden direction text, default sentiment from direction', () => {
    render(
      <DashboardWidget
        variant="kpi"
        title="Open deals"
        value="128"
        trend={{ label: '+12%', direction: 'up' }}
      />,
    );
    expect(screen.getByText('128')).toBeInTheDocument();
    const trend = screen.getByText('+12%').closest('[data-sentiment]')!;
    expect(trend).toHaveAttribute('data-sentiment', 'positive');
    expect(trend).toHaveTextContent('Increase +12%');
  });

  it.each([
    ['down', undefined, 'negative', 'Decrease'],
    ['flat', undefined, 'neutral', 'No change'],
    ['up', 'negative', 'negative', 'Increase'],
  ] as const)('trend %s with sentiment %s → %s', (direction, sentiment, expected, word) => {
    render(
      <DashboardWidget
        variant="kpi"
        title="Churn"
        value="3%"
        trend={{ label: 'x', direction, sentiment }}
      />,
    );
    const trend = screen.getByText('x').closest('[data-sentiment]')!;
    expect(trend).toHaveAttribute('data-sentiment', expected);
    expect(trend).toHaveTextContent(`${word} x`);
  });

  it.each([
    ['standard', 'lines'],
    ['list', 'list'],
    ['kpi', 'kpi'],
    ['chart', 'chart'],
  ] as const)('loading %s renders the %s shape and keeps title + actions', (variant, kind) => {
    const { container } = render(
      <DashboardWidget variant={variant} title="W" actions={<button>Menu</button>} loading>
        <p>Real body</p>
      </DashboardWidget>,
    );
    expect(
      container.querySelector(`[data-widget-shape="${kind}"][data-mode="loading"]`),
    ).not.toBeNull();
    expect(screen.queryByText('Real body')).toBeNull();
    expect(screen.getByRole('heading', { name: 'W' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(container.querySelector('[role="status"], [aria-live]')).toBeNull();
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true');
  });

  it('kpi loading hides value and trend (no stale numbers next to a skeleton)', () => {
    render(
      <DashboardWidget
        variant="kpi"
        title="Open deals"
        value="128"
        trend={{ label: '+12%', direction: 'up' }}
        loading
      />,
    );
    expect(screen.queryByText('128')).toBeNull();
    expect(screen.queryByText('+12%')).toBeNull();
  });

  it('forwards ref to the Card root, merges className, spreads attrs', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <DashboardWidget ref={ref} title="T" className="mine" data-testid="w" />,
    );
    const root = container.firstChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.className).toMatch(/mine/);
    expect(root).toHaveAttribute('data-testid', 'w');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/components/DashboardWidget` → FAIL (module not found).

- [ ] **Step 4: Implement**

First read `src/components/Card/Card.tsx`, `CardBody.tsx` and `Card.module.scss` to confirm how `fill` + `Card.Body scroll` set up the column/min-height chain, and whether `Card.Body` forwards `className` and extra attributes (`data-scroll` needs to land on the scrolling element — if `Card.Body` does not spread attrs, put `data-scroll` on a wrapper you own and adjust the test selector accordingly).

`DashboardWidget.tsx`:

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '../Card';
import { VisuallyHidden } from '../VisuallyHidden';
import { WidgetShape, type WidgetShapeKind } from '../WidgetPreview/WidgetShape';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './DashboardWidget.module.scss';

/** Presentation variant of a dashboard widget card. */
export type DashboardWidgetVariant = 'standard' | 'list' | 'kpi' | 'chart';

/** KPI trend/delta shown under the value. */
export interface DashboardWidgetTrend {
  /** Visible delta text, e.g. "+12% vs last month". */
  label: ReactNode;
  /** Arrow direction; also the hidden "Increase / Decrease / No change" word read before `label`. */
  direction: 'up' | 'down' | 'flat';
  /**
   * Colour meaning. Defaults from `direction`: up → `positive`, down → `negative`,
   * flat → `neutral`. Override when "up" is bad (churn, overdue tasks).
   */
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface DashboardWidgetProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * Presentation variant. Default `'standard'`.
   * - `'standard'` — header (title + actions) over a padded scrolling body. Today's widget card.
   * - `'list'` — stronger header with a divider; flush scrolling body so `Card.List` bleeds edge to edge.
   * - `'kpi'` — compact muted title, a large `value`, optional `trend`; optional `children` below. No scrolling.
   * - `'chart'` — compact header; flush non-scrolling body that fills the cell (give the plot `height: 100%`).
   */
  variant?: DashboardWidgetVariant;
  /** Widget title, rendered as the heading at `headerLevel`. Required. */
  title: ReactNode;
  /** Header actions, e.g. the edit-mode overflow `DropdownMenu`. Never wraps. */
  actions?: ReactNode;
  /** Heading level of the title. Default `'h3'`. */
  headerLevel?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  /** KPI value (`variant="kpi"` only), e.g. `"128"` or a formatted currency node. */
  value?: ReactNode;
  /** KPI trend (`variant="kpi"` only). */
  trend?: DashboardWidgetTrend;
  /**
   * Show a variant-matched loading skeleton instead of the body (and, for kpi, instead of
   * `value`/`trend`); title and actions stay. Adds visually hidden "Loading…" body text and
   * `aria-busy`. Deliberately NO live region: a dashboard loads many widgets at once, so
   * per-widget announcements would flood screen readers — announce "dashboard loaded" once
   * at page level if needed. Default `false`.
   */
  loading?: boolean;
  /** Widget body. Pass `ErrorState` / `EmptyState` here for error and empty states. */
  children?: ReactNode;
}

const LOADING_SHAPE: Record<DashboardWidgetVariant, WidgetShapeKind> = {
  standard: 'lines',
  list: 'list',
  kpi: 'kpi',
  chart: 'chart',
};

const DEFAULT_SENTIMENT = { up: 'positive', down: 'negative', flat: 'neutral' } as const;
const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;
const TREND_WORD = {
  up: 'dashboardWidget.trendUp',
  down: 'dashboardWidget.trendDown',
  flat: 'dashboardWidget.trendFlat',
} as const;

/**
 * Dashboard canvas-cell card with standard / list / kpi / chart presentation and a variant-matched loading skeleton.
 * @see docs/components/DashboardWidget.md
 */
// {...rest} last (Pattern A) so the consumer can add data-* / handlers to the Card root.
export const DashboardWidget = forwardRef<HTMLDivElement, DashboardWidgetProps>(
  function DashboardWidget(
    {
      variant = 'standard',
      title,
      actions,
      headerLevel = 'h3',
      value,
      trend,
      loading = false,
      children,
      className,
      ...rest
    },
    ref,
  ) {
    const t = useTranslation();
    const skeleton = (
      <>
        <WidgetShape kind={LOADING_SHAPE[variant]} mode="loading" />
        <VisuallyHidden>{t('dashboardWidget.loading')}</VisuallyHidden>
      </>
    );

    const header = (
      <Card.Header
        headerLevel={headerLevel}
        action={actions}
        className={clsx(styles.header, styles[`header-${variant}`])}
      >
        {title}
      </Card.Header>
    );

    let body: ReactNode;
    if (variant === 'kpi') {
      const Icon = trend ? TREND_ICON[trend.direction] : null;
      body = (
        <div className={styles.kpiBody}>
          {loading ? (
            skeleton
          ) : (
            <>
              {value != null && <div className={styles.value}>{value}</div>}
              {trend && Icon && (
                <div
                  className={styles.trend}
                  data-sentiment={trend.sentiment ?? DEFAULT_SENTIMENT[trend.direction]}
                >
                  <Icon size={16} aria-hidden="true" />
                  <VisuallyHidden>{t(TREND_WORD[trend.direction])} </VisuallyHidden>
                  <span>{trend.label}</span>
                </div>
              )}
              {children}
            </>
          )}
        </div>
      );
    } else if (variant === 'chart') {
      body = <div className={styles.chartBody}>{loading ? skeleton : children}</div>;
    } else {
      body = (
        <Card.Body
          scroll
          data-scroll=""
          className={clsx(styles.scrollBody, variant === 'list' && styles.flush)}
        >
          {loading ? skeleton : children}
        </Card.Body>
      );
    }

    return (
      <Card
        ref={ref}
        fill
        padding="none"
        data-variant={variant}
        aria-busy={loading || undefined}
        className={clsx(styles.root, styles[`variant-${variant}`], className)}
        {...rest}
      >
        {header}
        {body}
      </Card>
    );
  },
);
```

Check `t(...)` typing for `TREND_WORD` keys (the `useTranslation` key type may need `as const` paths — copy how another component indexes a key map, e.g. Banner's `tone` keys). The visually hidden word must be followed by a space so "Increase +12%" reads as two words — `toHaveTextContent` normalises whitespace, so the test passes either way; keep the space.

`Card.fill` + a non-`Card.Body` child (`kpiBody` / `chartBody`): Card's column chain may only apply to direct `Card.Body` children. If the kpi/chart body does not fill the cell, give `.root` `display: flex; flex-direction: column` and `.kpiBody, .chartBody { flex: 1; min-height: 0 }` in this module (internal children, allowed), and verify in the playground (Task 5).

`DashboardWidget.tokens.scss`:

```scss
:root {
  --dashboard-widget-header-divider: var(--color-border);
  --dashboard-widget-compact-title-size: var(--font-size-sm);
  --dashboard-widget-compact-title-fg: var(--color-fg-muted);
  --dashboard-widget-compact-padding: var(--space-3);
  --dashboard-widget-body-padding: var(--space-4);
  --dashboard-widget-kpi-gap: var(--space-1);
  --dashboard-widget-kpi-value-size: var(--font-size-3xl);
  --dashboard-widget-kpi-value-weight: var(--font-weight-semibold);
  --dashboard-widget-trend-size: var(--font-size-sm);
  --dashboard-widget-trend-gap: var(--space-1);
  --dashboard-widget-trend-positive: var(--color-success);
  --dashboard-widget-trend-negative: var(--color-danger);
  --dashboard-widget-trend-neutral: var(--color-fg-muted);
}
```

`DashboardWidget.module.scss` — tokens only; use `Card.module.scss`'s header selectors to learn which properties to override (title size lives on the heading inside `.header`):

```scss
@use './DashboardWidget.tokens';

.root {
  min-height: 0;
}

.scrollBody {
  padding: var(--dashboard-widget-body-padding);
}

.flush {
  padding: 0;
}

.header-list {
  border-block-end: var(--border-width) solid var(--dashboard-widget-header-divider);
}

// kpi + chart: compact, muted, no divider.
.header-kpi,
.header-chart {
  padding: var(--dashboard-widget-compact-padding);
  padding-block-end: 0;
  border-block-end: 0;
}

.header-kpi :is(h2, h3, h4, h5, h6),
.header-chart :is(h2, h3, h4, h5, h6) {
  color: var(--dashboard-widget-compact-title-fg);
  font-size: var(--dashboard-widget-compact-title-size);
}

.kpiBody {
  display: flex;
  flex-direction: column;
  gap: var(--dashboard-widget-kpi-gap);
  padding: var(--dashboard-widget-compact-padding);
  min-height: 0;
  overflow: hidden;
}

.value {
  font-size: var(--dashboard-widget-kpi-value-size);
  font-weight: var(--dashboard-widget-kpi-value-weight);
  line-height: 1.1;
}

.trend {
  display: flex;
  align-items: center;
  gap: var(--dashboard-widget-trend-gap);
  font-size: var(--dashboard-widget-trend-size);
}

.trend[data-sentiment='positive'] {
  color: var(--dashboard-widget-trend-positive);
}
.trend[data-sentiment='negative'] {
  color: var(--dashboard-widget-trend-negative);
}
.trend[data-sentiment='neutral'] {
  color: var(--dashboard-widget-trend-neutral);
}

.chartBody {
  min-height: 0;
  overflow: hidden;
  padding: var(--dashboard-widget-compact-padding);
}
```

`line-height: 1.1` is raw — use a line-height token if one exists (grep `--line-height`), else the nearest. Run Prettier to expand the one-line rules.

`index.ts`:

```ts
export { DashboardWidget } from './DashboardWidget';
export type {
  DashboardWidgetProps,
  DashboardWidgetVariant,
  DashboardWidgetTrend,
} from './DashboardWidget';
```

Append to `src/index.ts`; add `DashboardWidget: 'Display',` to both CLUSTERS maps next to `DashboardCanvas`; `npm run build:manifest`.

Contrast: `--color-success` / `--color-danger` as text on the card surface in light AND dark theme must be ≥ 4.5:1. If `src/styles/contrast.test.ts` has a table of text-on-surface pairs, add these two pairs there.

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/components/DashboardWidget src/components/WidgetPreview src/i18n src/_meta src/styles` → PASS; `npx tsc --noEmit -p .` clean; stylelint clean.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/DashboardWidget packages/design-system/src/i18n packages/design-system/src/index.ts packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs packages/design-system/src/components.manifest.json packages/design-system/src/styles
git commit -m "feat(DashboardWidget): standard/list/kpi/chart widget card with variant-matched loading skeleton (#613)"
```

---

### Task 4: Component docs + primer

**Files:**

- Create: `packages/design-system/docs/components/WidgetPreview.md`, `CatalogPicker.md`, `DashboardWidget.md`
- Modify: `packages/design-system/AI-PRIMER.md` (three index lines, alphabetical within their section, same format as `- [\`StagePath\`](docs/components/StagePath.md) — …`)

**Interfaces:**

- Consumes: the three components' public props (Tasks 1–3).

- [ ] **Step 1: Write each doc** using the structure of `docs/components/StagePath.md` / `MediaTile.md`: H1 `# \`<Name>\` — <short role>`; TL;DR paragraph; canonical snippet; `<!-- props:start -->`/`<!-- props:end -->` markers (generated, leave empty between them); bullets of behaviour; **When NOT to use** + ❌ anti-patterns. Required content:
  - **WidgetPreview**: decorative + `aria-hidden` always; data-free; the five variants; use inside `CatalogPicker` items; ❌ using it as a loading placeholder (use `DashboardWidget loading`); ❌ expecting it to convey info to screen readers.
  - **CatalogPicker**: lives in `Drawer.Body`/`Modal.Body` (snippet from spec §3); `onSelect` is an action — the app decides add-now vs configure-next; unavailable items via `disabledReason` (visible, focusable, never hidden); keyboard map (ArrowDown from search, arrows by item/row, Home/End, Enter/Space, ↑ from first row → search); search fields (title, description, tags); ❌ hiding unavailable items; ❌ putting buttons/links inside `preview`/`badge` (options must not contain interactive content); ❌ using it for a persistent form value (use `Select`/`IconPicker`); ❌ for filters (use `OptionsPicker`).
  - **DashboardWidget**: one snippet per variant (spec §4); fills a `DashboardCanvas` cell (`renderItem={(id) => <DashboardWidget …/>}`); `loading` behaviour + the deliberate no-live-region rationale (Hard rule 10) and the page-level announcement advice; error/empty via `children`; `sentiment` override example (churn up = negative); ❌ wrapping it in another `Card`; ❌ passing `value`/`trend` to non-kpi variants (ignored); ❌ rendering its own Skeleton in `children` instead of `loading`.
- [ ] **Step 2:** From `packages/design-system`: `npm run build:docs` (fills the props tables). Check each generated table lists every prop.
- [ ] **Step 3:** Add the AI-PRIMER lines:
  - ``- [`CatalogPicker`](docs/components/CatalogPicker.md) — searchable, category-filtered card picker for choosing one catalog item (Add widget)`` (Forms section)
  - ``- [`DashboardWidget`](docs/components/DashboardWidget.md) — DashboardCanvas cell card: standard / list / kpi / chart, with loading skeletons`` (next to DashboardCanvas)
  - ``- [`WidgetPreview`](docs/components/WidgetPreview.md) — decorative data-free miniature of a widget kind (for CatalogPicker)`` (Display section)
- [ ] **Step 4:** Repo root: `npx prettier --write packages/design-system/docs/components/{WidgetPreview,CatalogPicker,DashboardWidget}.md packages/design-system/AI-PRIMER.md`; from `packages/design-system`: `npx vitest run src/structure.test.ts` → PASS for docs-related gates.
- [ ] **Step 5: Commit**

```bash
git add packages/design-system/docs/components packages/design-system/AI-PRIMER.md
git commit -m "docs: WidgetPreview, CatalogPicker, DashboardWidget component docs (#613)"
```

---

### Task 5: Playground demos + wiring + DashboardCanvas gallery example

**Files:**

- Create: `packages/playground/src/pages/components/WidgetPreviewDemo.tsx`, `CatalogPickerDemo.tsx`, `DashboardWidgetDemo.tsx`
- Modify: `packages/playground/src/App.tsx` (imports + routes `/components/widget-preview`, `/components/catalog-picker`, `/components/dashboard-widget`)
- Modify: `packages/playground/src/layout/AppShell/navItems.ts` (entries in the right `componentGroups` group, alphabetical; icons from lucide: `LayoutTemplate` WidgetPreview, `LibraryBig` CatalogPicker, `SquareKanban`→ use `PanelsTopLeft` for DashboardWidget — any existing lucide icon, verify it exists in the installed lucide version)
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx` (three entries, same shape as StagePath's)
- Modify: `packages/playground/src/pages/components/overviewSchematics.tsx` (three schematics using the file's `Row`/`Box`/`Bar`/`Solid`/`Outline` helpers)
- Modify: `packages/playground/src/pages/mockups/registry.ts` (`| 'WidgetPreview' | 'CatalogPicker' | 'DashboardWidget'` in `ComponentName`)
- Modify: `packages/playground/src/pages/components/DashboardCanvasDemo.tsx` (new "Widget gallery" example)
- Regenerate: `packages/playground/src/lib/props.manifest.json` (`npm run build:props` from `packages/playground`)

**Interfaces:**

- Consumes: all three components from `@eocrm/design-system` (never relative imports), `DemoLayout`, `Example`, `getComponentFiles`, `Drawer`, `Button`, `Badge`, `ErrorState`, `Switch`.

- [ ] **Step 1: Demos.** Pattern: `StagePathDemo.tsx` (DemoLayout with `name`, `componentName`, `description`, `files={getComponentFiles('<Name>')}`; each `<Example title description code>` with a literal code string matching the rendered example).
  - **WidgetPreviewDemo**: one example showing all five variants in a `Grid` with labels; one example of a preview inside a narrow (160px) and wide (360px) container to show scaling.
  - **CatalogPickerDemo**: (a) inline picker in a bordered 420px-wide box with ~10 widget items across Overview/Sales/Work/Contacts/Analytics, `WidgetPreview` previews, one `Badge` "New", two items with `disabledReason` ("Already on dashboard", "Requires Analytics permission"), showing the last selected id under it; (b) the canonical "Add widget" `Drawer` example (button opens Drawer, picker in `Drawer.Body`, selecting closes it and shows a toast or text).
  - **DashboardWidgetDemo**: the four variants side by side in fixed-height (220px) cells (`Constrain height` or a grid with `grid-auto-rows`), each with an actions `DropdownMenu` trigger (icon-only ghost Button with `aria-label`), a `Switch` "Loading" that toggles `loading` on all four; a kpi with `sentiment="negative"` on an up trend (churn); a list with `Card.List` rows long enough to scroll; a chart with a simple inline SVG bar plot at `height: 100%`; an error example passing `<ErrorState …/>` as children (check ErrorState's props first).
- [ ] **Step 2: Wiring** — App route + import, navItems, ComponentsIndex, overviewSchematics, registry, exactly mirroring the StagePath entries.
- [ ] **Step 3: DashboardCanvas "Widget gallery" example** in `DashboardCanvasDemo.tsx`: canvas state with 3 widgets (kpi, list, chart) rendered via `renderItem={(id) => <DashboardWidget …/>}`; an "Add widget" button opens a `Drawer` with `CatalogPicker` (items for 5 widget kinds; already-placed kinds get `disabledReason: 'Already on dashboard'`); selecting appends a placement at the bottom (`y` = max(y+h) of existing items, `w`=8, `h`=4 on the default 24-column grid — confirm the placement shape in `DashboardCanvas.tsx`'s `DashboardPlacement`) and closes the Drawer; a "Simulate loading" `Switch` sets `loading` on every widget.
- [ ] **Step 4:** From `packages/playground`: `npm run build:props`; `npx tsc --noEmit -p .`. Repo root: `npx prettier --write` on every touched playground file.
- [ ] **Step 5: Visual check** — dev server on port **8090+** only (`npx vite --port 8091 --strictPort` from `packages/playground` if 8090 is busy; never the default port). With Playwright, screenshot each demo in light AND dark theme (toggle via the playground's theme switch) and verify: preview shapes visible on their box in both themes; accent hero visible; CatalogPicker sticky toolbar stays while scrolling inside the Drawer; unavailable cards dimmed with readable reason; DashboardWidget kpi/chart bodies fill the 220px cell; loading skeletons fill the body. Fix token choices (tokens only) where something is invisible. Close the Playwright browser afterwards.
- [ ] **Step 6: Commit**

```bash
git add packages/playground
git commit -m "feat(playground): WidgetPreview, CatalogPicker, DashboardWidget demos + DashboardCanvas widget gallery (#613)"
```

**RULING (controller): after Task 5 is reviewed, STOP and give the user the live playground URL (port 8090+) for a demo check before the final review, gates, PR and merge.**

---

### Task 6: Full gates

- [ ] **Step 1:** Repo root: `make test; echo "exit=$?"` (read the EXIT CODE, not grep), `make build-lib`, `make lint`, `npm run format:check`.
- [ ] **Step 2:** `npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'` → `0`.
- [ ] **Step 3:** Fix any failure at its root; commit fixes as `fix: …` with a clear message.
