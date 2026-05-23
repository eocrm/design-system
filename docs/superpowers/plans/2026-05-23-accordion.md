# Accordion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<Accordion>` — a compound vertically-stacked collapsible-panels component. Two selection modes (`type="single"` with optional `collapsible`, `type="multiple"`), controlled + uncontrolled state, per-item `disabled` + custom trigger icon + configurable heading level, smooth CSS grid-template-rows animation, full WAI-ARIA APG keyboard support.

**Architecture:** Compound API via `Object.assign(AccordionRoot, { Item, Trigger, Content })`. Two contexts: `AccordionContext` (mode + isOpen + toggle + collapsible) and `AccordionItemContext` (value + disabled + isOpen + triggerId + contentId). Discriminated union on `type` drives the value-shape branch (`string` vs `string[]`). Keyboard nav uses DOM-order querying (no item registration). Content animation via `display: grid; grid-template-rows: 0fr → 1fr` (no JS measurement).

**Tech Stack:** React 19 + TypeScript (source-distributed). `clsx` for class composition. `lucide-react` peer dep (ChevronDown default indicator). CSS Modules + SCSS. Vitest + RTL + userEvent. No new packages, no new tokens.

**Source of truth:** `docs/superpowers/specs/2026-05-23-accordion-design.md` (commit `e83466d`).

**Branch:** `feat/accordion`. Commit per task. Open the PR after the Hard-Rule-8 cycle (Task 5).

---

## File Structure

```
packages/design-system/src/components/Accordion/
  Accordion.tsx           ← Task 1. Root + Object.assign compound. Single/multiple mode dispatch. Context provider.
  AccordionItem.tsx       ← Task 1. Item wrapper. Reads root context, provides AccordionItemContext.
  AccordionTrigger.tsx    ← Task 1. Heading-wrapped button with keyboard nav handler + default ChevronDown.
  AccordionContent.tsx    ← Task 1. Animated grid-row panel with role="region" + aria-labelledby.
  context.ts              ← Task 1. AccordionContext + AccordionItemContext + use* hooks.
  Accordion.module.scss   ← Task 1. Borders / triggers / content animation / disabled / focus-visible.
  index.ts                ← Task 1. Public re-exports.
  Accordion.test.tsx      ← Task 2. ~26 cases.

packages/design-system/src/index.ts                              ← Task 3. MODIFY: re-export Accordion + types.
packages/design-system/AGENTS.md                                 ← Task 3. MODIFY: TL;DR slot between Tabs and Breadcrumb.

packages/playground/src/pages/components/AccordionDemo.tsx       ← Task 4. NEW: 6 examples.
packages/playground/src/App.tsx                                  ← Task 4. MODIFY: route + import.
packages/playground/src/layout/AppShell/AppShell.tsx             ← Task 4. MODIFY: Navigation group, first item before Breadcrumb.
packages/playground/src/pages/components/ComponentsIndex.tsx     ← Task 4. MODIFY: overview card.
packages/playground/src/pages/mockups/registry.ts                ← Task 4. MODIFY: 'Accordion' first in ComponentName union.
```

**Decomposition rationale:**

- **Task 1 (source bundle)** lands all 8 source files in ONE commit. The 4 components + 2 contexts + SCSS cross-reference heavily; splitting per-file produces unreviewable intermediate states. Modal/Drawer/Toast used the same bundled approach for compound components.
- **Task 2 (tests)** lands separately — the ~26-case suite is ~500 lines on its own.
- **Task 3 (exports + AGENTS)** is small and conceptually paired.
- **Task 4 (playground demo + 4-place wiring)** is bundled so the demo lands routable in one commit.
- **Task 5 (Hard-Rule-8)** — gates, fresh-context reviewer, push, PR.

---

## Task 1 — Source bundle (8 files)

**Files:**

- Create: `packages/design-system/src/components/Accordion/context.ts`
- Create: `packages/design-system/src/components/Accordion/Accordion.tsx`
- Create: `packages/design-system/src/components/Accordion/AccordionItem.tsx`
- Create: `packages/design-system/src/components/Accordion/AccordionTrigger.tsx`
- Create: `packages/design-system/src/components/Accordion/AccordionContent.tsx`
- Create: `packages/design-system/src/components/Accordion/Accordion.module.scss`
- Create: `packages/design-system/src/components/Accordion/index.ts`

- [ ] **Step 1: Verify branch + clean tree**

```bash
cd /home/dpws/projects/design-system
git status
git branch --show-current
git log --oneline -3
```

Expected: branch `feat/accordion`, clean tree, most recent commit `e83466d Accordion: design spec`.

- [ ] **Step 2: Create the component directory + write the SCSS**

```bash
mkdir -p packages/design-system/src/components/Accordion
```

Create `packages/design-system/src/components/Accordion/Accordion.module.scss`:

```scss
@use '../../styles/mixins' as *;

.accordion {
  display: flex;
  flex-direction: column;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  overflow: hidden;
}

.item {
  border-bottom: var(--border-width) solid var(--color-border);
}

.item:last-child {
  border-bottom: 0;
}

.header {
  // stylelint-disable-next-line property-disallowed-list -- native heading margin reset
  margin: 0;
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-md);
}

.trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: transparent;
  border: 0;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  color: var(--color-fg);
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast);

  &:hover:not(:disabled) {
    background: var(--color-bg-muted);
  }

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 var(--ring-width) var(--ring-accent);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: var(--opacity-disabled);
  }
}

.label {
  flex: 1;
  min-width: 0;
}

.indicator {
  flex-shrink: 0;
  transition: transform var(--transition-fast);
  color: var(--color-fg-muted);
}

.item[data-state='open'] .indicator {
  transform: rotate(180deg);
}

.content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--transition-base);
}

.content[data-state='open'] {
  grid-template-rows: 1fr;
}

.inner {
  overflow: hidden;
}

.content[data-state='open'] .inner {
  padding: var(--space-3) var(--space-4);
}

@media (prefers-reduced-motion: reduce) {
  .content,
  .indicator {
    transition: none;
  }
}
```

- [ ] **Step 3: Write `context.ts`**

Create `packages/design-system/src/components/Accordion/context.ts`:

```ts
import { createContext, useContext } from 'react';

export interface AccordionContextValue {
  /** Selection mode. */
  mode: 'single' | 'multiple';
  /** Whether the given item value is currently open. */
  isOpen: (value: string) => boolean;
  /** Toggle the given item value. Closes others in single mode; flips membership in multiple mode. */
  toggle: (value: string) => void;
}

export const AccordionContext = createContext<AccordionContextValue | null>(null);

/**
 * Hook for child components to read the root context. Throws if used outside
 * an `<Accordion>` — surfaces the bug early instead of silently no-op'ing.
 */
export function useAccordionContext(componentName: string): AccordionContextValue {
  const ctx = useContext(AccordionContext);
  if (ctx === null) {
    throw new Error(`<Accordion.${componentName}> must be used inside <Accordion>`);
  }
  return ctx;
}

export interface AccordionItemContextValue {
  /** This item's unique value. */
  value: string;
  /** Whether the item is disabled (Trigger non-interactive, keyboard nav skips). */
  disabled: boolean;
  /** Whether the item is currently open (mirrored from root context for convenience). */
  isOpen: boolean;
  /** Stable id for the Trigger (so Content's aria-labelledby points at it). */
  triggerId: string;
  /** Stable id for the Content (so Trigger's aria-controls points at it). */
  contentId: string;
}

export const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

export function useAccordionItemContext(componentName: string): AccordionItemContextValue {
  const ctx = useContext(AccordionItemContext);
  if (ctx === null) {
    throw new Error(`<Accordion.${componentName}> must be used inside <Accordion.Item>`);
  }
  return ctx;
}
```

- [ ] **Step 4: Write `Accordion.tsx`** (root component)

Create `packages/design-system/src/components/Accordion/Accordion.tsx`:

```tsx
import {
  forwardRef,
  useCallback,
  useMemo,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { AccordionContext, type AccordionContextValue } from './context';
import { AccordionItem } from './AccordionItem';
import { AccordionTrigger } from './AccordionTrigger';
import { AccordionContent } from './AccordionContent';
import styles from './Accordion.module.scss';

/** Selection mode. */
export type AccordionMode = 'single' | 'multiple';

/** Heading level wrapping the trigger button. Defaults to 'h3'. */
export type AccordionHeaderLevel = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface AccordionBaseProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'defaultValue' | 'onChange'
> {
  children: ReactNode;
}

/** Root props — `type='single'` variant. */
interface AccordionSingleProps {
  type: 'single';
  /** Controlled open item value. `''` = nothing open (only meaningful when `collapsible`). */
  value?: string;
  /** Initial open item for uncontrolled use. */
  defaultValue?: string;
  /** Fires when the open item changes. */
  onValueChange?: (next: string) => void;
  /**
   * When true, clicking the currently-open item closes it. Default: `false`
   * (matches Radix; prevents accidentally closing the only available content).
   */
  collapsible?: boolean;
}

/** Root props — `type='multiple'` variant. */
interface AccordionMultipleProps {
  type: 'multiple';
  /** Controlled open items array. */
  value?: string[];
  /** Initial open items for uncontrolled use. */
  defaultValue?: string[];
  /** Fires when the set of open items changes. */
  onValueChange?: (next: string[]) => void;
  collapsible?: never;
}

/** Discriminated union — `type` drives which variant of value/onValueChange is required. */
export type AccordionProps = AccordionBaseProps & (AccordionSingleProps | AccordionMultipleProps);

/**
 * Vertically-stacked collapsible panels. Compound component:
 *
 * - `<Accordion>` — root (this component). Configures mode + state + collapsible.
 * - `<Accordion.Item value>` — one section, identified by a string value.
 * - `<Accordion.Trigger>` — clickable header (wrapped in `<h3>` by default).
 * - `<Accordion.Content>` — the collapsible body.
 *
 * Two modes via the discriminated `type` prop:
 * - `type='single'` — one item open at a time. Optional `collapsible` lets the user close the open item.
 * - `type='multiple'` — any combination of items can be open.
 *
 * Both controlled (`value` + `onValueChange`) and uncontrolled (`defaultValue`) supported.
 *
 * @example
 * // Single-open with collapsible (FAQ-style)
 * <Accordion type="single" collapsible defaultValue="faq-2">
 *   <Accordion.Item value="faq-1">
 *     <Accordion.Trigger>How do I reset my password?</Accordion.Trigger>
 *     <Accordion.Content>Visit Settings → Security → Reset.</Accordion.Content>
 *   </Accordion.Item>
 *   <Accordion.Item value="faq-2">
 *     <Accordion.Trigger>How do I export my data?</Accordion.Trigger>
 *     <Accordion.Content>Use the gear icon → Export → CSV.</Accordion.Content>
 *   </Accordion.Item>
 * </Accordion>
 *
 * @example
 * // Multiple — independent sections
 * <Accordion type="multiple" defaultValue={['account', 'notifications']}>
 *   <Accordion.Item value="account">...</Accordion.Item>
 *   <Accordion.Item value="notifications">...</Accordion.Item>
 * </Accordion>
 *
 * @example
 * // Controlled
 * const [open, setOpen] = useState('');
 * <Accordion type="single" collapsible value={open} onValueChange={setOpen}>
 *   ...
 * </Accordion>
 *
 * @remarks When NOT to use
 * - Mutually-exclusive view switchers → `<Tabs>`.
 * - Single show/hide toggle → `<Button>` + conditional render.
 * - Sequential wizard flows → dedicated Stepper (not yet shipped).
 *
 * @remarks Anti-patterns
 * - ❌ Nesting `<Accordion.Trigger>` inside a heading the consumer also renders. Trigger wraps itself in a heading.
 * - ❌ Manually setting `aria-expanded` on the Trigger via `{...props}`. The component owns the ARIA contract.
 * - ❌ Using `headerLevel="h1"`. There should only be one `<h1>` per page; Accordion lives below it.
 */
const AccordionRoot = forwardRef<HTMLDivElement, AccordionProps>(
  function AccordionRoot(props, ref) {
    if (props.type === 'single') {
      return <AccordionSingleImpl {...props} ref={ref} />;
    }
    return <AccordionMultipleImpl {...props} ref={ref} />;
  },
);

interface SingleImplProps extends AccordionBaseProps, AccordionSingleProps {}

const AccordionSingleImpl = forwardRef<HTMLDivElement, SingleImplProps>(
  function AccordionSingleImpl(
    {
      type: _type,
      value,
      defaultValue,
      onValueChange,
      collapsible = false,
      children,
      className,
      ...rest
    },
    ref,
  ) {
    const [internalValue, setInternalValue] = useState<string>(defaultValue ?? '');
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;

    const isOpen = useCallback((itemValue: string) => currentValue === itemValue, [currentValue]);

    const toggle = useCallback(
      (itemValue: string) => {
        if (currentValue === itemValue) {
          if (collapsible) {
            if (!isControlled) setInternalValue('');
            onValueChange?.('');
          }
        } else {
          if (!isControlled) setInternalValue(itemValue);
          onValueChange?.(itemValue);
        }
      },
      [currentValue, collapsible, isControlled, onValueChange],
    );

    const ctx = useMemo<AccordionContextValue>(
      () => ({ mode: 'single', isOpen, toggle }),
      [isOpen, toggle],
    );

    return (
      <AccordionContext.Provider value={ctx}>
        <div ref={ref} {...rest} data-accordion="" className={clsx(styles.accordion, className)}>
          {children}
        </div>
      </AccordionContext.Provider>
    );
  },
);

interface MultipleImplProps extends AccordionBaseProps, AccordionMultipleProps {}

const AccordionMultipleImpl = forwardRef<HTMLDivElement, MultipleImplProps>(
  function AccordionMultipleImpl(
    { type: _type, value, defaultValue, onValueChange, children, className, ...rest },
    ref,
  ) {
    const [internalValue, setInternalValue] = useState<string[]>(defaultValue ?? []);
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;

    const isOpen = useCallback(
      (itemValue: string) => currentValue.includes(itemValue),
      [currentValue],
    );

    const toggle = useCallback(
      (itemValue: string) => {
        const next = currentValue.includes(itemValue)
          ? currentValue.filter((v) => v !== itemValue)
          : [...currentValue, itemValue];
        if (!isControlled) setInternalValue(next);
        onValueChange?.(next);
      },
      [currentValue, isControlled, onValueChange],
    );

    const ctx = useMemo<AccordionContextValue>(
      () => ({ mode: 'multiple', isOpen, toggle }),
      [isOpen, toggle],
    );

    return (
      <AccordionContext.Provider value={ctx}>
        <div ref={ref} {...rest} data-accordion="" className={clsx(styles.accordion, className)}>
          {children}
        </div>
      </AccordionContext.Provider>
    );
  },
);

/** Compound export. */
export const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
});
```

- [ ] **Step 5: Write `AccordionItem.tsx`**

Create `packages/design-system/src/components/Accordion/AccordionItem.tsx`:

```tsx
import { forwardRef, useId, useMemo, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  AccordionItemContext,
  useAccordionContext,
  type AccordionItemContextValue,
} from './context';
import type { AccordionHeaderLevel } from './Accordion';
import styles from './Accordion.module.scss';

export interface AccordionItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'value'> {
  /** Unique value used to identify the item in the root's `value`/`onValueChange`. */
  value: string;
  /** When true, the trigger is non-interactive and keyboard nav skips this item. */
  disabled?: boolean;
  /**
   * Heading level wrapping the trigger. WAI-ARIA APG requires triggers to live
   * inside a heading element. Defaults to `'h3'`.
   */
  headerLevel?: AccordionHeaderLevel;
  children: ReactNode;
}

/**
 * Item wrapper. Provides `AccordionItemContext` so Trigger and Content can
 * read this item's value, disabled state, open state, and stable ids.
 */
export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(function AccordionItem(
  { value, disabled = false, headerLevel = 'h3', children, className, ...props },
  ref,
) {
  const { isOpen } = useAccordionContext('Item');
  const open = isOpen(value);
  const reactId = useId();
  const triggerId = `accordion-trigger-${reactId}`;
  const contentId = `accordion-content-${reactId}`;

  const ctx = useMemo<AccordionItemContextValue & { headerLevel: AccordionHeaderLevel }>(
    () => ({
      value,
      disabled,
      isOpen: open,
      triggerId,
      contentId,
      headerLevel,
    }),
    [value, disabled, open, triggerId, contentId, headerLevel],
  );

  return (
    <AccordionItemContext.Provider value={ctx}>
      <div
        ref={ref}
        {...props}
        data-state={open ? 'open' : 'closed'}
        data-disabled={disabled ? 'true' : undefined}
        className={clsx(styles.item, className)}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
});
```

- [ ] **Step 6: Write `AccordionTrigger.tsx`**

Create `packages/design-system/src/components/Accordion/AccordionTrigger.tsx`:

```tsx
import { forwardRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import {
  useAccordionContext,
  useAccordionItemContext,
  type AccordionItemContextValue,
} from './context';
import type { AccordionHeaderLevel } from './Accordion';
import styles from './Accordion.module.scss';

export interface AccordionTriggerProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  /**
   * Override the default trigger indicator icon (rotates 180° when open).
   * Pass `null` to suppress the icon entirely. Default: `<ChevronDown />`.
   */
  icon?: ReactNode | null;
  children: ReactNode;
}

interface ItemContextWithHeaderLevel extends AccordionItemContextValue {
  headerLevel: AccordionHeaderLevel;
}

/**
 * Heading-wrapped button that toggles the parent Item. Default indicator is a
 * `<ChevronDown>` icon that rotates 180° when open.
 */
export const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  function AccordionTrigger({ icon, children, className, onKeyDown, ...props }, ref) {
    const { toggle } = useAccordionContext('Trigger');
    const itemCtx = useAccordionItemContext('Trigger') as ItemContextWithHeaderLevel;
    const { value, disabled, isOpen, triggerId, contentId, headerLevel } = itemCtx;

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      const isNav = ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key);
      if (!isNav) return;
      e.preventDefault();

      const root = e.currentTarget.closest<HTMLElement>('[data-accordion]');
      if (!root) return;

      const triggers = Array.from(
        root.querySelectorAll<HTMLButtonElement>('button[aria-expanded]:not(:disabled)'),
      );
      if (triggers.length === 0) return;

      const current = triggers.indexOf(e.currentTarget);
      let next = current;

      if (e.key === 'ArrowDown') next = (current + 1) % triggers.length;
      else if (e.key === 'ArrowUp') next = (current - 1 + triggers.length) % triggers.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = triggers.length - 1;

      triggers[next]?.focus();
    };

    const renderedIcon =
      icon === null
        ? null
        : (icon ?? <ChevronDown size={16} aria-hidden="true" className={styles.indicator} />);

    // headerLevel is a string union of valid HTML heading tag names; cast to
    // ElementType for JSX use.
    const Heading = headerLevel as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

    return (
      <Heading className={styles.header}>
        <button
          {...props}
          ref={ref}
          type="button"
          id={triggerId}
          aria-expanded={isOpen}
          aria-controls={contentId}
          disabled={disabled}
          onClick={() => toggle(value)}
          onKeyDown={handleKeyDown}
          className={clsx(styles.trigger, className)}
        >
          <span className={styles.label}>{children}</span>
          {renderedIcon}
        </button>
      </Heading>
    );
  },
);
```

- [ ] **Step 7: Write `AccordionContent.tsx`**

Create `packages/design-system/src/components/Accordion/AccordionContent.tsx`:

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { useAccordionItemContext } from './context';
import styles from './Accordion.module.scss';

export interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Collapsible region announced via `role="region"` + `aria-labelledby` pointing
 * at the trigger. Animated via CSS `grid-template-rows: 0fr → 1fr`.
 */
export const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
  function AccordionContent({ children, className, ...props }, ref) {
    const { isOpen, triggerId, contentId } = useAccordionItemContext('Content');

    return (
      <div
        {...props}
        ref={ref}
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        data-state={isOpen ? 'open' : 'closed'}
        className={clsx(styles.content, className)}
      >
        <div className={styles.inner}>{children}</div>
      </div>
    );
  },
);
```

- [ ] **Step 8: Write the folder barrel**

Create `packages/design-system/src/components/Accordion/index.ts`:

```ts
export { Accordion } from './Accordion';
export type { AccordionProps, AccordionMode, AccordionHeaderLevel } from './Accordion';
export type { AccordionItemProps } from './AccordionItem';
export type { AccordionTriggerProps } from './AccordionTrigger';
export type { AccordionContentProps } from './AccordionContent';
```

- [ ] **Step 9: Typecheck + lint**

```bash
cd /home/dpws/projects/design-system
make build-lib
make lint
```

Expected: both clean.

If stylelint flags `rule-empty-line-before` between sibling top-level rules, add blank lines between them.

If stylelint flags the `margin: 0` on `.header`, verify the `stylelint-disable-next-line property-disallowed-list -- native heading margin reset` comment is on the immediately preceding line (not on the rule block opener).

If TypeScript flags the discriminated union shape (the `_type` discard in the impl components is intentional — TS prefers `_`-prefix for unused), that's expected; it satisfies the strict noUnusedParameters rule.

- [ ] **Step 10: Commit**

```bash
git add packages/design-system/src/components/Accordion/
git commit -m "$(cat <<'EOF'
Accordion: source — compound collapsible panels (8 files)

Bundled source for the Accordion compound component:

- Accordion.tsx — root with discriminated-union types (type='single' |
  'multiple'), Object.assign for the compound API. Internal mirror
  pattern for uncontrolled state.
- AccordionItem.tsx — item wrapper providing AccordionItemContext
  (value/disabled/isOpen/triggerId/contentId) + heading level passed
  through to Trigger.
- AccordionTrigger.tsx — heading-wrapped button (h2/h3/h4/h5/h6),
  WAI-ARIA APG keyboard nav handler (ArrowDown/Up/Home/End skipping
  disabled), default ChevronDown indicator that rotates 180° when
  open via [data-state='open'].
- AccordionContent.tsx — role="region" + aria-labelledby. Animated
  via grid-template-rows: 0fr → 1fr (no JS measurement).
- context.ts — AccordionContext + AccordionItemContext + use* hooks
  that throw outside the right ancestor.
- Accordion.module.scss — borders, trigger styling, focus-visible
  (inset ring because trigger is full-width), grid-row animation,
  reduced-motion fallback.
- index.ts — barrel.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Unit tests (`Accordion.test.tsx`)

**Files:**

- Create: `packages/design-system/src/components/Accordion/Accordion.test.tsx`

- [ ] **Step 1: Write the test file**

Create `packages/design-system/src/components/Accordion/Accordion.test.tsx`:

```tsx
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus } from 'lucide-react';
import { Accordion } from './Accordion';

function BasicSingle({
  collapsible = false,
  defaultValue,
}: {
  collapsible?: boolean;
  defaultValue?: string;
}) {
  return (
    <Accordion type="single" collapsible={collapsible} defaultValue={defaultValue}>
      <Accordion.Item value="a">
        <Accordion.Trigger>A trigger</Accordion.Trigger>
        <Accordion.Content>A content</Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="b">
        <Accordion.Trigger>B trigger</Accordion.Trigger>
        <Accordion.Content>B content</Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="c">
        <Accordion.Trigger>C trigger</Accordion.Trigger>
        <Accordion.Content>C content</Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

function BasicMultiple({ defaultValue }: { defaultValue?: string[] }) {
  return (
    <Accordion type="multiple" defaultValue={defaultValue}>
      <Accordion.Item value="a">
        <Accordion.Trigger>A trigger</Accordion.Trigger>
        <Accordion.Content>A content</Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="b">
        <Accordion.Trigger>B trigger</Accordion.Trigger>
        <Accordion.Content>B content</Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="c">
        <Accordion.Trigger>C trigger</Accordion.Trigger>
        <Accordion.Content>C content</Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

describe('<Accordion>', () => {
  // ─── Rendering + structure ─────────────────────────────────────────────

  it('renders without crashing with minimal compound markup', () => {
    render(<BasicSingle />);
    expect(screen.getByText('A trigger')).toBeInTheDocument();
    expect(screen.getByText('B trigger')).toBeInTheDocument();
  });

  it('renders items in DOM order', () => {
    const { container } = render(<BasicSingle />);
    const triggers = container.querySelectorAll('button[aria-expanded]');
    expect(triggers[0]).toHaveTextContent('A trigger');
    expect(triggers[1]).toHaveTextContent('B trigger');
    expect(triggers[2]).toHaveTextContent('C trigger');
  });

  it('Trigger is wrapped in the default <h3>', () => {
    const { container } = render(<BasicSingle />);
    expect(container.querySelectorAll('h3').length).toBeGreaterThanOrEqual(3);
  });

  it('headerLevel="h2" wraps the trigger in <h2>', () => {
    const { container } = render(
      <Accordion type="single">
        <Accordion.Item value="a" headerLevel="h2">
          <Accordion.Trigger>A</Accordion.Trigger>
          <Accordion.Content>content</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    expect(container.querySelector('h2')).toBeInTheDocument();
  });

  it('aria-controls on trigger matches id on content panel', () => {
    render(<BasicSingle />);
    const trigger = screen.getByRole('button', { name: 'A trigger' });
    const ariaControls = trigger.getAttribute('aria-controls');
    expect(ariaControls).toBeTruthy();
    const panel = document.getElementById(ariaControls!);
    expect(panel).not.toBeNull();
  });

  it('aria-labelledby on content matches id on trigger', () => {
    render(<BasicSingle />);
    const trigger = screen.getByRole('button', { name: 'A trigger' });
    const triggerId = trigger.id;
    // Content panel: find via aria-labelledby. Note: closed panels still
    // exist in the DOM (only height is 0).
    const panels = document.querySelectorAll('[role="region"]');
    const panel = Array.from(panels).find((p) => p.getAttribute('aria-labelledby') === triggerId);
    expect(panel).toBeDefined();
  });

  it('default state: no item open; all aria-expanded="false"', () => {
    render(<BasicSingle />);
    const triggers = screen.getAllByRole('button');
    triggers.forEach((t) => {
      expect(t).toHaveAttribute('aria-expanded', 'false');
    });
  });

  // ─── State (single mode) ───────────────────────────────────────────────

  it('defaultValue="a" opens item a on initial render', () => {
    render(<BasicSingle defaultValue="a" />);
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'B trigger' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('clicking a closed item opens it AND closes any previously open item', async () => {
    const user = userEvent.setup();
    render(<BasicSingle defaultValue="a" />);
    await user.click(screen.getByRole('button', { name: 'B trigger' }));
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: 'B trigger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('collapsible={false} (default): clicking the open item does NOT close it', async () => {
    const user = userEvent.setup();
    render(<BasicSingle defaultValue="a" />);
    await user.click(screen.getByRole('button', { name: 'A trigger' }));
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('collapsible={true}: clicking the open item closes it', async () => {
    const user = userEvent.setup();
    render(<BasicSingle collapsible defaultValue="a" />);
    await user.click(screen.getByRole('button', { name: 'A trigger' }));
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('controlled single: value + onValueChange round-trip', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [v, setV] = useState('');
      return (
        <>
          <span data-testid="state">{v}</span>
          <Accordion type="single" value={v} onValueChange={setV}>
            <Accordion.Item value="a">
              <Accordion.Trigger>A trigger</Accordion.Trigger>
              <Accordion.Content>A content</Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="b">
              <Accordion.Trigger>B trigger</Accordion.Trigger>
              <Accordion.Content>B content</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </>
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole('button', { name: 'B trigger' }));
    expect(screen.getByTestId('state')).toHaveTextContent('b');
    await user.click(screen.getByRole('button', { name: 'A trigger' }));
    expect(screen.getByTestId('state')).toHaveTextContent('a');
  });

  // ─── State (multiple mode) ─────────────────────────────────────────────

  it('multiple mode: defaultValue={["a","b"]} opens both items', () => {
    render(<BasicMultiple defaultValue={['a', 'b']} />);
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'B trigger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'C trigger' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('multiple mode: clicking a closed item adds it to the open set', async () => {
    const user = userEvent.setup();
    render(<BasicMultiple defaultValue={['a']} />);
    await user.click(screen.getByRole('button', { name: 'C trigger' }));
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'C trigger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('multiple mode: clicking an open item removes it from the set', async () => {
    const user = userEvent.setup();
    render(<BasicMultiple defaultValue={['a', 'b']} />);
    await user.click(screen.getByRole('button', { name: 'A trigger' }));
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: 'B trigger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('controlled multiple: value + onValueChange round-trip', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [v, setV] = useState<string[]>([]);
      return (
        <>
          <span data-testid="state">{v.join(',')}</span>
          <Accordion type="multiple" value={v} onValueChange={setV}>
            <Accordion.Item value="a">
              <Accordion.Trigger>A trigger</Accordion.Trigger>
              <Accordion.Content>A content</Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="b">
              <Accordion.Trigger>B trigger</Accordion.Trigger>
              <Accordion.Content>B content</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </>
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole('button', { name: 'A trigger' }));
    expect(screen.getByTestId('state')).toHaveTextContent('a');
    await user.click(screen.getByRole('button', { name: 'B trigger' }));
    expect(screen.getByTestId('state')).toHaveTextContent('a,b');
    await user.click(screen.getByRole('button', { name: 'A trigger' }));
    expect(screen.getByTestId('state')).toHaveTextContent('b');
  });

  // ─── Disabled ──────────────────────────────────────────────────────────

  it('disabled item: trigger has the disabled attribute', () => {
    render(
      <Accordion type="single">
        <Accordion.Item value="a" disabled>
          <Accordion.Trigger>A</Accordion.Trigger>
          <Accordion.Content>content</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    expect(screen.getByRole('button', { name: 'A' })).toBeDisabled();
  });

  it('clicking a disabled trigger does NOT toggle the item', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <Accordion type="single" onValueChange={handleChange}>
        <Accordion.Item value="a" disabled>
          <Accordion.Trigger>A</Accordion.Trigger>
          <Accordion.Content>content</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    await user.click(screen.getByRole('button', { name: 'A' }));
    expect(handleChange).not.toHaveBeenCalled();
  });

  // ─── Keyboard ──────────────────────────────────────────────────────────

  it('ArrowDown from the first trigger focuses the second', async () => {
    const user = userEvent.setup();
    render(<BasicSingle />);
    const first = screen.getByRole('button', { name: 'A trigger' });
    first.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'B trigger' })).toHaveFocus();
  });

  it('ArrowUp from the second trigger focuses the first', async () => {
    const user = userEvent.setup();
    render(<BasicSingle />);
    const second = screen.getByRole('button', { name: 'B trigger' });
    second.focus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveFocus();
  });

  it('ArrowDown wraps from last to first', async () => {
    const user = userEvent.setup();
    render(<BasicSingle />);
    const last = screen.getByRole('button', { name: 'C trigger' });
    last.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveFocus();
  });

  it('Home focuses the first non-disabled trigger', async () => {
    const user = userEvent.setup();
    render(<BasicSingle />);
    const second = screen.getByRole('button', { name: 'B trigger' });
    second.focus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('button', { name: 'A trigger' })).toHaveFocus();
  });

  it('End focuses the last non-disabled trigger', async () => {
    const user = userEvent.setup();
    render(<BasicSingle />);
    const first = screen.getByRole('button', { name: 'A trigger' });
    first.focus();
    await user.keyboard('{End}');
    expect(screen.getByRole('button', { name: 'C trigger' })).toHaveFocus();
  });

  it('ArrowDown skips disabled items', async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="single">
        <Accordion.Item value="a">
          <Accordion.Trigger>A</Accordion.Trigger>
          <Accordion.Content>x</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="b" disabled>
          <Accordion.Trigger>B</Accordion.Trigger>
          <Accordion.Content>x</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="c">
          <Accordion.Trigger>C</Accordion.Trigger>
          <Accordion.Content>x</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    const first = screen.getByRole('button', { name: 'A' });
    first.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'C' })).toHaveFocus();
  });

  // ─── Icon ──────────────────────────────────────────────────────────────

  it('custom icon on Trigger replaces the default ChevronDown', () => {
    const { container } = render(
      <Accordion type="single">
        <Accordion.Item value="a">
          <Accordion.Trigger icon={<Plus data-testid="custom" />}>A</Accordion.Trigger>
          <Accordion.Content>x</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    expect(screen.getByTestId('custom')).toBeInTheDocument();
  });

  it('icon={null} hides the indicator entirely', () => {
    const { container } = render(
      <Accordion type="single">
        <Accordion.Item value="a">
          <Accordion.Trigger icon={null}>A</Accordion.Trigger>
          <Accordion.Content>x</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    const trigger = screen.getByRole('button', { name: 'A' });
    expect(within(trigger).queryByRole('img')).toBeNull();
    expect(trigger.querySelector('svg')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
cd /home/dpws/projects/design-system
npm test -w @eocrm/design-system -- --run src/components/Accordion/Accordion.test.tsx
```

Expected: 26 tests passing.

If a test fails:

- **`useId` SSR-warning** in jsdom: the warning is benign for our tests but if it surfaces, wrap the render in `act()`.
- **`role="region"` query failing**: the spec uses role="region" on the content. Verify the AccordionContent JSX sets `role="region"`.
- **Keyboard nav test failing**: the handler queries `button[aria-expanded]:not(:disabled)` — confirm Trigger sets `aria-expanded` (yes, it does via `aria-expanded={isOpen}`).

- [ ] **Step 3: Full suite + lint + typecheck**

```bash
make test
make build-lib
make lint
```

Expected: everything clean. Total test count goes up by 26.

`structure.test.ts` will report 1 failure ("Accordion is re-exported from src/index.ts") — Task 3 fixes it.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/Accordion/Accordion.test.tsx
git commit -m "$(cat <<'EOF'
Accordion: unit tests

26 cases: rendering (compound markup, default h3 heading, custom
headerLevel, aria-controls/aria-labelledby pairing, default all
aria-expanded="false"), state in single mode (defaultValue,
click-to-open-and-close-others, collapsible behavior, controlled
round-trip), state in multiple mode (defaultValue array, add/remove
membership, controlled round-trip), disabled (disabled attr, click
no-op), keyboard nav (ArrowDown/Up/Home/End, wrap, skip disabled),
icon override + icon={null} suppression.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Public exports + AGENTS.md TL;DR

**Files:**

- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Add re-exports to `src/index.ts`**

```ts
export { Accordion } from './components/Accordion';
export type {
  AccordionProps,
  AccordionItemProps,
  AccordionTriggerProps,
  AccordionContentProps,
  AccordionMode,
  AccordionHeaderLevel,
} from './components/Accordion';
```

Place wherever the file's surrounding pattern suggests (file is not strictly alphabetical; recent components are appended near the bottom). Match the convention.

Verify with:

```bash
grep -n "Accordion\|Alert\|Avatar" packages/design-system/src/index.ts | head
```

- [ ] **Step 2: Add TL;DR to AGENTS.md**

Open `packages/design-system/AGENTS.md`. Find `### \`<Tabs>\``(around line 497). The new Accordion section goes AFTER Tabs and BEFORE`### \`<Breadcrumb>\`` (around line 521).

Use grep to confirm line numbers:

```bash
grep -nE "^### " packages/design-system/AGENTS.md | head -30
```

Add this content verbatim:

````markdown
### `<Accordion>` — vertically-stacked collapsible panels

Compound component for FAQ-style content, settings sections, and any case where you have a list of headings with optional drill-down detail. Two modes: `single` (one open at a time) or `multiple` (any combination).

```tsx
import { Accordion } from '@eocrm/design-system';

// Single-open with collapsible (FAQ-style)
<Accordion type="single" collapsible defaultValue="faq-2">
  <Accordion.Item value="faq-1">
    <Accordion.Trigger>How do I reset my password?</Accordion.Trigger>
    <Accordion.Content>Visit Settings → Security → Reset.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="faq-2">
    <Accordion.Trigger>How do I export my data?</Accordion.Trigger>
    <Accordion.Content>Use the gear icon → Export → CSV.</Accordion.Content>
  </Accordion.Item>
</Accordion>

// Multiple — independent sections
<Accordion type="multiple" defaultValue={['account', 'notifications']}>
  <Accordion.Item value="account">...</Accordion.Item>
  <Accordion.Item value="notifications">...</Accordion.Item>
</Accordion>

// Disabled item
<Accordion.Item value="advanced" disabled>...</Accordion.Item>

// Controlled
<Accordion type="single" value={open} onValueChange={setOpen}>...</Accordion>
```

- **`type="single"`** + `collapsible={true}` — one item open at a time, click to close.
- **`type="multiple"`** — any combination.
- **Smooth animation** via CSS `grid-template-rows: 0fr → 1fr`. No JS measurement.
- **Heading wrapping** — Trigger is wrapped in `<h3>` by default per WAI-ARIA APG. Override via `headerLevel` on Item.
- **Keyboard**: ArrowDown/Up cycles between triggers, Home/End jumps to ends, Space/Enter toggles. Disabled items are skipped.

#### When NOT to use

- ❌ Mutually-exclusive view switchers → `<Tabs>` (tabs imply parallel content; accordions imply hierarchy).
- ❌ A simple show/hide toggle for a single section → use a `<Button>` + conditional render.
- ❌ Step-by-step wizard flows → a dedicated Stepper (not shipped).

#### Anti-patterns

- ❌ Nesting `<Accordion.Trigger>` inside a heading the consumer also renders manually. Trigger ALREADY wraps itself in a heading.
- ❌ Setting `aria-expanded` manually on the Trigger via `{...props}`. The component owns the ARIA contract.
- ❌ Using `headerLevel="h1"`. There should only be one `<h1>` per page; Accordion lives below it.
````

- [ ] **Step 3: Run gates**

```bash
make test
make build-lib
make build
make lint
```

Expected: everything clean. `structure.test.ts` finds Accordion in the barrel.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/index.ts packages/design-system/AGENTS.md
git commit -m "$(cat <<'EOF'
Accordion: public exports + AGENTS.md TL;DR

Re-exports Accordion + AccordionProps/AccordionItemProps/
AccordionTriggerProps/AccordionContentProps/AccordionMode/
AccordionHeaderLevel from the package barrel. AGENTS.md gains a
TL;DR section between Tabs and Breadcrumb (navigation cluster) with
the canonical four patterns (single + collapsible / multiple /
disabled item / controlled), the when-NOT-to-use list, and the
manually-wrapping-heading anti-pattern.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — Playground demo + 4-place nav wiring

**Files:**

- Create: `packages/playground/src/pages/components/AccordionDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Write the demo page**

Create `packages/playground/src/pages/components/AccordionDemo.tsx`:

```tsx
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Accordion, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Accordion/Accordion.tsx?raw';
import scssSource from '@lib-source/components/Accordion/Accordion.module.scss?raw';

export function AccordionDemo() {
  const [controlled, setControlled] = useState<string>('');

  return (
    <DemoLayout
      name="Accordion"
      componentName="Accordion"
      description="Vertically-stacked collapsible panels. Compound component (Accordion.Item + Accordion.Trigger + Accordion.Content). Two modes: type='single' (one open at a time) or type='multiple' (any combination)."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Accordion.tsx"
      scssFilename="Accordion.module.scss"
    >
      <Example
        title="Single, collapsible (FAQ-style)"
        description="Only one item open at a time. Clicking the open item closes it (collapsible)."
        code={`<Accordion type="single" collapsible defaultValue="faq-1">
  <Accordion.Item value="faq-1">
    <Accordion.Trigger>How do I reset my password?</Accordion.Trigger>
    <Accordion.Content>Visit Settings → Security → Reset password.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="faq-2">
    <Accordion.Trigger>How do I export my data?</Accordion.Trigger>
    <Accordion.Content>Use the gear icon → Export → CSV.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="faq-3">
    <Accordion.Trigger>How do I invite teammates?</Accordion.Trigger>
    <Accordion.Content>Settings → Team → Invite via email.</Accordion.Content>
  </Accordion.Item>
</Accordion>`}
      >
        <Accordion type="single" collapsible defaultValue="faq-1">
          <Accordion.Item value="faq-1">
            <Accordion.Trigger>How do I reset my password?</Accordion.Trigger>
            <Accordion.Content>Visit Settings → Security → Reset password.</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="faq-2">
            <Accordion.Trigger>How do I export my data?</Accordion.Trigger>
            <Accordion.Content>Use the gear icon → Export → CSV.</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="faq-3">
            <Accordion.Trigger>How do I invite teammates?</Accordion.Trigger>
            <Accordion.Content>Settings → Team → Invite via email.</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Example>

      <Example
        title="Multiple — independent sections"
        description="Any combination of items can be open. Useful for settings panels where each section is independent."
        code={`<Accordion type="multiple" defaultValue={['account']}>
  <Accordion.Item value="account">
    <Accordion.Trigger>Account</Accordion.Trigger>
    <Accordion.Content>Email, name, profile picture.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="notifications">
    <Accordion.Trigger>Notifications</Accordion.Trigger>
    <Accordion.Content>Email digest, in-app alerts.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="security">
    <Accordion.Trigger>Security</Accordion.Trigger>
    <Accordion.Content>2FA, active sessions, API keys.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="billing">
    <Accordion.Trigger>Billing</Accordion.Trigger>
    <Accordion.Content>Plan, invoices, payment method.</Accordion.Content>
  </Accordion.Item>
</Accordion>`}
      >
        <Accordion type="multiple" defaultValue={['account']}>
          <Accordion.Item value="account">
            <Accordion.Trigger>Account</Accordion.Trigger>
            <Accordion.Content>Email, name, profile picture.</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="notifications">
            <Accordion.Trigger>Notifications</Accordion.Trigger>
            <Accordion.Content>Email digest, in-app alerts.</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="security">
            <Accordion.Trigger>Security</Accordion.Trigger>
            <Accordion.Content>2FA, active sessions, API keys.</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="billing">
            <Accordion.Trigger>Billing</Accordion.Trigger>
            <Accordion.Content>Plan, invoices, payment method.</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Example>

      <Example
        title="Controlled"
        description="The consumer owns the open state via value + onValueChange. Useful for syncing with URL state or external state stores."
        code={`const [open, setOpen] = useState('');

<Accordion type="single" collapsible value={open} onValueChange={setOpen}>
  <Accordion.Item value="a">
    <Accordion.Trigger>Section A</Accordion.Trigger>
    <Accordion.Content>Content A</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="b">
    <Accordion.Trigger>Section B</Accordion.Trigger>
    <Accordion.Content>Content B</Accordion.Content>
  </Accordion.Item>
</Accordion>

<p>Currently open: {open || '(none)'}</p>`}
      >
        <Stack gap="sm">
          <Accordion type="single" collapsible value={controlled} onValueChange={setControlled}>
            <Accordion.Item value="a">
              <Accordion.Trigger>Section A</Accordion.Trigger>
              <Accordion.Content>Content A</Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="b">
              <Accordion.Trigger>Section B</Accordion.Trigger>
              <Accordion.Content>Content B</Accordion.Content>
            </Accordion.Item>
          </Accordion>
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
            Currently open: {controlled || '(none)'}
          </p>
        </Stack>
      </Example>

      <Example
        title="Disabled item"
        description="A disabled item is non-interactive (button disabled, keyboard nav skips). Useful for sections that aren't applicable to the current user/plan."
        code={`<Accordion type="single" collapsible>
  <Accordion.Item value="basic">
    <Accordion.Trigger>Basic settings</Accordion.Trigger>
    <Accordion.Content>Always available.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="premium" disabled>
    <Accordion.Trigger>Premium settings (upgrade required)</Accordion.Trigger>
    <Accordion.Content>You won't see this.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="advanced">
    <Accordion.Trigger>Advanced settings</Accordion.Trigger>
    <Accordion.Content>For power users.</Accordion.Content>
  </Accordion.Item>
</Accordion>`}
      >
        <Accordion type="single" collapsible>
          <Accordion.Item value="basic">
            <Accordion.Trigger>Basic settings</Accordion.Trigger>
            <Accordion.Content>Always available.</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="premium" disabled>
            <Accordion.Trigger>Premium settings (upgrade required)</Accordion.Trigger>
            <Accordion.Content>You won't see this.</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="advanced">
            <Accordion.Trigger>Advanced settings</Accordion.Trigger>
            <Accordion.Content>For power users.</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Example>

      <Example
        title="Custom icon (Plus)"
        description="Override the default ChevronDown indicator via the Trigger's icon prop. The icon rotates 180° when the item is open."
        code={`<Accordion type="single" collapsible>
  <Accordion.Item value="a">
    <Accordion.Trigger icon={<Plus size={16} />}>Toggle me</Accordion.Trigger>
    <Accordion.Content>The Plus icon rotates 180° to become a Minus when open.</Accordion.Content>
  </Accordion.Item>
</Accordion>`}
      >
        <Accordion type="single" collapsible>
          <Accordion.Item value="a">
            <Accordion.Trigger icon={<Plus size={16} aria-hidden="true" />}>
              Toggle me
            </Accordion.Trigger>
            <Accordion.Content>
              The Plus icon rotates 180° to become a Minus when open.
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Example>

      <Example
        title="Heading level override"
        description="Trigger is wrapped in <h3> by default. Override via Item.headerLevel to fit the surrounding page heading hierarchy."
        code={`<Accordion type="single" collapsible>
  <Accordion.Item value="a" headerLevel="h2">
    <Accordion.Trigger>This trigger sits inside an &lt;h2&gt;</Accordion.Trigger>
    <Accordion.Content>Inspect the DOM to verify.</Accordion.Content>
  </Accordion.Item>
</Accordion>`}
      >
        <Accordion type="single" collapsible>
          <Accordion.Item value="a" headerLevel="h2">
            <Accordion.Trigger>This trigger sits inside an &lt;h2&gt;</Accordion.Trigger>
            <Accordion.Content>Inspect the DOM to verify.</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 2: Wire route + import in `App.tsx`**

Add the import alphabetically:

```tsx
import { AccordionDemo } from './pages/components/AccordionDemo';
```

Add the route inside `<Routes>`:

```tsx
<Route path="/components/accordion" element={<AccordionDemo />} />
```

(Match the surrounding file convention.)

- [ ] **Step 3: Add sidebar entry in `AppShell.tsx`**

Open `packages/playground/src/layout/AppShell/AppShell.tsx`. Find the `Navigation` group (around line 121). Add Accordion as the FIRST item (alphabetical before Breadcrumb):

```tsx
{
  heading: 'Navigation',
  items: [
    { to: '/components/accordion', label: 'Accordion', icon: ListCollapse, end: false },
    { to: '/components/breadcrumb', label: 'Breadcrumb', icon: MoveRight, end: false },
    { to: '/components/link', label: 'Link', icon: ExternalLink, end: false },
    { to: '/components/tabs', label: 'Tabs', icon: PanelTop, end: false },
  ],
},
```

Add `ListCollapse` to the existing lucide-react import. Verify it exists:

```bash
node -e "console.log(Object.keys(require('lucide-react')).filter(k => k === 'ListCollapse').join(', '))"
```

If `ListCollapse` is missing in lucide-react 1.x, fall back to `ChevronsUpDown` or `Rows3`.

- [ ] **Step 4: Add overview card in `ComponentsIndex.tsx`**

Open `packages/playground/src/pages/components/ComponentsIndex.tsx`. Add `Accordion` to the library imports.

Add a card alphabetically (first, before Alert):

```tsx
{
  to: '/components/accordion',
  name: 'Accordion',
  description: 'Stacked collapsible panels. Single-open or multi-open mode.',
  preview: (
    <div style={{ width: '100%', maxWidth: '260px' }}>
      <Accordion type="single" collapsible defaultValue="a">
        <Accordion.Item value="a">
          <Accordion.Trigger>Section</Accordion.Trigger>
          <Accordion.Content>Body</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </div>
  ),
},
```

- [ ] **Step 5: Register the component name in `registry.ts`**

Open `packages/playground/src/pages/mockups/registry.ts`. Find `export type ComponentName =` and add `'Accordion'` FIRST in the union (alphabetical before `'Alert'`):

```ts
export type ComponentName = 'Accordion' | 'Alert' | 'Avatar';
// …rest unchanged…;
```

No existing mockup uses Accordion yet, so no `usesComponents` arrays need updating.

- [ ] **Step 6: Build + test**

```bash
make test
make build-lib
make build
make lint
```

Expected: everything clean.

- [ ] **Step 7: Spot-check in dev server (OPTIONAL)**

Skip unless a gate fails. We'll do visual checks in Task 5's HR8 round if needed.

- [ ] **Step 8: Commit**

```bash
git add packages/playground/src/pages/components/AccordionDemo.tsx \
        packages/playground/src/App.tsx \
        packages/playground/src/layout/AppShell/AppShell.tsx \
        packages/playground/src/pages/components/ComponentsIndex.tsx \
        packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
playground: AccordionDemo + 4-place nav wiring

6 examples (single+collapsible FAQ, multiple settings sections,
controlled, disabled item, custom Plus icon, heading-level override).
Wired into Navigation sidebar group (first item, before Breadcrumb),
Components route, overview-grid card (first item, alphabetical),
and the mockups ComponentName union.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Hard-Rule-8 cycle + push + PR

Per `packages/design-system/CLAUDE.md` Rule 8. Run until 0 Critical + 0 Important findings, all gates green.

- [ ] **Step 1: Final gate run**

```bash
cd /home/dpws/projects/design-system
make test
make build-lib
make build
make lint
```

Expected: all green.

- [ ] **Step 2: Dry-pack to confirm tarball contents**

```bash
npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -E "Accordion|test\."
```

Expected:

- Accordion source files (`Accordion.tsx`, `AccordionItem.tsx`, `AccordionTrigger.tsx`, `AccordionContent.tsx`, `Accordion.module.scss`, `context.ts`, `index.ts`) in the tarball
- NO `*.test.*` files

- [ ] **Step 3: Dispatch a fresh-context Hard-Rule-8 reviewer**

Use a `general-purpose` subagent with model `opus`. Prompt template:

> Fresh-context Hard-Rule-8 review of the Accordion PR. Branch `feat/accordion` at HEAD `<sha>`. Per `packages/design-system/CLAUDE.md` Rule 8 — review the full diff against `main`.
>
> Files in scope:
>
> - `packages/design-system/src/components/Accordion/` (8 source files)
> - `packages/design-system/src/index.ts`, `AGENTS.md`
> - `packages/playground/src/pages/components/AccordionDemo.tsx`
> - `packages/playground/src/App.tsx`, `AppShell.tsx`, `ComponentsIndex.tsx`, `registry.ts`
>
> Read first: `packages/design-system/CLAUDE.md` (Rules 1–7), `AGENTS.md` (Accordion section + surrounding Tabs/Breadcrumb), `docs/superpowers/specs/2026-05-23-accordion-design.md`. Compare against ButtonGroup (compound API precedent) and DropdownMenu (context + keyboard nav precedent).
>
> Verify:
>
> - **Rule 1**: tests exist (~26 cases).
> - **Rule 3**: NO raw values in `Accordion.module.scss`. All `var(--…)`. The `margin: 0` on `.header` has the documented inline disable for native heading reset.
> - **Rule 4**: NO `position`/`align-self`/`flex: 1`/`width` at the component boundary. The `display: flex` on `.accordion` is internal layout of its own children (items), not at the boundary. The `display: grid` on `.content` is internal animation. The `flex: 1` on `.label` is inside `.trigger` — internal child of the button, not at the component boundary.
> - **Rule 5**: re-exported from `src/index.ts`.
> - **Rule 6**: all four subcomponents use `forwardRef`.
> - **Rule 7**: full JSDoc on Accordion (root + each subcomponent + every prop + all 6 type aliases). At least 3 `@example` blocks on the root.
> - **ARIA**: `aria-expanded` on Trigger reflects isOpen. `aria-controls` matches Content's id. `aria-labelledby` on Content matches Trigger's id. `role="region"` on Content. Triggers wrapped in heading element (h2/h3/h4/h5/h6).
> - **Compound API**: `Object.assign` correctly attaches Item/Trigger/Content. Both contexts have `null` initial value + throwing `use*Context(name)` guards.
> - **Discriminated union**: `<Accordion type="single">` requires `value: string` / `defaultValue?: string` and accepts `collapsible`; `<Accordion type="multiple">` requires `value: string[]` / `defaultValue?: string[]` and rejects `collapsible` (TS error). Spot-check the TS types.
> - **Keyboard nav**: ArrowDown/Up wraps; Home/End correct; disabled items skipped (via `:not(:disabled)` selector); doesn't escape the accordion via `[data-accordion]` scoping.
> - **Animation**: `grid-template-rows: 0fr → 1fr` works for arbitrary content; `prefers-reduced-motion: reduce` disables transitions.
> - **Cross-package leakage**: imports only `react`, `clsx`, `lucide-react`. No playground imports.
> - **Package/distribution**: `npm pack --dry-run` excludes test files.
>
> End with verdict: **clean enough to stop** OR **keep iterating**.

- [ ] **Step 4: Fix every Critical + Important finding**

Single commit: `Accordion: review-cycle fixes (round N)`.

- [ ] **Step 5: Re-run gates after each fix round**

```bash
make test && make build-lib && make build && make lint
```

- [ ] **Step 6: Re-dispatch fresh reviewer**

Same prompt, same model, fresh context. Repeat until **clean enough to stop**.

- [ ] **Step 7: Push the branch**

```bash
git push -u origin feat/accordion
```

If the husky `pre-push` hook fails on `format:check`:

```bash
npx prettier --write docs/superpowers/specs/2026-05-23-accordion-design.md \
                     docs/superpowers/plans/2026-05-23-accordion.md \
                     packages/design-system/src/components/Accordion/ \
                     packages/playground/src/pages/components/AccordionDemo.tsx
git add -A
git commit -m "$(cat <<'EOF'
Accordion: prettier --write

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push -u origin feat/accordion
```

- [ ] **Step 8: Open the PR**

```bash
gh pr create --title "Accordion: compound collapsible panels (single/multiple + keyboard nav)" --body "$(cat <<'EOF'
## Summary

- New \`<Accordion>\` compound component — vertically-stacked collapsible panels for FAQ-style content, settings sections, and any case with a list of headings + optional drill-down detail.
- **Two modes** via discriminated \`type\` prop: \`single\` (one open at a time, optional \`collapsible\`) or \`multiple\` (any combination open).
- **Both controlled** (\`value\` + \`onValueChange\`) **and uncontrolled** (\`defaultValue\`) supported.
- **Per-item** \`disabled\`, custom trigger icon, configurable \`headerLevel\` (default h3 per WAI-ARIA APG).
- **Smooth CSS grid-template-rows animation** (no JS measurement); \`prefers-reduced-motion\` respected.
- **Full WAI-ARIA APG keyboard support**: ArrowDown/Up/Home/End for trigger-to-trigger nav, skipping disabled items.

## Design highlights

- **Compound API via \`Object.assign\`** — \`Accordion\` + \`.Item\` + \`.Trigger\` + \`.Content\`. Same pattern as ButtonGroup.
- **Two contexts**: \`AccordionContext\` (mode + isOpen + toggle) and \`AccordionItemContext\` (value + disabled + isOpen + triggerId + contentId). Both throw if consumed outside the right ancestor.
- **Discriminated union props**: \`type='single'\` requires \`value: string\` / \`defaultValue?: string\` and accepts \`collapsible\`; \`type='multiple'\` requires \`value: string[]\` / \`defaultValue?: string[]\` and rejects \`collapsible\` at the type level.
- **DOM-order keyboard nav** via \`document.querySelectorAll\` on \`[data-accordion]\` — no registration plumbing, matches the recent ButtonGroup precedent.
- **CSS grid-row animation**: \`display: grid; grid-template-rows: 0fr → 1fr\` smoothly animates arbitrary content height without JS measurement. The \`.inner\` wrapper with \`overflow: hidden\` ensures the closed state is invisible.
- **Inset focus ring** on the trigger because the button is full-width inside the accordion's border-radius — an outer ring would clip.

## Hard Rule 8

Fresh-context reviewer cycle. ~26 new tests covering rendering, state in both modes, controlled+uncontrolled, disabled, keyboard nav (ArrowDown/Up wrap, Home/End, skip disabled), and icon override.

All four gates green: \`make test\` · \`make build-lib\` · \`make build\` · \`make lint\` · \`npm pack --dry-run\` (no test files in tarball).

## Test plan

- [ ] Single + collapsible mode opens/closes one item at a time
- [ ] Single + NOT collapsible: clicking the open item is a no-op
- [ ] Multiple mode supports any combination open
- [ ] Controlled \`value\` + \`onValueChange\` round-trips in both modes
- [ ] \`disabled\` item's trigger is non-clickable AND keyboard nav skips it
- [ ] ArrowDown/Up cycles between triggers (wraps at edges)
- [ ] Home/End jumps to first/last non-disabled trigger
- [ ] Custom \`icon\` on Trigger replaces the default ChevronDown; \`icon={null}\` hides it
- [ ] \`headerLevel="h2"\` wraps the trigger in \`<h2>\` (verify in DOM)
- [ ] \`aria-controls\` on each trigger matches \`id\` on the corresponding content panel
- [ ] \`prefers-reduced-motion: reduce\` disables the grid-row animation
- [ ] Playground demo at \`/components/accordion\` renders all 6 examples without console errors

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 9: Confirm CI**

Watch the GitHub Actions Quality check on the PR. If it fails for format:check, run prettier locally and push again.

- [ ] **Step 10: Mark task complete**

Once verdict is `clean enough to stop`, gates green, CI green, PR open — task done.

---

## Summary of expected commits on the branch (before review-fix rounds)

```
Accordion: design spec — compound collapsible panels
Accordion: implementation plan (5 tasks)
Accordion: source — compound collapsible panels (8 files)
Accordion: unit tests
Accordion: public exports + AGENTS.md TL;DR
playground: AccordionDemo + 4-place nav wiring
```

Plus review-cycle fix commits + prettier fix-up as needed.
