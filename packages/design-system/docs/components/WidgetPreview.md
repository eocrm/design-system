# `<WidgetPreview>` — decorative miniature of a widget kind

A data-free, purely decorative miniature of a dashboard widget kind (KPI, list, chart, pipeline, activity). Built for the `preview` slot of `CatalogPicker` items so users can see what a widget looks like before adding it. Always `aria-hidden`; the surrounding card's title names the item.

```tsx
import { CatalogPicker, WidgetPreview } from '@eocrm/design-system';

<CatalogPicker
  label="Widget catalog"
  items={[
    {
      id: 'open-deals',
      title: 'Open deals',
      preview: <WidgetPreview variant="kpi" />,
    },
    {
      id: 'revenue',
      title: 'Revenue',
      preview: <WidgetPreview variant="chart" />,
    },
  ]}
  onSelect={(id) => addWidget(id)}
/>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `variant` | `'kpi' \| 'list' \| 'chart' \| 'pipeline' \| 'activity'` | yes | Which widget kind the miniature depicts. Required. - `'kpi'` — label, a large value block (strong accent), an accented trend line. - `'list'` — rows of accented avatar + line; first avatar strong. - `'chart'` — a bar series (accented, one bar strong). - `'pipeline'` — stage columns of cards; current stage header strong, its cards accented. - `'activity'` — timeline rows with accented dots; first dot strong. |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

- **Five variants**, pick one via `variant` (required): `kpi` (label, large value, trend line), `list` (avatar + line rows), `chart` (bar series), `pipeline` (stage columns of cards), `activity` (timeline rows with dots).
- **Always `aria-hidden="true"`.** The attribute is applied after your props, so it cannot be overridden. It conveys nothing to assistive tech; put the information in the item's `title` / `description`.
- **Data-free.** It takes no values. It depicts a kind of widget, never a real one.
- **Fills its container width** with a fixed 16 / 10 aspect ratio. Size it by sizing the parent (the picker card does this).
- Colours come from theme tokens, so dark mode follows automatically. Neutral pieces use `--color-border-strong` on the preview box (`--color-bg-subtle`). Accented pieces use `--color-accent` at half strength, and one hero piece per variant uses it at full strength. To retune, override `--widget-preview-bg`, `--widget-preview-shape`, `--widget-preview-accent` and `--widget-preview-accent-strong` on an ancestor. The defaults are high-contrast, so a local override added only for visibility is no longer needed.

#### When NOT to use

- ❌ A loading placeholder → `<DashboardWidget loading>` (variant-matched skeleton with the correct accessible text).
- ❌ Real data visualisation. It is a picture of a layout, not a chart.
- ❌ Anything a screen reader user must perceive. It is hidden from them by design.

#### Anti-patterns

- ❌ Expecting the preview to convey information to screen readers. Name and describe the item through `title` / `description`.
- ❌ Putting interactive content or text inside it; it is a leaf graphic.
- ❌ Using it outside a catalog or gallery context as general decoration.
