# PasswordInput — design spec

**Date:** 2026-05-21
**Branch:** `feat/password-input`
**Scope:** New `<PasswordInput>` component — password text field with a trailing eye-toggle button to reveal/hide the value.

## Goal

A single-line password input that visually matches `<Input>`, with a built-in eye toggle (`Eye` / `EyeOff` lucide icons) for showing the password as plain text. Owns all the password-specific concerns (a11y for the toggle, type-switching, `aria-pressed`) so consumers don't reinvent them.

## Why a separate component (not a flag on Input)

- The DS already has DatePicker, DateRangePicker, and PasswordInput-shaped problems (a "field + trailing button"). DatePicker is a standalone component composing its own input + trailing buttons. Same precedent: keep Input minimal, ship the composed pattern as a sibling component.
- Password-specific extensions (caps-lock indicator, strength meter, paste-blocker for "confirm password" fields) will naturally land here. Cluttering Input with `revealable` + `revealed` + future flags is the wrong direction.
- The native `<input type="password">` autofill / form / RHF / autocomplete integration still works because we render a real `<input>` underneath — just with the type swapped between `'password'` and `'text'`.

## Architecture

```tsx
<div class="wrapper size-md">
  <input type={revealed ? 'text' : 'password'} class="input" />
  <button type="button" class="toggleButton" aria-pressed={revealed} aria-label="Show password">
    {revealed ? <EyeOff /> : <Eye />}
  </button>
</div>
```

- Mirrors the DatePicker `wrapper + input + trailing buttons` SCSS pattern (same `focus-within` ring, same `padding`, same `flex` layout).
- Toggle is a `<button type="button">` so it doesn't accidentally submit a form when inside one.
- `aria-pressed` exposes the toggle state to AT.
- Icon: `Eye` when hidden (clicking will reveal), `EyeOff` when revealed (clicking will hide). Matches GitHub / 1Password / Bitwarden convention.

## Public API

```ts
export type PasswordInputSize = 'sm' | 'md' | 'lg';

export interface PasswordInputLabels {
  /** aria-label for the toggle button when the password is hidden ("clicking will reveal"). Default: 'Show password'. */
  show?: string;
  /** aria-label for the toggle button when revealed ("clicking will hide"). Default: 'Hide password'. */
  hide?: string;
}

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /**
   * Field height + type scale. Same scale as `<Input>`. Defaults to `'md'`.
   */
  size?: PasswordInputSize;

  /** Toggles the error visual + sets `aria-invalid="true"`. Mirrors `<Input>`. */
  invalid?: boolean;

  /**
   * Controlled revealed state (toggle button state). Pair with `onRevealChange`
   * for controlled. Omit for uncontrolled (use `defaultRevealed`).
   */
  revealed?: boolean;

  /** Initial revealed state for uncontrolled use. Defaults to `false`. */
  defaultRevealed?: boolean;

  /** Called when the user clicks the eye toggle. Receives the next revealed state. */
  onRevealChange?: (revealed: boolean) => void;

  /**
   * Whether to render the eye toggle button. Defaults to `true`. Set
   * `revealable={false}` for cases where revealing is forbidden (e.g.,
   * compliance / kiosk screens where the password must never appear
   * onscreen) — the input then behaves like a plain `<Input type='password'>`.
   */
  revealable?: boolean;

  /** Localized aria-labels for the toggle. */
  labels?: PasswordInputLabels;
}
```

`Omit<…, 'size' | 'type'>`:
- `'size'` — same shadow pattern as `<Input>` (native `size` attribute is visible-character count and rarely useful).
- `'type'` — the component locks `type` to `'password'` / `'text'`. A consumer passing `type='email'` would break the whole point.

## Visual / tokens

Reuses existing tokens — no new tokens. Matches `<Input>` sizes + DatePicker's wrapper-with-trailing-button shape:

| Visual                          | Token                                       |
| ------------------------------- | ------------------------------------------- |
| Field height (sm/md/lg)         | `--size-sm` / `--size-md` / `--size-lg`     |
| Font size                       | `--font-size-sm` / `--font-size-md` / `--font-size-lg` |
| Border                          | `--color-border-strong`                     |
| Focus border                    | `--color-accent`                            |
| Focus ring                      | `--ring-accent`                             |
| Invalid border + ring           | `--color-danger` + `--ring-danger`          |
| Disabled bg                     | `--color-bg-subtle`                         |
| Disabled border                 | `--color-border`                            |
| Toggle button bg (default)      | `transparent`                               |
| Toggle button bg (hover)        | `--color-bg-subtle`                         |
| Toggle button color             | `--color-fg-muted` (resting), `--color-fg` (hover) |
| Toggle button focus ring        | `--ring-accent` (via `focus-ring` mixin)    |
| Toggle button size              | matches existing DatePicker pattern (`--space-5` button slot, 14/16px lucide icon) |
| Padding                         | `0 var(--space-2)` on wrapper               |
| Gap                             | `var(--space-1)` between input and toggle   |
| Radius                          | `--radius-md`                               |

Per-size icon size lookup (matches DatePicker convention): `{ sm: 14, md: 14, lg: 16 }`.

## States

- **Unrevealed (default)** — `<input type='password'>`, eye icon (`Eye`). Toggle aria-label: "Show password".
- **Revealed** — `<input type='text'>`, eye-off icon (`EyeOff`). Toggle aria-label: "Hide password". `aria-pressed='true'`.
- **Hover on toggle** — bg tints to `--color-bg-subtle`, color brightens to `--color-fg`.
- **Focus-visible on toggle** — accent ring.
- **Focus-within on wrapper** — accent border + ring (same as Input focus).
- **Disabled** — `<input disabled>` + toggle disabled (greyed, no click). The toggle still renders (so the disabled-treatment is consistent) but the password stays hidden.
- **Invalid** — danger border + danger focus ring.

## A11y

- Real `<input type='password'>` (or `'text'` when revealed) handles autofill, autocomplete, form submission, RHF/Zod.
- Toggle button: `type='button'`, `aria-pressed={revealed}`, dynamic `aria-label` from `labels` prop (default "Show password" / "Hide password").
- When the user toggles, focus stays on the toggle (no auto-focus of the input — that would surprise keyboard users).
- `aria-invalid` set on the input when `invalid={true}`.
- `aria-describedby` flows through to the input via the standard spread.

## File layout

```
packages/design-system/src/components/PasswordInput/
  PasswordInput.tsx
  PasswordInput.module.scss
  PasswordInput.test.tsx
  index.ts
```

Top-level `src/index.ts` re-exports `PasswordInput`, `PasswordInputProps`, `PasswordInputSize`, `PasswordInputLabels`.

## Tests

- Renders `type='password'` by default.
- Clicking the toggle flips to `type='text'` and back.
- `aria-pressed` reflects the revealed state.
- Toggle aria-label switches between "Show password" / "Hide password" by default.
- `labels` prop overrides the toggle aria-labels.
- `revealed` (controlled) + `onRevealChange(next)` works.
- `defaultRevealed={true}` initializes revealed.
- `revealable={false}` hides the toggle entirely (test by querying for the button — should be absent).
- `size` applies the right class names; defaults to `'md'`.
- `invalid` adds the class + sets `aria-invalid='true'`.
- `disabled` propagates to the input AND the toggle.
- Component-level `size` does NOT propagate to the DOM `size` attribute (Omit regression check).
- `ref` forwards to the native `<input>`.
- `className` merges on the wrapper (not replaced).
- `name` + `value` flow through for FormData round-trip.

## Playground demo

`PasswordInputDemo.tsx`:

1. **Default** — `<PasswordInput placeholder="Password" />`
2. **Sizes** — sm / md / lg side by side.
3. **Controlled reveal** — `revealed` + `onRevealChange` echoed to a debug line.
4. **No toggle** — `<PasswordInput revealable={false} placeholder="No toggle" />` for the compliance case.
5. **Disabled** — `<PasswordInput disabled defaultValue="locked" />`.
6. **Invalid** — paired with `aria-describedby` + visible error.
7. **Localized labels (ru-RU)** — passes Russian `labels`.
8. **Form integration** — `name="password" required` inside a `<form>`, log FormData on submit.

## AGENTS.md

Add `<PasswordInput>` section right after `<Input>` (Forms group).

## Non-goals

- **Caps-lock indicator**. Common, but a separate concern with its own a11y wiring (keydown listener, persistent indicator). Add later if a screen needs it.
- **Password strength meter**. Larger feature with its own algorithms (zxcvbn) and visuals. Out of scope.
- **Paste blocker for "confirm password"**. Same — separate prop later (`disablePaste`).
- **Show-password-on-press (hold-to-reveal)**. Niche; ship the click-to-toggle pattern v1 and add later if asked.

## Risks / open questions

- **Autofill behavior when type swaps**: Chrome / Safari attach password-manager UI to `type='password'` inputs. When toggled to `text`, the autofill chrome can disappear briefly. Acceptable — most users toggle AFTER autofill has filled.
- **Some browsers offer their own reveal toggle**: Edge adds a built-in eye icon for `type='password'`. Our toggle stacks visually with theirs. Standard mitigation: `::-ms-reveal { display: none }` in SCSS. Add to the SCSS (one-line).
- **`disabled` + visible toggle button**: clicking does nothing because the button is also disabled. Some DSes hide the toggle entirely on `disabled`. Going with "show but disable" — matches DatePicker's behavior (calendar button stays visible but disabled when DatePicker is disabled).
- **Screen-readers announcing the toggle**: with `aria-pressed`, NVDA / VoiceOver say "Show password, button, not pressed" → click → "Hide password, button, pressed". Matches expectations.
- **Focus management on toggle click**: explicitly leave focus on the button. If the input was focused before the click, the toggle takes focus on click (native behavior); we don't restore to the input because the user explicitly moved focus.
