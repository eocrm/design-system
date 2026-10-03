# Calendar primitives — `useMonth`, `useWeek`, `useDay`, `useAgenda`

```tsx
const grid = useMonth(cursorDate);
// → { year, month, monthLabel, weekdayLabels, weeks }

const week = useWeek(cursorDate);
// → { weekLabel, days, weekdayLabels }

const { day, dayLabel, dayShortLabel } = useDay(date);

const { days, rangeLabel } = useAgenda(rangeStart, rangeEnd);
```

- Headless. These hooks return data shapes — no rendering. The Calendar UI components (Month/Week/Day/Agenda views) consume them.
- Each hook accepts an optional `options.locale` to override the Context value. `useMonth`, `useWeek`, and `useAgenda` accept `options.weekStartsOn` to override the locale-derived first day (used by `useAgenda` to compute the locale-aware column index for each `Day.weekday`).
- `Day.key` is `'YYYY-MM-DD'` in local time — safe React key, comparison handle, and event-lookup index.
- Pure date math + `Intl` formatters live alongside as utility exports: `addDays`, `startOfWeek`, `formatMonth`, `getFirstDayOfWeek`, etc. Use them if you need to derive labels or do date math outside a component.
