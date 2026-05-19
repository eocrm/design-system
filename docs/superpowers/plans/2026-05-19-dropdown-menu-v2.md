# DropdownMenu v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the four deferred subcomponent families (submenus, CheckboxItem, RadioGroup/RadioItem, Group/Label) plus an `ItemIndicator` slot pattern. Refactor the monolithic `DropdownMenu.tsx` into ten focused files as the first move so the new code lands in clean per-component modules.

**Architecture:** Each `<Sub>` creates a new instance of the existing `DropdownMenuContext`, shadowing the parent. A `closeAll()` method threads up the recursive context chain so leaf items can collapse the entire menu tree. `<ItemIndicator>` is a marker component that `<CheckboxItem>` / `<RadioItem>` extract from their direct children via `React.Children.toArray + c.type === ItemIndicator`, placing it in a dedicated leading slot. Per-type `closeOnSelect` defaults: CheckboxItem stays open, RadioItem closes. Submenu hover uses 100ms open / 200ms close `setTimeout` delays — no safe-triangle heuristic.

**Tech Stack:** React 19, TypeScript, SCSS Modules, CSS custom properties, existing `@floating-ui/react-dom`. No new runtime deps.

**Spec:** `docs/superpowers/specs/2026-05-19-dropdown-menu-v2-design.md`

**Branch:** `feat/dropdown-menu-v2` (already branched from fresh main).

**Verification baseline:**

```bash
cd /home/dpws/projects/design-system
make test          # vitest, single run
npm run typecheck
npm run lint:css
make build
```

After every task that compiles. **All 186 v1 tests must remain green through the file-split tasks (Tasks 2-3).** New tests land in subsequent tasks.

---

## Task 1: Branch sanity check + verify baseline

**Files:** none modified.

- [ ] **Step 1: Verify branch and clean tree**

```bash
cd /home/dpws/projects/design-system
git status
git branch --show-current
```

Expected: clean tree, branch `feat/dropdown-menu-v2`. If not, STOP — branch should have been created in the brainstorming phase.

- [ ] **Step 2: Run gates to confirm baseline**

```bash
make test
npm run typecheck
npm run lint:css
```

Expected: 186 tests pass, both packages typecheck clean, stylelint clean.

If any fail, the branch is not in a known-good state — STOP and report.

No commit in this task.

---

## Task 2: Refactor — extract `context.ts` and `utils.ts`

Behavior-preserving extraction. After this task: `DropdownMenu.tsx` imports from `./context` and `./utils`. All 186 tests still pass.

**Files:**
- Create: `packages/design-system/src/components/DropdownMenu/context.ts`
- Create: `packages/design-system/src/components/DropdownMenu/utils.ts`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx`

- [ ] **Step 1: Create `utils.ts` with `mergeRefs`, `chain`, and dev/id helpers**

```ts
import type { Ref } from 'react';

export function mergeRefs<T>(...refs: Array<Ref<T> | undefined | null>): Ref<T> {
  return (value: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') ref(value);
      else (ref as React.MutableRefObject<T | null>).current = value;
    }
  };
}

export function chain<E>(...fns: Array<((event: E) => void) | undefined>): (event: E) => void {
  return (event: E) => {
    for (const fn of fns) fn?.(event);
  };
}

export function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
}
```

- [ ] **Step 2: Create `context.ts` with the context value type, the context itself, and the hook**

```ts
import { createContext, useContext, type RefObject } from 'react';

export interface RegisteredItem {
  id: string;
  ref: RefObject<HTMLDivElement | null>;
  disabled: boolean;
  label: string;
  /** If this item is a SubTrigger, called when ArrowRight is pressed while it's the active item. */
  openSubmenu?: () => void;
}

export interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentId: string;
  openIntent: 'first' | 'last' | null;
  setOpenIntent: (intent: 'first' | 'last' | null) => void;
  registerItem: (item: RegisteredItem) => () => void;
  itemsRef: React.MutableRefObject<RegisteredItem[]>;
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  /** Walks up the recursive context chain and closes every menu (root + all subs). */
  closeAll: () => void;
  /** 0 = root menu, 1 = first-level submenu, etc. */
  depth: number;
}

export const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

export function useDropdownMenuContext(component: string): DropdownMenuContextValue {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) {
    throw new Error(`<DropdownMenu.${component}> must be used inside <DropdownMenu>`);
  }
  return ctx;
}
```

Note the two new fields `closeAll` and `depth`. The Root provider needs to supply them — `closeAll` will just call `setOpen(false)` at the root; `depth: 0` at the root. Tasks 9-10 wire submenus to override these.

- [ ] **Step 3: Update `DropdownMenu.tsx` to import from the new modules**

Remove the in-file definitions of `mergeRefs`, `chain`, `RegisteredItem`, `DropdownMenuContextValue`, `DropdownMenuContext`, and `useDropdownMenuContext`. Add imports:

```ts
import {
  DropdownMenuContext,
  useDropdownMenuContext,
  type DropdownMenuContextValue,
  type RegisteredItem,
} from './context';
import { mergeRefs, chain, sanitizeId } from './utils';
```

Remove the local `sanitizeId` definition. Replace any local uses of these names with the imports.

In `DropdownMenuRoot`, when constructing the context value, add the two new fields:

```ts
const value: DropdownMenuContextValue = {
  open,
  setOpen,
  triggerRef,
  contentId,
  openIntent,
  setOpenIntent,
  registerItem,
  itemsRef,
  activeIndex,
  setActiveIndex,
  // New fields for v2:
  closeAll: () => setOpen(false), // root just closes itself; submenus will wrap this in Task 9
  depth: 0,
};
```

- [ ] **Step 4: Run gates**

```bash
npm test -w @eocrm/design-system
npm run typecheck
```

Expected: all 186 tests pass; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "Refactor: extract DropdownMenu context.ts and utils.ts"
```

---

## Task 3: Refactor — split `DropdownMenu.tsx` into per-component files

The bulk of the split. Each subcomponent moves to its own file; `DropdownMenu.tsx` becomes a thin composer.

**Files:**
- Create: `packages/design-system/src/components/DropdownMenu/Root.tsx` — DropdownMenuRoot
- Create: `packages/design-system/src/components/DropdownMenu/Trigger.tsx`
- Create: `packages/design-system/src/components/DropdownMenu/Content.tsx`
- Create: `packages/design-system/src/components/DropdownMenu/Item.tsx` — Item + Separator
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx` — now just the composer
- Modify: `packages/design-system/src/components/DropdownMenu/index.ts` — same exports as before (just re-exports from the new locations)

Other files stay where they are (`context.ts`, `utils.ts`, `DropdownMenu.module.scss`, `DropdownMenu.test.tsx`).

- [ ] **Step 1: Move `DropdownMenuRoot` and its `DropdownMenuProps` to `Root.tsx`**

```tsx
// Root.tsx
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  DropdownMenuContext,
  type DropdownMenuContextValue,
  type RegisteredItem,
} from './context';
import { sanitizeId } from './utils';

export interface DropdownMenuProps {
  /* (existing JSDoc preserved) */
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export function DropdownMenuRoot({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: DropdownMenuProps) {
  /* (paste the existing DropdownMenuRoot body here, including the new closeAll + depth fields from Task 2) */
}
```

Preserve all existing JSDoc on the component and props. Don't drop the `@example`, `@remarks` blocks.

- [ ] **Step 2: Move `Trigger` and its `DropdownMenuTriggerProps` to `Trigger.tsx`**

```tsx
// Trigger.tsx
import {
  cloneElement,
  isValidElement,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type Ref,
} from 'react';
import { useDropdownMenuContext } from './context';
import { chain, mergeRefs } from './utils';

export interface DropdownMenuTriggerProps {
  /* JSDoc */
  children: ReactElement;
}

export function Trigger({ children }: DropdownMenuTriggerProps) {
  /* (paste existing Trigger body) */
}
```

- [ ] **Step 3: Move `Content` and its types to `Content.tsx`**

```tsx
// Content.tsx
import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
  type Placement,
} from '@floating-ui/react-dom';
import clsx from 'clsx';
import styles from './DropdownMenu.module.scss';
import { useDropdownMenuContext } from './context';
import { mergeRefs } from './utils';

export type DropdownMenuSide = 'top' | 'bottom';
export type DropdownMenuAlign = 'start' | 'center' | 'end';

export interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  /* JSDoc */
  side?: DropdownMenuSide;
  align?: DropdownMenuAlign;
  sideOffset?: number;
  minWidth?: number | string;
}

export const Content = forwardRef<HTMLDivElement, DropdownMenuContentProps>(function Content(
  props,
  forwardedRef,
) {
  /* (paste existing Content body) */
});
```

- [ ] **Step 4: Move `Item` + `Separator` and their types to `Item.tsx`**

```tsx
// Item.tsx
import {
  forwardRef,
  useId,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import styles from './DropdownMenu.module.scss';
import { useDropdownMenuContext } from './context';
import { mergeRefs } from './utils';

export type DropdownMenuItemTone = 'default' | 'danger';

export interface DropdownMenuItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /* JSDoc */
  onSelect: () => void;
  tone?: DropdownMenuItemTone;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
}

export const Item = forwardRef<HTMLDivElement, DropdownMenuItemProps>(function Item(
  props,
  ref,
) {
  /* (paste existing Item body) */
});

export interface DropdownMenuSeparatorProps extends HTMLAttributes<HTMLDivElement> {}

export const Separator = forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(function Separator(
  props,
  ref,
) {
  /* (paste existing Separator body) */
});
```

Note: when Item's `handleClick` is moved, it currently calls `ctx.setOpen(false)` then `ctx.triggerRef.current?.focus()`. Task 9 will refactor this to use `ctx.closeAll()` and a separate "close all + focus root trigger" helper. For Task 3, preserve existing behavior (closes own context's menu via setOpen(false), focuses own context's triggerRef — for root these are equivalent).

- [ ] **Step 5: Rewrite `DropdownMenu.tsx` as the composer**

```tsx
// DropdownMenu.tsx
import { DropdownMenuRoot } from './Root';
import { Trigger } from './Trigger';
import { Content } from './Content';
import { Item, Separator } from './Item';

export { type DropdownMenuProps } from './Root';
export { type DropdownMenuTriggerProps } from './Trigger';
export {
  type DropdownMenuContentProps,
  type DropdownMenuSide,
  type DropdownMenuAlign,
} from './Content';
export {
  type DropdownMenuItemProps,
  type DropdownMenuItemTone,
  type DropdownMenuSeparatorProps,
} from './Item';

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger,
  Content,
  Item,
  Separator,
});
```

- [ ] **Step 6: Update `index.ts`**

```ts
// index.ts — unchanged surface, just re-exports from the new home.
export { DropdownMenu } from './DropdownMenu';
export type {
  DropdownMenuProps,
  DropdownMenuTriggerProps,
  DropdownMenuContentProps,
  DropdownMenuItemProps,
  DropdownMenuSeparatorProps,
  DropdownMenuSide,
  DropdownMenuAlign,
  DropdownMenuItemTone,
} from './DropdownMenu';
```

- [ ] **Step 7: Run gates**

```bash
npm test -w @eocrm/design-system
npm run typecheck
```

Expected: 186 tests pass, typecheck clean. **If any test fails, fix the regression before continuing — the split must be behavior-preserving.**

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "Refactor: split DropdownMenu into per-component files"
```

---

## Task 4: Add `<Label>` and `<Group>` + `GroupContext`

**Files:**
- Create: `packages/design-system/src/components/DropdownMenu/Group.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/context.ts` — add GroupContext
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx` — wire into compound export
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.module.scss` — add `.group` + `.label` styles
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx` — new suite

- [ ] **Step 1: Append failing tests**

```tsx
describe('DropdownMenu — Group and Label', () => {
  it('Label renders as a non-interactive text row', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Label>Sort by</DropdownMenu.Label>
          <DropdownMenu.Item onSelect={() => {}}>Name</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText('Sort by')).toBeInTheDocument();
    // Label is not a menuitem and not focusable.
    expect(screen.queryByRole('menuitem', { name: 'Sort by' })).toBeNull();
  });

  it('Group renders with role="group" and aria-labelledby points at Label id', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Group>
            <DropdownMenu.Label>Sort by</DropdownMenu.Label>
            <DropdownMenu.Item onSelect={() => {}}>Name</DropdownMenu.Item>
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const group = screen.getByRole('group');
    const label = screen.getByText('Sort by');
    expect(group).toHaveAttribute('aria-labelledby', label.id);
    expect(label.id).toBeTruthy();
  });

  it('Label outside a Group renders without aria id wiring', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Label>Quick actions</DropdownMenu.Label>
          <DropdownMenu.Item onSelect={() => {}}>Refresh</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    // Just renders; no role=group around it.
    expect(screen.getByText('Quick actions')).toBeInTheDocument();
    expect(screen.queryByRole('group')).toBeNull();
  });
});
```

- [ ] **Step 2: Add `GroupContext` to `context.ts`**

```ts
// context.ts — append:
export interface GroupContextValue {
  labelId: string;
}

export const GroupContext = createContext<GroupContextValue | null>(null);
```

- [ ] **Step 3: Implement `Group` and `Label` in `Group.tsx`**

```tsx
// Group.tsx
import { useContext, useId, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './DropdownMenu.module.scss';
import { GroupContext } from './context';
import { sanitizeId } from './utils';

export interface DropdownMenuGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Group({ children, className, ...rest }: DropdownMenuGroupProps) {
  const reactId = useId();
  const labelId = `dropdown-menu-label-${sanitizeId(reactId)}`;
  return (
    <GroupContext.Provider value={{ labelId }}>
      {/* {...rest} first so consumer props don't override role/aria. */}
      <div
        {...rest}
        role="group"
        aria-labelledby={labelId}
        className={clsx(styles.group, className)}
      >
        {children}
      </div>
    </GroupContext.Provider>
  );
}

export interface DropdownMenuLabelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Label({ children, className, id: idProp, ...rest }: DropdownMenuLabelProps) {
  const groupCtx = useContext(GroupContext);
  // If inside a Group, use the group's label id so aria-labelledby resolves.
  // Otherwise leave id as the consumer's (or undefined).
  const id = idProp ?? groupCtx?.labelId;
  return (
    <div {...rest} id={id} className={clsx(styles.label, className)}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Add SCSS for `.group` and `.label`**

Append to `DropdownMenu.module.scss`:

```scss
.group {
  display: flex;
  flex-direction: column;
  padding-block: var(--space-1);
}

.label {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-caps);
  text-transform: uppercase;
  color: var(--color-fg-subtle);
  user-select: none;
}
```

Note: `padding-block` is a logical padding property, allowed under Hard rule 4 (rule forbids `margin`, not `padding`).

- [ ] **Step 5: Wire `Group` and `Label` into the compound export**

In `DropdownMenu.tsx`:

```tsx
import { Group, Label } from './Group';

export { type DropdownMenuGroupProps, type DropdownMenuLabelProps } from './Group';

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger,
  Content,
  Item,
  Separator,
  Group,
  Label,
});
```

In `index.ts`:

```ts
export type {
  /* ... existing types ... */
  DropdownMenuGroupProps,
  DropdownMenuLabelProps,
} from './DropdownMenu';
```

- [ ] **Step 6: Run gates**

```bash
npm test -w @eocrm/design-system
npm run typecheck
npm run lint:css
```

Expected: 186 v1 tests + 3 new = 189 pass.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: add Group and Label subcomponents"
```

---

## Task 5: Add `<ItemIndicator>`

Pure passthrough component. CheckboxItem and RadioItem (Tasks 6-7) will detect and extract it.

**Files:**
- Create: `packages/design-system/src/components/DropdownMenu/ItemIndicator.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx` — wire into compound + export
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx` — minimal test

- [ ] **Step 1: Append minimal test (full coverage comes in Tasks 6-7 alongside CheckboxItem/RadioItem)**

```tsx
describe('DropdownMenu — ItemIndicator', () => {
  it('is a passthrough wrapper component', async () => {
    // Standalone render — ItemIndicator just renders its children inside a span.
    // CheckboxItem/RadioItem control visibility; ItemIndicator itself always renders.
    // When placed inside a regular Item (not CheckboxItem/RadioItem), it just
    // renders inline like any other child.
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>
            <DropdownMenu.ItemIndicator>marker</DropdownMenu.ItemIndicator>
            Edit
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText('marker')).toBeInTheDocument();
  });
});
```

Note: this test exercises that ItemIndicator renders at all; the integration with CheckboxItem/RadioItem is tested in Tasks 6-7.

- [ ] **Step 2: Implement `ItemIndicator.tsx`**

```tsx
// ItemIndicator.tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export interface DropdownMenuItemIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
}

/**
 * Marker component used inside a `<DropdownMenu.CheckboxItem>` or
 * `<DropdownMenu.RadioItem>` to provide a custom indicator (✓, ●, an icon,
 * an animated check, etc.).
 *
 * Detection is shallow: only direct children of CheckboxItem/RadioItem are
 * inspected. The parent extracts this component and decides when to render
 * it based on its own `checked` state. ItemIndicator itself is a thin span
 * wrapper.
 */
export const ItemIndicator = forwardRef<HTMLSpanElement, DropdownMenuItemIndicatorProps>(
  function ItemIndicator({ children, ...rest }, ref) {
    return (
      <span ref={ref} {...rest}>
        {children}
      </span>
    );
  },
);
```

- [ ] **Step 3: Wire into compound**

In `DropdownMenu.tsx`:

```tsx
import { ItemIndicator } from './ItemIndicator';

export { type DropdownMenuItemIndicatorProps } from './ItemIndicator';

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger,
  Content,
  Item,
  Separator,
  Group,
  Label,
  ItemIndicator,
});
```

In `index.ts`:

```ts
export type {
  /* ... */
  DropdownMenuItemIndicatorProps,
} from './DropdownMenu';
```

- [ ] **Step 4: No import changes needed**

The test uses `userEvent` and `render`/`screen`, all already imported.

- [ ] **Step 5: Run gates**

```bash
npm test -w @eocrm/design-system
npm run typecheck
```

Expected: 189 + 1 = 190 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: add ItemIndicator marker component"
```

---

## Task 6: Add `<CheckboxItem>`

**Files:**
- Create: `packages/design-system/src/components/DropdownMenu/CheckboxItem.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx` — wire into compound
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.module.scss` — `.indicatorSlot` styles
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx` — suite

- [ ] **Step 1: Append failing tests**

```tsx
describe('DropdownMenu — CheckboxItem', () => {
  it('renders as role="menuitemcheckbox" with aria-checked', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={true} onCheckedChange={() => {}}>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const item = screen.getByRole('menuitemcheckbox', { name: /Show archived/ });
    expect(item).toHaveAttribute('aria-checked', 'true');
  });

  it('aria-checked is false when checked=false', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={false} onCheckedChange={() => {}}>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('menuitemcheckbox', { name: /Show archived/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('fires onCheckedChange with !checked when clicked', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={false} onCheckedChange={onCheckedChange}>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /Show archived/ }));
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('default closeOnSelect=false — menu stays open after click', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={false} onCheckedChange={() => {}}>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /Show archived/ }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('closeOnSelect={true} closes the menu after click', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={false} onCheckedChange={() => {}} closeOnSelect>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /Show archived/ }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('disabled CheckboxItem does not fire onCheckedChange', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={false} onCheckedChange={onCheckedChange} disabled>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /Show archived/ }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('renders default ✓ glyph when checked and no ItemIndicator child', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={true} onCheckedChange={() => {}}>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const item = screen.getByRole('menuitemcheckbox', { name: /Show archived/ });
    expect(item.textContent).toContain('✓');
  });

  it('does NOT render default glyph when unchecked', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={false} onCheckedChange={() => {}}>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(
      screen.getByRole('menuitemcheckbox', { name: /Show archived/ }).textContent,
    ).not.toContain('✓');
  });

  it('renders a custom ItemIndicator when provided and checked', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={true} onCheckedChange={() => {}}>
            <DropdownMenu.ItemIndicator>
              <span data-testid="custom-indicator">★</span>
            </DropdownMenu.ItemIndicator>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByTestId('custom-indicator')).toBeInTheDocument();
    // The default ✓ should NOT also render.
    expect(
      screen.getByRole('menuitemcheckbox', { name: /Show archived/ }).textContent,
    ).not.toContain('✓');
  });
});
```

- [ ] **Step 2: Implement `CheckboxItem.tsx`**

```tsx
// CheckboxItem.tsx
import {
  Children,
  forwardRef,
  isValidElement,
  useId,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import styles from './DropdownMenu.module.scss';
import { useDropdownMenuContext } from './context';
import { mergeRefs } from './utils';
import { ItemIndicator } from './ItemIndicator';

export interface DropdownMenuCheckboxItemProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Whether the item is checked. */
  checked: boolean;
  /** Called with the new checked state when activated. */
  onCheckedChange: (checked: boolean) => void;
  /**
   * Whether activating closes the entire menu chain. Defaults to `false` —
   * checkbox items typically toggle in place inside a multi-select menu.
   */
  closeOnSelect?: boolean;
  /** Disabled items don't fire onCheckedChange, are skipped by keyboard nav, render dimmed. */
  disabled?: boolean;
  /** Optional trailing shortcut hint (e.g. `'⌘D'`). */
  shortcut?: string;
  children: ReactNode;
}

export const CheckboxItem = forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  function CheckboxItem(
    {
      checked,
      onCheckedChange,
      closeOnSelect = false,
      disabled = false,
      shortcut,
      className,
      children,
      ...rest
    },
    forwardedRef,
  ) {
    const ctx = useDropdownMenuContext('CheckboxItem');
    const itemRef = useRef<HTMLDivElement | null>(null);
    const id = useId();

    // Children-extraction: find an ItemIndicator among the direct children.
    const childrenArray = Children.toArray(children);
    const indicator = childrenArray.find(
      (c) => isValidElement(c) && c.type === ItemIndicator,
    );
    const labelContent = childrenArray.filter((c) => c !== indicator);
    const labelText =
      labelContent.find((c): c is string => typeof c === 'string') ?? '';

    useLayoutEffect(() => {
      return ctx.registerItem({ id, ref: itemRef, disabled, label: labelText });
    }, [ctx, id, disabled, labelText]);

    const index = ctx.itemsRef.current.findIndex((x) => x.id === id);
    const isActive = index !== -1 && index === ctx.activeIndex;

    const handleClick = (_e: MouseEvent) => {
      if (disabled) return;
      onCheckedChange(!checked);
      if (closeOnSelect) {
        ctx.closeAll();
      }
    };

    return (
      // {...rest} first so consumer-supplied props don't override the menuitemcheckbox contract.
      <div
        {...rest}
        ref={mergeRefs<HTMLDivElement>(itemRef, forwardedRef)}
        role="menuitemcheckbox"
        tabIndex={isActive ? 0 : -1}
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        className={clsx(styles.item, className)}
        onClick={handleClick}
      >
        <span className={styles.indicatorSlot}>
          {checked && (indicator ?? <span className={styles.defaultIndicator}>✓</span>)}
        </span>
        <span className={styles.itemLabel}>{labelContent}</span>
        {shortcut !== undefined && <span className={styles.shortcut}>{shortcut}</span>}
      </div>
    );
  },
);
```

Note about the existing `.item` style class: the same class is reused so visual consistency is automatic. The new `.indicatorSlot` and `.defaultIndicator` styles are added in Step 3.

- [ ] **Step 3: Add SCSS for indicator slot**

Append to `DropdownMenu.module.scss`:

```scss
.indicatorSlot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--size-dropdown-indicator);
  height: var(--size-dropdown-indicator);
  flex-shrink: 0;
}

.defaultIndicator {
  font-size: var(--font-size-md);
  line-height: var(--line-height-none);
  color: currentColor;
}

.itemLabel {
  flex: 1 1 auto;
}
```

The `.itemLabel` class is new — it's the renamed slot for item text content (was the bare label span before; explicit class makes layout overrides safer). Update the existing `Item.tsx` to use `styles.itemLabel` instead of `styles.label` (since `styles.label` is now the Group's section label). **This is a small but important rename:** check `Item.tsx` after the split (Task 3) — it currently uses `styles.label` for the item's text span. Rename to `styles.itemLabel` here AND fix Item.tsx.

(Actually, looking carefully: Task 3 preserved `styles.label` in Item.tsx. Task 4 added `styles.label` for the Group label. There's now a collision. Resolution: rename the Item.tsx span class to `styles.itemLabel` and remove the now-conflicting `.label` rule that referred to item text. The new `.label` rule from Task 4 is the only `.label` rule in the SCSS.)

Specifically: in `Item.tsx`, change `<span className={styles.label}>` to `<span className={styles.itemLabel}>`. Also delete the old `.label { flex: 1 1 auto; }` rule from the SCSS if it survived Task 3 (it should have been replaced by the Group `.label` rule in Task 4 — verify).

If the SCSS already only has the Group label `.label` rule (uppercase, semibold, etc.), then Item is already broken (Item's text would render uppercase!). The rename to `.itemLabel` fixes this.

Also need to add the indicator-slot size token. Append to `tokens.scss`:

```scss
// Width/height of the leading indicator slot in DropdownMenu checkbox/radio items.
--size-dropdown-indicator: 16px;
```

Place near `--size-dropdown-min-width`.

- [ ] **Step 4: Wire into compound**

In `DropdownMenu.tsx`:

```tsx
import { CheckboxItem } from './CheckboxItem';

export { type DropdownMenuCheckboxItemProps } from './CheckboxItem';

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger,
  Content,
  Item,
  Separator,
  Group,
  Label,
  ItemIndicator,
  CheckboxItem,
});
```

Add `DropdownMenuCheckboxItemProps` to `index.ts` exports.

- [ ] **Step 5: Run gates**

```bash
npm test -w @eocrm/design-system
npm run typecheck
npm run lint:css
```

Expected: 190 + 9 = 199 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/ packages/design-system/src/styles/tokens.scss
git commit -m "DropdownMenu: add CheckboxItem with ItemIndicator support"
```

---

## Task 7: Add `<RadioGroup>` + `<RadioItem>`

**Files:**
- Create: `packages/design-system/src/components/DropdownMenu/Radio.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/context.ts` — RadioGroupContext
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx` — wire into compound
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx` — suite

- [ ] **Step 1: Append failing tests**

```tsx
describe('DropdownMenu — RadioGroup and RadioItem', () => {
  function renderRadio(value: string, onValueChange = () => {}) {
    return render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.RadioGroup value={value} onValueChange={onValueChange}>
            <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="size">Size</DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
  }

  it('renders RadioGroup with role="radiogroup"', async () => {
    const user = userEvent.setup();
    renderRadio('name');
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('RadioItems have role="menuitemradio" and aria-checked reflects value', async () => {
    const user = userEvent.setup();
    renderRadio('date');
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('menuitemradio', { name: 'Name' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('menuitemradio', { name: 'Date' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('clicking a RadioItem fires onValueChange with its value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderRadio('name', onValueChange);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Date' }));
    expect(onValueChange).toHaveBeenCalledWith('date');
  });

  it('default closeOnSelect=true — menu closes after click', async () => {
    const user = userEvent.setup();
    renderRadio('name');
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Date' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closeOnSelect={false} keeps menu open after click', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.RadioGroup value="name" onValueChange={() => {}}>
            <DropdownMenu.RadioItem value="name" closeOnSelect={false}>
              Name
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="date" closeOnSelect={false}>
              Date
            </DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Date' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('renders default ● glyph on the selected RadioItem', async () => {
    const user = userEvent.setup();
    renderRadio('date');
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('menuitemradio', { name: 'Date' }).textContent).toContain('●');
    expect(screen.getByRole('menuitemradio', { name: 'Name' }).textContent).not.toContain('●');
  });

  it('RadioItem outside a RadioGroup throws a helpful error', () => {
    // Capture console.error to silence the React error log.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <button type="button">Open</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.RadioItem value="x">X</DropdownMenu.RadioItem>
          </DropdownMenu.Content>
        </DropdownMenu>,
      ),
    ).toThrow(/RadioGroup/);
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Add `RadioGroupContext` to `context.ts`**

```ts
// context.ts — append:
export interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export function useRadioGroupContext(component: string): RadioGroupContextValue {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) {
    throw new Error(`<DropdownMenu.${component}> must be used inside <DropdownMenu.RadioGroup>`);
  }
  return ctx;
}
```

- [ ] **Step 3: Implement `Radio.tsx`**

```tsx
// Radio.tsx
import {
  Children,
  forwardRef,
  isValidElement,
  useId,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import styles from './DropdownMenu.module.scss';
import { RadioGroupContext, useDropdownMenuContext, useRadioGroupContext } from './context';
import { mergeRefs } from './utils';
import { ItemIndicator } from './ItemIndicator';

export interface DropdownMenuRadioGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** The currently-selected value. */
  value: string;
  /** Called with the new value when a RadioItem is activated. */
  onValueChange: (value: string) => void;
  children: ReactNode;
}

export const RadioGroup = forwardRef<HTMLDivElement, DropdownMenuRadioGroupProps>(
  function RadioGroup({ value, onValueChange, className, children, ...rest }, ref) {
    return (
      <RadioGroupContext.Provider value={{ value, onValueChange }}>
        <div {...rest} ref={ref} role="radiogroup" className={clsx(styles.group, className)}>
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  },
);

export interface DropdownMenuRadioItemProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** The value this item represents. Activating sets the group's value to this. */
  value: string;
  /**
   * Whether activating closes the entire menu chain. Defaults to `true` —
   * radio is "the selection IS the action".
   */
  closeOnSelect?: boolean;
  disabled?: boolean;
  shortcut?: string;
  children: ReactNode;
}

export const RadioItem = forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(
  function RadioItem(
    {
      value,
      closeOnSelect = true,
      disabled = false,
      shortcut,
      className,
      children,
      ...rest
    },
    forwardedRef,
  ) {
    const ctx = useDropdownMenuContext('RadioItem');
    const groupCtx = useRadioGroupContext('RadioItem');
    const itemRef = useRef<HTMLDivElement | null>(null);
    const id = useId();

    const checked = groupCtx.value === value;

    const childrenArray = Children.toArray(children);
    const indicator = childrenArray.find(
      (c) => isValidElement(c) && c.type === ItemIndicator,
    );
    const labelContent = childrenArray.filter((c) => c !== indicator);
    const labelText =
      labelContent.find((c): c is string => typeof c === 'string') ?? '';

    useLayoutEffect(() => {
      return ctx.registerItem({ id, ref: itemRef, disabled, label: labelText });
    }, [ctx, id, disabled, labelText]);

    const index = ctx.itemsRef.current.findIndex((x) => x.id === id);
    const isActive = index !== -1 && index === ctx.activeIndex;

    const handleClick = (_e: MouseEvent) => {
      if (disabled) return;
      groupCtx.onValueChange(value);
      if (closeOnSelect) {
        ctx.closeAll();
      }
    };

    return (
      <div
        {...rest}
        ref={mergeRefs<HTMLDivElement>(itemRef, forwardedRef)}
        role="menuitemradio"
        tabIndex={isActive ? 0 : -1}
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        className={clsx(styles.item, className)}
        onClick={handleClick}
      >
        <span className={styles.indicatorSlot}>
          {checked && (indicator ?? <span className={styles.defaultIndicator}>●</span>)}
        </span>
        <span className={styles.itemLabel}>{labelContent}</span>
        {shortcut !== undefined && <span className={styles.shortcut}>{shortcut}</span>}
      </div>
    );
  },
);
```

- [ ] **Step 4: Wire into compound**

In `DropdownMenu.tsx`:

```tsx
import { RadioGroup, RadioItem } from './Radio';

export {
  type DropdownMenuRadioGroupProps,
  type DropdownMenuRadioItemProps,
} from './Radio';

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger,
  Content,
  Item,
  Separator,
  Group,
  Label,
  ItemIndicator,
  CheckboxItem,
  RadioGroup,
  RadioItem,
});
```

Update `index.ts`.

- [ ] **Step 5: Run gates**

```bash
npm test -w @eocrm/design-system
npm run typecheck
```

Expected: 199 + 7 = 206 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: add RadioGroup and RadioItem"
```

---

## Task 8: Submenu scaffolding — `<Sub>` provider with recursive context

This task adds the `<Sub>` provider that creates a new context shadowing the parent. SubTrigger and SubContent come in Tasks 9-10. After this task: `<DropdownMenu.Sub>` exists, has its own open state, but does nothing visible yet — placeholder test verifies the context wiring.

**Files:**
- Create: `packages/design-system/src/components/DropdownMenu/Sub.tsx` — Sub only (SubTrigger and SubContent in next tasks)
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx` — wire Sub into compound
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx` — placeholder test

- [ ] **Step 1: Append a placeholder test**

```tsx
describe('DropdownMenu — Sub (scaffolding)', () => {
  it('Sub renders its children inside a fresh context (depth > 0)', async () => {
    // Without SubTrigger/SubContent yet, just verify Sub doesn't crash and
    // its children render.
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Sub>
            <span data-testid="sub-child">child of sub</span>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByTestId('sub-child')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `Sub.tsx` with recursive context**

```tsx
// Sub.tsx
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  DropdownMenuContext,
  useDropdownMenuContext,
  type DropdownMenuContextValue,
  type RegisteredItem,
} from './context';
import { sanitizeId } from './utils';

export interface DropdownMenuSubProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export function Sub({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: DropdownMenuSubProps) {
  // Read the PARENT context so we can wrap its closeAll.
  const parentCtx = useDropdownMenuContext('Sub');

  const isControlled = controlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = isControlled ? (controlledOpen as boolean) : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (!isControlled) setUncontrolledOpen(next);
    },
    [isControlled, onOpenChange],
  );

  const triggerRef = useRef<HTMLElement | null>(null);
  const reactId = useId();
  const contentId = `dropdown-menu-sub-${sanitizeId(reactId)}`;
  const [openIntent, setOpenIntent] = useState<'first' | 'last' | null>(null);

  const itemsRef = useRef<RegisteredItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const registerItem = useCallback((item: RegisteredItem) => {
    if (!itemsRef.current.some((x) => x.id === item.id)) {
      itemsRef.current.push(item);
    }
    return () => {
      itemsRef.current = itemsRef.current.filter((x) => x.id !== item.id);
    };
  }, []);

  // When this sub closes, reset its activeIndex.
  useEffect(() => {
    if (!open) setActiveIndex(-1);
  }, [open]);

  // closeAll: close THIS sub, then walk up via parent.
  const closeAll = useCallback(() => {
    setOpen(false);
    parentCtx.closeAll();
  }, [setOpen, parentCtx]);

  const value: DropdownMenuContextValue = {
    open,
    setOpen,
    triggerRef,
    contentId,
    openIntent,
    setOpenIntent,
    registerItem,
    itemsRef,
    activeIndex,
    setActiveIndex,
    closeAll,
    depth: parentCtx.depth + 1,
  };

  return <DropdownMenuContext.Provider value={value}>{children}</DropdownMenuContext.Provider>;
}
```

Note this looks similar to `DropdownMenuRoot`, but key differences:
- Reads parent context to wrap `closeAll`.
- `depth = parent.depth + 1`.

- [ ] **Step 3: Wire into compound**

In `DropdownMenu.tsx`:

```tsx
import { Sub } from './Sub';

export { type DropdownMenuSubProps } from './Sub';

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger,
  Content,
  Item,
  Separator,
  Group,
  Label,
  ItemIndicator,
  CheckboxItem,
  RadioGroup,
  RadioItem,
  Sub,
});
```

Update `index.ts`.

- [ ] **Step 4: Run gates**

```bash
npm test -w @eocrm/design-system
npm run typecheck
```

Expected: 206 + 1 = 207 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: add Sub provider with recursive context"
```

---

## Task 9: Add `<SubTrigger>`

SubTrigger is the menuitem in the parent menu that opens the sub on click / hover / keyboard. It does NOT yet handle hover delays (Task 11) or ArrowRight (Task 12) — just click-to-open in this task.

**Files:**
- Modify: `packages/design-system/src/components/DropdownMenu/Sub.tsx` — add SubTrigger
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.module.scss` — chevron
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx` — suite

- [ ] **Step 1: Append failing tests**

```tsx
describe('DropdownMenu — SubTrigger (click only — hover/keyboard in later tasks)', () => {
  function renderSub() {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Regular</DropdownMenu.Item>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item onSelect={() => {}}>Nested</DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    return { user };
  }

  it('SubTrigger renders as a menuitem in the parent menu', async () => {
    const { user } = renderSub();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('menuitem', { name: /More/ })).toBeInTheDocument();
  });

  it('SubTrigger has aria-haspopup="menu" and aria-expanded=false initially', async () => {
    const { user } = renderSub();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const sub = screen.getByRole('menuitem', { name: /More/ });
    expect(sub).toHaveAttribute('aria-haspopup', 'menu');
    expect(sub).toHaveAttribute('aria-expanded', 'false');
  });

  it('clicking SubTrigger opens the sub and sets aria-expanded=true', async () => {
    const { user } = renderSub();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: /More/ }));
    expect(screen.getByRole('menuitem', { name: /More/ })).toHaveAttribute('aria-expanded', 'true');
    // Sub's content is now in the DOM.
    expect(screen.getByRole('menuitem', { name: 'Nested' })).toBeInTheDocument();
  });

  it('disabled SubTrigger does not open the sub on click', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger disabled>More</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item onSelect={() => {}}>Nested</DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: /More/ }));
    expect(screen.getByRole('menuitem', { name: /More/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
```

- [ ] **Step 2: Implement SubTrigger in `Sub.tsx`**

Append to `Sub.tsx`:

```tsx
import {
  forwardRef,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import styles from './DropdownMenu.module.scss';
import { mergeRefs } from './utils';

export interface DropdownMenuSubTriggerProps extends HTMLAttributes<HTMLDivElement> {
  /** Disabled SubTrigger renders dimmed and doesn't open the sub. */
  disabled?: boolean;
  /** Optional leading icon, matching Item's icon slot. */
  icon?: ReactNode;
  children: ReactNode;
}

export const SubTrigger = forwardRef<HTMLDivElement, DropdownMenuSubTriggerProps>(
  function SubTrigger({ disabled = false, icon, className, children, ...rest }, forwardedRef) {
    // SubTrigger reads the PARENT context (it's a menuitem in the parent menu),
    // but it also needs to control the SUB's open state. Sub renders the
    // SubTrigger AS A SIBLING of SubContent, and Sub provides the SUB's
    // context. So SubTrigger reading useContext directly here gets the SUB's
    // context — wrong.
    //
    // The fix: Sub renders SubTrigger as a child of the SUB context provider,
    // but SubTrigger needs the PARENT context. We solve this by having Sub
    // explicitly thread the parent context value down via a sub-internal
    // context (call it SubParentContext), or by having SubTrigger render
    // OUTSIDE Sub.
    //
    // We'll use a small SubParentContext that Sub provides alongside its main
    // DropdownMenuContext. SubTrigger reads SubParentContext to get the parent
    // (where to register), reads the regular context (now the sub's) to get
    // sub.setOpen.
    //
    // See context.ts for the SubParentContext definition added below.
    /* The implementation below assumes SubParentContext is in place. */
    const subCtx = useDropdownMenuContext('SubTrigger');
    const parentCtx = useContext(SubParentContext);
    if (!parentCtx) {
      throw new Error('<DropdownMenu.SubTrigger> must be used inside <DropdownMenu.Sub>');
    }

    const triggerRefLocal = useRef<HTMLDivElement | null>(null);
    const id = useId();
    const labelText = typeof children === 'string' ? children : '';

    // Register with PARENT's registry so this is a menuitem in the parent
    // menu (focus management, typeahead, navigation). Include openSubmenu so
    // ArrowRight (Task 12) can invoke it.
    useLayoutEffect(() => {
      return parentCtx.registerItem({
        id,
        ref: triggerRefLocal,
        disabled,
        label: labelText,
        openSubmenu: () => {
          subCtx.setOpenIntent('first');
          subCtx.setOpen(true);
        },
      });
    }, [parentCtx, id, disabled, labelText, subCtx]);

    const index = parentCtx.itemsRef.current.findIndex((x) => x.id === id);
    const isActive = index !== -1 && index === parentCtx.activeIndex;

    // Also save into subCtx.triggerRef so SubContent positions against it.
    useLayoutEffect(() => {
      subCtx.triggerRef.current = triggerRefLocal.current;
    });

    const handleClick = (_e: MouseEvent) => {
      if (disabled) return;
      subCtx.setOpen(true);
    };

    return (
      <div
        {...rest}
        ref={mergeRefs<HTMLDivElement>(triggerRefLocal, forwardedRef)}
        role="menuitem"
        tabIndex={isActive ? 0 : -1}
        aria-haspopup="menu"
        aria-expanded={subCtx.open}
        aria-controls={subCtx.open ? subCtx.contentId : undefined}
        aria-disabled={disabled || undefined}
        data-state={subCtx.open ? 'open' : 'closed'}
        className={clsx(styles.item, styles.subTrigger, className)}
        onClick={handleClick}
      >
        {icon !== undefined && <span className={styles.icon}>{icon}</span>}
        <span className={styles.itemLabel}>{children}</span>
        <span className={styles.subTriggerChevron} aria-hidden="true">
          ▶
        </span>
      </div>
    );
  },
);
```

The SubParentContext mentioned above needs to be added. In `context.ts`:

```ts
// context.ts — append:
export const SubParentContext = createContext<DropdownMenuContextValue | null>(null);
```

And in `Sub.tsx`, the `Sub` function needs to wrap its children with BOTH the new sub context AND `SubParentContext.Provider` carrying the parent context value:

```tsx
// In Sub function — wrap children with both providers:
return (
  <SubParentContext.Provider value={parentCtx}>
    <DropdownMenuContext.Provider value={value}>{children}</DropdownMenuContext.Provider>
  </SubParentContext.Provider>
);
```

The double provider keeps SubTrigger and SubContent in the sub context (so they read sub state), while letting SubTrigger reach back to the parent via SubParentContext for registry purposes.

Import `SubParentContext` in `Sub.tsx` from `./context`. Update the existing `useDropdownMenuContext` import to include `useContext` from React and the new context.

- [ ] **Step 3: Add SCSS for SubTrigger chevron**

Append to `DropdownMenu.module.scss`:

```scss
.subTrigger {
  // Inherits from .item; just add the chevron alignment.
}

.subTriggerChevron {
  display: inline-flex;
  align-items: center;
  font-size: var(--font-size-xs);
  color: var(--color-fg-subtle);
  padding-left: var(--space-2);
}

// When the sub is open, keep the trigger visually highlighted via data-state.
.subTrigger[data-state='open'] {
  background: var(--color-bg-muted);
}
```

- [ ] **Step 4: Wire SubTrigger into compound**

In `DropdownMenu.tsx`:

```tsx
import { Sub, SubTrigger } from './Sub';

export {
  type DropdownMenuSubProps,
  type DropdownMenuSubTriggerProps,
} from './Sub';

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  /* ... */
  Sub,
  SubTrigger,
});
```

Update `index.ts`.

- [ ] **Step 5: Run gates**

```bash
npm test -w @eocrm/design-system
npm run typecheck
npm run lint:css
```

Expected: 207 + 4 = 211 tests pass. **Note**: the test that uses `<DropdownMenu.SubContent>` in step 1 needs SubContent to exist — but SubContent is Task 10. To make Task 9's tests pass before Task 10, the third test in Step 1 ("clicking SubTrigger opens the sub and sets aria-expanded=true") asserts `getByRole('menuitem', { name: 'Nested' })`. This requires SubContent to render its children. **Reconsider the test ordering**: either move that assertion to Task 10's tests, or implement a minimal stub SubContent inline in this task.

**Resolution:** in Task 9, replace the third test's assertion `expect(screen.getByRole('menuitem', { name: 'Nested' })).toBeInTheDocument();` with `expect(screen.getByRole('menuitem', { name: /More/ })).toHaveAttribute('aria-expanded', 'true');`. The aria-expanded check is sufficient for "the sub opened" in Task 9; the actual sub content rendering is verified in Task 10. Also remove the `<DropdownMenu.SubContent>` from the `renderSub()` fixture in this task — it would resolve to the placeholder Sub from Task 8 which doesn't have SubContent yet... actually wait, Task 8 didn't add SubContent at all. So referencing `DropdownMenu.SubContent` in Step 1's JSX would fail with "undefined component".

**Final resolution for Task 9 test fixture:** drop the `<DropdownMenu.SubContent>` and its children entirely from the test. Just test SubTrigger:

```tsx
function renderSub() {
  const user = userEvent.setup();
  render(
    <DropdownMenu>
      <DropdownMenu.Trigger>
        <button type="button">Open</button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onSelect={() => {}}>Regular</DropdownMenu.Item>
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
        </DropdownMenu.Sub>
      </DropdownMenu.Content>
    </DropdownMenu>,
  );
  return { user };
}
```

And drop the assertion on `'Nested'`. The integration test with full SubTrigger → SubContent comes in Task 10.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: add SubTrigger (click-to-open)"
```

---

## Task 10: Add `<SubContent>`

SubContent is a variant of Content that anchors to its SubTrigger via the sub's `triggerRef`. Same Floating UI usage with `placement='right-start'`. Same outside-click + Escape + Tab dismissal. Adds ArrowLeft to close just this level.

**Files:**
- Modify: `packages/design-system/src/components/DropdownMenu/Sub.tsx` — add SubContent
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx` — suite

- [ ] **Step 1: Append failing tests**

```tsx
describe('DropdownMenu — SubContent', () => {
  function renderNested() {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item onSelect={() => {}}>CSV</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}}>JSON</DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    return { user };
  }

  it('SubContent renders the sub items when sub is open', async () => {
    const { user } = renderNested();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.queryByRole('menuitem', { name: 'CSV' })).toBeNull();
    await user.click(screen.getByRole('menuitem', { name: /Export/ }));
    expect(screen.getByRole('menuitem', { name: 'CSV' })).toBeInTheDocument();
  });

  it('selecting an Item inside SubContent closes the ENTIRE chain', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item onSelect={onSelect}>CSV</DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: /Export/ }));
    await user.click(screen.getByRole('menuitem', { name: 'CSV' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    // Both root and sub are closed.
    expect(screen.queryAllByRole('menu')).toHaveLength(0);
  });

  it('Escape from inside SubContent closes only the sub (root stays open)', async () => {
    const { user } = renderNested();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: /Export/ }));
    expect(screen.getAllByRole('menu')).toHaveLength(2); // root + sub
    // Focus into the sub first so the sub's keydown listener catches Escape.
    const subMenu = screen.getAllByRole('menu')[1];
    subMenu.focus();
    await user.keyboard('{Escape}');
    // Sub closed, root still open.
    expect(screen.queryAllByRole('menu')).toHaveLength(1);
  });

  it('clicking far outside closes the entire chain', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <button type="button">Open</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                <DropdownMenu.Item onSelect={() => {}}>CSV</DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
          </DropdownMenu.Content>
        </DropdownMenu>
        <button type="button">Outside</button>
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: /Export/ }));
    expect(screen.getAllByRole('menu')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryAllByRole('menu')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Implement SubContent**

The simplest implementation reuses `Content` directly. SubContent IS a Content with a different default placement. Append to `Sub.tsx`:

```tsx
import { Content, type DropdownMenuContentProps } from './Content';

export type DropdownMenuSubContentProps = DropdownMenuContentProps;

export const SubContent = forwardRef<HTMLDivElement, DropdownMenuSubContentProps>(
  function SubContent({ side = 'bottom', align = 'start', ...rest }, ref) {
    // Submenus default to side='bottom' too, but the consumer often wants 'right'
    // (open beside the parent menu). Floating UI's flip() handles overflow either way.
    // Recommended override at the call site: <SubContent side="right" /> for
    // classic side-by-side submenus. Default kept at 'bottom' to match Content.
    return <Content ref={ref} side={side} align={align} {...rest} />;
  },
);
```

But this won't handle ArrowLeft (close-sub-and-return-to-SubTrigger). For that, Content's `handleKeyDown` needs to know about `depth > 0` semantics — OR SubContent needs to wrap Content with an extra keydown handler.

**Simpler path: extend Content to handle ArrowLeft when `ctx.depth > 0`.** Modify `Content.tsx`'s `handleKeyDown` to add:

```tsx
if (e.key === 'ArrowLeft' && ctx.depth > 0) {
  e.preventDefault();
  ctx.setOpen(false);
  ctx.triggerRef.current?.focus();
  return;
}
```

Place this before the existing Arrow/Home/End switch. Since `ctx.depth === 0` for root, ArrowLeft inside root content does nothing (correct — root has no parent to escape to).

This means we don't need SubContent to do anything special — it's literally Content with a different placement default. Even simpler:

```tsx
export const SubContent = Content;
export type DropdownMenuSubContentProps = DropdownMenuContentProps;
```

Wait — they need different display names for devtools, and they might diverge later. Use a thin wrapper:

```tsx
export const SubContent = forwardRef<HTMLDivElement, DropdownMenuSubContentProps>(
  function SubContent(props, ref) {
    return <Content ref={ref} {...props} />;
  },
);
```

Now Content's modified ArrowLeft handler gates on `ctx.depth > 0`, doing the right thing for both root (no-op) and subs (close + focus trigger).

Also, the existing close-on-select Item path in `Item.tsx` currently calls `ctx.setOpen(false)` + `ctx.triggerRef.current?.focus()`. For the cascading-close semantics, Item should call `ctx.closeAll()` instead:

```tsx
// In Item.tsx, in handleClick:
const handleClick = (_e: MouseEvent) => {
  if (disabled) return;
  onSelect();
  ctx.closeAll();
};
```

And `closeAll` at the root sets `setOpen(false)` AND focuses the root trigger:

```ts
// In Root.tsx, fix the closeAll provided in the context value:
closeAll: () => {
  setOpen(false);
  triggerRef.current?.focus();
},
```

In Sub.tsx's `closeAll`:

```ts
closeAll: () => {
  setOpen(false);
  parentCtx.closeAll();
},
```

This way:
- Item.onClick → `ctx.closeAll()` → walks up the chain, ultimately closes root + focuses root trigger.
- Escape on a sub → `ctx.setOpen(false)` (NOT closeAll) → only this level closes; focus moves to SubTrigger.

In Content's `handleKeyDown`, Escape currently does `ctx.setOpen(false)` + `ctx.triggerRef.current?.focus()`. For sub depth, that's: close this sub, focus this sub's trigger (the SubTrigger). Correct.

In Content's document-level Escape listener (the one for trigger-still-focused-after-mouse-open), update similarly — `ctx.setOpen(false)` only (no closeAll).

In CheckboxItem and RadioItem (Tasks 6, 7), when `closeOnSelect=true`, we already call `ctx.closeAll()`. Good.

- [ ] **Step 3: Update `Item.tsx` to use `closeAll`**

Change Item's `handleClick` to use `ctx.closeAll()` instead of the separate setOpen + focus calls:

```tsx
const handleClick = (_e: MouseEvent) => {
  if (disabled) return;
  onSelect();
  ctx.closeAll();
};
```

- [ ] **Step 4: Update `Root.tsx`'s `closeAll` to focus the root trigger**

```ts
const closeAll = useCallback(() => {
  setOpen(false);
  triggerRef.current?.focus();
}, [setOpen]);

// In the context value:
closeAll,
```

(Previously the context value had `closeAll: () => setOpen(false)` inline; extract to a `useCallback` for clarity and to allow the focus call.)

- [ ] **Step 5: Update Content's `handleKeyDown` to support ArrowLeft for subs**

In `Content.tsx`, in the `handleKeyDown` function, add the ArrowLeft branch BEFORE the existing switch:

```tsx
if (e.key === 'ArrowLeft' && ctx.depth > 0) {
  e.preventDefault();
  ctx.setOpen(false);
  ctx.triggerRef.current?.focus();
  return;
}
```

- [ ] **Step 6: Wire SubContent into compound**

In `DropdownMenu.tsx`:

```tsx
import { Sub, SubTrigger, SubContent } from './Sub';

export {
  /* ... */
  type DropdownMenuSubContentProps,
} from './Sub';

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  /* ... */
  Sub,
  SubTrigger,
  SubContent,
});
```

Update `index.ts`.

- [ ] **Step 7: Run gates**

```bash
npm test -w @eocrm/design-system
npm run typecheck
```

Expected: 211 + 4 = 215 tests pass.

If existing tests fail because of the closeAll change (e.g., an existing test expected setOpen specifically), debug and resolve — the behavior should be equivalent for root depth.

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: add SubContent and cascading closeAll for subs"
```

---

## Task 11: Submenu hover behavior — 100ms open, 200ms close

**Files:**
- Modify: `packages/design-system/src/components/DropdownMenu/Sub.tsx` — SubTrigger gets hover handlers
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx` — suite

- [ ] **Step 1: Append failing tests (uses fake timers)**

```tsx
describe('DropdownMenu — Submenu hover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    configure({
      asyncWrapper: async (cb) => {
        const result = await cb();
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
          vi.advanceTimersByTime(0);
        });
        return result;
      },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    configure({ asyncWrapper: async (cb) => cb() });
  });

  function renderNested() {
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item onSelect={() => {}}>CSV</DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    return { user };
  }

  it('hovering SubTrigger opens the sub after 100ms', async () => {
    const { user } = renderNested();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const subTrigger = screen.getByRole('menuitem', { name: /Export/ });
    await user.hover(subTrigger);
    // Not yet open at t=0:
    expect(screen.queryByRole('menuitem', { name: 'CSV' })).toBeNull();
    vi.advanceTimersByTime(100);
    expect(screen.getByRole('menuitem', { name: 'CSV' })).toBeInTheDocument();
  });

  it('hovering away from SubTrigger cancels pending open', async () => {
    const { user } = renderNested();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const subTrigger = screen.getByRole('menuitem', { name: /Export/ });
    await user.hover(subTrigger);
    vi.advanceTimersByTime(50);  // before threshold
    await user.unhover(subTrigger);
    vi.advanceTimersByTime(100); // past original threshold
    expect(screen.queryByRole('menuitem', { name: 'CSV' })).toBeNull();
  });

  it('hovering away from open sub closes it after 200ms', async () => {
    const { user } = renderNested();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const subTrigger = screen.getByRole('menuitem', { name: /Export/ });
    await user.hover(subTrigger);
    vi.advanceTimersByTime(100); // sub opens
    expect(screen.getByRole('menuitem', { name: 'CSV' })).toBeInTheDocument();
    await user.unhover(subTrigger);
    vi.advanceTimersByTime(100); // before close threshold
    expect(screen.getByRole('menuitem', { name: 'CSV' })).toBeInTheDocument();
    vi.advanceTimersByTime(100); // past 200ms total
    expect(screen.queryByRole('menuitem', { name: 'CSV' })).toBeNull();
  });
});
```

- [ ] **Step 2: Add hover handlers to `SubTrigger`**

In `Sub.tsx`'s `SubTrigger`, add:

```tsx
const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const clearTimers = useCallback(() => {
  if (openTimerRef.current) {
    clearTimeout(openTimerRef.current);
    openTimerRef.current = null;
  }
  if (closeTimerRef.current) {
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }
}, []);

useEffect(() => () => clearTimers(), [clearTimers]);

const handlePointerEnter = useCallback(() => {
  if (disabled) return;
  if (closeTimerRef.current) {
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }
  if (subCtx.open) return;
  openTimerRef.current = setTimeout(() => {
    subCtx.setOpen(true);
    openTimerRef.current = null;
  }, 100);
}, [disabled, subCtx]);

const handlePointerLeave = useCallback(() => {
  if (openTimerRef.current) {
    clearTimeout(openTimerRef.current);
    openTimerRef.current = null;
  }
  if (!subCtx.open) return;
  closeTimerRef.current = setTimeout(() => {
    subCtx.setOpen(false);
    closeTimerRef.current = null;
  }, 200);
}, [subCtx]);
```

Wire them onto the SubTrigger `<div>`:

```tsx
onPointerEnter={handlePointerEnter}
onPointerLeave={handlePointerLeave}
```

Add `useCallback`, `useEffect` to the React imports if not already present.

**Sub also needs to cancel its own close timer when hovering over SubContent.** This requires adding pointerenter handlers to SubContent too, or routing the hover state through context. Simpler: pass `cancelClose` and `scheduleClose` via a small `SubHoverContext` from SubTrigger to SubContent.

Actually, even simpler: when SubContent itself is hovered, it can call `subCtx.setOpen(true)` (which is a no-op if already open) AND clear any pending close timer. The close timer is on SubTrigger's ref, which SubContent can't access directly.

Pragmatic approach: store the close timer ref on the SUB context value itself (extension), so both SubTrigger and SubContent can clear it. Add to `DropdownMenuContextValue` an optional `_subCloseTimer` field — internal, not for consumer use.

Going with that:

```ts
// context.ts — extend DropdownMenuContextValue:
/** @internal Submenu hover close timer; shared between SubTrigger and SubContent. */
_subCloseTimer?: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
```

In `Sub.tsx`, create the ref once at the Sub level and put it in the context value. SubTrigger and SubContent both clear it on pointer enter.

Hmm — this is getting baroque. **Alternative simpler approach:** detect hover state on the union of SubTrigger and SubContent rectangles via a single boolean and a small debounce. Too complex for v2.

**Even simpler approach for v2:** accept the limitation that mouse must travel from SubTrigger directly to SubContent without dipping into a sibling Item — if the user dips into a sibling, the close timer fires. The "safe-triangle" trick is what Radix uses to allow diagonal movement, and we're explicitly skipping it in v2 (spec out-of-scope item).

What we DO want: hovering INSIDE SubContent should cancel the close timer. Implement this by having SubContent's wrapper call clearTimeout on pointer enter. But it needs access to SubTrigger's timer.

**Final design for v2:**

Add to `Sub.tsx`'s `Sub` provider a shared `closeTimerRef` and expose it via a small `SubHoverContext`:

```tsx
// In Sub.tsx, add:
export const SubHoverContext = createContext<{
  closeTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
} | null>(null);

// In Sub function:
const sharedCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

return (
  <SubParentContext.Provider value={parentCtx}>
    <SubHoverContext.Provider value={{ closeTimerRef: sharedCloseTimerRef }}>
      <DropdownMenuContext.Provider value={value}>{children}</DropdownMenuContext.Provider>
    </SubHoverContext.Provider>
  </SubParentContext.Provider>
);
```

SubTrigger uses `sharedCloseTimerRef` instead of its own local closeTimerRef. SubContent has a pointer-enter handler that clears it.

For SubContent: since SubContent is just a wrapper around Content (Task 10), we need SubContent to do extra work — clear the close timer on pointer enter, and on pointer leave restart the close timer. The simplest way is to refactor SubContent from a wrapper into its own implementation that adds pointer handlers around Content's rendered output.

But Content renders the menu div directly. SubContent can't add handlers without wrapping the div. Going to make SubContent its own component that mirrors most of Content but also handles pointer events:

Actually, simpler: add pointer-event props to `Content`'s rest spread. Then SubContent passes `onPointerEnter` and `onPointerLeave` through. Content's JSX already does `{...rest}`. So:

```tsx
// SubContent.tsx (in Sub.tsx):
export const SubContent = forwardRef<HTMLDivElement, DropdownMenuSubContentProps>(
  function SubContent(props, ref) {
    const hoverCtx = useContext(SubHoverContext);
    const subCtx = useDropdownMenuContext('SubContent');

    const handlePointerEnter = useCallback(() => {
      if (hoverCtx?.closeTimerRef.current) {
        clearTimeout(hoverCtx.closeTimerRef.current);
        hoverCtx.closeTimerRef.current = null;
      }
    }, [hoverCtx]);

    const handlePointerLeave = useCallback(() => {
      if (!subCtx.open) return;
      hoverCtx?.closeTimerRef.current && clearTimeout(hoverCtx.closeTimerRef.current);
      if (!hoverCtx) return;
      hoverCtx.closeTimerRef.current = setTimeout(() => {
        subCtx.setOpen(false);
        hoverCtx.closeTimerRef.current = null;
      }, 200);
    }, [hoverCtx, subCtx]);

    return (
      <Content
        ref={ref}
        {...props}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      />
    );
  },
);
```

But there's a subtle issue: `{...props}` is spread BEFORE `onPointerEnter`/`onPointerLeave`, so our handlers win. If the consumer passes their own onPointerEnter, ours overrides. Acceptable v2 trade-off (consumers shouldn't be passing pointer events to SubContent for normal use).

Actually wait — looking at Content's JSX, `{...rest}` is BEFORE the explicit handlers (Pattern B). So the JSX sees:

```tsx
<div {...rest} onKeyDown={handleKeyDown} ...>
```

The `onKeyDown` after `{...rest}` overrides any consumer-passed onKeyDown. If we pass `onPointerEnter` from SubContent to Content via the `props` it spreads as part of `{...rest}`, ours becomes overridable by the spread. We need Content's JSX to also place `onPointerEnter` and `onPointerLeave` AFTER `{...rest}` if we want SubContent's wiring to be authoritative.

Simpler: add `onPointerEnter` and `onPointerLeave` to the explicit list in Content's JSX:

```tsx
// In Content.tsx, in the returned JSX:
<div
  {...rest}
  ref={setFloatingRef}
  /* ... existing ARIA + style + className + onKeyDown ... */
  onPointerEnter={rest.onPointerEnter}
  onPointerLeave={rest.onPointerLeave}
>
```

But this is redundant — the rest spread already includes them. The problem is just spread ORDER. Putting them AFTER `{...rest}` makes them final. Adding the explicit pass-through doesn't change anything because `rest.onPointerEnter` is the same value that `{...rest}` already provided.

Going to leave Content alone (the consumer's pointer handlers in rest propagate normally) and have SubContent's handlers take precedence by being passed as the last props:

Wait actually the issue I described doesn't apply. SubContent calls `<Content {...props} onPointerEnter={...} onPointerLeave={...} />`. From Content's perspective, those become its own props. Content destructures `side`, `align`, etc., and rest includes `onPointerEnter` and `onPointerLeave` (they're not in the destructured list). `{...rest}` in Content's JSX includes them. Done — our handlers reach the div.

The order ambiguity I worried about is internal to Content (which props win in its JSX). For SubContent, we just pass `onPointerEnter` via Content's props, and Content forwards it. No special handling needed.

OK final implementation for SubContent — straightforward.

- [ ] **Step 3: Add `SubHoverContext` and shared close timer**

In `Sub.tsx`, add the context, define `sharedCloseTimerRef` in `Sub`, wrap children with the provider. SubTrigger uses `sharedCloseTimerRef` (via the context) for its closeTimer. SubContent uses it too.

```tsx
// Sub.tsx — define near the top:
export const SubHoverContext = createContext<{
  closeTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
} | null>(null);

function useSubHoverContext(component: string) {
  const ctx = useContext(SubHoverContext);
  if (!ctx) {
    throw new Error(`<DropdownMenu.${component}> must be used inside <DropdownMenu.Sub>`);
  }
  return ctx;
}
```

In `Sub` function, create the ref:

```tsx
const sharedCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// Wrap providers:
return (
  <SubParentContext.Provider value={parentCtx}>
    <SubHoverContext.Provider value={{ closeTimerRef: sharedCloseTimerRef }}>
      <DropdownMenuContext.Provider value={value}>{children}</DropdownMenuContext.Provider>
    </SubHoverContext.Provider>
  </SubParentContext.Provider>
);
```

In `SubTrigger`, replace local `closeTimerRef`:

```tsx
const hoverCtx = useSubHoverContext('SubTrigger');
const closeTimerRef = hoverCtx.closeTimerRef;

// handlePointerEnter:
const handlePointerEnter = useCallback(() => {
  if (disabled) return;
  if (closeTimerRef.current) {
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }
  if (subCtx.open) return;
  openTimerRef.current = setTimeout(() => {
    subCtx.setOpen(true);
    openTimerRef.current = null;
  }, 100);
}, [disabled, subCtx, closeTimerRef]);

// handlePointerLeave:
const handlePointerLeave = useCallback(() => {
  if (openTimerRef.current) {
    clearTimeout(openTimerRef.current);
    openTimerRef.current = null;
  }
  if (!subCtx.open) return;
  closeTimerRef.current = setTimeout(() => {
    subCtx.setOpen(false);
    closeTimerRef.current = null;
  }, 200);
}, [subCtx, closeTimerRef]);
```

In `SubContent`:

```tsx
const hoverCtx = useSubHoverContext('SubContent');
const subCtx = useDropdownMenuContext('SubContent');

const handlePointerEnter = useCallback(() => {
  if (hoverCtx.closeTimerRef.current) {
    clearTimeout(hoverCtx.closeTimerRef.current);
    hoverCtx.closeTimerRef.current = null;
  }
}, [hoverCtx]);

const handlePointerLeave = useCallback(() => {
  if (!subCtx.open) return;
  if (hoverCtx.closeTimerRef.current) clearTimeout(hoverCtx.closeTimerRef.current);
  hoverCtx.closeTimerRef.current = setTimeout(() => {
    subCtx.setOpen(false);
    hoverCtx.closeTimerRef.current = null;
  }, 200);
}, [hoverCtx, subCtx]);

return (
  <Content
    ref={ref}
    {...props}
    onPointerEnter={handlePointerEnter}
    onPointerLeave={handlePointerLeave}
  />
);
```

- [ ] **Step 4: Run gates**

```bash
npm test -w @eocrm/design-system
npm run typecheck
```

Expected: 215 + 3 = 218 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: submenu hover behavior (100ms open, 200ms close)"
```

---

## Task 12: Submenu keyboard — ArrowRight opens sub, ArrowLeft closes

ArrowLeft is already in Content's `handleKeyDown` from Task 10. This task adds ArrowRight on the parent menu: when the active item in the parent is a SubTrigger, ArrowRight invokes its registered `openSubmenu` callback.

**Files:**
- Modify: `packages/design-system/src/components/DropdownMenu/Content.tsx` — extend handleKeyDown
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx` — suite

- [ ] **Step 1: Append failing tests**

```tsx
describe('DropdownMenu — Submenu keyboard', () => {
  function renderNested() {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item onSelect={() => {}}>CSV</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}}>JSON</DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    return { user };
  }

  it('ArrowRight on SubTrigger opens the sub and focuses first item', async () => {
    const { user } = renderNested();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}'); // open root, focus Edit
    await user.keyboard('{ArrowDown}'); // focus SubTrigger (Export)
    expect(screen.getByRole('menuitem', { name: /Export/ })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('menuitem', { name: 'CSV' })).toHaveFocus();
  });

  it('ArrowLeft inside sub closes the sub and focuses the SubTrigger', async () => {
    const { user } = renderNested();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowRight}'); // open sub, focus CSV
    await user.keyboard('{ArrowLeft}');
    expect(screen.queryByRole('menuitem', { name: 'CSV' })).toBeNull();
    expect(screen.getByRole('menuitem', { name: /Export/ })).toHaveFocus();
  });

  it('Enter on SubTrigger opens the sub (like ArrowRight)', async () => {
    const { user } = renderNested();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}{ArrowDown}'); // focus SubTrigger
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menuitem', { name: 'CSV' })).toHaveFocus();
  });
});
```

- [ ] **Step 2: Extend Content's `handleKeyDown` to handle ArrowRight on SubTrigger**

In `Content.tsx`'s `handleKeyDown`, in the existing Enter/Space block, modify to check if the active item has an `openSubmenu` callback (which only SubTriggers have):

```tsx
if (e.key === 'Enter' || e.key === ' ') {
  e.preventDefault();
  const items = ctx.itemsRef.current;
  if (ctx.activeIndex >= 0 && ctx.activeIndex < items.length) {
    const target = items[ctx.activeIndex];
    if (!target.disabled) {
      // If the active item is a SubTrigger, opening its submenu IS the activation.
      if (target.openSubmenu) {
        target.openSubmenu();
      } else {
        target.ref.current?.click();
      }
    }
  }
  return;
}
```

Add an ArrowRight handler:

```tsx
if (e.key === 'ArrowRight') {
  const items = ctx.itemsRef.current;
  if (ctx.activeIndex >= 0 && ctx.activeIndex < items.length) {
    const target = items[ctx.activeIndex];
    if (target.openSubmenu) {
      e.preventDefault();
      target.openSubmenu();
    }
  }
  return;
}
```

Place this AFTER the ArrowLeft handler from Task 10, BEFORE the switch.

- [ ] **Step 3: Run gates**

```bash
npm test -w @eocrm/design-system
npm run typecheck
```

Expected: 218 + 3 = 221 tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: ArrowRight opens sub, ArrowLeft closes (keyboard nav)"
```

---

## Task 13: Cross-feature integration tests

These tests verify the four feature families compose correctly. No new code, just tests.

**Files:**
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx`

- [ ] **Step 1: Append integration tests**

```tsx
describe('DropdownMenu — cross-feature integration', () => {
  it('CheckboxItem inside a Sub toggles without closing the chain (closeOnSelect=false default)', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>Filters</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.CheckboxItem checked={false} onCheckedChange={onCheckedChange}>
                Show archived
              </DropdownMenu.CheckboxItem>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: /Filters/ }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /Show archived/ }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    // Both menus stay open.
    expect(screen.getAllByRole('menu')).toHaveLength(2);
  });

  it('RadioItem inside a Sub closes the entire chain by default', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>Sort</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.RadioGroup value="name" onValueChange={onValueChange}>
                <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
                <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
              </DropdownMenu.RadioGroup>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: /Sort/ }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Date' }));
    expect(onValueChange).toHaveBeenCalledWith('date');
    expect(screen.queryAllByRole('menu')).toHaveLength(0);
  });

  it('Group with Label wrapping a RadioGroup has correct aria wiring', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Group>
            <DropdownMenu.Label>Sort by</DropdownMenu.Label>
            <DropdownMenu.RadioGroup value="name" onValueChange={() => {}}>
              <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
              <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const group = screen.getByRole('group');
    const radiogroup = screen.getByRole('radiogroup');
    const label = screen.getByText('Sort by');
    expect(group).toHaveAttribute('aria-labelledby', label.id);
    // Both group AND radiogroup are present — they're nested but distinct.
    expect(radiogroup).toBeInTheDocument();
  });

  it('Two-level nested submenus close all on Item selection', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger>Format</DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent>
                  <DropdownMenu.Item onSelect={onSelect}>JSON</DropdownMenu.Item>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: /Export/ }));
    await user.click(screen.getByRole('menuitem', { name: /Format/ }));
    expect(screen.getAllByRole('menu')).toHaveLength(3);
    await user.click(screen.getByRole('menuitem', { name: 'JSON' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByRole('menu')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run gates**

```bash
npm test -w @eocrm/design-system
npm run typecheck
```

Expected: 221 + 4 = 225 tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: cross-feature integration tests"
```

---

## Task 14: JSDoc on all new exports

Apply Hard rule 7: every new exported symbol gets JSDoc with examples and remarks.

**Files:**
- Modify: `packages/design-system/src/components/DropdownMenu/Group.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/CheckboxItem.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/Radio.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/Sub.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/ItemIndicator.tsx`

For each new component (Group, Label, CheckboxItem, RadioGroup, RadioItem, Sub, SubTrigger, SubContent, ItemIndicator), add:
- One-paragraph description on the component function.
- 2-3 `@example` blocks for canonical usage.
- `@remarks When NOT to use` and `@remarks Anti-patterns` on the more substantive ones (CheckboxItem, RadioGroup, Sub).
- JSDoc on every prop of every Props interface.

Use the existing v1 JSDoc on `Item`, `Content`, etc. as the style reference.

- [ ] **Step 1: Add JSDoc to `Group.tsx`**

```tsx
/**
 * Visual + accessible grouping for related items. Renders `<div role="group">`
 * with `aria-labelledby` pointing at any `<DropdownMenu.Label>` rendered
 * inside. Use to wrap a label + items section (e.g., a labeled RadioGroup).
 *
 * @example
 * <DropdownMenu.Group>
 *   <DropdownMenu.Label>Sort by</DropdownMenu.Label>
 *   <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
 *     <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
 *     <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
 *   </DropdownMenu.RadioGroup>
 * </DropdownMenu.Group>
 *
 * @remarks When NOT to use
 * - Around a RadioGroup — RadioGroup already provides `role="radiogroup"`.
 *   Use Group around RadioGroup ONLY if you also need a separate visual label.
 * - As a layout primitive. Use `<Stack>` or `<Cluster>` for non-menu layout.
 */
```

Add similar blocks to `Label`, `CheckboxItem`, `RadioGroup`, `RadioItem`, `Sub`, `SubTrigger`, `SubContent`, `ItemIndicator`. The plan does not enumerate every JSDoc string — write them with the same care v1's JSDoc was written. Cross-check after with `npm run typecheck` (TypeScript reports duplicate or malformed JSDoc).

- [ ] **Step 2: Run gates**

```bash
npm run typecheck
npm test -w @eocrm/design-system
```

Expected: 225 tests pass; typecheck clean.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu v2: full JSDoc on all new exports"
```

---

## Task 15: Update `AGENTS.md` with new subcomponent sections

**Files:**
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Add a "v2 subcomponents" section to the DropdownMenu entry**

Find the existing `<DropdownMenu>` section in AGENTS.md (added in v1 Task 15). Append a subsection that documents the new pieces. Use this content verbatim:

````markdown
#### v2 — submenus, checkboxes, radios, groups

```tsx
<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Filters</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <DropdownMenu.Label>Status</DropdownMenu.Label>
      <DropdownMenu.CheckboxItem checked={active} onCheckedChange={setActive}>
        Active
      </DropdownMenu.CheckboxItem>
      <DropdownMenu.CheckboxItem checked={pending} onCheckedChange={setPending}>
        Pending
      </DropdownMenu.CheckboxItem>
    </DropdownMenu.Group>

    <DropdownMenu.Separator />

    <DropdownMenu.Group>
      <DropdownMenu.Label>Sort by</DropdownMenu.Label>
      <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
        <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
        <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
      </DropdownMenu.RadioGroup>
    </DropdownMenu.Group>

    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent>
        <DropdownMenu.Item onSelect={exportCsv}>Export CSV</DropdownMenu.Item>
        <DropdownMenu.Item onSelect={exportJson}>Export JSON</DropdownMenu.Item>
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>
  </DropdownMenu.Content>
</DropdownMenu>
```

- `<CheckboxItem>` — `role="menuitemcheckbox"`, `aria-checked`. Default `closeOnSelect={false}` (multi-select friendly). Pass `closeOnSelect` to override.
- `<RadioGroup>` + `<RadioItem>` — `role="radiogroup"` / `role="menuitemradio"`. Default `closeOnSelect={true}` (radio = the selection IS the action).
- `<Group>` + `<Label>` — wrap a section. Group is `role="group"` with `aria-labelledby` to the Label. Label outside Group still renders, no aria wiring.
- `<Sub>` + `<SubTrigger>` + `<SubContent>` — nested menu. SubTrigger registers in the parent menu; SubContent is its own portaled panel. Opens on click, hover (100ms delay), Enter, or ArrowRight. Closes on ArrowLeft (level-only), Escape (level-only), click-outside (all levels), or selecting an item with `closeOnSelect=true` (all levels — cascading close).
- `<ItemIndicator>` — optional slot child of CheckboxItem/RadioItem to override the default check (`✓`) or bullet (`●`) glyph. Detection is shallow: must be a direct child.
- Per WAI-ARIA, mixing CheckboxItem and RadioItem in the same RadioGroup is invalid; CheckboxItems live outside RadioGroup.
````

- [ ] **Step 2: Add anti-pattern rows to the existing table**

Append to the anti-patterns table:

```markdown
| `<DropdownMenu.RadioItem>` outside `<DropdownMenu.RadioGroup>` | Always wrap radio items in a RadioGroup; otherwise the value/onValueChange contract is broken |
| `<DropdownMenu.ItemIndicator>` nested deeper than direct child | Detection is shallow; nest it directly under CheckboxItem/RadioItem |
| Submenus 3+ levels deep | Discouraged — UX gets confusing fast; refactor to a different IA |
```

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "AGENTS.md: document DropdownMenu v2 subcomponents"
```

---

## Task 16: Update playground demo with 4 new examples

**Files:**
- Modify: `packages/playground/src/pages/components/DropdownMenuDemo.tsx`

- [ ] **Step 1: Add 4 new `<Example>` blocks**

Append to the existing `DropdownMenuDemo` (after the "Disabled item" example):

```tsx
<Example
  title="Multi-select filter (CheckboxItem)"
  description="Checkbox items toggle in place and don't close the menu by default — natural for a filter chip menu."
  code={`<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Filter ▾</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.CheckboxItem checked={active} onCheckedChange={setActive}>
      Active
    </DropdownMenu.CheckboxItem>
    <DropdownMenu.CheckboxItem checked={pending} onCheckedChange={setPending}>
      Pending
    </DropdownMenu.CheckboxItem>
    <DropdownMenu.CheckboxItem checked={churned} onCheckedChange={setChurned}>
      Churned
    </DropdownMenu.CheckboxItem>
  </DropdownMenu.Content>
</DropdownMenu>`}
>
  <FilterExample />
</Example>

<Example
  title="Single-select sort (RadioGroup)"
  description="Radio items default to close-on-select — picking a sort closes the menu."
  code={`<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Sort: {sort} ▾</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
      <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
      <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
      <DropdownMenu.RadioItem value="size">Size</DropdownMenu.RadioItem>
    </DropdownMenu.RadioGroup>
  </DropdownMenu.Content>
</DropdownMenu>`}
>
  <SortExample />
</Example>

<Example
  title="Nested actions (Sub)"
  description={`A "More" submenu opens beside the parent. Hover to open after 100ms, or click. Use Escape to close just the sub, click outside to close everything.`}
  code={`<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Actions ▾</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent>
        <DropdownMenu.Item onSelect={() => {}}>CSV</DropdownMenu.Item>
        <DropdownMenu.Item onSelect={() => {}}>JSON</DropdownMenu.Item>
        <DropdownMenu.Item onSelect={() => {}}>PDF</DropdownMenu.Item>
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>
  </DropdownMenu.Content>
</DropdownMenu>`}
>
  <Cluster gap="sm">
    <DropdownMenu>
      <DropdownMenu.Trigger>
        <Button variant="secondary">Actions ▾</Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
        <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent>
            <DropdownMenu.Item onSelect={() => {}}>CSV</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => {}}>JSON</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => {}}>PDF</DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
      </DropdownMenu.Content>
    </DropdownMenu>
  </Cluster>
</Example>

<Example
  title="Grouped + labeled (Group + Label)"
  description="A combined menu — filters as checkboxes, sort as a radio group, both organized with labels. Useful for a 'View settings' pattern."
  code={`<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">View ▾</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <DropdownMenu.Label>Show</DropdownMenu.Label>
      <DropdownMenu.CheckboxItem checked={active} onCheckedChange={setActive}>
        Active
      </DropdownMenu.CheckboxItem>
      <DropdownMenu.CheckboxItem checked={archived} onCheckedChange={setArchived}>
        Archived
      </DropdownMenu.CheckboxItem>
    </DropdownMenu.Group>
    <DropdownMenu.Separator />
    <DropdownMenu.Group>
      <DropdownMenu.Label>Sort by</DropdownMenu.Label>
      <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
        <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
        <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
      </DropdownMenu.RadioGroup>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu>`}
>
  <ViewSettingsExample />
</Example>
```

Define `FilterExample`, `SortExample`, and `ViewSettingsExample` as small local components within the same file. Each owns its `useState` for the demo's state (e.g., `const [active, setActive] = useState(true);`). Use `Cluster` wrappers to constrain widths (per the v1 demo pattern).

- [ ] **Step 2: Run gates**

```bash
npm run typecheck
make build
```

Expected: typecheck clean, Vite build succeeds.

- [ ] **Step 3: Visual verify in the dev server**

```bash
make dev
```

Open http://localhost:8080/components/dropdown-menu. Confirm each new Example works:
- Multi-select filter: clicking checkboxes toggles state, menu stays open.
- Sort radio: clicking a radio sets state, menu closes.
- Nested Sub: hover Export → submenu opens after 100ms; ArrowRight from focused Export also opens; ArrowLeft inside sub closes.
- Grouped view: labels render uppercase + muted; aria wiring correct (devtools or AT check).

- [ ] **Step 4: Commit**

```bash
git add packages/playground/src/pages/components/DropdownMenuDemo.tsx
git commit -m "Playground: 4 new DropdownMenu v2 examples (checkbox, radio, sub, grouped)"
```

---

## Task 17: Run the full gate sweep and `npm pack --dry-run`

- [ ] **Step 1: Run all gates**

```bash
cd /home/dpws/projects/design-system
make test
npm run typecheck
npm run lint:css
make build
npm run format:check
```

All exit 0. Test count should be 225.

If `format:check` fails, run `npm run format` and commit the result:

```bash
git add -A
git commit -m "Apply prettier formatting"
```

- [ ] **Step 2: Verify `npm pack --dry-run`**

```bash
npm pack --dry-run -w @eocrm/design-system 2>&1 | tee /tmp/dropdown-v2-pack.log
```

Expected: the new files (`context.ts`, `utils.ts`, `Root.tsx`, `Trigger.tsx`, `Content.tsx`, `Item.tsx`, `CheckboxItem.tsx`, `Radio.tsx`, `Sub.tsx`, `Group.tsx`, `ItemIndicator.tsx`) are included; no test files; no internal paths.

If `*.test.tsx` files appear in the tarball, fix the `files` glob in `packages/design-system/package.json` (it should already exclude them via the existing `!src/**/*.test.tsx` patterns).

No commit in this task unless format produced changes.

---

## Task 18: Pre-push review-fix cycle (Hard rule 8)

The library has changed substantially. Run the review-fix loop.

- [ ] **Step 1: Dispatch a fresh-context review agent**

Use the Agent tool with `subagent_type: general-purpose`. Brief it explicitly:

> "Review the pending changes on branch `feat/dropdown-menu-v2` against `packages/design-system/`. Read these files first in this order: `packages/design-system/CLAUDE.md`, `packages/design-system/AGENTS.md`, `packages/design-system/README.md`, `docs/superpowers/specs/2026-05-19-dropdown-menu-v2-design.md`. Then `git diff main...HEAD -- packages/design-system/ packages/playground/`.
>
> Evaluate against the 10 review categories from CLAUDE.md Hard rule 8: bugs, a11y, API inconsistencies, type safety, Rules 1–7 compliance, test coverage, token discipline, SCSS, cross-package leakage, package/distribution.
>
> Pay particular attention to:
> - The recursive context shadowing pattern in `<Sub>`. Are there focus management bugs across levels?
> - The `SubParentContext` + `SubHoverContext` design — over-engineered or appropriate?
> - The shallow ItemIndicator detection. Documented well? Edge cases?
> - The `closeAll` cascading behavior — verify it correctly chains through the parent contexts.
> - Per-type closeOnSelect defaults (Checkbox stays, Radio closes) — implemented consistently in both CheckboxItem and RadioItem? Tests cover both default + override?
> - The Item.tsx `styles.label` → `styles.itemLabel` rename — anywhere it's missed?
> - The `aria-labelledby` always-emitted approach in Group — actually OK or should it be reactive?
>
> Categorize findings as Critical / Important / Nice-to-have / Regression-watch. End with verdict: `clean enough to stop` or `keep iterating`."

- [ ] **Step 2: Fix every Critical and every Important finding**

Implement fixes, re-run relevant tests, commit each logical group with a clear message.

- [ ] **Step 3: Re-run all gates**

All four gates green. Test count ≥ 225 (may grow if review adds tests).

- [ ] **Step 4: Dispatch a second reviewer with the same prompt**

Repeat fix-and-review until verdict is `clean enough to stop`.

Hard exit criteria:
- 0 Critical, 0 Important (or each remaining has a documented skip)
- All four gates green
- `npm pack --dry-run` clean

---

## Task 19: Push and open PR

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/dropdown-menu-v2
```

Expected: husky pre-push hook (prettier/stylelint/typecheck) green; push succeeds.

If hook fails: fix the root cause, push again. Do NOT use `--no-verify`.

- [ ] **Step 2: Open the PR via gh CLI**

```bash
gh pr create --title "DropdownMenu v2 — submenus, checkbox/radio items, groups, indicators" --body "$(cat <<'EOF'
## Summary

- Submenus: `<DropdownMenu.Sub>` / `<DropdownMenu.SubTrigger>` / `<DropdownMenu.SubContent>` with recursive context, hover delays (100ms open / 200ms close), ArrowRight/Left keyboard, cascading close.
- Multi-select items: `<DropdownMenu.CheckboxItem>` with `role="menuitemcheckbox"`, default close-on-select=false.
- Single-select items: `<DropdownMenu.RadioGroup>` + `<DropdownMenu.RadioItem>` with `role="radiogroup"` / `role="menuitemradio"`, default close-on-select=true.
- Visual grouping: `<DropdownMenu.Group>` + `<DropdownMenu.Label>` with `aria-labelledby` wiring.
- Custom indicators: `<DropdownMenu.ItemIndicator>` marker slot inside CheckboxItem/RadioItem. Default glyphs (`✓` / `●`) render when no slot is provided.
- File split: `DropdownMenu.tsx` (~700 lines) → 10 focused files (`Root.tsx`, `Trigger.tsx`, `Content.tsx`, `Item.tsx`, `CheckboxItem.tsx`, `Radio.tsx`, `Sub.tsx`, `Group.tsx`, `ItemIndicator.tsx`, plus `context.ts` and `utils.ts`). All 186 v1 tests still pass.
- New token: `--size-dropdown-indicator` (16px).

Spec: `docs/superpowers/specs/2026-05-19-dropdown-menu-v2-design.md`
Plan: `docs/superpowers/plans/2026-05-19-dropdown-menu-v2.md`

Test count: 225 (186 v1 + 39 new).

## Test plan

- [ ] CI Quality check passes (`make test`, typecheck, stylelint, prettier).
- [ ] Visual: open `/components/dropdown-menu` and exercise each new Example (filter, sort, sub, grouped).
- [ ] Submenu keyboard: ArrowRight on focused SubTrigger opens + focuses first sub item; ArrowLeft inside sub closes + focuses SubTrigger; Escape closes only the current level; Tab closes the entire chain.
- [ ] Submenu hover: hovering SubTrigger opens after 100ms; hovering away cancels; hovering away from open sub closes after 200ms.
- [ ] CheckboxItem: toggling doesn't close the menu by default; `closeOnSelect={true}` does close.
- [ ] RadioItem: selecting closes the menu by default; `closeOnSelect={false}` keeps it open.
- [ ] ItemIndicator: default glyphs render when no slot is provided; custom indicator replaces the default.
- [ ] Group/Label: aria-labelledby correctly wired; Label outside Group renders without wiring.
- [ ] Cascading close: selecting an Item inside a 2-level sub closes both levels and focuses the root trigger.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Watch CI**

```bash
gh pr checks --watch
```

Expected: green.

- [ ] **Step 4: Report PR URL**

```bash
gh pr view --json url --jq .url
```

Done.

---

## Self-review

- **Spec coverage** — every feature in the spec maps to a task:
  - File split → Tasks 2-3
  - Group + Label → Task 4
  - ItemIndicator → Task 5
  - CheckboxItem → Task 6
  - RadioGroup + RadioItem → Task 7
  - Sub + SubTrigger + SubContent → Tasks 8-10
  - Submenu hover → Task 11
  - Submenu keyboard → Task 12
  - Cross-feature integration → Task 13
  - JSDoc, AGENTS.md, demo, gates, review, PR → Tasks 14-19
- **Placeholder scan** — no TBD/TODO/"add error handling".
- **Type consistency** — `DropdownMenuContextValue` evolution: new fields (`closeAll`, `depth`) introduced in Task 2 with default values, used in Task 9+. `RegisteredItem.openSubmenu?` introduced in Task 2, set by Task 9, read by Task 12. All consistent.
- **File path consistency** — every task names exact paths under `packages/design-system/src/components/DropdownMenu/`.
- **Cross-task dependencies** — Task 9's tests reference SubContent (Task 10); resolved by trimming Task 9's fixture to just SubTrigger.
- **`styles.label` rename** — flagged explicitly in Task 6 Step 3; Item.tsx (Task 3) must use `styles.itemLabel` after this PR. Reviewer should confirm.
