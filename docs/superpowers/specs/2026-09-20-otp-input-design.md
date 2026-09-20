# OtpInput — design

**Issue:** eocrm/design-system#531 — "Add OTP input"
**Date:** 2026-09-20
**Status:** approved

## Problem

The CRM has no primitive for entering a one-time code. The issue asks for:

1. A configurable number of digits, one input box per character.
2. Mobile keyboard integration — when the code arrives by SMS or email, the
   keyboard should offer to fill it.
3. Focus advancing to the next box as each character is entered.

## Public API

```ts
export type OtpInputSize = 'sm' | 'md' | 'lg';
export type OtpInputType = 'numeric' | 'alphanumeric';

export interface OtpInputProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  length?: number; // default 6
  value?: string; // controlled
  defaultValue?: string; // uncontrolled seed
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  type?: OtpInputType; // default 'numeric'
  size?: OtpInputSize; // default 'md'
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}
```

- `forwardRef<HTMLDivElement>` → the wrapper `<div role="group">`, matching
  `PhoneInput`. Consumers who need to focus the field use `id` +
  `<label htmlFor>`, or `autoFocus`.
- `{...rest}` is spread **first** (Pattern B) so the structural ARIA contract —
  `role="group"` and the resolved label — cannot be clobbered.
- `id` lands on the **first** box so an external `<label htmlFor>` focuses it.
- State runs through `_internal/useControllableState<string>`; controlled and
  uncontrolled both work.

### Value model

A single string, never longer than `length`, always sanitized:

- `numeric` — strip everything outside `[0-9]`.
- `alphanumeric` — strip everything outside `[0-9A-Za-z]`, then uppercase.

Box `i` renders `value[i] ?? ''`. A consumer who feeds back an over-long or
dirty `value` sees it sanitized on render, not silently mis-sliced.

`onComplete` fires on the **transition** from "not full" to "full" —
`next.length === length && prev.length !== length` — not on every keystroke
while full. Replacing a character inside an already-full code does not re-fire;
clearing a box and refilling it does.

**Amended during implementation:** the shipped guard is
`next.length === length && next !== prev`, not `prev.length !== length`. A
mistyped code corrected in place (`123455` → fix the last digit → `123456`)
is a real completion a consumer must hear about, so it now re-fires;
retyping the same value over a full code still does not, since nothing
changed. See `packages/design-system/src/components/OtpInput/OtpInput.tsx`'s
`onComplete` JSDoc for the current contract.

## The single input path

Every box carries `onFocus={(e) => e.target.select()}`. Consequences:

- Typing into a **filled** box replaces its character — the DOM value stays one
  character long, so there is no ambiguity between "typed a second char" and
  "something filled this box with a code".
- Autofill and paste deliver the **whole** code into whichever box is focused.

So one `onChange` handler covers auto-advance, paste, and iOS Safari's habit of
dumping the entire SMS code into a single field:

```
onChange(i, raw):
  chars = sanitize(raw)
  if chars is empty:            // deletion
    next = code.slice(0, i)     // truncate — keeps the code contiguous
    setValue(next); stay on i
  else:
    next = (code.slice(0, i) + chars + code.slice(i + chars.length)).slice(0, length)
    setValue(next)
    focus box min(i + chars.length, length - 1)
```

**The code is always contiguous**, so `value[i]` is box `i` with no holes. A
deleted middle character therefore truncates from that position rather than
leaving a gap the string cannot express. Typing over a box replaces just that
character, which is the actual repair path users take.

Contiguity also means the only reachable boxes are the filled ones plus the
first empty one. Clicking past it redirects to it — handled on `mousedown`,
where the rendered `code` is still current; doing it in `onFocus` would race
the component's own programmatic focus calls and bounce focus back to box 0.

**No `maxLength={1}`.** It would truncate an autofilled 6-character code down to
one character and break the primary feature the issue asks for. There is also no
separate `onPaste` handler — paste arrives through `onChange` like everything
else.

## Mobile keyboard integration

Each box renders:

| attribute                    | value                             |
| ---------------------------- | --------------------------------- |
| `type`                       | `"text"`                          |
| `autoComplete`               | `"one-time-code"`                 |
| `inputMode`                  | `"numeric"` / `"text"` per `type` |
| `pattern`                    | `"[0-9]*"` (numeric only)         |
| `autoCorrect` / `spellCheck` | `"off"` / `false`                 |

`autocomplete="one-time-code"` is what makes iOS and Android offer the code
from a just-received SMS above the keyboard. `type="text"` rather than
`type="number"` avoids spinner UI and leading-zero stripping.

**Out of scope:** the WebOTP API (`navigator.credentials.get({ otp })`). It is
Android-Chrome-only and requires the SMS body to end with an origin-bound line
(`@example.com #123456`) that the CRM's SMS provider does not emit today. Noted
in the component JSDoc so the next reader does not re-derive it.

## Keyboard

| key                    | behavior                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| character              | replaces the current box, focus advances                                                                                                                                 |
| `Backspace` / `Delete` | on a **filled** box: native (focus selected the content), which clears the code from this box onward and stays. On an **empty** box: clear the previous box and focus it |
| `ArrowLeft/Right`      | move focus one box, clamped to the first empty box (no wrap)                                                                                                             |
| `Home` / `End`         | focus the first box / the last reachable box                                                                                                                             |

**Roving tabindex.** `tabIndex={0}` on the active box — the focused one, or the
first empty one when focus is outside — and `-1` on the rest. Tab enters the
group once and leaves it once, instead of stepping through six boxes. `tabIndex`
`-1` does not affect autofill.

## Accessibility

- Wrapper: `role="group"`, named by `aria-labelledby` → `aria-label` →
  `t('otpInput.groupLabel')`. Unlike `PhoneInput`, a default is supplied: six
  boxes named "Digit 1 of 6" with no group name is not usable, and there is a
  single obvious name for this control.
- Each box: `aria-label = t('otpInput.digit', { index: i + 1, total: length })`
  for `numeric`, `t('otpInput.character', …)` for `alphanumeric` — parameterized
  message leaves, the shape `t()` already supports.
- `aria-invalid` and `aria-describedby` are set on **every** box. Repeating the
  error while arrowing between cells is a smaller failure than a user landing on
  box 4 and never hearing it. Documented in the JSDoc as a deliberate trade.
- `disabled` disables every box; `required` is forwarded to the first box.

### Hard rule 10

`OtpInput` has **no transient or async state**. `invalid` is a durable property
supplied by the consumer and is already exposed through `aria-invalid`; the code
value itself is read back from the boxes on focus. No live region, deliberately
— recorded in the component JSDoc per the rule's "visual-only must be written
down" clause.

## Styling

`OtpInput.tokens.scss`:

```
--otp-input-gap
--otp-input-cell-size-sm | -md | -lg      // square cell, width == height
--otp-input-font-size-sm | -md | -lg
--otp-input-bg / -fg / -border-color / -radius
--otp-input-border-color-focus / --otp-input-ring-focus
--otp-input-border-color-invalid / --otp-input-ring-invalid
--otp-input-bg-disabled / -border-color-disabled / -fg-disabled
```

All default to the `--input-*` family or primitives, so an OtpInput sits next to
an `Input` without drift. Root is `display: inline-flex` + `gap` — no `margin`,
no `position`, no `flex: 1`. A fixed token-driven cell size is the intrinsic
size of a one-character box and follows the precedent already set by `Switch`
(`--switch-track-width-*`) and `Kbd` (`--kbd-min-width-*`); rule 4 forbids
layout the parent owns, not a component's own intrinsic dimensions.

Focus uses `:focus-visible` with the shared `focus-ring` mixin, consistent with
`Input`.

## i18n

New `Messages` namespace:

```ts
otpInput: {
  /** Default accessible name for the whole group. */
  groupLabel: string;
  /** Per-box name, numeric mode. (index, total) => string */
  digit: (index: number, total: number) => string;
  /** Per-box name, alphanumeric mode. (index, total) => string */
  character: (index: number, total: number) => string;
}
```

Populated in both `en.ts` and `ru.ts`.

## Explicitly not built

- **Masking / PIN dots.** OTP codes are read off a phone and typed once; hiding
  them hurts error correction and helps nobody.
- **Group separators** (`123-456`). A consumer can draw one with CSS around the
  component.
- **`onlyOneInputTabbable` escape hatch.** Roving tabindex is the right behavior;
  a prop to turn it off is speculative.
- **WebOTP.** See above.

## Testing

`OtpInput.test.tsx` covers:

1. Renders `length` boxes; defaults to 6.
2. `size` and `invalid` render the expected classes.
3. Controlled `value` + `onChange` round-trip; uncontrolled `defaultValue`.
4. Typing advances focus; typing in a filled box replaces rather than shifts.
5. Backspace on an empty box clears and focuses the previous one; Backspace on a
   filled box clears in place.
6. `ArrowLeft` / `ArrowRight` / `Home` / `End` move focus without wrapping.
7. Pasting / autofilling a full code into box 1 distributes it and focuses the
   last box; pasting into box 3 fills from box 3 onward and truncates.
8. `numeric` rejects letters; `alphanumeric` accepts and uppercases them.
9. `onComplete` fires once on completion and not on every keystroke while full.
10. `disabled` disables every box.
11. `ref` reaches the wrapper `div`; `className` is merged, not replaced.
12. Exactly one box has `tabIndex={0}` at any time.
13. `autoComplete="one-time-code"` / `inputMode` / `pattern` are present.
14. Group name resolution (`aria-labelledby` > `aria-label` > default), per-box
    `aria-label`s, `aria-invalid` and `aria-describedby` on every box.

## Repo checklist (root CLAUDE.md core invariant)

- `src/components/OtpInput/{OtpInput.tsx,.module.scss,.tokens.scss,.test.tsx,index.ts}`
- re-export from `packages/design-system/src/index.ts`
- i18n keys in `messages.ts`, `en.ts`, `ru.ts`
- `CLUSTERS['OtpInput'] = 'Forms'` in **both** `src/_meta/manifest.ts` and
  `scripts/generate-manifest.mjs`, then `npm run build:manifest`
- `AGENTS.md` TL;DR section
- JSDoc `@remarks` for "when NOT to use" + anti-patterns
- playground `pages/components/OtpInputDemo.tsx`, wired into `App.tsx`,
  `layout/AppShell/navItems.ts`, and `pages/components/ComponentsIndex.tsx`
