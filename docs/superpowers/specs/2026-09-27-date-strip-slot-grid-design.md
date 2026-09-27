# DateStrip + SlotGrid — design

Issues: #560 (DateStrip), #561 (SlotGrid). Consumer: eocrm `apps/customer-web`
booking time step (`BookTime.dc.html`, `MobileTime.dc.html`). Replaces the shims
`apps/customer-web/src/shared/ds-shims/DateStrip.tsx` and `SlotGrid.tsx`.

## Goal

Two independent, controlled, single-choice pickers:

- **DateStrip** — one week of selectable day tiles (weekday, day number,
  availability count) under a month heading with previous/next week buttons.
- **SlotGrid** — selectable time-slot tiles grouped by part of the day, with an
  empty state.

Success = eocrm deletes both shims and swaps to the DS with call-site changes
limited to the data shape below.

## Decisions (user-approved)

1. **Radio semantics, not toggle buttons.** Choosing one of N is a radio group.
   Implemented with **native `<input type="radio">`** sharing one `name`,
   grouped by `<fieldset>`/`<legend>`. The platform gives: one Tab stop per
   component, arrow keys move + select, disabled radios skipped by Tab and
   arrows, one exclusive choice across several fieldsets, form participation.
   No roving-tabindex code. Known ceiling: arrows are linear (↓ in SlotGrid's
   grid moves to the next slot, not the one below) — native behavior, accepted.
   This deliberately diverges from the shim's `aria-pressed` contract; eocrm
   tests query `role="radio"`.
2. **DateStrip takes ISO date strings** (`'YYYY-MM-DD'`); the DS formats
   weekday / day / month through the locale with `Intl.DateTimeFormat` using
   `timeZone: 'UTC'` (dates parsed as UTC midnight), so the browser's timezone
   can never shift a day. `value` / `onChange` use the same string.
3. **SlotGrid slot labels stay consumer-formatted** — times belong to the
   business's timezone, which the DS cannot know.
4. **Heading levels are props** (`titleOrder`), following `FormSection`.
5. **Narrow layouts use container queries** on the component's own width, not
   the viewport (components don't depend on page layout).
6. **Controlled only** (`value` + `onChange`).

Out of scope (YAGNI): per-slot `disabled`, a `loading` state (consumer renders
`<Skeleton>`), a combined `SlotPicker`, 2D arrow navigation.

## DateStrip

```ts
export interface DateStripDay {
  /** Calendar day, `'YYYY-MM-DD'`. */
  date: string;
  /** Free times that day. `0` → "No times", tile disabled. */
  free: number;
}

export interface DateStripProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'onChange'
> {
  days: DateStripDay[]; // usually 7
  value: string | null;
  onChange: (date: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  canPrevious?: boolean; // default true
  canNext?: boolean; // default true
  titleOrder?: TitleOrder; // default 2
  name?: string; // radio group name, default useId()
}
```

Markup (ref → `<fieldset>`, `{...props}` spread on it):

```
<fieldset class="root" aria-labelledby={titleId}>
  <div class="header">
    <Title id={titleId} order={titleOrder}>October 2026</Title>
    <Cluster> <Button iconOnly size="lg" variant="secondary" aria-label=t(previousWeek) disabled={!canPrevious}/>
              <Button iconOnly size="lg" variant="secondary" aria-label=t(nextWeek) disabled={!canNext}/> </Cluster>
  </div>
  <div class="tiles">            ← 7-column grid
    <label class="tile">          ← one per day
      <input type="radio" class="input" name value=date checked disabled={free===0}
             onChange → onChange(date) />
      <span aria-hidden>  <span dow>Wed</span> <span num>7</span> <span count>9 free | No times</span> </span>
      <VisuallyHidden>Wednesday, October 7, 9 free</VisuallyHidden>
    </label>
  </div>
  <LiveRegion>{announcement}</LiveRegion>
</fieldset>
```

No `<legend>` here: a legend only renders as one when it is the fieldset's
first child and is laid out specially (it can't share a flex row with the
buttons). The group is named by the month `<Title>` via `aria-labelledby`
(`titleId` from `useId()`); a consumer `aria-label` / `aria-labelledby` in
`{...props}` spreads before and is overridden — the month label is the contract.

- **Month label**: `Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).formatRange(first, last)`
  → "October 2026" or "September – October 2026" (and across years). Empty
  `days` → no label text.
- **Tile name** (visually hidden text inside the label, visual body
  `aria-hidden`): `{weekday long, month long, day numeric}, {availability}` —
  e.g. "Wednesday, October 7, 9 free" / "Saturday, October 10, No times".
  Composed via `t('dateStrip.day', { date, availability })` so locales control
  order and punctuation.
- **Count visibility**: count text hidden visually when the strip's container
  is ≤ 30rem (`container-type: inline-size` on `.tiles`' parent); name keeps it.
- **Week-change announcement** (Rule 10: a change after activation, focus stays
  on the button): an always-mounted `<LiveRegion>`; its text is set in an
  effect when the first day's `date` changes after mount, to
  `t('dateStrip.range', { range })` where `range` is the `formatRange` of the
  first/last day with `{ month: 'long', day: 'numeric' }` ("October 12 – 18").
  Silent on first paint.
- `value` not in `days` → nothing checked (valid).

## SlotGrid

```ts
export interface SlotGridSlot {
  key: string;
  label: string;
}
export interface SlotGridGroup {
  label: string;
  slots: SlotGridSlot[];
}

export interface SlotGridProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  groups: SlotGridGroup[];
  value: string | null;
  onChange: (key: string) => void;
  empty?: ReactNode; // default t('slotGrid.empty')
  titleOrder?: TitleOrder; // default 3
  name?: string; // default useId()
}
```

Markup (ref → root `<div>`, `{...props}` spread on it):

```
<div class="root">
  <fieldset class="group">  ← per group with ≥1 slot
    <legend><Title order={titleOrder} size="sm">Morning</Title></legend>
    <div class="tiles">       ← 6 columns; 3 when container ≤ 48rem
      <label class="tile"><input type="radio" class="input" name value=key checked .../>{slot.label}</label>
    </div>
  </fieldset>
</div>
```

- All radios share `name` → one Tab stop and one exclusive choice across all
  groups (native behaviour for same-name radios across fieldsets).
- Groups with no slots are not rendered. If no group has slots, the root
  renders `empty` (default: `<Text tone="muted">{t('slotGrid.empty')}</Text>`).
- Group name = legend text (the issue's `aria-labelledby` contract, natively).

## Shared tile styling

`src/components/_internal/choiceTile.scss` mixin used by both modules:

- The `<label>` is the tile; the `<input>` is visually hidden (still focusable).
- Unchecked = Button `secondary` look; `:has(:checked)` = Button `primary` look;
  `:has(:focus-visible)` = focus ring; `:has(:disabled)` = disabled look, no
  pointer; hover on enabled tiles.
- Component tokens (`DateStrip.tokens.scss`, `SlotGrid.tokens.scss`) default to
  the Button tokens, so theming Button themes the tiles.
- Tiles stretch to their grid cell (`width: 100%` of intrinsic is allowed);
  the grids are the components' own internal layout.

## i18n (`messages.ts`, `en.ts`, `ru.ts`)

| key                                   | en                                                  |
| ------------------------------------- | --------------------------------------------------- |
| `dateStrip.previousWeek`              | Previous week                                       |
| `dateStrip.nextWeek`                  | Next week                                           |
| `dateStrip.free({count})`             | `${count} free` (ru: 3 plural forms via `ruPlural`) |
| `dateStrip.noTimes`                   | No times                                            |
| `dateStrip.day({date, availability})` | `${date}, ${availability}`                          |
| `dateStrip.range({range})`            | `${range}` (announcement; locales may prefix)       |
| `slotGrid.empty`                      | No available times                                  |

## Completeness (root CLAUDE.md invariant)

Both components: `<Name>.test.tsx`, playground demo + route + `navItems.ts` +
`ComponentsIndex.tsx` + `overviewSchematics.tsx` + `ComponentName` union,
`src/index.ts` exports (component + types), JSDoc with `@remarks` When NOT to
use / Anti-patterns, AGENTS.md TL;DR, `CLUSTERS` entries in both manifest maps

- `npm run build:manifest`, `npm run build:props` in playground.

## Testing

- Rule 1 checklist (render, ref → fieldset/div, className merge, spread props).
- Controlled round-trip: click a tile → `onChange(date|key)`; `value` checks it.
- DateStrip: `free: 0` → radio disabled + "No times"; tile accessible name
  exact (jsdom probe via `getByRole('radio', { name })`); prev/next call
  handlers and respect `canPrevious`/`canNext`; month label single-month,
  cross-month, cross-year; UTC safety (a pure `parseIsoDay` + formatter
  helper, unit-tested so '2026-10-07' always formats as the 7th — the format
  call pins `timeZone: 'UTC'`); ru plural forms;
  live region empty on mount, announces after `days` change.
- SlotGrid: groups render legends naming fieldsets (`getByRole('group', { name })`);
  all radios share one name; empty groups skipped; `empty` default + custom;
  `titleOrder` changes heading level.
- Visual check in the playground at 8090 (tiles, checked, disabled, focus ring,
  narrow container) before PR — user reviews the demo.
