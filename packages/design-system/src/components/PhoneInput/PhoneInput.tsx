import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
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
  formatPhoneDisplay,
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
  /**
   * Controlled value; `null` = empty.
   * - Picker mode (default): E.164 (e.g. `"+442071838750"`).
   * - `picker={false}`: the raw string as typed/stored (e.g. `"020 7183 8750"` or `"+1 202…"`).
   */
  value: string | null;
  /**
   * Fires on every edit; `null` when empty.
   * - Picker mode (default): canonical E.164, or `null` while the number is still partial.
   * - `picker={false}`: the RAW string exactly as typed (untrimmed, no E.164 forcing),
   *   or `null` when empty/whitespace-only. Normalise to E.164 server-side.
   */
  onChange: (value: string | null) => void;
  /**
   * Show the country picker. Default `true`.
   * - `true` — searchable country picker + national number input; emits E.164.
   * - `false` — ONE plain `type="tel"` input; emits the raw string (see `onChange`).
   *   A value starting with `+` is international, anything else is read in
   *   `defaultCountry`. While focused the raw value shows; when blurred it is
   *   formatted — national for `defaultCountry` numbers, international otherwise.
   *   `countries`, `countryDisplay` and `countryLabel` are ignored, and the root
   *   `<div>` has no `role="group"` (labels go straight to the input).
   */
  picker?: boolean;
  /** ISO 3166-1 alpha-2 country used to seed the picker when `value` is empty (with `picker={false}`: the country a number without `+` is read in, and the one shown in national format). Default `"US"`. */
  defaultCountry?: string;
  /** Restrict the picker to this ISO-code subset. Defaults to all libphonenumber-js countries. An empty array is treated as all countries. Ignored with `picker={false}`. */
  countries?: string[];
  /**
   * How the SELECTED country renders in the picker trigger. Default `"code"`.
   * - `"code"` — calling code only (`+1`).
   * - `"iso"` — ISO code + code (`US +1`).
   * - `"name"` — full country name + code (`United States +1`).
   * - `"flag"` — emoji flag + code (`🇺🇸 +1`). Note: emoji flags don't render on
   *   Windows Chrome/Edge (they show the letters), so prefer `"iso"` there.
   *
   * The dropdown rows always show the full country name + code (plus a flag in
   * `"flag"` mode) so they stay searchable + identifiable regardless of this.
   * Ignored with `picker={false}`.
   */
  countryDisplay?: CountryDisplay;
  /**
   * Overrides the country picker's full accessible name. By default the picker
   * is named after the group — "<group label> Country" (e.g. "Phone Country") —
   * so it never collides with a form's own Country field; with no group label
   * it is just "Country". Set this when that composed name reads badly.
   * Ignored with `picker={false}`.
   */
  countryLabel?: string;
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

/** Picker mode: country Select + national Input, emits E.164. */
const PickerPhoneInput = forwardRef<HTMLDivElement, PhoneInputProps>(function PickerPhoneInput(
  {
    picker: _picker,
    value,
    onChange,
    defaultCountry = 'US',
    countries,
    countryDisplay = 'code',
    countryLabel,
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
  const countryWordId = `${useId()}-country`;
  // Picker name, derived from the group's so two "Country" comboboxes in one
  // form stay distinguishable (#638). labelledby wins, mirroring the group.
  const countryWord = t('phoneInput.countryLabel');
  const countryNaming = countryLabel
    ? { 'aria-label': countryLabel }
    : ariaLabelledby
      ? { 'aria-labelledby': `${ariaLabelledby} ${countryWordId}` }
      : { 'aria-label': ariaLabel ? `${ariaLabel} ${countryWord}` : countryWord };

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
      {/* `hidden` keeps it out of reading order; aria-labelledby still reads it. */}
      <span id={countryWordId} hidden>
        {countryWord}
      </span>
      <Select
        className={styles.country}
        options={selectOptions}
        value={country}
        onChange={(v) => onCountryChange(Array.isArray(v) ? v[0] : v)}
        searchable
        // A phone always has a country — never offer to clear the selection.
        clearable={false}
        // Highlight the trigger text on open so the user can type to search.
        selectOnOpen
        size={size}
        invalid={invalid}
        disabled={disabled}
        {...countryNaming}
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

/** Plain mode: one tel Input, emits the raw string; formatted for display while blurred. */
const PlainPhoneInput = forwardRef<HTMLDivElement, PhoneInputProps>(function PlainPhoneInput(
  {
    picker: _picker,
    countries: _countries,
    countryDisplay: _countryDisplay,
    countryLabel: _countryLabel,
    locale: _locale,
    value,
    onChange,
    defaultCountry = 'US',
    size = 'md',
    invalid,
    disabled,
    required,
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
  const [focused, setFocused] = useState(false);
  const raw = value ?? '';
  return (
    // No root class / role=group: one control, so labels and state go on the input.
    <div {...rest} ref={ref} className={className}>
      <Input
        className={styles.number}
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={focused ? raw : formatPhoneDisplay(raw, defaultCountry)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value.trim() ? e.target.value : null)}
        size={size}
        invalid={invalid}
        disabled={disabled}
        required={required}
        aria-label={ariaLabelledby ? undefined : ariaLabel || t('phoneInput.numberLabel')}
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
        placeholder={t('phoneInput.numberPlaceholder')}
      />
    </div>
  );
});

/**
 * Phone field: a country picker plus national input that emits E.164, or (`picker={false}`) one plain tel input that emits the raw string.
 * @see docs/components/PhoneInput.md
 */
export const PhoneInput = forwardRef<HTMLDivElement, PhoneInputProps>(
  function PhoneInput(props, ref) {
    return props.picker === false ? (
      <PlainPhoneInput {...props} ref={ref} />
    ) : (
      <PickerPhoneInput {...props} ref={ref} />
    );
  },
);
