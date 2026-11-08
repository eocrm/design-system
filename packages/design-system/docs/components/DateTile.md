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
| `date` | `DateTileInput` | yes | The date: a `Date`, a `'YYYY-MM-DD'` calendar day (no time zone shift), or any other string parsed as an instant. Instant strings must carry `Z` or an offset (`'2026-11-12T14:30:00Z'`); an offset-less datetime is read as device-local time, not `timeZone`. |
| `end` | `DateTileInput` | no | Optional range end; an end not after `date` is ignored. |
| `layout` | `'stacked' \| 'page'` | no | `'stacked'` (**default**) for lists and compact slots; `'page'` for event/booking cards and headers that want a calendar-page look. |
| `size` | `'sm' \| 'md' \| 'lg'` | no | `'sm'` for the leading slot of list rows (bottom line hidden, put the time beside it); `'md'` (**default**) for cards and widgets; `'lg'` for headers and hero areas. |
| `surface` | `'filled' \| 'plain'` | no | `'filled'` (**default**) subtle bg + border; `'plain'` for dense lists and timelines. |
| `show` | `'weekday' \| 'time' \| 'weekday-time'` | no | Bottom line: `'weekday'` (**default**), `'time'` or `'weekday-time'`. Time needs an instant (`Date` or non-day string). |
| `relative` | `boolean` | no | Highlight today/ongoing, mute the past, and show Today/Tomorrow/Yesterday words. Default `true`. |
| `now` | `Date` | no | The reference "now" for `relative`. Defaults to the current time at render. |
| `timeZone` | `string` | no | IANA time zone used to resolve instants to a day and time. Defaults to the runtime zone. |
| `color` | `PaletteColor` | no | Palette color of the month band — `layout="page"` only, ignored for stacked. Default accent; use it categorically (event type), not semantically (success/danger). |
| …native | | | plus native `<time>` attributes |

<!-- props:end -->

- A compact, non-interactive calendar tile: month, day and a bottom line (weekday, time, or a relative word). Renders a `<time>` with a machine-readable `dateTime`.
- `date`/`end` take a `Date` or a string. A `'YYYY-MM-DD'` string is a calendar day and never shifts with time zones; any other string is parsed as an instant (e.g. `'2026-11-12T14:30:00Z'`), as is a `Date`, and resolved to a day (and time) in `timeZone` (default: the runtime zone). Numbers are not accepted.
- Relative states (`relative`, default `true`): today and ongoing ranges are highlighted, the past is muted, and single days show Today / Tomorrow / Yesterday instead of the weekday. Highlight per look: stacked + filled gets an accent fill with inverse text; `surface="plain"` gets accent text colour and no box; `layout="page"` keeps its band colour and gets an accent outline ring. Pass `relative={false}` for static archives where nothing should highlight or mute.
- `now` sets the reference time for `relative` (tests, screenshots, server rendering); defaults to the current time at render.
- A range (`end` after `date`) shows `12–14` and a merged month; an `end` not after `date` is ignored. The bottom line always keeps the weekday span (`Fri–Sun`); "Ongoing" (range containing today) and "Tomorrow" (range starting tomorrow) appear only in the accessible name. The year appears only when it differs from the current year.
- `show="time"` / `"weekday-time"` needs an instant (`Date` or non-day string); with a `'YYYY-MM-DD'` day string it falls back to what `show="weekday"` shows: the relative word (Today / Tomorrow / Yesterday) when `relative` is on, else the weekday. `size="sm"` (~40px) hides the bottom line entirely.
- Invalid input (unparseable or impossible dates like `2026-02-30`) throws.
- A11y: the visual tile is `aria-hidden`; a visually hidden full date (e.g. "Today, Thursday, 12 November 2026, 14:30") is the accessible name.
- ❌ A date picker or input — use `DatePicker` / `DateStrip`. To make a tile clickable, wrap it in a `Link`/`Button` with an accessible name.
- ❌ Passing an offset-less datetime string (`'2026-11-12T14:30:00'`) expecting `timeZone` to apply: it is parsed as device-local time. Instant strings must carry `Z` or an offset.
- ❌ `new Date('2026-11-12')` for an all-day date — it parses as UTC and can land on the wrong day; pass the string `'2026-11-12'`.
- ❌ A bare date in running text — use `Text` with `Intl`.
