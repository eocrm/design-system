# MoneyInput + CurrencySelect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<CurrencySelect>` (a currency picker wrapping `Select`, single or multi) and `<MoneyInput>` (a leading currency picker or static prefix plus a live-formatted decimal-string amount) as complete DS components.

**Architecture:** One pure util module `_internal/currency.ts` owns precision, symbols, names, separators, parse, format and round. `CurrencySelect` wraps `Select` and builds options from that util. `MoneyInput` mirrors `PhoneInput`: it has a `role="group"` wrapper, uses `CurrencySelect` internally, and adds an `Input` with caret-preserving reformatting.

**Tech Stack:** React 19, TypeScript, SCSS modules + tokens, `Intl` (NumberFormat / DisplayNames), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-20-currency-input-design.md`

## Global Constraints

- No new dependencies. Never convert the amount to a JS `number`; all arithmetic is string-based.
- `currencies` is a **required** prop on both components. There is no "all ISO" default.
- Locale scope: Latin digits and 3-digit grouping only (en/de/fr/ru). Locale defaults to `useLocale()` from `src/i18n`; the `locale` prop overrides it.
- `onChange` never fires without a user action (display-only normalisation). Blur emits the padded form only if the user edited since focus.
- The caret must not jump to the end on reformat.
- Tokens only, and no margin/position/flex:1 in component SCSS. A new token goes in `packages/design-tokens/src/tokens.json`, then run `npm run tokens:check`.
- Never inline-disable an `eocrm/*` ESLint rule. Check locally with `node --test tools/eslint-plugin-eocrm/rules.test.mjs`.
- Run Vitest from `packages/design-system` (`npx vitest run src/components/MoneyInput`). Gates: `make test` (read the exit code), `make lint`, `npm run typecheck -w @eocrm/design-system`.
- Branch: `git checkout main && git pull && git checkout -b feat/currency-input`. The spec and plan are committed on this branch. Release stays the default patch bump (don't touch `release.yml`).
- Commits: plain messages with no Co-Authored-By or session trailers.
- Every new component in `manifest.ts` **and** `generate-manifest.mjs` → `CLUSTERS`: `'Forms'`; then `npm run build:manifest` (from `packages/design-system`).

## Review Focus

1. **de-DE numpad `.`**: typing `1`,`2`,`.`,`5` in de-DE with EUR shows `12,5` and emits `"12.5"`, not `125`. Test in Task 4.
2. **Huge amounts**: `"12345678901234567890.12"` formats exactly (`12,345,678,901,234,567,890.12`), with no float drift. Test in Task 1.
3. **External `value` with a currency not in `currencies`**: renders, shows a dev warning, and doesn't crash or emit. Test in Task 3.
4. **Typing `-` when `allowNegative` is false**: rejected, with display and caret unchanged. Typing `-` mid-number is also rejected when it is allowed. Test in Task 4.
5. **Switching currency while the amount is empty**: emits `{ amount: null, currency: next }` and nothing is padded. Test in Task 3.

---

### Task 1: `currency.ts` util

**Files:**

- Create: `packages/design-system/src/components/_internal/currency.ts`
- Test: `packages/design-system/src/components/_internal/currency.test.ts` (Node, `unit` project)

**Interfaces — Produces:**

```ts
export type CurrencyDisplay = 'code' | 'symbol' | 'both';
/** Parsed, in-progress amount. `frac === null` → no decimal point typed; `''` → trailing point. */
export interface AmountDraft { negative: boolean; int: string; frac: string | null }
export function currencyPrecision(code: string): number;
export function currencySymbol(code: string, locale: string): string;        // 'symbol' display: en → 'CA$', '€', '¥'
export function currencyName(code: string, locale: string): string;          // DisplayNames, fallback = code
export function currencyDisplayText(code: string, display: CurrencyDisplay, locale: string): string; // 'EUR' | '€' | 'EUR €'
export function isValidCurrency(code: string): boolean;                      // Intl accepts it
export function localeSeparators(locale: string): { group: string; decimal: string };
export function parseAmount(text: string, opts: { locale: string; precision: number; allowNegative: boolean }): AmountDraft | null; // null = empty
export function draftToCanonical(d: AmountDraft): string | null;             // '-' alone → null, '12.' → '12', strips leading zeros ('007' → '7', keeps '0')
export function canonicalToDraft(s: string | null): AmountDraft | null;
export function formatDraft(d: AmountDraft, opts: { locale: string; precision: number; pad: boolean }): string;
export function roundAmount(canonical: string, precision: number): string;  // string half-up
```

- [ ] **Step 1: Write failing tests** (`describe` per function), including these assertions:

```ts
expect(currencyPrecision('USD')).toBe(2); expect(currencyPrecision('JPY')).toBe(0); expect(currencyPrecision('KWD')).toBe(3);
expect(currencySymbol('CAD', 'en')).toBe('CA$'); expect(currencyName('EUR', 'en')).toBe('Euro');
expect(currencyDisplayText('EUR', 'both', 'en')).toBe('EUR €');
expect(isValidCurrency('EUR')).toBe(true); expect(isValidCurrency('XX')).toBe(false);
expect(localeSeparators('en-US')).toEqual({ group: ',', decimal: '.' });
expect(localeSeparators('de-DE')).toEqual({ group: '.', decimal: ',' });
expect(localeSeparators('fr-FR').decimal).toBe(','); // group is U+202F — assert via /\s/u
const en = { locale: 'en-US', precision: 2, allowNegative: false };
const de = { locale: 'de-DE', precision: 2, allowNegative: false };
expect(draftToCanonical(parseAmount('$1,234.56', en)!)).toBe('1234.56');
expect(draftToCanonical(parseAmount('1 234,56 €', { ...de, locale: 'fr-FR' })!)).toBe('1234.56');
expect(draftToCanonical(parseAmount('1.234,56', de)!)).toBe('1234.56');
expect(draftToCanonical(parseAmount('12.50', de)!)).toBe('12.50');      // numpad-dot rule
expect(draftToCanonical(parseAmount('1.234', { ...de, precision: 3 })!)).toBe('1234'); // rule off for precision 3
expect(draftToCanonical(parseAmount('1.234', de)!)).toBe('1234');      // 3 digits after '.' > precision → group
expect(draftToCanonical(parseAmount('1.23456', en)!)).toBe('1.23');    // truncates
expect(parseAmount('', en)).toBeNull(); expect(parseAmount('  € ', en)).toBeNull();
expect(draftToCanonical(parseAmount('-5', en)!)).toBe('5');            // negative dropped when not allowed
expect(draftToCanonical(parseAmount('-5', { ...en, allowNegative: true })!)).toBe('-5');
expect(draftToCanonical({ negative: true, int: '', frac: null })).toBeNull();
expect(formatDraft(canonicalToDraft('1234.5')!, { locale: 'en-US', precision: 2, pad: true })).toBe('1,234.50');
expect(formatDraft(canonicalToDraft('1234.5')!, { locale: 'de-DE', precision: 2, pad: false })).toBe('1.234,5');
expect(formatDraft({ negative: false, int: '12', frac: '' }, { locale: 'en-US', precision: 2, pad: false })).toBe('12.');
expect(formatDraft(canonicalToDraft('12345678901234567890.12')!, { locale: 'en-US', precision: 2, pad: false })).toBe('12,345,678,901,234,567,890.12');
expect(formatDraft(canonicalToDraft('12')!, { locale: 'en-US', precision: 0, pad: true })).toBe('12');
expect(roundAmount('12.345', 2)).toBe('12.35'); expect(roundAmount('9.995', 2)).toBe('10.00');
expect(roundAmount('12.5', 0)).toBe('13'); expect(roundAmount('-12.345', 2)).toBe('-12.35'); expect(roundAmount('12', 2)).toBe('12');
```

- [ ] **Step 2: Run** `npx vitest run src/components/_internal/currency.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement.** Separators come from `new Intl.NumberFormat(locale).formatToParts(1234.5)`. The parse rule order is: strip everything except digits, `-`, `.`, `,`, and the locale group/decimal; then apply the de-numpad rule (decimal is `,`, precision ≤ 2, exactly one `.`, no `,`, 1–precision digits after it → treat as decimal); then remove group characters; the first locale decimal splits int/frac; truncate frac to precision; `-` counts only as the first significant character and only if `allowNegative`. Grouping is plain string slicing every 3 digits from the right. `roundAmount` never pads; it only rounds when there are more fraction digits than `precision`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(currency): shared currency parse/format util` (include the spec and plan files in this first commit).

---

### Task 2: `CurrencySelect`

**Files:**

- Create: `packages/design-system/src/components/CurrencySelect/{CurrencySelect.tsx,CurrencySelect.module.scss,CurrencySelect.test.tsx,index.ts}`
- Modify: `src/i18n/{messages.ts,en.ts,ru.ts}` — add `currencySelect: { placeholder, search }` (en `'Select currency'`, `'Search currencies…'`; ru `'Выберите валюту'`, `'Поиск валют…'`), with JSDoc on the `messages.ts` keys in the style of `phoneInput`.
- Modify: `src/index.ts`, `src/_meta/manifest.ts`, `scripts/generate-manifest.mjs`
- Create: `packages/design-system/docs/components/CurrencySelect.md`; modify `AI-PRIMER.md` (line next to PhoneInput)

**Interfaces:**

- Consumes: Task 1's `currencyDisplayText`, `currencyName`, `currencySymbol`, `isValidCurrency`, `CurrencyDisplay`.
- Produces:

```ts
type Passthrough = Pick<SelectProps, 'size' | 'invalid' | 'disabled' | 'readOnly' | 'required' | 'name' | 'form' | 'placeholder' | 'clearable' | 'open' | 'defaultOpen' | 'onOpenChange' | 'id' | 'aria-label' | 'aria-labelledby' | 'aria-describedby' | 'selectOnOpen'>;
interface CurrencySelectCommon extends Passthrough, Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  currencies: string[]; currencyDisplay?: CurrencyDisplay; locale?: string; searchable?: boolean;
}
export type CurrencySelectProps =
  | (CurrencySelectCommon & { multiple?: false; value: string | null; onChange: (code: string | null) => void })
  | (CurrencySelectCommon & { multiple: true; value: string[]; onChange: (codes: string[]) => void; triggerDisplay?: 'chips' | 'summary' });
export const CurrencySelect: ForwardRefExoticComponent<CurrencySelectProps & RefAttributes<HTMLDivElement>>;
// index.ts also re-exports type CurrencyDisplay (from _internal/currency)
```

- [ ] **Step 1: Write failing tests** in `CurrencySelect.test.tsx`:
  - `shows the placeholder when value is null`: the trigger has text `Select currency`.
  - `option rows read "CODE — Name"`: opening with `['EUR','USD']` gives an option with name `/EUR — Euro/`.
  - `single: picking emits the code`: `onChange` called with `'USD'`.
  - `clearable: clearing emits null`.
  - `multiple: emits string[]`: after picking EUR then USD, the last call is `['EUR','USD']` (controlled with state).
  - `currencyDisplay symbol shows "€" in trigger` and `both shows "EUR €"`.
  - `searchable auto-on above 7 currencies`: 8 codes give `role="combobox"` with an editable input, and typing `yen` filters down to JPY. 3 codes give a button trigger.
  - `forbidden props are not accepted`: `// @ts-expect-error` on `renderOption`, `options`, `creatable`.
  - `dev-warns on an invalid code`: `console.warn` spy called for `['EUR','XX']`.
  - `forwards ref and merges className`; `invalid sets aria-invalid`; `disabled disables the trigger`.
- [ ] **Step 2: Run** `npx vitest run src/components/CurrencySelect`. Expected: FAIL.
- [ ] **Step 3: Implement.** Option shape: `{ value: code, label: currencyDisplayText(...), description: \`${code} ${name} ${symbol}\` }`. `renderOption` renders `${code} — ${name}` in a single-line ellipsis span (copy `.option` from `PhoneInput.module.scss`). Single mode maps `null` → `''` into Select and `''` → `null` out. The placeholder default is `t('currencySelect.placeholder')`. When searchable, Select's search placeholder is the same prop, so pass `t('currencySelect.search')` only if the consumer gave no `placeholder` **and** a value is set. Otherwise use the placeholder. JSDoc is a one-line summary + `@see docs/components/CurrencySelect.md`, with prop JSDoc on every prop.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Wire up:** exports in `src/index.ts` (`CurrencySelect`, types `CurrencySelectProps`, `CurrencyDisplay`); `CLUSTERS` in both maps; `npm run build:manifest`; write `docs/components/CurrencySelect.md` (TL;DR, snippet, "When NOT to use": an amount+currency pair → `MoneyInput`; anti-patterns: passing `options`, expecting an "all currencies" default); `npm run build:docs`; AI-PRIMER line.
- [ ] **Step 6: Run** `make test` (exit 0) and `npm run typecheck -w @eocrm/design-system`.
- [ ] **Step 7: Commit** `feat(CurrencySelect): currency picker over Select`.

---

### Task 3: `MoneyInput` — structure, value flow, a11y

**Files:**

- Create: `packages/design-system/src/components/MoneyInput/{MoneyInput.tsx,MoneyInput.module.scss,MoneyInput.test.tsx,index.ts}`
- Modify: `packages/design-tokens/src/tokens.json` — add `size.control.currency` = `"8rem"` → `--size-control-currency` (next to `size.control.country`); run `npm run tokens:check`.
- Modify: `src/i18n/{messages.ts,en.ts,ru.ts}` — add `moneyInput: { currencyLabel, amountLabel }` (en `'Currency'`, `'Amount'`; ru `'Валюта'`, `'Сумма'`).
- Modify: `src/index.ts`, `src/_meta/manifest.ts`, `scripts/generate-manifest.mjs`

**Interfaces:**

- Consumes: Task 1's full util; Task 2's `CurrencySelect`.
- Produces:

```ts
export interface MoneyValue { amount: string | null; currency: string }
export type MoneyInputSize = 'sm' | 'md' | 'lg';
export interface MoneyInputProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  value: MoneyValue; onChange: (value: MoneyValue) => void; currencies: string[];
  currencyDisplay?: CurrencyDisplay; currencyLabel?: string; allowNegative?: boolean; locale?: string;
  size?: MoneyInputSize; invalid?: boolean; disabled?: boolean; readOnly?: boolean; required?: boolean;
  placeholder?: string; name?: string; id?: string;
  'aria-label'?: string; 'aria-labelledby'?: string; 'aria-describedby'?: string;
}
export const MoneyInput: ForwardRefExoticComponent<MoneyInputProps & RefAttributes<HTMLDivElement>>;
```

This task does a plain reformat on change: parse the whole text, then format with `pad: false`, then set the caret to the end. Task 4 replaces that with caret-preserving editing and keystroke rejection.

- [ ] **Step 1: Write failing tests** in `MoneyInput.test.tsx` (controlled harness with `useState`):
  - `renders a group with a currency combobox and an amount textbox` when given 2 currencies.
  - `single currency renders a static prefix, no combobox`: `queryByRole('combobox')` is null, the prefix text is `EUR` and it is `aria-hidden`, and the amount `toHaveAccessibleDescription(/Euro/)`.
  - `formats with grouping while typing`: type `1234567` → display `1,234,567`, last emit `{ amount: '1234567', currency: 'USD' }`.
  - `pads on blur after edit`: type `12`, tab out → display `12.00`, last emit amount `'12.00'`.
  - `blur without edit does not emit`: with value `{ amount: '12.5', currency: 'EUR' }` the display is `12.50`, and focus + blur gives `onChange` not called.
  - `external non-canonical value displays padded, never emits`: rerender with `'3.1'` → display `3.10`, `onChange` not called.
  - `switching currency rounds`: `{ amount: '12.34', currency: 'EUR' }` → pick JPY → one emit `{ amount: '12', currency: 'JPY' }`, display `12`.
  - `switching currency with empty amount` → emit `{ amount: null, currency: 'JPY' }` (Review Focus 5).
  - `unknown currency renders and warns`: `value.currency = 'GBP'`, `currencies = ['EUR','USD']` → no throw, `console.warn` called, trigger shows `GBP`, `onChange` not called (Review Focus 3).
  - `clearing the field emits null`.
  - `Field wiring`: inside `<Field label="Price">`, the group is named `Price` and the combobox is named `Price Currency`; `currencyLabel="Cur"` overrides that.
  - `name emits hidden inputs`: `name="price"` → hidden `price` = canonical and `price_currency` = code, and the inner select emits no `name`.
  - `de-DE via LocaleProvider` shows `1.234,50` for `'1234.5'`.
  - `size / invalid / disabled / readOnly pass through to both controls`; `forwards ref to the group div`; `merges className`.
- [ ] **Step 2: Run** `npx vitest run src/components/MoneyInput`. Expected: FAIL.
- [ ] **Step 3: Implement.** Use PhoneInput's structure (`rest` spread first, `role="group"`, hidden-span composed picker name, `lastEmitted` ref resync). Keep a `dirtySinceFocus` ref that is set on change and cleared on focus. Blur pads the display always, but emits only if dirty. Amount input: `inputMode` is `"decimal"`, or `"text"` when `allowNegative`; `autoComplete="off"`; `text-align: end` in SCSS. The picker gets `clearable={false}` and `selectOnOpen`, and its max-width is `--size-control-currency`. The static prefix uses Input's border, background, radius and height tokens per size (read them from `Input.tokens.scss`, with no raw values). JSDoc is a one-line summary + `@see docs/components/MoneyInput.md`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Wire up:** `src/index.ts` (`MoneyInput`, types `MoneyInputProps`, `MoneyInputSize`, `MoneyValue`); `CLUSTERS` in both maps; `npm run build:manifest`.
- [ ] **Step 6: Run** `make test` (exit 0), the typecheck and `npm run tokens:check`.
- [ ] **Step 7: Commit** `feat(MoneyInput): amount + currency group`.

---

### Task 4: `MoneyInput` — caret-preserving editing + docs

**Files:**

- Modify: `packages/design-system/src/components/MoneyInput/MoneyInput.tsx`, `MoneyInput.test.tsx`
- Create: `packages/design-system/docs/components/MoneyInput.md`; modify `AI-PRIMER.md`

**Interfaces:** consumes Task 1 and Task 3. Produces no new public API.

- [ ] **Step 1: Write failing tests** (use `userEvent` with explicit `initialSelectionStart/End` or `setSelectionRange` + `keyboard`):
  - `mid-string insert keeps caret after the inserted digit`: `1,234` with caret after `1` → type `5` → display `15,234`, `selectionStart === 2`.
  - `backspace over a group separator deletes the digit before it`: `1,234` with caret at 2 (after `,`) → Backspace → `234`, caret 0.
  - `Delete before a separator deletes the digit after it`: `1,234` with caret at 1 → Delete → `134`, caret 1.
  - `rejects a second decimal`: `12.5` + `.` → unchanged, caret unchanged, no emit.
  - `rejects digits past precision`: EUR `12.34` with caret at end + `5` → unchanged; JPY `.` → unchanged.
  - `rejects "-" when not allowed, and mid-number when allowed` (Review Focus 4).
  - `allowNegative: "-" alone displays "-" and emits null; then "5" → "-5"`.
  - `de-DE numpad dot becomes the decimal`: type `1`,`2`,`.`,`5` → display `12,5`, emit `'12.5'` (Review Focus 1). With KWD, `.` is still converted (the precision rule only covers paste ambiguity) — the decimal typed via the key is always a decimal.
  - `paste parses leniently and truncates`: paste `$1,234.5678` into empty USD → `1,234.56`.
  - `trailing decimal is kept while focused`: type `12.` → display `12.`, emit `'12'`.
- [ ] **Step 2: Run** `npx vitest run src/components/MoneyInput`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - `onKeyDown`: with a collapsed selection, Backspace with a group char just before the caret → `setSelectionRange(caret-1)` and let the default run (Delete is symmetric). A `.` key in a comma-decimal locale when no decimal exists yet → `preventDefault`, then insert the locale decimal at the caret through the same change path.
  - `onChange(raw, caret)`: count the significant chars (digits, the locale decimal, `-`) in `raw.slice(0, caret)` → `n`. Reject when there is more than one decimal, more fraction digits than precision while **typing** (`raw.length === prev.length + 1`), or a `-` not at index 0 or not allowed. To reject, restore `prev` and put the caret at `caret - 1`. Otherwise `formatDraft(parseAmount(raw))` → set the display, and in `useLayoutEffect` put the caret after the `n`-th significant char of the new string. Pastes (multi-char growth) go through `parseAmount` truncation instead of rejection.
- [ ] **Step 4: Run** the tests. Expected: PASS, with Task 3's tests still green.
- [ ] **Step 5: Docs:** `docs/components/MoneyInput.md`. TL;DR + snippet (controlled `useState<MoneyValue>`), and a Field example. "When NOT to use": a currency without an amount → `CurrencySelect`; plain quantities → `Input inputMode="decimal"`. Anti-patterns: storing the formatted display; `parseFloat` for maths; comparing `amount` strings for dirtiness (`"12"` vs `"12.00"`). Known limitations: Latin digits / 3-digit grouping only. Then run `npm run build:docs` and add the AI-PRIMER line.
- [ ] **Step 6: Run** `make test` (exit 0), `make lint`, typecheck, and `node --test tools/eslint-plugin-eocrm/rules.test.mjs`.
- [ ] **Step 7: Commit** `feat(MoneyInput): caret-preserving editing + docs`.

---

### Task 5: Playground demos + wiring

**Files:**

- Create: `packages/playground/src/pages/components/MoneyInputDemo.tsx`, `CurrencySelectDemo.tsx` (pattern: `PhoneInputDemo.tsx`, imports from `@eocrm/design-system`, `?raw` via `@lib-source/*` only)
- Modify: `packages/playground/src/App.tsx` (routes `/components/money-input`, `/components/currency-select`), `src/layout/AppShell/navItems.ts` (Forms group, next to PhoneInput; pick lucide icons such as `Banknote` / `Coins`), `src/pages/components/ComponentsIndex.tsx` + `overviewSchematics.tsx` (one schematic each, blueprint-accent vocabulary, exactly one solid-accent focal element), `src/pages/mockups/registry.ts` (`'MoneyInput' | 'CurrencySelect'`)
- Regenerate: `npm run build:props` (from `packages/playground`)

Demo contents. MoneyInput: a multi-currency field, a single-currency prefix, the three `currencyDisplay` modes, JPY/KWD precision, `allowNegative`, a Field + error example, sizes, de-DE via `LocaleProvider`, and a live readout of the emitted `MoneyValue`. CurrencySelect: single + clearable, multi chips/summary, searchable (more than 7 codes) vs a short list, and display modes.

- [ ] **Step 1: Build both demos and wire the five places.**
- [ ] **Step 2: Run** `make lint`, `npm run typecheck` (root) and `make test`. Expected: all exit 0.
- [ ] **Step 3: Visual check** with the dev server on port 8090+ (`npm run dev -w playground -- --port 8090`) via Playwright: type into the de-DE example, switch currencies, and check the prefix height matches the input in all sizes. Kill the Playwright Chrome afterwards.
- [ ] **Step 4: Commit** `feat(playground): MoneyInput + CurrencySelect demos`.
- [ ] **Step 5: Stop.** Give the user the live playground link and wait for their check before the PR. The PR then goes through the `pre-push-review` skill (library variant).
