# Calendar `dayAction` — per-day action button (DS-88)

## Intent

Home Hub (Pet Control → Calendar) wants a small "+ add event on this day" in each day, without the two-step
trip through `onDayClick` ("open this day"). The slot is generic: any one per-day action.

## Approaches

- **Declarative `dayAction` prop — chosen.** The library renders the button, so it owns the roving tab stop,
  event isolation from `onDayClick`, and the coarse-pointer degradation.
- `renderDayAction(date, ctx) => ReactNode` (the ticket's suggestion) — flexible, but the library cannot set the
  consumer's button `tabIndex`, so month view gains ~42 Tab stops; keyboard isolation would rely on a wrapper.
- Both — more API to document and test for no current need.

## API

```ts
dayAction?: {
  /** aria-label (and tooltip) for the given day; consumer-translated — it names their action. */
  label: (date: Date) => string;
  /** Fires on activation; never also fires `onDayClick`. */
  onActivate: (date: Date, ctx: { view: CalendarView }) => void;
  /** Icon; defaults to a plus. */
  icon?: ReactNode;
};
```

Rendered as an icon-only `xs` ghost `Button`. Click and keydown stop propagation, so the cell's click and
Enter/Space (`onDayClick`) never fire from it.

## Per view

| View   | Fine pointer                                                                                                                                                                           | Coarse pointer                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Month  | Beside the day number; shown on cell hover or focus-within. Only the roving-focused cell's button is tabbable (`tabIndex` 0, others −1): Tab from the focused cell reaches its action. | Hidden (cell ≈ 44px wide; a tap opens the day). |
| Week   | In each date `columnheader`, after the date.                                                                                                                                           | Hidden (columns ≈ 44px).                        |
| Day    | In the date `columnheader`, after the date.                                                                                                                                            | Shown, 44px target via `touch-hit-area`.        |
| Agenda | Beside each day heading (`<h3>` + button row).                                                                                                                                         | Shown, 44px target.                             |

Hiding is CSS (`@media (pointer: coarse)`); jsdom tests cover markup/behaviour and a source test pins the
media rule.

## Non-goals

- Resource day view (columns are resources, not dates): no header action.
- Agenda only lists days that have events; days it doesn't list get no action (documented).
- Arbitrary per-day content.

## Builder's calls

Tokens/spacing for the slot; whether the button carries a tooltip (reuse Button/Tooltip conventions).
