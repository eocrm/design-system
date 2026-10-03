# `<FilterChip>` — dismissible "active filter" pill

```tsx
<FilterChip onDismiss={() => removeFilter('event')}>
  <FilterChip.Label>Event</FilterChip.Label>
  <FilterChip.Value tone="info">auth.* (3)</FilterChip.Value>
</FilterChip>

// Value-only chip (no label slot):
<FilterChip onDismiss={() => removeFilter('tenant')}>
  <FilterChip.Value>beta</FilterChip.Value>
</FilterChip>

// Read-only chip (no dismiss button):
<FilterChip>
  <FilterChip.Label>Status</FilterChip.Label>
  <FilterChip.Value>Active</FilterChip.Value>
</FilterChip>
```

<!-- props:start -->

## Props

### `FilterChipProps`

| Prop           | Type           | Required | Default | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------- | -------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `onDismiss`    | `(() => void)` | no       | —       | Dismiss callback. When provided, the chip renders a trailing `×` button wired to this handler; the chip itself does NOT animate or unmount — the consumer's state update must remove the chip. Omit the prop to render a read-only chip with no dismiss button.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `dismissLabel` | `string`       | no       | —       | Override the dismiss button's `aria-label`. Defaults to the i18n value at `filterChip.dismiss` (`'Remove filter'` in English) when omitted OR empty — an empty string is not an explicit name, so it takes the default too. Pass a contextual label (e.g., `'Remove Event: auth.* filter'`) when the chip's filter category isn't obvious from the surrounding screen-reader context.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `onActivate`   | `(() => void)` | no       | —       | Makes the chip BODY interactive: when provided, the Label/Value content is wrapped in a `<button>` that fires `onActivate` on click and Enter/Space (native button keyboard). Use for _editable_ filters — e.g. a date-range chip whose body re-opens its range-picker. Wire it to a controlled `<Popover open onOpenChange>` to open an editor popover. The dismiss ✕ stays a separate button whose click stops propagation, so removing the filter never fires `onActivate` (and never bubbles to an ancestor click handler). Omit for a read-only chip (current behavior). Controlled-only: FilterChip does NOT consume `Popover.Trigger`'s injected ref/ARIA, so wrapping it in `<Popover.Trigger>` won't auto-wire it — drive the popover's `open` yourself from this callback (see the example above). |
| `expanded`     | `boolean`      | no       | —       | Open state of the disclosure the body opens (e.g. the editor popover), surfaced as `aria-expanded` on the body button. Only meaningful with `onActivate`. Omit if the body doesn't toggle a disclosure.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `children`     | `ReactNode`    | yes      | —       | One or two `FilterChip.Label` / `FilterChip.Value` subcomponents. Use both for `Label: Value` chips; pass just a Value for chips where the category is implicit (e.g., a tenant slug).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| …native        |                |          |         | plus native `<div>` attributes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

### `FilterChipLabelProps`

| Prop       | Type        | Required | Default | Description                                                                                                                                                   |
| ---------- | ----------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `children` | `ReactNode` | yes      | —       | The category text — typically a noun describing the filter dimension (`Event`, `Tenant`, `Stage`, `Owner`). Rendered muted so the Value is the visual anchor. |
| …native    |             |          |         | plus native `<span>` attributes                                                                                                                               |

### `FilterChipValueProps`

| Prop       | Type           | Required | Default | Description                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | -------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color`    | `PaletteColor` | no       | —       | Optional full `PaletteColor` (one of the 30 named categorical colors) for the leading dot. Use when the 6 semantic tones aren't enough to distinguish filter categories (e.g., per-tenant or per-tag color coding that matches an `OptionsPicker` group). Takes precedence over `tone` when both are set. Renders a bare `<Dot>` in that color.                                                 |
| `tone`     | `BadgeTone`    | no       | —       | Optional dot tone. When set, prefixes a 6px colored circle before the value text — use to distinguish filter categories that share a screen (e.g., event filters get a tone-matched dot, tenant filters get no dot). Reuses Badge's tone palette: `neutral`, `info`, `success`, `warning`, `danger`, `purple`. Omit for plain text values. For a richer categorical color, use `color` instead. |
| `children` | `ReactNode`    | yes      | —       | The value text — what the filter is actually filtering by (`auth.*`, `beta`, `Won`). Pair with an optional `tone` / `color` dot to categorize.                                                                                                                                                                                                                                                  |
| …native    |                |          |         | plus native `<span>` attributes                                                                                                                                                                                                                                                                                                                                                                 |

<!-- props:end -->

- Compound API: `<FilterChip>` root + optional `<FilterChip.Label>` and `<FilterChip.Value>` children.
- `onDismiss`: when provided, the chip renders a trailing `×` button wired to this callback. Omit for a read-only chip.
- `dismissLabel`: overrides the default `'Remove filter'` `aria-label` on the dismiss button. Pass a contextual label (`'Remove Event: auth.* filter'`) for screen-reader clarity.
- `onActivate`: makes the chip BODY a `<button>` (for _editable_ filters — e.g. a date-range chip whose body re-opens its range-picker). Wire it to a controlled `<Popover open onOpenChange>` to open an editor popover. The dismiss ✕ stays a separate button whose click **stops propagation**, so removing the filter never fires `onActivate` (and never bubbles to a wrapping `Popover.Trigger` / ancestor click handler).
- `expanded`: surfaced as `aria-expanded` on the body button — pass the open state of the disclosure the body opens. Only meaningful with `onActivate`; omit if the body doesn't toggle a disclosure. The body button also carries `aria-haspopup="dialog"`.
- `<FilterChip.Value tone={...}>`: optional `tone` (same palette as `<Badge>`) prefixes a colored 6px dot (a `<Dot>`) before the value text. Or pass `color` for a full `PaletteColor` (30 categorical colors) when the 6 tones aren't enough — `color` wins over `tone`. Omit both for plain values (e.g., a tenant slug).
- **Use for active-filter pills, not tags / status badges.** If it's a status or category, use `<Badge>`. If it's a clickable filter trigger that navigates or runs an action, use `<Button>` or `<OptionsPicker.Trigger>`.
- Root carries `role="group"` so screen readers announce the chip as one unit. A read-only chip's only interactive target is the dismiss ✕; an _editable_ chip adds a body button via `onActivate`.

```tsx
// Editable chip — body re-opens an editor popover; ✕ removes the filter
const [open, setOpen] = useState(false);
<Popover open={open} onOpenChange={setOpen}>
  <Popover.Trigger>
    <FilterChip onActivate={() => setOpen((o) => !o)} expanded={open} onDismiss={remove}>
      <FilterChip.Label>Range</FilterChip.Label>
      <FilterChip.Value>Jun 1 – Jul 31</FilterChip.Value>
    </FilterChip>
  </Popover.Trigger>
  <Popover.Content maxWidth={520}>{/* range picker */}</Popover.Content>
</Popover>;
```
