import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import clsx from 'clsx';
import { Minus, Plus } from 'lucide-react';
import { useLocale, useTranslation } from '../../i18n';
import {
  canonicalToDraft,
  draftToCanonical,
  formatDraft,
  localeSeparators,
  parseLocalAmount,
} from '../_internal/currency';
import { mergeRefs } from '../_internal/refs';
import styles from './NumberField.module.scss';

/** NumberField size. Same height and type scale as `<Input>`. */
export type NumberFieldSize = 'sm' | 'md' | 'lg';

export interface NumberFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'size' | 'type' | 'min' | 'max' | 'step'
> {
  /** Controlled value. `null` = empty field. */
  value: number | null;
  /**
   * Fires live on every keystroke that parses to a number (unclamped), with `null` when the field
   * is cleared, and on every step. Blur after typing, or Enter, fires once more with the clamped, step-snapped value.
   */
  onChange: (value: number | null) => void;
  /** Lower bound. Blur / Enter clamps to it; − disables at it; Home jumps to it. Omit for unbounded. */
  min?: number;
  /** Upper bound. Blur / Enter clamps to it; + disables at it; End jumps to it. Omit for unbounded. */
  max?: number;
  /**
   * Default 1. Also sets the minimum display precision (decimals of `step`); a value with more
   * decimals shows them all (up to 10), so the field never hides the stored value. A `step` ≤ 0
   * falls back to 1 (dev warning).
   */
  step?: number;
  /** Field height + type scale: `"sm"` dense rows, `"md"` (default) forms, `"lg"` prominent entry. */
  size?: NumberFieldSize;
  /** Error chrome + `aria-invalid="true"`. Injected by `<Field error>`. */
  invalid?: boolean;
}

const REPEAT_DELAY = 400;
const REPEAT_INTERVAL = 60;

/** Decimals of `n`, capped at 10 (also trims float noise like 0.1 + 0.2; exponent-safe). */
const decimalsOf = (n: number) =>
  (
    n
      .toFixed(10)
      .replace(/\.?0+$/, '')
      .split('.')[1] ?? ''
  ).length;

/**
 * `null` = empty, `undefined` = partial / unparseable draft (`-`, `,`) or malformed text: any
 * character the locale does not use for numbers, a second decimal separator (`12.5.3`) or a `-`
 * anywhere but first (`1-2`). Malformed text stays in the field as typed but never fires, and
 * blur restores the last value. In a locale whose decimal and group are both not `.` (ru), a
 * `.` is the decimal separator.
 */
function parse(text: string, locale: string, allowNegative: boolean): number | null | undefined {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const { group, decimal } = localeSeparators(locale);
  if (trimmed.lastIndexOf('-') > 0) return undefined;
  // ICU versions differ on the de-CH group (U+0027 vs U+2019): accept both.
  const groups = /^\s$/.test(group)
    ? /[ \u00a0\u202f]/g
    : /^['\u2019]$/.test(group)
      ? /['\u2019]/g
      : new RegExp(`[${group}]`, 'g');
  let body = trimmed.replace(groups, '');
  if (decimal !== '.' && group !== '.') body = body.split('.').join(decimal);
  if (body.split(decimal).length > 2) return undefined;
  const rest = body.replace(/^-/, '').split(decimal).join('');
  if (/\D/.test(rest)) return undefined;
  const draft = parseLocalAmount(body, { locale, precision: 15, allowNegative });
  const canonical = draft && draftToCanonical(draft);
  return canonical ? Number(canonical) : undefined;
}

/** Shows at least `precision` decimals, and more when the value has them, so it is never hidden. */
function format(value: number | null, locale: string, precision: number): string {
  if (value !== null) {
    precision = Math.max(precision, decimalsOf(value));
  }
  const draft = value === null ? null : canonicalToDraft(value.toFixed(precision));
  return draft ? formatDraft(draft, { locale, precision, pad: true }) : '';
}

/**
 * Split numeric stepper `[ − | value | + ]` with locale formatting and spinbutton keys.
 * @see docs/components/NumberField.md
 */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  {
    value,
    onChange,
    min,
    max,
    step: stepProp = 1,
    size = 'md',
    invalid,
    disabled,
    readOnly,
    className,
    onKeyDown,
    onBlur,
    onFocus,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const locale = useLocale();
  const badStep = !(stepProp > 0);
  const step = badStep ? 1 : stepProp;
  useEffect(() => {
    if (badStep && process.env.NODE_ENV !== 'production') {
      console.warn(`<NumberField>: step must be > 0 (got ${stepProp}); using 1.`);
    }
  }, [badStep, stepProp]);
  const precision = decimalsOf(step);
  const allowNegative = min === undefined || min < 0;
  const { group, decimal } = localeSeparators(locale);

  const [text, setText] = useState(() => format(value, locale, precision));
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mergedRef = useMemo(() => mergeRefs(ref, inputRef), [ref]);
  // True once the user typed since focus; blur commits only then (stepping and plain
  // focus-blur leave the value alone). Enter always commits.
  const typed = useRef(false);
  const textRef = useRef(text);
  textRef.current = text;
  // Latest value for the hold-to-repeat timers (their closures would otherwise be stale).
  const valueRef = useRef(value);
  valueRef.current = value;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The repeat interval outlives the render that started it; it steps through this ref so a
  // hold uses the latest onChange / min / max / step.
  const stepByRef = useRef<(delta: number) => boolean>(() => false);

  // External value changes show up, unless the focused draft already means that value
  // (our own live echo must not reformat what the user is typing).
  useEffect(() => {
    const focused = document.activeElement === inputRef.current;
    if (focused && parse(textRef.current, locale, allowNegative) === value) return;
    // The draft is gone, so a later blur must not commit (snap) the external value.
    typed.current = false;
    setText(format(value, locale, precision));
  }, [value, locale, precision, allowNegative]);

  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  const round = (n: number) => Number(n.toFixed(precision));

  const emit = (n: number | null) => {
    typed.current = false;
    setText(format(n, locale, precision));
    if (n !== valueRef.current) {
      valueRef.current = n;
      onChange(n);
    }
  };

  /** Steps from the latest value; returns false when nothing moved (at a limit). */
  const stepBy = (delta: number) => {
    const from = valueRef.current;
    const next = clamp(round((from ?? 0) + delta));
    if (next === from) return false;
    emit(next);
    return true;
  };
  stepByRef.current = stepBy;

  /** Blur / Enter: clamp + snap to the step grid (anchored at `min`, else 0). */
  const commit = () => {
    if (readOnly || disabled) return;
    const n = parse(text, locale, allowNegative);
    typed.current = false;
    if (n === undefined) return setText(format(valueRef.current, locale, precision));
    if (n === null) return emit(null);
    const base = min ?? 0;
    emit(clamp(round(base + Math.round((n - base) / step) * step)));
  };

  const stopRepeat = () => {
    clearTimeout(timer.current);
    clearInterval(timer.current);
  };
  useEffect(() => stopRepeat, []);

  const startRepeat = (delta: number) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button > 0) return;
    stopRepeat();
    if (!stepBy(delta)) return;
    timer.current = setTimeout(() => {
      timer.current = setInterval(() => {
        if (!stepByRef.current(delta)) stopRepeat();
      }, REPEAT_INTERVAL);
    }, REPEAT_DELAY);
  };

  // Pointer clicks (detail ≥ 1) already stepped on pointerdown; a synthetic click from assistive
  // tech has detail 0 and no pointerdown, so it steps here.
  const onButtonClick = (delta: number) => (e: MouseEvent<HTMLButtonElement>) => {
    if (e.detail === 0) stepBy(delta);
  };

  const applyText = (value: string) => {
    // A '.' types the decimal where '.' does not group (ru, fr); where it groups, handleChange drops it.
    let raw = value;
    if (decimal !== '.' && group !== '.') raw = raw.split('.').join(decimal);
    const apos = /^['\u2019]$/.test(group) ? ["'", '\u2019'] : [];
    const allowed = new Set([group, decimal, ...apos, ...(allowNegative ? ['-'] : [])]);
    if ([...raw].some((c) => !/[\d\s]/.test(c) && !allowed.has(c))) return;
    setText(raw);
    typed.current = true;
    const n = parse(raw, locale, allowNegative);
    if (n !== undefined && n !== valueRef.current) {
      valueRef.current = n;
      onChange(n);
    }
  };

  // Where '.' groups (de, es, it), a typed '.' could mean decimal or thousands: never guess,
  // ignore it (type ','). Pasted text still goes through parse.
  const blockDot = decimal !== '.' && group === '.';

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const next = input.value;
    const at = (input.selectionStart ?? next.length) - 1;
    // keydown can't catch mobile keyboards ('Unidentified' key, non-cancelable beforeinput),
    // so also undo a change that only inserted one '.'.
    if (blockDot && next[at] === '.' && next.slice(0, at) + next.slice(at + 1) === text) {
      input.value = text;
      input.setSelectionRange(at, at);
      return;
    }
    applyText(next);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || readOnly) return;
    if (blockDot && e.key === '.') return e.preventDefault();
    const deltas: Record<string, number> = {
      ArrowUp: step,
      ArrowDown: -step,
      PageUp: step * 10,
      PageDown: -step * 10,
    };
    const jumpTo = e.key === 'Home' ? min : e.key === 'End' ? max : undefined;
    if (e.key in deltas) stepBy(deltas[e.key]);
    else if (jumpTo !== undefined) emit(jumpTo);
    else {
      if (e.key === 'Enter') commit(); // no preventDefault: Enter still submits the form
      return;
    }
    e.preventDefault();
  };

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    typed.current = false;
    onFocus?.(e);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (typed.current) commit();
    onBlur?.(e);
  };

  const locked = disabled || readOnly;
  const atMin = min !== undefined && value !== null && value <= min;
  const atMax = max !== undefined && value !== null && value >= max;

  const button = (delta: number, label: string, atLimit: boolean, Icon: typeof Plus) => (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      className={styles.button}
      disabled={locked || atLimit}
      onPointerDown={startRepeat(delta)}
      onPointerUp={stopRepeat}
      onPointerLeave={stopRepeat}
      onPointerCancel={stopRepeat}
      onClick={onButtonClick(delta)}
      // Keep focus (and the draft) in the input; blur would commit mid-gesture.
      onMouseDown={(e) => e.preventDefault()}
      // A long press repeats; it must not open the touch context menu.
      onContextMenu={(e) => e.preventDefault()}
    >
      <Icon aria-hidden="true" size={size === 'lg' ? 16 : 14} />
    </button>
  );

  return (
    <div
      className={clsx(
        styles.root,
        styles[`size-${size}`],
        invalid && styles.invalid,
        disabled && styles.disabled,
        className,
      )}
    >
      {button(-step, t('numberField.decrease'), atMin, Minus)}
      <input
        // {...rest} first so the spinbutton contract (role, value ARIA, handlers) wins.
        {...rest}
        ref={mergedRef}
        type="text"
        role="spinbutton"
        // iOS's decimal keypad has no minus key, so a field that accepts negatives gets 'text'.
        inputMode={allowNegative ? 'text' : Number.isInteger(step) ? 'numeric' : 'decimal'}
        autoComplete={rest.autoComplete ?? 'off'}
        aria-valuenow={value ?? undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={value === null ? undefined : format(value, locale, precision)}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        readOnly={readOnly}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={styles.input}
      />
      {button(step, t('numberField.increase'), atMax, Plus)}
    </div>
  );
});
