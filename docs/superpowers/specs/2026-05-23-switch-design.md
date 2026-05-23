# Switch — design spec

**Date:** 2026-05-23
**Branch:** `feat/switch`
**Scope:** New `<Switch>` component for `@eocrm/design-system` — a hand-rolled toggle (track + sliding thumb) that wraps a native `<input type="checkbox" role="switch">`. Completes the binary-control family alongside `<Checkbox>` and `<Radio>`.

## Goal

Provide an on/off toggle primitive for settings panels, "enabled/disabled" rows, and any UI that maps cleanly to a binary state. Same JSDoc + a11y conventions as Checkbox/Radio (`size`, `disabled`, controlled+uncontrolled, label-as-children, custom `onChange(checked, event)` signature). Adds three things Checkbox doesn't need: `tone` (color of the checked track), `loading` (spinner inside the thumb for async toggles), and the visual switch track+thumb mechanic.

## Why now

- The CRM has multiple open-coded `<input type="checkbox">` usages styled as switches. Inconsistent visual treatment across screens.
- Settings panels and feature flag dashboards need an "on/off" affordance that's clearly distinct from a tick-box. Checkbox semantically means "select me from a list"; Switch means "this state is on or off". Different mental model → different visual primitive.
- Async toggles (server-persisted settings) need a loading state. Without a shipped Switch, every consumer rolls their own spinner-while-saving treatment.

## Non-goals (v1)

- **No "thumb icon" slot.** The thumb stays a plain circle. Material's "checked = checkmark inside thumb" is not part of v1.
- **No "size: xs".** Switch starts at `sm`. Below that the thumb gets too tiny to click reliably.
- **No vertical orientation.** Horizontal only.
- **No "off label" / "on label" inside the track.** Some designs put "ON"/"OFF" text inside the track. Skip — not a CRM pattern.
- **No `tone="warning"` or `tone="info"`.** Warning checked-state doesn't have a clear meaning. Info is what `accent` already covers. Three tones is enough.
- **No `indeterminate` state.** Switch is binary by definition (unlike Checkbox which has the "select all" mixed state). Consumers needing tri-state use Checkbox.
- **No optimistic / pessimistic toggle helpers.** Consumers manage the async flow themselves via `loading` + their own onChange logic.

## Architecture

### Dependencies

No new packages. Reuses:

- React (peer)
- `clsx` (existing dep)
- `lucide-react` peer dep — `Loader2` icon for the loading state (already used by Toast)
- Existing tokens: `--color-bg`, `--color-bg-muted`, `--color-bg-sunken`, `--color-bg-subtle`, `--color-fg`, `--color-fg-muted`, `--color-fg-subtle`, `--color-accent`, `--color-accent-hover`, `--color-success`, `--color-success-hover`, `--color-danger`, `--color-danger-hover`, `--color-border`, `--ring-accent`, `--ring-danger`, `--ring-width`, `--font-size-sm`/`--font-size-md`/`--font-size-lg`, `--space-1`/`--space-2`/`--space-3`, `--transition-fast`, `--transition-base`, `--opacity-disabled`

No new tokens needed. The track/thumb size values are hardcoded per-size — they're component-specific dimensions, not generic tokens.

### File layout

```
packages/design-system/src/components/Switch/
  Switch.tsx          ← forwardRef + internal-checked mirror + custom onChange + visually-hidden input
  Switch.module.scss  ← wrapper / hidden input / track / thumb / label + size variants + tone variants + states
  Switch.test.tsx     ← ~22 cases
  index.ts            ← exports
```

Plus standard integration points:

- `packages/design-system/src/index.ts` — re-export `Switch`, `SwitchProps`, `SwitchSize`, `SwitchTone`
- `packages/design-system/AGENTS.md` — TL;DR slot directly after `<Checkbox>` (alphabetical with the form components)
- `packages/playground/src/pages/components/SwitchDemo.tsx` — 7 examples
- `packages/playground/src/App.tsx` — route at `/components/switch`
- `packages/playground/src/layout/AppShell/AppShell.tsx` — sidebar entry in the **Forms** group, alphabetically between `Select` and `Textarea`
- `packages/playground/src/pages/components/ComponentsIndex.tsx` — overview card with a checked switch preview
- `packages/playground/src/pages/mockups/registry.ts` — `'Switch'` in `ComponentName` union (alphabetical between `'Stack'` and `'Table'`)

### Composition

```
        <Switch checked tone="success" onChange={(next) => setEnabled(next)}>Notifications</Switch>
                                                            │
                                                            ▼
                                                     <label .wrapper>
                                                            │
                                          ┌─────────────────┼─────────────────┐
                                          ▼                 ▼                 ▼
                              <input type="checkbox"   <span .track       <span .label>
                                role="switch"           data-checked        "Notifications"
                                aria-checked            data-tone
                                aria-invalid            data-invalid>
                                aria-busy                 │
                                ref={consumerRef}         ▼
                                .visuallyHidden>      <span .thumb>
                                                          │  Loader2 only when loading
                                                          ▼
                                                       (sliding circle, optional spinner)
```

`<label>` wraps everything so click-anywhere-toggles. Real `<input>` is visually-hidden but reachable by Tab and clickable via the label. Track + thumb are painted spans.

## Public API

````ts
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react';

/** Track + thumb scale + label font. Pairs with Checkbox/Radio sizes. */
export type SwitchSize = 'sm' | 'md' | 'lg';

/** Color of the track when checked. */
export type SwitchTone = 'accent' | 'success' | 'danger';

export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type' | 'checked' | 'defaultChecked' | 'onChange'
> {
  /**
   * Visual scale. Defaults to `'md'`.
   * - `'sm'` — 28×16 track, 12px thumb, `--font-size-sm` label
   * - `'md'` — 36×20 track, 16px thumb, `--font-size-md` label (default)
   * - `'lg'` — 44×24 track, 20px thumb, `--font-size-lg` label
   *
   * Note: shadows the native HTML `<input size>` attribute (meaningless on checkboxes).
   */
  size?: SwitchSize;

  /**
   * Track color when checked. Defaults to `'accent'`.
   * - `'accent'` — blue (default).
   * - `'success'` — green. Use for affirmative toggles ("Enable notifications").
   * - `'danger'` — red. Use for destructive toggles ("Allow root access").
   *
   * Unchecked track is always `--color-bg-muted` regardless of tone.
   */
  tone?: SwitchTone;

  /**
   * Controlled checked state. Pair with `onChange`. Omit (with optional
   * `defaultChecked`) for uncontrolled use.
   */
  checked?: boolean;

  /** Initial checked state for uncontrolled use. Defaults to `false`. */
  defaultChecked?: boolean;

  /**
   * Fires when the user toggles the switch. The first arg is the next
   * boolean (convenience); the original change event is the second arg.
   * Matches `<Checkbox>`'s signature.
   *
   * Note: this collapses the native `onChange` event prop. To access the
   * raw event without the boolean convenience, use `e` (second arg).
   */
  onChange?: (checked: boolean, e: ChangeEvent<HTMLInputElement>) => void;

  /**
   * Toggles `aria-invalid="true"` and adds a danger-tone border to the
   * track. Use when the switch's state has caused a validation error
   * (rare — switches are binary, but consistency with Input/Textarea is
   * cheap).
   */
  invalid?: boolean;

  /**
   * Disables interaction and shows a spinner inside the thumb. Use for
   * toggles that persist to a server. Sets `aria-busy="true"` and
   * `disabled` on the native input so neither click nor Space-key can
   * fire onChange while the async operation is in flight.
   *
   * The consumer is responsible for managing the optimistic-update flow:
   *
   * ```tsx
   * const [enabled, setEnabled] = useState(initial);
   * const [saving, setSaving] = useState(false);
   *
   * const handleToggle = async (next: boolean) => {
   *   setSaving(true);
   *   setEnabled(next);  // optimistic
   *   try {
   *     await api.saveSetting(next);
   *   } catch {
   *     setEnabled(!next);  // rollback
   *   } finally {
   *     setSaving(false);
   *   }
   * };
   *
   * <Switch checked={enabled} loading={saving} onChange={handleToggle} />
   * ```
   */
  loading?: boolean;

  /**
   * Label rendered next to the track. The whole `<label>` element is the
   * click target — clicking the label toggles the switch. Omit for
   * icon-only switches + pair with `aria-label`.
   */
  children?: ReactNode;
}
````

**Native attrs spread to the `<input>`**: all of `InputHTMLAttributes<HTMLInputElement>` minus `size`, `type`, `checked`, `defaultChecked`, `onChange`. Includes `disabled`, `required`, `name`, `id`, `value` (form submission value), `aria-*`, `data-*`, `onFocus`, `onBlur`, etc.

**Spread order — Pattern A (consumer wins)** for non-ARIA attrs, with the controlled attrs (`checked`, `aria-checked`, `aria-invalid`, `aria-busy`, `role`, `type`, `disabled`) explicitly set AFTER the spread when the component owns them:

```tsx
<input
  ref={ref}
  {...props}
  type="checkbox"
  role="switch"
  checked={currentChecked}
  disabled={disabled || loading}
  aria-invalid={invalid || undefined}
  aria-busy={loading || undefined}
  onChange={handleChange}
  className={clsx(styles.input, props.className)}
/>
```

The component owns `type`, `role`, `checked`, `disabled` (with loading-merge), `aria-invalid`, `aria-busy`, and `onChange`. Consumer can't override these — preserving the switch contract is more important than full Pattern A here. This is the same pattern Checkbox uses.

## Architecture flow

### Internal checked mirror

```tsx
const [internalChecked, setInternalChecked] = useState(defaultChecked ?? false);
const isControlled = checked !== undefined;
const currentChecked = isControlled ? checked : internalChecked;

const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  if (!isControlled) setInternalChecked(e.target.checked);
  onChange?.(e.target.checked, e);
};
```

Same pattern as Textarea's value mirror + Checkbox's checked mirror. The `data-checked` attribute on the track reads from `currentChecked`, so the track repaints synchronously for both controlled (via `checked` prop) and uncontrolled (via the local state).

### Loading + disabled coupling

`disabled={disabled || loading}` on the input — `loading` implies disabled. This:

- Blocks click-to-toggle via the label (the input doesn't fire change events)
- Blocks Space-key toggle (focused-but-disabled input doesn't accept input)
- Sets the native `:disabled` pseudoclass that the SCSS can style against

If a consumer wants `disabled={false}` while `loading={true}`... they can't. Loading always disables. Documented in the `loading` JSDoc.

### Spinner mount

```tsx
{
  loading && <Loader2 className={styles.spin} size={SPIN_SIZE[size]} aria-hidden="true" />;
}
```

The spinner sits inside `<span class="thumb">`. The thumb itself doesn't change size — the spinner is positioned absolutely inside, slightly smaller than the thumb.

Spinner sizes: sm=8, md=10, lg=12 (smaller than the thumb diameter so it visually fits).

### Track + thumb positioning

The thumb is positioned with `transform: translateX(...)` and the SCSS uses CSS custom properties on the track for the per-size travel distance:

```scss
.track {
  --thumb-travel: 0; // overridden per size

  .thumb {
    transform: translateX(0);
    transition: transform var(--transition-base);
  }
}

.track[data-checked='true'] .thumb {
  transform: translateX(var(--thumb-travel));
}

.sm {
  --thumb-travel: 12px;
} // 28 - 12 - 4
.md {
  --thumb-travel: 14px;
} // 36 - 16 - 6 (2px inset on each side)
.lg {
  --thumb-travel: 18px;
} // 44 - 20 - 6
```

(Exact pixel math will be verified in implementation — point is the travel distance is a per-size value.)

## Styling — `Switch.module.scss`

```scss
@use '../../styles/mixins' as *;

.wrapper {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;

  &[data-disabled='true'] {
    cursor: not-allowed;
    opacity: var(--opacity-disabled);
  }
}

.input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.track {
  position: relative;
  display: inline-block;
  background: var(--color-bg-muted);
  border-radius: var(--radius-full);
  border: var(--border-width) solid transparent;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
  flex-shrink: 0;

  &:hover {
    background: var(--color-bg-sunken);
  }
}

.track[data-checked='true'][data-tone='accent'] {
  background: var(--color-accent);
}
.track[data-checked='true'][data-tone='success'] {
  background: var(--color-success);
}
.track[data-checked='true'][data-tone='danger'] {
  background: var(--color-danger);
}

.track[data-checked='true'][data-tone='accent']:hover {
  background: var(--color-accent-hover);
}
.track[data-checked='true'][data-tone='success']:hover {
  background: var(--color-success-hover);
}
.track[data-checked='true'][data-tone='danger']:hover {
  background: var(--color-danger-hover);
}

.thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  background: var(--color-bg);
  border-radius: 50%;
  transition: transform var(--transition-base);
  display: grid;
  place-items: center;
}

.track[data-checked='true'] .thumb {
  transform: translateX(var(--thumb-travel, 14px));
}

// Sizes — set track dimensions + thumb diameter + travel distance.
.sm {
  width: 28px;
  height: 16px;
  --thumb-travel: 12px;
}
.sm .thumb {
  width: 12px;
  height: 12px;
}

.md {
  width: 36px;
  height: 20px;
  --thumb-travel: 14px;
}
.md .thumb {
  width: 16px;
  height: 16px;
}

.lg {
  width: 44px;
  height: 24px;
  --thumb-travel: 18px;
}
.lg .thumb {
  width: 20px;
  height: 20px;
}

.label {
  font-family: inherit;
  color: var(--color-fg);
}

.labelSm {
  font-size: var(--font-size-sm);
}
.labelMd {
  font-size: var(--font-size-md);
}
.labelLg {
  font-size: var(--font-size-lg);
}

// Focus ring on the wrapper when the (hidden) input is focused.
.input:focus-visible + .track {
  @include focus-ring;
}

.input:focus-visible + .track[data-invalid='true'] {
  @include focus-ring(var(--ring-danger));
}

.track[data-invalid='true'] {
  border-color: var(--color-danger);
}

.spin {
  animation: spin 1s linear infinite;
  color: var(--color-fg-muted);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .thumb,
  .track,
  .spin {
    transition: none;
    animation: none;
  }
}
```

**Rule 4 check:**

- `.wrapper` has `display: inline-flex` — that's intrinsic display, not layout. `gap: var(--space-2)` is internal spacing between children.
- `.input` uses the visually-hidden pattern (`position: absolute`, etc.) — this is internal-only, not a flow component. Same disable-line treatment as Checkbox/Radio.
- `.track` and `.thumb` use `position: relative`/`absolute` — internal child positioning, not at the component boundary. Same pattern as Checkbox's painted box.
- No `align-self`, no `flex-grow`, no `margin` at the component boundary.

If stylelint flags the `position: absolute` on the input or thumb, add inline-disables with "internal-only visually-hidden recipe" / "internal thumb positioning" rationale, matching Checkbox/Radio's existing comments.

## ARIA + behavior reference

| Concern           | Behavior                                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Element           | `<input type="checkbox" role="switch">` — native checkbox semantics for form submission, switch role for AT announcement                            |
| Checked state     | `aria-checked` reflected automatically from the native `checked` attribute (no manual ARIA needed)                                                  |
| Invalid state     | `aria-invalid="true"` only when `invalid={true}`                                                                                                    |
| Loading state     | `aria-busy="true"` only when `loading={true}`                                                                                                       |
| Disabled state    | Native `disabled` attribute                                                                                                                         |
| Focus             | Focus lands on the input (natural Tab). Wrapper has `:focus-within` styling via the `.input:focus-visible + .track` selector                        |
| Keyboard          | Space toggles (native checkbox behavior — works because the underlying element IS a checkbox)                                                       |
| Label association | The whole `<label>` is the click target — no `htmlFor` plumbing needed                                                                              |
| Spread order      | Component owns `type`, `role`, `checked`, `disabled`, `aria-invalid`, `aria-busy`, `onChange`. Other native attrs follow Pattern A (consumer wins). |
| Ref target        | The `<input>` element. Consumers can `.focus()`, read `.checked`, etc.                                                                              |

## Testing

`Switch.test.tsx` — 22 cases, RTL + userEvent.

### Baseline

1. Renders without crashing with default props
2. Renders the label from `children`
3. Renders icon-only with `aria-label` and no children
4. Default size = `'md'`; `sm` and `lg` apply the corresponding classes
5. Default tone = `'accent'`; `success` and `danger` apply the right `data-tone`
6. `ref` forwards to the `<input>` element (not the wrapper)
7. `className` (passed via spread) merges, doesn't replace
8. `role="switch"` is set on the input
9. The native input has `type="checkbox"`

### State

10. Controlled: `checked={true}` reflects in the input's checked AND `data-checked='true'` on the track
11. Controlled: clicking the label fires `onChange(true, event)` then `onChange(false, event)`
12. Uncontrolled: starts at `defaultChecked` (test both true and false)
13. Uncontrolled: click toggles + `data-checked` flips
14. `disabled={true}` blocks `onChange` from firing on click + sets `disabled` on the input
15. Space-key on the focused input toggles (controlled with `onChange`)

### Loading

16. `loading={true}` sets `aria-busy="true"` on the input
17. `loading={true}` renders a spinner element inside the thumb
18. `loading={true}` disables the input — click does NOT fire `onChange`
19. `loading={false}` (default) does NOT render the spinner

### Invalid

20. `invalid={true}` sets `aria-invalid="true"` on the input
21. `invalid={true}` applies `data-invalid='true'` (or invalid class) on the track

### Tone

22. Each tone (`accent`/`success`/`danger`) sets a unique `data-tone` attribute on the track

**Vitest gotchas**:

- `screen.getByRole('switch')` works because `role="switch"` overrides the implicit `role="checkbox"`.
- Space-key test needs the input to be focused first: `await user.tab(); await user.keyboard(' ');`.

## Playground demo — `SwitchDemo.tsx`

7 examples:

1. **Default + with label** — `<Switch>Enable notifications</Switch>` (uncontrolled).
2. **Three sizes** — `sm` / `md` / `lg` side by side, same label.
3. **Three tones** — accent (default), success, danger, all checked.
4. **Controlled** — wired to `useState`. Demonstrates the `onChange(next, e)` callback signature.
5. **Loading (async toggle)** — button-triggered: fires `setLoading(true)`, waits 1.5s, then flips and clears loading. Demonstrates the optimistic-update pattern from the JSDoc.
6. **Invalid state** — `invalid` with a danger-toned error message below.
7. **Disabled** — `disabled` with a label, checked and unchecked side by side.

The viewport mount is irrelevant — Switch is a flow element.

## AGENTS.md TL;DR slot

After `### \`<Checkbox>\``, before `### \`<Radio>\``. ~25-line block:

````markdown
### `<Switch>` — binary toggle

Hand-rolled track + thumb on a native `<input type="checkbox" role="switch">`. The dumb on/off toggle for settings, feature flags, and async persisted state.

```tsx
import { Switch } from '@eocrm/design-system';

// Default — uncontrolled, accent tone.
<Switch>Enable notifications</Switch>

// Controlled, success tone.
<Switch tone="success" checked={enabled} onChange={(next) => setEnabled(next)}>
  Daily digest
</Switch>

// Async (server-persisted) toggle.
<Switch
  checked={enabled}
  loading={saving}
  onChange={async (next) => {
    setSaving(true);
    setEnabled(next);            // optimistic
    try { await api.save(next); }
    catch { setEnabled(!next); } // rollback
    finally { setSaving(false); }
  }}
>
  Two-factor auth
</Switch>

// Icon-only.
<Switch aria-label="Mute notifications" />
```

- **Native `<input type="checkbox" role="switch">`**. Form submission works; AT announces as switch.
- **Three tones** (`accent`/`success`/`danger`) for the checked track. Unchecked track is always neutral muted.
- **`loading={true}`** shows a spinner inside the thumb + disables the input (sets `aria-busy`). Consumer manages the optimistic-update flow.
- **`onChange(checked, event)`** signature matches Checkbox — first arg is the next boolean, second is the raw event.

#### When NOT to use

- ❌ Selecting one option from a list of mutually-exclusive choices → `<Radio>` / `<RadioGroup>`.
- ❌ Selecting multiple from a list → `<Checkbox>`.
- ❌ A mixed / indeterminate state ("some-but-not-all enabled") → use Checkbox's `indeterminate`.
- ❌ Triggering an action immediately on click (no state) → `<Button>`.

#### Anti-patterns

- ❌ Using `placeholder`-style hints inside the track ("OFF" / "ON" text). Use a real label.
- ❌ Toggle without an external optimistic-update flow when `loading` is set. Without it, the user clicks the switch, the spinner appears, and the visual state never changes — confusing.
- ❌ `tone="success"` for "Mark as failed". Tone communicates the meaning of "on", not just decoration.
````

## Hard Rule 8

The pre-push review-fix cycle on library changes is mandatory. Gates green (`make test`, `make build-lib`, `make build`, `make lint`, `npm pack --dry-run`), spawn fresh-context reviewer with the standard Toast/ButtonGroup/Textarea prompt, fix every Critical + Important, repeat until clean.

## Open questions

None. All clarifications baked in above.
