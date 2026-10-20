# `<CurrencySelect>`

Currency picker over the DS `Select`: you pass the ISO 4217 `currencies` to offer (required, in display order); it renders `CODE — Name` rows with localized names (`Intl.DisplayNames`). Single mode is controlled on `value: string | null` / `onChange(code | null)`; `multiple` switches to `string[]` (with `triggerDisplay` `"chips"` / `"summary"`). `currencyDisplay` sets how the SELECTED currency shows in the trigger: `"code"` (default, `EUR`), `"symbol"` (`€`) or `"both"` (`EUR €`). Search turns on automatically above 7 currencies (`searchable` overrides) and matches code, name and symbol. Invalid codes are dropped with a dev warning. `size`/`invalid`/`disabled`/`clearable`/`name` etc. pass through to `Select`.

```tsx
const [cur, setCur] = useState<string | null>('EUR');
<CurrencySelect
  currencies={['EUR', 'USD', 'GBP']}
  value={cur}
  onChange={setCur}
  aria-label="Currency"
/>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `currencies` | `string[]` | yes | ISO 4217 codes to offer, in display order (e.g. `['USD', 'EUR']`). Required; there is no "all currencies" default. Invalid codes are dropped with a dev warning. |
| `currencyDisplay` | `'code' \| 'symbol' \| 'both'` | no | How the SELECTED currency renders in the trigger. Default `"code"`. - `"code"` — `EUR`. - `"symbol"` — `€`. - `"both"` — `EUR €`. Dropdown rows always read `CODE — Name` so they stay identifiable and searchable. |
| `locale` | `string` | no | BCP-47 locale for currency names and symbols. Defaults to the active i18n locale (`useLocale()`). |
| `searchable` | `boolean` | no | Show a search input. Default: on when more than 7 currencies are offered. |
| `multiple` | `false \| true` | no | Single mode (default). |
| `value` | `string \| null \| string[]` | yes | Controlled ISO code; `null` = nothing selected. |
| `onChange` | `(code: string \| null) => void \| (codes: string[]) => void` | yes | Fires with the picked code, or `null` when cleared. |
| `triggerDisplay` | `'summary' \| 'chips'` | no | How selections render in the trigger: `"chips"` (default) or `"summary"`. |
| `id` | `string` | no | Placed on the combobox trigger (the `<button>` / `<input>`), not the wrapper div, so a `<label for>` — Field / SettingRow wire one — focuses the control when clicked. Default: a generated id. Target the wrapper by `className` or a `data-*` attribute, not `#id`. |
| `selectOnOpen` | `boolean` | no | When the searchable combobox opens, select the current text so the user can immediately type to replace it (type-to-search). Default `false`. Only affects the single searchable trigger. |
| `open` | `boolean` | no | Controlled open state. Pair with `onOpenChange`. Omit both to let Select own its open state (the common case). |
| `defaultOpen` | `boolean` | no | Initial open state for uncontrolled usage. Defaults to `false`. |
| `onOpenChange` | `((open: boolean) => void)` | no | Fires whenever Select wants to change open state. |
| `size` | `'sm' \| 'md' \| 'lg'` | no | Trigger height + type scale. See `SelectSize`. Defaults to `'md'`. |
| `invalid` | `boolean` | no | Marks the trigger as invalid — applies the error border + sets `aria-invalid="true"`. Pair with an external error message linked via `aria-describedby`. |
| `placeholder` | `string` | no | Placeholder shown when nothing is selected. In searchable mode, also the input's `placeholder` until the user types. |
| `clearable` | `boolean` | no | Shows a `✕` button in the trigger that clears the selection. Opt-in: defaults to `false`. Always forced `false` when `disabled` or `readOnly`. "Clear" means "reset to the empty value" (`''` / `[]`), so the button only appears when the current value differs from that. A Select whose selected option IS `value: ''` is already at the cleared value and shows no ✕; a value matching no option (a stale id) does show one. |
| `disabled` | `boolean` | no | Disables the trigger entirely — non-interactive, dimmed, focusable only via assistive tech. Hidden form inputs are also disabled. |
| `readOnly` | `boolean` | no | Read-only — trigger is focusable but cannot open or change the selection. Useful for displaying a value inside a form that's not yet editable. |
| `name` | `string` | no | Name attribute for native form submission. In multi mode, one hidden `<input>` per selected value is emitted (so `FormData.getAll(name)` returns the array). |
| `required` | `boolean` | no | Marks the field as required. The trigger exposes `aria-required="true"` to assistive technology. Hidden inputs still serialize named values, but they do not participate in native constraint validation; validate the selection in your form layer. |
| `form` | `string` | no | `form` attribute forwarded to the hidden `<input>` elements. |
| `aria-label` | `string` | no | Accessible name for the trigger. Use this when a visible `<label>` is not present. Mutually exclusive with `aria-labelledby`. |
| `aria-labelledby` | `string` | no | ID of an element that labels the trigger. Use when the label is a sibling node (e.g. a `<Field>` label). |
| `aria-describedby` | `string` | no | ID of an element that describes the trigger — e.g. an error message or helper hint paired with `invalid`. |
| …native | | | plus native HTML attributes |

<!-- props:end -->

**When NOT to use:** an amount plus its currency — use `MoneyInput`. A generic option list — use `Select`.

**Anti-patterns**

- ❌ Passing `options`, `renderOption` or `creatable` — options are derived from `currencies`.
- ❌ Expecting an "all currencies" default — `currencies` is required; an empty list renders an empty picker.
- ❌ Passing lowercase or made-up codes — they are dropped (dev warning).
