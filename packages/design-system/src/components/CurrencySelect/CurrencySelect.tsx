import { forwardRef, useEffect, useMemo, type HTMLAttributes } from 'react';
import { Select, type SelectOption, type SelectProps } from '../Select';
import { useLocale, useTranslation } from '../../i18n';
import {
  currencyDisplayText,
  currencyName,
  currencySymbol,
  isValidCurrency,
  type CurrencyDisplay,
} from '../_internal/currency';
import styles from './CurrencySelect.module.scss';

type Passthrough = Pick<
  SelectProps,
  | 'size'
  | 'invalid'
  | 'disabled'
  | 'readOnly'
  | 'required'
  | 'name'
  | 'form'
  | 'placeholder'
  | 'clearable'
  | 'open'
  | 'defaultOpen'
  | 'onOpenChange'
  | 'id'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-describedby'
  | 'selectOnOpen'
>;

interface CurrencySelectCommon
  extends Passthrough, Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** ISO 4217 codes to offer, in display order (e.g. `['USD', 'EUR']`). Required; there is no "all currencies" default. Invalid codes are dropped with a dev warning. */
  currencies: string[];
  /**
   * How the SELECTED currency renders in the trigger. Default `"code"`.
   * - `"code"` — `EUR`.
   * - `"symbol"` — `€`.
   * - `"both"` — `EUR €`.
   *
   * Dropdown rows always read `CODE — Name` so they stay identifiable and searchable.
   */
  currencyDisplay?: CurrencyDisplay;
  /** BCP-47 locale for currency names and symbols. Defaults to the active i18n locale (`useLocale()`). */
  locale?: string;
  /** Show a search input. Default: on when more than 7 currencies are offered. */
  searchable?: boolean;
}

export type CurrencySelectProps =
  | (CurrencySelectCommon & {
      /** Single mode (default). */
      multiple?: false;
      /** Controlled ISO code; `null` = nothing selected. */
      value: string | null;
      /** Fires with the picked code, or `null` when cleared. */
      onChange: (code: string | null) => void;
    })
  | (CurrencySelectCommon & {
      /** Multi mode: pick several currencies. */
      multiple: true;
      /** Controlled ISO codes. */
      value: string[];
      /** Fires with the full selection on every toggle. */
      onChange: (codes: string[]) => void;
      /** How selections render in the trigger: `"chips"` (default) or `"summary"`. */
      triggerDisplay?: 'chips' | 'summary';
    });

interface CurrencyData {
  code: string;
  name: string;
}

const SEARCH_AUTO_THRESHOLD = 7;

/**
 * Currency picker over `Select`: ISO 4217 codes, localized names and symbols.
 * @see docs/components/CurrencySelect.md
 */
export const CurrencySelect = forwardRef<HTMLDivElement, CurrencySelectProps>(
  function CurrencySelect(props, ref) {
    const {
      currencies,
      currencyDisplay = 'code',
      locale,
      searchable,
      placeholder,
      className,
      value,
      onChange,
      multiple,
      ...rest
    } = props;
    const t = useTranslation();
    const appLocale = useLocale();
    const loc = locale ?? appLocale;

    const [codes, invalid] = useMemo(
      () => [
        currencies.filter(isValidCurrency),
        currencies.filter((c) => !isValidCurrency(c)).join(', '),
      ],
      [currencies],
    );
    // Warn in an effect keyed on content (strings), so equal arrays don't re-warn per render.
    const empty = !codes.length;
    useEffect(() => {
      if (process.env.NODE_ENV === 'production') return;
      if (invalid) console.warn(`<CurrencySelect>: ignoring invalid currency codes: ${invalid}`);
      if (empty) console.warn('<CurrencySelect>: `currencies` is empty; nothing to pick.');
    }, [invalid, empty]);

    const options = useMemo<SelectOption<CurrencyData>[]>(
      () =>
        codes.map((code) => {
          const name = currencyName(code, loc);
          return {
            value: code,
            label: currencyDisplayText(code, currencyDisplay, loc),
            // Full search terms, so filtering matches by name/symbol in any display mode.
            description: `${code} ${name} ${currencySymbol(code, loc)}`,
            data: { code, name },
          };
        }),
      [codes, currencyDisplay, loc],
    );

    const common = {
      ...rest,
      className,
      options,
      searchable: searchable ?? codes.length > SEARCH_AUTO_THRESHOLD,
      placeholder: placeholder || t('currencySelect.placeholder'),
      renderOption: (opt: SelectOption<CurrencyData>) =>
        opt.data ? (
          <span className={styles.option}>{`${opt.data.code} — ${opt.data.name}`}</span>
        ) : (
          opt.label
        ),
    };

    if (multiple) {
      return (
        <Select
          {...common}
          ref={ref}
          multiple
          value={value as string[]}
          onChange={(v) => (onChange as (c: string[]) => void)(v as string[])}
        />
      );
    }
    return (
      <Select
        {...common}
        ref={ref}
        // Select has no "empty" value of its own: null <-> ''.
        value={(value as string | null) ?? ''}
        onChange={(v) => (onChange as (c: string | null) => void)((v as string) || null)}
      />
    );
  },
);
