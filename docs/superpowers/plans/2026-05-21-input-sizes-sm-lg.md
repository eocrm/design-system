# Input field sizes `sm` + `lg` — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `size: 'sm' | 'md' | 'lg'` prop to `<Input>`, `<DatePicker>`, `<DateRangePicker>`. `<Select>` already has the same scale and needs no library code changes. `md` stays the default — no behavior change for existing consumers.

**Architecture:** Token-based SCSS modifier classes (`.size-sm`, `.size-md`, `.size-lg`) per component. Composite components (DP/DRP) also scale their inner clear ✕ and open-calendar button slots + the lucide icon size via a small per-size lookup constant.

**Tech Stack:** React, SCSS modules, Vitest + RTL.

**Branch:** `feat/input-sizes-xs-lg` (retained for continuity; `xs` deferred per the spec).

**Spec:** `docs/superpowers/specs/2026-05-21-input-sizes-xs-lg-design.md`.

---

## Task 1: Verify branch + hooks

- [ ] **Step 1: Verify branch + hooks installed**

```bash
git rev-parse --abbrev-ref HEAD   # → feat/input-sizes-xs-lg
git config --get core.hooksPath   # → .husky/_
test -x .husky/pre-push           # exit 0
```

Expected: branch matches, hooks path is `.husky/_`, pre-push exists.

---

## Task 2: `<Input>` — add `size` prop + SCSS

**Files:**

- Modify: `packages/design-system/src/components/Input/Input.tsx`
- Modify: `packages/design-system/src/components/Input/Input.module.scss`

- [ ] **Step 1: Update `Input.tsx`**

Replace the file body with:

```tsx
import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Input.module.scss';

/**
 * Field height + type scale. Pairs with `<Button>` and `<Select>` sizes.
 */
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * Toggles the error visual (red border + focus ring) and sets `aria-invalid="true"`.
   * Pair with a visible error message and `aria-describedby` pointing at the message id.
   */
  invalid?: boolean;
  /**
   * Visual size. Defaults to `'md'`.
   * - `'sm'` — 24px tall; toolbars, secondary forms.
   * - `'md'` — 32px tall (default); most form contexts.
   * - `'lg'` — 40px tall; hero search, mobile-friendly forms.
   *
   * Note: this shadows the native HTML `<input size>` attribute (visible
   * character count). If you need that legacy attribute, set width via
   * `style` or a parent container.
   */
  size?: InputSize;
}

/**
 * Single-line text input. Forwards all native `<input>` attributes — `type`,
 * `placeholder`, `value`/`onChange`, `disabled`, `readOnly`, `pattern`,
 * `autoComplete`, `inputMode`, etc. (The native HTML `size` attribute is
 * shadowed by the component-level `size` prop — see `InputProps.size`.)
 *
 * The component is intentionally dumb. Validation logic lives in your form
 * layer (React Hook Form + Zod recommended); pass the result down via `invalid`.
 *
 * @example
 * // Controlled, with a real label:
 * <label>
 *   Email
 *   <Input
 *     type="email"
 *     autoComplete="email"
 *     value={email}
 *     onChange={(e) => setEmail(e.target.value)}
 *   />
 * </label>
 *
 * @example
 * // Sized:
 * <Input size="sm" placeholder="Filter…" />
 * <Input size="lg" type="search" placeholder="Search the workspace" />
 *
 * @example
 * // Error state:
 * <Input invalid value={value} aria-describedby="email-error" />
 * <p id="email-error">Enter a valid email.</p>
 *
 * @remarks When NOT to use
 * - Multi-line → use `Textarea` (not yet shipped).
 * - Choosing from a fixed list → use `Select`.
 * - Date/time → use `DatePicker` / `DateRangePicker`.
 * - Password reveal/toggle → use `PasswordInput` (not yet shipped).
 *
 * @remarks Anti-patterns
 * - ❌ Putting validation logic *inside* the component. The Input is dumb on
 *   purpose — validation lives in your form layer.
 * - ❌ Using `placeholder` as a label. Placeholders disappear on focus. Use a
 *   real `<label>` and pair the Input with it.
 * - ❌ `type="number"` for things like phone numbers or zip codes — strips
 *   leading zeros and breaks formatting. Use `inputMode="numeric"` instead.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, size = 'md', className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      // Default aria-invalid to the `invalid` prop, then spread {...props} so
      // a consumer who explicitly passes aria-invalid (e.g. aria-invalid="false"
      // for a screen-reader workflow that distinguishes empty from invalid)
      // wins.
      aria-invalid={invalid || undefined}
      {...props}
      className={clsx(
        styles.input,
        styles[`size-${size}`],
        invalid && styles.invalid,
        className,
      )}
    />
  );
});
```

- [ ] **Step 2: Update `Input.module.scss`**

Replace the file body with:

```scss
.input {
  display: block;
  width: 100%;
  border: var(--border-width) solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: inherit;
  line-height: var(--line-height-normal);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);

  &::placeholder {
    color: var(--color-fg-subtle);
  }

  &:focus-visible {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 var(--ring-width) var(--ring-accent);
  }

  &:disabled {
    background: var(--color-bg-subtle);
    border-color: var(--color-border);
    color: var(--color-fg-subtle);
    cursor: not-allowed;
  }
}

// Size modifiers. md is the default — match the previous hard-coded values.
.size-sm {
  height: var(--size-sm);
  padding: 0 var(--space-2);
  font-size: var(--font-size-sm);
}

.size-md {
  height: var(--size-md);
  padding: 0 var(--space-3);
  font-size: var(--font-size-md);
}

.size-lg {
  height: var(--size-lg);
  padding: 0 var(--space-3);
  font-size: var(--font-size-lg);
}

.invalid {
  border-color: var(--color-danger);

  &:focus-visible {
    border-color: var(--color-danger);
    box-shadow: 0 0 0 var(--ring-width) var(--ring-danger);
  }
}
```

- [ ] **Step 3: Run gates**

```bash
cd /home/dpws/projects/design-system
npm test --workspace=@eocrm/design-system --run -- src/components/Input 2>&1 | tail -8
npm run typecheck 2>&1 | tail -5
npm run lint:css 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

Tests will likely still pass with default md behavior, but verify.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/Input/Input.tsx \
        packages/design-system/src/components/Input/Input.module.scss
git commit -m "Input: add size prop (sm | md | lg, default md)"
```

---

## Task 3: `<Input>` — tests + playground demo

**Files:**

- Modify: `packages/design-system/src/components/Input/Input.test.tsx`
- Modify: `packages/playground/src/pages/components/InputDemo.tsx`

- [ ] **Step 1: Update `Input.test.tsx` — add size tests**

Locate the existing test file. Find the closest analog to "applies className correctly" or the existing tests at the end of the file (after the rendering / variant / ref / className / invalid tests). Add these two tests at the end of the existing `describe`:

```tsx
it('applies size class names for sm / md / lg', () => {
  const { rerender, container } = render(<Input size="sm" />);
  expect(container.querySelector('input')!.className).toMatch(/size-sm/);
  rerender(<Input size="md" />);
  expect(container.querySelector('input')!.className).toMatch(/size-md/);
  rerender(<Input size="lg" />);
  expect(container.querySelector('input')!.className).toMatch(/size-lg/);
});

it('defaults to size="md" when no size prop is passed', () => {
  const { container } = render(<Input />);
  expect(container.querySelector('input')!.className).toMatch(/size-md/);
});

it('does NOT pass component size prop through to the DOM size attribute', () => {
  const { container } = render(<Input size="sm" />);
  expect(container.querySelector('input')).not.toHaveAttribute('size');
});
```

The third test enforces the `Omit<…, 'size'>` discipline. If anyone removes the Omit in a future refactor, the component's string `size` ("sm" / "md" / "lg") would propagate to the DOM `size` attribute. The native `size` only accepts numbers and the browser would coerce / drop the string, but it's still a DOM-attr leak; this test catches the regression.

- [ ] **Step 2: Update `InputDemo.tsx` — add a Sizes example**

After the existing "Default" example block (or wherever sizes naturally slot — match the file's existing order convention), add:

```tsx
<Example
  title="Sizes"
  description="Three sizes — sm (24px), md (32px, default), lg (40px). Use sm for dense toolbars, lg for hero / mobile-friendly forms."
  code={`<Input size="sm" placeholder="Filter…" />
<Input size="md" placeholder="Default" />
<Input size="lg" type="search" placeholder="Search the workspace" />`}
>
  <InputExample>
    <Stack gap="sm">
      <Input size="sm" placeholder="Filter…" aria-label="Small input" />
      <Input size="md" placeholder="Default" aria-label="Medium input" />
      <Input size="lg" type="search" placeholder="Search the workspace" aria-label="Large input" />
    </Stack>
  </InputExample>
</Example>
```

(`Stack` is already imported in `InputDemo.tsx`; no new imports needed.)

- [ ] **Step 3: Run gates**

```bash
npm test --workspace=@eocrm/design-system --run -- src/components/Input 2>&1 | tail -8
npm run typecheck 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/Input/Input.test.tsx \
        packages/playground/src/pages/components/InputDemo.tsx
git commit -m "Input: tests + demo for new size prop"
```

---

## Task 4: `<DatePicker>` — add `size` prop + SCSS

**Files:**

- Modify: `packages/design-system/src/components/DatePicker/DatePicker.tsx`
- Modify: `packages/design-system/src/components/DatePicker/DatePicker.module.scss`

- [ ] **Step 1: Read current `DatePicker.tsx`**

Spot where `DatePickerProps` is defined and where the wrapper `<div>` className gets composed. Note the `<input>` JSX, the `<button>` clear/open elements, and the `<CalendarIcon size={…} />` + `<X size={…} />` icon-size literals.

- [ ] **Step 2: Add `DatePickerSize` type + `size` prop**

Above `DatePickerLabels`:

```ts
/** Field height + type scale. Pairs with `<Input>` and `<Select>`. */
export type DatePickerSize = 'sm' | 'md' | 'lg';
```

In `DatePickerProps`:

- Add `'size'` to the existing `Omit<…>` (the type currently omits `'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max'` — append `| 'size'`).
- Add the new prop with JSDoc:

```ts
/**
 * Field height + type scale. Same scale as `<Input>`. Defaults to `'md'`.
 * Affects only the trigger row; the popover month grid is fixed-size.
 */
size?: DatePickerSize;
```

- [ ] **Step 3: Add the icon-size lookup constant**

Just below the `DEFAULT_LABELS` constant near the top of the file:

```ts
const ICON_SIZE_FOR: Record<DatePickerSize, number> = {
  sm: 14,
  md: 14,
  lg: 16,
};
```

- [ ] **Step 4: Destructure `size = 'md'` in the component**

Find the destructuring (currently destructures `value`, `defaultValue`, `onChange`, `min`, `max`, `clearable`, etc.). Add `size = 'md'` to the destructuring.

- [ ] **Step 5: Apply the size class on the wrapper**

The wrapper className currently composes something like `clsx(styles.wrapper, invalid && styles.invalid, disabled && styles.disabled, className)`. Extend it to:

```tsx
className={clsx(
  styles.wrapper,
  styles[`size-${size}`],
  invalid && styles.invalid,
  disabled && styles.disabled,
  className,
)}
```

- [ ] **Step 6: Use the icon-size lookup**

Replace the literal `size={14}` (or whatever the current value is) on `<CalendarIcon />` and `<X />` with `size={ICON_SIZE_FOR[size]}`. Verify those two icons are the ONLY lucide icons in this file that should scale; the chevrons inside the popover grid do NOT scale (they belong to `DatePickerGrid`).

- [ ] **Step 7: Update `DatePicker.module.scss`**

The existing `.input` block has hard-coded `height: var(--size-md)` and `font-size: var(--font-size-md)`. The existing `.clearButton, .openButton` block has hard-coded `width: var(--space-5)` and `height: var(--space-5)` (20px). Move these into size modifiers.

```scss
// Add to the END of the file, after the existing .popover block.

.size-sm {
  padding: 0 var(--space-2);

  .input {
    height: var(--size-sm);
    font-size: var(--font-size-sm);
  }
  .clearButton,
  .openButton {
    width: var(--space-5);
    height: var(--space-5);
  }
}

.size-md {
  padding: 0 var(--space-2);

  .input {
    height: var(--size-md);
    font-size: var(--font-size-md);
  }
  .clearButton,
  .openButton {
    width: var(--space-5);
    height: var(--space-5);
  }
}

.size-lg {
  padding: 0 var(--space-3);

  .input {
    height: var(--size-lg);
    font-size: var(--font-size-lg);
  }
  .clearButton,
  .openButton {
    width: var(--space-6); // 24px
    height: var(--space-6);
  }
}
```

Remove the hard-coded `height: var(--size-md)` + `font-size: var(--font-size-md)` from `.input` (those values now live in `.size-md .input`).

Remove the hard-coded `width: var(--space-5)` + `height: var(--space-5)` from `.clearButton, .openButton` (those values now live in each `.size-* .clearButton` / `.size-* .openButton`).

Also remove the wrapper's hard-coded `padding: 0 var(--space-2)` — that moves into the per-size modifiers above so `lg` can use `--space-3`.

- [ ] **Step 8: Run gates**

```bash
npm test --workspace=@eocrm/design-system --run -- src/components/DatePicker 2>&1 | tail -8
npm run typecheck 2>&1 | tail -5
npm run lint:css 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

Tests should still pass — the default behavior at `size="md"` mirrors the previous hard-coded values.

- [ ] **Step 9: Commit**

```bash
git add packages/design-system/src/components/DatePicker/DatePicker.tsx \
        packages/design-system/src/components/DatePicker/DatePicker.module.scss
git commit -m "DatePicker: add size prop (sm | md | lg, default md)"
```

---

## Task 5: `<DatePicker>` — tests + playground demo

**Files:**

- Modify: `packages/design-system/src/components/DatePicker/DatePicker.test.tsx`
- Modify: `packages/playground/src/pages/components/DatePickerDemo.tsx`

- [ ] **Step 1: Add size tests**

At the end of the existing `describe`:

```tsx
it('applies size class names for sm / md / lg', () => {
  const { rerender, container } = render(<DatePicker size="sm" aria-label="Sized" />);
  // The wrapper div carries the size-* class.
  expect(container.querySelector('div')!.className).toMatch(/size-sm/);
  rerender(<DatePicker size="md" aria-label="Sized" />);
  expect(container.querySelector('div')!.className).toMatch(/size-md/);
  rerender(<DatePicker size="lg" aria-label="Sized" />);
  expect(container.querySelector('div')!.className).toMatch(/size-lg/);
});

it('defaults to size="md" when no size prop is passed', () => {
  const { container } = render(<DatePicker aria-label="Default" />);
  expect(container.querySelector('div')!.className).toMatch(/size-md/);
});
```

If the existing test file imports `render` from a specific testing library wrapper, use the same import. Don't introduce a new import.

- [ ] **Step 2: Update `DatePickerPanel` (the `<XDemoPanel>` exported by DatePickerDemo.tsx)**

Add this Example block before `Form integration`:

```tsx
<Example
  title="Sizes"
  description="Three sizes — sm (24px), md (32px, default), lg (40px). The popover month grid is fixed-size; only the trigger row scales."
  code={`<DatePicker size="sm" defaultValue={new Date()} />
<DatePicker size="md" defaultValue={new Date()} />
<DatePicker size="lg" defaultValue={new Date()} />`}
>
  <InputExample>
    <Stack gap="sm">
      <DatePicker size="sm" defaultValue={TODAY} aria-label="Small date" />
      <DatePicker size="md" defaultValue={TODAY} aria-label="Medium date" />
      <DatePicker size="lg" defaultValue={TODAY} aria-label="Large date" />
    </Stack>
  </InputExample>
</Example>
```

(`Stack` and `TODAY` are already in scope per the unified DatePickersDemo conversion.)

- [ ] **Step 3: Run gates**

```bash
npm test --workspace=@eocrm/design-system --run -- src/components/DatePicker 2>&1 | tail -8
npm run typecheck 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/DatePicker/DatePicker.test.tsx \
        packages/playground/src/pages/components/DatePickerDemo.tsx
git commit -m "DatePicker: tests + demo for new size prop"
```

---

## Task 6: `<DateRangePicker>` — add `size` prop + SCSS

**Files:**

- Modify: `packages/design-system/src/components/DateRangePicker/DateRangePicker.tsx`
- Modify: `packages/design-system/src/components/DateRangePicker/DateRangePicker.module.scss`

- [ ] **Step 1: Mirror Task 4 exactly**

The DRP file structure is parallel to DatePicker: `DateRangePickerProps` `Omit`-list, wrapper className composition, clear/open buttons, CalendarIcon + X icons in those buttons. Apply the same edits:

- Add `export type DateRangePickerSize = 'sm' | 'md' | 'lg';`
- Add `'size'` to the `Omit<…>` in `DateRangePickerProps`.
- Add the `size?: DateRangePickerSize` prop with the same JSDoc as DatePicker.
- Add `const ICON_SIZE_FOR: Record<DateRangePickerSize, number> = { sm: 14, md: 14, lg: 16 };`.
- Destructure `size = 'md'` in the component.
- Add `styles[`size-${size}`]` to the wrapper className.
- Use `size={ICON_SIZE_FOR[size]}` on `<CalendarIcon />` and `<X />` inside the trigger (the chevrons inside the popover grids stay at their existing literal values).

- [ ] **Step 2: Mirror Task 4's SCSS changes**

`DateRangePicker.module.scss` has the same shape as DatePicker's. Move the hard-coded `.input` height + font + the hard-coded `.clearButton/.openButton` dimensions + the hard-coded wrapper `padding` into the same three `.size-sm / .size-md / .size-lg` modifier blocks.

- [ ] **Step 3: Gates**

```bash
npm test --workspace=@eocrm/design-system --run -- src/components/DateRangePicker 2>&1 | tail -8
npm run typecheck 2>&1 | tail -5
npm run lint:css 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/DateRangePicker/DateRangePicker.tsx \
        packages/design-system/src/components/DateRangePicker/DateRangePicker.module.scss
git commit -m "DateRangePicker: add size prop (sm | md | lg, default md)"
```

---

## Task 7: `<DateRangePicker>` — tests + playground demo

**Files:**

- Modify: `packages/design-system/src/components/DateRangePicker/DateRangePicker.test.tsx`
- Modify: `packages/playground/src/pages/components/DateRangePickerDemo.tsx`

- [ ] **Step 1: Add size tests**

Same shape as Task 5 Step 1, swapped for DateRangePicker. Use the test file's existing render-helper conventions.

- [ ] **Step 2: Add a Sizes Example to `DateRangePickerDemoPanel`**

```tsx
<Example
  title="Sizes"
  description="Three sizes — sm (24px), md (32px, default), lg (40px). The two-month popover grid is fixed-size; only the trigger row scales."
  code={`<DateRangePicker size="sm" defaultValue={{ start: today, end: in14 }} />
<DateRangePicker size="md" defaultValue={{ start: today, end: in14 }} />
<DateRangePicker size="lg" defaultValue={{ start: today, end: in14 }} />`}
>
  <InputExample>
    <Stack gap="sm">
      <DateRangePicker size="sm" defaultValue={{ start: TODAY, end: IN_14 }} aria-label="Small range" />
      <DateRangePicker size="md" defaultValue={{ start: TODAY, end: IN_14 }} aria-label="Medium range" />
      <DateRangePicker size="lg" defaultValue={{ start: TODAY, end: IN_14 }} aria-label="Large range" />
    </Stack>
  </InputExample>
</Example>
```

- [ ] **Step 3: Gates**

```bash
npm test --workspace=@eocrm/design-system --run -- src/components/DateRangePicker 2>&1 | tail -8
npm run typecheck 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/DateRangePicker/DateRangePicker.test.tsx \
        packages/playground/src/pages/components/DateRangePickerDemo.tsx
git commit -m "DateRangePicker: tests + demo for new size prop"
```

---

## Task 8: AGENTS.md sweep

**Files:**

- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Update the `<Input>` section**

Add this bullet at the appropriate position:

```
- Sizes: `sm` (24px) / `md` (32px, default) / `lg` (40px). Mirrors `<Button>` and `<Select>`.
```

- [ ] **Step 2: Update the `<DatePicker>` section**

Same bullet:

```
- Sizes: `sm` / `md` (default) / `lg`. Same scale as `<Input>`; affects the trigger row only — popover grid stays fixed.
```

- [ ] **Step 3: Update the `<DateRangePicker>` section**

```
- Sizes: `sm` / `md` (default) / `lg`. Same scale as `<DatePicker>`; popover (two-month grid) stays fixed.
```

- [ ] **Step 4: No change to `<Select>` section** — it already documents the three sizes.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "AGENTS.md: document new size prop on Input / DatePicker / DateRangePicker"
```

---

## Task 9: Final gates + Hard Rule 8 review cycle + PR

- [ ] **Step 1: Prettier --write everything**

```bash
npx prettier --write "packages/**/src/**/*.{ts,tsx,scss}" "docs/**/*.md" "packages/design-system/AGENTS.md"
```

Commit any drift:

```bash
git add -A packages/ docs/
git diff --cached --stat
git commit -m "Prettier: format size-prop changes" || echo "no formatting changes"
```

- [ ] **Step 2: Full gates**

```bash
cd /home/dpws/projects/design-system
npm test --workspace=@eocrm/design-system --run 2>&1 | tail -5
npm run typecheck 2>&1 | tail -5
npm run lint:css 2>&1 | tail -5
npm run build 2>&1 | tail -5
npx prettier --check "packages/**/src/**/*.{ts,tsx,scss}" "docs/**/*.md" "packages/design-system/AGENTS.md" 2>&1 | tail -3
npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -cE "\.test\."
```

Expected: all green; npm-pack count = 0.

- [ ] **Step 3: Push branch**

```bash
git push -u origin feat/input-sizes-xs-lg
```

- [ ] **Step 4: Hard Rule 8 review cycle 1**

Dispatch a fresh-context `general-purpose` review agent. Brief:

- Required reading: repo `CLAUDE.md`, package `CLAUDE.md`, `AGENTS.md`, the spec `docs/superpowers/specs/2026-05-21-input-sizes-xs-lg-design.md`, full branch diff `git diff main..HEAD -- packages/`.
- 10-category review (bugs, a11y, API consistency, type safety, Rules 1–7, test coverage, token discipline, SCSS, cross-package leakage, package/distribution).
- Specific things to look hard at:
  - The `Omit<…, 'size'>` in InputProps + DatePickerProps + DateRangePickerProps. Did anyone forget one? Does the test for "native size attr is omitted from DOM" actually catch a regression if the Omit is removed?
  - DatePicker / DRP `lg` button slots use `--space-6` (24px). Is that token meaningful for "control inline-button size" or is it spacing-only? (Acceptable either way; flag if a reviewer would dislike spacing→sizing reuse.)
  - The chevrons inside the popover grids (`DatePickerGrid.tsx`) MUST NOT scale — they live in fixed-size grid cells. Verify by checking the SCSS — no `.size-*` selectors should target `.navButton` or the popover.
  - Token discipline: all values come from `tokens.scss`; no `width: 16px` raw literals etc.
- Output: Critical / Important / Nice-to-have / Regression-watch + verdict (`clean enough to stop` or `keep iterating`).

- [ ] **Step 5: Fix critical + important findings, re-push, re-review until clean.**

- [ ] **Step 6: Open PR**

```bash
gh pr create --title "Input / DatePicker / DateRangePicker: add size prop (sm | md | lg)" --body "$(cat <<'EOF'
## Summary

- Added a `size: 'sm' | 'md' | 'lg'` prop to `<Input>`, `<DatePicker>`, and `<DateRangePicker>`. `md` stays the default — no behavior change for existing consumers.
- `<Select>` already exposes the same three sizes; no library changes there.
- Composite pickers (`DatePicker` / `DateRangePicker`) scale the trigger row, the inline clear ✕ and open-calendar button slots, and their lucide icon sizes. The popover month grid is intentionally NOT scaled.
- `Omit<…, 'size'>` added to the three components' props interfaces to shadow the native HTML `<input size>` attribute. A regression test enforces that the component-level `size` prop does NOT leak to the DOM `size` attribute.
- `xs` (20px) variant explicitly deferred — to be added when a real CRM screen demands it.

## Test plan

- [x] All tests pass — added size-class assertions to Input, DatePicker, DateRangePicker tests.
- [x] Regression test: `Input` does NOT propagate component `size` prop to the DOM `size` attribute.
- [x] Hard Rule 8 review cycles passed; final verdict: clean enough to stop.

## Design spec / plan

- Spec: `docs/superpowers/specs/2026-05-21-input-sizes-xs-lg-design.md`
- Plan: `docs/superpowers/plans/2026-05-21-input-sizes-sm-lg.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

Spec coverage:

- §The shared size scale → Tasks 2, 4, 6 (SCSS modifier classes per component).
- §`<Input>` → Tasks 2, 3.
- §`<Select>` (no change) → Task 8 (AGENTS.md unchanged) + no test/demo updates.
- §`<DatePicker>` → Tasks 4, 5.
- §`<DateRangePicker>` → Tasks 6, 7.
- §Test surface → Tasks 3, 5, 7 (size-class tests + Input Omit regression).
- §Playground demos → Tasks 3, 5, 7 (Sizes Example in each demo).
- §AGENTS.md → Task 8.
- §Risks (Omit discipline) → enforced by the Input "does NOT pass to DOM" test (Task 3).

Type consistency:

- `InputSize`, `DatePickerSize`, `DateRangePickerSize` — same string union shape (`'sm' | 'md' | 'lg'`), kept as separate exports so each component's prop docs read naturally.
- `Omit<…, 'size'>` appears on all three component props interfaces.
- `ICON_SIZE_FOR` constant — separate per component but identical shape.

No placeholders. All file paths absolute. All commit messages present. All TDD steps include test code AND implementation code.
