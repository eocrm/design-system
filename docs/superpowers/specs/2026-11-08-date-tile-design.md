# `DateTile` — design

**Status:** draft for approval · 2026-11-08

## Intent

A compact, read-only block that shows a date as a calendar tile: short month on
top, a big day number, and a weekday underneath (the user's reference: `NOV / 12 / Thu`).
CRM screens need a scannable date marker in four places — all four are in scope:

- leading slot of list rows (upcoming appointments, deal close dates, agenda lists)
- event / booking cards and record detail headers
- timeline / activity feed day markers
- dashboard widgets ("next meeting", today)

Success: an agent building any of those screens reaches for `<DateTile>` instead of
hand-rolling a stacked `<Text>` column, and the tile reads correctly in every locale,
time zone and theme.

## Goals

The user chose to ship **all six variants** shown in the mockup. They are props
on one component that combine freely, not separate components:

| Mockup | Prop | Values |
|---|---|---|
| A stacked / B calendar page | `layout` | `'stacked'` (default) · `'page'` — page = coloured month band on top |
| A sizes | `size` | `'sm'` · `'md'` (default) · `'lg'` — `sm` hides the bottom line so it fits a list row |
| F surface | `surface` | `'filled'` (default) · `'plain'` (no background/border, for dense lists and timelines) |
| D with time | `show` (bottom line) | `'weekday'` (default) · `'time'` · `'weekday-time'` |
| C relative states | automatic, see below | today = accent fill + "Today"; past = muted; tomorrow → "Tomorrow" |
| E range | `end` | optional end date → `12–14` / `Thu–Sat`; crossing months → `Nov – Dec`, `28–2` |

`page` layout's band colour: `color?: PaletteColor` (same 30-colour categorical palette
as `IconTile`), default = accent.

**How "today" looks per surface (user's choice: keep the surface, add accent):**

- `stacked` + `filled`: accent fill.
- `plain`: no box. The month, day and bottom-line text turn accent colour.
- `page`: the band keeps its `color`. The tile gets an accent outline.

Past dates are muted the same way on every surface.

## Decided by the user

- **All six variants ship.**
- **Today/past is automatic with an override.** By default the tile compares its date with
  the current date in the effective time zone. `now?: Date` pins "now" (tests, demos,
  SSR). `relative={false}` turns the states and the Today/Tomorrow wording off, leaving a neutral tile.
- **Input:** `date` (and `end`) accept `Date | string`. A `'YYYY-MM-DD'` string is a
  calendar day and never shifts with the time zone. A `Date` or a full ISO timestamp is shown in
  the device's time zone, or in `timeZone?: string` (IANA, e.g. `'Europe/Berlin'`) when given.
  The library has no app-wide time-zone setting, so there's no provider to integrate with.
- **Ranges: ongoing counts as today.** If today is within `date`–`end`, the tile gets the
  today look and keeps the weekday span (`Wed–Sat`). The accessible name starts with
  "Ongoing, …". The tile is muted only after `end` has passed. Before the start, it is neutral; it
  also shows "Tomorrow" when the start is tomorrow.

## Constraints

- Library Hard rules apply: tokens only (no raw px/colour), no layout ownership
  (no margin/position; `width` only `100%`), `forwardRef` + native prop spread,
  i18n via `useTranslation` for the "Today" / "Tomorrow" strings, Core invariant checklist
  (tests, demo + all four playground wirings, export, docs page + AI-PRIMER line,
  CLUSTERS in both maps).
- Month/weekday/time names come from `Intl.DateTimeFormat` with the active locale;
  time follows the locale's 12/24h convention.
- RTL and both themes must render correctly.
- **A11y:** root is `<time dateTime="…">` (ISO; for a range, the start is on the root
  and the full range is in the accessible name). The visual abbreviations are `aria-hidden`;
  a visually hidden full text carries the meaning: "Thursday, 12 November 2026"
  (+ ", 14:30" when the time is shown; "Today, …" when relative). It is not interactive and has no
  tab stop. Muted past dates must still meet the text contrast minimum.

## Non-goals

- Interaction (click, select, navigate). For picking, use `DatePicker` / `DateStrip`; a
  clickable tile is a consumer wrapping it in a `Link`/`Button`.
- Live updating at midnight. "Today" is computed at render time.
- Arbitrary relative phrases ("in 3 days"). Only Today / Tomorrow (and Yesterday) replace the weekday.

## Anti-goals

- A tile that shows the wrong day in some time zone (the main bug class here).
- A screen reader hearing "NOV 12 Thu" or the date read twice.
- Six near-duplicate components or a prop matrix agents can't pick from.

## My calls (the user can overrule)

- Name `DateTile` (matches `IconTile` / `MediaTile`).
- The year is shown only when it isn't the current year, in the month line (`NOV 2027`).
  The accessible name always includes the year.
- "Yesterday" exists alongside Today/Tomorrow; any other date shows the weekday.
- `sm` + `show="time"` still hides the bottom line; the time is expected beside the tile in the row.
- Range shows the weekday span on the bottom line; `show="time"` with a range shows the start time.
- A `'YYYY-MM-DD'` day string has no time. With `show="time"` it falls back to the weekday;
  with `'weekday-time'` it shows the weekday only. There's no dev warning, because an all-day item
  in a timed list is legitimate.
- "Tomorrow" (and "Yesterday") change the wording only. They get no separate look and no new token.

## Left to the builder

Exact pixel sizes per `size` (derive from existing control/tile tokens; `sm` must sit in a
list row next to two lines of text), type-scale steps, internal structure, how the
`page` band is drawn, the date-math helpers (reuse existing ones in the library first).
