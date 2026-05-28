# `<Rail>` component — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** New library primitive `<Rail>` — a collapsible left navigation rail with sections, items, parent groups, hover-popover for subitems when collapsed. Per spec at `docs/superpowers/specs/2026-05-28-rail-design.md`.

**Branch:** `feat/rail-component` (already checked out off main).

**Tech stack:** SCSS module + component tokens, Floating UI via the existing `<Popover>` primitive for collapsed-group flyouts, `<Tooltip>` for collapsed-item tooltips, polymorphic `as` via `ElementType`. i18n via `useTranslation()`.

---

## Task 1: Tokens + i18n keys

**Files:**

- Create: `packages/design-system/src/components/Rail/Rail.tokens.scss`
- Modify: `packages/design-system/src/i18n/messages.ts` — add `rail` namespace
- Modify: `packages/design-system/src/i18n/en.ts` — `rail.expand`, `rail.collapse`, `rail.navigation`
- Modify: `packages/design-system/src/i18n/ru.ts` — same

Token values are in the spec's "Tokens" section — copy verbatim.

i18n mapping:

- `rail.expand`: `Expand navigation` / `Развернуть навигацию`
- `rail.collapse`: `Collapse navigation` / `Свернуть навигацию`
- `rail.navigation`: `Main navigation` / `Главная навигация`

- [ ] Step 1: write the tokens file (just `:root { --rail-*: ... }`).
- [ ] Step 2: add the 3 keys to Messages + en + ru.
- [ ] Step 3: commit `i18n + tokens: Rail`.

---

## Task 2: Root + Header + Footer + Spacer + CollapseToggle

**Files (create):**

- `packages/design-system/src/components/Rail/Rail.tsx`
- `packages/design-system/src/components/Rail/RailHeader.tsx`
- `packages/design-system/src/components/Rail/RailFooter.tsx`
- `packages/design-system/src/components/Rail/RailSpacer.tsx`
- `packages/design-system/src/components/Rail/RailCollapseToggle.tsx`
- `packages/design-system/src/components/Rail/Rail.module.scss`
- `packages/design-system/src/components/Rail/index.ts`

### Rail.tsx (root)

```tsx
import {
  createContext,
  forwardRef,
  useState,
  useMemo,
  useCallback,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { useControllableState } from '../../hooks/useControllableState'; // existing helper — verify path
import styles from './Rail.module.scss';
import './Rail.tokens.scss';

interface RailContextValue {
  collapsed: boolean;
  setCollapsed: (next: boolean | ((prev: boolean) => boolean)) => void;
}

export const RailContext = createContext<RailContextValue | null>(null);

export function useRail(): RailContextValue {
  const ctx = useContext(RailContext);
  if (!ctx) throw new Error('Rail subcomponents must be used inside <Rail>');
  return ctx;
}

export interface RailProps extends Omit<HTMLAttributes<HTMLElement>, 'aria-label'> {
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Accessible label for the <nav>. Defaults to t('rail.navigation'). */
  'aria-label'?: string;
  children: ReactNode;
}

export const Rail = forwardRef<HTMLElement, RailProps>(function Rail(
  {
    collapsed: collapsedProp,
    defaultCollapsed = false,
    onCollapsedChange,
    'aria-label': ariaLabel,
    className,
    children,
    ...props
  },
  ref,
) {
  const t = useTranslation();
  const [collapsed, setCollapsed] = useControllableState({
    value: collapsedProp,
    defaultValue: defaultCollapsed,
    onChange: onCollapsedChange,
  });
  const ctx = useMemo(() => ({ collapsed, setCollapsed }), [collapsed, setCollapsed]);

  return (
    <RailContext.Provider value={ctx}>
      <nav
        ref={ref}
        aria-label={ariaLabel ?? t('rail.navigation')}
        data-collapsed={collapsed || undefined}
        className={clsx(styles.rail, collapsed && styles.collapsed, className)}
        {...props}
      >
        {children}
      </nav>
    </RailContext.Provider>
  );
});
```

Verify `useControllableState` exists in `hooks/` — if not, use a small local `useState` + sync effect, OR copy from the existing patterns in `Tabs.tsx` / other compound primitives. Many components in this repo use `useState` + a tiny "controllable" inline pattern instead of a shared hook; adopt whichever the repo uses.

### RailHeader.tsx / RailFooter.tsx / RailSpacer.tsx

Trivial pass-through wrappers. Header gets `overflow: hidden` for collapsed mode; Footer is just a div; Spacer is a flex-grow div.

```tsx
export const RailHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function RailHeader({ className, ...props }, ref) {
    return <div ref={ref} className={clsx(styles.header, className)} {...props} />;
  },
);

// Same shape for RailFooter, RailSpacer.
```

### RailCollapseToggle.tsx

```tsx
import { forwardRef } from 'react';
import { ChevronsLeft } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { useRail } from './Rail';
import { Button } from '../Button';

export interface RailCollapseToggleProps {
  className?: string;
}

export const RailCollapseToggle = forwardRef<HTMLButtonElement, RailCollapseToggleProps>(
  function RailCollapseToggle({ className }, ref) {
    const t = useTranslation();
    const { collapsed, setCollapsed } = useRail();
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="sm"
        iconOnly
        aria-label={collapsed ? t('rail.expand') : t('rail.collapse')}
        onClick={() => setCollapsed((prev) => !prev)}
        className={clsx(
          styles.collapseToggle,
          collapsed && styles.collapseToggleRotated,
          className,
        )}
      >
        <ChevronsLeft size={14} aria-hidden />
      </Button>
    );
  },
);
```

The chevron rotates 180° when collapsed (CSS transform on `.collapseToggleRotated`).

### Rail.module.scss

The base layout:

```scss
@use './Rail.tokens';

.rail {
  width: var(--rail-width-expanded);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--rail-section-gap);
  padding: var(--rail-padding-y) var(--rail-padding-x);
  background: var(--rail-bg);
  border-right: var(--rail-border-width) solid var(--rail-border-color);
  transition: var(--rail-collapse-transition);
  overflow: hidden;
}

.collapsed {
  width: var(--rail-width-collapsed);
}

.header {
  flex-shrink: 0;
  overflow: hidden;
}

.footer {
  flex-shrink: 0;
}

.spacer {
  flex: 1 1 auto;
  min-height: 0;
}

.collapseToggle {
  transition: transform var(--transition-base);
}

.collapseToggleRotated {
  transform: rotate(180deg);
}
```

### index.ts

```ts
export { Rail } from './Rail';
export type { RailProps } from './Rail';
export { RailHeader } from './RailHeader';
export { RailFooter } from './RailFooter';
export { RailSpacer } from './RailSpacer';
export { RailCollapseToggle } from './RailCollapseToggle';
// Section / Item / Group exports added in subsequent tasks.

// Compound attachment (assemble in Rail.tsx like other compound components):
//   export const Rail = Object.assign(RailRoot, { Header: RailHeader, ... });
```

But the convention in this repo is to attach subcomponents to the root in the ROOT's file via `Object.assign`. Look at `Card/Card.tsx` for the pattern.

- [ ] Step 1: write the 7 files above
- [ ] Step 2: confirm `make build && make lint` clean
- [ ] Step 3: commit `Rail: root + header/footer/spacer/collapse-toggle (no items yet)`

---

## Task 3: RailSection + RailItem (no nesting yet)

**Files (create):**

- `packages/design-system/src/components/Rail/RailSection.tsx`
- `packages/design-system/src/components/Rail/RailItem.tsx`

Modify `Rail.module.scss` to add `.section`, `.sectionTitle`, `.item`, `.itemActive`, `.itemIcon`, `.itemLabel`, `.itemBadge` rules.

### RailSection.tsx

```tsx
export interface RailSectionProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: ReactNode;
}

export const RailSection = forwardRef<HTMLDivElement, RailSectionProps>(function RailSection(
  { title, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role="group"
      aria-label={title}
      className={clsx(styles.section, className)}
      {...props}
    >
      {title && <div className={styles.sectionTitle}>{title}</div>}
      {children}
    </div>
  );
});
```

The title's visibility is driven by the rail's collapsed state via parent's `[data-collapsed] .sectionTitle { opacity: 0 }` CSS — using the `data-collapsed` attribute on the `<nav>` for cascading.

### RailItem.tsx

Polymorphic, default `as="a"`:

```tsx
import { forwardRef, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from 'react';
import clsx from 'clsx';
import { useRail } from './Rail';
import { Tooltip } from '../Tooltip';
import styles from './Rail.module.scss';

export interface RailItemOwnProps {
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}

export type RailItemProps<C extends ElementType = 'a'> = {
  as?: C;
} & RailItemOwnProps &
  Omit<ComponentPropsWithoutRef<C>, keyof RailItemOwnProps | 'as'>;

export const RailItem = forwardRef(function RailItem<C extends ElementType = 'a'>(
  { as, icon, badge, children, className, ...rest }: RailItemProps<C>,
  ref: React.Ref<HTMLElement>,
) {
  const Component = (as ?? 'a') as ElementType;
  const { collapsed } = useRail();

  const inner = (
    <Component ref={ref} className={clsx(styles.item, className)} {...rest}>
      {icon && (
        <span className={styles.itemIcon} aria-hidden>
          {icon}
        </span>
      )}
      <span className={styles.itemLabel}>{children}</span>
      {badge && <span className={styles.itemBadge}>{badge}</span>}
    </Component>
  );

  if (collapsed && typeof children === 'string') {
    return <Tooltip content={children}>{inner}</Tooltip>;
  }
  return inner;
}) as <C extends ElementType = 'a'>(
  props: RailItemProps<C> & { ref?: React.Ref<HTMLElement> },
) => JSX.Element;
```

Active-state styling is purely CSS via `[aria-current="page"]` selector — see Rail.module.scss below.

### Rail.module.scss additions

```scss
.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.sectionTitle {
  padding: var(--rail-section-title-padding);
  font-size: var(--rail-section-title-font-size);
  font-weight: var(--rail-section-title-font-weight);
  letter-spacing: var(--rail-section-title-letter-spacing);
  text-transform: uppercase;
  color: var(--rail-section-title-fg);
  opacity: 1;
  transition: var(--rail-label-transition);
}

.collapsed .sectionTitle {
  opacity: 0;
  pointer-events: none;
  height: 0;
  padding: 0;
}

.item {
  display: flex;
  align-items: center;
  gap: var(--rail-item-gap);
  padding: var(--rail-item-padding-y) var(--rail-item-padding-x);
  color: var(--rail-item-fg);
  text-decoration: none;
  border-radius: var(--rail-item-radius);
  white-space: nowrap;
  overflow: hidden;
  cursor: pointer;

  &:hover {
    background: var(--rail-item-bg-hover);
  }

  &[aria-current='page'],
  &:has([aria-current='page']) {
    background: var(--rail-item-bg-active);
    color: var(--rail-item-fg-active);
  }
}

.itemIcon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--rail-item-icon-size);
  height: var(--rail-item-icon-size);
  flex-shrink: 0;
}

.itemLabel {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: var(--rail-label-transition);
}

.collapsed .itemLabel,
.collapsed .itemBadge {
  opacity: 0;
  pointer-events: none;
}

.itemBadge {
  flex-shrink: 0;
  font-size: var(--font-size-xs);
}
```

- [ ] Step 1: write the 2 files + SCSS additions
- [ ] Step 2: gates green
- [ ] Step 3: commit `Rail: Section + Item with active-state CSS`

---

## Task 4: RailGroup with inline expand + collapsed-mode popover

**File:** `packages/design-system/src/components/Rail/RailGroup.tsx`

This is the biggest single subcomponent. Two distinct behaviors:

### Expanded mode (rail is expanded)

`RailGroup` renders as a button + chevron. Clicking toggles `open` state. When open, the subitems render INLINE underneath (just below the group button).

```tsx
{
  open && <div className={styles.subitems}>{children}</div>;
}
```

Subitems get extra left-padding via `.subitems .item { padding-left: var(--rail-subitem-padding-left); }` so they visually nest under the group icon.

### Collapsed mode (rail is collapsed)

The group renders ONLY its icon. The chevron + label + subitems are NOT inline — they appear in a popover on hover.

Popover composition:

```tsx
import { Popover } from '../Popover';

<Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
  <Popover.Trigger>
    <button
      className={styles.groupTrigger}
      onMouseEnter={openWithDelay}
      onMouseLeave={closeWithGrace}
    >
      {icon}
    </button>
  </Popover.Trigger>
  <Popover.Content
    placement="right-start"
    offset={8}
    onMouseEnter={cancelClose}
    onMouseLeave={closeWithGrace}
  >
    <div className={styles.flyoutHeader}>{label}</div>
    <div className={styles.flyoutBody}>{children}</div>
  </Popover.Content>
</Popover>;
```

Hover-open timing:

- `openWithDelay`: `setTimeout(() => setPopoverOpen(true), 80)`. If the cursor leaves before the timeout fires, clear it.
- `closeWithGrace`: `setTimeout(() => setPopoverOpen(false), 200)`. If the cursor enters the trigger OR popover within that window, clear it.

Implement via a tiny custom hook in the file:

```ts
function useHoverIntent() {
  const openTimeout = useRef<number | null>(null);
  const closeTimeout = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const cancelClose = useCallback(() => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  }, []);
  const onEnter = useCallback(() => {
    cancelClose();
    openTimeout.current = window.setTimeout(() => setOpen(true), 80);
  }, [cancelClose]);
  const onLeave = useCallback(() => {
    if (openTimeout.current) {
      clearTimeout(openTimeout.current);
      openTimeout.current = null;
    }
    closeTimeout.current = window.setTimeout(() => setOpen(false), 200);
  }, []);
  return { open, setOpen, onEnter, onLeave, cancelClose };
}
```

Verify the existing `<Popover>` API. Adapt the JSX to whatever it actually exports (`Popover.Anchor`/`.Trigger`/`.Content` etc.). If `<Popover>` doesn't accept mouse-enter/leave callbacks on its trigger, render the listeners on a `<button>` and pass that to `<Popover.Trigger asChild>`.

### Group props

```tsx
export interface RailGroupProps {
  icon: ReactNode;
  label: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}
```

The `open` state when EXPANDED is controlled-or-uncontrolled (like the rail itself). The popover-open state when COLLAPSED is internal to the group (hover-driven) and doesn't expose props.

### Auto-open when expanded with active descendant

On mount + on transition `collapsed → false`, scan the group's subtree for `[aria-current="page"]`. If present and `open` is uncontrolled, default to `true`. Use a ref + `MutationObserver` to detect changes; or simpler — set the open state once on first mount based on a synchronous DOM scan.

Simpler v1 implementation:

```ts
useEffect(() => {
  if (!ref.current) return;
  if (uncontrolledOpen != null) return;
  const hasActive = !!ref.current.querySelector('[aria-current="page"]');
  if (hasActive) setUncontrolledOpen(true);
}, []);
```

### SCSS additions

```scss
.groupTrigger {
  // Same look as .item but as a <button>.
  display: flex;
  align-items: center;
  gap: var(--rail-item-gap);
  padding: var(--rail-item-padding-y) var(--rail-item-padding-x);
  width: 100%;
  border: 0;
  background: transparent;
  border-radius: var(--rail-item-radius);
  color: var(--rail-item-fg);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;

  &:hover {
    background: var(--rail-item-bg-hover);
  }

  &:has(+ .subitems [aria-current='page']) {
    color: var(--rail-item-fg-active);
  }
}

.groupChevron {
  flex-shrink: 0;
  transition: transform var(--transition-fast);
}

.groupChevronOpen {
  transform: rotate(90deg);
}

.subitems {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.subitems .item {
  padding-left: var(--rail-subitem-padding-left);
}

.collapsed .subitems {
  display: none;
}

.flyoutHeader {
  padding: var(--space-2) var(--space-3);
  font-weight: var(--font-weight-semibold);
  color: var(--color-fg);
  border-bottom: var(--border-width) solid var(--color-border);
}

.flyoutBody {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
  min-width: 200px;
}
```

- [ ] Step 1: write the file
- [ ] Step 2: confirm popover hover-open works (manual verify in browser)
- [ ] Step 3: gates green
- [ ] Step 4: commit `Rail: Group with inline expand + collapsed-mode hover popover`

---

## Task 5: Compose Rail as compound, update index.ts + root barrel

In `Rail.tsx`, replace the bare `export const Rail` with `Object.assign(RailRoot, { Header, Section, Group, Item, CollapseToggle, Spacer, Footer })`. Update the `Rail/index.ts` to export everything. Update `packages/design-system/src/index.ts` to re-export.

- [ ] Step 1: compose + barrel
- [ ] Step 2: gates green
- [ ] Step 3: commit `Rail: compose compound API + barrel`

---

## Task 6: Tests

**File:** `packages/design-system/src/components/Rail/Rail.test.tsx`

Tests enumerated in the spec's "Tests" section. Use the existing test pattern (vitest globals, RTL `render`, `screen`).

- [ ] Step 1: write tests
- [ ] Step 2: 100% Rail tests pass
- [ ] Step 3: commit `Rail: unit tests`

---

## Task 7: Demo + playground wire-up

**Files:**

- Create: `packages/playground/src/pages/components/RailDemo.tsx`
- Modify: `packages/playground/src/App.tsx` — route `/components/rail`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx` — add nav entry for Rail demo
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx` — add card

Demo content per spec.

- [ ] Step 1: create RailDemo + wire
- [ ] Step 2: visual smoke-test (collapsed / expanded / hover popover / active route)
- [ ] Step 3: commit `Rail: playground demo`

---

## Task 8: Docs

- `packages/design-system/AGENTS.md` — add `<Rail>` section to the components catalog.
- Per Rule 9 — i18n keys go to `messages.ts` + en.ts + ru.ts (done in Task 1).

- [ ] Commit `Rail: AGENTS.md catalog entry`.

---

## Task 9: Library hr8 review-fix loop

- [ ] Step 1: gates (test, typecheck, lint, build, `npm pack --dry-run`)
- [ ] Step 2: spawn fresh-context reviewer on the 10 hr8 categories. Specifically probe: (a) polymorphic `as` type-soundness; (b) Popover-based collapsed flyout — does the hover-intent timing work / are listeners cleaned up; (c) aria-current detection via `:has()`; (d) i18n key coverage; (e) tokens — every color/size in module.scss references a token; (f) Hard rule 4 — Rail owns its own width (this IS a layout primitive; document the exception inline).
- [ ] Step 3: fix Critical + Important findings
- [ ] Step 4: re-run + re-spawn until `clean enough to stop`

---

## Task 10: Push + PR

- [ ] gates green
- [ ] push
- [ ] open PR

Title: `Rail: collapsible left-nav primitive (sections / items / groups / hover popover)`.
