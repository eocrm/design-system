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
  isoToFlag,
  countryDisplayLabel,
  type CountryCode,
  type CountryOption,
  type CountryDisplay,
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
  /** Restrict the picker to this ISO-code subset. Defaults to all libphonenumber-js countries. An empty array is treated as all countries. */
  countries?: string[];
  /**
   * How the SELECTED country renders in the picker trigger. Default `"name"`.
   * - `"flag"` — emoji flag + code (`🇺🇸 +1`). Note: emoji flags don't render on
   *   Windows Chrome/Edge (they show the letters), so prefer `"iso"` there.
   * - `"iso"` — ISO code + code (`US +1`).
   * - `"name"` — full country name + code (`United States +1`).
   * - `"code"` — calling code only (`+1`).
   *
   * The dropdown rows always show the full country name (plus a flag in `"flag"`
   * mode) so they stay searchable + identifiable regardless of this setting.
   */
  countryDisplay?: CountryDisplay;
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
  /**
   * Accessible name when used STANDALONE (outside `<Field>`). A standalone
   * PhoneInput MUST be named via `aria-label` or `aria-labelledby`, else the
   * country/number group is unnamed. Inside `<Field>` the label is wired
   * automatically via `aria-labelledby`.
   */
  'aria-label'?: string;
  /** Ids of elements labelling the group (injected by `<Field>`; takes precedence over `aria-label`). */
  'aria-labelledby'?: string;
  /** Ids of description/error elements; forwarded to the number field so it is announced on focus (injected by `<Field>`). */
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
 *
 * @remarks Known limitations
 * - Format-as-you-type sets the caret to the end of the number field after each
 *   reformat; editing in the middle of the number bounces the caret to the end.
 * - `countries={[]}` (empty array) shows ALL countries, not none.
 */
export const PhoneInput = forwardRef<HTMLDivElement, PhoneInputProps>(function PhoneInput(
  {
    value,
    onChange,
    defaultCountry = 'US',
    countries,
    countryDisplay = 'name',
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
    () =>
      options.map((o) => ({
        value: o.iso,
        // The combobox trigger shows the option's `label` (renderValue is ignored
        // for a searchable Select), so the label IS the compact trigger format…
        label: countryDisplayLabel(o, countryDisplay),
        // …while `description` carries the full search terms (name + iso + code)
        // so filtering still matches by name even in `"code"`/`"iso"` modes.
        description: `${o.name} ${o.iso} +${o.callingCode}`,
        data: o,
      })),
    [options, countryDisplay],
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
      // {...rest} first so the component's structural ARIA contract
      // (role=group + the resolved labelledby/label) can't be clobbered.
      {...rest}
      ref={ref}
      className={clsx(styles.root, className)}
      role="group"
      aria-label={ariaLabelledby ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledby}
    >
      <Select
        className={styles.country}
        options={selectOptions}
        value={country}
        onChange={(v) => onCountryChange(Array.isArray(v) ? v[0] : v)}
        searchable
        // A phone always has a country — never offer to clear the selection.
        clearable={false}
        size={size}
        invalid={invalid}
        disabled={disabled}
        aria-label={t('phoneInput.countryLabel')}
        placeholder={t('phoneInput.countrySearch')}
        // Rows always show the full name (+ flag in `flag` mode), single-line.
        renderOption={(opt) =>
          opt.data ? (
            <span className={styles.option}>
              {countryDisplay === 'flag'
                ? `${isoToFlag(opt.data.iso)} ${opt.data.name} +${opt.data.callingCode}`
                : `${opt.data.name} +${opt.data.callingCode}`}
            </span>
          ) : (
            opt.label
          )
        }
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
        aria-describedby={ariaDescribedby}
        placeholder={t('phoneInput.numberPlaceholder')}
      />
    </div>
  );
});
