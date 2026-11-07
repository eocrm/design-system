# `NumberField` — Numeric stepper field

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
| `onChange` | `(value: number \| null) => void` | yes | Fires live on every keystroke that parses to a number (unclamped), with `null` when the field is cleared, and on every step. Blur / Enter fires once more with the clamped, step-snapped value. |
| `min` | `number` | no | Lower bound. Blur / Enter clamps to it; − disables at it; Home jumps to it. Omit for unbounded. |
| `max` | `number` | no | Upper bound. Blur / Enter clamps to it; + disables at it; End jumps to it. Omit for unbounded. |
| `step` | `number` | no | Default 1. Also sets display precision (decimals of `step`). |
| `size` | `'sm' \| 'md' \| 'lg'` | no | Field height + type scale: `"sm"` dense rows, `"md"` (default) forms, `"lg"` prominent entry. |
| `invalid` | `boolean` | no | Error chrome + `aria-invalid="true"`. Injected by `<Field error>`. |
| …native | | | plus native `<input>` attributes |

<!-- props:end -->

## Behaviour

- **Typing.** `onChange` fires on every keystroke whose text parses to a number, with the raw (unclamped) value; clearing the field fires `null`. Partial text (`-`, `1.`) stays in the field without firing, and `value` stays the last valid number. Letters are rejected, and so is `-` when `min ≥ 0`. In comma-decimal locales the numpad `.` types the decimal.
- **Commit.** Blur or Enter clamps to `min` / `max`, snaps to the `step` grid (anchored at `min`, else 0) and reformats; e.g. `step={0.25}` turns `1.3` into `1.25`. A partial draft reverts to the last value. Enter does not `preventDefault`, so it still submits a surrounding form.
- **Stepping.** ArrowUp / ArrowDown move by `step`, PageUp / PageDown by `10 × step`, Home / End jump to `min` / `max` (only when set). Stepping adds to the current value without snapping to the grid, and clamps. An empty field steps from 0.
- **Buttons.** Press steps once; holding repeats after 400 ms, then every 60 ms, until release, pointer leave, or the limit. Each button disables at its limit, and both disable when the field is `disabled` or `readOnly`. They are `tabIndex={-1}` (the arrow keys duplicate them) and named by `numberField.decrease` / `numberField.increase`.
- **Precision.** The number of decimals in `step` is the display precision: `step={0.1}` shows `1,234.5`, `step={1}` shows `1,235`.
- **Locale.** Group and decimal characters come from the active locale (`<LocaleProvider>`, else the browser), so `ru` shows `1 234,5` and accepts `2,5`.
- **External `value` changes** update the text, unless the input is focused and its draft already means that value.
- **Accessibility.** The `<input>` has `role="spinbutton"` with `aria-valuenow`, `aria-valuemin` and `aria-valuemax`. `inputMode` is `numeric` when `step` is an integer and `min ≥ 0`, else `decimal`. Works inside `<Field>`, which labels it and injects `invalid`.
- **Ref and rest props** go to the `<input>`; `className` goes to the wrapper.

**Touch devices:** on `pointer: coarse` the field and each button are 44px (`--size-touch`) at every size, and the text is 16px so iOS does not zoom on focus (`--number-field-height-*`, `--number-field-button-size-*`, `--number-field-font-size-*`).

## When NOT to use

- **Money** — use `<MoneyInput>`: it carries a currency, its precision and a decimal-string value (never a float).
- **Coarse ranges where the exact number matters less than the position** (volume, 0–100 opacity) — use `<Slider>`.
- **Identifiers that happen to be digits** (phone, postcode, card, OTP) — use `<PhoneInput>`, `<Input>` or `<OtpInput>`; they are not quantities and must not be grouped or stepped.

Anti-patterns:

- ❌ `<Input type="number">` for a quantity — no locale formatting, wheel-scroll surprises; use `NumberField`.
- ❌ Reading the live `onChange` value as final — it is unclamped while typing; the clamped value arrives on blur / Enter. Validate on submit.
- ❌ A step in exponent notation (`step={1e-7}`) — it reads as 0 decimals; write the step as a plain decimal literal.
- ❌ A `max` off the `step` grid (`step={5} max={12}`) — clamping can land on the off-grid `12`.
