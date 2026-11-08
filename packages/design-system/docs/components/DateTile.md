# `<DateTile>` — calendar-style date display

```tsx
<DateTile size="sm" date="2026-11-12" />
<DateTile layout="page" color="blue" date={new Date()} show="weekday-time" />
<DateTile surface="plain" date={event.startsAt} timeZone="Europe/Berlin" />
<DateTile date="2026-11-12" end="2026-11-14" />
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `date` | `DateTileInput` | yes | The date: a `Date`/timestamp, or a `YYYY-MM-DD` day string (no time zone shift). |
| `end` | `DateTileInput` | no | Optional range end; an end not after `date` is ignored. |
| `layout` | `'stacked' \| 'page'` | no | `'stacked'` (**default**) or `'page'`. |
| `size` | `'sm' \| 'md' \| 'lg'` | no | `'sm'` / `'md'` (**default**) / `'lg'`. `'sm'` has no bottom line. |
| `surface` | `'filled' \| 'plain'` | no | `'filled'` (**default**) or `'plain'`. |
| `show` | `'weekday' \| 'time' \| 'weekday-time'` | no | Bottom line: `'weekday'` (**default**), `'time'` or `'weekday-time'`. Time needs a `Date`/timestamp. |
| `relative` | `boolean` | no | Highlight today/ongoing, mute the past, and show Today/Tomorrow/Yesterday words. Default `true`. |
| `now` | `Date` | no | The reference "now" for `relative`. Defaults to the current time at render. |
| `timeZone` | `string` | no | IANA time zone used to resolve timestamps to a day and time. Defaults to the runtime zone. |
| `color` | `PaletteColor` | no | Palette color of the month band — `layout="page"` only, ignored for stacked. |
| …native | | | plus native `<Time>` attributes |

<!-- props:end -->

- A compact, non-interactive calendar tile: month, day and a bottom line (weekday, time, or a relative word). Renders a `<time>` with a machine-readable `dateTime`.
- Input is a `Date`/timestamp or a `YYYY-MM-DD` day string. A day string never shifts with time zones; a timestamp is resolved to a day (and time) in `timeZone` (default: the runtime zone).
- Relative states (`relative`, default `true`): today and ongoing ranges get the highlighted outline, the past is muted, and single days show Today / Tomorrow / Yesterday instead of the weekday. Ranges keep the weekday span (`Fri–Sun`), with "Ongoing" shown only in the accessible name's word. Pass `relative={false}` for static archives where nothing should highlight or mute.
- `now` sets the reference time for `relative` (tests, screenshots, server rendering); defaults to the current time at render.
- A range (`end` after `date`) shows `12–14` and a merged month; an `end` not after `date` is ignored. The year appears only when it differs from the current year.
- `show="time"` / `"weekday-time"` needs a `Date`/timestamp; with a day string it falls back to the weekday. `size="sm"` (~40px) hides the bottom line entirely.
- Invalid input (unparseable or impossible dates like `2026-02-30`) throws.
- A11y: the visual tile is `aria-hidden`; a visually hidden full date (e.g. "Today, Thursday, 12 November 2026, 14:30") is the accessible name.
- ❌ A clickable date picker — use `DatePicker` / `DateStrip`.
- ❌ Wrapping it in a `Button` just to style it as a button.
- ❌ `new Date('2026-11-12')` for an all-day date — it parses as UTC and can land on the wrong day; pass the string `'2026-11-12'`.
- ❌ A bare date in running text — use `Text` with `Intl`.
