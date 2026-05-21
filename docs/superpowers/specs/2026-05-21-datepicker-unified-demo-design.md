# Unified DatePicker demo page — design spec

**Date:** 2026-05-21
**Branch:** `refactor/datepicker-unified-demo`
**Scope:** Playground only. No library changes.

## Goal

Collapse the four current datepicker demo pages (`DatePicker`, `DateRangePicker`, `InlineDatePicker`, `InlineDateRangePicker`) into a single `/components/datepickers` page with a `<Tabs>` strip selecting which variant's Examples + source-view to show.

## Why

- All four share the same mental model (single vs range × popover vs inline). A single page lets a reader compare them side-by-side instead of clicking around.
- Forms group sidebar density: 5 entries → 2 entries.
- Each variant's API is similar enough that the reader's question "which one do I want?" is best answered with all four visible at once.

## Architecture

### Routing

- One route: `/components/datepickers` → `<DatePickersDemo>`.
- Active variant in URL search param: `?variant=datepicker|daterangepicker|inline-datepicker|inline-daterangepicker`.
  - Missing / invalid → defaults to `datepicker` (the canonical first variant).
- No backward-compat redirects. Mockup `usesComponents → URL` mapping handles the rebinding via the shared `componentPath()` helper.

### `DemoLayout` split

`DemoLayout.tsx` today renders header + source-details + examples-grid + cross-link in one function. To reuse the bottom three pieces _under tabs_, extract `DemoBody.tsx`:

- `DemoBody` props: `tsxSource`, `scssSource`, `tsxFilename`, `scssFilename`, `componentName?`, `children`. Renders source `<details>` + examples grid + `<CrossLinks>`.
- `DemoLayout` becomes: page header (eyebrow + h1 + description) + `<DemoBody>`. Public API unchanged — all existing demos keep working.

### Per-variant panels

Each of the four existing demo files keeps its file path but its public shape changes:

- Old: `export function <X>Demo()` — calls `<DemoLayout>` with everything.
- New: `export function <X>DemoPanel()` — calls `<DemoBody>` with the same source + `<Example>` children, NO page header.

This keeps each variant's local subcomponents (e.g., `ControlledDemo`, `FormDemo`) co-located with its examples. The standalone `<DatePickerDemo>` etc. components stop existing.

### New page

`packages/playground/src/pages/components/DatePickersDemo.tsx`:

```tsx
export function DatePickersDemo() {
  const [params, setParams] = useSearchParams();
  const active = (params.get('variant') as Variant) ?? 'datepicker';

  return (
    <Stack gap="lg">
      <header className={styles.header}>
        <span className={styles.eyebrow}>Component</span>
        <h1 className={styles.title}>Date pickers</h1>
        <p className={styles.description}>
          Single date or range × popover field or inline calendar. Four variants of the same
          month-grid surface; pick the one that matches the page's interaction need.
        </p>
      </header>

      <Tabs
        items={[
          { id: 'datepicker', label: 'DatePicker' },
          { id: 'daterangepicker', label: 'DateRangePicker' },
          { id: 'inline-datepicker', label: 'InlineDatePicker' },
          { id: 'inline-daterangepicker', label: 'InlineDateRangePicker' },
        ]}
        activeId={active}
        onChange={(id) => setParams({ variant: id }, { replace: true })}
      />

      {active === 'datepicker' && <DatePickerDemoPanel />}
      {active === 'daterangepicker' && <DateRangePickerDemoPanel />}
      {active === 'inline-datepicker' && <InlineDatePickerDemoPanel />}
      {active === 'inline-daterangepicker' && <InlineDateRangePickerDemoPanel />}
    </Stack>
  );
}
```

The header CSS classes come from `DemoLayout.module.scss` — extract the header rules into a shared `pageHeader.module.scss` OR re-import the same module here. Decision: re-export the three relevant class names from a new `pageHeader.module.scss` so both `DemoLayout` and `DatePickersDemo` use one definition.

### `componentPath()` extension

`packages/playground/src/pages/shared/CrossLinks.tsx`:

```ts
function componentPath(name: ComponentName): string {
  switch (name) {
    case 'DatePicker':
      return '/components/datepickers?variant=datepicker';
    case 'DateRangePicker':
      return '/components/datepickers?variant=daterangepicker';
    case 'InlineDatePicker':
      return '/components/datepickers?variant=inline-datepicker';
    case 'InlineDateRangePicker':
      return '/components/datepickers?variant=inline-daterangepicker';
    default: {
      // PascalCase → kebab-case (existing logic)
      const slug = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      return `/components/${slug}`;
    }
  }
}
```

`ComponentName` union stays unchanged — all four datepicker names remain valid mockup-registry identifiers.

### Sidebar (AppShell)

Forms group: 5 entries → 2.

- Remove: `DatePicker`, `DateRangePicker`, `InlineDatePicker`, `InlineDateRangePicker`.
- Add: `{ to: '/components/datepickers', label: 'Date pickers', icon: CalendarRange, end: false }` between `Button` and `Input`. (CalendarRange is the most "this covers ranges + dates" of the options; it was already used for DateRangePicker.)

### ComponentsIndex

Four cards → one card "Date pickers" between Button and Input. Preview uses a small popover-mode `DatePicker` with the standard fixed-snapshot date — readers can click in to see the other three.

### Route registry (`App.tsx`)

Four routes → one route:

- Remove: `/components/datepicker`, `/components/daterangepicker`, `/components/inline-datepicker`, `/components/inline-daterangepicker`.
- Add: `/components/datepickers` → `<DatePickersDemo>`.

### Files touched

Modified:

- `packages/playground/src/pages/components/DemoLayout.tsx` (split header out)
- `packages/playground/src/pages/components/DatePickerDemo.tsx` (export `DatePickerDemoPanel` instead of `DatePickerDemo`)
- `packages/playground/src/pages/components/DateRangePickerDemo.tsx` (likewise)
- `packages/playground/src/pages/components/InlineDatePickerDemo.tsx` (likewise)
- `packages/playground/src/pages/components/InlineDateRangePickerDemo.tsx` (likewise)
- `packages/playground/src/pages/components/ComponentsIndex.tsx` (4 cards → 1)
- `packages/playground/src/pages/shared/CrossLinks.tsx` (extend `componentPath`)
- `packages/playground/src/layout/AppShell/AppShell.tsx` (5 entries → 2 in Forms)
- `packages/playground/src/App.tsx` (4 routes → 1)

Created:

- `packages/playground/src/pages/components/DatePickersDemo.tsx`
- `packages/playground/src/pages/components/DemoBody.tsx`

## Behavior

- Direct nav to `/components/datepickers` → DatePicker tab active.
- Direct nav to `/components/datepickers?variant=inline-daterangepicker` → InlineDateRangePicker tab active.
- Clicking a tab calls `setParams({ variant }, { replace: true })` so back-button doesn't fill with intra-page jumps.
- Mockup cards like `usesComponents: ['DatePicker']` resolve to `/components/datepickers?variant=datepicker` via `componentPath`. The "Seen in" reverse-link on each tab continues to work because each panel passes its own `componentName` to `<DemoBody>` → `<CrossLinks kind="component" name={...}>`.
- Tab strip uses the existing `<Tabs>` with `activationMode='auto'` (default — panels are eager-rendered, no point in manual mode).

## Risks / open questions

- **Source-detail collapse state**: `<details>` open/closed state is local to each `<DemoBody>`. Switching tabs unmounts the previous panel → resets state. Acceptable (cheap UI; users rarely care).
- **Cross-link "Seen in"** displays per-variant since each panel passes its own `componentName`. A mockup that uses both `DatePicker` and `DateRangePicker` will show up in both tabs' Seen-in row. Correct behavior.
- **Header CSS**: `DemoLayout.module.scss` owns the `.header / .eyebrow / .title / .description` classes. The new `DatePickersDemo.tsx` either imports `DemoLayout.module.scss` directly (slightly weird but works) or those four rules move to a shared module. Decision: keep the rules in `DemoLayout.module.scss` and have `DatePickersDemo.tsx` import it directly (the alternative — extracting a shared header component — is more abstraction than the case warrants).
- **No test coverage on the playground** — playground has no unit tests today. Manual smoke test is sufficient: navigate to each tab via direct URL + click, confirm content renders, confirm `<details>` still expands, confirm cross-links resolve.

## Out of scope

- Library changes. The four library components stay exactly as they are.
- Mockup changes. Their `usesComponents` arrays still reference the four individual `ComponentName`s.
- Backward-compat redirects from old standalone URLs.
- README "components table" update (pre-existing gap; not part of this consolidation).
