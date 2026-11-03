# FunnelChart — design

Tracking: DS-3 (https://dpws.eocrm.io/tasks/DS-3). Visual reference: https://www.boardui.com/components/funnel-chart-card.

## Intent

The CRM needs a funnel chart: a pipeline or campaign moves through ordered stages (Leads → Qualified → Proposal → Negotiation → Won), and a sales team wants to see two things at a glance: how much survives overall, and **which step leaks**. Then they want to click through to the deals stuck at that step.

The funnel appears in two places:

- as a dashboard widget body, inside `DashboardWidget variant="chart"`;
- inline on pages (a pipeline report, a campaign detail page), with no card around it.

## What gets built

`<FunnelChart>`, a new component in `@eocrm/design-system`. It **only draws the funnel**.

The reference ships a combined "card" (title, headline number, delta chip, period picker). We don't build that. `DashboardWidget`, `Card`, `StatGroup` and the app already own those pieces, and the consumer owns the period and data fetching.

### Shape

- Stages are columns laid out left to right, in the given order (top of the funnel first).
- Each column's height is proportional to its value.
- Two shapes, chosen by `shape`:
  - `'eased'` (default): each stage holds its height, then curves smoothly (an S-curve) into the next stage's height. Mockup: flat for about 55% of the column, then the curve.
  - `'sharp'`: straight trapezoids, from this stage's height to the next stage's height.
- The funnel is vertically centred on its axis (symmetric taper), as in the mockups.

### Labels and percentages

- **Footer** under each column: the formatted value (emphasised) and the stage label.
- **Pill** centred on each column (except the first): **conversion from the previous stage**, e.g. Won 40% = 40% of Negotiation.
- **Tooltip** (on hover or focus) shows the label, the formatted value, the step conversion, and the **share of the first stage** (e.g. "4% of Leads").

### Narrow containers: vertical layout

When the **width per stage** (the chart's measured width divided by the number of stages) drops below a minimum, the funnel switches to a **vertical layout**. The width is measured with a `ResizeObserver`, like `Chart`'s `useSize`, so the switch adapts to the stage count. A fixed container breakpoint would let 8 stages collide at widths where 5 still fit.

In the vertical layout:

- stages stack top to bottom;
- each stage's width is proportional to its value, centred;
- **connected funnel** (revised by the user, replacing thin separate bands): the horizontal funnel turned on its side, following `shape`, one touching row per stage, with the label, value and pill on one line beside it;
- if the compact rows still don't fit the height, the chart **scrolls inside its own plot area**. `DashboardWidget`'s non-scrolling body contract is unchanged. This is a last resort for unusually small cells.

Nothing is hidden or truncated away at narrow widths. Every label stays readable.

### Interaction

- Hovering or focusing a stage dims the other stages and shows the tooltip.
- `onActiveStageChange(stage | null)` fires when the hovered or focused stage changes. Hover and keyboard focus behave the same. It exists so a surrounding headline or stat can follow along.
- `onStageClick(stage, index)` is optional. When provided, each stage is a real interactive control (button semantics; Enter and Space activate it). The intended use is drilling through to the deals in that stage. Without it, stages are not buttons.
- Every stage is reachable by keyboard whether or not it is clickable, so that keyboard users can inspect it.

### Accessibility

- The chart is a labelled figure (`label` prop) and is never an image-only graphic.
- A screen-reader data table lists every stage: label, value, step conversion and share of the first stage. It follows `Chart`'s `ChartTable` pattern.
- Dimming follows `Chart`'s `--chart-dim-opacity`.

### API (shape of it, not exact final names)

```ts
interface FunnelStage {
  key: string;           // stable identity (React key, callbacks)
  label: string;         // already formatted/translated by the app
  value: number;
  color?: ...;           // per-stage override, see "Builder's calls"
}

interface FunnelChartProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  label: string;                         // accessible name + table caption. Required.
  stages: FunnelStage[];                 // top of funnel first
  formatValue: (n: number) => string;    // app owns i18n/currency. Required.
  shape?: 'eased' | 'sharp';             // default 'eased'
  onStageClick?: (stage: FunnelStage, index: number) => void;
  onActiveStageChange?: (stage: FunnelStage | null) => void;
  emptyMessage?: ReactNode;              // same meaning as Chart's
  footnote?: ReactNode;                  // same meaning as Chart's
}
```

Follow `Chart`'s conventions wherever a counterpart exists: the `{...rest}` spread order, `forwardRef`, the palette tokens, the dev warnings, the empty state, the tooltip and table components (reuse the `Chart` internals where they fit, rather than forking them).

## Goals

- Show both the overall drop-off (height) and the step-by-step leak (pill) at a glance.
- Work unchanged inside a dashboard widget and inline on a page.
- Be fully usable by keyboard and screen reader.
- Allow drilling through to a stage.

## Non-goals

- Header, title, headline number, delta chip, period label or picker, `ranges` and `onRangeChange`: these belong to the consumer.
- Built-in demo data.
- A `mono` (single-ink) variant.
- Comparison periods (e.g. last month's funnel overlaid).
- A prop to force the vertical layout. The measured width per stage decides.

## Anti-goals (failure even if it "works")

- Losing information at narrow widths: truncated labels, hidden pills, sideways scrolling.
- A funnel that is only a picture, with no keyboard access and no data table.
- Duplicating `DashboardWidget`, `Card` or `StatGroup` features inside the chart.
- Raw colours or spacing in SCSS. Tokens only (see the repo's `CLAUDE.md`).

## Constraints

- The repo component invariant (root `CLAUDE.md`) applies in full: tests, playground demo plus wiring, the `index.ts` export, `docs/components/FunnelChart.md` plus the AI-PRIMER line, and `CLUSTERS` in both manifest maps.
- No new dependencies. `d3-shape` and `d3-scale` are already installed.
- Components don't own layout (design-system Rule 4).
- Pre-push review loop (design-system Hard rule 8).
- The playground demo is checked live by the user before the PR is merged.

## Builder's calls (decided by me, not by the user; flag if wrong)

- **Name:** `FunnelChart`, in the same manifest cluster as `Chart`.
- **Heights:** relative to the **largest** stage value, not the first. Out-of-order data (a later stage bigger than an earlier one) still draws without overflowing, and the pill honestly shows more than 100%.
- **Zero or tiny values:** drawn with a minimum visible thickness, so they stay hoverable and clickable.
- **Previous stage is 0:** no pill (conversion is undefined). The tooltip says "—".
- **Empty state:** no stages, or every value 0, shows `EmptyState` with `emptyMessage` (as in `Chart`).
- **Colours:** stages take palette slots 1–8 by position. More than 8 stages reuse slots, with a dev warning (as in `Chart`). The per-stage `color` override is limited to a **palette slot number** (1–8), not any CSS colour, to keep palette discipline.
- **Percent formatting:** `Intl.NumberFormat` with `style: 'percent'`, in the library's locale, rounded to whole numbers (one decimal below 1%).
- **Motion:** stages animate when data changes; the animation is skipped under `prefers-reduced-motion`.
- **Height inline:** fills its parent like `Chart` does inside a widget. When the parent gives no height, it uses an intrinsic default height from a component token.
- **Vertical switch:** measured in JS from the width per stage, not set by a CSS container query. The minimum width per stage is a component token, chosen by the builder from where footer labels collide.

## Left to the builder

- Exact path geometry for the eased curve, pill sizing, and spacing tokens.
- Whether the tooltip and table reuse `ChartTooltip` and `ChartTable` directly or need small generalisations.
- How keyboard focus moves between stages (roving tabindex versus one tab stop per stage), as long as the interaction rules above hold.
- Demo page contents: show both shapes, a narrow container, clickable stages driving an external headline via `onActiveStageChange`, and the empty state.
