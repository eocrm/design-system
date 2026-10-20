# MoneyInput (amount + currency) + CurrencySelect

## Goal

The CRM needs money fields: one control that holds an amount and its currency
(deal value, price, budget), and a standalone currency picker for fields with
no amount (a "default currency" setting, or "accepted currencies"). There are
two new components and one shared internal util:

- `<CurrencySelect>` is the DS `Select`, preconfigured with currency options.
- `<MoneyInput>` puts a leading `CurrencySelect` (or a static currency prefix)
  in front of a live-formatted amount input. It is modelled on `PhoneInput`.
- `src/components/_internal/currency.ts` (or a colocated `currency.ts`, the builder chooses)
  holds the precision, symbol, name, parse and format helpers that both
  components use.

Both components go through the full 6-step component checklist in root
`CLAUDE.md` (tests, demo + wiring, export, docs + AI-PRIMER line, manifest in
both maps). Everything ships on one branch and in one PR.

## Non-goals / anti-goals

- No FX conversion, no min/max/step props, no built-in validation. The consumer
  validates and drives `invalid` / `<Field error>`.
- No "all ISO 4217" default list. `currencies` is **required** on both components.
- No new dependency. `Intl.NumberFormat`, `Intl.DisplayNames` and
  `formatToParts` cover everything needed.
- Never use a JS `number` for the amount. Floats must not round money.
- **Anti-goal:** the caret must not jump to the end on reformat. `PhoneInput`
  documents that as a known limitation, and the user explicitly does not want it
  repeated here.

## Shared util (`currency.ts`)

Pure functions with their own unit tests:

- `currencyPrecision(code)`: max fraction digits from
  `new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits`
  (EUR/USD 2, JPY 0, KWD 3).
- `currencySymbol(code, locale)`: the `currency` part of `formatToParts`, using
  `currencyDisplay: 'symbol'`. _(Our call: `'symbol'` rather than `'narrowSymbol'`,
  so `en` gives `CA$`/`A$`, which keeps dollars apart.)_
- `currencyName(code, locale)`: `Intl.DisplayNames(locale, { type: 'currency' })`,
  falling back to the code.
- `localeSeparators(locale)`: group and decimal characters from `formatToParts`
  (`1,234.5` vs `1.234,5`, and NBSP/narrow-NBSP groups in fr/ru).
- `parseAmount(text, locale, precision, allowNegative)`: a lenient parse into a
  canonical decimal string (`"-1234.5"`) or `null` when empty. It strips currency
  symbols, letters and whitespace, and treats the locale decimal separator as the decimal.
  _(Our call: when the locale decimal is `,`, precision is ≤ 2, and the input
  contains only `.` used once followed by 1–precision digits, also treat that
  `.` as the decimal, because users type `12.50` on numpads in de-DE. This is
  disabled for 3-decimal currencies, where `1.234` would be ambiguous.)_
  Fraction digits beyond precision are truncated (paste); typing past
  precision is rejected by the component before it calls `parseAmount`.
- **Locale scope (user decision):** only Latin digits and 3-digit grouping
  (en/de/fr/ru and similar). Indian grouping and native-digit locales are out
  of scope. Document this as a known limitation.
- `formatAmount(canonical, locale, { pad, precision })`: inserts grouping
  separators by **string manipulation** (exact for any length), with the locale
  decimal, and optionally pads to `precision`.
- `roundAmount(canonical, precision)`: **string-based** half-up rounding, used
  on currency switch (`12.345` → `12.35` when switching KWD→EUR, and `12.34` → `12`
  for JPY).

## `<CurrencySelect>`

A thin wrapper over `Select`. Props:

```ts
type CurrencyDisplay = 'code' | 'symbol' | 'both'; // trigger/chip text: EUR | € | EUR €
interface CurrencySelectBase {
  currencies: string[];            // REQUIRED, ISO 4217, order preserved
  currencyDisplay?: CurrencyDisplay; // default 'code'
  locale?: string;                 // default useLocale()
  searchable?: boolean;            // default: currencies.length > 7
  // pass-through to Select:
  size, invalid, disabled, readOnly, required, name, form, placeholder,
  clearable, open/defaultOpen/onOpenChange, id, aria-label,
  aria-labelledby, aria-describedby, className, …native div attrs
}
// single (default)
value: string | null; onChange: (code: string | null) => void;
// multiple
multiple: true; value: string[]; onChange: (codes: string[]) => void;
triggerDisplay?: 'chips' | 'summary';
```

- These props are **not** exposed: `options`, `loadOptions`, `creatable`, and all `render*`
  props. Owning those is the reason the component exists.
- Option `label` = `currencyDisplay` text. A searchable Select shows `label` in
  the trigger and ignores `renderValue`; `PhoneInput` relies on the same
  behaviour. Option `description` = `"<CODE> <name> <symbol>"` so search
  matches by code, name and symbol in every display mode.
- Rows render via `renderOption` as `EUR — Euro` (localized name), on one line
  with ellipsis. This matches PhoneInput's `.option`.
- Single-mode `null` maps to a Select value that matches no option, so
  the placeholder shows. Clearing emits `null`.
- Default `placeholder` comes from i18n (`currencySelect.placeholder`, "Select
  currency"). Search placeholder: `currencySelect.search` ("Search currencies…").
- Known quirk (accepted, our call): in the non-searchable (≤7) `symbol` mode,
  button typeahead matches the `label` (`€`), so typing "E" won't jump to EUR.
  This is acceptable for short lists.
- Dev warning when `currencies` is empty or contains a code that `Intl` rejects.

## `<MoneyInput>`

```ts
interface MoneyValue {
  amount: string | null;
  currency: string;
}
interface MoneyInputProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  value: MoneyValue; // controlled
  onChange: (value: MoneyValue) => void;
  currencies: string[]; // REQUIRED; 1 => static prefix, ≥2 => picker
  currencyDisplay?: CurrencyDisplay; // default 'code'; also used for the static prefix
  currencyLabel?: string; // overrides picker accessible name
  allowNegative?: boolean; // default false
  locale?: string; // default useLocale()
  size?: 'sm' | 'md' | 'lg';
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  placeholder?: string; // amount placeholder
  name?: string; // hidden inputs: `${name}` (amount) + `${name}Currency`? — see below
  id?: string; // on the amount input
  'aria-label'?;
  'aria-labelledby'?;
  'aria-describedby'?;
}
```

### Layout

- **Leading** currency, then the amount. `role="group"`, named exactly like
  PhoneInput (`aria-labelledby` from Field wins, else `aria-label`). The picker's
  accessible name is composed as "<group label> Currency" (`currencyLabel`
  overrides it), using the same hidden-span technique as PhoneInput.
- With ≥2 currencies, render an internal `CurrencySelect` (single, never clearable,
  `selectOnOpen` when searchable) at a compact width, with the amount input taking the rest.
- With exactly one currency, render a non-interactive prefix showing the
  `currencyDisplay` text of that currency, in the same slot and at the same height. It is
  `aria-hidden`, and the currency is folded into the amount input's accessible
  description or name so screen readers still hear "EUR".
- Amount input: `inputMode="decimal"` (`"text"` when `allowNegative`, because some
  mobile decimal keypads have no minus), `autoComplete="off"`, `text-align: end`
  _(our call, the usual convention for money)_.
- Tokens only. If the trigger needs a new compact width token, add it to `tokens.json`
  (for example `size.control.currency`) and run `tokens:check`.

### Typing behaviour

- Each change runs `parseAmount` and then `formatAmount(pad: false)`. Grouping
  separators appear live. Keystrokes that would add a second decimal, exceed
  precision, or add `-` when it isn't allowed (or anywhere but the start) are rejected
  (the value stays unchanged and the caret stays put).
- **Caret preservation:** count the significant characters (digits, the decimal
  separator, `-`) left of the caret before reformatting, then put the caret after the same
  count in the new string. Deleting or backspacing over a group separator
  deletes the neighbouring digit in that direction (otherwise the separator
  just reappears and the key feels dead).
- A lone `-` or a trailing decimal (`12.`) is kept in the display while focused.
  The emitted amount is `null` for `-` and `"12"` for `12.`.
- **Blur:** reformat with `pad: true` (`12` → `12.00`, `1234.5` → `1,234.50`) and
  emit the padded canonical (`"12.00"`). An empty field stays empty and emits `null`.
- **Paste:** the same lenient parse applies to the whole resulting text.
  `$1,234.56` and `1 234,56 €` both work under their locales. Excess fraction
  digits are truncated.
- **Currency switch:** `roundAmount` to the new precision, reformat (padded if
  the field isn't focused), and emit `{ amount, currency }` once.
- **External value changes** resync the display through a `lastEmitted` ref, the same
  way as in PhoneInput, so echoes of our own `onChange` never clobber typing.
- **Canonical form (user decision): display-only normalisation.** The component
  never fires `onChange` without a user action. A non-canonical external value
  (`"12.5"` for EUR) is displayed padded (`12.50`) but not re-emitted. Blur
  emits the padded form only if the user edited since focus. Docs must tell
  consumers to compare amounts numerically, not as strings.
- If `value.currency` is not in `currencies`, show a dev warning and still render it.

### Forms

When `name` is set, emit hidden inputs `name` = canonical amount and
`${name}_currency` = code. _(Our call on the suffix; the builder may adjust it.)_

## i18n

Add `currencySelect.{placeholder, search}` and `moneyInput.{currencyLabel,
amountLabel}` to `messages.ts`, `en.ts` and `ru.ts`.

## Tests (high level)

- `currency.test.ts`: precision (USD/JPY/KWD), separators for en-US, de-DE, fr-FR
  and ru, parse (lenient paste cases, negatives, truncation), format (grouping,
  padding, big numbers exact past 2^53), round half-up including carry
  (`9.995` → `10.00`).
- `CurrencySelect.test.tsx`: single and multi value shapes, `null` shows the
  placeholder, clearable emits `null`, search by name and code, the display modes,
  and forbidden props are absent from the type.
- `MoneyInput.test.tsx`: live grouping, caret stays put on a mid-string edit,
  backspace over a separator, decimals blocked past precision, blur pad,
  currency switch rounding, the single-currency prefix (no combobox in the DOM),
  `allowNegative`, Field wiring (label → group, picker composed name), and resync
  on external value change.

## Docs

Each component gets a `docs/components/<Name>.md` with TL;DR, "When NOT to use"
and anti-patterns. Examples: "don't store the formatted display, store
`amount`"; "don't `parseFloat` the amount for maths, use a decimal lib or
minor units server-side"; "for a currency without an amount use
`CurrencySelect`, not `MoneyInput`".

## Release

**User decision:** default patch bump. Do not edit `release.yml`.

## Left to the builder

The util file location, internal state shape, the exact caret algorithm, the
demo page contents (showing single/multi currency, the display modes, negatives,
JPY/KWD precision, Field + error, sizes, and the de-DE locale via `LocaleProvider`), and
the manifest cluster name (likely the same cluster as PhoneInput).
