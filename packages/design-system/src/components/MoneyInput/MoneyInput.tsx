import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
} from 'react';
import clsx from 'clsx';
import { CurrencySelect } from '../CurrencySelect';
import { Input } from '../Input';
import { useLocale, useTranslation } from '../../i18n';
import {
  canonicalToDraft,
  currencyDisplayText,
  currencyName,
  currencyPrecision,
  draftToCanonical,
  formatDraft,
  isValidCurrency,
  parseAmount,
  roundAmount,
  type AmountDraft,
  type CurrencyDisplay,
} from '../_internal/currency';
import styles from './MoneyInput.module.scss';

/** MoneyInput size — passed through to the picker + Input. */
export type MoneyInputSize = 'sm' | 'md' | 'lg';

/** `amount` is a canonical decimal string (`"1234.50"`, `"-3"`), never a JS number; `null` = empty. */
export interface MoneyValue {
  amount: string | null;
  currency: string;
}

export interface MoneyInputProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /** Controlled value. `amount` is a canonical decimal string or `null`; `currency` an ISO 4217 code. */
  value: MoneyValue;
  /** Fires on every amount edit and currency switch. Never fires for blur-without-edit or external value changes. */
  onChange: (value: MoneyValue) => void;
  /** ISO 4217 codes to offer. Exactly one renders a static prefix instead of a picker. */
  currencies: string[];
  /** How the selected currency renders: `"code"` (default), `"symbol"` or `"both"`. */
  currencyDisplay?: CurrencyDisplay;
  /** Overrides the currency picker's accessible name (default: "<group label> Currency"). */
  currencyLabel?: string;
  /** Allow a leading minus. Default `false`. */
  allowNegative?: boolean;
  /** BCP-47 locale for separators and currency names. Defaults to the i18n locale. */
  locale?: string;
  /** Control size, forwarded to both controls. Default `"md"`. */
  size?: MoneyInputSize;
  /** Error chrome on both controls. */
  invalid?: boolean;
  /** Disable both controls. */
  disabled?: boolean;
  /** Make both controls read-only. */
  readOnly?: boolean;
  /** Mark the amount required. */
  required?: boolean;
  /** Placeholder for the amount field. */
  placeholder?: string;
  /** Emits hidden `<name>` (canonical amount) and `<name>_currency` inputs for native form posts. */
  name?: string;
  /** Stable id; placed on the amount field so an external `<label htmlFor>` focuses it. */
  id?: string;
  /** Accessible name when used STANDALONE (outside `<Field>`). */
  'aria-label'?: string;
  /** Ids of elements labelling the group (injected by `<Field>`). */
  'aria-labelledby'?: string;
  /** Ids of description/error elements; forwarded to the amount field (injected by `<Field>`). */
  'aria-describedby'?: string;
}

const FALLBACK_PRECISION = 2;

/**
 * Money field: a currency picker plus a formatted decimal-string amount.
 * @see docs/components/MoneyInput.md
 */
export const MoneyInput = forwardRef<HTMLDivElement, MoneyInputProps>(function MoneyInput(
  {
    value,
    onChange,
    currencies,
    currencyDisplay = 'code',
    currencyLabel,
    allowNegative = false,
    locale,
    size = 'md',
    invalid,
    disabled,
    readOnly,
    required,
    placeholder,
    name,
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
  const appLocale = useLocale();
  const loc = locale ?? appLocale;
  const uid = useId();
  const currencyWordId = `${uid}-currency`;
  const nameId = `${uid}-name`;

  const { currency } = value;
  const precision = isValidCurrency(currency) ? currencyPrecision(currency) : FALLBACK_PRECISION;

  // Ruling B: a value currency outside `currencies` still shows in the picker (never emitted).
  const offered = useMemo(() => {
    if (!isValidCurrency(currency) || currencies.includes(currency)) return currencies;
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`<MoneyInput>: value.currency "${currency}" is not in \`currencies\`.`);
    }
    return [...currencies, currency];
  }, [currencies, currency]);
  const single = offered.length === 1 && isValidCurrency(offered[0]);

  const display = (amount: string | null, prec: number, l: string) => {
    const d = canonicalToDraft(amount);
    return d ? formatDraft(d, { locale: l, precision: prec, pad: true }) : '';
  };

  const [text, setText] = useState(() => display(value.amount, precision, loc));
  // What we last emitted/displayed for; our own echoes must not resync (and clobber typing).
  const synced = useRef({ amount: value.amount, currency, locale: loc });
  const dirty = useRef(false);

  useEffect(() => {
    const s = synced.current;
    if (s.amount === value.amount && s.currency === currency && s.locale === loc) return;
    synced.current = { amount: value.amount, currency, locale: loc };
    setText(display(value.amount, precision, loc));
  }, [value.amount, currency, loc, precision]);

  const emit = (amount: string | null, cur: string) => {
    synced.current = { amount, currency: cur, locale: loc };
    onChange({ amount, currency: cur });
  };

  const parse = (s: string) => parseAmount(s, { locale: loc, precision, allowNegative });

  const onAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    dirty.current = true;
    const draft = parse(e.target.value);
    // Caret goes to the end: React moves it when the controlled value differs.
    setText(draft ? formatDraft(draft, { locale: loc, precision, pad: false }) : '');
    const amount = draft ? draftToCanonical(draft) : null;
    if (amount !== synced.current.amount) emit(amount, currency);
  };

  const onBlur = () => {
    const draft = parse(text);
    const canonical = draft ? draftToCanonical(draft) : null;
    if (!draft || canonical === null) {
      setText('');
      return;
    }
    const padded: AmountDraft = {
      ...draft,
      frac: precision ? (draft.frac ?? '').padEnd(precision, '0') : null,
    };
    setText(formatDraft(padded, { locale: loc, precision, pad: true }));
    const amount = draftToCanonical(padded);
    if (dirty.current && amount !== synced.current.amount) emit(amount, currency);
  };

  const onCurrencyChange = (code: string | null) => {
    if (!code) return;
    const prec = currencyPrecision(code);
    const amount = value.amount === null ? null : roundAmount(value.amount, prec);
    setText(display(amount, prec, loc));
    emit(amount, code);
  };

  const currencyWord = t('moneyInput.currencyLabel');
  const currencyNaming = currencyLabel
    ? { 'aria-label': currencyLabel }
    : ariaLabelledby
      ? { 'aria-labelledby': `${ariaLabelledby} ${currencyWordId}` }
      : { 'aria-label': ariaLabel ? `${ariaLabel} ${currencyWord}` : currencyWord };

  const describedBy = [ariaDescribedby, single ? nameId : undefined].filter(Boolean).join(' ');

  return (
    <div
      {...rest}
      ref={ref}
      className={clsx(styles.root, className)}
      role="group"
      aria-label={ariaLabelledby ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledby}
    >
      <span id={currencyWordId} hidden>
        {currencyWord}
      </span>
      {single ? (
        <>
          <span
            aria-hidden="true"
            className={clsx(
              styles.prefix,
              styles[`prefix-${size}`],
              invalid && styles['prefix-invalid'],
              disabled && styles['prefix-disabled'],
            )}
          >
            {currencyDisplayText(offered[0], currencyDisplay, loc)}
          </span>
          <span id={nameId} hidden>
            {currencyName(offered[0], loc)}
          </span>
        </>
      ) : (
        <CurrencySelect
          className={styles.currency}
          currencies={offered}
          currencyDisplay={currencyDisplay}
          locale={loc}
          value={currency}
          onChange={onCurrencyChange}
          clearable={false}
          selectOnOpen
          size={size}
          invalid={invalid}
          disabled={disabled}
          readOnly={readOnly}
          {...currencyNaming}
          placeholder={t('currencySelect.search')}
        />
      )}
      <Input
        className={styles.amount}
        id={id}
        inputMode={allowNegative ? 'text' : 'decimal'}
        autoComplete="off"
        value={text}
        onChange={onAmountChange}
        onFocus={() => {
          dirty.current = false;
        }}
        onBlur={onBlur}
        size={size}
        invalid={invalid}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        aria-label={t('moneyInput.amountLabel')}
        aria-describedby={describedBy || undefined}
        placeholder={placeholder}
      />
      {name && (
        <>
          <input type="hidden" name={name} value={value.amount ?? ''} />
          <input type="hidden" name={`${name}_currency`} value={currency} />
        </>
      )}
    </div>
  );
});
