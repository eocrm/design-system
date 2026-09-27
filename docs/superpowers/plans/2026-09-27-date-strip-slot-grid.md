# DateStrip + SlotGrid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `DateStrip` (#560) and `SlotGrid` (#561) — controlled single-choice day / time-slot pickers built on native radios — complete per the repo's component invariant.

**Architecture:** Each component is a set of native `<input type="radio">` sharing one `name`, wrapped in `<label>` tiles styled like Button secondary/primary through a shared `_internal/choiceTile.scss` mixin. DateStrip formats ISO `'YYYY-MM-DD'` days through the locale in UTC via a small pure helper module (`_internal/isoDay.ts`). All copy goes through i18n.

**Tech Stack:** React 19, TypeScript, SCSS modules, Vitest + Testing Library (jsdom), `Intl.DateTimeFormat` (incl. `formatRange`, available — tsconfig lib ES2022), `lucide-react` (already a peer dep).

**Spec:** `docs/superpowers/specs/2026-09-27-date-strip-slot-grid-design.md`

## Global Constraints

- Read `packages/design-system/CLAUDE.md` (Hard rules 1–10) before writing code. Key ones below.
- Vitest runs from `packages/design-system` (`npx vitest run <path>`); no root vitest config. Globals on — do not import `describe/it/expect/vi`.
- No raw values in `.module.scss` — tokens only; component tokens in `<Name>.tokens.scss` defaulting to Button tokens / primitives.
- No layout props on a component's root (`margin`, `position`, `flex: 1`, `align-self`, `grid-column`…). Internal grids of the component's own children are fine. UA fieldset reset needs `// stylelint-disable-next-line property-disallowed-list -- UA fieldset reset` (precedent: `Radio/RadioGroup.module.scss`).
- `forwardRef`, spread HTML attrs, full JSDoc on every exported member incl. `@example`s and `@remarks` "When NOT to use" / "Anti-patterns".
- Every user-visible string via `useTranslation()`; keys added to `src/i18n/messages.ts`, `en.ts`, `ru.ts` (ru plurals via `ruPlural` from `./format`). No per-component label props.
- `:focus-visible`, not `:focus`.
- Controlled only: `value: string | null` + `onChange(next: string)`.
- Playground imports from `@eocrm/design-system` only.
- **Do not push, do not open a PR, do not run the pre-push-review skill.** Commit locally per task. The user reviews the demo before any PR.

## Review Focus

1. `value` not present in `days` / `groups` (e.g. after a week change) → nothing checked, no warning, no crash. Test in Tasks 2 and 3.
2. `days` re-rendered with new object identity but the same dates (consumer refetch) → NO week-change announcement. Test in Task 2.
3. `days = []` (loading week) → no month label text, no tiles, no crash, no announcement until real days arrive. Test in Task 2.
4. Every day `free: 0` → every radio disabled (native: nothing tabbable in the strip), the prev/next buttons still work. Test in Task 2.
5. Russian locale → month label / weekday in Russian, count with correct plural form (1 → «1 свободно»… see Task 1 table). Test in Tasks 1 and 2.

---

### Task 1: Shared foundations — ISO-day helpers, i18n keys, choice-tile mixin

**Files:**

- Create: `packages/design-system/src/components/_internal/isoDay.ts`
- Create: `packages/design-system/src/components/_internal/isoDay.test.ts`
- Create: `packages/design-system/src/components/_internal/choiceTile.scss`
- Modify: `packages/design-system/src/i18n/messages.ts` (add `dateStrip`, `slotGrid` sections to `Messages`, next to the other component sections, e.g. after `calendar`)
- Modify: `packages/design-system/src/i18n/en.ts`, `packages/design-system/src/i18n/ru.ts`

**Interfaces:**

- Produces:
  - `parseIsoDay(iso: string): Date` — UTC midnight; throws `Error("[isoDay] expected 'YYYY-MM-DD', got '<iso>'")` on malformed input.
  - `formatIsoDay(iso: string, locale: string, options: Intl.DateTimeFormatOptions): string` — always `timeZone: 'UTC'`.
  - `formatIsoRange(first: string, last: string, locale: string, options: Intl.DateTimeFormatOptions): string` — `formatRange` in UTC; single `format` when `first === last`.
  - i18n keys: `dateStrip.previousWeek`, `dateStrip.nextWeek`, `dateStrip.free({count})`, `dateStrip.noTimes`, `dateStrip.day({date, availability})`, `dateStrip.range({range})`, `slotGrid.empty`.
  - SCSS mixin `choice-tile` in `_internal/choiceTile.scss`, applied to a `<label>` containing a visually-hidden `<input type="radio">` with class given as `$input` selector.

- [ ] **Step 1: Write the failing helper tests** — `isoDay.test.ts`:

```ts
import { formatIsoDay, formatIsoRange, parseIsoDay } from './isoDay';

describe('isoDay', () => {
  it('parses to UTC midnight', () => {
    expect(parseIsoDay('2026-10-07').toISOString()).toBe('2026-10-07T00:00:00.000Z');
  });

  it('throws on malformed input', () => {
    expect(() => parseIsoDay('2026-10-7')).toThrow("expected 'YYYY-MM-DD'");
    expect(() => parseIsoDay('07/10/2026')).toThrow();
  });

  it('formats the calendar day regardless of the host timezone', () => {
    // UTC formatting: the 7th is the 7th even where local time is behind UTC.
    expect(formatIsoDay('2026-10-07', 'en-US', { day: 'numeric' })).toBe('7');
    expect(formatIsoDay('2026-10-07', 'en-US', { weekday: 'short' })).toBe('Wed');
    expect(
      formatIsoDay('2026-10-07', 'en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    ).toBe('Wednesday, October 7');
  });

  it('collapses a single-month range and spans months / years', () => {
    const month = { month: 'long', year: 'numeric' } as const;
    expect(formatIsoRange('2026-10-05', '2026-10-11', 'en-US', month)).toBe('October 2026');
    expect(formatIsoRange('2026-09-28', '2026-10-04', 'en-US', month)).toMatch(
      /^September\s*–\s*October 2026$/,
    );
    expect(formatIsoRange('2026-12-28', '2027-01-03', 'en-US', month)).toMatch(
      /^December 2026\s*–\s*January 2027$/,
    );
    expect(formatIsoRange('2026-10-07', '2026-10-07', 'en-US', month)).toBe('October 2026');
  });

  it('localizes (ru)', () => {
    expect(
      formatIsoRange('2026-10-05', '2026-10-11', 'ru-RU', { month: 'long', year: 'numeric' }),
    ).toMatch(/^октябрь 2026/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/_internal/isoDay.test.ts`
Expected: FAIL — cannot resolve `./isoDay`.

- [ ] **Step 3: Implement `isoDay.ts`**

```ts
/**
 * Calendar days as ISO `'YYYY-MM-DD'` strings, formatted in UTC so the host
 * timezone can never shift a day (a booking's day belongs to the business's
 * timezone, not the browser's). Used by DateStrip.
 */
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `'2026-10-07'` → `Date` at 2026-10-07T00:00:00Z. Throws on anything else. */
export function parseIsoDay(iso: string): Date {
  const m = ISO_DAY.exec(iso);
  if (!m) throw new Error(`[isoDay] expected 'YYYY-MM-DD', got '${iso}'`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** Format one ISO day in UTC. */
export function formatIsoDay(
  iso: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(parseIsoDay(iso));
}

/** Format a first..last ISO day range in UTC ("October 2026", "September – October 2026"). */
export function formatIsoRange(
  first: string,
  last: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const f = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
  return first === last
    ? f.format(parseIsoDay(first))
    : f.formatRange(parseIsoDay(first), parseIsoDay(last));
}
```

- [ ] **Step 4: Run to verify it passes** — same command. Expected: PASS. (If the ru assertion differs in case/grammatical form under this Node ICU, adjust the regex to the actual `formatRange` output — do not change the implementation.)

- [ ] **Step 5: Add i18n keys.** In `messages.ts` `Messages`, add (JSDoc each leaf, matching the file's style):

```ts
dateStrip: {
  /** aria-label of the previous-week icon button. */
  previousWeek: string;
  /** aria-label of the next-week icon button. */
  nextWeek: string;
  /** Function leaf — VISIBLE availability count on a day tile ("9 free"); also used in the tile's name. */
  free: (params: { count: number }) => string;
  /** Availability text of a day with no free times; the tile is disabled. */
  noTimes: string;
  /** Function leaf — a day tile's accessible name: long date + availability ("Wednesday, October 7, 9 free"). */
  day: (params: { date: string; availability: string }) => string;
  /** Function leaf — polite announcement after the week changes; `range` is e.g. "October 12 – 18". */
  range: (params: { range: string }) => string;
}
slotGrid: {
  /** Default empty state when no group has any slot. */
  empty: string;
}
```

`en.ts`:

```ts
  dateStrip: {
    previousWeek: 'Previous week',
    nextWeek: 'Next week',
    free: ({ count }) => `${count as number} free`,
    noTimes: 'No times',
    day: ({ date, availability }) => `${date as string}, ${availability as string}`,
    range: ({ range }) => `${range as string}`,
  },
  slotGrid: {
    empty: 'No available times',
  },
```

`ru.ts`:

```ts
  dateStrip: {
    previousWeek: 'Предыдущая неделя',
    nextWeek: 'Следующая неделя',
    free: ({ count }) =>
      `${count as number} ${ruPlural(count as number, ['свободное', 'свободных', 'свободных'])}`,
    noTimes: 'Нет времени',
    day: ({ date, availability }) => `${date as string}, ${availability as string}`,
    range: ({ range }) => `${range as string}`,
  },
  slotGrid: {
    empty: 'Нет свободного времени',
  },
```

(The `as` casts match the existing function leaves, e.g. `calendar.moreEvents`. Place the sections in the same relative position in all three files.)

- [ ] **Step 6: Typecheck the i18n shape.** (ru plural output is tested through DateStrip's ru test in Task 2.) Run `npx tsc --noEmit -p .` from `packages/design-system` — Expected: no errors (TS enforces en/ru shape parity against `Messages`).

- [ ] **Step 7: Create `_internal/choiceTile.scss`**

```scss
// Shared look for DateStrip / SlotGrid tiles: a <label> wrapping a visually
// hidden native radio. Unchecked = Button secondary, checked = Button primary.
// Consumers of the mixin pass their component tokens so each stays themable.
@use '../../styles/mixins' as *;

@mixin choice-tile(
  $input,
  $bg,
  $bg-hover,
  $fg,
  $border,
  $bg-checked,
  $bg-checked-hover,
  $fg-checked,
  $radius,
  $ring,
  $opacity-disabled
) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  border: var(--border-width) solid $border;
  border-radius: $radius;
  background: $bg;
  color: $fg;
  font: inherit;
  cursor: pointer;
  user-select: none;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);

  #{$input} {
    @include visually-hidden;
  }

  &:hover:not(:has(#{$input}:disabled)) {
    background: $bg-hover;
  }

  &:has(#{$input}:checked) {
    border-color: transparent;
    background: $bg-checked;
    color: $fg-checked;
  }

  &:has(#{$input}:checked):hover {
    background: $bg-checked-hover;
  }

  &:has(#{$input}:focus-visible) {
    @include focus-ring($ring);
  }

  &:has(#{$input}:disabled) {
    opacity: $opacity-disabled;
    cursor: not-allowed;
  }
}
```

Check `@include visually-hidden` and `@include focus-ring($color)` signatures in `src/styles/mixins.scss` (lines ~66–82) and adjust if they differ.

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/_internal/isoDay.ts packages/design-system/src/components/_internal/isoDay.test.ts packages/design-system/src/components/_internal/choiceTile.scss packages/design-system/src/i18n
git commit -m "feat: isoDay helpers, choice-tile mixin, DateStrip/SlotGrid i18n keys (#560, #561)"
```

---

### Task 2: DateStrip component (library side, complete)

**Files:**

- Create: `packages/design-system/src/components/DateStrip/DateStrip.tsx`
- Create: `packages/design-system/src/components/DateStrip/DateStrip.module.scss`
- Create: `packages/design-system/src/components/DateStrip/DateStrip.tokens.scss`
- Create: `packages/design-system/src/components/DateStrip/DateStrip.test.tsx`
- Create: `packages/design-system/src/components/DateStrip/index.ts`
- Modify: `packages/design-system/src/index.ts` (export next to the other Forms components; follow the `Tour` export shape at `src/index.ts:278`)
- Modify: `packages/design-system/src/_meta/manifest.ts` AND `packages/design-system/scripts/generate-manifest.mjs` — `CLUSTERS`: `DateStrip: 'Forms'` in both (same place as `TimeField: 'Forms'`)
- Modify: `packages/design-system/AGENTS.md` — one TL;DR section `### \`<DateStrip>\` — week of selectable day tiles`, placed near the DatePicker/TimeField sections

**Interfaces:**

- Consumes (Task 1): `formatIsoDay`, `formatIsoRange` from `../_internal/isoDay`; `choice-tile` mixin from `../_internal/choiceTile`; i18n keys `dateStrip.*`.
- Produces: `DateStrip`, `DateStripProps`, `DateStripDay` exported from `@eocrm/design-system`.

- [ ] **Step 1: Write the failing tests** — `DateStrip.test.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n/I18nProvider';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { DateStrip, type DateStripDay, type DateStripProps } from './DateStrip';

const WEEK: DateStripDay[] = [
  { date: '2026-10-05', free: 3 },
  { date: '2026-10-06', free: 1 },
  { date: '2026-10-07', free: 9 },
  { date: '2026-10-08', free: 0 },
  { date: '2026-10-09', free: 2 },
  { date: '2026-10-10', free: 0 },
  { date: '2026-10-11', free: 4 },
];
const NEXT_WEEK: DateStripDay[] = WEEK.map((d, i) => ({
  ...d,
  date: `2026-10-${String(12 + i).padStart(2, '0')}`,
}));

function setup(props: Partial<DateStripProps> = {}) {
  const handlers = { onChange: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn() };
  const all: DateStripProps = { days: WEEK, value: null, ...handlers, ...props };
  const utils = render(
    <LocaleProvider locale="en-US">
      <DateStrip {...all} />
    </LocaleProvider>,
  );
  return { ...utils, ...handlers, props: all };
}

describe('<DateStrip>', () => {
  it('is a group named by the month heading', () => {
    setup();
    const group = screen.getByRole('group', { name: 'October 2026' });
    expect(screen.getByRole('heading', { level: 2, name: 'October 2026' })).toBeInTheDocument();
    expect(group.tagName).toBe('FIELDSET');
  });

  it('titleOrder sets the heading level', () => {
    setup({ titleOrder: 3 });
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('October 2026');
  });

  it('names across a month boundary', () => {
    setup({
      days: [
        { date: '2026-09-28', free: 1 },
        { date: '2026-10-04', free: 1 },
      ],
    });
    expect(
      screen.getByRole('group', { name: /^September\s*–\s*October 2026$/ }),
    ).toBeInTheDocument();
  });

  it('renders one radio per day with a full accessible name', () => {
    setup();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(7);
    expect(screen.getByRole('radio', { name: 'Wednesday, October 7, 9 free' })).toBeEnabled();
    expect(screen.getByRole('radio', { name: 'Thursday, October 8, No times' })).toBeDisabled();
  });

  it('visual body shows short weekday, number and count, hidden from AT', () => {
    setup();
    const radio = screen.getByRole('radio', { name: /October 7/ });
    const tile = radio.closest('label')!;
    const body = tile.querySelector('[aria-hidden="true"]')!;
    expect(body).toHaveTextContent('Wed');
    expect(body).toHaveTextContent('7');
    expect(body).toHaveTextContent('9 free');
  });

  it('all radios share one name (one Tab stop, exclusive choice)', () => {
    setup({ name: 'day' });
    for (const r of screen.getAllByRole('radio')) expect(r).toHaveAttribute('name', 'day');
  });

  it('controlled: value checks the tile; clicking calls onChange with the ISO date', async () => {
    const { onChange } = setup({ value: '2026-10-05' });
    expect(screen.getByRole('radio', { name: /October 5/ })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: /October 7/ }));
    expect(onChange).toHaveBeenCalledWith('2026-10-07');
    // Controlled: still the old value until the parent updates.
    expect(screen.getByRole('radio', { name: /October 5/ })).toBeChecked();
  });

  it('a disabled day cannot be chosen', async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByRole('radio', { name: /October 8/ }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('value outside the week checks nothing', () => {
    setup({ value: '2026-11-01' });
    for (const r of screen.getAllByRole('radio')) expect(r).not.toBeChecked();
  });

  it('prev/next buttons call handlers and respect canPrevious / canNext', async () => {
    const { onPrevious, onNext, rerender, props } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    rerender(
      <LocaleProvider locale="en-US">
        <DateStrip {...props} canPrevious={false} canNext={false} />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Previous week' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled();
  });

  it('all days full: every radio disabled, navigation still works', async () => {
    const { onNext } = setup({ days: WEEK.map((d) => ({ ...d, free: 0 })) });
    for (const r of screen.getAllByRole('radio')) expect(r).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(onNext).toHaveBeenCalled();
  });

  it('empty days: no label text, no tiles, no crash', () => {
    setup({ days: [] });
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  describe('week-change announcement (Rule 10)', () => {
    it('is silent on mount', () => {
      setup();
      expect(screen.getByRole('status')).toHaveTextContent('');
    });

    it('announces the new range after the week changes', () => {
      const { rerender, props } = setup();
      rerender(
        <LocaleProvider locale="en-US">
          <DateStrip {...props} days={NEXT_WEEK} />
        </LocaleProvider>,
      );
      expect(screen.getByRole('status')).toHaveTextContent(/^October 12\s*–\s*18$/);
    });

    it('does not announce when the same week re-renders with new objects', () => {
      const { rerender, props } = setup();
      rerender(
        <LocaleProvider locale="en-US">
          <DateStrip {...props} days={WEEK.map((d) => ({ ...d }))} />
        </LocaleProvider>,
      );
      expect(screen.getByRole('status')).toHaveTextContent('');
    });

    it('StrictMode mount stays silent', () => {
      render(
        <StrictMode>
          <LocaleProvider locale="en-US">
            <DateStrip
              days={WEEK}
              value={null}
              onChange={vi.fn()}
              onPrevious={vi.fn()}
              onNext={vi.fn()}
            />
          </LocaleProvider>
        </StrictMode>,
      );
      expect(screen.getByRole('status')).toHaveTextContent('');
    });
  });

  it('localizes (ru): month, names and plural counts', () => {
    render(
      <I18nProvider locale="ru">
        <LocaleProvider locale="ru-RU">
          <DateStrip
            days={WEEK}
            value={null}
            onChange={vi.fn()}
            onPrevious={vi.fn()}
            onNext={vi.fn()}
          />
        </LocaleProvider>
      </I18nProvider>,
    );
    expect(screen.getByRole('button', { name: 'Следующая неделя' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /1 свободное$/ })).toBeInTheDocument(); // Oct 6
    expect(screen.getByRole('radio', { name: /3 свободных$/ })).toBeInTheDocument(); // Oct 5
    expect(screen.getByRole('radio', { name: /Нет времени$/ })).toBeDisabled();
  });

  it('forwards ref to the fieldset, merges className, spreads props', () => {
    const ref = createRef<HTMLFieldSetElement>();
    setup({ ref, className: 'extra', 'data-testid': 'ds' } as Partial<DateStripProps>);
    expect(ref.current?.tagName).toBe('FIELDSET');
    expect(screen.getByTestId('ds').className).toMatch(/extra/);
    expect(screen.getByTestId('ds').className).toMatch(/root/);
  });

  it('a consumer aria-label cannot replace the month name (Pattern B)', () => {
    setup({ 'aria-label': 'Pick a day' } as Partial<DateStripProps>);
    expect(screen.getByRole('group', { name: 'October 2026' })).toBeInTheDocument();
  });
});
```

(`setup` passes `ref` inside props; `DateStripProps` does not include `ref`, hence the cast. If `LocaleProvider`/`I18nProvider` export paths or prop names differ, read `src/i18n/LocaleProvider.tsx` / `I18nProvider.tsx` and adjust imports only.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/DateStrip`
Expected: FAIL — cannot resolve `./DateStrip`.

- [ ] **Step 3: Tokens** — `DateStrip.tokens.scss`:

```scss
// DateStrip.tokens.scss — component tokens. Tile colors default to Button's so
// theming Button themes the tiles. Convention: --date-strip-<part>-<state>.
@use '../Button/Button.tokens';

:root {
  --date-strip-gap: var(--space-2);
  --date-strip-header-gap: var(--space-3);
  --date-strip-tile-padding-y: var(--space-2);
  --date-strip-tile-radius: var(--button-radius);
  --date-strip-tile-bg: var(--button-bg-secondary);
  --date-strip-tile-bg-hover: var(--button-bg-secondary-hover);
  --date-strip-tile-fg: var(--button-fg-secondary);
  --date-strip-tile-border: var(--button-border-color-secondary);
  --date-strip-tile-bg-checked: var(--button-bg);
  --date-strip-tile-bg-checked-hover: var(--button-bg-hover);
  --date-strip-tile-fg-checked: var(--button-fg);
  --date-strip-tile-ring: var(--button-ring);
  --date-strip-tile-opacity-disabled: var(--button-opacity-disabled);
  --date-strip-dow-font-size: var(--font-size-xs);
  --date-strip-num-font-size: var(--font-size-lg);
  --date-strip-num-font-weight: var(--font-weight-semibold);
  --date-strip-count-font-size: var(--font-size-xs);
}
```

Verify every referenced primitive exists (`grep -- '--font-weight-semibold' src/styles/tokens.scss`, etc.); swap for the nearest existing token if not — never a raw value.

- [ ] **Step 4: Styles** — `DateStrip.module.scss`:

```scss
@use './DateStrip.tokens';
@use '../_internal/choiceTile' as tile;

.root {
  // UA fieldset reset (precedent: Radio/RadioGroup.module.scss).
  // stylelint-disable-next-line property-disallowed-list -- UA fieldset reset, not layout
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--date-strip-header-gap);
  container-type: inline-size;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--date-strip-header-gap);
}

.tiles {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--date-strip-gap);
}

.tile {
  @include tile.choice-tile(
    $input: '.input',
    $bg: var(--date-strip-tile-bg),
    $bg-hover: var(--date-strip-tile-bg-hover),
    $fg: var(--date-strip-tile-fg),
    $border: var(--date-strip-tile-border),
    $bg-checked: var(--date-strip-tile-bg-checked),
    $bg-checked-hover: var(--date-strip-tile-bg-checked-hover),
    $fg-checked: var(--date-strip-tile-fg-checked),
    $radius: var(--date-strip-tile-radius),
    $ring: var(--date-strip-tile-ring),
    $opacity-disabled: var(--date-strip-tile-opacity-disabled)
  );

  padding: var(--date-strip-tile-padding-y) 0;
}

// Needs a real declaration so CSS Modules emits the class the mixin targets.
.input {
  opacity: 0;
}

.body {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dow {
  font-size: var(--date-strip-dow-font-size);
}

.num {
  font-size: var(--date-strip-num-font-size);
  font-weight: var(--date-strip-num-font-weight);
}

.count {
  font-size: var(--date-strip-count-font-size);
  white-space: nowrap;
}

// Narrow strip: 7 tiles can't fit "9 free" — the tile's name still carries it.
@container (max-width: 30rem) {
  .count {
    display: none;
  }
}
```

Note: the `.input` rule and the mixin's visually-hidden rule both target the input; the mixin's is more specific (`.tile .input`). If stylelint flags the `.root` block (`display` after `min-width` ordering etc.), fix per the reported rule. Run `npx stylelint "packages/design-system/src/components/DateStrip/*.scss"` from the repo root.

- [ ] **Step 5: Component** — `DateStrip.tsx`:

```tsx
import { forwardRef, useEffect, useId, useRef, useState, type FieldsetHTMLAttributes } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../Button';
import { Cluster } from '../Cluster';
import { Title, type TitleOrder } from '../Title';
import { LiveRegion } from '../LiveRegion';
import { VisuallyHidden } from '../VisuallyHidden';
import { useTranslation } from '../../i18n/useTranslation';
import { useLocale } from '../../i18n/useLocale';
import { formatIsoDay, formatIsoRange } from '../_internal/isoDay';
import styles from './DateStrip.module.scss';

/** One day tile. */
export interface DateStripDay {
  /** Calendar day as `'YYYY-MM-DD'`. Formatted in UTC, so the host timezone never shifts it. */
  date: string;
  /** Free times that day. `0` renders "No times" and disables the tile. */
  free: number;
}

export interface DateStripProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'onChange'
> {
  /** The days to show, in order — usually one week (7). The month heading is derived from the first and last. */
  days: DateStripDay[];
  /** Selected day (`'YYYY-MM-DD'`), or `null`. A value not in `days` checks nothing. */
  value: string | null;
  /** Called with the chosen day's `'YYYY-MM-DD'`. Controlled — update `value` yourself. */
  onChange: (date: string) => void;
  /** Previous-week button handler. Replace `days` with the earlier week. */
  onPrevious: () => void;
  /** Next-week button handler. Replace `days` with the later week. */
  onNext: () => void;
  /** `false` disables the previous-week button (e.g. the current week). Default `true`. */
  canPrevious?: boolean;
  /** `false` disables the next-week button (end of the booking window). Default `true`. */
  canNext?: boolean;
  /** Heading level of the month label. Default `2`. */
  titleOrder?: TitleOrder;
  /** Radio group `name` (also submitted with a form). Default: a generated id. */
  name?: string;
}

/**
 * One week of selectable day tiles under a month heading with previous/next
 * week buttons. Each tile shows the short weekday, the day number and how
 * many free times the day has; a day with none reads "No times" and is
 * disabled. Built on native radios sharing one `name`: the strip is one Tab
 * stop, arrow keys move and select, disabled days are skipped.
 *
 * @example
 * const [day, setDay] = useState<string | null>(null);
 * <DateStrip
 *   days={week} // [{ date: '2026-10-05', free: 3 }, …]
 *   value={day}
 *   onChange={setDay}
 *   onPrevious={() => setWeekStart(addDays(weekStart, -7))}
 *   onNext={() => setWeekStart(addDays(weekStart, 7))}
 *   canPrevious={weekStart > today}
 * />
 *
 * @example
 * // Booking time step: DateStrip picks the day, SlotGrid the time.
 * <Stack gap="lg">
 *   <DateStrip days={week} value={day} onChange={setDay} onPrevious={prev} onNext={next} />
 *   <SlotGrid groups={slotsFor(day)} value={slot} onChange={setSlot} />
 * </Stack>
 *
 * @remarks When NOT to use
 * - Picking any date across months → `<InlineDatePicker>` / `<DatePicker>`.
 * - Scheduling / showing events → `<Calendar>`.
 * - Picking a time of day → `<SlotGrid>` (offered slots) or `<TimeField>` (free-form).
 *
 * @remarks Anti-patterns
 * - ❌ Passing `Date` objects or locale-formatted strings in `date` — it is an
 *   ISO `'YYYY-MM-DD'` calendar day; the strip formats it.
 * - ❌ Building `date` from `toISOString()` of a local-midnight `Date` — that
 *   shifts a day west of UTC. Produce the business-timezone calendar day.
 * - ❌ An `aria-label` on the strip — the month heading names the group.
 * - ❌ Hiding days with no times instead of passing `free: 0` — the week
 *   loses its shape and the user can't see the day is full.
 */
export const DateStrip = forwardRef<HTMLFieldSetElement, DateStripProps>(function DateStrip(
  {
    days,
    value,
    onChange,
    onPrevious,
    onNext,
    canPrevious = true,
    canNext = true,
    titleOrder = 2,
    name,
    className,
    ...props
  },
  ref,
) {
  const t = useTranslation();
  const locale = useLocale();
  const titleId = useId();
  const generatedName = useId();
  const groupName = name ?? generatedName;

  const first = days[0]?.date;
  const last = days[days.length - 1]?.date;
  const monthLabel =
    first && last ? formatIsoRange(first, last, locale, { month: 'long', year: 'numeric' }) : '';

  // Rule 10: activating Next keeps focus on the button while the week under
  // it changes — announce the new range. Computed in an effect keyed on the
  // first day, so it is silent on mount and on same-week refetches.
  const [announcement, setAnnouncement] = useState('');
  const announcedFirst = useRef(first);
  useEffect(() => {
    if (first === announcedFirst.current) return;
    announcedFirst.current = first;
    setAnnouncement(
      first && last
        ? t('dateStrip.range', {
            range: formatIsoRange(first, last, locale, { month: 'long', day: 'numeric' }),
          })
        : '',
    );
  }, [first, last, locale, t]);

  return (
    // {...props} first so the month heading always names the group (Pattern B).
    <fieldset
      {...props}
      ref={ref}
      className={clsx(styles.root, className)}
      aria-label={undefined}
      aria-labelledby={titleId}
    >
      <div className={styles.header}>
        <Title id={titleId} order={titleOrder} size="md">
          {monthLabel}
        </Title>
        <Cluster gap="xs">
          <Button
            variant="secondary"
            size="lg"
            iconOnly
            aria-label={t('dateStrip.previousWeek')}
            disabled={!canPrevious}
            onClick={onPrevious}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="lg"
            iconOnly
            aria-label={t('dateStrip.nextWeek')}
            disabled={!canNext}
            onClick={onNext}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
        </Cluster>
      </div>
      <div className={styles.tiles}>
        {days.map((day) => {
          const availability =
            day.free > 0 ? t('dateStrip.free', { count: day.free }) : t('dateStrip.noTimes');
          return (
            <label key={day.date} className={styles.tile}>
              <input
                type="radio"
                className={styles.input}
                name={groupName}
                value={day.date}
                checked={value === day.date}
                disabled={day.free === 0}
                onChange={() => onChange(day.date)}
              />
              {/* Visual body hidden from AT: its spans would concatenate into
                  "Wed79 free". The name is the full sentence below. */}
              <span className={styles.body} aria-hidden="true">
                <span className={styles.dow}>
                  {formatIsoDay(day.date, locale, { weekday: 'short' })}
                </span>
                <span className={styles.num}>
                  {formatIsoDay(day.date, locale, { day: 'numeric' })}
                </span>
                <span className={styles.count}>{availability}</span>
              </span>
              <VisuallyHidden>
                {t('dateStrip.day', {
                  date: formatIsoDay(day.date, locale, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  }),
                  availability,
                })}
              </VisuallyHidden>
            </label>
          );
        })}
      </div>
      <LiveRegion>{announcement}</LiveRegion>
    </fieldset>
  );
});
```

Check before running: `Title` accepts `id` + `size` (it extends `HTMLAttributes<HTMLHeadingElement>`); `Title`/`Button`/`Cluster`/`LiveRegion`/`VisuallyHidden` index paths exist; `Button` `iconOnly` requires `aria-label` (it does here). If `VisuallyHidden` renders a `div` by default, pass the prop that makes it a `span` (inline content inside `<label>`) — read `VisuallyHidden.tsx`.

`index.ts`:

```ts
export { DateStrip } from './DateStrip';
export type { DateStripProps, DateStripDay } from './DateStrip';
```

- [ ] **Step 6: Run to verify it passes**

Run: `cd packages/design-system && npx vitest run src/components/DateStrip src/components/_internal/isoDay.test.ts`
Expected: PASS. If a name assertion fails because jsdom joins the VisuallyHidden text differently, debug with `screen.getAllByRole('radio').map(r => computeAccessibleName(r))` (from `dom-accessibility-api`) — fix the markup, not the expected strings (they are the contract).

- [ ] **Step 7: Exports, manifest, AGENTS.md**
  - `src/index.ts`: `export { DateStrip } from './components/DateStrip';` + `export type { DateStripProps, DateStripDay } from './components/DateStrip';`
  - `DateStrip: 'Forms'` in `CLUSTERS` of both `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs`.
  - AGENTS.md section (placed near DatePicker):

````markdown
### `<DateStrip>` — week of selectable day tiles

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

- `date` is an ISO `'YYYY-MM-DD'` calendar day (the business's day, not a `Date`); the strip formats weekday / number / month through the locale in UTC, so the browser timezone never shifts it. The month heading is derived ("October 2026", "September – October 2026").
- `free: 0` → "No times", tile natively disabled (skipped by Tab and arrows). Keep full days in the array.
- Native radios, one `name`: one Tab stop, arrows move AND select (so `onChange` fires per arrow press — debounce slot fetching if needed). Tiles are `role="radio"` named "Wednesday, October 7, 9 free"; query them that way in tests.
- Controlled only. `canPrevious` / `canNext` (default `true`) disable the week buttons. `titleOrder` (default 2) sets the heading level.
- Changing week announces the new range politely; same-week re-renders stay silent.
- ❌ No `aria-label` on the strip — the month heading names the group. ❌ No `Date`/`toISOString()` for `date`.
- When NOT to use: any-date picking → `<InlineDatePicker>`; events → `<Calendar>`; times → `<SlotGrid>`.
````

- Run: `cd packages/design-system && npm run build:manifest` then `npx vitest run src/_meta` — Expected: PASS (manifest drift test).

- [ ] **Step 8: Commit**

```bash
git add packages/design-system
git commit -m "feat: add DateStrip (#560)"
```

---

### Task 3: SlotGrid component (library side, complete)

**Files:**

- Create: `packages/design-system/src/components/SlotGrid/SlotGrid.tsx`
- Create: `packages/design-system/src/components/SlotGrid/SlotGrid.module.scss`
- Create: `packages/design-system/src/components/SlotGrid/SlotGrid.tokens.scss`
- Create: `packages/design-system/src/components/SlotGrid/SlotGrid.test.tsx`
- Create: `packages/design-system/src/components/SlotGrid/index.ts`
- Modify: `packages/design-system/src/index.ts`, `src/_meta/manifest.ts`, `scripts/generate-manifest.mjs` (`SlotGrid: 'Forms'`), `AGENTS.md`

**Interfaces:**

- Consumes (Task 1): `choice-tile` mixin; i18n key `slotGrid.empty`.
- Produces: `SlotGrid`, `SlotGridProps`, `SlotGridGroup`, `SlotGridSlot` exported from `@eocrm/design-system`.

- [ ] **Step 1: Write the failing tests** — `SlotGrid.test.tsx`:

```tsx
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n/I18nProvider';
import { SlotGrid, type SlotGridGroup, type SlotGridProps } from './SlotGrid';

const GROUPS: SlotGridGroup[] = [
  {
    label: 'Morning',
    slots: [
      { key: '09:00', label: '9:00' },
      { key: '09:30', label: '9:30' },
    ],
  },
  { label: 'Afternoon', slots: [{ key: '14:00', label: '2:00' }] },
  { label: 'Evening', slots: [] },
];

function setup(props: Partial<SlotGridProps> = {}) {
  const onChange = vi.fn();
  const all: SlotGridProps = { groups: GROUPS, value: null, onChange, ...props };
  return { ...render(<SlotGrid {...all} />), onChange, props: all };
}

describe('<SlotGrid>', () => {
  it('renders a fieldset per non-empty group, named by its legend heading', () => {
    setup();
    const morning = screen.getByRole('group', { name: 'Morning' });
    expect(morning.tagName).toBe('FIELDSET');
    expect(screen.getByRole('group', { name: 'Afternoon' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Evening' })).toBeNull();
    expect(screen.getByRole('heading', { level: 3, name: 'Morning' })).toBeInTheDocument();
  });

  it('titleOrder sets the group heading level', () => {
    setup({ titleOrder: 4 });
    expect(screen.getByRole('heading', { level: 4, name: 'Morning' })).toBeInTheDocument();
  });

  it('one radio per slot, named by its label, all sharing one name', () => {
    setup({ name: 'slot' });
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    for (const r of radios) expect(r).toHaveAttribute('name', 'slot');
    expect(screen.getByRole('radio', { name: '9:30' })).toHaveAttribute('value', '09:30');
  });

  it('controlled: value checks; clicking calls onChange with the key', async () => {
    const { onChange } = setup({ value: '09:00' });
    expect(screen.getByRole('radio', { name: '9:00' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: '2:00' }));
    expect(onChange).toHaveBeenCalledWith('14:00');
    expect(screen.getByRole('radio', { name: '9:00' })).toBeChecked();
  });

  it('value not among the slots checks nothing', () => {
    setup({ value: '18:00' });
    for (const r of screen.getAllByRole('radio')) expect(r).not.toBeChecked();
  });

  it('renders the default empty state when no group has slots', () => {
    setup({ groups: [] });
    expect(screen.getByText('No available times')).toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('all groups empty also shows the empty state', () => {
    setup({ groups: [{ label: 'Morning', slots: [] }] });
    expect(screen.getByText('No available times')).toBeInTheDocument();
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('custom empty content', () => {
    setup({ groups: [], empty: <p>Try another day</p> });
    expect(screen.getByText('Try another day')).toBeInTheDocument();
    expect(screen.queryByText('No available times')).toBeNull();
  });

  it('localizes the default empty state (ru)', () => {
    render(
      <I18nProvider locale="ru">
        <SlotGrid groups={[]} value={null} onChange={vi.fn()} />
      </I18nProvider>,
    );
    expect(screen.getByText('Нет свободного времени')).toBeInTheDocument();
  });

  it('forwards ref to the root div, merges className, spreads props', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SlotGrid
        ref={ref}
        groups={GROUPS}
        value={null}
        onChange={vi.fn()}
        className="extra"
        data-testid="sg"
      />,
    );
    expect(ref.current).toBe(screen.getByTestId('sg'));
    expect(ref.current?.className).toMatch(/extra/);
    expect(ref.current?.className).toMatch(/root/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/SlotGrid`
Expected: FAIL — cannot resolve `./SlotGrid`.

- [ ] **Step 3: Tokens** — `SlotGrid.tokens.scss`:

```scss
// SlotGrid.tokens.scss — component tokens. Tile colors default to Button's.
@use '../Button/Button.tokens';

:root {
  --slot-grid-group-gap: var(--space-5);
  --slot-grid-legend-gap: var(--space-2);
  --slot-grid-gap: var(--space-2);
  --slot-grid-tile-height: var(--button-height-md);
  --slot-grid-tile-font-size: var(--button-font-size-md);
  --slot-grid-tile-font-weight: var(--button-font-weight);
  --slot-grid-tile-radius: var(--button-radius);
  --slot-grid-tile-bg: var(--button-bg-secondary);
  --slot-grid-tile-bg-hover: var(--button-bg-secondary-hover);
  --slot-grid-tile-fg: var(--button-fg-secondary);
  --slot-grid-tile-border: var(--button-border-color-secondary);
  --slot-grid-tile-bg-checked: var(--button-bg);
  --slot-grid-tile-bg-checked-hover: var(--button-bg-hover);
  --slot-grid-tile-fg-checked: var(--button-fg);
  --slot-grid-tile-ring: var(--button-ring);
  --slot-grid-tile-opacity-disabled: var(--button-opacity-disabled);
}
```

- [ ] **Step 4: Styles** — `SlotGrid.module.scss`:

```scss
@use './SlotGrid.tokens';
@use '../_internal/choiceTile' as tile;

.root {
  display: flex;
  flex-direction: column;
  gap: var(--slot-grid-group-gap);
  container-type: inline-size;
}

.group {
  // UA fieldset reset (precedent: Radio/RadioGroup.module.scss).
  // stylelint-disable-next-line property-disallowed-list -- UA fieldset reset, not layout
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.legend {
  // stylelint-disable-next-line property-disallowed-list -- UA legend reset + internal spacing to the tiles
  margin: 0 0 var(--slot-grid-legend-gap);
  padding: 0;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--slot-grid-gap);
}

@container (max-width: 48rem) {
  .tiles {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.tile {
  @include tile.choice-tile(
    $input: '.input',
    $bg: var(--slot-grid-tile-bg),
    $bg-hover: var(--slot-grid-tile-bg-hover),
    $fg: var(--slot-grid-tile-fg),
    $border: var(--slot-grid-tile-border),
    $bg-checked: var(--slot-grid-tile-bg-checked),
    $bg-checked-hover: var(--slot-grid-tile-bg-checked-hover),
    $fg-checked: var(--slot-grid-tile-fg-checked),
    $radius: var(--slot-grid-tile-radius),
    $ring: var(--slot-grid-tile-ring),
    $opacity-disabled: var(--slot-grid-tile-opacity-disabled)
  );

  height: var(--slot-grid-tile-height);
  font-size: var(--slot-grid-tile-font-size);
  font-weight: var(--slot-grid-tile-font-weight);
}

.input {
  opacity: 0;
}
```

- [ ] **Step 5: Component** — `SlotGrid.tsx`:

```tsx
import { forwardRef, useId, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Text } from '../Text';
import { Title, type TitleOrder } from '../Title';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './SlotGrid.module.scss';

/** One selectable time. */
export interface SlotGridSlot {
  /** Stable id passed to `onChange` and matched against `value`. */
  key: string;
  /** Visible text and accessible name, already formatted in the business's timezone (e.g. "9:30"). */
  label: string;
}

/** A part of the day ("Morning", "Afternoon") and its slots. */
export interface SlotGridGroup {
  /** Visible heading; also names the group for assistive tech. */
  label: string;
  /** Slots in display order. A group with none is not rendered. */
  slots: SlotGridSlot[];
}

export interface SlotGridProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Groups in display order. */
  groups: SlotGridGroup[];
  /** Selected slot `key`, or `null`. A key not in `groups` checks nothing. */
  value: string | null;
  /** Called with the chosen slot's `key`. Controlled — update `value` yourself. */
  onChange: (key: string) => void;
  /** Shown when no group has any slot. Default: the localized "No available times". */
  empty?: ReactNode;
  /** Heading level of each group label. Default `3`. */
  titleOrder?: TitleOrder;
  /** Radio group `name` (also submitted with a form). Default: a generated id. */
  name?: string;
}

/**
 * Selectable time-slot tiles grouped by part of the day, with an empty state.
 * Every slot is a native radio sharing one `name`, so the whole grid is one
 * Tab stop with a single exclusive choice across groups; arrow keys move and
 * select (linearly, in reading order). Each group is a `<fieldset>` named by
 * its `<legend>` heading. 6 columns, 3 when the grid's own width is ≤ 48rem.
 *
 * @example
 * <SlotGrid
 *   groups={[
 *     { label: 'Morning', slots: [{ key: '2026-10-07T09:00', label: '9:00' }] },
 *     { label: 'Afternoon', slots: [{ key: '2026-10-07T14:00', label: '14:00' }] },
 *   ]}
 *   value={slot}
 *   onChange={setSlot}
 * />
 *
 * @example
 * // Custom empty state
 * <SlotGrid groups={[]} value={null} onChange={setSlot} empty={<EmptyState title="Fully booked" />} />
 *
 * @remarks When NOT to use
 * - A free-form time → `<TimeField>`.
 * - Two to five mutually exclusive options → `<ButtonGroup value>` or `<RadioGroup>`.
 *
 * @remarks Anti-patterns
 * - ❌ Filtering out full slots by rendering them disabled — pass only the
 *   bookable ones; there is no per-slot `disabled`.
 * - ❌ Reusing a `key` across groups — the choice is exclusive across the whole grid.
 * - ❌ Wrapping in your own `role="radiogroup"` — the native radios already
 *   form the group.
 */
export const SlotGrid = forwardRef<HTMLDivElement, SlotGridProps>(function SlotGrid(
  { groups, value, onChange, empty, titleOrder = 3, name, className, ...props },
  ref,
) {
  const t = useTranslation();
  const generatedName = useId();
  const groupName = name ?? generatedName;
  const visible = groups.filter((g) => g.slots.length > 0);

  return (
    <div ref={ref} className={clsx(styles.root, className)} {...props}>
      {visible.length === 0
        ? (empty ?? <Text tone="muted">{t('slotGrid.empty')}</Text>)
        : visible.map((group) => (
            <fieldset key={group.label} className={styles.group}>
              <legend className={styles.legend}>
                <Title order={titleOrder} size="sm">
                  {group.label}
                </Title>
              </legend>
              <div className={styles.tiles}>
                {group.slots.map((slot) => (
                  <label key={slot.key} className={styles.tile}>
                    <input
                      type="radio"
                      className={styles.input}
                      name={groupName}
                      value={slot.key}
                      checked={value === slot.key}
                      onChange={() => onChange(slot.key)}
                    />
                    {slot.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
    </div>
  );
});
```

Check `Text` has `tone="muted"` and `Title` has `size="sm"` (read their prop types); use the nearest existing value if not.

`index.ts`:

```ts
export { SlotGrid } from './SlotGrid';
export type { SlotGridProps, SlotGridGroup, SlotGridSlot } from './SlotGrid';
```

- [ ] **Step 6: Run to verify it passes**

Run: `cd packages/design-system && npx vitest run src/components/SlotGrid`
Expected: PASS.

- [ ] **Step 7: Exports, manifest, AGENTS.md**
  - `src/index.ts`: `export { SlotGrid } from './components/SlotGrid';` + `export type { SlotGridProps, SlotGridGroup, SlotGridSlot } from './components/SlotGrid';`
  - `SlotGrid: 'Forms'` in both `CLUSTERS` maps; `npm run build:manifest`; `npx vitest run src/_meta` → PASS.
  - AGENTS.md section (after DateStrip):

````markdown
### `<SlotGrid>` — grouped time-slot tiles

```tsx
<SlotGrid
  groups={[
    {
      label: 'Morning',
      slots: [
        { key: '09:00', label: '9:00' },
        { key: '09:30', label: '9:30' },
      ],
    },
    { label: 'Afternoon', slots: [{ key: '14:00', label: '14:00' }] },
  ]}
  value={slot}
  onChange={setSlot}
  empty={<Text tone="muted">No times this day — try another.</Text>} // optional
/>
```

- Slot `label`s are yours, formatted in the business's timezone. `key` is what `onChange` returns; keep it unique across ALL groups (one exclusive choice).
- Native radios with one `name`: one Tab stop for the whole grid, arrows move AND select in reading order (↓ goes to the next slot, not the one below). Tiles are `role="radio"` named by their label; each group is a `<fieldset>` named by its heading (`titleOrder`, default 3).
- Groups with no slots are skipped; if none has slots, `empty` renders (default: localized "No available times").
- 6 columns, 3 when the grid's own width ≤ 48rem (container query).
- ❌ No per-slot `disabled` — pass only bookable slots. ❌ Don't wrap it in your own `role="radiogroup"`.
- When NOT to use: free-form time → `<TimeField>`; a handful of options → `<ButtonGroup value>` / `<RadioGroup>`.
````

- [ ] **Step 8: Commit**

```bash
git add packages/design-system
git commit -m "feat: add SlotGrid (#561)"
```

---

### Task 4: Playground demos + wiring (both components)

**Files:**

- Create: `packages/playground/src/pages/components/DateStripDemo.tsx`
- Create: `packages/playground/src/pages/components/SlotGridDemo.tsx`
- Modify: `packages/playground/src/App.tsx` (import + `<Route path="/components/date-strip">` and `/components/slot-grid`, next to the `/components/timefield` route)
- Modify: `packages/playground/src/layout/AppShell/navItems.ts` (two entries in the same `componentGroups` group as TimeField at line ~211; icons from lucide: `CalendarDays` for DateStrip, `LayoutGrid` for SlotGrid — any existing lucide icon import style in the file)
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx` (two entries next to `TimeField` at line ~524, same shape: `to`, `name`, `description`, `preview: SCHEMATICS['…']`)
- Modify: `packages/playground/src/pages/components/overviewSchematics.tsx` (two schematics using the file's `Row`/`Col`/`Outline`/`Solid`/`Bar` primitives — DateStrip: a `Bar` + a row of 7 small `Outline` tiles with one `Solid`; SlotGrid: two `Bar`s each above a row of 3–4 `Outline`s with one `Solid`)
- Modify: `packages/playground/src/pages/mockups/registry.ts` (`| 'DateStrip'` and `| 'SlotGrid'` in the `ComponentName` union)
- Modify: `packages/playground/src/lib/props.manifest.json` (regenerated)

**Interfaces:**

- Consumes: `DateStrip`, `DateStripDay`, `SlotGrid`, `SlotGridGroup` from `@eocrm/design-system`. Demo scaffolding: read `packages/playground/CLAUDE.md` and mirror an existing demo (e.g. `TourDemo.tsx`, `SplitDemo.tsx`): `DemoLayout` (`name`, `description`, `files={getComponentFiles('<Name>')}`, `componentName`), `Example` (`title`, `description`, `code`), `ResizablePreview` for width-dependent behavior.

- [ ] **Step 1: DateStripDemo.** Examples:
  1. **"Booking week"** — stateful: a `weekStart` ISO string (`'2026-10-05'`), `days` generated for 7 days with a deterministic `free` pattern (e.g. `[3, 1, 9, 0, 2, 0, 4]` rotated by week index), `canPrevious` false on the first week, `canNext` false after 4 weeks, selected `day` state shown below via `<Text>`. Date math on ISO strings: `const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);` (UTC-safe because `Date.parse` of `YYYY-MM-DD` is UTC).
  2. **"Month boundary"** — static week `2026-09-28`…`2026-10-04` to show "September – October 2026".
  3. **"Narrow container"** — the example 1 strip inside `<ResizablePreview initialWidth={320}>` showing the count hide.
     Each `code` string is a self-contained snippet importing from `@eocrm/design-system`.
- [ ] **Step 2: SlotGridDemo.** Examples:
  1. **"Grouped slots"** — Morning (6 slots), Afternoon (8), Evening (3), stateful `value`, inside `<ResizablePreview>` to show 6 → 3 columns.
  2. **"Empty"** — default empty state and a custom `empty`.
  3. **"With DateStrip"** — the booking step: DateStrip + SlotGrid in a `<Stack gap="lg">`, slots derived from the selected day (none until a day is chosen → empty state "Pick a day to see times").
- [ ] **Step 3: Wire** the route, nav entry, ComponentsIndex entry, schematic, and `ComponentName` union for both.
- [ ] **Step 4: Regenerate props**: `cd packages/playground && npm run build:props` — expect "props.manifest.json regenerated".
- [ ] **Step 5: Typecheck both packages**: `cd <repo root> && npm run typecheck` → no errors. Lint styles: `npx stylelint "packages/**/*.scss"` from root → clean. Run all design-system tests: `cd packages/design-system && npx vitest run` → PASS.
- [ ] **Step 6: Visual check** — dev server on port **8090** (`cd packages/playground && npx vite --port 8090 --strictPort`; it may already be running). With Playwright: open `/components/date-strip` and `/components/slot-grid`; verify unchecked/checked/disabled/hover/focus-visible (Tab in, arrows move selection, disabled days skipped), narrow container behavior, light + dark theme. Screenshot into `.playwright-mcp/`. Close the browser after.
- [ ] **Step 7: Commit**

```bash
git add packages/playground
git commit -m "feat(playground): DateStrip + SlotGrid demos (#560, #561)"
```

- [ ] **Step 8: STOP — user demo check.** Report the two URLs (`http://localhost:8090/components/date-strip`, `/components/slot-grid`) and wait. No PR, no push, no pre-push-review until the user says so.
