import { forwardRef, useEffect, useId, useState, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { Button } from '../Button';
import { Cluster } from '../Cluster';
import { DatePicker } from '../DatePicker';
import { Input } from '../Input';
import { Select } from '../Select';
import { Stack } from '../Stack';
import { Switch } from '../Switch';
import { Text } from '../Text';
import { useTranslation } from '../../i18n';
import {
  formatRelativeDate,
  parseRelativeDate,
  OFFSET_MAX,
  ROLLING_MAX,
  ROLLING_MIN,
  type RelativeDateValue,
  type RelativePeriod,
  type RelativeScope,
  type RelativeUnit,
} from './relativeDate';
import styles from './RelativeDateInput.module.scss';

/** A quick-pick shown above the controls: the consumer's label and the expression it emits. */
export interface RelativeDatePreset {
  /** Visible button text (the consumer's, already translated). */
  label: string;
  /** Canonical expression emitted when the preset is chosen, e.g. `'last:30d'`. */
  value: string;
}

export interface RelativeDateInputProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /**
   * What the expression describes.
   * - `'point'` — one date: an anchor (today, now, start/end of a period) plus a signed offset, or an exact date.
   * - `'range'` — a date range: last/next N units, a whole this/last/next period, or a period to date.
   */
  mode: 'point' | 'range';
  /** Datetime fields: offers the Now anchor with hour/minute offsets, and a minute-granular exact date (UTC `YYYY-MM-DDTHH:mm:ssZ`). Default `false`. */
  allowNow?: boolean;
  /** The controlled expression (see the grammar in the docs), or `null` for none. `null` shows the defaults (`today` / `this:month`) without emitting them. A value that doesn't parse shows the defaults plus an "Unrecognised value" note. */
  value: string | null;
  /** Fires with the next canonical expression after a valid edit, and only when it differs from `value`. Invalid drafts (an out-of-range amount, an exact date not yet picked) never fire it. */
  onChange: (expr: string | null) => void;
  /** Quick-pick toggle buttons rendered above the controls. The one whose `value` equals the canonical form of `value` is pressed (`last:07d` presses `last:7d`). */
  presets?: readonly RelativeDatePreset[];
  /** Disables every control, presets included. Default `false`. */
  disabled?: boolean;
  /** Error chrome on the controls (`aria-invalid`), e.g. from `<Field error>`. Default `false`. The Exact-date Switch is never marked invalid. */
  invalid?: boolean;
  /**
   * Consumed for `<Field asGroup required>` composition, so Field can show its required
   * marker. Adds no ARIA: `role="group"` does not support `aria-required` (ARIA 1.2), and
   * the controls always show a value. Default `false`.
   */
  required?: boolean;
}

type Mode = RelativeDateInputProps['mode'];
/** Range kinds: rolling past/coming N units, a whole calendar period, or a period to date. */
type RangeKind = 'past' | 'coming' | 'calendar' | 'toDate';

/** Every edit state the controls show; one shape for both modes. */
interface Draft {
  exact: boolean;
  /** Canonical exact date, or `null` until one is picked. */
  date: string | null;
  /** `'today'`, `'now'` or `'{start|end}:{scope}:{period}'`. */
  anchor: string;
  sign: 1 | -1;
  kind: RangeKind;
  scope: RelativeScope;
  period: RelativePeriod;
  /** Raw numeric text, kept as typed so an invalid draft survives re-renders. */
  amount: string;
  unit: RelativeUnit;
}

const PERIODS: RelativePeriod[] = ['week', 'month', 'quarter', 'year'];
const SCOPES: RelativeScope[] = ['this', 'last', 'next'];
const DATE_UNITS: RelativeUnit[] = ['d', 'w', 'mo', 'y'];
const KINDS: RangeKind[] = ['past', 'coming', 'calendar', 'toDate'];
const CALENDAR = SCOPES.flatMap((scope) => PERIODS.map((period) => ({ scope, period })));
const BOUNDARIES = (['start', 'end'] as const).flatMap((edge) =>
  SCOPES.flatMap((scope) => PERIODS.map((period) => ({ edge, scope, period }))),
);

const defaults = (mode: Mode): Draft => ({
  exact: false,
  date: null,
  anchor: 'today',
  sign: 1,
  kind: 'calendar',
  scope: 'this',
  period: 'month',
  amount: mode === 'point' ? '0' : '7',
  unit: 'd',
});

/** Hours and minutes exist only on Now; leaving Now resets the offset (3h is not 3d). */
const normalize = (d: Draft, mode: Mode): Draft =>
  mode === 'point' && d.anchor !== 'now' && (d.unit === 'h' || d.unit === 'min')
    ? { ...d, unit: 'd', amount: '0' }
    : d;

/**
 * The draft for an incoming value. Fields the value doesn't carry keep `prev`'s
 * (an exact date keeps the relative fields; a whole period keeps the rolling
 * amount/unit), so switching back restores what the user had.
 */
function fromValue(parsed: RelativeDateValue | null, mode: Mode, prev: Draft): Draft {
  if (!parsed) return defaults(mode);
  const base = { ...prev, exact: false };
  switch (parsed.kind) {
    case 'exact':
      return { ...prev, exact: true, date: parsed.date };
    case 'anchor':
    case 'boundary': {
      const anchor =
        parsed.kind === 'anchor'
          ? parsed.anchor
          : `${parsed.edge}:${parsed.scope}:${parsed.period}`;
      const o = parsed.offset;
      return normalize(
        o
          ? { ...base, anchor, sign: o.sign, amount: String(o.n), unit: o.unit }
          : { ...base, anchor, amount: '0' },
        mode,
      );
    }
    case 'rolling':
      return {
        ...base,
        kind: parsed.dir === 'last' ? 'past' : 'coming',
        amount: String(parsed.n),
        unit: parsed.unit,
      };
    case 'period':
      return { ...base, kind: 'calendar', scope: parsed.scope, period: parsed.period };
    case 'toDate':
      return { ...base, kind: 'toDate', period: parsed.period };
  }
}

const usesAmount = (d: Draft, mode: Mode) =>
  mode === 'point' ? !d.exact : d.kind === 'past' || d.kind === 'coming';

const amountLimits = (mode: Mode) =>
  mode === 'point' ? { min: 0, max: OFFSET_MAX } : { min: ROLLING_MIN, max: ROLLING_MAX };

/** The parsed amount, or `null` when it is not a whole number within the mode's limits. */
function amountOf(d: Draft, mode: Mode): number | null {
  if (!/^\d+$/.test(d.amount)) return null;
  const n = Number(d.amount);
  const { min, max } = amountLimits(mode);
  return n >= min && n <= max ? n : null;
}

/** The value a draft stands for, or `null` while it is incomplete or invalid. */
function toValue(d: Draft, mode: Mode): RelativeDateValue | null {
  if (mode === 'point' && d.exact) return d.date ? { kind: 'exact', date: d.date } : null;
  if (mode === 'range' && d.kind === 'calendar')
    return { kind: 'period', scope: d.scope, period: d.period };
  if (mode === 'range' && d.kind === 'toDate') return { kind: 'toDate', period: d.period };
  const n = amountOf(d, mode);
  if (n === null) return null;
  if (mode === 'range') {
    const unit = d.unit as 'd' | 'w' | 'mo' | 'y';
    return { kind: 'rolling', dir: d.kind === 'past' ? 'last' : 'next', n, unit };
  }
  const offset = { sign: d.sign, n, unit: d.unit };
  if (d.anchor === 'today' || d.anchor === 'now')
    return { kind: 'anchor', anchor: d.anchor, offset };
  const [edge, scope, period] = d.anchor.split(':') as [
    'start' | 'end',
    RelativeScope,
    RelativePeriod,
  ];
  return {
    kind: 'boundary',
    edge,
    scope,
    period,
    offset: offset as { sign: 1 | -1; n: number; unit: 'd' | 'w' | 'mo' | 'y' },
  };
}

/** Exact date → Date for the picker: a local calendar day, or an instant for a UTC datetime. */
function toPickerDate(date: string | null): Date | null {
  if (!date) return null;
  if (date.includes('T')) return new Date(date);
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Picker Date → exact date: the local calendar day, or (with `allowNow`) UTC to the minute. */
function fromPickerDate(date: Date, allowNow: boolean): string {
  if (allowNow) return `${date.toISOString().slice(0, 16)}:00Z`;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Compact editor for one relative date or date-range expression (`today+7d`, `last:30d`, `this:quarter:to_date`).
 * @see docs/components/RelativeDateInput.md
 */
export const RelativeDateInput = forwardRef<HTMLDivElement, RelativeDateInputProps>(
  function RelativeDateInput(
    {
      mode,
      allowNow = false,
      value,
      onChange,
      presets,
      disabled = false,
      invalid = false,
      // Consumed, not spread: `required` is not a valid attribute on a div.
      required: _required,
      className,
      'aria-describedby': ariaDescribedby,
      ...rest
    },
    ref,
  ) {
    const t = useTranslation();
    const uid = useId();
    const errorId = `${uid}-error`;
    const noteId = `${uid}-note`;

    const parse = (v: string | null) =>
      v === null ? null : parseRelativeDate(v, { mode, allowNow });
    const [draft, setDraft] = useState(() => fromValue(parse(value), mode, defaults(mode)));
    // Re-derive the draft whenever `value`, `mode` or `allowNow` changes (render-phase
    // update, no effect). A new mode starts from that mode's defaults.
    const [seen, setSeen] = useState({ value, mode, allowNow });
    if (value !== seen.value || mode !== seen.mode || allowNow !== seen.allowNow) {
      setSeen({ value, mode, allowNow });
      setDraft((prev) => fromValue(parse(value), mode, mode === seen.mode ? prev : defaults(mode)));
    }

    const unrecognised = value !== null && parse(value) === null;
    const amountError = usesAmount(draft, mode) && amountOf(draft, mode) === null;

    const commit = (patch: Partial<Draft>) => {
      const next = normalize({ ...draft, ...patch }, mode);
      setDraft(next);
      const v = toValue(next, mode);
      if (!v) return;
      const expr = formatRelativeDate(v);
      if (expr !== value) onChange(expr);
    };

    const opt = (v: string, label: string) => ({ value: v, label });
    const pickOne = (fn: (v: string) => void) => (v: string | string[]) => fn(v as string);
    // The note also describes every control: unnamed (inside `<Field asGroup>`) the root
    // is a plain div, whose aria-describedby screen readers never announce.
    const noteRef = unrecognised ? noteId : undefined;
    const common = { size: 'sm' as const, disabled, invalid, 'aria-describedby': noteRef };

    const amountInput = (
      <Input
        {...common}
        className={styles.amount}
        inputMode="numeric"
        aria-label={t('relativeDateInput.amount')}
        invalid={invalid || amountError}
        aria-describedby={clsx(amountError && errorId, noteRef) || undefined}
        value={draft.amount}
        onChange={(e) => commit({ amount: e.target.value })}
      />
    );
    const units =
      mode === 'point' && draft.anchor === 'now' ? [...DATE_UNITS, 'h', 'min'] : DATE_UNITS;
    const unitSelect = (
      <Select
        {...common}
        className={styles.select}
        aria-label={t('relativeDateInput.unit')}
        // Labels agree with the current amount ("1 day", ru «21 день»); an invalid amount reads as plural.
        options={units.map((u) =>
          opt(u, t('relativeDateInput.units', { unit: u, n: amountOf(draft, mode) ?? 0 })),
        )}
        value={draft.unit}
        onChange={pickOne((u) => commit({ unit: u as RelativeUnit }))}
      />
    );
    const periodLabel = t('relativeDateInput.period');
    const calendarSelect = (
      <Select
        {...common}
        className={styles.select}
        aria-label={periodLabel}
        options={CALENDAR.map((c) =>
          opt(`${c.scope}:${c.period}`, t('relativeDateInput.calendarPeriod', c)),
        )}
        value={`${draft.scope}:${draft.period}`}
        onChange={pickOne((v) => {
          const [scope, period] = v.split(':') as [RelativeScope, RelativePeriod];
          commit({ scope, period });
        })}
      />
    );
    const toDateSelect = (
      <Select
        {...common}
        className={styles.select}
        aria-label={periodLabel}
        options={PERIODS.map((period) =>
          opt(period, t('relativeDateInput.periodToDate', { period })),
        )}
        value={draft.period}
        onChange={pickOne((p) => commit({ period: p as RelativePeriod }))}
      />
    );

    let controls;
    if (mode === 'range') {
      controls = (
        <>
          <Select
            {...common}
            className={styles.select}
            aria-label={t('relativeDateInput.kind')}
            options={KINDS.map((k) => opt(k, t(`relativeDateInput.kinds.${k}`)))}
            value={draft.kind}
            onChange={pickOne((k) => commit({ kind: k as RangeKind }))}
          />
          {draft.kind === 'calendar' ? (
            calendarSelect
          ) : draft.kind === 'toDate' ? (
            toDateSelect
          ) : (
            <>
              {amountInput}
              {unitSelect}
            </>
          )}
        </>
      );
    } else {
      controls = (
        <>
          {draft.exact ? (
            <DatePicker
              size="sm"
              disabled={disabled}
              invalid={invalid}
              className={styles.select}
              aria-label={t('relativeDateInput.date')}
              granularity={allowNow ? 'minute' : 'day'}
              clearable={false}
              value={toPickerDate(draft.date)}
              onChange={(d) => d && commit({ date: fromPickerDate(d, allowNow) })}
            />
          ) : (
            <>
              <Select
                {...common}
                className={styles.select}
                aria-label={t('relativeDateInput.anchor')}
                options={[
                  opt('today', t('relativeDateInput.today')),
                  ...(allowNow ? [opt('now', t('relativeDateInput.now'))] : []),
                  ...BOUNDARIES.map((b) =>
                    opt(`${b.edge}:${b.scope}:${b.period}`, t('relativeDateInput.boundary', b)),
                  ),
                ]}
                value={draft.anchor}
                onChange={pickOne((a) => commit({ anchor: a }))}
              />
              <Select
                {...common}
                className={styles.select}
                aria-label={t('relativeDateInput.sign')}
                options={[opt('+', '+'), opt('-', '−')]}
                value={draft.sign === 1 ? '+' : '-'}
                onChange={pickOne((s) => commit({ sign: s === '-' ? -1 : 1 }))}
              />
              {amountInput}
              {unitSelect}
            </>
          )}
          <Switch
            size="sm"
            disabled={disabled}
            checked={draft.exact}
            // Toggling on waits for a pick; toggling off restores the kept relative fields.
            onChange={(on) => commit(on ? { exact: true, date: null } : { exact: false })}
          >
            {t('relativeDateInput.exactDate')}
          </Switch>
        </>
      );
    }

    // The expression the controls currently show, only while the draft agrees with
    // `value` (compared canonically, so `last:07d` presses a `last:7d` preset), so
    // no preset reads as pressed over an invalid or unpicked draft.
    const drafted = toValue(draft, mode);
    const parsedValue = parse(value);
    const canonical = parsedValue ? formatRelativeDate(parsedValue) : value;
    const shown = drafted && formatRelativeDate(drafted) === canonical ? canonical : null;

    // Only a named group is a group; unnamed (e.g. inside `<Field asGroup>`, which is
    // the group) it would be an extra, nameless landmark for screen readers.
    const named = rest['aria-label'] != null || rest['aria-labelledby'] != null;
    const describedBy = clsx(ariaDescribedby, named && noteRef) || undefined;
    // A preset must parse in this mode, or choosing it would emit an unrecognised value.
    const isValidPreset = (p: RelativeDatePreset) => parse(p.value) !== null;
    const badPresets = (presets ?? [])
      .filter((p) => !isValidPreset(p))
      .map((p) => p.value)
      .join(', ');
    // Keyed on content (a string), so equal arrays don't re-warn per render.
    useEffect(() => {
      if (process.env.NODE_ENV === 'production' || !badPresets) return;
      console.warn(
        `<RelativeDateInput>: ignoring presets that don't parse in this mode: ${badPresets}`,
      );
    }, [badPresets]);

    return (
      // {...rest} first so the group role and merged aria-describedby win.
      <Stack
        gap="sm"
        {...rest}
        ref={ref}
        role={named ? 'group' : undefined}
        aria-describedby={describedBy}
        className={className}
      >
        {presets && presets.length > 0 && (
          <Cluster gap="xs">
            {presets.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant="secondary"
                disabled={disabled || !isValidPreset(p)}
                selected={p.value === shown}
                aria-pressed={p.value === shown}
                onClick={() =>
                  p.value === value
                    ? // Same value, diverged draft (e.g. Exact date on, nothing picked): restore it.
                      setDraft(fromValue(parse(value), mode, draft))
                    : onChange(p.value)
                }
              >
                {p.label}
              </Button>
            ))}
          </Cluster>
        )}
        <Cluster gap="xs" align="center" className={styles.row}>
          {controls}
        </Cluster>
        {amountError && (
          <Text id={errorId} size="sm" tone="danger">
            {t('relativeDateInput.errorRange', amountLimits(mode))}
          </Text>
        )}
        {unrecognised && (
          <Text id={noteId} size="sm" tone="muted">
            {t('relativeDateInput.unrecognised', { value })}
          </Text>
        )}
      </Stack>
    );
  },
);
