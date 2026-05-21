# PasswordInput + PasswordStrengthMeter — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two components in one PR:

1. `<PasswordInput>` — password field with eye toggle + opt-in caps-lock warning + opt-in wrong-keyboard-layout warning.
2. `<PasswordStrengthMeter>` — separate sibling rendering a 4-segment strength visualization with pluggable scoring.

**Architecture:** PasswordInput mirrors DatePicker's wrapper-with-trailing-buttons SCSS pattern. PasswordStrengthMeter is a tiny standalone component with default scoring heuristic + consumer-driven `score`/`scoreFn` props. No new tokens — reuses existing color + size scales.

**Tech Stack:** React, SCSS modules, Vitest + RTL.

**Branch:** `feat/password-input`. Off fresh main.

**Spec:** `docs/superpowers/specs/2026-05-21-password-input-design.md`.

---

## Task 1: Verify branch + hooks

- [ ] **Step 1: Verify**

```bash
git rev-parse --abbrev-ref HEAD   # → feat/password-input
git config --get core.hooksPath   # → .husky/_
test -x .husky/pre-push           # exit 0
```

---

## Task 2: `PasswordInput.tsx` + `PasswordInput.module.scss`

**Files:**

- Create: `packages/design-system/src/components/PasswordInput/PasswordInput.tsx`
- Create: `packages/design-system/src/components/PasswordInput/PasswordInput.module.scss`

- [ ] **Step 1: Write `PasswordInput.tsx`**

```tsx
import {
  forwardRef,
  useCallback,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import clsx from 'clsx';
import { ArrowBigUpDash, Eye, EyeOff, Languages } from 'lucide-react';
import styles from './PasswordInput.module.scss';

/** Field height + type scale. Same scale as `<Input>`. */
export type PasswordInputSize = 'sm' | 'md' | 'lg';

export interface PasswordInputLabels {
  /** aria-label for the toggle when hidden. Default: 'Show password'. */
  show?: string;
  /** aria-label for the toggle when revealed. Default: 'Hide password'. */
  hide?: string;
  /** Live-region text announced when caps-lock is detected. Default: 'Caps Lock is on'. */
  capsLockOn?: string;
  /** Live-region text announced when a non-ASCII keystroke is detected. Default: 'Possible wrong keyboard layout'. */
  wrongLayoutOn?: string;
}

const DEFAULT_LABELS: Required<PasswordInputLabels> = {
  show: 'Show password',
  hide: 'Hide password',
  capsLockOn: 'Caps Lock is on',
  wrongLayoutOn: 'Possible wrong keyboard layout',
};

const ICON_SIZE_FOR: Record<PasswordInputSize, number> = {
  sm: 14,
  md: 14,
  lg: 16,
};

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** Field height + type scale. Same scale as `<Input>`. Defaults to `'md'`. */
  size?: PasswordInputSize;
  /** Toggles the error visual + sets `aria-invalid="true"`. */
  invalid?: boolean;
  /** Controlled revealed state. Pair with `onRevealChange`. */
  revealed?: boolean;
  /** Initial revealed state for uncontrolled use. Defaults to `false`. */
  defaultRevealed?: boolean;
  /** Called when the user clicks the eye toggle. Receives the next revealed state. */
  onRevealChange?: (revealed: boolean) => void;
  /**
   * Whether to render the eye toggle button. Defaults to `true`. Set
   * `revealable={false}` for compliance / kiosk screens where revealing
   * is forbidden — the input then behaves like a plain locked-down
   * `<input type='password'>`.
   */
  revealable?: boolean;
  /**
   * Opt-in caps-lock detection. When `true`, on every keypress the
   * input reads `event.getModifierState('CapsLock')`; when active, a
   * warning icon + polite `aria-live` announce it. Cleared on blur.
   *
   * Defaults to `false`. Opt in on screens where caps-lock matters
   * (login, password creation, password confirmation).
   */
  capsLockWarning?: boolean;
  /**
   * Opt-in wrong-keyboard-layout detection. When `true`, detects
   * keystrokes that produce non-ASCII single characters (e.g., Cyrillic
   * `ф` from a Russian layout). Shows a warning icon + polite live
   * region. Cleared on blur.
   *
   * Heuristic, not deterministic — any non-ASCII keystroke triggers.
   * Only enable when the system expects Latin-only password input.
   * Defaults to `false`.
   */
  wrongLayoutWarning?: boolean;
  /** Localized aria-labels for the toggle + warning live regions. */
  labels?: PasswordInputLabels;
}

/**
 * Password text field with a trailing eye toggle that flips the input
 * `type` between `'password'` and `'text'`. Optional opt-in caps-lock and
 * wrong-keyboard-layout warnings. Pair with `<PasswordStrengthMeter>` for
 * the canonical signup-form pattern.
 *
 * @example
 * <PasswordInput placeholder="Password" />
 *
 * @example
 * // Controlled reveal:
 * const [revealed, setRevealed] = useState(false);
 * <PasswordInput revealed={revealed} onRevealChange={setRevealed} />
 *
 * @example
 * // Login form with both warnings:
 * <PasswordInput
 *   name="password"
 *   capsLockWarning
 *   wrongLayoutWarning
 *   aria-describedby="pw-strength"
 * />
 * <PasswordStrengthMeter id="pw-strength" value={password} />
 *
 * @remarks When NOT to use
 * - Non-secret single-line text → use `<Input>`.
 * - Multi-line secrets (paste-only API tokens) → use `<Textarea>` (not shipped).
 * - Systems that allow non-Latin passwords → do NOT set `wrongLayoutWarning`.
 *
 * @remarks Anti-patterns
 * - ❌ `revealable={false}` + a non-password `<Input>` next to it for "Show in plaintext" UX. Just use `<Input>` directly.
 * - ❌ Wrapping in another `<label>` outside the component — we already render the input; an outer label nests poorly.
 * - ❌ Treating the default `<PasswordStrengthMeter>` scoring as a security control. It's a UX hint; pass `score` from zxcvbn or server-side validation for production.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      size = 'md',
      invalid,
      revealed,
      defaultRevealed,
      onRevealChange,
      revealable = true,
      capsLockWarning = false,
      wrongLayoutWarning = false,
      labels,
      className,
      disabled,
      onKeyDown,
      onBlur,
      ...props
    },
    ref,
  ) {
    const resolvedLabels = { ...DEFAULT_LABELS, ...labels };
    const iconSize = ICON_SIZE_FOR[size];

    const isControlled = revealed !== undefined;
    const [internalRevealed, setInternalRevealed] = useState(defaultRevealed ?? false);
    const currentRevealed = isControlled ? revealed : internalRevealed;

    const [capsOn, setCapsOn] = useState(false);
    const [wrongLayout, setWrongLayout] = useState(false);

    const handleToggle = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault(); // avoid focus jump on click
        const next = !currentRevealed;
        if (!isControlled) setInternalRevealed(next);
        onRevealChange?.(next);
      },
      [currentRevealed, isControlled, onRevealChange],
    );

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLInputElement>) => {
        if (capsLockWarning) {
          setCapsOn(e.getModifierState('CapsLock'));
        }
        if (wrongLayoutWarning) {
          // Heuristic: any single non-ASCII printable character → wrong layout.
          const isSingleChar = e.key.length === 1;
          const isAscii = /^[\x20-\x7E]$/.test(e.key);
          setWrongLayout(isSingleChar && !isAscii);
        }
        onKeyDown?.(e);
      },
      [capsLockWarning, wrongLayoutWarning, onKeyDown],
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setCapsOn(false);
        setWrongLayout(false);
        onBlur?.(e);
      },
      [onBlur],
    );

    const ToggleIcon = currentRevealed ? EyeOff : Eye;

    return (
      <div
        className={clsx(
          styles.wrapper,
          styles[`size-${size}`],
          invalid && styles.invalid,
          disabled && styles.disabled,
          className,
        )}
      >
        <input
          {...props}
          ref={ref}
          type={currentRevealed ? 'text' : 'password'}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={styles.input}
        />

        {capsLockWarning && capsOn && (
          <span aria-hidden="true" className={styles.warningIcon}>
            <ArrowBigUpDash size={iconSize} />
          </span>
        )}
        {wrongLayoutWarning && wrongLayout && (
          <span aria-hidden="true" className={styles.warningIcon}>
            <Languages size={iconSize} />
          </span>
        )}

        {revealable && (
          <button
            type="button"
            className={styles.toggleButton}
            aria-pressed={currentRevealed}
            aria-label={currentRevealed ? resolvedLabels.hide : resolvedLabels.show}
            onClick={handleToggle}
            disabled={disabled}
          >
            <ToggleIcon size={iconSize} aria-hidden="true" />
          </button>
        )}

        {/* Polite live regions for AT. Render unconditionally so the
            announce fires only when the textContent changes. */}
        {capsLockWarning && (
          <span role="status" aria-live="polite" className={styles.srOnly}>
            {capsOn ? resolvedLabels.capsLockOn : ''}
          </span>
        )}
        {wrongLayoutWarning && (
          <span role="status" aria-live="polite" className={styles.srOnly}>
            {wrongLayout ? resolvedLabels.wrongLayoutOn : ''}
          </span>
        )}
      </div>
    );
  },
);
```

- [ ] **Step 2: Write `PasswordInput.module.scss`**

```scss
@use '../../styles/mixins' as *;

// Mirrors DatePicker / DateRangePicker wrapper shape — same focus-within
// ring, same flex layout with trailing slot.
.wrapper {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-2);
  background: var(--color-bg);
  border: var(--border-width) solid var(--color-border-strong);
  border-radius: var(--radius-md);
  transition: border-color var(--transition-fast);

  &:focus-within {
    @include focus-ring;

    border-color: var(--color-accent);
  }
}

.invalid {
  border-color: var(--color-danger);

  &:focus-within {
    @include focus-ring(var(--ring-danger));

    border-color: var(--color-danger);
  }
}

.disabled {
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  cursor: not-allowed;
}

// The text input fills available space.
// Rule 4 note: `flex: 1` is internal layout — the public component IS this
// .wrapper; the input is its child.
.input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  color: var(--color-fg);

  &::placeholder {
    color: var(--color-fg-muted);
  }

  // Suppress browser-native reveal toggles (Edge / Chromium) so they
  // don't stack with ours.
  &::-ms-reveal,
  &::-ms-clear {
    display: none;
  }
}

// Warning slot icons — caps-lock + wrong-layout share styling.
.warningIcon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--color-warning);
}

.toggleButton {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--space-5);
  height: var(--space-5);
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-fg-muted);
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--color-bg-subtle);
    color: var(--color-fg);
  }

  &:focus-visible {
    @include focus-ring;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: var(--opacity-disabled);
  }
}

// Per-size — input height + font + button slot.
.size-sm .input {
  height: var(--size-sm);
  font-size: var(--font-size-sm);
}

.size-md .input {
  height: var(--size-md);
  font-size: var(--font-size-md);
}

.size-lg .input {
  height: var(--size-lg);
  font-size: var(--font-size-lg);
}

.size-lg .toggleButton {
  width: var(--space-6);
  height: var(--space-6);
}

// Visually-hidden recipe for the live-region spans.
// stylelint-disable property-disallowed-list -- visually-hidden recipe; not a layout property on the public component box.
.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
// stylelint-enable property-disallowed-list
```

- [ ] **Step 3: Gates**

```bash
cd /home/dpws/projects/design-system
npm run typecheck 2>&1 | tail -5
npm run lint:css 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/PasswordInput/PasswordInput.tsx \
        packages/design-system/src/components/PasswordInput/PasswordInput.module.scss
git commit -m "PasswordInput: new component — eye toggle, caps-lock + wrong-layout warnings"
```

---

## Task 3: `PasswordInput.test.tsx`

**Files:**

- Create: `packages/design-system/src/components/PasswordInput/PasswordInput.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { PasswordInput } from './PasswordInput';

describe('PasswordInput', () => {
  it('renders type="password" by default', () => {
    const { container } = render(<PasswordInput placeholder="pw" />);
    expect(container.querySelector('input')).toHaveAttribute('type', 'password');
  });

  it('toggle flips type to text and back; aria-pressed updates', async () => {
    const user = userEvent.setup();
    const { container } = render(<PasswordInput placeholder="pw" />);
    const input = container.querySelector('input')!;
    const button = screen.getByRole('button', { name: 'Show password' });
    expect(input).toHaveAttribute('type', 'password');
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);
    expect(input).toHaveAttribute('type', 'text');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBe(button);

    await user.click(button);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('controlled `revealed` + `onRevealChange` round-trip', async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    const { container, rerender } = render(
      <PasswordInput revealed={false} onRevealChange={handle} />,
    );
    expect(container.querySelector('input')).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button'));
    expect(handle).toHaveBeenCalledWith(true);
    rerender(<PasswordInput revealed={true} onRevealChange={handle} />);
    expect(container.querySelector('input')).toHaveAttribute('type', 'text');
  });

  it('defaultRevealed initializes uncontrolled state', () => {
    const { container } = render(<PasswordInput defaultRevealed />);
    expect(container.querySelector('input')).toHaveAttribute('type', 'text');
  });

  it('revealable={false} hides the toggle button entirely', () => {
    render(<PasswordInput revealable={false} placeholder="pw" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('labels overrides the toggle aria-labels', async () => {
    const user = userEvent.setup();
    render(<PasswordInput labels={{ show: 'Показать', hide: 'Скрыть' }} />);
    const button = screen.getByRole('button', { name: 'Показать' });
    await user.click(button);
    expect(screen.getByRole('button', { name: 'Скрыть' })).toBe(button);
  });

  it('applies size class names for sm / md / lg', () => {
    const { container, rerender } = render(<PasswordInput size="sm" />);
    expect(container.firstChild).toHaveClass(expect.stringMatching(/size-sm/));
    rerender(<PasswordInput size="md" />);
    expect(container.firstChild).toHaveClass(expect.stringMatching(/size-md/));
    rerender(<PasswordInput size="lg" />);
    expect(container.firstChild).toHaveClass(expect.stringMatching(/size-lg/));
  });

  it('defaults to size="md"', () => {
    const { container } = render(<PasswordInput />);
    expect(container.firstChild).toHaveClass(expect.stringMatching(/size-md/));
  });

  it('does NOT pass component size prop to DOM size attribute', () => {
    const { container } = render(<PasswordInput size="sm" />);
    expect(container.querySelector('input')).not.toHaveAttribute('size');
  });

  it('invalid sets aria-invalid + the invalid class', () => {
    const { container } = render(<PasswordInput invalid />);
    expect(container.querySelector('input')).toHaveAttribute('aria-invalid', 'true');
    expect(container.firstChild).toHaveClass(expect.stringMatching(/invalid/));
  });

  it('disabled propagates to input AND toggle', () => {
    render(<PasswordInput disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('forwards ref to the native input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<PasswordInput ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('merges className on the wrapper', () => {
    const { container } = render(<PasswordInput className="my-cls" />);
    expect(container.querySelector('div.my-cls')).not.toBeNull();
  });

  it('name + defaultValue round-trip via FormData', () => {
    render(
      <form data-testid="form">
        <PasswordInput name="password" defaultValue="hunter2" />
      </form>,
    );
    const fd = new FormData(screen.getByTestId('form') as HTMLFormElement);
    expect(fd.get('password')).toBe('hunter2');
  });

  it('capsLockWarning shows the icon + live region when caps-lock keydown event reports on', () => {
    const { container } = render(<PasswordInput capsLockWarning />);
    const input = container.querySelector('input')!;
    // Fire a keydown with getModifierState mocked to return true for CapsLock.
    fireEvent.keyDown(input, {
      key: 'a',
      getModifierState: (k: string) => k === 'CapsLock',
    });
    expect(container.querySelector('[role="status"]')).toHaveTextContent('Caps Lock is on');
  });

  it('capsLockWarning clears on blur', () => {
    const { container } = render(<PasswordInput capsLockWarning />);
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'a', getModifierState: () => true });
    fireEvent.blur(input);
    expect(container.querySelector('[role="status"]')?.textContent).toBe('');
  });

  it('capsLockWarning=false (default) — no warning even if keydown reports caps-lock on', () => {
    const { container } = render(<PasswordInput />);
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'a', getModifierState: () => true });
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('wrongLayoutWarning triggers on non-ASCII single-char keypress', () => {
    const { container } = render(<PasswordInput wrongLayoutWarning />);
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'ф', getModifierState: () => false });
    expect(container.querySelector('[role="status"]')).toHaveTextContent(
      'Possible wrong keyboard layout',
    );
  });

  it('wrongLayoutWarning does NOT trigger on ASCII keypress', () => {
    const { container } = render(<PasswordInput wrongLayoutWarning />);
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'a', getModifierState: () => false });
    expect(container.querySelector('[role="status"]')?.textContent).toBe('');
  });

  it('wrongLayoutWarning clears on blur', () => {
    const { container } = render(<PasswordInput wrongLayoutWarning />);
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'ф', getModifierState: () => false });
    fireEvent.blur(input);
    expect(container.querySelector('[role="status"]')?.textContent).toBe('');
  });

  it('both warnings simultaneously — capsLockWarning + wrongLayoutWarning render two live regions', () => {
    const { container } = render(<PasswordInput capsLockWarning wrongLayoutWarning />);
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, {
      key: 'ф',
      getModifierState: (k: string) => k === 'CapsLock',
    });
    const statuses = container.querySelectorAll('[role="status"]');
    expect(statuses).toHaveLength(2);
    const texts = Array.from(statuses).map((s) => s.textContent);
    expect(texts).toContain('Caps Lock is on');
    expect(texts).toContain('Possible wrong keyboard layout');
  });

  it('consumer onKeyDown still fires when capsLockWarning is on', () => {
    const handle = vi.fn();
    const { container } = render(<PasswordInput capsLockWarning onKeyDown={handle} />);
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'a', getModifierState: () => false });
    expect(handle).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Gates**

```bash
npm test --workspace=@eocrm/design-system --run -- src/components/PasswordInput 2>&1 | tail -8
```

All ~20 tests must pass.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/PasswordInput/PasswordInput.test.tsx
git commit -m "PasswordInput: unit tests — reveal toggle, caps-lock, wrong-layout, sizes, a11y"
```

---

## Task 4: `PasswordStrengthMeter.tsx` + `PasswordStrengthMeter.module.scss`

**Files:**

- Create: `packages/design-system/src/components/PasswordStrengthMeter/PasswordStrengthMeter.tsx`
- Create: `packages/design-system/src/components/PasswordStrengthMeter/PasswordStrengthMeter.module.scss`

- [ ] **Step 1: Write the TSX**

```tsx
import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './PasswordStrengthMeter.module.scss';

/** Numeric strength score, 0 (empty) – 4 (strong). */
export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrengthLabels {
  /** Label when value is empty / score is 0. Default: '' (no label). */
  empty?: string;
  /** Default: 'Weak'. */
  weak?: string;
  /** Default: 'Fair'. */
  fair?: string;
  /** Default: 'Good'. */
  good?: string;
  /** Default: 'Strong'. */
  strong?: string;
}

const DEFAULT_LABELS: Required<PasswordStrengthLabels> = {
  empty: '',
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

export interface PasswordStrengthMeterProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The password to evaluate. Required UNLESS `score` is provided. Evaluated
   * via the default scoring heuristic or a consumer-supplied `scoreFn`.
   */
  value?: string;
  /**
   * Pre-computed score (0–4). Wins over `value` + `scoreFn` when both are
   * present. Use this when scoring is done by zxcvbn or server-side.
   */
  score?: PasswordStrengthScore;
  /**
   * Custom scoring fn. Receives the password, returns 0–4. Defaults to a
   * length + character-class heuristic — fine for prototypes, NOT a
   * security control. Production should pass a real scorer via `score`.
   */
  scoreFn?: (value: string) => PasswordStrengthScore;
  /** Render the textual label next to the segments. Defaults to `true`. */
  showLabel?: boolean;
  /** Localized labels. */
  labels?: PasswordStrengthLabels;
}

/** Default heuristic — DO NOT TREAT AS A SECURITY CONTROL. */
function defaultScoreFn(pw: string): PasswordStrengthScore {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4) as PasswordStrengthScore;
}

const LABEL_KEY: Record<PasswordStrengthScore, keyof Required<PasswordStrengthLabels>> = {
  0: 'empty',
  1: 'weak',
  2: 'fair',
  3: 'good',
  4: 'strong',
};

/**
 * Visual 4-segment password-strength meter. Pluggable scoring; default
 * heuristic is intentionally crude — pass `score` from zxcvbn or a
 * server-side scorer for production. Use `aria-describedby` on a
 * `<PasswordInput>` to associate the meter with the field for AT.
 *
 * @example
 * <PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} />
 * <PasswordStrengthMeter value={pw} />
 *
 * @example
 * // Consumer-driven score (zxcvbn etc.):
 * <PasswordStrengthMeter score={zxcvbnScore(pw)} />
 *
 * @remarks When NOT to use
 * - As a security control. The default heuristic flags long+mixed
 *   passwords as "Strong" even when they're in a breach corpus.
 *   Production: server-side scoring + breach-list check.
 *
 * @remarks Anti-patterns
 * - ❌ `<PasswordStrengthMeter value={pw} score={4} />` — `score` wins,
 *   `value` is ignored. Pass one OR the other.
 */
export const PasswordStrengthMeter = forwardRef<HTMLDivElement, PasswordStrengthMeterProps>(
  function PasswordStrengthMeter(
    { value, score, scoreFn = defaultScoreFn, showLabel = true, labels, className, ...props },
    ref,
  ) {
    const resolved: PasswordStrengthScore = score ?? (value !== undefined ? scoreFn(value) : 0);
    const resolvedLabels = { ...DEFAULT_LABELS, ...labels };
    const labelText = resolvedLabels[LABEL_KEY[resolved]];

    return (
      <div
        ref={ref}
        className={clsx(styles.meter, styles[`score-${resolved}`], className)}
        {...props}
      >
        <div className={styles.segments} aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={clsx(styles.segment, i < resolved && styles.filled)} />
          ))}
        </div>
        {showLabel && <span className={styles.label}>{labelText}</span>}
        {/* Polite live region — announces label changes ("Weak" → "Fair") so
            screen-reader users hear progress as they type. */}
        <span role="status" aria-live="polite" className={styles.srOnly}>
          {labelText}
        </span>
      </div>
    );
  },
);
```

- [ ] **Step 2: Write the SCSS**

```scss
.meter {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
}

.segments {
  display: flex;
  flex: 1 1 auto;
  gap: var(--space-1);
  min-width: 0;
}

// Rule 4 note: `flex: 1` on .segments is internal layout of the meter
// component — the public box is .meter; .segments is its child.
.segment {
  flex: 1 1 0;
  height: var(--space-1);
  background: var(--color-bg-sunken);
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.label {
  flex-shrink: 0;
  font-size: var(--font-size-sm);
  color: var(--color-fg-muted);
}

// Per-score fill colors. `.filled` only applies to filled segments
// (n < score). Score 0 → no segments filled.
.score-1 .segment.filled {
  background: var(--color-danger);
}
.score-1 .label {
  color: var(--color-danger);
}

.score-2 .segment.filled {
  background: var(--color-warning);
}
.score-2 .label {
  color: var(--color-warning);
}

.score-3 .segment.filled {
  background: var(--color-warning);
}
.score-3 .label {
  color: var(--color-warning);
}

.score-4 .segment.filled {
  background: var(--color-success);
}
.score-4 .label {
  color: var(--color-success);
}

// Visually-hidden recipe for the live region.
// stylelint-disable property-disallowed-list -- visually-hidden recipe.
.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
// stylelint-enable property-disallowed-list
```

- [ ] **Step 3: Gates**

```bash
npm run typecheck 2>&1 | tail -3
npm run lint:css 2>&1 | tail -3
npm run build 2>&1 | tail -3
```

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/PasswordStrengthMeter/PasswordStrengthMeter.tsx \
        packages/design-system/src/components/PasswordStrengthMeter/PasswordStrengthMeter.module.scss
git commit -m "PasswordStrengthMeter: new component — 4-segment meter, pluggable scoring"
```

---

## Task 5: `PasswordStrengthMeter.test.tsx`

**Files:**

- Create: `packages/design-system/src/components/PasswordStrengthMeter/PasswordStrengthMeter.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
import { render } from '@testing-library/react';
import { createRef } from 'react';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

describe('PasswordStrengthMeter', () => {
  it('renders 4 segments', () => {
    const { container } = render(<PasswordStrengthMeter value="" />);
    expect(container.querySelectorAll('span[class*="segment"]')).toHaveLength(4);
  });

  it('empty value → score 0, label is empty by default', () => {
    const { container } = render(<PasswordStrengthMeter value="" />);
    expect(container.querySelector('span[class*="label"]')?.textContent).toBe('');
    expect(container.querySelectorAll('[class*="filled"]')).toHaveLength(0);
  });

  it('default heuristic — short password → score 1', () => {
    const { container } = render(<PasswordStrengthMeter value="hunter22" />); // 8 chars, lower + digit only
    // 8+ chars (1) → score 1
    expect(container.querySelectorAll('[class*="filled"]')).toHaveLength(1);
    expect(container.querySelector('span[class*="label"]')?.textContent).toBe('Weak');
  });

  it('default heuristic — 12+ chars + mixed case + digit + special → 4', () => {
    const { container } = render(<PasswordStrengthMeter value="Hunter2!@#xyz" />);
    expect(container.querySelectorAll('[class*="filled"]')).toHaveLength(4);
    expect(container.querySelector('span[class*="label"]')?.textContent).toBe('Strong');
  });

  it('score prop wins over value + scoreFn', () => {
    const { container } = render(
      <PasswordStrengthMeter value="weak" score={4} scoreFn={() => 0 as const} />,
    );
    expect(container.querySelectorAll('[class*="filled"]')).toHaveLength(4);
    expect(container.querySelector('span[class*="label"]')?.textContent).toBe('Strong');
  });

  it('custom scoreFn is called with the value', () => {
    const scoreFn = vi.fn().mockReturnValue(2 as const);
    const { container } = render(<PasswordStrengthMeter value="abc" scoreFn={scoreFn} />);
    expect(scoreFn).toHaveBeenCalledWith('abc');
    expect(container.querySelectorAll('[class*="filled"]')).toHaveLength(2);
  });

  it('showLabel={false} hides the textual label (but keeps the live region)', () => {
    const { container } = render(<PasswordStrengthMeter value="Hunter2!" showLabel={false} />);
    // The visible .label span is absent...
    expect(container.querySelector('span[class*="label"]:not([class*="srOnly"])')).toBeNull();
    // ...but the live region still exists.
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });

  it('labels override the default strings', () => {
    const { container } = render(
      <PasswordStrengthMeter
        value="hunter22"
        labels={{ weak: 'Слабый', fair: 'Норм', good: 'Хорошо', strong: 'Сильный' }}
      />,
    );
    expect(container.querySelector('span[class*="label"]')?.textContent).toBe('Слабый');
  });

  it('live region announces the label', () => {
    const { container } = render(<PasswordStrengthMeter value="Hunter2!@#xyz" />);
    expect(container.querySelector('[role="status"]')).toHaveTextContent('Strong');
  });

  it('forwards ref to the root div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<PasswordStrengthMeter value="x" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className on the root', () => {
    const { container } = render(<PasswordStrengthMeter value="x" className="my-cls" />);
    expect(container.querySelector('div.my-cls')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Gates**

```bash
npm test --workspace=@eocrm/design-system --run -- src/components/PasswordStrengthMeter 2>&1 | tail -8
```

All 11 tests must pass.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/PasswordStrengthMeter/PasswordStrengthMeter.test.tsx
git commit -m "PasswordStrengthMeter: tests — scoring, score override, labels, ref"
```

---

## Task 6: Barrels + src/index.ts re-exports

**Files:**

- Create: `packages/design-system/src/components/PasswordInput/index.ts`
- Create: `packages/design-system/src/components/PasswordStrengthMeter/index.ts`
- Modify: `packages/design-system/src/index.ts`

- [ ] **Step 1: PasswordInput barrel**

```ts
export { PasswordInput } from './PasswordInput';
export type {
  PasswordInputProps,
  PasswordInputSize,
  PasswordInputLabels,
} from './PasswordInput';
```

- [ ] **Step 2: PasswordStrengthMeter barrel**

```ts
export { PasswordStrengthMeter } from './PasswordStrengthMeter';
export type {
  PasswordStrengthMeterProps,
  PasswordStrengthScore,
  PasswordStrengthLabels,
} from './PasswordStrengthMeter';
```

- [ ] **Step 3: Re-export from `src/index.ts`**

Insert alphabetically (after `Popover`, before `Radio`):

```ts
export { PasswordInput } from './components/PasswordInput';
export type {
  PasswordInputProps,
  PasswordInputSize,
  PasswordInputLabels,
} from './components/PasswordInput';

export { PasswordStrengthMeter } from './components/PasswordStrengthMeter';
export type {
  PasswordStrengthMeterProps,
  PasswordStrengthScore,
  PasswordStrengthLabels,
} from './components/PasswordStrengthMeter';
```

- [ ] **Step 4: Gates + commit**

```bash
npm run typecheck 2>&1 | tail -3
npm run build 2>&1 | tail -3
git add packages/design-system/src/components/PasswordInput/index.ts \
        packages/design-system/src/components/PasswordStrengthMeter/index.ts \
        packages/design-system/src/index.ts
git commit -m "Password: re-export PasswordInput + PasswordStrengthMeter from barrels (Rule 5)"
```

---

## Task 7: Playground demos + wiring

**Files:**

- Create: `packages/playground/src/pages/components/PasswordInputDemo.tsx`
- Create: `packages/playground/src/pages/components/PasswordStrengthMeterDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Write `PasswordInputDemo.tsx`**

12 examples per the spec — Default / Sizes / Controlled / No-toggle / Caps-lock / Wrong-layout / Both warnings / Disabled / Invalid / Localized / Form / With strength meter.

Use the existing `DemoLayout` + `Example` + `InputExample` pattern. Module-level helper components for the controlled/composition examples (matching the `ControlledDemo` / `FormDemo` style used by other demos).

- [ ] **Step 2: Write `PasswordStrengthMeterDemo.tsx`**

4 examples — Live with PasswordInput / Standalone slider-driven score / showLabel=false / Localized labels.

- [ ] **Step 3: Wire `App.tsx`**

Add 2 imports + 2 routes (`/components/password-input` and `/components/password-strength-meter`).

- [ ] **Step 4: Wire `AppShell.tsx`**

Add 2 Forms-group entries alphabetically. Icons: `KeyRound` (PasswordInput) + `ShieldCheck` (PasswordStrengthMeter).

- [ ] **Step 5: Wire `ComponentsIndex.tsx`**

Add 2 cards. Imports as needed. Place between Input and Radio alphabetically.

- [ ] **Step 6: Wire `registry.ts`**

Add `'PasswordInput'` and `'PasswordStrengthMeter'` to the `ComponentName` union.

- [ ] **Step 7: Gates + smoke**

```bash
npm run typecheck 2>&1 | tail -5
npm run build 2>&1 | tail -5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/components/password-input
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/components/password-strength-meter
```

- [ ] **Step 8: Commit**

```bash
git add packages/playground/src/
git commit -m "Playground: PasswordInputDemo + PasswordStrengthMeterDemo + wiring"
```

---

## Task 8: AGENTS.md sections

**Files:**

- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Insert after `<Input>`**

Two new sections (`<PasswordInput>` then `<PasswordStrengthMeter>`). Document:

- PasswordInput: revealable toggle, capsLockWarning + wrongLayoutWarning opt-in, labels, sizes.
- PasswordStrengthMeter: value vs score modes, default-heuristic-is-not-security disclaimer, polite live region.

- [ ] **Step 2: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "AGENTS.md: document PasswordInput + PasswordStrengthMeter"
```

---

## Task 9: Final gates + Hard Rule 8 + PR

- [ ] **Step 1: Prettier write**

```bash
npx prettier --write "packages/**/src/**/*.{ts,tsx,scss}" "docs/**/*.md" "packages/design-system/AGENTS.md"
git add -A packages/ docs/
git commit -m "Prettier: format password-input changes" || echo "no formatting changes"
```

- [ ] **Step 2: Full gates**

```bash
npm test --workspace=@eocrm/design-system --run 2>&1 | tail -5
npm run typecheck 2>&1 | tail -5
npm run lint:css 2>&1 | tail -5
npm run build 2>&1 | tail -5
npx prettier --check "packages/**/src/**/*.{ts,tsx,scss}" "docs/**/*.md" "packages/design-system/AGENTS.md" 2>&1 | tail -3
npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -cE "\.test\."
```

- [ ] **Step 3: Push**

```bash
git push -u origin feat/password-input
```

- [ ] **Step 4: Hard Rule 8 review cycle**

Dispatch a fresh-context review agent. Specifics:

- `Omit<…, 'size' | 'type'>` on PasswordInputProps — verify.
- `aria-pressed` on the toggle button — verify changes between false / true.
- `getModifierState` mock pattern in tests — verify `fireEvent.keyDown` with a custom `getModifierState` actually fires.
- Live-region pattern — two `role="status" aria-live="polite"` spans render only when their respective opt-in props are on; their textContent is "" when not triggered (so AT doesn't double-announce).
- Default `scoreFn` returns 0–4 ONLY (never out of range).
- `score` prop wins over `value` + `scoreFn`.
- The `::-ms-reveal { display: none }` rule is in the SCSS.

- [ ] **Step 5: Fix Critical + Important findings; re-push; re-review until clean.**

- [ ] **Step 6: Open PR**

PR title: `PasswordInput + PasswordStrengthMeter: eye toggle, caps-lock + wrong-layout warnings, pluggable scoring`.

Body lists both components, all the opt-in prop names, the heuristic-not-secure disclaimer, the unblock-for-signup-flows note.

---

## Self-review notes

Spec coverage:

- §PasswordInput API → Task 2 (TSX).
- §PasswordInput visual / tokens → Task 2 (SCSS).
- §PasswordInput states (caps + wrong-layout) → Task 2 (event handlers) + Task 3 (tests).
- §A11y → Task 2 (live regions + aria-pressed).
- §PasswordStrengthMeter → Tasks 4, 5.
- §Tests → Tasks 3, 5.
- §Demos → Task 7.
- §AGENTS.md → Task 8.

Type consistency:

- `PasswordInputSize = 'sm' | 'md' | 'lg'` matches Input / Select / DatePicker.
- `PasswordStrengthScore = 0 | 1 | 2 | 3 | 4` is the only union; default scoring clamps to it.
- All re-exported from both barrels.

No placeholders. All paths absolute. Each commit scoped.
