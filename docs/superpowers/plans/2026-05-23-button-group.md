# ButtonGroup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<ButtonGroup>` — a compound component with two modes: stateless visual joining of `<Button>` children, OR a state-managed segmented radiogroup with `<ButtonGroup.Item>` children. Mode is determined by the presence of `value` + `onValueChange` props.

**Architecture:** Single compound component (`ButtonGroup.Item` attached via Object.assign) backed by a context provider. Visual mode renders `<Button>` children directly with `cloneElement` injecting the group's `size`; SCSS joins them via native `> button` selectors (no Button modification needed). Segmented mode uses `ButtonGroup.Item` children that register with the parent for keyboard navigation, render `role="radio"` with roving tabindex, and follow the WAI-ARIA APG radiogroup pattern (Arrow keys move + select, Home/End jump, wrap-around, skip disabled).

**Tech Stack:** React 18 + TypeScript (source-distributed). No new packages, no new tokens. CSS Modules + SCSS. Vitest + RTL.

**Source of truth:** `docs/superpowers/specs/2026-05-23-button-group-design.md` (commit `7ae45b4`).

**Branch:** `feat/button-group`. Commit per task. Open the PR after the Hard-Rule-8 cycle (Task 5).

---

## File Structure

```
packages/design-system/src/components/ButtonGroup/
  context.ts               ← ButtonGroupContext + useButtonGroupContext("Item") guard + type unions
  ButtonGroupItem.tsx      ← <ButtonGroup.Item> — segmented item, role="radio", reads context, registers for keyboard nav
  ButtonGroup.tsx          ← <ButtonGroup> root — mode branch, visual cloneElement, segmented context provider + keyboard handlers
  ButtonGroup.module.scss  ← Visual joined-borders + segmented pill-inset (branched via data-mode)
  ButtonGroup.test.tsx     ← ~22 cases across both modes incl. @ts-expect-error mutual-exclusion
  index.ts                 ← Public re-exports

packages/design-system/src/index.ts                            ← MODIFY: re-export ButtonGroup + types
packages/design-system/AGENTS.md                               ← MODIFY: add ButtonGroup TL;DR near Button

packages/playground/src/pages/components/ButtonGroupDemo.tsx   ← NEW: 6 examples
packages/playground/src/App.tsx                                ← MODIFY: route
packages/playground/src/layout/AppShell/AppShell.tsx           ← MODIFY: sidebar (Forms group, alongside Button)
packages/playground/src/pages/components/ComponentsIndex.tsx   ← MODIFY: overview card
packages/playground/src/pages/mockups/registry.ts              ← MODIFY: 'ButtonGroup' in ComponentName union
```

**Decomposition rationale:**

- One bundled commit for source + SCSS + barrel (Task 1). The four library files reference each other (context ↔ root ↔ item ↔ SCSS); splitting them into per-file commits would produce unreviewable intermediate states. Modal and Drawer use the same bundled approach.
- Tests as a separate commit (Task 2) so the test diff is reviewable in isolation.
- Exports + AGENTS.md in one task (Task 3). Both tiny and conceptually related.
- Playground + nav in one task (Task 4).
- Hard-Rule-8 closeout in one task (Task 5).

---

## Task 1 — Source bundle (context.ts + ButtonGroupItem.tsx + ButtonGroup.tsx + SCSS + index.ts)

Single commit for all library source. The four files cross-reference, so they land together.

**Files:**

- Create: `packages/design-system/src/components/ButtonGroup/context.ts`
- Create: `packages/design-system/src/components/ButtonGroup/ButtonGroupItem.tsx`
- Create: `packages/design-system/src/components/ButtonGroup/ButtonGroup.tsx`
- Create: `packages/design-system/src/components/ButtonGroup/ButtonGroup.module.scss`
- Create: `packages/design-system/src/components/ButtonGroup/index.ts`

- [ ] **Step 1: Verify branch + clean tree**

```bash
cd /home/dpws/projects/design-system
git status
git branch --show-current
git log --oneline -3
```

Expected:

- Branch: `feat/button-group`
- Working tree clean
- Most recent commit: `7ae45b4 ButtonGroup: design spec ...`

- [ ] **Step 2: Create the SCSS module**

```bash
mkdir -p packages/design-system/src/components/ButtonGroup
```

Create `packages/design-system/src/components/ButtonGroup/ButtonGroup.module.scss`:

```scss
@use '../../styles/mixins' as *;

// ─── Visual mode ────────────────────────────────────────────────────────
// Joined Button children: flatten inner borders, round outer corners.
// Targets the native `> button` element so we don't have to know Button's
// CSS Module hash.

.group[data-mode='visual'] {
  display: inline-flex;
}

.group[data-mode='visual'] > button {
  border-radius: 0;
  margin-left: calc(var(--border-width) * -1);
}

.group[data-mode='visual'] > button:first-child {
  margin-left: 0;
  border-top-left-radius: var(--radius-md);
  border-bottom-left-radius: var(--radius-md);
}

.group[data-mode='visual'] > button:last-child {
  border-top-right-radius: var(--radius-md);
  border-bottom-right-radius: var(--radius-md);
}

// Lift on hover/focus so the focus ring isn't clipped by neighbors.
.group[data-mode='visual'] > button:hover,
.group[data-mode='visual'] > button:focus-visible {
  position: relative;
  z-index: 1;
}

// ─── Segmented mode ─────────────────────────────────────────────────────
// Pill-inset look matching iOS / Material precedent. Owns its own styling
// — items are NOT Buttons, they're internal radio-role <button>s.

.group[data-mode='segmented'] {
  background: var(--color-bg-muted);
  border-radius: var(--radius-md);
  padding: 2px;
  display: inline-flex;
  gap: 2px;
}

.item {
  border: none;
  background: transparent;
  color: var(--color-fg-muted);
  cursor: pointer;
  font: inherit;
  white-space: nowrap;
  border-radius: calc(var(--radius-md) - 2px);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.item[data-selected] {
  background: var(--color-bg);
  color: var(--color-fg);
  box-shadow: var(--shadow-xs);
}

.item:hover:not([data-selected]):not([aria-disabled]) {
  color: var(--color-fg);
}

.item[aria-disabled] {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.item:focus-visible {
  @include focus-ring;

  outline: none;
}

// Size variants — match Button's --size-* scale for visual consistency.
.sizeXs {
  height: var(--size-xs);
  padding: 0 var(--space-2);
  font-size: var(--font-size-xs);
}

.sizeSm {
  height: var(--size-sm);
  padding: 0 var(--space-3);
  font-size: var(--font-size-sm);
}

.sizeMd {
  height: var(--size-md);
  padding: 0 var(--space-3);
  font-size: var(--font-size-md);
}

.sizeLg {
  height: var(--size-lg);
  padding: 0 var(--space-4);
  font-size: var(--font-size-md);
}
```

- [ ] **Step 3: Create the context module**

Create `packages/design-system/src/components/ButtonGroup/context.ts`:

```ts
import { createContext, useContext, type KeyboardEvent, type MutableRefObject } from 'react';
import type { ButtonSize } from '../Button';

/** Matches Button's size scale. */
export type ButtonGroupSize = ButtonSize;

export interface ButtonGroupContextValue {
  /** Currently-selected value. Set when in segmented mode. */
  value: string;
  /** Fires on selection change. */
  onValueChange: (next: string) => void;
  /** Group-level size, propagated to Items via context. */
  size: ButtonGroupSize;
  /** Group-level disabled. Individual Items can also be disabled. */
  disabled: boolean;
  /** Item registers itself on mount with its value, disabled flag, and a ref to its DOM node. */
  registerItem: (
    value: string,
    disabled: boolean,
    ref: MutableRefObject<HTMLButtonElement | null>,
  ) => void;
  /** Item unregisters on unmount. */
  unregisterItem: (value: string) => void;
  /** Item delegates its keydown to the parent for Arrow/Home/End handling. */
  handleItemKeyDown: (e: KeyboardEvent<HTMLButtonElement>, value: string) => void;
}

export const ButtonGroupContext = createContext<ButtonGroupContextValue | null>(null);

export function useButtonGroupContext(componentName: string): ButtonGroupContextValue {
  const ctx = useContext(ButtonGroupContext);
  if (!ctx) {
    throw new Error(`<ButtonGroup.${componentName}> must be used inside <ButtonGroup>.`);
  }
  return ctx;
}
```

- [ ] **Step 4: Create `ButtonGroupItem.tsx`**

```tsx
import { useEffect, useRef, type MutableRefObject, type ReactNode } from 'react';
import clsx from 'clsx';
import { useButtonGroupContext, type ButtonGroupSize } from './context';
import styles from './ButtonGroup.module.scss';

export interface ButtonGroupItemProps {
  /** Value emitted to `onValueChange` when this item is selected. */
  value: string;
  /** Per-item disabled. Group-level disabled is OR-merged. */
  disabled?: boolean;
  /** className merges onto the rendered <button>. */
  className?: string;
  children: ReactNode;
}

const sizeClass: Record<ButtonGroupSize, string> = {
  xs: styles.sizeXs,
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

/**
 * Segmented-mode item. Renders `<button role="radio">` with roving tabindex
 * and `aria-checked` driven by the parent's `value`. Registers itself with
 * the parent on mount for keyboard navigation.
 *
 * Must be used inside a `<ButtonGroup>` in segmented mode (where `value` +
 * `onValueChange` are set). Using `<ButtonGroup.Item>` in visual mode
 * (no `value` on the parent) throws at render time because there's no
 * `ButtonGroupContext` to register against — that's the intended guardrail.
 */
export function ButtonGroupItem({
  value,
  disabled = false,
  className,
  children,
}: ButtonGroupItemProps) {
  const ctx = useButtonGroupContext('Item');
  const ref = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    ctx.registerItem(value, disabled, ref as MutableRefObject<HTMLButtonElement | null>);
    return () => ctx.unregisterItem(value);
  }, [ctx, value, disabled]);

  const isSelected = ctx.value === value;
  const effectiveDisabled = disabled || ctx.disabled;

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-disabled={effectiveDisabled || undefined}
      tabIndex={isSelected ? 0 : -1}
      data-selected={isSelected ? '' : undefined}
      data-value={value}
      onClick={() => {
        if (effectiveDisabled) return;
        if (isSelected) return;
        ctx.onValueChange(value);
      }}
      onKeyDown={(e) => ctx.handleItemKeyDown(e, value)}
      className={clsx(styles.item, sizeClass[ctx.size], className)}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 5: Create `ButtonGroup.tsx` (root)**

This is the largest file in the bundle. It owns mode detection, visual-mode `cloneElement`, segmented-mode context provider, Item registration, and keyboard navigation.

```tsx
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { Button, type ButtonProps } from '../Button';
import {
  ButtonGroupContext,
  type ButtonGroupContextValue,
  type ButtonGroupSize,
} from './context';
import { ButtonGroupItem } from './ButtonGroupItem';
import styles from './ButtonGroup.module.scss';

export type { ButtonGroupSize } from './context';
export type { ButtonGroupItemProps } from './ButtonGroupItem';

interface ButtonGroupBase {
  /**
   * Size propagated to children. Per-child `size` (Button or Item) wins
   * when explicitly set. In visual mode this happens via cloneElement on
   * Button children. In segmented mode, `<ButtonGroup.Item>` reads from
   * context.
   */
  size?: ButtonGroupSize;
  /**
   * Disabled state for the whole group. In segmented mode this is
   * authoritative (all items become aria-disabled, clicks no-op). In
   * visual mode this is a no-op — pass `disabled` per `<Button>` instead.
   */
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

interface ButtonGroupVisualProps
  extends ButtonGroupBase,
    Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Visual mode marker. Never set; absence flips to visual. */
  value?: never;
  onValueChange?: never;
  /** Accessible name for the group landmark. Optional but recommended. */
  'aria-label'?: string;
}

interface ButtonGroupSegmentedProps<V extends string = string>
  extends ButtonGroupBase,
    Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Currently-selected item value. Triggers segmented mode. */
  value: V;
  /** Fired when a different Item is selected. */
  onValueChange: (next: V) => void;
  /** Required in segmented mode (radiogroup needs a label). */
  'aria-label': string;
  /** Alternative to aria-label: id of an external labelling element. */
  'aria-labelledby'?: string;
}

export type ButtonGroupProps = ButtonGroupVisualProps | ButtonGroupSegmentedProps;

interface RegisteredItem {
  value: string;
  disabled: boolean;
  ref: MutableRefObject<HTMLButtonElement | null>;
}

/**
 * Compound. Two modes:
 *
 * - **Visual** (no `value` prop): joins `<Button>` children into a single
 *   visual unit with shared borders and outer-only rounded corners. Use
 *   for toolbar action groups (Cut/Copy/Paste).
 *
 * - **Segmented** (`value` + `onValueChange`): single-select radiogroup
 *   with `<ButtonGroup.Item>` children. Use for view-mode toggles,
 *   timeframe filters, etc.
 *
 * Mode is determined by the presence of `value`. TypeScript enforces
 * "value AND onValueChange together OR neither" via a discriminated
 * union — passing one without the other is a compile error.
 *
 * @example
 * // Visual mode
 * <ButtonGroup aria-label="Edit actions">
 *   <Button>Cut</Button>
 *   <Button>Copy</Button>
 *   <Button>Paste</Button>
 * </ButtonGroup>
 *
 * @example
 * // Segmented mode
 * const [view, setView] = useState<'grid' | 'list' | 'calendar'>('grid');
 * <ButtonGroup value={view} onValueChange={setView} aria-label="View mode">
 *   <ButtonGroup.Item value="grid">Grid</ButtonGroup.Item>
 *   <ButtonGroup.Item value="list">List</ButtonGroup.Item>
 *   <ButtonGroup.Item value="calendar">Calendar</ButtonGroup.Item>
 * </ButtonGroup>
 *
 * @example
 * // Size propagation — group-level size flows to children.
 * <ButtonGroup size="sm">
 *   <Button>Cut</Button>      {/* size="sm" */}
 *   <Button>Copy</Button>     {/* size="sm" */}
 *   <Button size="md">Paste</Button>  {/* per-child override wins */}
 * </ButtonGroup>
 *
 * @remarks When NOT to use
 * - For routing-style tab strips that change page content — use `<Tabs>`.
 * - For multi-select toggles — compose with checkboxes.
 * - For non-button content groupings — use `<Cluster>` or `<Stack>`.
 *
 * @remarks Anti-patterns
 * - ❌ Mixing visual `<Button>` children with `<ButtonGroup.Item>` in the
 *   same group. Undefined behavior — pick one mode per ButtonGroup.
 * - ❌ Passing only `value` (no `onValueChange`) or only `onValueChange`
 *   (no `value`). TypeScript catches this; the runtime is also broken.
 * - ❌ Wrapping a `<ButtonGroup.Item>` in a user component. The Item's
 *   ref-registration depends on being a direct child so the parent can
 *   focus it on Arrow nav.
 */
export function ButtonGroupRoot(props: ButtonGroupProps) {
  const isSegmented = 'value' in props && props.value !== undefined;
  return isSegmented ? <Segmented {...(props as ButtonGroupSegmentedProps)} /> : <Visual {...(props as ButtonGroupVisualProps)} />;
}

function Visual({
  size = 'md',
  disabled: _disabled,
  children,
  className,
  style,
  'aria-label': ariaLabel,
  ...rest
}: ButtonGroupVisualProps) {
  // Inject size into Button children whose size isn't already set.
  const processed = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type !== Button) return child;
    const childProps = child.props as ButtonProps;
    if (childProps.size !== undefined) return child;
    return cloneElement(child as ReactElement<ButtonProps>, { size });
  });

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-mode="visual"
      className={clsx(styles.group, className)}
      style={style}
      {...rest}
    >
      {processed}
    </div>
  );
}

function Segmented({
  size = 'md',
  disabled = false,
  value,
  onValueChange,
  children,
  className,
  style,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...rest
}: ButtonGroupSegmentedProps) {
  const itemsRef = useRef<RegisteredItem[]>([]);

  const registerItem = useCallback(
    (itemValue: string, itemDisabled: boolean, ref: MutableRefObject<HTMLButtonElement | null>) => {
      const existing = itemsRef.current.findIndex((it) => it.value === itemValue);
      const entry: RegisteredItem = { value: itemValue, disabled: itemDisabled, ref };
      if (existing >= 0) {
        itemsRef.current[existing] = entry;
      } else {
        itemsRef.current.push(entry);
      }
    },
    [],
  );

  const unregisterItem = useCallback((itemValue: string) => {
    itemsRef.current = itemsRef.current.filter((it) => it.value !== itemValue);
  }, []);

  // Dev warning: aria-label or aria-labelledby required in segmented mode.
  // Deferred via queueMicrotask so any children that might set labelledby refs
  // (rare for ButtonGroup, but matches the pattern Modal/Drawer use) get a chance.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!ariaLabel && !ariaLabelledBy) {
        // eslint-disable-next-line no-console
        console.warn(
          '<ButtonGroup> in segmented mode requires an `aria-label` or `aria-labelledby` prop for screen readers.',
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ariaLabel, ariaLabelledBy]);

  const handleItemKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, currentValue: string) => {
      const enabled = itemsRef.current.filter((it) => !it.disabled);
      if (enabled.length === 0) return;
      const idx = enabled.findIndex((it) => it.value === currentValue);
      if (idx === -1) return;

      let nextIdx: number | null = null;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIdx = (idx + 1) % enabled.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIdx = (idx - 1 + enabled.length) % enabled.length;
          break;
        case 'Home':
          nextIdx = 0;
          break;
        case 'End':
          nextIdx = enabled.length - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      const next = enabled[nextIdx]!;
      if (!disabled) onValueChange(next.value);
      next.ref.current?.focus();
    },
    [disabled, onValueChange],
  );

  const contextValue = useMemo<ButtonGroupContextValue>(
    () => ({
      value,
      onValueChange: onValueChange as (next: string) => void,
      size,
      disabled,
      registerItem,
      unregisterItem,
      handleItemKeyDown,
    }),
    [value, onValueChange, size, disabled, registerItem, unregisterItem, handleItemKeyDown],
  );

  return (
    <ButtonGroupContext.Provider value={contextValue}>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-disabled={disabled || undefined}
        data-mode="segmented"
        className={clsx(styles.group, className)}
        style={style}
        {...rest}
      >
        {children}
      </div>
    </ButtonGroupContext.Provider>
  );
}

/** Compound: `<ButtonGroup>` with `<ButtonGroup.Item>` attached. */
export const ButtonGroup = Object.assign(ButtonGroupRoot, { Item: ButtonGroupItem });
```

- [ ] **Step 6: Create `index.ts`**

```ts
export { ButtonGroup } from './ButtonGroup';
export type { ButtonGroupProps, ButtonGroupSize, ButtonGroupItemProps } from './ButtonGroup';
```

- [ ] **Step 7: Verify build + lint**

```bash
cd /home/dpws/projects/design-system
make build-lib 2>&1 | tail -5
make lint 2>&1 | tail -5
```

Expected: both clean. If stylelint flags raw `2px` values, those are unavoidable for the segmented padding/gap (matches iOS / Material precedent on inset pill width); add `// stylelint-disable-next-line scale-unlimited/declaration-strict-value` if needed. Hovering / focus rule modifications matching Button precedent.

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/ButtonGroup/context.ts \
        packages/design-system/src/components/ButtonGroup/ButtonGroupItem.tsx \
        packages/design-system/src/components/ButtonGroup/ButtonGroup.tsx \
        packages/design-system/src/components/ButtonGroup/ButtonGroup.module.scss \
        packages/design-system/src/components/ButtonGroup/index.ts
git commit -m "$(cat <<'EOF'
ButtonGroup: compound with visual + segmented modes

- Visual mode wraps <Button> children, joins them via native > button
  CSS selectors (no Button modification), uses cloneElement to inject
  the group's size into children that don't set their own.
- Segmented mode uses <ButtonGroup.Item> children with role="radio",
  roving tabindex, and full WAI-ARIA APG keyboard navigation
  (Arrow keys / Home / End, wrap-around, skip disabled).
- Discriminated-union props enforce value + onValueChange together
  via TypeScript `never`.
- aria-label required in segmented mode (deferred dev warning).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Unit tests

~22 cases covering both modes plus the TS-level `@ts-expect-error` for the discriminated union.

**Files:**

- Create: `packages/design-system/src/components/ButtonGroup/ButtonGroup.test.tsx`

- [ ] **Step 1: Write the tests**

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState, type RefObject } from 'react';
import { Button } from '../Button';
import { ButtonGroup } from './ButtonGroup';

describe('<ButtonGroup> (visual mode)', () => {
  it('renders without crashing with default props', () => {
    render(
      <ButtonGroup>
        <Button>Cut</Button>
        <Button>Copy</Button>
      </ButtonGroup>,
    );
    expect(screen.getByText('Cut')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('root has role="group" and data-mode="visual"', () => {
    render(
      <ButtonGroup aria-label="Edit actions">
        <Button>Cut</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole('group', { name: 'Edit actions' });
    expect(group).toHaveAttribute('data-mode', 'visual');
  });

  it('aria-label passes through to root', () => {
    render(
      <ButtonGroup aria-label="Custom label">
        <Button>X</Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Custom label');
  });

  it('renders Button children as direct siblings (not wrapped)', () => {
    const { container } = render(
      <ButtonGroup>
        <Button>A</Button>
        <Button>B</Button>
      </ButtonGroup>,
    );
    const group = container.firstChild as HTMLElement;
    // Direct children of the group should be the <button> elements themselves.
    expect(group.children).toHaveLength(2);
    expect(group.children[0]!.tagName).toBe('BUTTON');
    expect(group.children[1]!.tagName).toBe('BUTTON');
  });

  it('propagates size to Button children that have no size set', () => {
    render(
      <ButtonGroup size="sm">
        <Button>A</Button>
      </ButtonGroup>,
    );
    const btn = screen.getByText('A');
    // Button's `.sm` size class should be on the rendered <button>.
    expect(btn.className).toMatch(/sm/);
  });

  it('per-Button size overrides group size', () => {
    render(
      <ButtonGroup size="sm">
        <Button size="lg">Big</Button>
      </ButtonGroup>,
    );
    const btn = screen.getByText('Big');
    expect(btn.className).toMatch(/lg/);
    expect(btn.className).not.toMatch(/\bsm\b/);
  });

  it('passes non-Button children through unchanged', () => {
    render(
      <ButtonGroup size="sm">
        <Button>A</Button>
        <span data-testid="divider">|</span>
        <Button>B</Button>
      </ButtonGroup>,
    );
    const divider = screen.getByTestId('divider');
    // The span shouldn't receive any size-related transformation.
    expect(divider.className).toBe('');
  });

  it('merges className onto root', () => {
    const { container } = render(
      <ButtonGroup className="custom-class">
        <Button>A</Button>
      </ButtonGroup>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/custom-class/);
  });
});

describe('<ButtonGroup> (segmented mode)', () => {
  function Controlled({ initial = 'a', disabled }: { initial?: string; disabled?: boolean }) {
    const [v, setV] = useState(initial);
    return (
      <ButtonGroup value={v} onValueChange={setV} aria-label="Choices" disabled={disabled}>
        <ButtonGroup.Item value="a">Option A</ButtonGroup.Item>
        <ButtonGroup.Item value="b">Option B</ButtonGroup.Item>
        <ButtonGroup.Item value="c">Option C</ButtonGroup.Item>
      </ButtonGroup>
    );
  }

  it('renders as role="radiogroup" with data-mode="segmented"', () => {
    render(<Controlled />);
    const group = screen.getByRole('radiogroup', { name: 'Choices' });
    expect(group).toHaveAttribute('data-mode', 'segmented');
  });

  it('selected item has aria-checked=true; others have aria-checked=false', () => {
    render(<Controlled initial="b" />);
    expect(screen.getByRole('radio', { name: 'Option A' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('radio', { name: 'Option B' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Option C' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('roving tabindex: selected item is 0, others are -1', () => {
    render(<Controlled initial="b" />);
    expect(screen.getByRole('radio', { name: 'Option A' }).tabIndex).toBe(-1);
    expect(screen.getByRole('radio', { name: 'Option B' }).tabIndex).toBe(0);
    expect(screen.getByRole('radio', { name: 'Option C' }).tabIndex).toBe(-1);
  });

  it('click an unselected item fires onValueChange with that value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ButtonGroup value="a" onValueChange={onValueChange} aria-label="x">
        <ButtonGroup.Item value="a">A</ButtonGroup.Item>
        <ButtonGroup.Item value="b">B</ButtonGroup.Item>
      </ButtonGroup>,
    );
    await user.click(screen.getByRole('radio', { name: 'B' }));
    expect(onValueChange).toHaveBeenCalledWith('b');
  });

  it('click an already-selected item does NOT fire onValueChange', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ButtonGroup value="a" onValueChange={onValueChange} aria-label="x">
        <ButtonGroup.Item value="a">A</ButtonGroup.Item>
        <ButtonGroup.Item value="b">B</ButtonGroup.Item>
      </ButtonGroup>,
    );
    await user.click(screen.getByRole('radio', { name: 'A' }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('ArrowRight from selected item moves selection + focus to next item', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="a" />);
    const itemA = screen.getByRole('radio', { name: 'Option A' });
    itemA.focus();
    await user.keyboard('{ArrowRight}');
    const itemB = screen.getByRole('radio', { name: 'Option B' });
    expect(itemB).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(itemB);
  });

  it('ArrowLeft from selected item moves to previous item', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="b" />);
    const itemB = screen.getByRole('radio', { name: 'Option B' });
    itemB.focus();
    await user.keyboard('{ArrowLeft}');
    const itemA = screen.getByRole('radio', { name: 'Option A' });
    expect(itemA).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(itemA);
  });

  it('ArrowRight from last item wraps to first', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="c" />);
    const itemC = screen.getByRole('radio', { name: 'Option C' });
    itemC.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Option A' })).toHaveAttribute('aria-checked', 'true');
  });

  it('ArrowLeft from first item wraps to last', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="a" />);
    const itemA = screen.getByRole('radio', { name: 'Option A' });
    itemA.focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Option C' })).toHaveAttribute('aria-checked', 'true');
  });

  it('Home jumps to first item', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="c" />);
    const itemC = screen.getByRole('radio', { name: 'Option C' });
    itemC.focus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: 'Option A' })).toHaveAttribute('aria-checked', 'true');
  });

  it('End jumps to last item', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="a" />);
    const itemA = screen.getByRole('radio', { name: 'Option A' });
    itemA.focus();
    await user.keyboard('{End}');
    expect(screen.getByRole('radio', { name: 'Option C' })).toHaveAttribute('aria-checked', 'true');
  });

  it('Arrow navigation skips disabled items', async () => {
    const user = userEvent.setup();
    function H() {
      const [v, setV] = useState('a');
      return (
        <ButtonGroup value={v} onValueChange={setV} aria-label="x">
          <ButtonGroup.Item value="a">A</ButtonGroup.Item>
          <ButtonGroup.Item value="b" disabled>
            B
          </ButtonGroup.Item>
          <ButtonGroup.Item value="c">C</ButtonGroup.Item>
        </ButtonGroup>
      );
    }
    render(<H />);
    const itemA = screen.getByRole('radio', { name: 'A' });
    itemA.focus();
    await user.keyboard('{ArrowRight}');
    // Should skip B and land on C.
    expect(screen.getByRole('radio', { name: 'C' })).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'C' }));
  });

  it('group-level disabled: items get aria-disabled and clicks do not fire onValueChange', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ButtonGroup value="a" onValueChange={onValueChange} aria-label="x" disabled>
        <ButtonGroup.Item value="a">A</ButtonGroup.Item>
        <ButtonGroup.Item value="b">B</ButtonGroup.Item>
      </ButtonGroup>,
    );
    expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('radio', { name: 'B' }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('group-level disabled also sets aria-disabled on the radiogroup root', () => {
    render(
      <ButtonGroup value="a" onValueChange={() => {}} aria-label="x" disabled>
        <ButtonGroup.Item value="a">A</ButtonGroup.Item>
      </ButtonGroup>,
    );
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true');
  });

  it('warns in dev when segmented mode is used without aria-label or aria-labelledby', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // @ts-expect-error — intentionally omit required aria-label to trigger the runtime warning.
    render(
      <ButtonGroup value="a" onValueChange={() => {}}>
        <ButtonGroup.Item value="a">A</ButtonGroup.Item>
      </ButtonGroup>,
    );
    // Flush the microtask the warning is queued from.
    await new Promise((r) => setTimeout(r, 0));
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('<ButtonGroup> TypeScript-level', () => {
  it('value + onValueChange must be passed together (compile-time mutual exclusion)', () => {
    // @ts-expect-error — value without onValueChange should be a compile error.
    const A = <ButtonGroup value="x">{null}</ButtonGroup>;
    // @ts-expect-error — onValueChange without value should be a compile error.
    const B = <ButtonGroup onValueChange={() => {}}>{null}</ButtonGroup>;
    expect(A).toBeDefined();
    expect(B).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests — expect pass**

```bash
cd /home/dpws/projects/design-system
make test 2>&1 | tail -10
```

Expected: previous baseline + ~22 new ButtonGroup test cases pass. The structure test "ButtonGroup is re-exported from src/index.ts" will still FAIL — that's expected; Task 3 resolves it.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/ButtonGroup/ButtonGroup.test.tsx
git commit -m "$(cat <<'EOF'
ButtonGroup: unit tests

22 cases across both modes: visual (role=group, data-mode, size
propagation via cloneElement, non-Button passthrough, className merge);
segmented (radiogroup, aria-checked, roving tabindex, click selection,
Arrow keys / Home / End with wrap, skip disabled, group-level disabled,
dev warning). Plus a TS-level @ts-expect-error pair asserting that
value + onValueChange must be passed together.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Public exports + AGENTS.md TL;DR

**Files:**

- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Re-export from library root**

Open `packages/design-system/src/index.ts`. Find the Button export block. Append (ButtonGroup is a Button-shaped composite so it slots near Button):

```ts
export { ButtonGroup } from './components/ButtonGroup';
export type {
  ButtonGroupProps,
  ButtonGroupSize,
  ButtonGroupItemProps,
} from './components/ButtonGroup';
```

- [ ] **Step 2: Add ButtonGroup TL;DR to AGENTS.md**

Open `packages/design-system/AGENTS.md`. Find the `<Button>` TL;DR section. Add a new section RIGHT AFTER it:

````markdown
### `<ButtonGroup>` — joined Buttons + segmented control

```tsx
// Visual mode — joined Buttons, no shared state.
<ButtonGroup aria-label="Edit actions">
  <Button>Cut</Button>
  <Button>Copy</Button>
  <Button>Paste</Button>
</ButtonGroup>

// Segmented mode — single-select toggle group.
<ButtonGroup value={view} onValueChange={setView} aria-label="View mode">
  <ButtonGroup.Item value="grid">Grid</ButtonGroup.Item>
  <ButtonGroup.Item value="list">List</ButtonGroup.Item>
  <ButtonGroup.Item value="calendar">Calendar</ButtonGroup.Item>
</ButtonGroup>
```

- **Mode detection** is by props: with `value` + `onValueChange` you get segmented; without, you get visual joining.
- **Children differ by mode.** Visual: `<Button>` children. Segmented: `<ButtonGroup.Item>` children. Mixing the two is undefined behavior.
- **Size propagation** — `size` on the group propagates to children. Per-child override wins.
- **Keyboard nav (segmented only)** — Arrow keys move selection + focus; Home / End jump to ends; Tab moves IN/OUT of the group on the currently-selected item. Disabled items are skipped.
- **ARIA** — visual mode is `role="group"`; segmented mode is `role="radiogroup"` (requires `aria-label`).

**Anti-patterns:**

- ❌ Mixing visual `<Button>` children with `<ButtonGroup.Item>` in the same ButtonGroup — undefined behavior.
- ❌ Using ButtonGroup as a routing tab strip. That's what `<Tabs>` is for.
- ❌ Passing only `value` without `onValueChange` — type error.
- ❌ Multi-select via clever workarounds. Compose Checkboxes for that.

**See also:** `<Tabs>` for routing-style content switching, `<Radio>` for vertical radio lists.
````

- [ ] **Step 3: Run all gates**

```bash
cd /home/dpws/projects/design-system
make test 2>&1 | tail -8
make build-lib 2>&1 | tail -3
make lint 2>&1 | tail -3
```

Expected: all green. Structure test "ButtonGroup is re-exported from src/index.ts" should now pass.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/index.ts packages/design-system/AGENTS.md
git commit -m "$(cat <<'EOF'
ButtonGroup: public exports + AGENTS.md TL;DR

Library root re-exports ButtonGroup + 3 type exports (ButtonGroupProps,
ButtonGroupSize, ButtonGroupItemProps). AGENTS.md TL;DR sits next to
Button with canonical snippets for both modes plus anti-patterns.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — Playground demo + nav wiring (4 places)

**Files:**

- Create: `packages/playground/src/pages/components/ButtonGroupDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Write the demo**

Create `packages/playground/src/pages/components/ButtonGroupDemo.tsx`:

```tsx
import { useState } from 'react';
import { Button, ButtonGroup, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/ButtonGroup/ButtonGroup.tsx?raw';
import scssSource from '@lib-source/components/ButtonGroup/ButtonGroup.module.scss?raw';

export function ButtonGroupDemo() {
  return (
    <DemoLayout
      name="ButtonGroup"
      componentName="ButtonGroup"
      description="Compound with two modes. Visual mode joins <Button> children into a single unit (toolbar actions). Segmented mode (value + onValueChange) is a single-select radiogroup with arrow-key navigation (view toggles, timeframe filters)."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="ButtonGroup.tsx"
      scssFilename="ButtonGroup.module.scss"
    >
      <VisualSimpleExample />
      <VisualMixedVariantsExample />
      <SegmentedViewToggleExample />
      <SegmentedTimeframeExample />
      <SizePropagationExample />
      <SegmentedDisabledExample />
    </DemoLayout>
  );
}

function VisualSimpleExample() {
  return (
    <Example
      title="Visual: simple action group"
      description="Three Buttons joined into one visual unit. Each owns its own onClick — no shared state."
      code={`<ButtonGroup aria-label="Edit actions">
  <Button>Cut</Button>
  <Button>Copy</Button>
  <Button>Paste</Button>
</ButtonGroup>`}
    >
      <ButtonGroup aria-label="Edit actions">
        <Button variant="secondary">Cut</Button>
        <Button variant="secondary">Copy</Button>
        <Button variant="secondary">Paste</Button>
      </ButtonGroup>
    </Example>
  );
}

function VisualMixedVariantsExample() {
  return (
    <Example
      title="Visual: mixed variants"
      description='Mixed variants are intentionally allowed. A "Save" primary + "Discard" secondary in one group lets the primary visually dominate.'
      code={`<ButtonGroup aria-label="Save or discard">
  <Button>Save</Button>
  <Button variant="secondary">Discard</Button>
</ButtonGroup>`}
    >
      <ButtonGroup aria-label="Save or discard">
        <Button>Save</Button>
        <Button variant="secondary">Discard</Button>
      </ButtonGroup>
    </Example>
  );
}

function SegmentedViewToggleExample() {
  const [view, setView] = useState<'grid' | 'list' | 'calendar'>('grid');
  return (
    <Example
      title="Segmented: view toggle"
      description="Single-select radiogroup with Arrow-key keyboard navigation. Try Tab to focus the group, then ←/→ to move selection."
      code={`const [view, setView] = useState<'grid' | 'list' | 'calendar'>('grid');
<ButtonGroup value={view} onValueChange={setView} aria-label="View mode">
  <ButtonGroup.Item value="grid">Grid</ButtonGroup.Item>
  <ButtonGroup.Item value="list">List</ButtonGroup.Item>
  <ButtonGroup.Item value="calendar">Calendar</ButtonGroup.Item>
</ButtonGroup>`}
    >
      <Stack gap="sm">
        <ButtonGroup
          value={view}
          onValueChange={(v) => setView(v as 'grid' | 'list' | 'calendar')}
          aria-label="View mode"
        >
          <ButtonGroup.Item value="grid">Grid</ButtonGroup.Item>
          <ButtonGroup.Item value="list">List</ButtonGroup.Item>
          <ButtonGroup.Item value="calendar">Calendar</ButtonGroup.Item>
        </ButtonGroup>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
          Selected: <strong>{view}</strong>
        </div>
      </Stack>
    </Example>
  );
}

function SegmentedTimeframeExample() {
  const [tf, setTf] = useState<'day' | 'week' | 'month'>('week');
  return (
    <Example
      title="Segmented: timeframe filter"
      description="Same pattern, different content. Controlled via parent state."
      code={`<ButtonGroup value={tf} onValueChange={setTf} aria-label="Timeframe">
  <ButtonGroup.Item value="day">Day</ButtonGroup.Item>
  <ButtonGroup.Item value="week">Week</ButtonGroup.Item>
  <ButtonGroup.Item value="month">Month</ButtonGroup.Item>
</ButtonGroup>`}
    >
      <Stack gap="sm">
        <ButtonGroup
          value={tf}
          onValueChange={(v) => setTf(v as 'day' | 'week' | 'month')}
          aria-label="Timeframe"
        >
          <ButtonGroup.Item value="day">Day</ButtonGroup.Item>
          <ButtonGroup.Item value="week">Week</ButtonGroup.Item>
          <ButtonGroup.Item value="month">Month</ButtonGroup.Item>
        </ButtonGroup>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
          Selected: <strong>{tf}</strong>
        </div>
      </Stack>
    </Example>
  );
}

function SizePropagationExample() {
  return (
    <Example
      title="Size propagation"
      description="`size` on the group propagates to children. A per-child `size` override wins (third Button below)."
      code={`<ButtonGroup size="sm" aria-label="x">
  <Button>Cut</Button>     {/* sm */}
  <Button>Copy</Button>    {/* sm */}
  <Button size="md">Paste</Button>  {/* override */}
</ButtonGroup>`}
    >
      <ButtonGroup size="sm" aria-label="Demo">
        <Button variant="secondary">Cut</Button>
        <Button variant="secondary">Copy</Button>
        <Button size="md" variant="secondary">
          Paste (md override)
        </Button>
      </ButtonGroup>
    </Example>
  );
}

function SegmentedDisabledExample() {
  const [v, setV] = useState('a');
  return (
    <Example
      title="Disabled segmented"
      description="Group-level `disabled` freezes selection — clicks no-op, arrow keys still focus-move but onValueChange doesn't fire."
      code={`<ButtonGroup value={v} onValueChange={setV} aria-label="x" disabled>
  ...
</ButtonGroup>`}
    >
      <ButtonGroup value={v} onValueChange={setV} aria-label="Locked" disabled>
        <ButtonGroup.Item value="a">A</ButtonGroup.Item>
        <ButtonGroup.Item value="b">B</ButtonGroup.Item>
        <ButtonGroup.Item value="c">C</ButtonGroup.Item>
      </ButtonGroup>
    </Example>
  );
}
```

Match precedent: read `packages/playground/src/pages/components/ButtonDemo.tsx` for the exact `DemoLayout` / `Example` import paths and ComponentsIndex card style.

- [ ] **Step 2: Wire into the four playground integration points**

**App.tsx**:

```tsx
import { ButtonGroupDemo } from './pages/components/ButtonGroupDemo';
// Inside <Routes>:
<Route path="/components/button-group" element={<ButtonGroupDemo />} />;
```

**AppShell.tsx**: Add to the **Forms** group (alongside Button, Checkbox, Radio). Match the existing entry shape (icon + label). Use a `lucide-react` icon like `LayoutPanelLeft` or `Rows3` — whichever feels closer to "joined buttons".

```ts
{ to: '/components/button-group', label: 'ButtonGroup' }
```

**ComponentsIndex.tsx**: Add a card matching the shape of Button's card. Description: "Joined Buttons (toolbar action group) or single-select segmented control with arrow-key navigation."

**registry.ts**: Add `'ButtonGroup'` to the `ComponentName` union, alphabetical placement.

- [ ] **Step 3: Smoke test**

```bash
cd /home/dpws/projects/design-system
make build 2>&1 | tail -8
```

Both library and playground build cleanly.

- [ ] **Step 4: Commit**

```bash
git add packages/playground/src/pages/components/ButtonGroupDemo.tsx \
        packages/playground/src/App.tsx \
        packages/playground/src/layout/AppShell/AppShell.tsx \
        packages/playground/src/pages/components/ComponentsIndex.tsx \
        packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
playground: ButtonGroupDemo + nav wiring (4 places)

Six examples: visual simple action group, visual mixed variants,
segmented view toggle, segmented timeframe filter, size propagation
(with per-child override), and disabled segmented.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Hard-Rule-8 review-fix cycle + push + PR

Same shape as Modal / Drawer / Grid.

- [ ] **Step 1: Run all gates**

```bash
cd /home/dpws/projects/design-system
make test 2>&1 | tail -5
make build-lib 2>&1 | tail -3
make lint 2>&1 | tail -3
make build 2>&1 | tail -5
npm pack --dry-run --workspace @eocrm/design-system 2>&1 | grep -E "\.test\." | head -5 && echo "(should be empty)"
```

All exit 0 and no test files in the tarball.

- [ ] **Step 2: Spawn a fresh-context reviewer (opus)**

Use the `Agent` tool with `subagent_type: "general-purpose"`, model `opus`. Brief on the 10 review categories from `packages/design-system/CLAUDE.md` (Hard Rule 8). Point at:

- `packages/design-system/CLAUDE.md`
- `packages/design-system/AGENTS.md`
- `docs/superpowers/specs/2026-05-23-button-group-design.md`
- `packages/design-system/src/components/ButtonGroup/`
- `packages/design-system/src/components/Button/Button.tsx` (for the cloneElement-target invariant)
- `packages/design-system/src/index.ts`

ButtonGroup-specific things to scrutinize:

- Discriminated union actually enforces "value + onValueChange together OR neither" — the `@ts-expect-error` pair in tests must compile.
- The `cloneElement` only injects size into Button children (and only when child.props.size is undefined). Other children pass through unchanged.
- Visual mode's CSS join uses `> button` native selector and the resulting border-radius logic works across `:first-child`, `:last-child`, and middle children.
- Segmented mode keyboard nav: ArrowKey/Home/End behavior matches WAI-ARIA APG radiogroup pattern, including wrap-around and skip-disabled.
- Roving tabindex: exactly one item has `tabIndex=0` at all times (the selected one).
- Item registration / unregistration is correct across remounts.
- Dev warning fires only when aria-label/aria-labelledby are both missing in segmented mode.
- AGENTS.md TL;DR present near Button section.
- Stack/Cluster/Grid SCSS class naming precedent (camelCase) followed by `.sizeXs` / `.sizeSm` / `.sizeMd` / `.sizeLg`.

Output: Critical / Important / Nice-to-have / Regression-watch + verdict.

- [ ] **Step 3: Fix every Critical + Important finding**

For each, fix in code and re-run gates. Same iteration as Modal/Drawer/Grid.

- [ ] **Step 4: Spawn second reviewer with the same prompt**

Loop until verdict is "clean enough to stop".

- [ ] **Step 5: Commit review-cycle fixes (if any)**

```bash
git add -A
git commit -m "ButtonGroup: review-cycle fixes (round N)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 6: Push the branch**

```bash
git push -u origin feat/button-group
```

If Husky pre-push blocks on prettier:

```bash
npx prettier --write \
  docs/superpowers/plans/2026-05-23-button-group.md \
  docs/superpowers/specs/2026-05-23-button-group-design.md \
  packages/design-system/src/components/ButtonGroup/ \
  packages/design-system/src/index.ts \
  packages/design-system/AGENTS.md \
  packages/playground/src/pages/components/ButtonGroupDemo.tsx
git add -A
git commit -m "ButtonGroup: prettier --write

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

If Husky fires stylelint --fix changes, commit and push again.

- [ ] **Step 7: Open the PR**

```bash
gh pr create --title "ButtonGroup: joined Buttons + segmented control (compound, two modes)" --body "$(cat <<'EOF'
## Summary

- New `<ButtonGroup>` compound at `packages/design-system/src/components/ButtonGroup/`. Two modes:
  - **Visual** (no `value`): joins `<Button>` children into a single visual unit via native `> button` CSS selectors. Size propagated via `cloneElement` (no Button modification).
  - **Segmented** (`value` + `onValueChange`): single-select radiogroup with `<ButtonGroup.Item>` children. Full WAI-ARIA APG keyboard model (Arrow keys / Home / End, wrap-around, skip-disabled, roving tabindex).
- **TypeScript discriminated union** enforces "value + onValueChange together or neither" via `never` on the opposite branch.
- **`aria-label`** required in segmented mode; deferred dev warning if missing.
- **Sizes** match Button (`xs` / `sm` / `md` / `lg`). Per-child override wins over the group-level prop.

## Test plan

- [x] ~22 unit tests across both modes — visual (role=group, data-mode, size propagation, non-Button passthrough, className merge); segmented (radiogroup, aria-checked, roving tabindex, click selection, Arrow keys / Home / End with wrap, skip disabled, group-level disabled, dev warning).
- [x] TS `@ts-expect-error` pair asserting mutual prop requirement.
- [x] All gates green: tests, typecheck, stylelint, build, `npm pack --dry-run` shows no test files in the tarball.
- [x] Playground demo at `/components/button-group` with 6 examples.
- [x] Hard-Rule-8 review-fix cycle: clean exit.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Return the PR URL.

---

## Self-Review (controller, not subagent)

**Spec coverage:**

| Spec section                                      | Task implementing it     |
| ------------------------------------------------- | ------------------------ |
| Source bundle (context, item, root, SCSS, barrel) | 1                        |
| Discriminated-union props with `never`            | 1 (types) + 2 (TS test)  |
| Visual-mode `cloneElement` size propagation       | 1 (component) + 2 (test) |
| Segmented-mode context + Item registration        | 1                        |
| Roving tabindex + Arrow/Home/End keyboard nav     | 1 + 2                    |
| Skip-disabled arrow navigation                    | 1 + 2                    |
| Group-level disabled                              | 1 + 2                    |
| Dev warning for missing aria-label                | 1 + 2                    |
| SCSS visual joined-borders + segmented pill-inset | 1                        |
| Unit tests                                        | 2                        |
| Public exports + AGENTS.md                        | 3                        |
| Playground demo (6 examples)                      | 4                        |
| 4-place nav wiring                                | 4                        |
| Hard Rule 8                                       | 5                        |

**Placeholder scan:** None. Every step has the actual code or command.

**Type consistency:**

- `ButtonGroupSize` defined in `context.ts`, re-exported via `ButtonGroup.tsx`, used by `Item` and the size lookup table. Matches Button's `ButtonSize`.
- `ButtonGroupContextValue` defined in `context.ts`, used as the provider type in `Segmented`, consumed by `Item` via `useButtonGroupContext`.
- `ButtonGroupItemProps` defined in `ButtonGroupItem.tsx`, re-exported through `ButtonGroup.tsx` and `index.ts`.
- The discriminated union's `value?: never` / `onValueChange?: never` on `ButtonGroupVisualProps` matches the spec's mutual-exclusion model and the `@ts-expect-error` test in Task 2.
- `registerItem` / `unregisterItem` / `handleItemKeyDown` signatures match between `context.ts` (definition) and `ButtonGroup.tsx` (implementation).

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-23-button-group.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, two-stage review per task, same rhythm as recent components.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch with checkpoints.

Which approach?
