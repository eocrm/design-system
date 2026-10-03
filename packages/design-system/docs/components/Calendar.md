# `<Calendar>` — month / week / day / agenda views

```tsx
const [cursor, setCursor] = useState(new Date());
const [view, setView] = useState<CalendarView>('month');
<Calendar
  value={cursor}
  onChange={setCursor}
  view={view}
  onViewChange={setView}
  events={events}
  onEventClick={(e) => openDetail(e)}
/>;
```

- Four views: `'month'` (continuous event bars across the grid), `'week'` (7 columns × hour rows + all-day band), `'day'` (single column × hour rows), `'agenda'` (chronological list of the cursor's current week, grouped by day with empty days hidden).
- Events are `{ id, title, startsAt, endsAt?, tone?, color?, allDay?, resourceId? }`. Multi-day events render as continuous bars in both the month grid and the week/day all-day band. `resourceId` routes a timed event to its column in the resource day view and is ignored by every other view.
- **Two colour axes, and they do not compete.** `tone` is _semantic_ — what STATE the event is in: `neutral` (default) / `accent` / `success` / `warning` / `danger`. `color` is _identity_ — WHICH category it belongs to, as one of the 30 `PaletteColor`s. Use `color` when your events belong to a colour-bearing category the tenant chose (an appointment type, a calendar, a resource class).
- With **no** `color`, tone paints the whole block exactly as it always has, and `allDay: true` renders as a tone-filled band (no time prefix). With `color` set, `color` takes the fill (palette tint background, saturated palette colour for text and border) and a non-`neutral` `tone` moves to a saturated stripe down the event's **leading edge** — so a category-coloured event can still show a state that must not be missed. There is no precedence rule to remember because the axes occupy different pixels.

  ```tsx
  // Category only — a clean single colour.
  { id: '1', title: 'Consultation', startsAt, color: 'violet' }
  // Category AND state — violet block, danger stripe. Both readable.
  { id: '2', title: 'Consultation', startsAt, color: 'violet', tone: 'danger' }
  ```

  Don't map categories onto tones instead: tones are semantic and finite, two categories would collide on one tone, and the result is wrong in both directions — a `danger` chip that is merely a category, and a genuinely urgent event that looks like one.

- **This is the opposite of `Badge`**, where `color` takes precedence over `tone` and the tone is discarded. Calendar renders both, because a calendar tone can carry states closer to safety than decoration (a masked hour, a released slot) and dropping one would make a free hour read as a booked one. Don't carry the Badge rule across.
- **Both axes are visual only** — neither sets ARIA, and a 3px band is not an accessible signal (same contract as `Badge`). If a state must reach assistive tech, keep it in the event `title`. And pick category colours that contrast with the tones you use — measured RGB distance between the band colour and the category's own saturated colour — grouped by tone and ordered within each group: `success` + `mint` (11) / `emerald` (15) / `teal` (35) / `green` (41); `danger` + `red` (17) / `coral` (44); `warning` + `orange` (16) / `coral` (25) / `red` (43) / `amber` (44); `accent` + `blue` (40). Read it as a threshold, not a ranking. The worst pair is `success` + `mint` at 11, and anything under ~20 is effectively invisible at the rendered 4px (a 3px band plus the 1px border in the same colour; the agenda row has no border, so 3px there); the low 20s are detectable side-by-side but unreliable alone, and the low 40s are where this list stops rather than where the problem does. These moved in #484 (`success` + `mint` 18 → 11, `danger` + `red` 36 → 17) when those tones were raised to clear WCAG AA; `Calendar.collisions.test.ts` recomputes the list from the shipped tokens. Nothing enforces this — keep the state in the title too when a tenant's category colour collides.

- In the **agenda** view the row is never filled (a tint would clash with the today-group accent and the hover background), so `color` sets the leading dot and `tone` still gets the edge stripe.
- A coloured **all-day** chip uses the same palette tint as a timed one rather than the tone-filled treatment: the palette ships a `bg`/`fg` pair, and a filled variant would mean inventing 30 more tokens and asserting contrast at 12px for each. **The visible consequence:** a coloured all-day event renders at _timed-chip weight_ — same tint, same border, only the time prefix missing — so in a band that mixes coloured and uncoloured all-day events, the coloured ones read lighter. Colour the whole category or none of it if that bothers you.
- On a multi-day bar the band repeats on **every** segment, including ones that continue from a previous week. It marks the event's state, not its start.
- Controlled cursor via `value` / `onChange`, or uncontrolled via `defaultValue`. Controlled view via `view` / `onViewChange`, or uncontrolled via `defaultView`.
- `hourRange` (default `[7, 19]`) sets the visible hour window in week/day views. Hours outside the range are not rendered. `hourRowHeight` (default 48) is the pixel height per hour row.
- Overlapping timed events in week/day views render as a Google-Calendar-style cascade: each lane is offset to the right by a small constant step but every block extends to the column's right edge, with later lanes overlaying earlier ones via `z-index`. Hovering or keyboard-focusing a block lifts it to full width on top of all neighbours. A horizontal "now" line marks the current time in today's column.
- Locale-aware via `useLocale()`; override with `locale` prop. UI strings (`today`, `viewMonth`, etc.) come from the i18n provider — override them with `<I18nProvider overrides={{ calendar: { today: '…' } }}>`. There is no `labels` prop.
- `maxLanesPerWeek` (default 3) caps event lanes per week in the month view. Events beyond the cap collapse into a `+N more` chip; click fires `onDayClick(date)`.
- Read-mostly **by default**: `onDayClick` and `onEventClick` callbacks; opt into editing by wiring `onEventMove` / `onEventResize` (see _Drag to move and resize_ below). `onDayClick` fires across all views — month-cell click, "+N more" chip, keyboard activation (Enter/Space) on a focused cell, and (in week/day views) clicks on the empty hour-grid space of a day column. No built-in popover or modal — wire your own detail UI.
- ARIA: month view is `role="grid" aria-readonly="true"`; arrow keys move focus, PageUp/PageDown navigates months, Enter/Space calls `onDayClick`. Week/day views are also `role="grid"` with `role="row"` + `role="columnheader"` headers and standard sequential tab order for event blocks — `aria-readonly="true"` there too, until a drag handler is wired (see below). Agenda view exposes the visible week as `role="list"` with each day group as a `role="listitem"` and the day label as an `<h3>` heading inside — screen readers announce the date grouping before reading each event row. **Known v3 gap:** in week/day views, `onDayClick` on empty hour-grid space is **mouse-only** (no keyboard equivalent). Consumers needing keyboard activation should drive their detail UI through the focusable event chips via `onEventClick`.

#### Resource columns — one day, N lanes

```tsx
<Calendar
  view="day"
  events={appointments} // each carries resourceId
  resources={[
    { id: 'ana', label: 'Ana' },
    { id: 'ben', label: 'Ben' },
  ]}
/>
```

- `resources` splits `view="day"` into one column per bookable subject — practitioner, chair, room, bay — sharing **one** time axis and **one** scroll container. This is the resource/day view every scheduling product ships. Don't approximate it with N side-by-side `<Calendar view="day">` in a `Split`: each brings its own header, gutter and scroll, so they drift.
- Routing is by `CalendarEvent.resourceId`. A **timed** event whose `resourceId` matches nothing (or is absent) lands in a trailing **Unassigned** column, which is only rendered when at least one such event exists. An **all-day** event with no `resourceId` is day-wide and spans every column; with one, it pins to that column.
- Two bookings at the same hour in _different_ columns are not a collision — each takes lane 0 and full column width. The cascade still applies within one column.
- Month, week and agenda views ignore `resources` — their columns already mean something else.

#### Availability underlay — shade closed time, tint free time

```tsx
<Calendar
  view="day"
  events={appointments}
  resources={resources}
  backgroundIntervals={[
    { startsAt: at(7, 0), endsAt: at(9, 0), resourceId: 'ana', tone: 'unavailable' },
    { startsAt: at(9, 0), endsAt: at(17, 0), resourceId: 'ana', tone: 'available' },
  ]}
/>
```

- A booking calendar has three states and `hourRange` alone expresses none of them: **closed** (rendered but greyed), **busy** (an event covers it — already works), **free** (clickable). `backgroundIntervals` paints the first and third behind the events.
- An interval list, not a weekly-hours object, because working hours vary by day (a lunch break), by date (a holiday, a short day) and by column (per-practitioner shifts).
- `tone`: `'unavailable'` (default) shades; `'available'` tints. `resourceId` restricts the band to one resource column and is ignored in week view (and in a resource-less day view).
- **Intervals are always clipped to each column's own date**, `resourceId` or not. Shading 08:00–09:00 across a week takes seven intervals, one per day — a single interval does not span the columns.
- Bands render beneath events, take no part in the collision cascade, are `aria-hidden`, and are `pointer-events: none` — `onDayClick` still fires through them. Intervals are clipped to each column's day and to `hourRange`; ones that fall entirely outside are dropped.
- Don't fake this with all-day events — that pollutes the `events` array you also read back.
- **The underlay is paint, not policy.** Bands never gate drops — `backgroundIntervals` and `canDropEvent` are independent, and shading a slot closed does not stop a drag landing in it. A screen that shades shifts _and_ enables drag must express the same rule twice: once as intervals to draw it, once in `canDropEvent` to enforce it. Derive both from one source so they cannot drift.

#### Drag to move and resize

```tsx
<Calendar
  view="day"
  events={appointments}
  resources={resources}
  dragSnapMinutes={15}
  canDropEvent={(ev, next) => isWithinOpeningHours(next)}
  onEventMove={async (ev, next) => {
    const ok = await api.reschedule(ev.id, next);
    if (!ok) return false; // rejected → the block snaps back
    setAppointments((prev) => applyMove(prev, ev.id, next));
  }}
  onEventResize={(ev, next) => setAppointments((p) => applyResize(p, ev.id, next))}
/>
```

- Both handlers are optional and additive — omit them and the calendar behaves exactly as before (read-only). `onEventMove` makes blocks draggable; `onEventResize` adds a handle on the block's bottom edge.
- **A drop is proposed, never applied.** `events` stays the source of truth: commit the change to your own state or the block snaps back. `next` is `{ startsAt, endsAt, resourceId? }` for a move (duration preserved; `resourceId` is the column it landed on) and `{ startsAt, endsAt }` for a resize (`startsAt` unchanged).
- **Two ways to refuse a drop.** `canDropEvent` is a synchronous predicate evaluated _continuously during_ the drag — the placement renders as refused for as long as the pointer rests on it, and never reaches the handler. Its `next.mode` says which gesture is being judged and narrows the payload (`'move'` carries the target `resourceId`; `'resize'` can't change the column, so it doesn't), which is what makes rules like "shortening is fine, relocating needs approval" expressible. The handler itself can return `false`, or a promise resolving `false` or rejecting, for rules only the server can settle; that verdict is announced in the live region rather than styled (the gesture is over by then), and the preview is held until the promise settles so an accepted drop doesn't flash back mid-request.
- `dragSnapMinutes` (default `15`) snaps the result to a boundary rather than an arbitrary pixel offset.
- Dragging sideways crosses columns: another weekday in week view, another resource lane in the resource day view.
- **Keyboard equivalent**, so rescheduling isn't mouse-only: on a focused block, `Alt`+`↑`/`↓` moves by one snap step, `Alt`+`←`/`→` moves a column, `Alt`+`Shift`+`↑`/`↓` changes the end time. Every block carries the full shortcut list as its `aria-describedby` description — it has to live on the blocks, since `role="grid"` here is not focusable and a description there would never be announced — and an assertive live region names the event and reports each proposed slot, each refusal, and each gesture that was already at the edge of what the bounds allow. With a drag handler wired, the grid drops `aria-readonly`.
- **Bounds.** One rule governs both gestures: **the allowed range always contains where the event already is**, so a bound can refuse to move something further but never moves it the opposite way. Within that, a move keeps the start inside the visible `hourRange` — an unclamped upward drag would project into the previous calendar day — while the end runs past it freely, so an overnight booking keeps its duration; and a resize may grow or shrink the event by at most a day per gesture — the bound is on the CHANGE, not the absolute duration, so a multi-day booking stays adjustable — which lets an event be extended past midnight while stopping a runaway pointer delta rolling through whole dates. An event that already starts before `hourRange` (its block renders clipped at the top) is _not_ pulled into the window.
- A gesture the bounds refuse outright proposes nothing: the handler is not called (it is typically an API write) and the live region says the event cannot move further.
- Every time comes from the `CalendarEvent`, never from the rendered block — the layout clips a block that ends on a later day, so it is shorter than the event it represents.
- **A move preserves ELAPSED duration**, not the row count. The two differ only on a daylight-saving day, where the grid necessarily draws wall-clock rows (01:00–05:00 occupies four rows though three hours pass) while a booking is its real duration — a 30-minute appointment takes 30 real minutes on any day of the year. This is also why a drop onto the skipped hour can't come back zero-length.
- **Known gaps.** `onDayClick` still reports only a date, so in a resource day view it cannot say which column a free slot belongs to. After a keyboard column move, the block re-parents into the new column and loses focus, so nudges can't be chained. `touch-action: none` on a movable block means a touch that starts on an event drags it rather than scrolling the grid. Resource columns are `1fr` with no minimum width, so a dozen lanes squash rather than scroll — the all-day band lays itself out separately and would drift out of alignment if only the hour grid could scroll.
- The click that terminates a drag is swallowed, so `onEventClick` doesn't fire on a reschedule. A plain click still opens your detail UI.
- Drag-to-**create** (dragging empty grid space to draft a new event) is still out of scope — use `onDayClick` plus your own form.
