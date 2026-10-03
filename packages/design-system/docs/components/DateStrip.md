# `<DateStrip>` — week of selectable day tiles

```tsx
const [day, setDay] = useState<string | null>(null);
<DateStrip
  days={week} // [{ date: '2026-10-05', free: 3 }, … 7 days]
  value={day}
  onChange={setDay}
  onPrevious={prevWeek}
  onNext={nextWeek}
  canPrevious={!isCurrentWeek}
/>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `days` | `DateStripDay[]` | yes | — | The days to show, in order — usually one week (7); one grid column per day. The month heading is derived from the first and last. |
| `value` | `string \| null` | yes | — | Selected day (`'YYYY-MM-DD'`), or `null`. A value not in `days` checks nothing. |
| `onChange` | `(date: string) => void` | yes | — | Called with the chosen day's `'YYYY-MM-DD'`. Controlled — update `value` yourself. |
| `onPrevious` | `() => void` | yes | — | Previous-week button handler. Replace `days` with the earlier week. |
| `onNext` | `() => void` | yes | — | Next-week button handler. Replace `days` with the later week. |
| `canPrevious` | `boolean` | no | — | `false` disables the previous-week button (e.g. the current week). Default `true`. |
| `canNext` | `boolean` | no | — | `false` disables the next-week button (end of the booking window). Default `true`. |
| `titleOrder` | `TitleOrder` | no | — | Heading level of the month label. Default `2`. |
| `name` | `string` | no | — | Radio group `name` (also submitted with a form). Default: a generated id. |
| `invalid` | `boolean` | no | false | Marks the group `aria-invalid` (the radios themselves do not support it). Field / SettingRow inject it. |
| `required` | `boolean` | no | — | Native `required` on the radios (the group then fails form validation until one is chosen). Field / SettingRow inject it; it used to land on the root as a stray attribute. |
| …native | | | | plus native `<FieldSet>` attributes |

<!-- props:end -->

- `date` is an ISO `'YYYY-MM-DD'` calendar day (the business's day, not a `Date`); the strip formats weekday / number / month through the locale in UTC, so the browser timezone never shifts it. The month heading is derived ("October 2026", "September – October 2026").
- `free: 0` → "No times", tile natively disabled (skipped by Tab and arrows). Keep full days in the array.
- Native radios, one `name`: one Tab stop, arrows move AND select (so `onChange` fires per arrow press — debounce slot fetching if needed). Tiles are `role="radio"` named "Wednesday, October 7, 9 free"; query them that way in tests.
- Controlled only. `canPrevious` / `canNext` (default `true`) disable the week buttons. `titleOrder` (default 2) sets the heading level.
- In `<Field>` / `<SettingRow>`: the row label is merged in front of the month (group name "Day October 2026"), the error describes the group, `invalid` → `aria-invalid` on the group, `required` → native `required` on the radios. One column per day (`days.length`), so a 5-day week has 5 columns.
- Previous/next use `aria-disabled` (not `disabled`) when `canPrevious`/`canNext` is false, so focus stays on the button that reached the boundary.
- Changing week announces the new range politely; same-week re-renders stay silent.
- ❌ No `aria-label` on the strip — the month heading names the group. ❌ No `Date`/`toISOString()` for `date`.
- ❌ In an intrinsic-width context (`Split`'s default `auto` aside track, a `Cluster` item, `width: max-content`) it renders at width 0 — `container-type: inline-size` zeroes its intrinsic-width contribution; give the parent a concrete width (e.g. `asideWidth` on a Split). It is also the containing block for absolutely-positioned descendants (layout containment).
- When NOT to use: any-date picking → `<InlineDatePicker>`; events → `<Calendar>`; times → `<SlotGrid>`.
