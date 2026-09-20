import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent as ReactFocusEvent,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import clsx from 'clsx';
import { useControllableState } from '../_internal/useControllableState';
import { useTranslation } from '../../i18n';
import styles from './OtpInput.module.scss';

/** Cell height. Matches the `<Input>` / `<Button>` size scale. */
export type OtpInputSize = 'sm' | 'md' | 'lg';

/**
 * Which characters the code is made of.
 * - `'numeric'` — digits only (default). What SMS and email one-time codes
 *   almost always are, and what the numeric mobile keypad is for.
 * - `'alphanumeric'` — digits plus Latin letters, normalized to uppercase.
 */
export type OtpInputType = 'numeric' | 'alphanumeric';

const SANITIZE: Record<OtpInputType, (raw: string) => string> = {
  numeric: (raw) => raw.replace(/[^0-9]/g, ''),
  alphanumeric: (raw) => raw.replace(/[^0-9a-z]/gi, '').toUpperCase(),
};

/**
 * Props for {@link OtpInput}. Extends `HTMLAttributes<HTMLDivElement>` (minus
 * `onChange` and `defaultValue`, which are redeclared below with
 * component-specific signatures) since the group `<div>` is the element a
 * consumer ultimately controls.
 */
export interface OtpInputProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /** How many boxes to render. Default `6`. */
  length?: number;
  /**
   * Controlled code. Sanitized and truncated to `length` on render, so a
   * consumer echoing back a dirty string sees it cleaned rather than
   * mis-sliced. Pair with `onChange`.
   */
  value?: string;
  /** Uncontrolled seed. Ignored when `value` is supplied. */
  defaultValue?: string;
  /**
   * Fires on every edit with the whole code so far — always sanitized, never
   * longer than `length`, and never with a gap in the middle.
   */
  onChange?: (value: string) => void;
  /**
   * Fires whenever the code becomes full with a value different from the
   * last one — not on every keystroke while it is full. Use it to submit.
   * Correcting a wrong character inside an already-full code re-fires with
   * the corrected value; retyping the same character does not, since
   * nothing changed.
   */
  onComplete?: (value: string) => void;
  /** Character set. Default `'numeric'`. See `OtpInputType`. */
  type?: OtpInputType;
  /**
   * Cell size. Default `'md'`.
   * - `'sm'` — 24px cells; dense admin screens.
   * - `'md'` — 32px cells (default); most forms.
   * - `'lg'` — 40px cells; a dedicated verification screen.
   */
  size?: OtpInputSize;
  /**
   * Error visual on every cell plus `aria-invalid="true"`. Pair with a visible
   * message and point `aria-describedby` at it (or wrap in `<Field error>`).
   */
  invalid?: boolean;
  /** Disable every cell. */
  disabled?: boolean;
  /**
   * Marks the field required. There is no single native input to attach the
   * native `required` attribute to — a per-cell `required` would let the
   * browser block submit on an empty first cell while accepting a
   * 1-of-`length` code as complete, which is worse than no native gate at
   * all. Sets `aria-required="true"` on every cell instead (the group's
   * `role="group"` does not support `aria-required` per ARIA 1.2 — only
   * `textbox` and a handful of other roles do), the same way `aria-invalid`
   * and `aria-describedby` are already repeated on every cell. Validating
   * completeness is the consumer's job (pair with `invalid` + `onComplete`).
   */
  required?: boolean;
  /** Focus the first cell on mount. */
  autoFocus?: boolean;
  /** Id for the first cell, so an external `<label htmlFor>` focuses the field. */
  id?: string;
  /**
   * Accessible name for the group. Defaults to the localized
   * `otpInput.groupLabel` ("Verification code") so a standalone OtpInput is
   * never an unnamed group.
   */
  'aria-label'?: string;
  /** Ids of elements naming the group. Injected by `<Field>`; wins over `aria-label`. */
  'aria-labelledby'?: string;
  /** Ids of description / error elements. Set on EVERY cell — see the remarks. */
  'aria-describedby'?: string;
}

/**
 * One-time-code field — `length` single-character boxes that behave as one
 * control. Built for SMS / email verification codes: each box carries
 * `autocomplete="one-time-code"`, so iOS and Android offer the code from a
 * just-arrived message above the keyboard, and focus advances as the user
 * types.
 *
 * Every box selects its own content on focus. That one detail is what lets a
 * single change handler cover typing, pasting, and the platform dumping the
 * entire code into whichever box happens to be focused: whatever lands in a
 * box is spliced into the code from that position onward.
 *
 * @example
 * // Controlled, submitting as soon as the code is complete:
 * const [code, setCode] = useState('');
 * <OtpInput value={code} onChange={setCode} onComplete={verify} />
 *
 * @example
 * // Four alphanumeric characters, inside a Field that supplies the label
 * // and error wiring:
 * <Field label="Invite code" error={error}>
 *   <OtpInput length={4} type="alphanumeric" invalid={!!error} />
 * </Field>
 *
 * @example
 * // Uncontrolled, reading the code from onComplete:
 * <OtpInput id="otp" defaultValue="" required onComplete={verify} />
 *
 * @remarks When NOT to use
 * - A code the user copies rather than reads — a plain `<Input>` pastes just
 *   as well and does not fight the caret.
 * - Codes longer than about eight characters; the boxes stop being scannable.
 *   Use `<Input>`.
 * - A password or PIN you need masked → `<PasswordInput>`. OtpInput never
 *   masks: a one-time code is read off a phone and typed once, and hiding it
 *   only costs the user their ability to spot a typo.
 *
 * @remarks Anti-patterns
 * - ❌ Setting `maxLength` on the cells via `className` hacks or a fork — a
 *   one-character cap truncates an autofilled code to its first character and
 *   breaks the whole point of the component.
 * - ❌ Validating inside `onChange` and rejecting characters. The component
 *   already sanitizes; your form layer owns whether the code is *correct*.
 * - ❌ Reading the code out of the DOM. It arrives in `onChange` / `onComplete`.
 * - ❌ Expecting the value in `FormData` on submit — the component renders no
 *   named field, so nothing reaches a native form post. Read the code from
 *   `onChange` / `onComplete` and submit it yourself.
 *
 * @remarks Accessibility
 * - The wrapper is a `role="group"`, named by `aria-labelledby`, then
 *   `aria-label`, then the localized default. Each cell is named by position
 *   ("Digit 3 of 6").
 * - `aria-describedby` and `aria-required` are set on EVERY cell, not just the
 *   first — `role="group"` does not support `aria-required` at all (ARIA 1.2
 *   only allows it on `textbox` and a few other roles), and repeating it is
 *   the same trade already made for `aria-describedby`: a user who arrows to
 *   cell 4 and hears the error message (or "required") again is a smaller
 *   failure than one who lands there and never hears it at all.
 * - Roving tabindex: the group is a single Tab stop. Arrow keys, Home and End
 *   move between cells; Backspace on an empty cell steps back.
 * - Per Hard rule 10 this component has **no transient state**. `invalid` is a
 *   durable property the consumer supplies and is already carried by
 *   `aria-invalid`, so there is deliberately no live region here — announcing
 *   the outcome of a code check is the consumer's job.
 * - A paste or autofill that delivers the whole code at once fills every box
 *   in a single update; a screen reader announces only the cell focus lands
 *   on ("Digit 6 of 6"), not the five it silently filled behind it. This is a
 *   deliberate choice, not an oversight — it's a content change rather than
 *   the transient/async state Rule 10 governs, and the code's correctness is
 *   the consumer's to confirm. Announce the result yourself (e.g. off
 *   `onComplete`) if silent multi-box fills would confuse your users.
 *
 * @remarks Known limitations
 * - The WebOTP API (`navigator.credentials.get({ otp })`) is not used. It is
 *   Android-Chrome-only and needs the SMS body to end with an origin-bound
 *   line (`@example.com #123456`), which the sending side must opt into.
 *   `autocomplete="one-time-code"` covers iOS and the Android keyboard
 *   suggestion without any change to the message.
 * - Deleting a character in the middle clears the code from that cell onward,
 *   keeping the value contiguous. Typing over a cell replaces just that one.
 */
export const OtpInput = forwardRef<HTMLDivElement, OtpInputProps>(function OtpInput(
  {
    length = 6,
    value,
    defaultValue,
    onChange,
    onComplete,
    type = 'numeric',
    size = 'md',
    invalid,
    disabled,
    required,
    autoFocus,
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
  const sanitize = SANITIZE[type];

  const [rawValue, setRawValue] = useControllableState<string>({
    value,
    defaultValue: defaultValue ?? '',
    onChange,
  });
  const code = sanitize(rawValue ?? '').slice(0, length);

  // The code is always contiguous, so the only reachable cells are the filled
  // ones plus the first empty one.
  const lastReachable = Math.min(code.length, length - 1);

  const cellsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  // Standard roving tabindex: the group remembers where focus left it.
  const activeIndex = Math.min(focusedIndex ?? lastReachable, lastReachable);

  // The select() calls in focusCell/onClick/handleFocus run BEFORE the
  // commit they're reacting to has rendered. That's durable only when React's
  // controlled-input diff then skips writing `node.value` — true when the
  // sanitized commit equals the raw keystroke, but false the moment
  // sanitizing actually transforms the character (alphanumeric mode
  // uppercasing a lowercase letter, for instance): React DOES write
  // node.value on that render and collapses whatever was selected before it,
  // so a second overtype keystroke right behind the first gets appended
  // instead of replacing, and is silently sliced back off. Re-select after
  // every commit, once React has actually written the DOM, so the selection
  // this render leaves behind is the one the NEXT keystroke will see —
  // regardless of whether sanitizing changed anything. A no-op on an empty
  // cell, and skipped entirely when focus isn't on the active cell (Tab,
  // Arrow, Home/End, and click already select correctly on their own).
  useLayoutEffect(() => {
    const cell = cellsRef.current[activeIndex];
    if (cell && document.activeElement === cell) cell.select();
  }, [code, activeIndex]);

  const focusCell = useCallback((index: number) => {
    const cell = cellsRef.current[index];
    // `focus()` on an already-focused cell fires no focus event, so
    // `handleFocus`'s select() below never runs — select here too, so
    // overtyping the cell the user is already sitting in (fixing the last
    // digit typed) replaces it instead of silently appending and truncating
    // back to the same value.
    cell?.focus();
    cell?.select();
  }, []);

  const commit = useCallback(
    (next: string) => {
      setRawValue(next);
      // Fire on any transition INTO a full-and-different code, not just the
      // empty→full one: a corrected digit inside an already-full code (mistype,
      // then fix the last character) is a real completion the consumer must
      // hear about. Guarding on the value rather than just the length also
      // means a same-value overtype (retyping the digit already there) does
      // NOT re-fire — nothing about the code actually changed.
      if (next.length === length && next !== code) onComplete?.(next);
    },
    [setRawValue, length, code, onComplete],
  );

  const handleChange = (rawIndex: number) => (event: ChangeEvent<HTMLInputElement>) => {
    // A controlled `value` can shrink out from under a focused cell — the
    // standard "clear the code after a failed check" reset — leaving DOM
    // focus on a cell past the contiguous range while `lastReachable` has
    // already moved. Clamp to where the code actually ends so the keystroke
    // lands there instead of at the stale DOM position, and `focusCell`
    // below pulls focus back into range along with it.
    const index = Math.min(rawIndex, code.length);
    const chars = sanitize(event.target.value);
    if (chars.length === 0) {
      // "Sanitizes to empty" also happens when the sanitizer REJECTS a
      // character (a letter in numeric mode) typed over a filled, selected
      // cell — that must be a no-op, not a truncation. Only a genuinely
      // emptied cell (raw value itself is '') truncates the code from here
      // on, so `value` stays a contiguous string that maps 1:1 onto the
      // cells. React restores the cell's committed character on its own.
      if (event.target.value === '') commit(code.slice(0, index));
      return;
    }
    // A delivery of exactly `length` characters IS the whole code — the
    // platform dumps it into whichever cell happens to be focused, not
    // necessarily the first — so it replaces the value outright rather than
    // splicing in at that position, which would scatter it across two spots.
    // A shorter (or over-long, uncommon) delivery keeps the splice-and-slice
    // behavior, unchanged.
    const next =
      chars.length === length
        ? chars
        : (code.slice(0, index) + chars + code.slice(index + chars.length)).slice(0, length);
    commit(next);
    focusCell(Math.min(index + chars.length, length - 1));
  };

  const handleKeyDown = (index: number) => (event: ReactKeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Backspace':
        // A filled cell is handled natively: focus selected its content, so
        // Backspace deletes it and fires `change`. An empty cell has nothing
        // to delete, so step back and clear the previous one instead.
        if (!code[index] && index > 0) {
          event.preventDefault();
          commit(code.slice(0, index - 1));
          focusCell(index - 1);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusCell(Math.max(0, index - 1));
        break;
      case 'ArrowRight':
        event.preventDefault();
        focusCell(Math.min(lastReachable, index + 1));
        break;
      case 'Home':
        event.preventDefault();
        focusCell(0);
        break;
      case 'End':
        event.preventDefault();
        focusCell(lastReachable);
        break;
      default:
        // A keystroke that reproduces the character already in the cell
        // leaves the DOM value byte-identical, so React's value tracker
        // fires no change event at all — `handleChange` never runs, nothing
        // re-selects, and the caret is left collapsed. Every keystroke after
        // that would then append instead of replace and get sliced back off
        // by the length cap, bricking the cell. Select on the keystroke
        // itself so the next character always lands on a selected cell
        // regardless of whether this one produced a change event.
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.currentTarget.select();
        }
        break;
    }
  };

  // Clicking a cell beyond the first empty one would otherwise drop the
  // character somewhere other than where it was aimed, because the code is
  // contiguous. Redirect on mousedown, where `code` is still the rendered
  // value — doing it in `onFocus` would race our own programmatic focus.
  const handleMouseDown = (index: number) => (event: ReactMouseEvent<HTMLInputElement>) => {
    if (index > lastReachable) {
      event.preventDefault();
      focusCell(lastReachable);
    }
  };

  const handleFocus = (index: number) => (event: ReactFocusEvent<HTMLInputElement>) => {
    setFocusedIndex(index);
    // Select-on-focus is what makes typing into a filled cell a replacement
    // rather than an append, so a multi-character `change` can only mean a
    // paste or an autofill.
    event.target.select();
  };

  // Re-clicking a cell that already has focus moves the caret but fires no
  // focus event, so it needs its own select — same reasoning as `focusCell`.
  const handleClick = (event: ReactMouseEvent<HTMLInputElement>) => {
    event.currentTarget.select();
  };

  const cellLabel = type === 'numeric' ? 'otpInput.digit' : 'otpInput.character';

  return (
    <div
      // {...rest} first so the structural ARIA contract — role=group and the
      // resolved group name — cannot be clobbered by a consumer.
      {...rest}
      ref={ref}
      role="group"
      aria-label={ariaLabelledby ? undefined : (ariaLabel ?? t('otpInput.groupLabel'))}
      aria-labelledby={ariaLabelledby}
      className={clsx(styles.root, className)}
    >
      {Array.from({ length }, (_unused, index) => (
        <input
          key={index}
          ref={(node) => {
            cellsRef.current[index] = node;
          }}
          type="text"
          value={code[index] ?? ''}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          onMouseDown={handleMouseDown(index)}
          onFocus={handleFocus(index)}
          onClick={handleClick}
          id={index === 0 ? id : undefined}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          tabIndex={index === activeIndex ? 0 : -1}
          inputMode={type === 'numeric' ? 'numeric' : 'text'}
          pattern={type === 'numeric' ? '[0-9]*' : undefined}
          autoComplete="one-time-code"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label={t(cellLabel, { index: index + 1, total: length })}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          aria-describedby={ariaDescribedby}
          className={clsx(styles.cell, styles[`size-${size}`], invalid && styles.invalid)}
        />
      ))}
    </div>
  );
});
