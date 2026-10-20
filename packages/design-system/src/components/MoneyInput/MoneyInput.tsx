import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type HTMLAttributes,
  type KeyboardEvent,
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
  localeSeparators,
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
const CANONICAL = /^-?\d+(\.\d+)?$/;

/** Pads a canonical amount's fraction to `prec` digits (`"13"` → `"13.00"`). */
const padCanonical = (amount: string, prec: number) => {
  const [int, frac = ''] = amount.split('.');
  return prec ? `${int}.${frac.padEnd(prec, '0')}` : int;
};

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

  const valueCurrency = value.currency;
  // Ruling B: a value currency outside `currencies` still shows in the picker (never emitted).
  const outside = isValidCurrency(valueCurrency) && !currencies.includes(valueCurrency);
  const offered = useMemo(
    () => (outside ? [...currencies, valueCurrency] : currencies),
    [outside, currencies, valueCurrency],
  );
  const single = offered.length === 1 && isValidCurrency(offered[0]);
  // Single mode shows offered[0] as a static prefix, so an invalid value.currency ('') must not
  // be emitted/posted behind it: offered[0] is the effective currency.
  const currency = single ? offered[0] : valueCurrency;
  const replaced = currency !== valueCurrency;
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (outside)
      console.warn(`<MoneyInput>: value.currency "${valueCurrency}" is not in \`currencies\`.`);
    if (replaced)
      console.warn(
        `<MoneyInput>: value.currency "${valueCurrency}" is invalid; using "${currency}".`,
      );
  }, [outside, replaced, valueCurrency, currency]);
  const precision = isValidCurrency(currency) ? currencyPrecision(currency) : FALLBACK_PRECISION;

  const malformed = value.amount !== null && !CANONICAL.test(value.amount);
  useEffect(() => {
    if (malformed && process.env.NODE_ENV !== 'production') {
      console.warn(
        `<MoneyInput>: value.amount "${value.amount}" is not a canonical decimal string.`,
      );
    }
  }, [malformed, value.amount]);

  const display = (amount: string | null, prec: number, l: string) => {
    // Malformed amounts display empty; over-precise ones display rounded. Neither is emitted.
    if (amount === null || !CANONICAL.test(amount)) return '';
    const d = canonicalToDraft(roundAmount(amount, prec));
    return d ? formatDraft(d, { locale: l, precision: prec, pad: true }) : '';
  };

  const [text, setText] = useState(() => display(value.amount, precision, loc));
  // What we last emitted/displayed for; our own echoes must not resync (and clobber typing).
  const synced = useRef({ amount: value.amount, currency, locale: loc });
  const dirty = useRef(false);
  const amountRef = useRef<HTMLInputElement>(null);

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

  // An existing sign survives edits even when negatives are off; only ADDING a '-' is rejected.
  const parse = (s: string) =>
    parseAmount(s, {
      locale: loc,
      precision,
      allowNegative: allowNegative || text.startsWith('-'),
    });

  const { group, decimal } = localeSeparators(loc);
  // Our own display: group chars are never decimals (so '1.23' after a de-DE deletion stays 123).
  const parseOwn = (s: string) => parse(s.split(group).join(''));
  const isSignificant = (c: string) => (c >= '0' && c <= '9') || c === decimal || c === '-';

  /**
   * Shared edit path. Writes the DOM value + caret directly so React's controlled-value
   * reconciliation finds nothing to change and never throws the caret to the end.
   */
  const applyEdit = (input: HTMLInputElement, raw: string, caret: number, inserted = false) => {
    const prev = text;
    const typed = !inserted && raw.length === prev.length + 1;
    const count = (str: string, c: string) => str.split(c).length - 1;
    const fracDigitsOf = (str: string) =>
      str.includes(decimal) ? str.slice(str.indexOf(decimal) + 1).replace(/\D/g, '').length : 0;
    // A digit typed inside a full fraction overwrites the next digit ('12.|00' + '5' → '12.5|0').
    if (
      typed &&
      count(raw, decimal) === 1 &&
      fracDigitsOf(raw) > precision &&
      /\d/.test(raw[caret - 1]) &&
      caret - 1 > raw.indexOf(decimal) &&
      /\d/.test(raw[caret] ?? '')
    ) {
      raw = raw.slice(0, caret) + raw.slice(caret + 1);
    }
    // Ruling D: ADDING a '-' when negatives are off rejects the edit (typed or pasted), never drops the sign.
    const unsignedOnly = !allowNegative && count(raw, '-') > count(prev, '-');
    const decimals = count(raw, decimal);
    const dash = raw.indexOf('-');
    const fracDigits = fracDigitsOf(raw);
    const reject =
      unsignedOnly ||
      (typed &&
        (decimals > 1 ||
          (decimals === 1 && fracDigits > precision) ||
          (dash !== -1 && (dash !== 0 || raw.lastIndexOf('-') !== 0))));
    if (reject) {
      // Back to where the insertion started (caret - 1 for a typed char).
      const back = Math.max(0, caret - Math.max(0, raw.length - prev.length));
      input.value = prev;
      input.setSelectionRange(back, back);
      return;
    }
    dirty.current = true;
    // `raw` is always own-locale here: pastes/drops are normalised in insertText first.
    const draft = parseOwn(raw);
    const next = draft ? formatDraft(draft, { locale: loc, precision, pad: false }) : '';
    // Caret lands after the same count of significant chars (digits, decimal, '-') it followed in `raw`.
    const before = raw.slice(0, caret);
    let n = [...before].filter(isSignificant).length;
    // formatDraft synthesizes a '0' for a missing integer part ('.' → '0.'); step over it too.
    if (draft && !draft.int && draft.frac !== null && before.includes(decimal)) n++;
    let pos = 0;
    while (n > 0 && pos < next.length) if (isSignificant(next[pos++])) n--;
    input.value = next;
    input.setSelectionRange(pos, pos);
    setText(next);
    const amount = draft ? draftToCanonical(draft) : null;
    if (amount !== synced.current.amount) emit(amount, currency);
  };

  /**
   * Paste/drop: parse ONLY the incoming segment leniently (cross-locale separators, sign forms),
   * rewrite it as own-locale plain text, splice it over the selection and run the own-locale path.
   * Own formatted text never meets the lenient parser, so a group dot can't become a decimal.
   */
  const insertText = (input: HTMLInputElement, segment: string) => {
    if (readOnly) return;
    const d = parseAmount(segment, { locale: loc, precision, allowNegative: true });
    if (!d) return;
    if (d.negative && !allowNegative && !text.startsWith('-')) return; // never drop a sign silently
    const own = (d.negative ? '-' : '') + d.int + (d.frac === null ? '' : decimal + d.frac);
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;
    const raw = text.slice(0, start) + own + text.slice(end);
    applyEdit(input, raw, start + own.length, true);
  };

  const onAmountPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    insertText(e.currentTarget, e.clipboardData.getData('text/plain'));
  };

  // ponytail: drop inserts at the current selection, not the pointer position.
  const onAmountDrop = (e: DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    insertText(e.currentTarget, e.dataTransfer.getData('text/plain'));
  };

  // Typed / deleted / cut / undo edits only: own-locale, never lenient.
  const onAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    applyEdit(input, input.value, input.selectionStart ?? input.value.length);
  };

  const onAmountKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const { selectionStart: start, selectionEnd: end, value: v } = input;
    if (readOnly || start === null || end === null) return;
    if (start === end) {
      // Step over a group separator — or a decimal with a fraction after it (deleting that would
      // scale the amount 10^n) — so the deletion hits the digit beyond it.
      const stepOver = (i: number) => v[i] === group || (v[i] === decimal && i + 1 < v.length);
      if (e.key === 'Backspace' && stepOver(start - 1))
        input.setSelectionRange(start - 1, start - 1);
      if (e.key === 'Delete' && stepOver(start)) input.setSelectionRange(start + 1, start + 1);
    }
    // Numpad '.' in a comma-decimal locale types the decimal (any precision).
    if (e.key === '.' && decimal !== '.' && !v.includes(decimal)) {
      e.preventDefault();
      applyEdit(input, v.slice(0, start) + decimal + v.slice(end), start + 1);
    }
  };

  const onBlur = () => {
    const draft = parseOwn(text);
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
    let amount = value.amount;
    if (amount !== null && CANONICAL.test(amount)) {
      amount = roundAmount(amount, prec);
      // Ruling E: unfocused → padded canonical, matching what blur would emit for the same display.
      if (document.activeElement !== amountRef.current) amount = padCanonical(amount, prec);
    }
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
      // {...rest} first so the component's structural ARIA contract
      // (role=group + the resolved labelledby/label) can't be clobbered.
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
        ref={amountRef}
        className={styles.amount}
        id={id}
        inputMode={allowNegative ? 'text' : 'decimal'}
        autoComplete="off"
        value={text}
        onChange={onAmountChange}
        onKeyDown={onAmountKeyDown}
        onPaste={onAmountPaste}
        onDrop={onAmountDrop}
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
