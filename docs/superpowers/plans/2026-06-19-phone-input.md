# PhoneInput Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `<PhoneInput>` component to `@eocrm/design-system` — a country selector + national-number field that emits **E.164**, resolving GitHub issue eocrm/design-system#176.

**Architecture:** `PhoneInput` is a _composition_ of the existing `Select` (searchable country picker) + `Input` (national number), controlled on a single `value: string | null` (E.164). Phone metadata comes from **`libphonenumber-js`** (compact `min` metadata); country **names** come from the built-in `Intl.DisplayNames` (no extra dep) and calling codes from `getCountryCallingCode`. A pure `phone.ts` module wraps all libphonenumber-js usage (so the component stays testable and the dependency is isolated). The component follows TimeField's controlled-value-with-internal-draft pattern: internal `country` + `national` state, synced from `value` via a `lastEmitted` ref so our own `onChange` echoes don't clobber in-progress typing. **No flags** — rows are "Country name +code" (cross-platform safe; the design decision recorded on the issue).

**Tech Stack:** TypeScript, React 19 (forwardRef + hooks), `libphonenumber-js` (new runtime dep), the DS `Select`/`Input`, Vitest + Testing Library, SCSS modules (tokens only).

**Issue (the spec):** eocrm/design-system#176. Resolved open questions: phone lib = `libphonenumber-js`; picker rows = name + calling code (no flags).

---

## File map

Library (`packages/design-system/`):

- `package.json` (modify) — add `libphonenumber-js` to `dependencies`.
- `src/components/PhoneInput/phone.ts` (new) — pure libphonenumber-js wrappers.
- `src/components/PhoneInput/phone.test.ts` (new).
- `src/components/PhoneInput/PhoneInput.tsx` (new) — the component.
- `src/components/PhoneInput/PhoneInput.module.scss` (new) — grid layout, tokens only.
- `src/components/PhoneInput/PhoneInput.test.tsx` (new).
- `src/components/PhoneInput/index.ts` (new) — re-exports.
- `src/index.ts` (modify) — export `PhoneInput`, types, `isValidPhone`.
- `src/i18n/{messages,en,ru}.ts` (modify) — `phoneInput` keys.
- `src/_meta/manifest.ts` + `scripts/generate-manifest.mjs` (modify) — `PhoneInput: 'Forms'`; then `npm run build:manifest`.
- `AGENTS.md` (modify) — PhoneInput TL;DR.

Playground (`packages/playground/`):

- `src/pages/components/PhoneInputDemo.tsx` (new).
- `src/App.tsx` (modify) — route.
- `src/layout/AppShell/navItems.ts` (modify) — Forms nav item.
- `src/pages/components/ComponentsIndex.tsx` (modify) — overview card.

---

## Task 1: Dependency + the pure phone engine

**Files:**

- Modify: `packages/design-system/package.json`
- Create: `packages/design-system/src/components/PhoneInput/phone.ts`
- Test: `packages/design-system/src/components/PhoneInput/phone.test.ts`

- [ ] **Step 1: Install the dependency**

Run: `cd /Users/dpws/projects/design-system && npm install libphonenumber-js@^1.13.7 -w @eocrm/design-system`
Expected: `libphonenumber-js` appears in `packages/design-system/package.json` `dependencies`. Verify it's under the **design-system** workspace, not the root or playground.

- [ ] **Step 2: Write the failing test (`phone.test.ts`)**

```ts
import { getCountryOptions, parseE164, formatNational, toE164, isValidPhone } from './phone';

describe('phone engine', () => {
  describe('getCountryOptions', () => {
    it('returns every country with a calling code, sorted by name', () => {
      const all = getCountryOptions('en');
      expect(all.length).toBeGreaterThan(200);
      const gb = all.find((c) => c.iso === 'GB');
      const us = all.find((c) => c.iso === 'US');
      expect(gb).toMatchObject({ iso: 'GB', callingCode: '44' });
      expect(us).toMatchObject({ iso: 'US', callingCode: '1' });
      expect(gb!.name.length).toBeGreaterThan(0);
      // sorted by name (ascending)
      const names = all.map((c) => c.name);
      expect([...names].sort((a, b) => a.localeCompare(b, 'en'))).toEqual(names);
    });

    it('restricts to a provided country subset', () => {
      const some = getCountryOptions('en', ['GB', 'US']);
      expect(some.map((c) => c.iso).sort()).toEqual(['GB', 'US']);
    });

    it('ignores unknown ISO codes in the subset', () => {
      const some = getCountryOptions('en', ['US', 'ZZ']);
      expect(some.map((c) => c.iso)).toEqual(['US']);
    });
  });

  describe('parseE164', () => {
    it('parses a valid E.164 into country + national', () => {
      const r = parseE164('+12025550123');
      expect(r).not.toBeNull();
      expect(r!.country).toBe('US');
      expect(r!.national).toContain('202');
    });
    it('returns null for an unparseable string', () => {
      expect(parseE164('not a phone')).toBeNull();
    });
  });

  describe('formatNational (as-you-type)', () => {
    it('formats a US national number progressively', () => {
      expect(formatNational('2025550123', 'US')).toBe('(202) 555-0123');
    });
  });

  describe('toE164', () => {
    it('produces canonical E.164 from a national input', () => {
      expect(toE164('(202) 555-0123', 'US')).toBe('+12025550123');
    });
    it('returns null for an empty input', () => {
      expect(toE164('', 'US')).toBeNull();
    });
  });

  describe('isValidPhone', () => {
    it('accepts a valid E.164 number', () => {
      expect(isValidPhone('+12025550123')).toBe(true);
    });
    it('rejects too-short, empty, and null', () => {
      expect(isValidPhone('+1202')).toBe(false);
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone(null)).toBe(false);
    });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd /Users/dpws/projects/design-system/packages/design-system && npx vitest run src/components/PhoneInput/phone.test.ts`
Expected: FAIL — module `./phone` not found.

- [ ] **Step 4: Implement `phone.ts`**

```ts
// phone.ts — pure wrappers around libphonenumber-js (compact `min` metadata) +
// Intl.DisplayNames for localized country names. The ONLY place the library
// imports libphonenumber-js, so the dependency stays isolated + testable.
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  type CountryCode,
} from 'libphonenumber-js';

export type { CountryCode };

/** One selectable country: ISO code, localized name, and calling code (no `+`). */
export interface CountryOption {
  iso: CountryCode;
  name: string;
  callingCode: string;
}

function displayNames(locale: string): Intl.DisplayNames {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  }
}

/**
 * Every supported country (or the `only` subset) as `{ iso, name, callingCode }`,
 * names localized to `locale` via `Intl.DisplayNames`, sorted by name.
 */
export function getCountryOptions(locale: string, only?: string[]): CountryOption[] {
  const display = displayNames(locale);
  const all = getCountries();
  const isos: CountryCode[] =
    only && only.length
      ? (only.filter((c) => all.includes(c as CountryCode)) as CountryCode[])
      : all;
  return isos
    .map((iso) => ({
      iso,
      name: display.of(iso) ?? iso,
      callingCode: getCountryCallingCode(iso),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

/** Parse an E.164 string into its country + national display, or null if unparseable. */
export function parseE164(
  value: string,
): { country: CountryCode | undefined; national: string } | null {
  const parsed = parsePhoneNumberFromString(value);
  if (!parsed) return null;
  return { country: parsed.country, national: parsed.formatNational() };
}

/** Format a raw national input for `country` as the user types (idempotent on a formatted string). */
export function formatNational(input: string, country: CountryCode): string {
  return new AsYouType(country).input(input);
}

/** Best-effort canonical E.164 from a raw national input + country, or null if not yet a number. */
export function toE164(input: string, country: CountryCode): string | null {
  const ayt = new AsYouType(country);
  ayt.input(input);
  const num = ayt.getNumber();
  return num ? num.number : null;
}

/** True iff `e164` is a valid phone number. Exported so a host can drive Field `invalid` chrome. */
export function isValidPhone(e164: string | null | undefined): boolean {
  if (!e164) return false;
  try {
    return isValidPhoneNumber(e164);
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd /Users/dpws/projects/design-system/packages/design-system && npx vitest run src/components/PhoneInput/phone.test.ts`
Expected: PASS. If `formatNational('2025550123','US')` differs from `'(202) 555-0123'`, run it to see libphonenumber-js's exact output and set the expected string to match (US AsYouType output is stable; do not weaken the round-trip `toE164` assertion). If `Intl.DisplayNames` is unavailable in the test runtime (older Node without full ICU), the GB/US `name` assertions use `.length > 0` so they stay robust; only the calling codes are asserted exactly.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/package.json packages/design-system/package-lock.json \
        packages/design-system/src/components/PhoneInput/phone.ts \
        packages/design-system/src/components/PhoneInput/phone.test.ts
# package-lock.json may be at the repo root — add whichever lockfile changed
git commit -m "feat(PhoneInput): add libphonenumber-js + pure phone engine"
```

(If `npm install` updated the root `package-lock.json` instead, `git add package-lock.json` at the repo root.)

---

## Task 2: The PhoneInput component

**Files:**

- Create: `packages/design-system/src/components/PhoneInput/PhoneInput.tsx`
- Create: `packages/design-system/src/components/PhoneInput/PhoneInput.module.scss`
- Create: `packages/design-system/src/components/PhoneInput/index.ts`
- Test: `packages/design-system/src/components/PhoneInput/PhoneInput.test.tsx`

- [ ] **Step 1: Write the failing test (`PhoneInput.test.tsx`)**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import { PhoneInput } from './PhoneInput';
import { I18nProvider } from '../../i18n';

function renderWith(ui: React.ReactElement) {
  return render(<I18nProvider locale="en">{ui}</I18nProvider>);
}

describe('PhoneInput', () => {
  it('renders a country combobox + a phone number field', () => {
    renderWith(<PhoneInput value={null} onChange={() => {}} defaultCountry="US" />);
    expect(screen.getByRole('combobox', { name: 'Country' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toBeInTheDocument();
  });

  it('seeds the country + national display from a controlled E.164 value', () => {
    renderWith(<PhoneInput value="+12025550123" onChange={() => {}} />);
    const number = screen.getByRole('textbox', { name: 'Phone number' }) as HTMLInputElement;
    expect(number.value).toContain('202');
  });

  it('emits E.164 as the user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Harness() {
      const [v, setV] = useState<string | null>(null);
      return (
        <PhoneInput
          value={v}
          onChange={(e164) => {
            setV(e164);
            onChange(e164);
          }}
          defaultCountry="US"
        />
      );
    }
    renderWith(<Harness />);
    const number = screen.getByRole('textbox', { name: 'Phone number' });
    await user.type(number, '2025550123');
    expect(onChange).toHaveBeenLastCalledWith('+12025550123');
  });

  it('emits null when the number field is cleared', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Harness() {
      const [v, setV] = useState<string | null>('+12025550123');
      return (
        <PhoneInput
          value={v}
          onChange={(e164) => {
            setV(e164);
            onChange(e164);
          }}
        />
      );
    }
    renderWith(<Harness />);
    const number = screen.getByRole('textbox', { name: 'Phone number' }) as HTMLInputElement;
    await user.clear(number);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('applies invalid chrome to the number field', () => {
    renderWith(<PhoneInput value={null} onChange={() => {}} invalid />);
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('disables both controls', () => {
    renderWith(<PhoneInput value={null} onChange={() => {}} disabled />);
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toBeDisabled();
  });

  it('forwards ref to the root group and merges className', () => {
    const ref = { current: null as HTMLDivElement | null };
    const { container } = renderWith(
      <PhoneInput ref={ref} value={null} onChange={() => {}} className="custom" />,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(container.querySelector('.custom')).not.toBeNull();
  });

  it('exposes a group labelled by an injected aria-labelledby (Field integration)', () => {
    renderWith(
      <>
        <span id="lbl">Mobile</span>
        <PhoneInput value={null} onChange={() => {}} aria-labelledby="lbl" />
      </>,
    );
    expect(screen.getByRole('group', { name: 'Mobile' })).toBeInTheDocument();
  });
});
```

(`Select` renders its trigger with `role="combobox"`; if the actual role differs, adjust the query — run the first test and read the DOM. The `name` comes from `aria-label`.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/dpws/projects/design-system/packages/design-system && npx vitest run src/components/PhoneInput/PhoneInput.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `PhoneInput.tsx`**

```tsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
} from 'react';
import clsx from 'clsx';
import { Select, type SelectOption } from '../Select';
import { Input } from '../Input';
import { useTranslation } from '../../i18n';
import {
  getCountryOptions,
  parseE164,
  formatNational,
  toE164,
  type CountryCode,
  type CountryOption,
} from './phone';
import styles from './PhoneInput.module.scss';

/** PhoneInput size — passed through to the inner Select + Input. */
export type PhoneInputSize = 'sm' | 'md' | 'lg';

export interface PhoneInputProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /** Controlled E.164 value (e.g. `"+442071838750"`); `null` = empty. */
  value: string | null;
  /** Fires with canonical E.164 on every edit; `null` when empty. */
  onChange: (e164: string | null) => void;
  /** ISO 3166-1 alpha-2 country used to seed the picker when `value` is empty. Default `"US"`. */
  defaultCountry?: string;
  /** Restrict the picker to this ISO-code subset. Defaults to all libphonenumber-js countries. */
  countries?: string[];
  /** Control size, forwarded to the Select + Input. Default `"md"`. */
  size?: PhoneInputSize;
  /** Error chrome on both controls (host/Field-driven). */
  invalid?: boolean;
  /** Disable both controls. */
  disabled?: boolean;
  /** Mark required (forwarded for Field semantics). */
  required?: boolean;
  /** BCP-47 locale for country-name localization. Defaults to the i18n locale, else `"en"`. */
  locale?: string;
  /** Stable id; placed on the number field so an external `<label htmlFor>` focuses it. */
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

const FALLBACK_COUNTRY = 'US' as CountryCode;

function seedCountry(value: string | null, defaultCountry: string): CountryCode {
  if (value) {
    const parsed = parseE164(value);
    if (parsed?.country) return parsed.country;
  }
  return (defaultCountry || FALLBACK_COUNTRY) as CountryCode;
}

function seedNational(value: string | null): string {
  if (!value) return '';
  const parsed = parseE164(value);
  return parsed ? parsed.national : value;
}

/**
 * International phone field — a searchable country picker (DS `Select`) plus a
 * national-number field (DS `Input`) that emits **E.164**. Controlled on a single
 * `value: string | null`; country + formatting are derived internally. Country
 * names are localized via `Intl.DisplayNames`; metadata + validation come from
 * `libphonenumber-js`.
 *
 * @example
 * const [phone, setPhone] = useState<string | null>(null);
 * <PhoneInput value={phone} onChange={setPhone} defaultCountry="GB" />
 *
 * @example
 * // Inside a Field (label + error wiring injected automatically):
 * <Field label="Mobile" error={isValidPhone(phone) ? undefined : 'Invalid number'}>
 *   <PhoneInput value={phone} onChange={setPhone} />
 * </Field>
 *
 * @remarks When NOT to use
 * - A non-phone numeric field → `<Input type="tel">` or `<Input inputMode="numeric">`.
 *
 * @remarks Anti-patterns
 * - ❌ Treating it as uncontrolled — feed `onChange`'s E.164 back into `value`.
 * - ❌ Storing the formatted national string — persist the emitted **E.164**; the
 *   display is reconstructed from it.
 * - ❌ Validating by hand — call the exported `isValidPhone(e164)` and pass
 *   `invalid` (or wire it through `<Field error>`).
 */
export const PhoneInput = forwardRef<HTMLDivElement, PhoneInputProps>(function PhoneInput(
  {
    value,
    onChange,
    defaultCountry = 'US',
    countries,
    size = 'md',
    invalid,
    disabled,
    required,
    locale,
    id,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
    className,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const resolvedLocale = locale ?? 'en';

  const options = useMemo<CountryOption[]>(
    () => getCountryOptions(resolvedLocale, countries),
    [resolvedLocale, countries],
  );
  const selectOptions = useMemo<SelectOption<CountryOption>[]>(
    () => options.map((o) => ({ value: o.iso, label: `${o.name} +${o.callingCode}`, data: o })),
    [options],
  );

  const [country, setCountry] = useState<CountryCode>(() => seedCountry(value, defaultCountry));
  const [national, setNational] = useState<string>(() => seedNational(value));
  // Track what we last emitted so our own onChange echoes don't resync (and clobber typing).
  const lastEmitted = useRef<string | null>(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    if (!value) {
      setNational('');
      return;
    }
    const parsed = parseE164(value);
    if (parsed) {
      if (parsed.country) setCountry(parsed.country);
      setNational(parsed.national);
    } else {
      setNational(value);
    }
  }, [value]);

  const emit = useCallback(
    (rawNational: string, ctry: CountryCode) => {
      const e164 = toE164(rawNational, ctry);
      lastEmitted.current = e164;
      onChange(e164);
    },
    [onChange],
  );

  const onNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatNational(e.target.value, country);
      setNational(formatted);
      emit(formatted, country);
    },
    [country, emit],
  );

  const onCountryChange = useCallback(
    (next: string) => {
      const c = next as CountryCode;
      setCountry(c);
      const reformatted = formatNational(national, c);
      setNational(reformatted);
      emit(reformatted, c);
    },
    [national, emit],
  );

  return (
    <div
      {...rest}
      ref={ref}
      className={clsx(styles.root, className)}
      role="group"
      aria-label={ariaLabelledby ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
    >
      <Select
        className={styles.country}
        options={selectOptions}
        value={country}
        onChange={(v) => onCountryChange(Array.isArray(v) ? v[0] : v)}
        searchable
        size={size}
        invalid={invalid}
        disabled={disabled}
        aria-label={t('phoneInput.countryLabel')}
        placeholder={t('phoneInput.countrySearch')}
        renderValue={(opt) => (opt.data ? `${opt.data.iso} +${opt.data.callingCode}` : opt.label)}
      />
      <Input
        className={styles.number}
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={national}
        onChange={onNumberChange}
        size={size}
        invalid={invalid}
        disabled={disabled}
        required={required}
        aria-label={t('phoneInput.numberLabel')}
        placeholder={t('phoneInput.numberPlaceholder')}
      />
    </div>
  );
});
```

(If `Select`'s `onChange` value param or `renderValue` signature differs from the recon — single value is `string`, `renderValue(opt)` — adjust the call. `renderValue` receives a `SelectOption<CountryOption>`, so `opt.data` is the `CountryOption`.)

- [ ] **Step 4: Implement `PhoneInput.module.scss`** (tokens only; grid avoids the forbidden `flex-grow`)

```scss
.root {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: var(--space-1);
  align-items: center;
}

.country {
  // keep the country trigger compact so the number field gets the room
  max-width: var(--size-control-country, 8rem);
}

.number {
  width: 100%;
}
```

(Verify `--space-1` exists — it does. For the country max-width, prefer an existing sizing token; if `--size-control-country` doesn't exist, use an existing token of ~8rem or add one to `tokens.scss` with a comment. Do NOT use a raw value — stylelint `scale-unlimited/declaration-strict-value` will reject it. `max-width` and `width: 100%` are allowed by Rule 4; `grid-template-columns`/`max-content`/`minmax`/`1fr` are layout keywords, not raw values. Run `npx stylelint` on the file.)

- [ ] **Step 5: Implement `index.ts`**

```ts
export { PhoneInput } from './PhoneInput';
export type { PhoneInputProps, PhoneInputSize } from './PhoneInput';
export { isValidPhone } from './phone';
export type { CountryOption, CountryCode } from './phone';
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd /Users/dpws/projects/design-system/packages/design-system && npx vitest run src/components/PhoneInput/`
Expected: PASS. Debug any role/name mismatch by reading the rendered DOM (the `Select` trigger's role + the inner Input's accessible name). The i18n keys (`phoneInput.*`) are added in Task 3 — until then the test will throw on the missing key; **do Task 3 before re-running this**, or temporarily expect the keys. (Recommended: implement Task 3's i18n keys first if the test fails on a missing translation, then return here.)

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/PhoneInput/PhoneInput.tsx \
        packages/design-system/src/components/PhoneInput/PhoneInput.module.scss \
        packages/design-system/src/components/PhoneInput/index.ts \
        packages/design-system/src/components/PhoneInput/PhoneInput.test.tsx
git commit -m "feat(PhoneInput): country picker + national-number field emitting E.164"
```

---

## Task 3: i18n keys

**Files:**

- Modify: `packages/design-system/src/i18n/messages.ts`
- Modify: `packages/design-system/src/i18n/en.ts`
- Modify: `packages/design-system/src/i18n/ru.ts`

> Do this BEFORE re-running Task 2's component tests if they fail on a missing `phoneInput.*` key.

- [ ] **Step 1: Add the `phoneInput` group to the `Messages` interface** (`messages.ts`, alongside the other component groups, e.g. after `select`)

```ts
phoneInput: {
  /** aria-label for the country picker Select. */
  countryLabel: string;
  /** Search placeholder inside the country picker. */
  countrySearch: string;
  /** aria-label for the national-number Input. */
  numberLabel: string;
  /** Placeholder in the national-number Input. */
  numberPlaceholder: string;
}
```

- [ ] **Step 2: Add English values** (`en.ts`, same position)

```ts
  phoneInput: {
    countryLabel: 'Country',
    countrySearch: 'Search countries…',
    numberLabel: 'Phone number',
    numberPlaceholder: 'Phone number',
  },
```

- [ ] **Step 3: Add Russian values** (`ru.ts`, same position)

```ts
  phoneInput: {
    countryLabel: 'Страна',
    countrySearch: 'Поиск стран…',
    numberLabel: 'Номер телефона',
    numberPlaceholder: 'Номер телефона',
  },
```

- [ ] **Step 4: Typecheck + the PhoneInput tests**

Run: `cd /Users/dpws/projects/design-system/packages/design-system && npx tsc --noEmit && npx vitest run src/components/PhoneInput/`
Expected: `tsc` clean (both locales satisfy `Messages`); PhoneInput tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/i18n/messages.ts packages/design-system/src/i18n/en.ts packages/design-system/src/i18n/ru.ts
git commit -m "feat(PhoneInput): i18n keys (en + ru)"
```

---

## Task 4: Exports + manifest

**Files:**

- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/src/_meta/manifest.ts`
- Modify: `packages/design-system/scripts/generate-manifest.mjs`

- [ ] **Step 1: Export from `src/index.ts`** (Forms section, alphabetical — near `PasswordStrengthMeter`/`Radio`)

```ts
export { PhoneInput, isValidPhone } from './components/PhoneInput';
export type {
  PhoneInputProps,
  PhoneInputSize,
  CountryOption,
  CountryCode,
} from './components/PhoneInput';
```

- [ ] **Step 2: Add the CLUSTERS entry to BOTH manifest sources**

In `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs`, add to the `CLUSTERS` map (keep alphabetical with neighbors):

```ts
  PhoneInput: 'Forms',
```

- [ ] **Step 3: Regenerate the manifest**

Run: `cd /Users/dpws/projects/design-system/packages/design-system && npm run build:manifest`
Expected: `src/components.manifest.json` updates with a `PhoneInput` entry: `tier: "composition"`, `cluster: "Forms"`, `composes: ["Input","Select"]`, plus `PhoneInput` added to `Input`'s and `Select`'s `composedBy`.

- [ ] **Step 4: Verify the manifest drift test + typecheck**

Run: `cd /Users/dpws/projects/design-system/packages/design-system && npx vitest run src/_meta/manifest.test.ts && npx tsc --noEmit`
Expected: PASS (committed JSON matches the generator; types clean).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/index.ts packages/design-system/src/_meta/manifest.ts \
        packages/design-system/scripts/generate-manifest.mjs packages/design-system/src/components.manifest.json
git commit -m "feat(PhoneInput): export + manifest (Forms cluster)"
```

---

## Task 5: Playground demo + wiring

**Files:**

- Create: `packages/playground/src/pages/components/PhoneInputDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/navItems.ts`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`

- [ ] **Step 1: Create the demo page** (`PhoneInputDemo.tsx`)

```tsx
import { useState } from 'react';
import { PhoneInput, isValidPhone, Stack, Text, Code, Field } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function PhoneInputDemo() {
  const [phone, setPhone] = useState<string | null>(null);
  const [gb, setGb] = useState<string | null>('+442071838750');

  return (
    <DemoLayout
      name="PhoneInput"
      componentName="PhoneInput"
      description="International phone field — searchable country picker + national-number input emitting E.164. Country names via Intl.DisplayNames; metadata + validation via libphonenumber-js."
      files={getComponentFiles('PhoneInput')}
    >
      <Example
        title="Default (US)"
        description="Pick a country and type a number. The component emits canonical E.164; the display reconstructs from it."
        code={`const [phone, setPhone] = useState<string | null>(null);
<PhoneInput value={phone} onChange={setPhone} defaultCountry="US" />`}
      >
        <Stack gap="sm">
          <PhoneInput value={phone} onChange={setPhone} defaultCountry="US" />
          <Text size="sm" tone="muted">
            E.164 → <Code>{phone ?? 'null'}</Code> · valid:{' '}
            <Code>{String(isValidPhone(phone))}</Code>
          </Text>
        </Stack>
      </Example>

      <Example
        title="Seeded from an existing E.164 value"
        description="Pass an E.164 string and the picker + number field reconstruct from it (here a UK number)."
        code={`<PhoneInput value="+442071838750" onChange={setGb} />`}
      >
        <PhoneInput value={gb} onChange={setGb} />
      </Example>

      <Example
        title="Inside a Field (label + validation)"
        description="Field injects the label association; drive invalid chrome via isValidPhone."
        code={`<Field label="Mobile" error={isValidPhone(phone) ? undefined : 'Enter a valid number'}>
  <PhoneInput value={phone} onChange={setPhone} />
</Field>`}
      >
        <Field
          label="Mobile"
          error={phone && !isValidPhone(phone) ? 'Enter a valid number' : undefined}
        >
          <PhoneInput value={phone} onChange={setPhone} />
        </Field>
      </Example>

      <Example
        title="Disabled"
        description="Both controls disabled."
        code={`<PhoneInput value="+12025550123" onChange={() => {}} disabled />`}
      >
        <PhoneInput value="+12025550123" onChange={() => {}} disabled />
      </Example>
    </DemoLayout>
  );
}
```

(Confirm `Field` accepts `error` + `label` per its API; if the prop names differ, match Field's real props — check `FieldProps`. If `Field` auto-clones, PhoneInput is its single child as shown.)

- [ ] **Step 2: Wire the route** (`App.tsx`) — add the import with the other Forms demos and a route:

```tsx
import { PhoneInputDemo } from './pages/components/PhoneInputDemo';
// ...inside <Routes>:
<Route path="/components/phone-input" element={<PhoneInputDemo />} />;
```

- [ ] **Step 3: Wire the nav** (`layout/AppShell/navItems.ts`) — add to the **Forms** group's `items` (alphabetical, near PasswordStrengthMeter/Radio), importing a `lucide-react` icon (e.g. `Phone`):

```ts
{ to: '/components/phone-input', label: 'PhoneInput', icon: Phone, end: false },
```

(Add `Phone` to the existing `lucide-react` import. If the nav lives in `AppShell.tsx` rather than `navItems.ts`, edit there — open the file to confirm.)

- [ ] **Step 4: Wire the overview card** (`pages/components/ComponentsIndex.tsx`) — add to the `CARDS` array (alphabetical), importing `PhoneInput`:

```tsx
{
  to: '/components/phone-input',
  name: 'PhoneInput',
  description: 'International phone field — country picker + national number, emitting E.164.',
  preview: <PhoneInput value="+12025550123" onChange={() => {}} aria-label="Preview" />,
},
```

- [ ] **Step 5: Verify the playground builds**

Run: `cd /Users/dpws/projects/design-system && make build` (typecheck + bundle the playground)
Expected: build succeeds; no missing-import/type errors.

- [ ] **Step 6: Commit**

```bash
git add packages/playground/src/pages/components/PhoneInputDemo.tsx packages/playground/src/App.tsx \
        packages/playground/src/layout/AppShell/navItems.ts packages/playground/src/pages/components/ComponentsIndex.tsx
git commit -m "feat(PhoneInput): playground demo + nav/route/overview wiring"
```

---

## Task 6: AGENTS.md TL;DR

**Files:**

- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Add a PhoneInput section** in the Forms area of `AGENTS.md`:

````md
### `<PhoneInput>`

International phone field: searchable country picker (DS `Select`) + national-number `Input`, controlled on a single `value: string | null` (**E.164**), `onChange(e164 | null)`. `defaultCountry` (ISO alpha-2) seeds the picker when empty; `countries` restricts the list; `size`/`invalid`/`disabled` pass through. Country names are localized via `Intl.DisplayNames`; metadata/validation via `libphonenumber-js`. Validate with the exported `isValidPhone(e164)` and drive `invalid` (or wrap in `<Field error>`). Rows show "Country name +code" (no flags). Store the emitted E.164, not the formatted display.

```tsx
const [phone, setPhone] = useState<string | null>(null);
<PhoneInput value={phone} onChange={setPhone} defaultCountry="GB" />;
```
````

````

- [ ] **Step 2: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "docs(PhoneInput): AGENTS.md TL;DR"
````

---

## Task 7: Full gates + packaging check

- [ ] **Step 1: Run every gate from the repo root**

```bash
cd /Users/dpws/projects/design-system
make test && make build-lib && make lint && npm run format:check
npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'   # expect 0
```

Expected: all PASS; the tarball grep prints `0`. If `format:check` flags files, `npx prettier --write` them and re-stage. If the manifest test complains, re-run `npm run build:manifest` and commit the JSON.

- [ ] **Step 2: Confirm `libphonenumber-js` ships as a declared dependency** (so consumers resolve it)

Run: `node -e "console.log(require('./packages/design-system/package.json').dependencies['libphonenumber-js'])"`
Expected: a version range prints (not `undefined`).

- [ ] **Step 3: Commit any gate fixups**, if needed.

---

## Self-review notes

- **Issue coverage (#176):** `value`/`onChange` E.164 (T2) · `defaultCountry` (T2) · `invalid`/`disabled` (T2) · `aria-label` (T2) · `countries` subset (T1 `getCountryOptions` + T2) · searchable country picker with name + calling code (T2 Select) · format-as-you-type (T2 `formatNational`/AsYouType) · E.164 output + `null` on empty (T2 `emit`/`toE164`) · validity exposed (`isValidPhone` exported, T1/T4) · Field integration (T2 role=group + injected aria + invalid).
- **Core invariant:** tests beside component (T1/T2) · demo + 3-place wiring (T5) · `src/index.ts` export (T4) · JSDoc `@remarks` anti-patterns (T2) · AGENTS.md TL;DR (T6) · manifest CLUSTERS in both maps + regenerate (T4).
- **Dependency policy:** `libphonenumber-js` is a non-UI metadata/parsing lib (not a component lib); it's the explicit, user-approved choice for #176 and isolated entirely behind `phone.ts`.
- **Type consistency:** `CountryCode`/`CountryOption` defined once in `phone.ts` (T1), consumed by the component (T2), re-exported (T4). `PhoneInputSize` = `'sm'|'md'|'lg'` matches the Select/Input size unions.
- **Known v1 limitation:** format-as-you-type sets the caret to end after reformatting (standard AsYouType behavior) — acceptable; note for the browser pass. Country names depend on `Intl.DisplayNames` (full-ICU Node/modern browsers); falls back to the ISO code if unavailable.
- **Layout (Rule 4):** root uses `display:grid` + `grid-template-columns: max-content minmax(0,1fr)` (no `flex-grow`/`margin`/`position`); `width:100%` + `max-width` are permitted.
