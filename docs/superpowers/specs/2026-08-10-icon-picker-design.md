# IconPicker Design

**Issue:** #449  
**Date:** 2026-08-10  
**Branch:** `feat/icon-picker`

## Purpose

Add a controlled `IconPicker` component for choosing one icon from a small,
consumer-curated set. It replaces application-local icon grids with one
accessible, keyboard-operable design-system control.

The design system owns the trigger, popover, grid interaction, selection
styling, and accessibility semantics. Consumers own the option catalog,
ordering, human-readable labels, and rendered glyphs.

## Public API

```tsx
import { Flame, Flag, Zap } from 'lucide-react';
import { IconPicker, type IconPickerOption } from '@eocrm/design-system';

const options: IconPickerOption[] = [
  { value: 'flame', label: 'Flame', icon: <Flame /> },
  { value: 'zap', label: 'Lightning', icon: <Zap /> },
  { value: 'flag', label: 'Flag', icon: <Flag /> },
];

<IconPicker
  value={icon}
  options={options}
  onChange={setIcon}
  aria-label="Pick task-priority icon"
/>;
```

```ts
export interface IconPickerOption {
  /** Stable value passed to `onChange`. */
  value: string;
  /** Human-readable visible/accessible name for the option. */
  label: string;
  /** Decorative glyph rendered in the trigger and option cell. */
  icon: ReactNode;
}

export interface IconPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Controlled selected value. */
  value: string;
  /** Consumer-curated options, rendered in the supplied order. */
  options: IconPickerOption[];
  /** Called once when the user chooses a different or current option. */
  onChange: (value: string) => void;
  /** Prevents opening and selection. */
  disabled?: boolean;
  /** Popover placement. Defaults to `bottom-start`. */
  popoverPlacement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end';
  /** Labels the trigger; forwarded to its focusable button. */
  'aria-label'?: string;
  /** External label ids; forwarded to the trigger. */
  'aria-labelledby'?: string;
  /** Description ids; forwarded to the trigger. */
  'aria-describedby'?: string;
}
```

`IconPicker` forwards its ref and remaining `HTMLAttributes<HTMLDivElement>` to
the root wrapper. The standard ARIA attributes above are removed from the root
props and applied to the trigger, following the repository's composite-field
pattern. There is no component-specific `triggerLabel` prop. The component
composes the trigger name as follows:

- With `aria-label`, use that purpose plus the selected label: “Pick
  task-priority icon: Flame.”
- With `aria-labelledby`, preserve the external label ids and append the id of
  an internal visually hidden selected-label node.
- Without either, use the shared `iconPicker.triggerLabel` i18n message plus the
  selected label: “Pick icon: Flame.”
- If the value is unmatched, omit the selected-label suffix.

`aria-describedby` is forwarded unchanged to the trigger.

The initial release intentionally omits custom triggers, search, multi-select,
uncontrolled state, form serialization, grouping, and a design-system-owned
icon registry.

## Structure and Data Flow

`IconPicker` is a single public component built on the existing `Popover`:

1. Resolve the selected option with `options.find(option => option.value === value)`.
2. Render a standard button trigger containing the selected glyph, when found.
3. Render the supplied options in a compact grid inside `Popover.Content`.
4. On selection, call `onChange(option.value)` and close the popover.
5. Let `Popover` restore focus to the trigger after dismissal.

The consumer remains the only owner of selection state. The component holds
only open state and the active roving-focus index.

Each glyph is wrapped in an `aria-hidden` container because the option's
`label` provides its name. The wrapper normalizes glyph dimensions without
depending on Lucide-specific component types, so custom SVG or other React
content remains valid.

## Interaction and Accessibility

The option grid uses `role="radiogroup"`. Each option is a button with
`role="radio"`, `aria-label={option.label}`, and `aria-checked` reflecting the
controlled value.

Only one radio participates in the tab order. Every time the popover opens, the
active index is reset to the current selected option; if no option matches, it
starts at the first option. This prevents stale focus after the controlled value
changes while the popover is closed.

Keyboard behavior:

- Arrow Right/Left moves one option and clamps at the collection bounds.
- Arrow Down/Up moves one visual row using the four-column grid and
  clamps at the collection bounds.
- Home/End moves to the first/last option in the current row.
- Enter or Space selects the focused option and closes the popover.
- Escape closes without changing the value.

Clicking an option follows the same commit path. Selecting the already-selected
option still invokes `onChange`, matching ordinary controlled input behavior.
Outside-click dismissal changes no value.

The selected state is conveyed through `aria-checked` and a persistent inset
outline plus stronger border treatment, so it does not depend on color. It does
not add a checkmark or second glyph, keeping every cell a uniform square.

## Edge Cases

- `options=[]`: the trigger is disabled even when `disabled` is false because
  there is no available action.
- Unmatched `value`: the trigger renders no glyph, uses only its purpose as its
  accessible name, and opening starts focus at the first option.
- Duplicate values: unsupported and documented as an anti-pattern; values must
  be unique because selection and React keys depend on them.
- Long labels: remain accessible names but are not rendered as visible cell
  text. A native tooltip is not added in this version.
- Consumer glyph accessibility: the glyph wrapper is hidden from assistive
  technology, preventing embedded SVG titles from duplicating the radio label.

## Styling

The popover contains a compact four-column grid of token-sized square buttons.
The cell, glyph, hover, focus-visible, and selected treatments use component
tokens backed by existing primitives. No new shared design tokens are expected.

The component stylesheet contains only internal presentation. It does not add
external margins, positioning, or parent-owned layout. Focus indication uses
`:focus-visible`.

## Testing

Unit tests beside the component will verify:

- Default rendering, selected glyph, merged root `className`, root attribute
  spreading, and root ref forwarding.
- Trigger naming from i18n, `aria-label`, and `aria-labelledby`, including the
  current option label where applicable.
- `radiogroup`/`radio` semantics, option labels, and `aria-checked` state.
- Click, Enter, and Space selection; `onChange`; popover closure; and focus
  restoration.
- Arrow-key and Home/End roving navigation across the fixed grid.
- Focus reseeding from the controlled value on every open.
- Escape/outside dismissal without selection.
- Disabled, empty-options, and unmatched-value behavior.
- Consumer-provided glyphs are hidden from assistive technology.

Repository gates and the mandatory pre-push review loop will cover type safety,
formatting, lint, package contents, and integration regressions.

## Repository Integration

The change includes:

- `IconPicker.tsx`, token-correct module SCSS, tests, and barrel export.
- Root `packages/design-system/src/index.ts` component and type exports.
- English and Russian i18n entries for the default trigger purpose.
- A playground demo showing a controlled task-priority icon catalog.
- Playground route, sidebar navigation, overview card, and demo registry entry.
- Component metadata in both manifest cluster maps followed by regenerated
  manifest output.
- A concise `packages/design-system/AGENTS.md` usage section and complete
  component JSDoc with examples, when-not-to-use guidance, and anti-patterns.

## Success Criteria

Issue #449 is complete when consumers can supply a curated icon catalog, select
one icon by pointer or keyboard, receive its stable string value, and rely on
clear focus and selection semantics without maintaining application-local grid
behavior. All repository gates, adversarial reviews, PR checks, publication,
and release verification must pass before the issue is closed.
