# `<RelativeDateInput>` — editor for a relative date or date-range expression

Edits one expression **string** (`today+7d`, `last:30d`, `this:quarter:to_date`) that the eocrm server resolves to real dates at use time: list filters, saved views, dashboard periods, automation conditions, custom-field defaults. It is controlled: `value` in, `onChange` out.

```tsx
import { useState } from 'react';
import { Button, Cluster, Field, RelativeDateInput } from '@eocrm/design-system';

// Point: anchor + signed offset, or an exact date ("Exact date" switch).
const [due, setDue] = useState<string | null>('today+7d');
<RelativeDateInput mode="point" value={due} onChange={setDue} aria-label="Due date" />;

// Point on a datetime field: adds the Now anchor, hour/minute offsets and a minute-precision exact datetime.
<RelativeDateInput
  mode="point"
  allowNow
  value={due}
  onChange={setDue}
  aria-label="Created after"
/>;

// Range, with presets (toggle buttons; the one equal to `value` is pressed).
const [period, setPeriod] = useState<string | null>('last:7d');
<RelativeDateInput
  mode="range"
  value={period}
  onChange={setPeriod}
  presets={[
    { label: 'Last 30 days', value: 'last:30d' },
    { label: 'Last 7 days', value: 'last:7d' },
    { label: 'This month', value: 'this:month' },
    { label: 'Quarter to date', value: 'this:quarter:to_date' },
  ]}
  aria-label="Period"
/>;

// Inside a Field with an error.
<Field label="Due date" error="Pick a due date">
  <RelativeDateInput mode="point" invalid value={due} onChange={setDue} />
</Field>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `mode` | `'range' \| 'point'` | yes | What the expression describes. - `'point'` — one date: an anchor (today, now, start/end of a period) plus a signed offset, or an exact date. - `'range'` — a date range: last/next N units, a whole this/last/next period, or a period to date. |
| `allowNow` | `boolean` | no | Datetime fields: offers the Now anchor with hour/minute offsets, and a minute-granular exact date (UTC `YYYY-MM-DDTHH:mm:ssZ`). Default `false`. |
| `value` | `string \| null` | yes | The controlled expression (see the grammar in the docs), or `null` for none. `null` shows the defaults (`today` / `this:month`) without emitting them. A value that doesn't parse shows the defaults plus an "Unrecognised value" note. |
| `onChange` | `(expr: string \| null) => void` | yes | Fires with the next canonical expression after a valid edit, and only when it differs from `value`. Invalid drafts (an out-of-range amount, an exact date not yet picked) never fire it. |
| `presets` | `readonly RelativeDatePreset[]` | no | Quick-pick toggle buttons rendered above the controls. The one whose `value` equals `value` is pressed. |
| `disabled` | `boolean` | no | Disables every control, presets included. Default `false`. |
| `invalid` | `boolean` | no | Error chrome on the controls (`aria-invalid`), e.g. from `<Field error>`. Default `false`. |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

## How it behaves

- **Point mode:** an anchor (Today, Now with `allowNow`, Start/End of this/last/next week/month/quarter/year), a sign, an amount, a unit, and an **Exact date** switch that swaps the relative controls for a `DatePicker`.
- **Range mode:** a kind (**Past**, **Coming**, **Calendar period**, **Period to date**) followed by an amount + unit (Past / Coming) or a period (the rest). Whole periods read as composed labels such as "This week" and "Month to date".
- **Only valid expressions are emitted.** An out-of-range or non-integer amount shows an inline error and does not call `onChange` until it is valid. `onChange` also does not fire when the edit would produce the current `value`.
- **It never emits `null`.** `null` _in_ means "no value" and shows the defaults (`today` / `this:month`) without emitting them. To let users clear a filter, give them your own chip or reset button that sets your state to `null` (see the "Clearing" pattern below).
- **An unrecognised incoming `value`** (one that does not parse in this `mode` / `allowNow`) shows the defaults plus an "Unrecognised value: …" note and emits nothing until the user edits.
- **Presets** are toggle buttons (`aria-pressed`); choosing one emits its `value`. Their `label` is yours (translate it yourself).
- `allowNow` gates three things together: the `now` anchor, the `h` / `min` units (only on `now`), and a minute-precision exact datetime in UTC (`YYYY-MM-DDTHH:mm:ssZ`).

```tsx
// Clearing is the consumer's job: the control never emits null.
<Cluster align="center">
  <RelativeDateInput mode="range" value={period} onChange={setPeriod} aria-label="Period" />
  {period !== null && (
    <Button variant="ghost" onClick={() => setPeriod(null)}>
      Clear
    </Button>
  )}
</Cluster>
```

## Grammar

The canonical strings the component reads and writes. Anything else does not parse.

<!-- prettier-ignore -->
| Mode | Expression | Meaning |
|---|---|---|
| point | `today` | Today |
| point | `now` | Now (`allowNow` only) |
| point | `start:{this\|last\|next}:{week\|month\|quarter\|year}` | Start of the period; `end:…` for the end |
| point | anchor `{+\|-}{N}{unit}` | Offset, N 0–1000: `today+7d`, `now-30min`, `end:next:quarter+1d` |
| point | `YYYY-MM-DD` | Exact date |
| point | `YYYY-MM-DDTHH:mm:ssZ` | Exact UTC datetime (`allowNow` only) |
| range | `last:{N}{d\|w\|mo\|y}` / `next:{N}{d\|w\|mo\|y}` | Rolling past / coming, N 1–1000: `last:30d` |
| range | `{this\|last\|next}:{week\|month\|quarter\|year}` | Whole calendar period: `this:week` |
| range | `this:{week\|month\|quarter\|year}:to_date` | Period to date: `this:month:to_date` |

Units are `d` (days), `w` (weeks), `mo` (months), `y` (years), `h` (hours), `min` (minutes). `h` and `min` are valid only on the `now` anchor. **These spellings must match the eocrm server**; the component and the server parse the same strings. Absolute values are not part of the range grammar.

`parseRelativeDate(expr, { mode, allowNow })` returns a structured `RelativeDateValue`, or `null` if `expr` is not valid; `formatRelativeDate(value)` returns the canonical string. They round-trip every canonical expression.

## When NOT to use

- **Absolute-only dates.** If the user is picking a fixed calendar date or range and nothing relative, use `DatePicker` / `DateRangePicker` (or the inline variants).
- **Displaying a resolved date.** This edits the expression; it does not show what it resolves to (that is the server's job).
- **Custom anchors or business days.** Not supported.
