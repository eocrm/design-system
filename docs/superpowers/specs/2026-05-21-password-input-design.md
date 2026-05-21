# PasswordInput + PasswordStrengthMeter — design spec

**Date:** 2026-05-21
**Branch:** `feat/password-input`
**Scope:** Two new components shipped together:

1. `<PasswordInput>` — password text field with trailing eye-toggle + opt-in caps-lock indicator.
2. `<PasswordStrengthMeter>` — separate sibling component that renders a 4-segment strength visualization. Pluggable scoring; default heuristic for v1.

## Goal

A single-line password input that visually matches `<Input>`, with a built-in eye toggle (`Eye` / `EyeOff` lucide icons) for showing the password as plain text. Owns all the password-specific concerns (a11y for the toggle, type-switching, `aria-pressed`, opt-in caps-lock detection) so consumers don't reinvent them. Strength visualization stays a separate component so consumers can use it without the input (e.g., on a server-validated strength API) or use the input without it (most cases).

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

## Public API — `<PasswordInput>`

```ts
export type PasswordInputSize = 'sm' | 'md' | 'lg';

export interface PasswordInputLabels {
  /** aria-label for the toggle button when the password is hidden ("clicking will reveal"). Default: 'Show password'. */
  show?: string;
  /** aria-label for the toggle button when revealed ("clicking will hide"). Default: 'Hide password'. */
  hide?: string;
  /** Live-region text announced when caps-lock is detected as on. Default: 'Caps Lock is on'. */
  capsLockOn?: string;
  /** Live-region text announced when a non-ASCII keystroke is detected. Default: 'Possible wrong keyboard layout'. */
  wrongLayoutOn?: string;
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

  /**
   * Opt-in caps-lock detection. When `true`, on every keypress the input
   * reads `event.getModifierState('CapsLock')`; when active, a warning
   * icon appears inside the wrapper AND a polite `aria-live` region
   * announces the state to AT. The state is cleared on blur (so the
   * warning doesn't persist when focus moves elsewhere).
   *
   * Defaults to `false` — opt in only on screens where this matters
   * (login, password creation, password confirmation).
   */
  capsLockWarning?: boolean;

  /**
   * Opt-in wrong-keyboard-layout detection. When `true`, on every keypress
   * the input checks whether `event.key` is a single non-ASCII printable
   * character (e.g., Cyrillic `ф` from the `KeyA` physical key on a
   * Russian layout). When detected, a `Languages` warning icon appears +
   * a polite `aria-live` region announces the state.
   *
   * Heuristic (not deterministic): warns whenever ANY non-ASCII character
   * is typed. Only enable when you expect Latin-only password input —
   * a system that allows Cyrillic passwords would false-positive here.
   *
   * Defaults to `false`. Cleared on blur.
   */
  wrongLayoutWarning?: boolean;

  /** Localized aria-labels for the toggle + warning live regions. */
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
- **Caps-lock on (only when `capsLockWarning={true}`)** — a `--color-warning`-colored `ArrowBigUpDash` icon appears between the input and the eye toggle. A hidden `aria-live='polite'` span announces `labels.capsLockOn` to AT. Cleared on blur.
- **Wrong-layout detected (only when `wrongLayoutWarning={true}`)** — a `--color-warning`-colored `Languages` icon appears in the same warning slot. A second hidden `aria-live='polite'` span announces `labels.wrongLayoutOn`. Both warnings can coexist (caps-lock + wrong-layout); icons stack horizontally in the warning slot, announced via separate live regions.

## A11y

- Real `<input type='password'>` (or `'text'` when revealed) handles autofill, autocomplete, form submission, RHF/Zod.
- Toggle button: `type='button'`, `aria-pressed={revealed}`, dynamic `aria-label` from `labels` prop (default "Show password" / "Hide password").
- When the user toggles, focus stays on the toggle (no auto-focus of the input — that would surprise keyboard users).
- `aria-invalid` set on the input when `invalid={true}`.
- `aria-describedby` flows through to the input via the standard spread.
- **Caps-lock indicator** (when `capsLockWarning={true}`) — visual warning icon + a polite live region (`role='status' aria-live='polite'`) that announces `labels.capsLockOn` exactly once when caps-lock turns on. The icon also carries `aria-hidden='true'` so AT doesn't double-announce.
- **Wrong-layout indicator** (when `wrongLayoutWarning={true}`) — same pattern: icon `aria-hidden`, separate polite live region announces `labels.wrongLayoutOn` when a non-ASCII keystroke is detected. Detection runs only when the prop is set, so consumers who don't opt in pay no event-handler cost.

## File layout

```
packages/design-system/src/components/PasswordInput/
  PasswordInput.tsx
  PasswordInput.module.scss
  PasswordInput.test.tsx
  index.ts

packages/design-system/src/components/PasswordStrengthMeter/
  PasswordStrengthMeter.tsx
  PasswordStrengthMeter.module.scss
  PasswordStrengthMeter.test.tsx
  index.ts
```

Top-level `src/index.ts` re-exports both:

- `PasswordInput`, `PasswordInputProps`, `PasswordInputSize`, `PasswordInputLabels`
- `PasswordStrengthMeter`, `PasswordStrengthMeterProps`, `PasswordStrengthScore`, `PasswordStrengthLabels`

## `<PasswordStrengthMeter>` — separate component

```tsx
<PasswordStrengthMeter value={password} />
// or, with a consumer-supplied scorer (e.g., zxcvbn):
<PasswordStrengthMeter score={zxcvbnScore(password)} />
```

Rendered as 4 segments + an optional textual label. Each segment fills with a tone-appropriate color as the score climbs:

| Score | Filled segments | Color                | Label (default) |
| ----- | --------------- | -------------------- | --------------- |
| 0     | 0               | `--color-bg-sunken`  | "" (or "Empty") |
| 1     | 1               | `--color-danger`     | "Weak"          |
| 2     | 2               | `--color-warning`    | "Fair"          |
| 3     | 3               | `--color-warning`    | "Good"          |
| 4     | 4               | `--color-success`    | "Strong"        |

### API

```ts
export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrengthLabels {
  empty?: string; // default: '' (no label)
  weak?: string;  // default: 'Weak'
  fair?: string;  // default: 'Fair'
  good?: string;  // default: 'Good'
  strong?: string; // default: 'Strong'
}

export interface PasswordStrengthMeterProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The password string to evaluate. Required UNLESS `score` is provided.
   * Evaluated via the default `scoreFn` (basic heuristic) or a consumer-
   * supplied `scoreFn`.
   */
  value?: string;

  /**
   * Pre-computed score, 0–4. Useful when the consumer is using a real
   * scorer (zxcvbn, server-side) and just wants this component to render.
   * Wins over `value` + `scoreFn` when both are provided.
   */
  score?: PasswordStrengthScore;

  /**
   * Custom scoring function. Receives the password string, returns 0–4.
   * Defaults to a length + character-class heuristic — fine for prototypes,
   * NOT a security check. Production deployments should pass `score` from
   * a real scorer.
   */
  scoreFn?: (value: string) => PasswordStrengthScore;

  /** Render the textual label next to the segments. Defaults to `true`. */
  showLabel?: boolean;

  /** Localized labels. */
  labels?: PasswordStrengthLabels;
}
```

### Default scoring heuristic (v1)

Simple, transparent, NOT secure:

```ts
function defaultScoreFn(pw: string): PasswordStrengthScore {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4) as PasswordStrengthScore;
}
```

This is intentionally crude. JSDoc warns consumers that real password security needs zxcvbn or server-side scoring. The default exists so the component is usable without setup — but it's not a security control.

### A11y

- The component renders a visible label (when `showLabel={true}`) describing the strength.
- The segments themselves are decorative (`aria-hidden='true'`).
- A hidden `role='status' aria-live='polite'` span announces the strength label when it changes, so screen-reader users hear "Weak → Fair → Good" as they type.
- The component does NOT label any particular input; it's the consumer's job to link via `aria-describedby={meterId}` on their `<PasswordInput>`.

### Tests

- Renders 4 segments.
- Default scoring: empty → 0; 8+ chars → 1; 8+ chars + length 12+ → 2; mixed case → +1; digit + special → +1.
- Score cap at 4.
- `score` prop wins over `value` + `scoreFn`.
- `scoreFn` is called with the password value.
- `showLabel={false}` hides the textual label.
- `labels` overrides the default strings.
- Live region announces the label.
- `className` merges on the root wrapper.

## Tests — PasswordInput

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
- `capsLockWarning={true}` — when keydown event reports `getModifierState('CapsLock')` true, the warning icon renders + the live region contains the label. When false, neither does. On blur, both clear.
- `capsLockWarning={false}` (default) — no keydown listeners attached; no warning even if caps-lock is on.
- `wrongLayoutWarning={true}` — typing a non-ASCII single character (simulated via `fireEvent.keyDown` with `key: 'ф'`) sets the warning icon + live region. Typing an ASCII character clears it on the next keypress. Blur clears both.
- `wrongLayoutWarning={false}` (default) — no warning regardless of what's typed.
- Both warnings simultaneously: typing `'ф'` while caps-lock is on shows both icons + both live regions populated.

## Playground demos

`PasswordInputDemo.tsx`:

1. **Default** — `<PasswordInput placeholder="Password" />`
2. **Sizes** — sm / md / lg side by side.
3. **Controlled reveal** — `revealed` + `onRevealChange` echoed to a debug line.
4. **No toggle** — `<PasswordInput revealable={false} placeholder="No toggle" />` for the compliance case.
5. **Caps-lock warning** — `<PasswordInput capsLockWarning placeholder="Try with Caps Lock on" />` — manual smoke note that the user needs to toggle Caps Lock to see the icon.
6. **Wrong-layout warning** — `<PasswordInput wrongLayoutWarning placeholder="Try typing while on a non-Latin keyboard" />` — switch to Cyrillic / Greek / etc. and type to see the warning.
7. **Both warnings (login-form pattern)** — `<PasswordInput capsLockWarning wrongLayoutWarning />` showing the two warning icons stacking when both fire.
8. **Disabled** — `<PasswordInput disabled defaultValue="locked" />`.
9. **Invalid** — paired with `aria-describedby` + visible error.
10. **Localized labels (ru-RU)** — passes Russian `labels`.
11. **Form integration** — `name="password" required` inside a `<form>`, log FormData on submit.
12. **With strength meter (composition)** — `<PasswordInput capsLockWarning wrongLayoutWarning />` + `<PasswordStrengthMeter value={pw} />` below, demonstrating the canonical signup form pattern.

`PasswordStrengthMeterDemo.tsx`:

1. **Live with PasswordInput** — type into a field, watch the meter update.
2. **Standalone with `score` prop** — slider controls a `PasswordStrengthScore`, meter reflects it (illustrates the "consumer drives score" mode).
3. **`showLabel={false}`** — segments only, no label.
4. **Localized labels** — Russian.

## AGENTS.md

Two new sections, both in the Forms group:

- `<PasswordInput>` right after `<Input>`.
- `<PasswordStrengthMeter>` right after `<PasswordInput>`.

## Non-goals

- **Paste blocker for "confirm password"** (`disablePaste`). Separate prop later if a screen needs it.
- **Show-password-on-press (hold-to-reveal)**. Niche; ship the click-to-toggle pattern v1.
- **Bundled zxcvbn**. The default scoring heuristic is intentionally crude — production deployments pass their own `score` or `scoreFn`. Pulling in zxcvbn (~400kb) is the consumer's choice.
- **Async strength scoring**. The `scoreFn` is sync. If a consumer needs server-side scoring, they pass the resolved `score` directly.

## Risks / open questions

- **Autofill behavior when type swaps**: Chrome / Safari attach password-manager UI to `type='password'` inputs. When toggled to `text`, the autofill chrome can disappear briefly. Acceptable — most users toggle AFTER autofill has filled.
- **Some browsers offer their own reveal toggle**: Edge adds a built-in eye icon for `type='password'`. Our toggle stacks visually with theirs. Standard mitigation: `::-ms-reveal { display: none }` in SCSS. Add to the SCSS (one-line).
- **`disabled` + visible toggle button**: clicking does nothing because the button is also disabled. Some DSes hide the toggle entirely on `disabled`. Going with "show but disable" — matches DatePicker's behavior.
- **Screen-readers announcing the toggle**: with `aria-pressed`, NVDA / VoiceOver say "Show password, button, not pressed" → click → "Hide password, button, pressed". Matches expectations.
- **Focus management on toggle click**: explicitly leave focus on the button.
- **Caps-lock detection limits**: `getModifierState('CapsLock')` only resolves on KEY events. We can't know caps-lock state at focus time (only at the first keypress). 1Password, GitHub, Microsoft all have the same limitation. Acceptable.
- **Caps-lock + non-Latin keyboards**: on some keyboard layouts, caps-lock either does nothing (CJK input methods) or behaves unusually. The `getModifierState` reading is browser-driven and consistent with the user's expectation for their keyboard.
- **Wrong-layout detection is heuristic, not deterministic**: there's no cross-browser API to read the active keyboard layout. `navigator.keyboard.getLayoutMap()` is Chromium-only with no Firefox/Safari support. The implemented heuristic (any non-ASCII single-character `event.key` → warn) catches the common "Cyrillic-instead-of-Latin" case but would false-positive on legitimately non-ASCII passwords. JSDoc + AGENTS.md state this explicitly so consumers don't enable the prop on systems that accept non-Latin passwords.
- **Wrong-layout + IME input**: CJK / Korean input methods compose characters via IME, dispatching `compositionstart` / `compositionupdate` / `compositionend` events rather than direct keydown→key. Our heuristic runs on keydown only, so IME composition won't trigger the warning. Acceptable — IME input is a deliberate choice, not an accidental wrong-layout case.
- **Wrong-layout + dead keys / accents**: keys that produce diacritic combining characters (German `^`, French `´`) also yield single non-ASCII output. The warning would fire on a German user typing `ö`. Realistic mitigation: don't opt into `wrongLayoutWarning` on screens where non-ASCII passwords are valid. We don't try to distinguish "deliberate non-Latin" from "accidental wrong layout" in code — the prop's opt-in nature places that judgment with the consumer.
- **PasswordStrengthMeter as a "trust me" UX**: a default-heuristic meter can give users a false sense of security ("My password is rated Strong"). JSDoc + AGENTS.md must call this out: default scoring is a UX hint, not a security control.
