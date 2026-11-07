# `<NumberField>` — Numeric stepper field

**TL;DR:** a split stepper `[ − | value | + ]` for a controlled `number | null`. Typing fires `onChange` live; blur or Enter clamps to `min` / `max` and snaps to `step`. Arrow / Page / Home / End keys and the − / + buttons step it, and holding a button repeats. The value is formatted and parsed in the active locale (`useLocale()`).

```tsx
const [qty, setQty] = useState<number | null>(1);

<Field label="Quantity">
  <NumberField value={qty} onChange={setQty} min={0} max={99} />
</Field>

<NumberField aria-label="Discount" value={rate} onChange={setRate} min={0} max={1} step={0.05} />
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `number \| null` | yes | Controlled value. `null` = empty field. |
| `onChange` | `(value: number \| null) => void` | yes | Fires live on every keystroke that parses to a number (unclamped), with `null` when the field is cleared, and on every step. Blur after typing, or Enter, fires once more with the clamped, step-snapped value. |
| `min` | `number` | no | Lower bound. Blur / Enter clamps to it; − disables at it; Home jumps to it. Omit for unbounded. |
| `max` | `number` | no | Upper bound. Blur / Enter clamps to it; + disables at it; End jumps to it. Omit for unbounded. |
| `step` | `number` | no | Default 1. Also sets the minimum display precision (decimals of `step`); a value with more decimals shows them all (up to 10), so the field never hides the stored value. A `step` ≤ 0 falls back to 1 (dev warning). |
| `size` | `'sm' \| 'md' \| 'lg'` | no | Field height + type scale: `"sm"` dense rows, `"md"` (default) forms, `"lg"` prominent entry. |
| `invalid` | `boolean` | no | Error chrome + `aria-invalid="true"`. Injected by `<Field error>`. |
| …native | | | plus native `<input>` attributes |

<!-- props:end -->

## Behaviour

- **Typing.** `onChange` fires on every keystroke whose text parses to a number, with the raw (unclamped) value; clearing the field fires `null`. Partial or malformed text (`-`, `1.`, a second decimal separator like `12.5.3` or `12,5.3`, a `-` anywhere but first like `1-2`, or a space where the locale does not group by space) stays in the field without firing, and `value` stays the last valid number. Letters are rejected, and so is `-` when `min ≥ 0`. Only digits, the locale's group and decimal separators, a leading `-` and surrounding whitespace are accepted. In any locale whose decimal is not `.` (`de`, `es`, `it`, `ru`, `fr`), a typed `.` (numpad, or a mobile keyboard) is the decimal when the text outside the selection has none, so `1.5` in `de` is 1.5, not 15. Where `.` also groups (`de`, `es`, `it`, `pt-PT`), typing `.` or `,` right after such a dot and exactly 3 digits turns the dot back into a thousands separator: `1.234,5` is 1234.5 and `1.234.567` is 1234567. Any other `.` after a decimal does nothing. IME composition is never intercepted. Pasted text stays strict, so a pasted `1.234,5` in `de` is 1234.5 and `1.234` in `es` is 1234.
- **Commit.** Blur after typing, or Enter, clamps to `min` / `max`, snaps to the `step` grid (anchored at `min`, else 0) and reformats; e.g. `step={0.25}` turns `1.3` into `1.25`. A partial or malformed draft reverts to the last value. Focusing and leaving without typing (or after only stepping) commits nothing, so an external off-grid value is left alone. Enter does not `preventDefault`, so it still submits a surrounding form.
- **Stepping.** ArrowUp / ArrowDown move by `step`, PageUp / PageDown by `10 × step`, Home / End jump to `min` / `max` (only when set). Stepping adds to the current value without snapping to the grid, and clamps. An empty field steps from 0.
- **Buttons.** Press steps once; holding repeats after 400 ms, then every 60 ms, until release, pointer leave, or the limit. Each button disables at its limit, and both disable when the field is `disabled` or `readOnly`. They are `tabIndex={-1}` (the arrow keys duplicate them) and named by `numberField.decrease` / `numberField.increase`.
- **Invalid `step`.** A `step` ≤ 0 (or `NaN`) falls back to 1 with a dev-only `console.warn`.
- **Precision.** The number of decimals in `step` is the minimum display precision: `step={0.1}` shows `1234.5` as `1,234.5` and `1234` as `1,234.0`. A value with more decimals than `step` shows them all (up to 10), so the field never hides the stored value: `value={2.5}` with `step={1}` shows `2.5`. Stepping rounds the result to `step`'s decimals, and typing then committing snaps to the grid.
- **Locale.** Group and decimal characters come from the active locale (`<LocaleProvider>`, else the browser), so `ru` shows `1 234,5` and accepts `2,5`.
- **External `value` changes** update the text, unless the input is focused and its draft already means that value.
- **A parent that rejects a change** (does not apply the `onChange` value) leaves the typed text in the field until the next `value` change or blur; blur then re-commits the typed text, firing `onChange` again.
- **Accessibility.** The `<input>` has `role="spinbutton"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and `aria-valuetext` (the locale-formatted value; omitted when empty, and the last value while the draft is partial). `inputMode` is `text` whenever negatives are allowed (`min` unset or < 0), because the iOS decimal keypad has no minus key; otherwise `numeric` for an integer `step` and `decimal` for a fractional one. Works inside `<Field>`, which labels it and injects `invalid`.
- **Ref and rest props** go to the `<input>`; `className` goes to the wrapper.

**Touch devices:** on `pointer: coarse` the field and each button are 44px (`--size-touch`) at every size, and the text is 16px so iOS does not zoom on focus (`--number-field-height-*`, `--number-field-button-size-*`, `--number-field-font-size-*`).

## When NOT to use

- **Money** — use `<MoneyInput>`: it carries a currency, its precision and a decimal-string value (never a float).
- **Coarse ranges where the exact number matters less than the position** (volume, 0–100 opacity) — use `<Slider>`.
- **Identifiers that happen to be digits** (phone, postcode, card, OTP) — use `<PhoneInput>`, `<Input>` or `<OtpInput>`; they are not quantities and must not be grouped or stepped.

Anti-patterns:

- ❌ `<Input type="number">` for a quantity — no locale formatting, wheel-scroll surprises; use `NumberField`.
- ❌ Reading the live `onChange` value as final — it is unclamped while typing; the clamped value arrives on blur / Enter. Validate on submit.
- ❌ A `max` off the `step` grid (`step={5} max={12}`) — clamping can land on the off-grid `12`.
