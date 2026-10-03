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
