# DropdownMenu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<DropdownMenu>` — a fully-accessible WAI-ARIA menu component with compound subcomponents (`.Trigger` / `.Content` / `.Item` / `.Separator`), portaled and Floating-UI-positioned, hand-rolled keyboard / focus / dismissal logic.

**Architecture:** A single `DropdownMenu.tsx` file owns: a React context (open state, refs, item registry), a `<Trigger>` that clones its single child element to inject ARIA + handlers, a `<Content>` that portals to `document.body` and uses `@floating-ui/react-dom` for collision-aware positioning, an `<Item>` that self-registers with the context and renders `role="menuitem"`, and a `<Separator>`. The compound API ships as named statics on the root `DropdownMenu` export (e.g. `DropdownMenu.Trigger`).

**Tech Stack:** React 19, TypeScript, SCSS Modules, CSS custom properties for tokens, `@floating-ui/react-dom` for positioning. Vitest (jsdom) + Testing Library for tests.

**Spec:** `docs/superpowers/specs/2026-05-19-dropdown-menu-design.md`

**Branch:** `feat/dropdown-menu` (already branched from fresh `main` at the start of this work)

**Verification baseline (gates to keep green throughout):**

```bash
cd /home/dpws/projects/design-system
make test          # vitest, single run
npm run typecheck  # tsc --noEmit on both workspaces
npm run lint:css   # stylelint over both packages
make build         # typecheck + bundle playground
```

Tests run as part of the publish workflow; a failing test blocks release. Run `make test` after any task that adds or modifies behavior, and the full quad after the last code task and before the review-fix cycle.

**jsdom quirk to know about up front:** Floating UI's `autoUpdate` uses `ResizeObserver`, which jsdom does not implement. Tests that mount `<DropdownMenu>` in an open state need a stub. Pattern (apply per-test or in a shared `beforeEach`):

```ts
beforeEach(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
```

This is documented again in Task 4 where it first becomes necessary.

---

## Task 1: Add `@floating-ui/react-dom` to library deps and branch sanity check

**Files:**

- Modify: `packages/design-system/package.json`
- Modify: `package-lock.json` (auto-updated by npm)

- [ ] **Step 1: Verify branch is `feat/dropdown-menu` off fresh `main`**

```bash
cd /home/dpws/projects/design-system
git status
git branch --show-current
```

Expected:

- `git status` → clean working tree
- `git branch --show-current` → `feat/dropdown-menu`

If not on `feat/dropdown-menu`, stop and notify — branch setup is handled in the brainstorming/setup phase, not this task.

- [ ] **Step 2: Install `@floating-ui/react-dom` into the library workspace**

```bash
cd /home/dpws/projects/design-system
npm install @floating-ui/react-dom -w @eocrm/design-system
```

Expected:

- `packages/design-system/package.json` now has `@floating-ui/react-dom` under `dependencies` with a caret-pinned version (likely `^2.x.x`).
- `package-lock.json` updated.

- [ ] **Step 3: Confirm no unexpected transitive UI deps**

```bash
npm ls @floating-ui/react-dom -w @eocrm/design-system
```

Expected: `@floating-ui/react-dom` depends only on `@floating-ui/dom` (which depends on `@floating-ui/core` and `@floating-ui/utils`). No React peer apart from what the library already declares. No component library (no Radix, no anything `*-ui*`).

- [ ] **Step 4: Run gates to confirm nothing broke**

```bash
make test
npm run typecheck
```

Expected: both green (no behavioral change yet; this just verifies the install didn't break the workspace).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/package.json package-lock.json
git commit -m "Add @floating-ui/react-dom dep for DropdownMenu positioning"
```

---

## Task 2: Scaffold `DropdownMenu/` directory and barrel exports

This task creates empty files only — no behavior yet. Establishes the file structure that subsequent tasks will fill in.

**Files:**

- Create: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx`
- Create: `packages/design-system/src/components/DropdownMenu/DropdownMenu.module.scss`
- Create: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx`
- Create: `packages/design-system/src/components/DropdownMenu/index.ts`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p packages/design-system/src/components/DropdownMenu
```

- [ ] **Step 2: Create `DropdownMenu.module.scss` with an empty rule**

```scss
// Styles added incrementally as the component is built (Task 13).
.placeholder {
  // empty
}
```

- [ ] **Step 3: Create `DropdownMenu.tsx` with the minimal stubs needed for typed imports**

```tsx
import { createContext, type ReactNode } from 'react';

interface DropdownMenuContextValue {
  open: boolean;
}

// Internal — not exported. Subcomponents subscribe via useContext.
const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

export interface DropdownMenuProps {
  children: ReactNode;
}

function DropdownMenuRoot({ children }: DropdownMenuProps) {
  return <DropdownMenuContext.Provider value={{ open: false }}>{children}</DropdownMenuContext.Provider>;
}

// Compound surface. Real implementations land in later tasks.
export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger: function Trigger() {
    return null;
  },
  Content: function Content() {
    return null;
  },
  Item: function Item() {
    return null;
  },
  Separator: function Separator() {
    return null;
  },
});
```

- [ ] **Step 4: Create `index.ts` barrel**

```ts
export { DropdownMenu } from './DropdownMenu';
export type { DropdownMenuProps } from './DropdownMenu';
```

- [ ] **Step 5: Create `DropdownMenu.test.tsx` with a smoke test**

```tsx
import { render } from '@testing-library/react';
import { DropdownMenu } from './DropdownMenu';

describe('DropdownMenu', () => {
  it('renders without crashing', () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger />
        <DropdownMenu.Content />
      </DropdownMenu>,
    );
  });
});
```

- [ ] **Step 6: Run the smoke test**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: PASS, 1 test.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "Scaffold DropdownMenu directory with empty compound stubs"
```

---

## Task 3: Provider + Trigger open/close on click

Implements the root context (open state, trigger ref, content id) and the `<Trigger>` subcomponent that clones its single child to inject `onClick`, ARIA, and a merged ref. After this task, clicking the trigger toggles open state and ARIA reflects it — no menu UI yet, just the trigger contract.

**Files:**

- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx`

- [ ] **Step 1: Write failing tests for trigger toggle + ARIA**

Replace the contents of `DropdownMenu.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { DropdownMenu } from './DropdownMenu';

describe('DropdownMenu — Trigger', () => {
  it('renders its child unchanged', () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
      </DropdownMenu>,
    );
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });

  it('sets aria-haspopup="menu" and aria-expanded=false by default', () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
      </DropdownMenu>,
    );
    const trigger = screen.getByRole('button', { name: 'Open' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles aria-expanded on click', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
      </DropdownMenu>,
    );
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('preserves the child element\'s own onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button" onClick={onClick}>
            Open
          </button>
        </DropdownMenu.Trigger>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('forwards a ref through to the child element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button" ref={ref}>
            Open
          </button>
        </DropdownMenu.Trigger>
      </DropdownMenu>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: FAIL — `aria-haspopup` not set, Trigger returns null, etc.

- [ ] **Step 3: Implement the provider + Trigger**

Replace the contents of `DropdownMenu.tsx` with:

```tsx
import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentId: string;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext(component: string): DropdownMenuContextValue {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) {
    throw new Error(`<DropdownMenu.${component}> must be used inside <DropdownMenu>`);
  }
  return ctx;
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined | null>): Ref<T> {
  return (value: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') ref(value);
      else (ref as React.MutableRefObject<T | null>).current = value;
    }
  };
}

function chain<E>(
  ...fns: Array<((event: E) => void) | undefined>
): (event: E) => void {
  return (event: E) => {
    for (const fn of fns) fn?.(event);
  };
}

export interface DropdownMenuProps {
  children: ReactNode;
}

function DropdownMenuRoot({ children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const reactId = useId();
  const contentId = `dropdown-menu-${reactId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  const value: DropdownMenuContextValue = {
    open,
    setOpen,
    triggerRef,
    contentId,
  };

  return <DropdownMenuContext.Provider value={value}>{children}</DropdownMenuContext.Provider>;
}

export interface DropdownMenuTriggerProps {
  children: ReactElement;
}

function Trigger({ children }: DropdownMenuTriggerProps) {
  const ctx = useDropdownMenuContext('Trigger');

  if (!isValidElement(children)) {
    throw new Error('<DropdownMenu.Trigger> requires exactly one React element child.');
  }

  const childProps = children.props as {
    onPointerDown?: (e: PointerEvent) => void;
    ref?: Ref<HTMLElement>;
  };

  // Toggle on pointerdown rather than click. Keyboard activation (Enter/Space)
  // would otherwise fire a synthesized click that races the keydown-open
  // handler in Task 7 and double-toggles the menu shut. Pointerdown is mouse/
  // touch only; keyboard activation goes through onKeyDown (Task 7) without
  // any click in play.
  const handlePointerDown = useCallback(
    (_e: PointerEvent) => {
      ctx.setOpen(!ctx.open);
    },
    [ctx],
  );

  return cloneElement(children, {
    ref: mergeRefs(ctx.triggerRef, childProps.ref),
    'aria-haspopup': 'menu',
    'aria-expanded': ctx.open,
    'aria-controls': ctx.open ? ctx.contentId : undefined,
    onPointerDown: chain(childProps.onPointerDown, handlePointerDown),
  } as Partial<unknown> as object);
}

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger,
  Content: function Content() {
    return null;
  },
  Item: function Item() {
    return null;
  },
  Separator: function Separator() {
    return null;
  },
});
```

Note on the `cloneElement` typing: React's `cloneElement` is generic on the element's props; we cast through `Partial<unknown> as object` because we're intentionally injecting attributes the child's type doesn't declare. The runtime contract (child must accept `ref` and pass through extra props) is documented in JSDoc later.

- [ ] **Step 4: Run tests**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: provider + Trigger with click toggle and ARIA"
```

---

## Task 4: Content portals to `document.body` and positions with Floating UI

Implements `<Content>`: when `open` is true, it renders a `div role="menu"` portaled to `document.body`, positioned by Floating UI relative to the trigger. Closed → nothing rendered.

**Files:**

- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx`

- [ ] **Step 1: Add a `ResizeObserver` stub to test setup**

Floating UI's `autoUpdate` calls `new ResizeObserver(...)` which jsdom lacks. Append a per-suite `beforeEach` inside `DropdownMenu.test.tsx` (top of the file, after imports):

```tsx
beforeEach(() => {
  window.ResizeObserver = class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
```

- [ ] **Step 2: Add failing tests for Content render-when-open + portal + role**

Append to `DropdownMenu.test.tsx`:

```tsx
describe('DropdownMenu — Content', () => {
  it('does not render Content when closed', () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <div>menu body</div>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('renders Content with role="menu" when open', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <div>menu body</div>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('menu body')).toBeInTheDocument();
  });

  it('portals Content outside its parent tree', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <div>menu body</div>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const menu = screen.getByRole('menu');
    // Portaled to document.body, NOT inside the test container that holds the trigger.
    expect(container.contains(menu)).toBe(false);
    expect(document.body.contains(menu)).toBe(true);
  });

  it('links trigger to content via aria-controls', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <div>menu body</div>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    const menu = screen.getByRole('menu');
    expect(trigger).toHaveAttribute('aria-controls', menu.id);
  });

  it('forwards ref and merges className on Content', async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLDivElement>();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content ref={ref} className="custom-content">
          <div>menu body</div>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.className).toMatch(/custom-content/);
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: FAIL — `Content` still returns null.

- [ ] **Step 4: Implement portaled, Floating-UI-positioned Content**

In `DropdownMenu.tsx`, add the imports and replace the `Content` placeholder. At the top of the file:

```tsx
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
import { forwardRef, type HTMLAttributes } from 'react';
import styles from './DropdownMenu.module.scss';
```

(Merge these with the existing imports rather than duplicating.)

Add types and component:

```tsx
export type DropdownMenuSide = 'top' | 'bottom';
export type DropdownMenuAlign = 'start' | 'center' | 'end';

export interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  side?: DropdownMenuSide;
  align?: DropdownMenuAlign;
  sideOffset?: number;
  minWidth?: number | string;
}

const Content = forwardRef<HTMLDivElement, DropdownMenuContentProps>(function Content(
  {
    side = 'bottom',
    align = 'start',
    sideOffset = 4,
    minWidth,
    className,
    children,
    ...rest
  },
  forwardedRef,
) {
  const ctx = useDropdownMenuContext('Content');

  const placement: Placement = (align === 'center' ? side : `${side}-${align}`) as Placement;

  const { refs, floatingStyles } = useFloating({
    open: ctx.open,
    placement,
    middleware: [
      offset(sideOffset),
      flip(),
      shift({ padding: 8 }),
      size({
        apply({ availableHeight, rects, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${availableHeight}px`,
            minWidth:
              typeof minWidth === 'number'
                ? `${minWidth}px`
                : (minWidth as string | undefined) ?? `${rects.reference.width}px`,
          });
        },
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
    elements: { reference: ctx.triggerRef.current },
  });

  // Re-attach the floating ref to the rendered div via a callback that ALSO
  // forwards the consumer-supplied ref. mergeRefs already handles both shapes.
  const setFloatingRef = mergeRefs<HTMLDivElement>(refs.setFloating, forwardedRef);

  if (!ctx.open) return null;

  return createPortal(
    <div
      ref={setFloatingRef}
      id={ctx.contentId}
      role="menu"
      tabIndex={-1}
      aria-orientation="vertical"
      style={floatingStyles}
      className={clsx(styles.content, className)}
      {...rest}
    >
      {children}
    </div>,
    document.body,
  );
});
```

Replace the `Content: function Content() { return null; }` stub in the `Object.assign` with `Content,`:

```tsx
export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger,
  Content,
  Item: function Item() {
    return null;
  },
  Separator: function Separator() {
    return null;
  },
});
```

- [ ] **Step 5: Add a placeholder `.content` class to the SCSS so `styles.content` resolves**

Edit `DropdownMenu.module.scss` — replace the placeholder block with:

```scss
.content {
  background: var(--color-bg);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  z-index: var(--z-dropdown);
  outline: none;
}
```

(Full styling lands in Task 13; this minimal rule unblocks the test selector for `className` merging.)

- [ ] **Step 6: Run tests**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: all Content tests PASS plus the previous Trigger tests.

- [ ] **Step 7: Verify typecheck and stylelint stay green**

```bash
npm run typecheck
npm run lint:css
```

Expected: both green.

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: portaled Content with Floating UI positioning"
```

---

## Task 5: `<Item>` + `<Separator>` with `onSelect` and `disabled`

Implements `Item` and `Separator` as simple renderers. `Item` fires `onSelect` on click, respects `disabled`, and sets `role="menuitem"`. `Separator` renders `role="separator"`. No keyboard handling yet — that lands in Tasks 8–11.

**Files:**

- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.module.scss`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx`

- [ ] **Step 1: Append failing tests**

```tsx
describe('DropdownMenu — Item / Separator', () => {
  async function openMenu() {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onSelect={() => {}} disabled>
            Disabled
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    return { user };
  }

  it('renders items with role="menuitem"', async () => {
    await openMenu();
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
  });

  it('renders Separator with role="separator"', async () => {
    await openMenu();
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('fires onSelect on click of enabled item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={onSelect}>Edit</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('does not fire onSelect on click of disabled item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={onSelect} disabled>
            Edit
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('sets aria-disabled="true" on disabled items', async () => {
    await openMenu();
    const disabled = screen.getByRole('menuitem', { name: 'Disabled' });
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
  });

  it('merges className on Item and Separator', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}} className="custom-item">
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="custom-sep" />
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('menuitem', { name: 'Edit' }).className).toMatch(/custom-item/);
    expect(screen.getByRole('separator').className).toMatch(/custom-sep/);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: FAIL on every new test (Item and Separator still return null).

- [ ] **Step 3: Implement `Item` and `Separator`**

In `DropdownMenu.tsx`:

```tsx
export type DropdownMenuItemTone = 'default' | 'danger';

export interface DropdownMenuItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  onSelect: () => void;
  tone?: DropdownMenuItemTone;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
}

const Item = forwardRef<HTMLDivElement, DropdownMenuItemProps>(function Item(
  { onSelect, tone = 'default', icon, shortcut, disabled = false, className, children, ...rest },
  ref,
) {
  // Context is required (Item must live inside a DropdownMenu), but in this
  // task we don't yet use it; the registry hook-up lands in Task 8.
  useDropdownMenuContext('Item');

  const handleClick = (e: MouseEvent) => {
    if (disabled) return;
    onSelect();
  };

  return (
    <div
      ref={ref}
      role="menuitem"
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      data-tone={tone}
      className={clsx(styles.item, className)}
      onClick={handleClick}
      {...rest}
    >
      {icon !== undefined && <span className={styles.icon}>{icon}</span>}
      <span className={styles.label}>{children}</span>
      {shortcut !== undefined && <span className={styles.shortcut}>{shortcut}</span>}
    </div>
  );
});

export interface DropdownMenuSeparatorProps extends HTMLAttributes<HTMLDivElement> {}

const Separator = forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(function Separator(
  { className, ...rest },
  ref,
) {
  return <div ref={ref} role="separator" className={clsx(styles.separator, className)} {...rest} />;
});
```

Wire them into the `Object.assign`:

```tsx
export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger,
  Content,
  Item,
  Separator,
});
```

- [ ] **Step 4: Add placeholder classes to the SCSS module so `styles.item`, `styles.label`, `styles.icon`, `styles.shortcut`, `styles.separator` resolve**

Append to `DropdownMenu.module.scss`:

```scss
.item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.label {
  flex: 1 1 auto;
}

.icon {
  display: inline-flex;
}

.shortcut {
  color: var(--color-fg-subtle);
  font-size: var(--font-size-sm);
}

.separator {
  height: var(--border-width);
  background: var(--color-border);
}
```

Full styling (padding, radii, hover/active states, danger tone) lands in Task 13. These rules exist so tests asserting `className` merging have something concrete to match against.

- [ ] **Step 5: Run tests**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: Item and Separator with onSelect and disabled"
```

---

## Task 6: Dismissal — outside click, Escape, Tab/Shift+Tab, item select

Add three dismissal paths to `<Content>` and link item selection to closing the menu. After this task:

- `pointerdown` outside Content AND outside Trigger → close (no focus return)
- Escape inside Content → close + focus trigger
- Tab / Shift+Tab inside Content → close + focus trigger, no `preventDefault`
- Click an enabled item → fire `onSelect`, close, focus trigger
- Click Trigger while open → close (does NOT re-open)

**Files:**

- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx`

- [ ] **Step 1: Append failing tests**

```tsx
describe('DropdownMenu — dismissal', () => {
  function setup() {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <div>
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <button type="button">Open</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onSelect={onSelect}>Edit</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
        <button type="button">Outside</button>
      </div>,
    );
    return { user, onSelect };
  }

  it('closes on outside click (pointerdown on document)', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const { user } = setup();
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('closes on Tab from inside the menu and focuses the trigger', async () => {
    const { user } = setup();
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    // Focus the menu so Tab originates inside it.
    screen.getByRole('menu').focus();
    await user.tab();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('fires onSelect, closes, and refocuses the trigger when clicking an item', async () => {
    const { user, onSelect } = setup();
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('clicking the trigger while open closes the menu (no re-open via outside-click)', async () => {
    const { user } = setup();
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: FAIL.

- [ ] **Step 3: Implement dismissal in `Content`**

In `DropdownMenu.tsx`, add a `useEffect` inside `Content` (after the `useFloating` call, before the early return):

```tsx
import { useEffect, type KeyboardEvent as ReactKeyboardEvent } from 'react';
// (merge with existing imports)
```

```tsx
// Outside-click: pointerdown on document, target is neither inside Content
// nor inside the Trigger. Excluding the trigger prevents fighting the
// trigger's own toggle handler.
useEffect(() => {
  if (!ctx.open) return;
  const onPointerDown = (e: PointerEvent) => {
    const target = e.target as Node | null;
    if (!target) return;
    const content = refs.floating.current;
    const trigger = ctx.triggerRef.current;
    if (content && content.contains(target)) return;
    if (trigger && trigger.contains(target)) return;
    ctx.setOpen(false);
  };
  document.addEventListener('pointerdown', onPointerDown, true);
  return () => document.removeEventListener('pointerdown', onPointerDown, true);
}, [ctx, refs]);
```

Add a `handleKeyDown` to the rendered `<div role="menu">`:

```tsx
const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    ctx.setOpen(false);
    ctx.triggerRef.current?.focus();
    return;
  }
  if (e.key === 'Tab') {
    // Close and move focus to trigger; do NOT preventDefault — the browser
    // continues Tab traversal from the (now-focused) trigger.
    ctx.setOpen(false);
    ctx.triggerRef.current?.focus();
    return;
  }
};
```

Wire `onKeyDown={handleKeyDown}` onto the menu div.

Update `Item`'s `handleClick` to close and refocus the trigger:

```tsx
const handleClick = (e: MouseEvent) => {
  if (disabled) return;
  onSelect();
  ctx.setOpen(false);
  ctx.triggerRef.current?.focus();
};
```

Replace the unused `useDropdownMenuContext('Item')` call with `const ctx = useDropdownMenuContext('Item');` so `ctx` is available inside `handleClick`.

- [ ] **Step 4: Run tests**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: outside-click, Escape, Tab, and item-select dismissal"
```

---

## Task 7: Trigger keyboard open — Enter / Space / ArrowDown / ArrowUp

Pressing Enter / Space / ArrowDown on the focused trigger opens the menu **and** signals that the first item should be focused. ArrowUp opens **and** signals the last item. The signal flows via the context's `setOpen` so Content can read it when registering items (Task 8 wires it through).

Until Task 8 fully implements item registry + roving tabindex, the "first/last focus" effect is observable only as "menu is open" — the dedicated focus assertion is added when the registry lands.

**Files:**

- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx`

- [ ] **Step 1: Append failing tests**

```tsx
describe('DropdownMenu — Trigger keyboard open', () => {
  function renderMenu() {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>First</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => {}}>Second</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    return { user };
  }

  it.each(['{Enter}', ' ', '{ArrowDown}'])(
    'opens the menu when Trigger receives %s',
    async (key) => {
      const { user } = renderMenu();
      const trigger = screen.getByRole('button', { name: 'Open' });
      trigger.focus();
      await user.keyboard(key);
      expect(screen.getByRole('menu')).toBeInTheDocument();
    },
  );

  it('opens the menu when Trigger receives ArrowUp', async () => {
    const { user } = renderMenu();
    const trigger = screen.getByRole('button', { name: 'Open' });
    trigger.focus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: FAIL — ArrowDown/Up don't currently open the menu (Enter/Space might pass because they trigger the native button click, but the test explicitly checks all four).

- [ ] **Step 3: Extend the Trigger context to track "open intent"**

Add to the context value type:

```tsx
interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentId: string;
  /** Where the focus should land when Content registers its first item. Resets to 'first' after consumption. */
  openIntent: 'first' | 'last' | null;
  setOpenIntent: (intent: 'first' | 'last' | null) => void;
}
```

Wire in `DropdownMenuRoot`:

```tsx
const [openIntent, setOpenIntent] = useState<'first' | 'last' | null>(null);
// …
const value: DropdownMenuContextValue = {
  open,
  setOpen,
  triggerRef,
  contentId,
  openIntent,
  setOpenIntent,
};
```

- [ ] **Step 4: Add `onKeyDown` to the Trigger's cloned child**

Inside `Trigger`, add:

```tsx
const handleKeyDown = useCallback(
  (e: ReactKeyboardEvent<HTMLElement>) => {
    if (ctx.open) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      ctx.setOpenIntent('first');
      ctx.setOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      ctx.setOpenIntent('last');
      ctx.setOpen(true);
    }
  },
  [ctx],
);
```

Inject it via `cloneElement` alongside `onClick`:

```tsx
return cloneElement(children, {
  ref: mergeRefs(ctx.triggerRef, childProps.ref),
  'aria-haspopup': 'menu',
  'aria-expanded': ctx.open,
  'aria-controls': ctx.open ? ctx.contentId : undefined,
  onPointerDown: chain(
    (childProps as { onPointerDown?: (e: PointerEvent) => void }).onPointerDown,
    handlePointerDown,
  ),
  onKeyDown: chain(
    (childProps as { onKeyDown?: (e: ReactKeyboardEvent<HTMLElement>) => void }).onKeyDown,
    handleKeyDown,
  ),
} as Partial<unknown> as object);
```

Import `KeyboardEvent as ReactKeyboardEvent` from `react` if not already imported.

- [ ] **Step 5: Run tests**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: Trigger keyboard open (Enter/Space/Arrow keys)"
```

---

## Task 8: Item registry + roving tabindex + ArrowDown/ArrowUp/Home/End

Items self-register with the context on mount (DOM-order registry), the active index drives `tabIndex={0}` for exactly one item at a time, and ArrowDown / ArrowUp / Home / End move the active index, skipping disabled items. When the menu opens with `openIntent: 'last'`, the last enabled item is active; otherwise the first.

**Files:**

- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx`

- [ ] **Step 1: Append failing tests**

```tsx
describe('DropdownMenu — item navigation', () => {
  function renderMenu(extra?: ReactNode) {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Alpha</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => {}} disabled>
            Beta
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onSelect={() => {}}>Gamma</DropdownMenu.Item>
          {extra}
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    return { user };
  }

  it('first enabled item is active on open via ArrowDown', async () => {
    const { user } = renderMenu();
    const trigger = screen.getByRole('button', { name: 'Open' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Alpha' })).toHaveFocus();
  });

  it('last enabled item is active on open via ArrowUp', async () => {
    const { user } = renderMenu();
    const trigger = screen.getByRole('button', { name: 'Open' });
    trigger.focus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Gamma' })).toHaveFocus();
  });

  it('ArrowDown skips disabled items and separators', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}'); // Alpha
    await user.keyboard('{ArrowDown}'); // skip Beta, skip Separator → Gamma
    expect(screen.getByRole('menuitem', { name: 'Gamma' })).toHaveFocus();
  });

  it('ArrowDown wraps from last enabled to first enabled', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowUp}'); // open at last → Gamma
    await user.keyboard('{ArrowDown}'); // wrap → Alpha
    expect(screen.getByRole('menuitem', { name: 'Alpha' })).toHaveFocus();
  });

  it('ArrowUp wraps from first enabled to last enabled', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}'); // Alpha
    await user.keyboard('{ArrowUp}'); // wrap → Gamma
    expect(screen.getByRole('menuitem', { name: 'Gamma' })).toHaveFocus();
  });

  it('Home jumps to first enabled item', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowUp}'); // Gamma
    await user.keyboard('{Home}'); // → Alpha
    expect(screen.getByRole('menuitem', { name: 'Alpha' })).toHaveFocus();
  });

  it('End jumps to last enabled item', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}'); // Alpha
    await user.keyboard('{End}'); // → Gamma
    expect(screen.getByRole('menuitem', { name: 'Gamma' })).toHaveFocus();
  });

  it('only the active item has tabIndex=0', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}');
    const alpha = screen.getByRole('menuitem', { name: 'Alpha' });
    const beta = screen.getByRole('menuitem', { name: 'Beta' });
    const gamma = screen.getByRole('menuitem', { name: 'Gamma' });
    expect(alpha.tabIndex).toBe(0);
    expect(beta.tabIndex).toBe(-1);
    expect(gamma.tabIndex).toBe(-1);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: most fail.

- [ ] **Step 3: Extend the context to carry the item registry**

In `DropdownMenu.tsx`:

```tsx
interface RegisteredItem {
  id: string;
  ref: React.RefObject<HTMLDivElement | null>;
  disabled: boolean;
  label: string;
}

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentId: string;
  openIntent: 'first' | 'last' | null;
  setOpenIntent: (intent: 'first' | 'last' | null) => void;
  // Registry — items append on mount, remove on unmount.
  registerItem: (item: RegisteredItem) => () => void;
  itemsRef: React.MutableRefObject<RegisteredItem[]>;
  activeIndex: number;
  setActiveIndex: (i: number) => void;
}
```

In `DropdownMenuRoot`:

```tsx
const itemsRef = useRef<RegisteredItem[]>([]);
const [activeIndex, setActiveIndex] = useState<number>(-1);

const registerItem = useCallback((item: RegisteredItem) => {
  // Insert at the position that matches DOM order. Because React mounts
  // children in document order, plain push gives DOM order during a render.
  // On unmount we remove by id. The dance below tolerates StrictMode double-
  // mount in dev.
  if (!itemsRef.current.some((x) => x.id === item.id)) {
    itemsRef.current.push(item);
  }
  return () => {
    itemsRef.current = itemsRef.current.filter((x) => x.id !== item.id);
  };
}, []);

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
};
```

Reset the registry when the menu closes:

```tsx
useEffect(() => {
  if (!open) {
    setActiveIndex(-1);
  }
}, [open]);
```

- [ ] **Step 4: Update `Item` to self-register and read its `tabIndex` from the active index**

```tsx
const Item = forwardRef<HTMLDivElement, DropdownMenuItemProps>(function Item(
  { onSelect, tone = 'default', icon, shortcut, disabled = false, className, children, ...rest },
  forwardedRef,
) {
  const ctx = useDropdownMenuContext('Item');
  const itemRef = useRef<HTMLDivElement | null>(null);
  const id = useId();

  // Use string children as label for typeahead (Task 10) and for debugging.
  // Non-string children fall back to an empty string; typeahead simply won't
  // match such items, which is acceptable.
  const label = typeof children === 'string' ? children : '';

  // useLayoutEffect (not useEffect) so item registration completes BEFORE
  // Content's parent useLayoutEffect runs to set activeIndex on open. With
  // plain useEffect, Content's layout effect would read an empty registry.
  useLayoutEffect(() => {
    return ctx.registerItem({ id, ref: itemRef, disabled, label });
  }, [ctx, id, disabled, label]);

  const index = ctx.itemsRef.current.findIndex((x) => x.id === id);
  const isActive = index !== -1 && index === ctx.activeIndex;

  const handleClick = (_e: MouseEvent) => {
    if (disabled) return;
    onSelect();
    ctx.setOpen(false);
    ctx.triggerRef.current?.focus();
  };

  return (
    <div
      ref={mergeRefs<HTMLDivElement>(itemRef, forwardedRef)}
      role="menuitem"
      tabIndex={isActive ? 0 : -1}
      aria-disabled={disabled || undefined}
      data-tone={tone}
      className={clsx(styles.item, className)}
      onClick={handleClick}
      {...rest}
    >
      {icon !== undefined && <span className={styles.icon}>{icon}</span>}
      <span className={styles.label}>{children}</span>
      {shortcut !== undefined && <span className={styles.shortcut}>{shortcut}</span>}
    </div>
  );
});
```

- [ ] **Step 5: When the menu opens, set `activeIndex` from `openIntent` and focus the active item**

Inside `Content`, add a `useLayoutEffect` (so focus lands before the browser paints) that runs when `open` flips to `true`:

```tsx
import { useLayoutEffect } from 'react';
// (merge)
```

```tsx
useLayoutEffect(() => {
  if (!ctx.open) return;
  const enabled = ctx.itemsRef.current.filter((x) => !x.disabled);
  if (enabled.length === 0) return;
  const target =
    ctx.openIntent === 'last' ? enabled[enabled.length - 1] : enabled[0];
  const idx = ctx.itemsRef.current.findIndex((x) => x.id === target.id);
  ctx.setActiveIndex(idx);
  // Focus on next microtask so the ref has attached.
  queueMicrotask(() => target.ref.current?.focus());
  ctx.setOpenIntent(null);
  // Intentionally depend only on `ctx.open` so this fires exactly when the
  // menu transitions to open. The registry contents at that moment are what
  // we want to act on.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [ctx.open]);
```

- [ ] **Step 6: Add keyboard navigation to the Content `onKeyDown`**

Extend `handleKeyDown` (defined in Task 6) inside `Content`:

```tsx
const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    ctx.setOpen(false);
    ctx.triggerRef.current?.focus();
    return;
  }
  if (e.key === 'Tab') {
    ctx.setOpen(false);
    ctx.triggerRef.current?.focus();
    return;
  }

  const items = ctx.itemsRef.current;
  const enabledIndices = items
    .map((it, i) => (it.disabled ? -1 : i))
    .filter((i) => i !== -1);
  if (enabledIndices.length === 0) return;

  const currentPos = enabledIndices.indexOf(ctx.activeIndex);

  const focusAt = (registryIndex: number) => {
    ctx.setActiveIndex(registryIndex);
    queueMicrotask(() => items[registryIndex].ref.current?.focus());
  };

  switch (e.key) {
    case 'ArrowDown': {
      e.preventDefault();
      const nextPos = currentPos === -1 ? 0 : (currentPos + 1) % enabledIndices.length;
      focusAt(enabledIndices[nextPos]);
      return;
    }
    case 'ArrowUp': {
      e.preventDefault();
      const prevPos =
        currentPos === -1
          ? enabledIndices.length - 1
          : (currentPos - 1 + enabledIndices.length) % enabledIndices.length;
      focusAt(enabledIndices[prevPos]);
      return;
    }
    case 'Home': {
      e.preventDefault();
      focusAt(enabledIndices[0]);
      return;
    }
    case 'End': {
      e.preventDefault();
      focusAt(enabledIndices[enabledIndices.length - 1]);
      return;
    }
  }
};
```

- [ ] **Step 7: Run tests**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: roving tabindex + Arrow/Home/End navigation"
```

---

## Task 9: Enter / Space activates the active item

When focus is on an active menu item, Enter or Space fires its `onSelect` and closes the menu (which Task 6 already handles via the click path; here we explicitly bind the keys).

**Files:**

- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx`

- [ ] **Step 1: Append failing tests**

```tsx
describe('DropdownMenu — item activation by keyboard', () => {
  function renderMenu(onSelect: () => void) {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={onSelect}>Alpha</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => {}}>Beta</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    return { user };
  }

  it('Enter on the active item fires onSelect and closes', async () => {
    const onSelect = vi.fn();
    const { user } = renderMenu(onSelect);
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}'); // Alpha active
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Space on the active item fires onSelect and closes', async () => {
    const onSelect = vi.fn();
    const { user } = renderMenu(onSelect);
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}'); // Alpha
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: FAIL — Enter/Space currently scroll or do nothing inside `role=menu`.

- [ ] **Step 3: Extend Content's `handleKeyDown` to activate on Enter / Space**

Inside the existing `handleKeyDown` switch, before the closing `}`:

```tsx
if (e.key === 'Enter' || e.key === ' ') {
  e.preventDefault();
  const items = ctx.itemsRef.current;
  if (ctx.activeIndex >= 0 && ctx.activeIndex < items.length) {
    const target = items[ctx.activeIndex];
    if (!target.disabled) {
      target.ref.current?.click();
    }
  }
  return;
}
```

Using `target.ref.current?.click()` routes through `Item`'s existing onClick handler, which fires `onSelect`, closes the menu, and refocuses the trigger — no duplicated logic.

- [ ] **Step 4: Run tests**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: Enter/Space activate the focused item"
```

---

## Task 10: Typeahead

Printable characters typed inside the open menu append to a 500ms-debounced buffer and jump to the first non-disabled item whose label starts with the buffer (case-insensitive).

**Files:**

- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx`

- [ ] **Step 1: Append failing tests**

```tsx
describe('DropdownMenu — typeahead', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function renderMenu() {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => {}}>Delete</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    return { user };
  }

  it('single-character typeahead jumps to first matching label', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}'); // Edit active
    await user.keyboard('d');
    expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus();
  });

  it('multi-character typeahead accumulates within 500ms', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('d');
    await user.keyboard('e'); // "de"
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
  });

  it('buffer resets after 500ms of inactivity', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('d');
    vi.advanceTimersByTime(600);
    await user.keyboard('e'); // 'e' alone, "Edit"
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: FAIL.

- [ ] **Step 3: Implement typeahead inside `Content`**

Add to `Content`, after the existing handlers:

```tsx
const typeaheadRef = useRef<{ buffer: string; timer: ReturnType<typeof setTimeout> | null }>({
  buffer: '',
  timer: null,
});

useEffect(() => {
  return () => {
    if (typeaheadRef.current.timer) clearTimeout(typeaheadRef.current.timer);
  };
}, []);
```

Extend `handleKeyDown` — at the end of the function (after the Enter/Space block), add:

```tsx
// Typeahead: any single printable character that isn't a control key.
if (e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey) {
  const ta = typeaheadRef.current;
  ta.buffer += e.key.toLowerCase();
  if (ta.timer) clearTimeout(ta.timer);
  ta.timer = setTimeout(() => {
    ta.buffer = '';
    ta.timer = null;
  }, 500);

  const items = ctx.itemsRef.current;
  const match = items.findIndex(
    (it) => !it.disabled && it.label.toLowerCase().startsWith(ta.buffer),
  );
  if (match !== -1) {
    e.preventDefault();
    ctx.setActiveIndex(match);
    queueMicrotask(() => items[match].ref.current?.focus());
  }
  return;
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: typeahead navigation with 500ms debounce"
```

---

## Task 11: Controlled-open API (`open` + `onOpenChange`)

Allow the consumer to drive open state externally.

**Files:**

- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx`

- [ ] **Step 1: Append failing tests**

```tsx
describe('DropdownMenu — controlled open', () => {
  it('respects the controlled `open` prop', async () => {
    const { rerender } = render(
      <DropdownMenu open={false} onOpenChange={() => {}}>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    expect(screen.queryByRole('menu')).toBeNull();

    rerender(
      <DropdownMenu open={true} onOpenChange={() => {}}>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('calls onOpenChange when internal toggles fire (controlled mode)', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <DropdownMenu open={false} onOpenChange={onOpenChange}>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    // Internal state is NOT mutated when controlled.
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: FAIL — `open` prop currently ignored.

- [ ] **Step 3: Update `DropdownMenuProps` and `DropdownMenuRoot`**

```tsx
export interface DropdownMenuProps {
  children: ReactNode;
  /** Controlled open state. When provided alongside `onOpenChange`, the consumer owns open. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Default open for uncontrolled usage. Defaults to `false`. */
  defaultOpen?: boolean;
}

function DropdownMenuRoot({ children, open: controlledOpen, onOpenChange, defaultOpen = false }: DropdownMenuProps) {
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

  // … rest unchanged: openIntent, triggerRef, contentId, registerItem, etc.
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: all PASS, no regressions.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: controlled open prop with onOpenChange"
```

---

## Task 12: `align="end"`, `side="top"`, `data-side` / `data-align` exposure

Floating UI already accepts `side`/`align` via the `placement` string. This task verifies they wire through and exposes the resolved values as `data-*` attributes for CSS / tests.

**Files:**

- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx`

- [ ] **Step 1: Append failing tests**

```tsx
describe('DropdownMenu — placement props', () => {
  async function open(props: { side?: 'top' | 'bottom'; align?: 'start' | 'center' | 'end' }) {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content {...props}>
          <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
  }

  it('writes data-side and data-align on Content', async () => {
    await open({ side: 'top', align: 'end' });
    const menu = screen.getByRole('menu');
    expect(menu).toHaveAttribute('data-side', 'top');
    expect(menu).toHaveAttribute('data-align', 'end');
  });

  it('defaults to side=bottom and align=start', async () => {
    await open({});
    const menu = screen.getByRole('menu');
    expect(menu).toHaveAttribute('data-side', 'bottom');
    expect(menu).toHaveAttribute('data-align', 'start');
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: FAIL.

- [ ] **Step 3: Emit `data-side` and `data-align` on the rendered menu div**

In `Content`'s JSX, add the data attributes — preferring the actual placement Floating UI resolved to (`placement` from `useFloating`'s return) over the requested side/align so consumers can style based on where the menu actually landed after `flip()`:

```tsx
const { refs, floatingStyles, placement: resolvedPlacement } = useFloating({ /* … */ });

// resolvedPlacement is e.g. 'top-end' or 'bottom' — split into side/align.
const [resolvedSide, resolvedAlign = 'center'] = resolvedPlacement.split('-') as [
  DropdownMenuSide,
  DropdownMenuAlign | undefined,
];
```

Add `data-side={resolvedSide} data-align={resolvedAlign}` to the menu div.

- [ ] **Step 4: Run tests**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: PASS. (jsdom doesn't really lay out, so `flip()` won't fire; the requested values pass through unchanged, which matches what the tests expect.)

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: expose data-side/data-align from resolved placement"
```

---

## Task 13: Final SCSS — tokens, item states, danger tone, icon/shortcut slots

Replace the placeholder styles with the final SCSS using only tokens (Hard rule 3). Add `--color-bg-danger-subtle` to `tokens.scss` for the highlighted-danger-item background.

**Files:**

- Modify: `packages/design-system/src/styles/tokens.scss`
- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.module.scss`

- [ ] **Step 1: Add the new token**

In `packages/design-system/src/styles/tokens.scss`, append a new color in the "Semantic" or near-Badge section (one good location is right after `--color-danger-fg`):

```scss
// Subtle danger surface — used for hover/highlight backgrounds on
// destructive controls (e.g. DropdownMenu danger items). Same hex as
// --color-badge-danger-bg by design, but semantically a surface token,
// not a badge token.
--color-bg-danger-subtle: #ffebe6;
```

(Add `--color-bg-danger-subtle` next to the other `--color-bg-*` tokens to keep the file organized; the comment above is the rationale.)

- [ ] **Step 2: Verify stylelint still passes**

```bash
npm run lint:css
```

Expected: green.

- [ ] **Step 3: Replace `DropdownMenu.module.scss` with the final styles**

```scss
.content {
  display: flex;
  flex-direction: column;
  gap: var(--space-0);
  min-width: 160px;
  padding: var(--space-1);
  background: var(--color-bg);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  z-index: var(--z-dropdown);
  outline: none;
}

.item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  line-height: var(--line-height-normal);
  color: var(--color-fg);
  cursor: default;
  user-select: none;
  outline: none;
}

.item:hover:not([aria-disabled='true']) {
  background: var(--color-bg-muted);
}

.item[tabindex='0'] {
  background: var(--color-bg-muted);
}

.item[data-tone='danger'] {
  color: var(--color-danger);
}

.item[data-tone='danger']:hover:not([aria-disabled='true']),
.item[data-tone='danger'][tabindex='0'] {
  background: var(--color-bg-danger-subtle);
  color: var(--color-danger);
}

.item[aria-disabled='true'] {
  color: var(--color-fg-disabled);
  cursor: not-allowed;
}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--space-4);
  height: var(--space-4);
  flex-shrink: 0;
  color: var(--color-fg-subtle);
}

.label {
  flex: 1 1 auto;
}

.shortcut {
  color: var(--color-fg-subtle);
  font-size: var(--font-size-sm);
  margin-left: var(--space-3);
}

.separator {
  height: var(--border-width);
  background: var(--color-border);
  margin: var(--space-1) 0;
}
```

Note on layout-rule exception (Hard rule 4): `.item` uses `flex: 1 1 auto` on `.label` — that's an internal layout property *inside the component's own subtree*, which is allowed. The disallowed pattern is using these properties on the component's root element to claim space from a parent. The root `.content` is positioned by Floating UI's inline styles, not by SCSS.

- [ ] **Step 4: Run tests + lint + typecheck**

```bash
npm test -w @eocrm/design-system -- DropdownMenu
npm run lint:css
npm run typecheck
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/styles/tokens.scss packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: final tokens-only styles; add --color-bg-danger-subtle"
```

---

## Task 14: JSDoc on every exported symbol

Add comprehensive JSDoc per Hard rule 7: component, each subcomponent, each prop, each variant type, with `@example` blocks and `@remarks` "When NOT to use" + "Anti-patterns" sections.

**Files:**

- Modify: `packages/design-system/src/components/DropdownMenu/DropdownMenu.tsx`

- [ ] **Step 1: Add JSDoc above `DropdownMenuRoot`**

```tsx
/**
 * Action menu that opens from a trigger button. Compound API — pair `<Trigger>`,
 * `<Content>`, `<Item>`, and `<Separator>` as direct (or nested) children.
 * Implements the WAI-ARIA menu pattern: roving tabindex inside Content,
 * Arrow/Home/End nav, typeahead, Enter/Space to activate, Escape/Tab to
 * dismiss. Content portals to `document.body` and positions itself relative
 * to the trigger via Floating UI (auto-flip, viewport-aware).
 *
 * @example
 * <DropdownMenu>
 *   <DropdownMenu.Trigger>
 *     <Button variant="secondary">Actions</Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content align="end">
 *     <DropdownMenu.Item onSelect={edit}>Edit</DropdownMenu.Item>
 *     <DropdownMenu.Item onSelect={duplicate} shortcut="⌘D">Duplicate</DropdownMenu.Item>
 *     <DropdownMenu.Separator />
 *     <DropdownMenu.Item onSelect={remove} tone="danger">Delete</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu>
 *
 * @example
 * // Table row kebab — minimal trigger via the ghost variant:
 * <DropdownMenu>
 *   <DropdownMenu.Trigger>
 *     <Button variant="ghost" aria-label="Row actions">⋯</Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content align="end">
 *     <DropdownMenu.Item onSelect={() => view(row)}>View</DropdownMenu.Item>
 *     <DropdownMenu.Item onSelect={() => archive(row)}>Archive</DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu>
 *
 * @example
 * // Controlled open (rare — usually let DropdownMenu manage state):
 * const [open, setOpen] = useState(false);
 * <DropdownMenu open={open} onOpenChange={setOpen}>...</DropdownMenu>
 *
 * @remarks When NOT to use
 * - For form value selection ("pick a status", "pick a country") → use
 *   `<Select>` (not yet shipped) so the value lives in form state.
 * - For an always-visible row of actions → use a `<Cluster>` of Buttons in
 *   a toolbar. Menus are for actions that don't deserve permanent screen real
 *   estate.
 * - For navigation between pages → use the sidebar or a `<Link>` (not yet
 *   shipped). Menu items are for *actions*, not page transitions.
 *
 * @remarks Anti-patterns
 * - ❌ Multiple `<DropdownMenu.Trigger>` inside one `<DropdownMenu>`. Use one
 *   DropdownMenu per trigger.
 * - ❌ Trigger child that doesn't accept a ref. The cloneElement contract
 *   needs `forwardRef` on the trigger element. `<Button>` qualifies; a raw
 *   `<button>` qualifies; a custom component that doesn't forward refs does
 *   not.
 * - ❌ `tone="danger"` for non-destructive actions like "Filter" or "Sort".
 *   Reserve danger for irreversible destructive operations.
 * - ❌ Nesting `<DropdownMenu>` inside another DropdownMenu. Submenus are
 *   out of scope for v1 and the focus / dismissal logic will fight you.
 */
```

- [ ] **Step 2: Add JSDoc to each prop interface and subcomponent**

`DropdownMenuProps`:

```tsx
export interface DropdownMenuProps {
  /** Must contain exactly one `<DropdownMenu.Trigger>` and one `<DropdownMenu.Content>`. */
  children: ReactNode;
  /**
   * Controlled open state. Provide alongside `onOpenChange` to drive open
   * externally. Omit both to let DropdownMenu own its own state (the common
   * case).
   */
  open?: boolean;
  /** Fired whenever DropdownMenu wants to change open state. Required when `open` is provided. */
  onOpenChange?: (open: boolean) => void;
  /** Default open state for uncontrolled usage. Defaults to `false`. */
  defaultOpen?: boolean;
}
```

`DropdownMenuTriggerProps`:

```tsx
export interface DropdownMenuTriggerProps {
  /**
   * Exactly one React element. The Trigger clones this element to inject a
   * ref, `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`, and the
   * click/keyboard handlers that open the menu. The child must accept a ref
   * (i.e. use `forwardRef` if it's a custom component); a raw `<button>` or
   * the library's `<Button>` both qualify.
   */
  children: ReactElement;
}
```

`DropdownMenuSide`, `DropdownMenuAlign`:

```tsx
/** Which side of the trigger the menu prefers. Floating UI auto-flips if it doesn't fit. */
export type DropdownMenuSide = 'top' | 'bottom';
/** Which edge of the menu aligns to the corresponding trigger edge. */
export type DropdownMenuAlign = 'start' | 'center' | 'end';
```

`DropdownMenuContentProps`:

```tsx
export interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Preferred side. Default `'bottom'`. Auto-flips on collision. */
  side?: DropdownMenuSide;
  /** Edge alignment. Default `'start'`. */
  align?: DropdownMenuAlign;
  /** Gap in px between trigger and menu. Default `4`. */
  sideOffset?: number;
  /** Minimum width in px or any CSS length. Defaults to the trigger's width. */
  minWidth?: number | string;
}
```

`DropdownMenuItemTone`, `DropdownMenuItemProps`:

```tsx
/** Item color treatment. */
export type DropdownMenuItemTone = 'default' | 'danger';

export interface DropdownMenuItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Called when the item is activated (click or Enter/Space). The consumer performs the action. */
  onSelect: () => void;
  /**
   * Visual tone.
   * - `'default'` — normal action.
   * - `'danger'` — destructive (Delete, Revoke, Remove). Reserve for irreversible operations.
   */
  tone?: DropdownMenuItemTone;
  /** Leading icon. Rendered in a fixed-size slot so labels stay aligned across items. */
  icon?: ReactNode;
  /** Trailing shortcut hint (e.g. `'⌘D'`). Visual cue only — does NOT register a global key handler. */
  shortcut?: string;
  /** Disabled items are skipped by keyboard nav, dimmed, and don't fire `onSelect` on click. */
  disabled?: boolean;
}
```

`DropdownMenuSeparatorProps`:

```tsx
/** Visual divider between groups of items. Decorative — `role="separator"`. */
export interface DropdownMenuSeparatorProps extends HTMLAttributes<HTMLDivElement> {}
```

Add a short JSDoc block above each of `Trigger`, `Content`, `Item`, `Separator` describing what the subcomponent does. (Content is the meaty one; the others are one-liners.)

- [ ] **Step 3: Run typecheck and tests**

```bash
npm run typecheck
npm test -w @eocrm/design-system -- DropdownMenu
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/DropdownMenu/
git commit -m "DropdownMenu: full JSDoc on every exported symbol"
```

---

## Task 15: Re-export from `src/index.ts` and update `AGENTS.md`

**Files:**

- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Append re-exports to `src/index.ts`**

```ts
export { DropdownMenu } from './components/DropdownMenu';
export type {
  DropdownMenuProps,
  DropdownMenuTriggerProps,
  DropdownMenuContentProps,
  DropdownMenuItemProps,
  DropdownMenuSeparatorProps,
  DropdownMenuSide,
  DropdownMenuAlign,
  DropdownMenuItemTone,
} from './components/DropdownMenu';
```

- [ ] **Step 2: Add a `<DropdownMenu>` section to `AGENTS.md`**

Insert after the `<Tabs>` section, before `## Tokens`:

````markdown
### `<DropdownMenu>` — action menus from a trigger

```tsx
<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Actions</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Item onSelect={edit}>Edit</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={duplicate} shortcut="⌘D">
      Duplicate
    </DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item onSelect={remove} tone="danger">
      Delete
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>
```

- Compound API: `<DropdownMenu>` is the provider; `<Trigger>` clones its single child to inject ARIA + handlers; `<Content>` portals to `document.body` and positions itself with Floating UI; `<Item>` renders a `menuitem`; `<Separator>` renders a divider.
- Trigger child must accept a ref via `forwardRef`. `<Button>` does.
- `<Item>` props: `onSelect` (required), `disabled`, `tone` (`'default'` | `'danger'`), `icon`, `shortcut`.
- `<Content>` props: `side` (`'top'` | `'bottom'`, default `'bottom'`), `align` (`'start'` | `'center'` | `'end'`, default `'start'`), `sideOffset` (default `4`), `minWidth`.
- Keyboard: Enter/Space/ArrowDown on trigger opens with first item active; ArrowUp opens with last; Arrow/Home/End navigate skipping disabled and separators; Enter/Space activates; Escape closes and returns focus to trigger; Tab closes and continues normal traversal; typeahead jumps to first matching label (500ms debounce).
- **Non-interactive items use `<Separator>`. Don't render an `<Item>` and rely on `disabled` to mean "this is a label".**
- For value selection (pick a status, country, etc.), use `<Select>` (not yet shipped) — DropdownMenu is for actions, not form values.
````

Add a `DropdownMenu` row to the anti-patterns table:

```markdown
| `<DropdownMenu.Item disabled>--- Section ---</DropdownMenu.Item>` as a header | Use `<DropdownMenu.Separator />` between groups |
```

- [ ] **Step 3: Run gates**

```bash
npm run typecheck
make test
```

Expected: green. (No new tests; verifying the re-export compiles and the existing tests still pass with `import { DropdownMenu } from '@eocrm/design-system'` available in the playground.)

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/index.ts packages/design-system/AGENTS.md
git commit -m "Export DropdownMenu from @eocrm/design-system; update AGENTS.md"
```

---

## Task 16: Update `packages/design-system/CLAUDE.md` wishlist

Strategic doc change recording the "no UI libs; Floating UI for positioning only" stance the user committed to during brainstorming.

**Files:**

- Modify: `packages/design-system/CLAUDE.md`

- [ ] **Step 1: Edit the "Components we don't have yet" section**

Replace the existing list (lines around 154–172) with:

```markdown
## Components we don't have yet

Wishlist for the CRM, in rough priority order. Until each exists, CRM pages should NOT roll their own — use a placeholder + token-correct native HTML, or request the component.

**Dependency policy:** No UI / component libraries. `@floating-ui/react-dom` is used for collision-aware positioning (DropdownMenu and any future popover-shaped component); everything else — ARIA, focus, keyboard, dismissal — is hand-rolled per WAI-ARIA APG patterns. When CSS anchor positioning has acceptable browser support, Floating UI can be removed without changing public APIs.

- `Select` / `Combobox` (hand-roll on Floating UI)
- `Modal` / `Dialog` (hand-roll, no positioning needed; needs focus trap + scroll lock)
- `Tooltip` (hand-roll on Floating UI; lightweight, no focus trap)
- `Popover` (hand-roll on Floating UI; generalized non-menu floating panel)
- `Toast` / notification (hand-roll; no Floating UI — fixed corner placement)
- `Textarea`
- `Checkbox`, `Radio`, `Switch`
- `DatePicker` (hand-roll; calendar grid is the bulk of the work)
- `Table` (TanStack Table headless is acceptable here — it's a behavioral hook, not a UI library, and the alternative is rebuilding sort/filter/pagination state. Revisit when we actually need it.)
- `Skeleton` (loading state)
- `EmptyState`
- `Pagination`
- `Breadcrumb`
- `Link` (router-aware button-like link)
- `IconButton` (the topbar uses an inline one — extract when reused)
```

The change of stance: previously the wishlist named Radix primitives for several entries. The library now ships `<DropdownMenu>` hand-rolled on top of Floating UI alone, and future popover-shaped components follow the same pattern. TanStack Table is explicitly carved out because it's a headless behavior hook, not a UI library — the carve-out is documented so it's not later mistaken for inconsistency.

- [ ] **Step 2: Commit**

```bash
git add packages/design-system/CLAUDE.md
git commit -m "Update wishlist: no UI libs; Floating UI for positioning only"
```

---

## Task 17: Playground demo (`DropdownMenuDemo.tsx`)

Three examples per the spec — toolbar overflow, table row actions, destructive grouping. Uses `DemoLayout` + `Example` per playground convention.

**Files:**

- Create: `packages/playground/src/pages/components/DropdownMenuDemo.tsx`

- [ ] **Step 1: Write the demo**

```tsx
import { Button } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { DropdownMenu } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/DropdownMenu/DropdownMenu.tsx?raw';
import scssSource from '@lib-source/components/DropdownMenu/DropdownMenu.module.scss?raw';

export function DropdownMenuDemo() {
  return (
    <DemoLayout
      name="DropdownMenu"
      componentName="DropdownMenu"
      description="Action menu opened from a trigger. Compound API — pair Trigger / Content / Item / Separator. Portaled, Floating-UI-positioned, full WAI-ARIA menu keyboard behavior."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="DropdownMenu.tsx"
      scssFilename="DropdownMenu.module.scss"
    >
      <Example
        title="Toolbar overflow"
        description={`"More" / overflow menu in a Cluster toolbar. Default align="start" anchors the menu to the trigger's left edge.`}
        code={`<Cluster gap="sm">
  <Button>New deal</Button>
  <Button variant="secondary">Filter</Button>
  <DropdownMenu>
    <DropdownMenu.Trigger>
      <Button variant="secondary">More ▾</Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content>
      <DropdownMenu.Item onSelect={() => {}}>Import CSV</DropdownMenu.Item>
      <DropdownMenu.Item onSelect={() => {}}>Export</DropdownMenu.Item>
      <DropdownMenu.Item onSelect={() => {}}>Bulk edit</DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu>
</Cluster>`}
      >
        <Cluster gap="sm">
          <Button>New deal</Button>
          <Button variant="secondary">Filter</Button>
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button variant="secondary">More ▾</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onSelect={() => {}}>Import CSV</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}}>Export</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}}>Bulk edit</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </Cluster>
      </Example>

      <Example
        title="Table row actions (kebab)"
        description={`Ghost-button kebab at the row's right edge, menu aligned to the trigger's right (align="end") so it doesn't overflow the table.`}
        code={`<Cluster justify="between" gap="sm">
  <span>Acme Inc.</span>
  <DropdownMenu>
    <DropdownMenu.Trigger>
      <Button variant="ghost" aria-label="Row actions">⋯</Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      <DropdownMenu.Item onSelect={() => {}}>View</DropdownMenu.Item>
      <DropdownMenu.Item onSelect={() => {}}>Archive</DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu>
</Cluster>`}
      >
        <Stack gap="sm">
          <Cluster justify="between" gap="sm">
            <span>Acme Inc.</span>
            <DropdownMenu>
              <DropdownMenu.Trigger>
                <Button variant="ghost" aria-label="Row actions">
                  ⋯
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item onSelect={() => {}}>View</DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => {}}>Archive</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </Cluster>
          <Cluster justify="between" gap="sm">
            <span>Globex Corp.</span>
            <DropdownMenu>
              <DropdownMenu.Trigger>
                <Button variant="ghost" aria-label="Row actions">
                  ⋯
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item onSelect={() => {}}>View</DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => {}}>Archive</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </Cluster>
        </Stack>
      </Example>

      <Example
        title="Destructive action with separator"
        description={`Group routine actions, drop a separator, end with a tone="danger" Delete. Reserve danger for irreversible destructive operations.`}
        code={`<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Manage ▾</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => {}} shortcut="⌘D">
      Duplicate
    </DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item onSelect={() => {}} tone="danger">
      Delete
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>`}
      >
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <Button variant="secondary">Manage ▾</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => {}} shortcut="⌘D">
              Duplicate
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onSelect={() => {}} tone="danger">
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </Example>

      <Example
        title="Disabled item"
        description="Disabled items are skipped by keyboard nav, don't fire onSelect, and render dimmed."
        code={`<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Actions ▾</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item onSelect={() => {}}>Available</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => {}} disabled>
      Not yet permitted
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>`}
      >
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <Button variant="secondary">Actions ▾</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onSelect={() => {}}>Available</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => {}} disabled>
              Not yet permitted
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: green.

- [ ] **Step 3: Commit**

```bash
git add packages/playground/src/pages/components/DropdownMenuDemo.tsx
git commit -m "Playground: DropdownMenu demo with four examples"
```

---

## Task 18: Wire demo into the playground (route, nav, index, registry)

Per playground CLAUDE.md Hard rule 4: a new demo must land in four places.

**Files:**

- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Add the route in `App.tsx`**

Add the import alongside the others:

```tsx
import { DropdownMenuDemo } from './pages/components/DropdownMenuDemo';
```

And the route (place after the `tabs` route to keep the file's order matching the sidebar groups — Navigation first, then Overlays):

```tsx
<Route path="/components/dropdown-menu" element={<DropdownMenuDemo />} />
```

- [ ] **Step 2: Add a new `Overlays` group to AppShell's `componentGroups`**

Edit `packages/playground/src/layout/AppShell/AppShell.tsx`. Import the icon (lucide-react):

```tsx
import { MoreHorizontal } from 'lucide-react';
```

Add a new group object at the end of `componentGroups`:

```ts
{
  heading: 'Overlays',
  items: [
    { to: '/components/dropdown-menu', label: 'DropdownMenu', icon: MoreHorizontal, end: false },
  ],
},
```

Rationale: DropdownMenu is a popover-shaped overlay. It doesn't fit Layout / Forms / Display / Navigation, so we add an Overlays group (per the playground CLAUDE.md rule: "If none of the existing groups fit, add a new group"). Future Tooltip / Popover / Dialog / Toast components will land here too.

- [ ] **Step 3: Add a card to `ComponentsIndex.tsx`**

Import:

```tsx
import { DropdownMenu } from '@eocrm/design-system';
```

Append to the `items` array (after the Tabs entry):

```tsx
{
  to: '/components/dropdown-menu',
  name: 'DropdownMenu',
  description: 'Action menu opened from a trigger button. Compound API.',
  preview: (
    <Cluster gap="sm" justify="center">
      <DropdownMenu defaultOpen={false}>
        <DropdownMenu.Trigger>
          <Button size="sm" variant="secondary">
            Actions ▾
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </Cluster>
  ),
},
```

Make sure `Button` is already imported (it is — used by other cards).

- [ ] **Step 4: Extend the `ComponentName` union in `registry.ts`**

Edit `packages/playground/src/pages/mockups/registry.ts`:

```ts
export type ComponentName =
  | 'Button'
  | 'Input'
  | 'Card'
  | 'Stack'
  | 'Cluster'
  | 'Avatar'
  | 'Badge'
  | 'Tabs'
  | 'DropdownMenu';
```

No mockup uses DropdownMenu yet, so no `usesComponents` updates are required. The union extension is mandatory to satisfy the cross-link type contract.

- [ ] **Step 5: Run the build to verify everything wires**

```bash
make build
```

Expected: typecheck + bundle complete without errors.

- [ ] **Step 6: Manually verify in the dev server** (one-time visual gate)

```bash
make dev
```

Open http://localhost:8080/components/dropdown-menu. Confirm:

- The page renders inside `DemoLayout`.
- Each `<Example>` shows a working menu.
- Sidebar shows "Overlays > DropdownMenu" and clicking it navigates here.
- ComponentsIndex card shows the menu trigger preview.
- The menu opens on click, positions correctly, closes on Escape / outside-click / item-click.
- Keyboard: Tab to trigger, Enter/Space/ArrowDown opens, Arrow keys nav, Enter activates.

If the demo behaves correctly, stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add packages/playground/src/App.tsx packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/pages/components/ComponentsIndex.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "Playground: wire DropdownMenu demo (route, nav, index, registry)"
```

---

## Task 19: Run the full gate sweep and `npm pack --dry-run`

Per Hard rule 8 prerequisites, the gates must be green before the review-fix loop runs.

- [ ] **Step 1: Run all four gates from the repo root**

```bash
cd /home/dpws/projects/design-system
make test
npm run typecheck
npm run lint:css
make build
```

Each must complete with exit code 0. If any fails, diagnose and fix on this branch before continuing — do not proceed to Task 20.

- [ ] **Step 2: Run `npm pack --dry-run` and inspect the tarball contents**

```bash
npm pack --dry-run -w @eocrm/design-system 2>&1 | tee /tmp/dropdown-pack.log
```

Expected: log shows the new `DropdownMenu/` files (`.tsx`, `.module.scss`, `index.ts`) included; NO `*.test.tsx` files; NO internal-only paths. If a test file leaks into the tarball, fix the `files` glob in `packages/design-system/package.json` before continuing.

- [ ] **Step 3: Confirm the prettier check passes too**

```bash
npm run format:check
```

If it fails, run `npm run format` and inspect the changes; commit them separately.

- [ ] **Step 4: Commit (only if format produced changes)**

```bash
git add -A
git commit -m "Apply prettier formatting"
```

---

## Task 20: Pre-push review-fix cycle (Hard rule 8)

The library's CLAUDE.md mandates a fresh-context review pass before pushing any library-touching change. This task runs that loop.

- [ ] **Step 1: Dispatch a fresh-context review agent**

Use the Agent tool with `subagent_type: general-purpose`. Brief it as follows (paste into the prompt):

> "Review the pending changes on branch `feat/dropdown-menu` against `packages/design-system/`. Read these files first in this order: `packages/design-system/CLAUDE.md`, `packages/design-system/AGENTS.md`, `packages/design-system/README.md`, then `docs/superpowers/specs/2026-05-19-dropdown-menu-design.md`. Then read the diff: `git diff main...HEAD -- packages/design-system/ packages/playground/`.
>
> Evaluate against the 10 review categories from CLAUDE.md Hard rule 8: (1) bugs, (2) a11y, (3) API inconsistencies, (4) type safety, (5) Rules 1–7 compliance, (6) test coverage, (7) token discipline, (8) SCSS, (9) cross-package leakage, (10) package/distribution. Pay particular attention to:
>
> - The `cloneElement` pattern in `<Trigger>` and any rough edges in the typing.
> - Whether the ARIA menu pattern is implemented correctly (role=menu, role=menuitem, role=separator, aria-haspopup, aria-expanded, aria-controls, aria-disabled, roving tabindex).
> - The focus-management story across Escape / Tab / item-select / outside-click.
> - The `--color-bg-danger-subtle` token addition — naming, value, placement.
> - The `Overlays` sidebar group being a new group rather than reusing an existing one.
>
> Categorize findings as Critical / Important / Nice-to-have / Regression-watch. End with a final verdict: `clean enough to stop` or `keep iterating`."

Run in the foreground; collect the agent's response.

- [ ] **Step 2: Fix every Critical and Important finding**

For each Critical / Important: implement the fix on the branch, re-run the relevant test, commit with a message like `Review fix: <one-line summary>`.

For each Nice-to-have: judgment call. If the fix is cheap and clearly an improvement, apply it. If churn outweighs value, document the skip in a one-liner you'll relay in Step 4.

- [ ] **Step 3: Re-run all gates**

```bash
make test
npm run typecheck
npm run lint:css
make build
```

All green.

- [ ] **Step 4: Dispatch a second review agent with the same prompt**

If the verdict is `clean enough to stop` → continue. Otherwise repeat Step 2–4.

Hard exit criteria:

- 0 Critical, 0 Important (or each remaining has a documented skip rationale).
- All four gates green.
- `npm pack --dry-run` clean.

- [ ] **Step 5: Final commit if any fixes accumulated since the last commit**

```bash
git status
# If there's anything pending, group and commit it.
```

---

## Task 21: Push branch and open PR

- [ ] **Step 1: Push the branch (triggers the husky pre-push hook)**

```bash
git push -u origin feat/dropdown-menu
```

Expected: prettier check, stylelint, typecheck all green; push succeeds.

If the hook fails: investigate the failure, fix the root cause, push again. Do NOT use `--no-verify`.

- [ ] **Step 2: Open the PR via gh CLI**

```bash
gh pr create --title "Add DropdownMenu component (compound API, Floating UI positioning)" --body "$(cat <<'EOF'
## Summary

- Adds `<DropdownMenu>` — compound action menu (`Trigger` / `Content` / `Item` / `Separator`) with full WAI-ARIA menu keyboard pattern.
- First library runtime dep beyond `clsx`: `@floating-ui/react-dom` for collision-aware positioning. Behavior (ARIA, focus, keyboard, dismissal) is hand-rolled.
- Wishlist in `packages/design-system/CLAUDE.md` updated to reflect the new "no UI libs; Floating UI for positioning only" stance.
- Playground demo + `Overlays` sidebar group added.
- `--color-bg-danger-subtle` token added for highlighted-danger-item background.

Spec: `docs/superpowers/specs/2026-05-19-dropdown-menu-design.md`
Plan: `docs/superpowers/plans/2026-05-19-dropdown-menu.md`

## Test plan

- [ ] CI Quality check passes (`make test`, typecheck, stylelint, build).
- [ ] Visual: open http://localhost:8080/components/dropdown-menu and exercise each `<Example>`.
- [ ] Keyboard: tab to trigger, Enter / Space / ArrowDown opens; Arrow / Home / End nav; Enter / Space activates; Escape / Tab / item-click closes with correct focus return.
- [ ] Typeahead: type a letter inside the menu, jumps to first matching label.
- [ ] Disabled items: skipped by nav, ignore click, render dimmed.
- [ ] `tone="danger"` renders red and uses subtle-danger background on highlight.
- [ ] Outside-click closes; clicking trigger while open closes (no re-open bounce).
EOF
)"
```

- [ ] **Step 3: Wait for the `Quality / check` status check**

```bash
gh pr checks --watch
```

Expected: green.

- [ ] **Step 4: Report the PR URL back to the user**

```bash
gh pr view --json url --jq .url
```

Done.

---

## Self-review (post-write checklist)

Run through these before handing the plan over to subagent-driven-development:

- **Spec coverage** — every section of the spec maps to a task above:
  - Compound API → Tasks 3, 4, 5, 11, 12.
  - Floating UI positioning + portal → Task 4, 12.
  - Behavior (open/close, keyboard, dismissal, typeahead) → Tasks 6, 7, 8, 9, 10.
  - Visuals + tokens → Task 13.
  - JSDoc → Task 14.
  - Exports + AGENTS.md → Task 15.
  - CLAUDE.md wishlist update → Task 16.
  - Playground demo + wiring → Tasks 17, 18.
  - Gates + review loop + PR → Tasks 19, 20, 21.
- **Placeholder scan** — no TBD/TODO/"add error handling"/"similar to Task N" phrasing.
- **Type consistency** — `DropdownMenuContextValue` shape evolves across Tasks 3, 7, 8 with each addition spelled out in full; no field is referenced before it's defined.
- **File path consistency** — every task names exact paths under `packages/design-system/src/components/DropdownMenu/` or the four playground integration points.
