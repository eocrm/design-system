# Sparkline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<Sparkline>` (static line/area/bar trend, token height, no axes) plus a `StatTile` `sparkline` slot, for KPI cards (#642).

**Architecture:** A pure `sparklineModel.ts` (d3-scale + d3-shape, Node-tested) computes summary + SVG geometry from `values`, `type`, measured width/height. `Sparkline.tsx` measures its width (callback ref + ResizeObserver), renders an `aria-hidden` SVG, and folds an i18n summary into the `role="img"` name. `StatTile` gets a `sparkline?: ReactNode` slot; `DashboardWidget kpi` uses its existing `children`.

**Tech Stack:** React 18 + TS, SCSS modules, d3-scale / d3-shape (existing deps), Vitest (`unit` = Node for `*.test.ts`, `dom` = jsdom for `*.test.tsx`).

**Spec:** `docs/superpowers/specs/2026-10-16-sparkline-design.md`

## Global Constraints

- Branch `feat/batch-638-644` (already checked out). Never push; the controller pushes.
- Tokens only in `.module.scss`; new shared values go in `packages/design-tokens/src/tokens.json` → `npm run tokens:generate` → `npm run tokens:check` (root). Never edit generated files.
- No layout props in component SCSS (no margin/position/top/left/flex:1/width other than 100%).
- Every user-facing string via i18n (`src/i18n/messages.ts` + `en.ts` + `ru.ts`).
- Every exported prop/type/component has JSDoc; component JSDoc = one line + `@see docs/components/Sparkline.md`.
- Tests: no `describe/it/expect/vi` imports (globals). Pure logic in `*.test.ts`; DOM in `*.test.tsx`.
- Run vitest from `packages/design-system` (`npx vitest run <path>`).
- Commit messages: plain, no Co-Authored-By / session trailers.

## Review Focus

- Values containing `NaN`/`Infinity` → treated as `null` (gap), never a broken `NaN` path → model test in Task 1.
- Single non-null value → no line path crash; dot centred; summary first = last → model test in Task 1.
- All-zero series with `type="bar"`/`"area"` → zero-height bars / flat area, no `NaN` → model test in Task 1.
- Negative values with `type="bar"` → bars hang from the zero line, not from the bottom → model test in Task 1.
- Consumer passing `role` / `aria-label` cannot break the `img` contract → DOM test in Task 1.

---

### Task 1: Token, model, Sparkline component, i18n, export

**Files:**

- Modify: `packages/design-tokens/src/tokens.json` (add `size.sparkline`), regenerate; update `packages/design-tokens/test/fixtures/current-web-contract.json` via `node packages/design-tokens/scripts/capture-web-contract.mjs` and bump the light-count assertion in `packages/design-tokens/test/source.test.mjs` (currently 320 → 321, with a `// +1 light: --size-sparkline (#642).` comment)
- Create: `packages/design-system/src/components/Sparkline/sparklineModel.ts`
- Create: `packages/design-system/src/components/Sparkline/sparklineModel.test.ts`
- Create: `packages/design-system/src/components/Sparkline/Sparkline.tsx`
- Create: `packages/design-system/src/components/Sparkline/Sparkline.module.scss`
- Create: `packages/design-system/src/components/Sparkline/Sparkline.tokens.scss`
- Create: `packages/design-system/src/components/Sparkline/Sparkline.test.tsx`
- Create: `packages/design-system/src/components/Sparkline/index.ts`
- Modify: `packages/design-system/src/i18n/messages.ts`, `en.ts`, `ru.ts` (new `sparkline` group)
- Modify: `packages/design-system/src/index.ts` (exports, next to the Chart block ~line 815)

**Interfaces:**

- Produces: `Sparkline`, `SparklineProps`, `SparklineType` (exported from package root); CSS token `--size-sparkline` (40px) and component token `--sparkline-height`.

- [ ] **Step 1: Token.** In `tokens.json`, insert before the `"size.spinner"` entry (alphabetical by id):

```json
    {
      "id": "size.sparkline",
      "type": "dimension",
      "value": "40px",
      "outputs": {
        "web": {
          "name": "--size-sparkline"
        }
      }
    },
```

Run from repo root: `npm run tokens:generate && node packages/design-tokens/scripts/capture-web-contract.mjs`, bump the count assertion as above, then `npm run tokens:check` → exit 0.

- [ ] **Step 2: Failing model tests** — `sparklineModel.test.ts`:

```ts
import { layoutSparkline, summarize } from './sparklineModel';

describe('summarize', () => {
  it('returns first/last/min/max over finite values, skipping null and NaN', () => {
    expect(summarize([null, 3, NaN, 9, 1, null])).toEqual({ first: 3, last: 1, min: 1, max: 9 });
  });
  it('returns null when nothing is finite', () => {
    expect(summarize([])).toBeNull();
    expect(summarize([null, NaN, Infinity])).toBeNull();
  });
});

describe('layoutSparkline', () => {
  const W = 100;
  const H = 40;

  it('returns null for no data or no size', () => {
    expect(layoutSparkline([null], 'line', W, H)).toBeNull();
    expect(layoutSparkline([1, 2], 'line', 0, H)).toBeNull();
  });

  it('line: a path with no NaN and an end dot on the last finite value', () => {
    const g = layoutSparkline([1, 5, 3, null], 'line', W, H)!;
    expect(g.line).toMatch(/^M/);
    expect(g.line).not.toContain('NaN');
    expect(g.area).toBeUndefined();
    expect(g.bars).toBeUndefined();
    expect(g.dot).toBeDefined();
    // index 2 of 4 values → x at 2/3 of the inset span
    expect(g.dot!.cx).toBeCloseTo(3 + (2 / 3) * (W - 6));
  });

  it('line: nulls split the path into separate segments (gaps)', () => {
    const g = layoutSparkline([1, 2, null, 3, 4], 'line', W, H)!;
    expect(g.line!.match(/M/g)).toHaveLength(2);
  });

  it('line: the y range spans min..max (highest value at the top inset)', () => {
    const g = layoutSparkline([2, 10], 'line', W, H)!;
    expect(g.dot!.cy).toBeCloseTo(3);
  });

  it('flat series draws at mid height', () => {
    const g = layoutSparkline([5, 5, 5], 'line', W, H)!;
    expect(g.dot!.cy).toBeCloseTo(H / 2);
  });

  it('single value: no NaN, dot centred horizontally', () => {
    const g = layoutSparkline([7], 'line', W, H)!;
    expect(g.line ?? '').not.toContain('NaN');
    expect(g.dot!.cx).toBeCloseTo(W / 2);
  });

  it('area: fill path down to the baseline plus the stroke and dot', () => {
    const g = layoutSparkline([0, 4, 2], 'area', W, H)!;
    expect(g.area).toMatch(/^M/);
    expect(g.line).toMatch(/^M/);
    expect(g.area).not.toContain('NaN');
    expect(g.dot).toBeDefined();
  });

  it('area/bar: non-negative data uses a zero baseline', () => {
    // [5, 10] with zero baseline → 5 sits half way, not at the bottom.
    const g = layoutSparkline([5, 10], 'bar', W, H)!;
    expect(g.bars).toHaveLength(2);
    const [a, b] = g.bars!;
    expect(b.height).toBeCloseTo(H - 6);
    expect(a.height).toBeCloseTo((H - 6) / 2);
  });

  it('bar: one rect per finite value, nulls skipped, no dot, no NaN', () => {
    const g = layoutSparkline([1, null, 3, NaN], 'bar', W, H)!;
    expect(g.bars).toHaveLength(2);
    expect(g.dot).toBeUndefined();
    expect(JSON.stringify(g)).not.toContain('null');
  });

  it('bar: all-zero series gives zero-height bars without NaN', () => {
    const g = layoutSparkline([0, 0], 'bar', W, H)!;
    g.bars!.forEach((r) => {
      expect(Number.isFinite(r.y)).toBe(true);
      expect(r.height).toBe(0);
    });
  });

  it('bar: negative values hang from the zero line', () => {
    const g = layoutSparkline([-4, 4], 'bar', W, H)!;
    const [neg, pos] = g.bars!;
    expect(neg.y).toBeCloseTo(pos.y + pos.height); // both meet at the zero line
    expect(neg.height).toBeCloseTo(pos.height);
  });
});
```

Run: `npx vitest run src/components/Sparkline/sparklineModel.test.ts` → FAIL (module missing).

- [ ] **Step 3: Model** — `sparklineModel.ts`:

```ts
// sparklineModel.ts — pure geometry + summary for <Sparkline>. No DOM; Node-tested.
import { scaleBand, scaleLinear } from 'd3-scale';
import { area as d3Area, curveMonotoneX, line as d3Line } from 'd3-shape';

/** Sparkline mark type. */
export type SparklineType = 'line' | 'area' | 'bar';

/** Px kept clear on every edge so the stroke and end dot are never clipped. */
export const SPARKLINE_INSET = 3;
/** End-dot radius in px. */
export const SPARKLINE_DOT_RADIUS = 2.5;

/** First / last / min / max of the finite values. */
export interface SparklineSummary {
  first: number;
  last: number;
  min: number;
  max: number;
}

export interface SparklineRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SparklineGeometry {
  /** Stroke path (line + area). */
  line?: string;
  /** Fill path (area only). */
  area?: string;
  /** Bars (bar only). */
  bars?: SparklineRect[];
  /** Marker on the last finite value (line + area). */
  dot?: { cx: number; cy: number };
}

const finite = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);

export function summarize(values: readonly (number | null)[]): SparklineSummary | null {
  const nums = values.filter(finite);
  if (nums.length === 0) return null;
  return {
    first: nums[0],
    last: nums[nums.length - 1],
    min: Math.min(...nums),
    max: Math.max(...nums),
  };
}

export function layoutSparkline(
  values: readonly (number | null)[],
  type: SparklineType,
  width: number,
  height: number,
): SparklineGeometry | null {
  const s = summarize(values);
  if (!s || width <= 0 || height <= 0) return null;
  const pad = SPARKLINE_INSET;
  const n = values.length;

  // Area/bar read as quantities: anchor at zero when nothing is negative.
  const lo = type !== 'line' && s.min >= 0 ? 0 : s.min;
  const hi = s.max;
  const y = scaleLinear()
    .domain(lo === hi ? [lo - 1, hi + 1] : [lo, hi]) // flat → mid height
    .range([height - pad, pad]);

  if (type === 'bar') {
    const band = scaleBand<number>()
      .domain(values.map((_, i) => i))
      .range([0, width])
      .paddingInner(0.2);
    const zero = y(Math.min(Math.max(0, y.domain()[0]), y.domain()[1]));
    const bars: SparklineRect[] = [];
    values.forEach((v, i) => {
      if (!finite(v)) return;
      const top = y(v);
      bars.push({
        x: band(i) ?? 0,
        y: Math.min(top, zero),
        width: Math.max(1, band.bandwidth()),
        height: v === 0 ? 0 : Math.abs(zero - top),
      });
    });
    return { bars };
  }

  const xs = scaleLinear()
    .domain([0, Math.max(n - 1, 1)])
    .range([pad, width - pad]);
  const x = (i: number) => (n === 1 ? width / 2 : xs(i));

  const lineGen = d3Line<number | null>()
    .defined(finite)
    .x((_, i) => x(i))
    .y((v) => y(v as number))
    .curve(curveMonotoneX);
  const geometry: SparklineGeometry = { line: lineGen(values as (number | null)[]) ?? undefined };

  if (type === 'area') {
    const areaGen = d3Area<number | null>()
      .defined(finite)
      .x((_, i) => x(i))
      .y0(height - pad)
      .y1((v) => y(v as number))
      .curve(curveMonotoneX);
    geometry.area = areaGen(values as (number | null)[]) ?? undefined;
  }

  let last = n - 1;
  while (last >= 0 && !finite(values[last])) last--;
  geometry.dot = { cx: x(last), cy: y(values[last] as number) };
  return geometry;
}
```

Note: if the "all-zero bar" test fails because `y(0)` for domain `[-1, 1]` is mid-height, that is fine — only height/finite are asserted. If the zero-baseline test's arithmetic is off by the inset, fix the implementation, not the test (the scale range is `[H - 3, 3]`, so the full span is `H - 6`).

Run the model test → PASS.

- [ ] **Step 4: i18n.** In `messages.ts` add a group (next to `chart`):

```ts
sparkline: {
  /** Accessible name of a Sparkline with data: label plus the series summary. */
  summary: (params: { label: string; first: string; last: string; min: string; max: string }) =>
    string;
  /** Accessible name of a Sparkline with no finite values. */
  noData: (params: { label: string }) => string;
}
```

`en.ts`:

```ts
  sparkline: {
    summary: ({ label, first, last, min, max }) =>
      `${label as string}: from ${first as string} to ${last as string}, low ${min as string}, high ${max as string}`,
    noData: ({ label }) => `${label as string}: no data`,
  },
```

`ru.ts`:

```ts
  sparkline: {
    summary: ({ label, first, last, min, max }) =>
      `${label as string}: с ${first as string} до ${last as string}, минимум ${min as string}, максимум ${max as string}`,
    noData: ({ label }) => `${label as string}: нет данных`,
  },
```

(Match the exact parameter-typing style of neighbouring function messages such as `select.createOption`; drop the `as string` casts if those neighbours don't need them.)

- [ ] **Step 5: Failing component tests** — `Sparkline.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '../../i18n';
import { Sparkline } from './Sparkline';

const wrap = (ui: React.ReactElement) => render(<I18nProvider locale="en">{ui}</I18nProvider>);

// jsdom has no layout: give the measured root a width so the SVG draws.
function stubWidth(width: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    height: 40,
    top: 0,
    left: 0,
    right: width,
    bottom: 40,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('is an img named by label plus a formatted summary', () => {
  wrap(
    <Sparkline label="Contacts per day" values={[3, null, 12, 5]} formatValue={(n) => `#${n}`} />,
  );
  expect(
    screen.getByRole('img', { name: 'Contacts per day: from #3 to #5, low #3, high #12' }),
  ).toBeInTheDocument();
});

it('defaults number formatting to the locale', () => {
  wrap(<Sparkline label="Deals" values={[1000, 2500]} />);
  expect(
    screen.getByRole('img', { name: 'Deals: from 1,000 to 2,500, low 1,000, high 2,500' }),
  ).toBeInTheDocument();
});

it('names an empty series "no data" and draws nothing', () => {
  stubWidth(120);
  const { container } = wrap(<Sparkline label="Tasks" values={[null, null]} />);
  expect(screen.getByRole('img', { name: 'Tasks: no data' })).toBeInTheDocument();
  expect(container.querySelector('path, rect, circle')).toBeNull();
});

it('draws a stroke path and end dot for line, a fill too for area, rects for bar', () => {
  stubWidth(120);
  const { container, rerender } = wrap(<Sparkline label="L" values={[1, 3, 2]} />);
  expect(container.querySelectorAll('path')).toHaveLength(1);
  expect(container.querySelector('circle')).not.toBeNull();
  rerender(
    <I18nProvider locale="en">
      <Sparkline label="L" values={[1, 3, 2]} type="area" />
    </I18nProvider>,
  );
  expect(container.querySelectorAll('path')).toHaveLength(2);
  rerender(
    <I18nProvider locale="en">
      <Sparkline label="L" values={[1, 3, 2]} type="bar" />
    </I18nProvider>,
  );
  expect(container.querySelectorAll('rect')).toHaveLength(3);
  expect(container.querySelector('circle')).toBeNull();
});

it('hides the svg from assistive tech', () => {
  stubWidth(120);
  const { container } = wrap(<Sparkline label="L" values={[1, 2]} />);
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
});

it('forwards ref, merges className, and keeps its img contract over consumer props', () => {
  const ref = { current: null as HTMLDivElement | null };
  wrap(
    <Sparkline
      ref={ref}
      label="L"
      values={[1, 2]}
      className="mine"
      role="presentation"
      aria-label="override"
      data-testid="spark"
    />,
  );
  const root = screen.getByTestId('spark');
  expect(ref.current).toBe(root);
  expect(root).toHaveClass('mine');
  expect(root).toHaveAttribute('role', 'img');
  expect(root).toHaveAccessibleName('L: from 1 to 2, low 1, high 2');
});
```

Run → FAIL (component missing).

- [ ] **Step 6: Component tokens + styles.**

`Sparkline.tokens.scss`:

```scss
// Sparkline.tokens.scss — component tokens for <Sparkline>.
:root {
  --sparkline-height: var(--size-sparkline);
  --sparkline-color: var(--color-accent);
  --sparkline-area-fill: var(--color-accent-subtle-bg);
  --sparkline-line-width: var(--border-width-emphasis);
}
```

`Sparkline.module.scss`:

```scss
@use './Sparkline.tokens';

.root {
  width: 100%;
  height: var(--sparkline-height);
}

.svg {
  display: block;
  overflow: visible;
}

.line {
  fill: none;
  stroke: var(--sparkline-color);
  stroke-width: var(--sparkline-line-width);
  stroke-linecap: round;
  stroke-linejoin: round;
}

.area {
  fill: var(--sparkline-area-fill);
}

.bar,
.dot {
  fill: var(--sparkline-color);
}
```

- [ ] **Step 7: Component** — `Sparkline.tsx`:

```tsx
import { forwardRef, useLayoutEffect, useMemo, useState, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { useLocale, useTranslation } from '../../i18n';
import { mergeRefs } from '../_internal/refs';
import {
  layoutSparkline,
  summarize,
  SPARKLINE_DOT_RADIUS,
  type SparklineType,
} from './sparklineModel';
import styles from './Sparkline.module.scss';

export type { SparklineType };

export interface SparklineProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** What the series is, e.g. "Contacts per day". Starts the accessible name. */
  label: string;
  /** Values oldest → newest. `null` (or a non-finite number) = no data for that slot: a gap in a line/area, no bar. */
  values: readonly (number | null)[];
  /**
   * Mark type. Default `'line'`.
   * - `'line'` — smoothed line with a dot on the latest value. Trends of a rate or level.
   * - `'area'` — the line over a filled area anchored at zero. Volumes / counts over time.
   * - `'bar'` — one bar per value. Discrete per-period counts (daily signups).
   */
  type?: SparklineType;
  /** Formats numbers in the accessible summary. Default: `Intl.NumberFormat` for the current locale. */
  formatValue?: (n: number) => string;
}

function useWidth() {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setWidth(Math.floor(el.getBoundingClientRect().width));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, width] as const;
}

/**
 * Compact, static, axis-free trend graphic (line / area / bar) for KPI cards.
 * @see docs/components/Sparkline.md
 */
// {...rest} FIRST (Pattern B) so role="img" and the summary name always win.
export const Sparkline = forwardRef<HTMLDivElement, SparklineProps>(function Sparkline(
  { label, values, type = 'line', formatValue, className, ...rest },
  ref,
) {
  const t = useTranslation();
  const locale = useLocale();
  const [measureRef, width] = useWidth();
  // Height is the token's; read it from the box so the SVG matches the CSS.
  const [height, setHeight] = useState(0);

  const format = useMemo(
    () => formatValue ?? ((n: number) => new Intl.NumberFormat(locale).format(n)),
    [formatValue, locale],
  );
  const summary = summarize(values);
  const name = summary
    ? t('sparkline.summary', {
        label,
        first: format(summary.first),
        last: format(summary.last),
        min: format(summary.min),
        max: format(summary.max),
      })
    : t('sparkline.noData', { label });

  const geometry = useMemo(
    () => layoutSparkline(values, type, width, height),
    [values, type, width, height],
  );

  return (
    <div
      {...rest}
      ref={mergeRefs(ref, measureRef, (el: HTMLDivElement | null) => {
        if (el) setHeight(Math.floor(el.getBoundingClientRect().height));
      })}
      className={clsx(styles.root, className)}
      role="img"
      aria-label={name}
    >
      <svg
        className={styles.svg}
        width={width}
        height={height}
        aria-hidden="true"
        focusable="false"
      >
        {geometry?.area && <path className={styles.area} d={geometry.area} />}
        {geometry?.line && <path className={styles.line} d={geometry.line} />}
        {geometry?.bars?.map((b, i) => (
          <rect key={i} className={styles.bar} x={b.x} y={b.y} width={b.width} height={b.height} />
        ))}
        {geometry?.dot && (
          <circle
            className={styles.dot}
            cx={geometry.dot.cx}
            cy={geometry.dot.cy}
            r={SPARKLINE_DOT_RADIUS}
          />
        )}
      </svg>
    </div>
  );
});
```

Implementation notes for the implementer:

- `mergeRefs` with an inline callback recreates the ref each render; if that causes a measure loop, hoist height measurement into `useWidth` instead (measure `{ width, height }` like Chart's `useSize` in `src/components/Chart/Chart.tsx:134`). Prefer that: replace `useWidth` with a `useSize` that returns both, and drop the inline callback. Keep behaviour identical.
- Check the `t()` call signature against `select.createOption` usage (`t('select.createOption', { label: opt.label })`).
- jsdom: `getBoundingClientRect` returns zeros by default, so the "summary name" tests pass without the width stub (nothing drawn).

`index.ts`:

```ts
export { Sparkline } from './Sparkline';
export type { SparklineProps, SparklineType } from './Sparkline';
```

`src/index.ts` (after the Chart export block):

```ts
export { Sparkline } from './components/Sparkline';
export type { SparklineProps, SparklineType } from './components/Sparkline';
```

- [ ] **Step 8: Run** `npx vitest run src/components/Sparkline src/publicApi.test.ts` → PASS; `npx tsc --noEmit -p .` and `npx stylelint "src/components/Sparkline/*.scss"` clean; `npx prettier --write src/components/Sparkline src/i18n src/index.ts`.

- [ ] **Step 9: Commit**

```bash
git add -A packages/design-tokens packages/design-system/src
git commit -m "feat(Sparkline): static line/area/bar trend for KPI cards (#642)"
```

---

### Task 2: StatTile `sparkline` slot + DashboardWidget kpi coverage

**Files:**

- Modify: `packages/design-system/src/components/StatGroup/StatTile.tsx`
- Modify: `packages/design-system/src/components/StatGroup/StatTile.module.scss`
- Test: the existing StatTile/StatGroup test file in `src/components/StatGroup/` (find it with `ls`)
- Test: `packages/design-system/src/components/DashboardWidget/DashboardWidget.test.tsx`

**Interfaces:**

- Consumes: `Sparkline` from `../Sparkline`; CSS var `--size-sparkline`.
- Produces: `StatTileProps.sparkline?: ReactNode`.

- [ ] **Step 1: Failing tests.** In the StatTile test file (reuse its existing render helper / I18nProvider wrapping and how it renders `StatGroup loading`):

```tsx
it('renders the sparkline slot after the trend, before the footnote', () => {
  render(
    <StatGroup label="KPIs">
      <StatTile
        label="Contacts"
        value="1,204"
        trend={{ label: '+4%', direction: 'up' }}
        sparkline={<Sparkline label="Contacts per day" values={[1, 2, 3]} />}
        footnote="Last 90 days"
      />
    </StatGroup>,
  );
  const spark = screen.getByRole('img', { name: /^Contacts per day:/ });
  const foot = screen.getByText('Last 90 days');
  expect(spark.compareDocumentPosition(foot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it('shows a sparkline-height skeleton instead of the slot while loading', () => {
  const { container } = render(
    <StatGroup label="KPIs" loading>
      <StatTile label="Contacts" value="1" sparkline={<Sparkline label="S" values={[1]} />} />
    </StatGroup>,
  );
  expect(screen.queryByRole('img', { name: /^S:/ })).toBeNull();
  expect(container.querySelector('[data-stat-sparkline-skeleton]')).not.toBeNull();
});
```

(Adapt `StatGroup` props — `label`, `loading` — to its real API; read `StatGroup.tsx` first.)

In `DashboardWidget.test.tsx`:

```tsx
it('kpi renders a Sparkline passed as children inside the kpi body (#642)', () => {
  render(
    <DashboardWidget variant="kpi" title="Contacts" value="1,204">
      <Sparkline label="Contacts per day" values={[1, 2, 3]} />
    </DashboardWidget>,
  );
  expect(screen.getByRole('img', { name: /^Contacts per day:/ })).toBeInTheDocument();
});
```

(Match the file's existing render wrapper and required props.) Run → the StatTile tests FAIL.

- [ ] **Step 2: Implement.** In `StatTileProps` after `footnote`:

```ts
  /**
   * Trend graphic under the value/trend, typically `<Sparkline label=… values=… />`.
   * Replaced by a sparkline-height skeleton while the group is loading.
   */
  sparkline?: ReactNode;
```

Destructure `sparkline`; in the loading branch, after the trend skeleton:

```tsx
{
  sparkline != null && (
    <div className={styles.sparkline} data-stat-sparkline-skeleton="">
      <Skeleton variant="rect" height="var(--size-sparkline)" />
    </div>
  );
}
```

(Check `SkeletonVariant` for the rectangle variant's real name and whether `height` accepts a CSS string — it is typed `number | string`.) In the loaded branch between trend and footnote:

```tsx
{
  sparkline != null && <div className={styles.sparkline}>{sparkline}</div>;
}
```

`StatTile.module.scss`:

```scss
.sparkline {
  min-width: 0;
}
```

Run both test files → PASS. tsc + stylelint clean.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(StatTile): sparkline slot (#642)"
```

---

### Task 3: Docs, primer, manifest, playground demo

**Files:**

- Create: `packages/design-system/docs/components/Sparkline.md`
- Modify: `packages/design-system/AI-PRIMER.md` (index line after the Chart line ~176)
- Modify: `packages/design-system/docs/components/StatTile.md`, `docs/components/DashboardWidget.md` (one usage line each)
- Modify: `packages/design-system/src/_meta/manifest.ts` and `packages/design-system/scripts/generate-manifest.mjs` (`Sparkline: 'Display',` next to `Chart`)
- Create: `packages/playground/src/pages/components/SparklineDemo.tsx`
- Modify: `packages/playground/src/App.tsx`, `src/layout/AppShell/navItems.ts`, `src/pages/components/ComponentsIndex.tsx`, `src/pages/components/overviewSchematics.tsx`, `src/pages/mockups/registry.ts`
- Modify: `packages/playground/src/pages/components/StatGroupDemo.tsx` (one tile with a sparkline)

- [ ] **Step 1: Doc** `docs/components/Sparkline.md` — follow `docs/components/Chart.md` structure (title line, TL;DR paragraph, canonical snippet, "When NOT to use", `<!-- props:start -->` / `<!-- props:end -->` markers for the generator). Content:
  - TL;DR: static, axis-free trend, intrinsic `--size-sparkline` (40px) height, full width; `role="img"` named "{label}: from {first} to {last}, low {min}, high {max}" (via `formatValue`); null/non-finite = gap; area/bar anchor at zero for non-negative data; no animation.
  - Snippets: standalone; inside `<StatTile sparkline={…}>`; inside `<DashboardWidget variant="kpi">` as children.
  - When NOT to use: values someone must read or compare exactly, axes/dates, multiple series, interactive inspection → `Chart`. Don't wrap it in `Constrain`; don't pass `role`/`aria-label` (ignored — name is derived).
    Then run `npm run build:docs` in `packages/design-system`.
- [ ] **Step 2: Primer line:** `- [\`Sparkline\`](docs/components/Sparkline.md) — compact static line / area / bar trend for KPI cards (StatTile slot, kpi DashboardWidget child); no axes, summary in the accessible name`
- [ ] **Step 3: Manifest:** add `Sparkline: 'Display',` in both maps, run `npm run build:manifest` (in `packages/design-system`).
- [ ] **Step 4: Demo** `SparklineDemo.tsx`, modelled on `ChartDemo.tsx` / `StatGroupDemo.tsx` (same `DemoLayout` + `Example` + `getComponentFiles` pattern, `componentName="Sparkline"`). Examples: the three types side by side in fixed-width (`Constrain` width or a `Grid`) cards over a deterministic 90-value series (generate with a seeded formula, e.g. `Math.round(40 + 20 * Math.sin(i / 7) + (i % 5) * 3)`); gaps (`null`s); flat; negative bars; StatGroup with four sparkline tiles (the Usage-tab case); a `DashboardWidget variant="kpi"` with a Sparkline child inside a `DashboardCanvas` if the existing demos show how, else a standalone widget. Wire: App route `/components/sparkline`; navItems entry next to Chart (lucide icon `ChartSpline` or `Activity` — use whatever lucide-react exports in the installed version); ComponentsIndex card next to Chart; `SCHEMATICS['Sparkline']` (a tiny SVG polyline in the existing schematic style); `'Sparkline'` in the `ComponentName` union.
- [ ] **Step 5:** add `sparkline={<Sparkline … />}` to one tile in `StatGroupDemo.tsx`.
- [ ] **Step 6: Verify** from repo root: `npm test` (exit code 0), `npx tsc --noEmit -p packages/playground` (or the playground's typecheck script), `npm run lint` if present; prettier on touched files.
- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs+playground: Sparkline docs, manifest, demo (#642)"
```
