# `<MoneyInput>`

Money field: currency picker (`CurrencySelect`) + formatted amount `Input`, controlled on one `value: MoneyValue` (`{ amount: string | null; currency: string }`), `onChange(value)`. `amount` is a **canonical decimal string** (`"1234.50"`, `"-3"`) or `null` — never a JS number. `currencies` (ISO 4217, required) lists what the picker offers; exactly one renders a static prefix instead. The amount groups as you type in the locale's separators, keeps the caret where you are editing, rejects keystrokes past the currency's precision (2 for EUR, 0 for JPY, 3 for KWD) — a digit typed inside a full fraction overwrites the next one. Backspace/Delete step over group separators, and over the decimal while a fraction follows it (select the decimal to remove it). Blur pads the fraction (`12` → `12.00`). Switching currency rounds the amount half-up to the new precision (and pads it, as blur would). An external `amount` that is not a canonical decimal string displays empty with a dev warning. In comma-decimal locales the numpad `.` key types the decimal; a paste or drop is parsed on its own, then spliced over the selection. It must be exactly one number, optionally with currency symbols/ISO codes and a sign (`-5`, `−5`, `5-`, `(1,234.50)`); anything else — words, a second number, stray parentheses, a second decimal in the result, a sign not at the start — is rejected with no change. Inside the number, `$1,234.5678` truncates to the currency's precision; with both `.` and `,` the last one is the decimal whatever the locale, and a separator repeated more than once is grouping. A negative paste needs `allowNegative` (or an already-negative value). `allowNegative` permits a leading `-`; without it, adding a `-` (typed or pasted) is rejected rather than silently dropped, and an existing external negative keeps its sign while edited. `onChange` fires on every edit and currency switch — never for blur-without-edit or external value changes. `name` emits hidden `<name>` / `<name>_currency` inputs.

```tsx
const [price, setPrice] = useState<MoneyValue>({ amount: null, currency: 'EUR' });
<MoneyInput
  aria-label="Price"
  currencies={['EUR', 'USD', 'GBP']}
  value={price}
  onChange={setPrice}
/>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `MoneyValue` | yes | Controlled value. `amount` is a canonical decimal string or `null`; `currency` an ISO 4217 code. |
| `onChange` | `(value: MoneyValue) => void` | yes | Fires on every amount edit and currency switch. Never fires for blur-without-edit or external value changes. |
| `currencies` | `string[]` | yes | ISO 4217 codes to offer. Exactly one renders a static prefix instead of a picker. |
| `currencyDisplay` | `'code' \| 'symbol' \| 'both'` | no | How the selected currency renders: `"code"` (default), `"symbol"` or `"both"`. |
| `currencyLabel` | `string` | no | Overrides the currency picker's accessible name (default: "<group label> Currency"). |
| `allowNegative` | `boolean` | no | Allow a leading minus. Default `false`. |
| `locale` | `string` | no | BCP-47 locale for separators and currency names. Defaults to the i18n locale. |
| `size` | `'sm' \| 'md' \| 'lg'` | no | Control size, forwarded to both controls. Default `"md"`. |
| `invalid` | `boolean` | no | Error chrome on both controls. |
| `disabled` | `boolean` | no | Disable both controls. |
| `readOnly` | `boolean` | no | Make both controls read-only. |
| `required` | `boolean` | no | Mark the amount required. |
| `placeholder` | `string` | no | Placeholder for the amount field. |
| `name` | `string` | no | Emits hidden `<name>` (canonical amount) and `<name>_currency` inputs for native form posts. |
| `id` | `string` | no | Stable id; placed on the amount field so an external `<label htmlFor>` focuses it. |
| `aria-label` | `string` | no | Accessible name when used STANDALONE (outside `<Field>`). |
| `aria-labelledby` | `string` | no | Ids of elements labelling the group (injected by `<Field>`). |
| `aria-describedby` | `string` | no | Ids of description/error elements; forwarded to the amount field (injected by `<Field>`). |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

Inside a `<Field>` the label and error wiring are injected (the picker is named "Price Currency"):

```tsx
<Field label="Price" error={price.amount === null ? 'Required' : undefined}>
  <MoneyInput currencies={['EUR', 'USD']} value={price} onChange={setPrice} />
</Field>
```

**When NOT to use:** a currency without an amount — use `CurrencySelect`. Plain quantities or non-money decimals — `<Input inputMode="decimal">`.

**Anti-patterns**

- ❌ Storing the formatted display (`"1,234.50"`) — persist the emitted `amount` + `currency`; the display is reconstructed from them.
- ❌ `parseFloat(amount)` for maths — floats lose cents; use a decimal library or integer minor units.
- ❌ Comparing `amount` strings for dirtiness — `"12"` and `"12.00"` are the same money (blur pads). Compare amounts numerically (decimal-aware), not as strings.

**Known limitations**

- Latin digits and 3-digit grouping only: locales with other numerals or grouping (e.g. Indian lakh `12,34,567`) display Latin digits grouped in threes.
