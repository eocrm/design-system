# FlowCanvas maximize + custom controls — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-page "maximize" mode and a consumer `controls` render slot to `FlowCanvas`, reusing the design-system's existing overlay infrastructure.

**Architecture:** Additive props on `FlowCanvas` (`controls`, `maximizeControl`, `maximized`/`defaultMaximized`/`onMaximizedChange`). Maximize is **in-place `position: fixed`** on the existing root (NOT a portal — portaling would remount the canvas subtree and reset the ResizeObserver/viewport/focus). Reuse `useScrollLock`, `useFocusTrap`, and the `overlayStack` Escape-yield protocol from `components/_internal/overlay/`. A new z-index token plus one addition to `OVERLAY_PORTAL_SELECTOR` keeps consumer menus opened inside the maximized canvas stacked above it.

**Tech Stack:** React 18 + TypeScript, CSS Modules (SCSS), Vitest + React Testing Library, lucide-react icons, the repo's i18n (`useTranslation`).

**Reference spec:** `docs/superpowers/specs/2026-07-04-flowcanvas-maximize-and-controls-design.md`

**Working branch:** `feat/flowcanvas-maximize-controls` (already created).

---

## Conventions for every task

- Run tests from the repo root with: `npm test -w @eocrm/design-system -- FlowCanvas` (Vitest, `globals: true` — do NOT import `describe`/`it`/`expect`/`vi`).
- Typecheck the library: `npm run typecheck -w @eocrm/design-system` (or `make build-lib`).
- Lint SCSS: `npm run lint:css -w @eocrm/design-system`.
- Commit after each task with the message shown. Do NOT push until Task 11.

---

## Task 1: i18n keys for the new controls

**Files:**

- Modify: `packages/design-system/src/i18n/messages.ts:313` (inside the `flowCanvas` type block, after `zoomLevel`)
- Modify: `packages/design-system/src/i18n/en.ts:188` (after `zoomLevel`)
- Modify: `packages/design-system/src/i18n/ru.ts:190` (after `zoomLevel`)

- [ ] **Step 1: Add the five key declarations to the `Messages` type**

In `messages.ts`, the `flowCanvas` block currently ends:

```ts
    /** Live announcement after zooming. */
    zoomLevel: (params: { percent: number }) => string;
  };
```

Insert the new keys immediately before the closing `};` of `flowCanvas`:

```ts
    /** Live announcement after zooming. */
    zoomLevel: (params: { percent: number }) => string;
    /** aria-label for the maximize (enter-fullscreen) toggle. */
    enterFullscreen: string;
    /** aria-label for the restore (exit-fullscreen) toggle. */
    exitFullscreen: string;
    /** aria-label for the consumer controls toolbar (top-left slot). */
    controlsLabel: string;
    /** Live announcement when the canvas is maximized. */
    maximized: string;
    /** Live announcement when the canvas is restored from maximize. */
    restored: string;
  };
```

- [ ] **Step 2: Add the English values**

In `en.ts`, the `flowCanvas` block ends with `zoomLevel: ({ percent }) => ...,` then `},`. Insert before the closing `},`:

```ts
    zoomLevel: ({ percent }) => `Zoom ${percent as number}%`,
    enterFullscreen: 'Maximize',
    exitFullscreen: 'Restore',
    controlsLabel: 'Canvas actions',
    maximized: 'Canvas maximized',
    restored: 'Canvas restored',
  },
```

- [ ] **Step 3: Add the Russian values**

In `ru.ts`, insert before the closing `},` of `flowCanvas`:

```ts
    zoomLevel: ({ percent }) => `Масштаб ${percent as number}%`,
    enterFullscreen: 'На весь экран',
    exitFullscreen: 'Свернуть',
    controlsLabel: 'Действия с холстом',
    maximized: 'Холст развёрнут',
    restored: 'Холст свёрнут',
  },
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck -w @eocrm/design-system`
Expected: PASS. (The `Messages` type and both locale maps must agree — a missing key in either locale fails here.)

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/i18n/messages.ts packages/design-system/src/i18n/en.ts packages/design-system/src/i18n/ru.ts
git commit -m "feat(FlowCanvas): i18n keys for maximize + controls"
```

---

## Task 2: z-index token + overlay-selector registration

**Files:**

- Modify: `packages/design-system/src/styles/tokens.scss:361` (layering ladder)
- Modify: `packages/design-system/src/components/FlowCanvas/FlowCanvas.tokens.scss:33` (component token)
- Modify: `packages/design-system/src/components/_internal/overlay/useInOverlay.ts:15` (`OVERLAY_PORTAL_SELECTOR`)

- [ ] **Step 1: Add the primitive z-index token**

In `tokens.scss`, the layering block ends at `--z-tooltip: 1300; ...`. Add a line for the maximized canvas. It must sit **below** `--z-modal` (1100) so a Modal opened from a control still wins:

```scss
--z-modal: 1100;
--z-flowcanvas-maximized: 1090; // in-page maximized FlowCanvas — above page content, below modal
--z-overlay-floating: 1190; // floating content (Select/Popover/DropdownMenu/DatePicker/DateRangePicker/TimeField/Rail flyout) opened INSIDE a Modal or Drawer — or inside another elevated surface (elevation is transitive)
```

- [ ] **Step 2: Add the component token**

In `FlowCanvas.tokens.scss`, before the closing `}` of `:root`, add:

```scss
  --flow-handle-bg: var(--color-accent);
  --flow-canvas-maximized-z: var(--z-flowcanvas-maximized);
}
```

- [ ] **Step 3: Register the maximized marker in the overlay selector**

In `useInOverlay.ts`, `OVERLAY_PORTAL_SELECTOR` currently reads:

```ts
const OVERLAY_PORTAL_SELECTOR =
  '[data-drawer-portal-root], [data-modal-portal-root], [data-lightbox-portal-root], [data-popover-content], [data-dropdown-menu-content], [data-in-overlay]';
```

Add `[data-flowcanvas-maximized]`:

```ts
const OVERLAY_PORTAL_SELECTOR =
  '[data-drawer-portal-root], [data-modal-portal-root], [data-lightbox-portal-root], [data-flowcanvas-maximized], [data-popover-content], [data-dropdown-menu-content], [data-in-overlay]';
```

Update the comment above the constant to mention it: append to the existing comment block a sentence like `// Also the in-place maximized FlowCanvas ([data-flowcanvas-maximized]), so a consumer DropdownMenu/Select/Popover opened from its controls elevates above the fixed maximized surface instead of rendering behind it.`

- [ ] **Step 4: Lint + typecheck**

Run: `npm run lint:css -w @eocrm/design-system && npm run typecheck -w @eocrm/design-system`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/styles/tokens.scss packages/design-system/src/components/FlowCanvas/FlowCanvas.tokens.scss packages/design-system/src/components/_internal/overlay/useInOverlay.ts
git commit -m "feat(FlowCanvas): maximize z-index token + overlay-selector registration"
```

---

## Task 3: Props, state, toggle button, controls slot (rendering only)

This task adds the props, the resolved state, the two new chrome containers, and the SCSS — WITHOUT the scroll-lock/focus/keyboard behavior (those are Tasks 5–6). Tests cover pure rendering.

**Files:**

- Modify: `packages/design-system/src/components/FlowCanvas/FlowCanvas.tsx`
- Modify: `packages/design-system/src/components/FlowCanvas/FlowCanvas.module.scss`
- Test: `packages/design-system/src/components/FlowCanvas/FlowCanvas.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append this describe block to `FlowCanvas.test.tsx` (the `NODES`/`EDGES` fixtures already exist at the top of the file):

```tsx
describe('FlowCanvas maximize + controls rendering', () => {
  it('renders the maximize toggle with a localized label, hidden when maximizeControl is false', () => {
    const { rerender } = render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    expect(screen.getByLabelText('Maximize')).toBeInTheDocument();
    rerender(<FlowCanvas nodes={NODES} edges={EDGES} maximizeControl={false} />);
    expect(screen.queryByLabelText('Maximize')).not.toBeInTheDocument();
  });

  it('renders the controls slot in a labelled toolbar with the pan carve-out', () => {
    render(
      <FlowCanvas
        nodes={NODES}
        edges={EDGES}
        controls={<button data-testid="add">Add node</button>}
      />,
    );
    const toolbar = screen.getByRole('toolbar', { name: 'Canvas actions' });
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveAttribute('data-flow-controls');
    expect(toolbar).toContainElement(screen.getByTestId('add'));
  });

  it('does not render the controls toolbar when no controls are passed', () => {
    render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('honors defaultMaximized on first render', () => {
    render(<FlowCanvas nodes={NODES} edges={EDGES} defaultMaximized />);
    expect(screen.getByRole('application')).toHaveAttribute('data-flowcanvas-maximized');
    expect(screen.getByLabelText('Restore')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w @eocrm/design-system -- FlowCanvas`
Expected: FAIL — `Maximize` label not found / `toolbar` role absent / `data-flowcanvas-maximized` absent.

- [ ] **Step 3: Add the new imports to `FlowCanvas.tsx`**

Change the first import line (currently `import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';`) to add `useLayoutEffect`:

```ts
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
```

Add `ReactNode` to the type-only React import block (the `import type { ... } from 'react';` at the top):

```ts
import type {
  FocusEvent as ReactFocusEvent,
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
```

After the existing `import clsx from 'clsx';` line, add the Button + icon + overlay imports:

```ts
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../Button';
import { overlayStack, useFocusTrap, useScrollLock } from '../_internal/overlay';
```

- [ ] **Step 4: Add the four new props to `FlowCanvasProps`**

In the `FlowCanvasProps` interface, after the `readOnly?` prop (line ~66), add:

```ts
  /**
   * Render-only mode: create/move/connect/delete are disabled; selection and
   * open still work. @default false
   */
  readOnly?: boolean;
  /**
   * Consumer-rendered controls shown in a top-left toolbar overlay. Put design-
   * system `<Button>`s here (e.g. an "Add node" button wired to your own state).
   * Stays pinned when the canvas is maximized. @default none
   */
  controls?: ReactNode;
  /**
   * Show the built-in maximize / restore toggle (top-right). Set false to drive
   * maximize entirely via the `maximized` prop. @default true
   */
  maximizeControl?: boolean;
  /** Controlled maximize state. Use with `onMaximizedChange`. */
  maximized?: boolean;
  /** Initial maximize state when uncontrolled. @default false */
  defaultMaximized?: boolean;
  /** Fires whenever maximize is toggled (button, `F` key, or Escape). */
  onMaximizedChange?: (maximized: boolean) => void;
```

- [ ] **Step 5: Destructure the new props**

In the `function FlowCanvas({ ... }, ref)` parameter destructuring, add the new props alongside `readOnly = false`:

```ts
    readOnly = false,
    controls,
    maximizeControl = true,
    maximized: maximizedProp,
    defaultMaximized = false,
    onMaximizedChange,
    className,
```

- [ ] **Step 6: Add the resolved maximize state**

Immediately after the `useControllableState` call for selection (the `const [rawSelection, setSelection] = useControllableState<FlowCanvasSelection>({...});` block ending at line ~173), add:

```ts
const [maximized, setMaximized] = useControllableState<boolean>({
  value: maximizedProp,
  defaultValue: defaultMaximized,
  onChange: onMaximizedChange,
});
// Toggle + announce in one place so the button, the F key, and the Escape
// exit all narrate consistently.
const setMaximizedAnnounced = (next: boolean) => {
  setMaximized(next);
  announce(t(next ? 'flowCanvas.maximized' : 'flowCanvas.restored'));
};
```

> NOTE: `announce` and `t` are defined later in the component body but `setMaximizedAnnounced` is only _called_ from event handlers that run after mount, so the forward reference is fine (it closes over the latest `announce`/`t` each render). If your linter complains about use-before-define on `announce`, move this `setMaximizedAnnounced` definition to just below where `announce` is defined.

- [ ] **Step 7: Add the maximize class + marker to the root element**

In the returned root `<div>`, change the `className` and add the data marker. Current:

```tsx
      className={clsx(styles.root, isPanning && styles.rootPanning, className)}
```

to:

```tsx
      className={clsx(
        styles.root,
        isPanning && styles.rootPanning,
        maximized && styles.rootMaximized,
        className,
      )}
      data-flowcanvas-maximized={maximized ? '' : undefined}
```

(Add `data-flowcanvas-maximized` right after the `className` line, before `onPointerDown`.)

- [ ] **Step 8: Render the two new chrome containers**

Find the line `<FlowControls onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={() => fitTo(contentBounds)} />` (line ~1380) and insert the two containers immediately after it:

```tsx
<FlowControls onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={() => fitTo(contentBounds)} />;
{
  controls != null ? (
    // data-flow-controls: background-pan hit-testing skips this subtree, so
    // pressing a control never starts a canvas pan (same carve-out as the
    // zoom cluster).
    <div
      className={styles.controlsTopLeft}
      data-flow-controls=""
      role="toolbar"
      aria-label={t('flowCanvas.controlsLabel')}
    >
      {controls}
    </div>
  ) : null;
}
{
  maximizeControl ? (
    <div className={styles.controlsTopRight} data-flow-controls="">
      <Button
        variant="secondary"
        size="sm"
        iconOnly
        aria-label={t(maximized ? 'flowCanvas.exitFullscreen' : 'flowCanvas.enterFullscreen')}
        aria-pressed={maximized}
        onClick={() => setMaximizedAnnounced(!maximized)}
      >
        {maximized ? (
          <Minimize2 size={16} aria-hidden="true" />
        ) : (
          <Maximize2 size={16} aria-hidden="true" />
        )}
      </Button>
    </div>
  ) : null;
}
```

- [ ] **Step 9: Add the SCSS classes**

In `FlowCanvas.module.scss`, after the existing `.controls { ... }` block (ends line ~200), add the two new positioned containers (mirrors `.controls`, which already uses `position: absolute` + edge offsets as an internal-chrome anchor):

```scss
.controlsTopLeft {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  display: flex;
  gap: var(--space-1);
}

.controlsTopRight {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  display: flex;
  gap: var(--space-1);
}
```

Then, after the `.root { ... }` / `.rootPanning { ... }` blocks near the top (after line ~25), add the maximized modifier. `position: fixed` is the only stylelint-blocked value here — guard it with the same scoped disable Modal uses:

```scss
// stylelint-disable property-disallowed-list -- maximized canvas is an in-place fixed overlay, not consumer layout
.rootMaximized {
  // stylelint-disable-next-line declaration-property-value-disallowed-list -- must be fixed to fill the viewport
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  width: 100dvw;
  height: 100vh;
  height: 100dvh;
  z-index: var(--flow-canvas-maximized-z);
  border-radius: 0;
}
// stylelint-enable property-disallowed-list
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npm test -w @eocrm/design-system -- FlowCanvas`
Expected: PASS (all four new rendering tests plus the existing suite).

- [ ] **Step 11: Lint SCSS**

Run: `npm run lint:css -w @eocrm/design-system`
Expected: PASS (the scoped `stylelint-disable` comments cover the `position: fixed`).

- [ ] **Step 12: Commit**

```bash
git add packages/design-system/src/components/FlowCanvas/
git commit -m "feat(FlowCanvas): maximize toggle + controls slot (rendering)"
```

---

## Task 4: Toggle behavior — click + controlled/uncontrolled

**Files:**

- Test: `packages/design-system/src/components/FlowCanvas/FlowCanvas.test.tsx`
- (No new source — Task 3's `setMaximizedAnnounced` + `useControllableState` already implement this; this task pins the behavior with tests.)

- [ ] **Step 1: Write the failing tests**

Append to `FlowCanvas.test.tsx`:

```tsx
describe('FlowCanvas maximize toggle behavior', () => {
  it('clicking the toggle maximizes and restores (uncontrolled)', () => {
    render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    const root = screen.getByRole('application');
    expect(root).not.toHaveAttribute('data-flowcanvas-maximized');
    fireEvent.click(screen.getByLabelText('Maximize'));
    expect(root).toHaveAttribute('data-flowcanvas-maximized');
    fireEvent.click(screen.getByLabelText('Restore'));
    expect(root).not.toHaveAttribute('data-flowcanvas-maximized');
  });

  it('fires onMaximizedChange and respects the controlled prop', () => {
    const onMaximizedChange = vi.fn();
    const { rerender } = render(
      <FlowCanvas
        nodes={NODES}
        edges={EDGES}
        maximized={false}
        onMaximizedChange={onMaximizedChange}
      />,
    );
    const root = screen.getByRole('application');
    fireEvent.click(screen.getByLabelText('Maximize'));
    expect(onMaximizedChange).toHaveBeenCalledWith(true);
    // Controlled: no visual change until the prop updates.
    expect(root).not.toHaveAttribute('data-flowcanvas-maximized');
    rerender(
      <FlowCanvas nodes={NODES} edges={EDGES} maximized onMaximizedChange={onMaximizedChange} />,
    );
    expect(root).toHaveAttribute('data-flowcanvas-maximized');
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test -w @eocrm/design-system -- FlowCanvas`
Expected: PASS. If FAIL, verify Task 3 Step 6/8 wired `setMaximizedAnnounced` to the button `onClick` and that `useControllableState` uses `value: maximizedProp`.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/FlowCanvas/FlowCanvas.test.tsx
git commit -m "test(FlowCanvas): maximize toggle controlled/uncontrolled behavior"
```

---

## Task 5: Keyboard — `F` toggles, `Escape` exits (after selection)

**Files:**

- Modify: `packages/design-system/src/components/FlowCanvas/FlowCanvas.tsx` (`handleRootKeyDown`)
- Test: `packages/design-system/src/components/FlowCanvas/FlowCanvas.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `FlowCanvas.test.tsx`:

```tsx
describe('FlowCanvas maximize keyboard', () => {
  it('F toggles maximize from the canvas', () => {
    render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: 'f' });
    expect(root).toHaveAttribute('data-flowcanvas-maximized');
    fireEvent.keyDown(root, { key: 'f' });
    expect(root).not.toHaveAttribute('data-flowcanvas-maximized');
  });

  it('Escape exits maximize, but clears a selection first', () => {
    render(
      <FlowCanvas
        nodes={NODES}
        edges={EDGES}
        defaultMaximized
        defaultSelection={{ type: 'node', id: 'open' }}
      />,
    );
    const root = screen.getByRole('application');
    expect(root).toHaveAttribute('data-flowcanvas-maximized');
    expect(screen.getByLabelText('Open')).toHaveAttribute('data-selected');
    // First Escape clears the selection, stays maximized.
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(screen.getByLabelText('Open')).not.toHaveAttribute('data-selected');
    expect(root).toHaveAttribute('data-flowcanvas-maximized');
    // Second Escape exits maximize.
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(root).not.toHaveAttribute('data-flowcanvas-maximized');
  });

  it('Escape does nothing when not maximized and nothing is selected', () => {
    const onMaximizedChange = vi.fn();
    render(<FlowCanvas nodes={NODES} edges={EDGES} onMaximizedChange={onMaximizedChange} />);
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(onMaximizedChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w @eocrm/design-system -- FlowCanvas`
Expected: FAIL — `F` does nothing; second Escape doesn't exit maximize.

- [ ] **Step 3: Add the `F` toggle to `handleRootKeyDown`**

In `handleRootKeyDown`, after the `if (key === '0') { ... }` fit-to-content block (ends line ~1059) and before the `if (key === 'Delete' || key === 'Backspace')` block, insert:

```ts
if ((key === 'f' || key === 'F') && !ctrlKey && !metaKey) {
  // Maximize works in readOnly too (viewing a large graph fullscreen is valid).
  event.preventDefault();
  setMaximizedAnnounced(!maximized);
  return;
}
```

- [ ] **Step 4: Extend the `Escape` branch to exit maximize**

Replace the existing Escape block:

```ts
if (key === 'Escape') {
  if (selection) {
    event.preventDefault();
    event.stopPropagation();
    setSelection(null);
    announce(t('flowCanvas.selectionCleared'));
  }
  return;
}
```

with a version that falls through to maximize-exit when there is no selection, yielding to any open floating surface (the #274 protocol) so a consumer menu closes first:

```ts
if (key === 'Escape') {
  if (selection) {
    event.preventDefault();
    event.stopPropagation();
    setSelection(null);
    announce(t('flowCanvas.selectionCleared'));
    return;
  }
  // No selection: exit maximize, unless an open floating surface (a
  // consumer DropdownMenu/Popover) is claiming this press (#274).
  if (
    maximized &&
    !overlayStack.hasOpenFloating() &&
    !overlayStack.wasEscapeConsumed(event.nativeEvent)
  ) {
    event.preventDefault();
    event.stopPropagation();
    setMaximizedAnnounced(false);
  }
  return;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -w @eocrm/design-system -- FlowCanvas`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/FlowCanvas/FlowCanvas.tsx packages/design-system/src/components/FlowCanvas/FlowCanvas.test.tsx
git commit -m "feat(FlowCanvas): F toggles maximize, Escape exits after clearing selection"
```

---

## Task 6: Scroll lock + focus trap + focus restore

**Files:**

- Modify: `packages/design-system/src/components/FlowCanvas/FlowCanvas.tsx`
- Test: `packages/design-system/src/components/FlowCanvas/FlowCanvas.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `FlowCanvas.test.tsx`:

```tsx
describe('FlowCanvas maximize overlay behavior', () => {
  it('locks body scroll while maximized and restores on exit', () => {
    render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    expect(document.body.style.position).not.toBe('fixed');
    fireEvent.click(screen.getByLabelText('Maximize'));
    expect(document.body.style.position).toBe('fixed');
    fireEvent.click(screen.getByLabelText('Restore'));
    expect(document.body.style.position).not.toBe('fixed');
  });

  it('moves focus into the canvas on maximize and restores it on exit', () => {
    render(
      <>
        <button data-testid="outside">outside</button>
        <FlowCanvas nodes={NODES} edges={EDGES} />
      </>,
    );
    const outside = screen.getByTestId('outside');
    outside.focus();
    expect(document.activeElement).toBe(outside);
    fireEvent.click(screen.getByLabelText('Maximize'));
    const root = screen.getByRole('application');
    expect(document.activeElement).toBe(root);
    fireEvent.click(screen.getByLabelText('Restore'));
    expect(document.activeElement).toBe(outside);
  });

  it('restores body scroll if unmounted while maximized', () => {
    const { unmount } = render(<FlowCanvas nodes={NODES} edges={EDGES} defaultMaximized />);
    expect(document.body.style.position).toBe('fixed');
    unmount();
    expect(document.body.style.position).not.toBe('fixed');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -w @eocrm/design-system -- FlowCanvas`
Expected: FAIL — body is not locked; focus does not move to the root.

- [ ] **Step 3: Add the scroll lock and focus trap hooks**

In the component body, place these near the other top-level hooks (after the `maximized` state from Task 3, and BEFORE the render). The focus effect is a **passive** `useEffect` placed AFTER `useFocusTrap` on purpose: on exit, `useFocusTrap`'s cleanup (removing its `focusin` redirect listener) must run before we restore focus outward, or the trap would bounce the restored focus back into the canvas.

```ts
// --- maximize: scroll lock, focus trap, focus move/restore ----------------
useScrollLock(maximized);
useFocusTrap(rootRef, maximized);
// Capture the pre-maximize focus and move focus into the canvas on enter;
// restore it on exit. Passive effect, ordered after useFocusTrap so the trap
// has torn down before we restore focus outward (see note above).
const prevMaximizedRef = useRef(maximized);
const previouslyFocusedRef = useRef<HTMLElement | null>(null);
useEffect(() => {
  const was = prevMaximizedRef.current;
  prevMaximizedRef.current = maximized;
  if (maximized && !was) {
    previouslyFocusedRef.current = (document.activeElement as HTMLElement | null) ?? null;
    rootRef.current?.focus({ preventScroll: true });
  } else if (!maximized && was) {
    const target = previouslyFocusedRef.current;
    previouslyFocusedRef.current = null;
    if (target && document.contains(target)) target.focus({ preventScroll: true });
    else rootRef.current?.focus({ preventScroll: true });
  }
}, [maximized]);
```

> `useLayoutEffect` is imported (Task 3) for other potential use, but this focus effect is intentionally `useEffect`. Keep it as `useEffect`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -w @eocrm/design-system -- FlowCanvas`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/FlowCanvas/FlowCanvas.tsx packages/design-system/src/components/FlowCanvas/FlowCanvas.test.tsx
git commit -m "feat(FlowCanvas): scroll lock + focus trap + focus restore for maximize"
```

---

## Task 7: Viewport preservation + readOnly maximize

**Files:**

- Test: `packages/design-system/src/components/FlowCanvas/FlowCanvas.test.tsx`
- (No source change expected — this pins the no-remount guarantee and readOnly behavior. If a test fails it reveals an accidental remount/reset from an earlier task.)

- [ ] **Step 1: Write the failing/guard tests**

Append to `FlowCanvas.test.tsx`:

```tsx
describe('FlowCanvas maximize preserves state', () => {
  it('keeps the viewport transform across a maximize/restore round trip', () => {
    const { container } = render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    const root = screen.getByRole('application');
    const stage = container.querySelector('[data-flow-stage]') as HTMLElement;
    root.focus();
    // Zoom in twice so the transform is non-default.
    fireEvent.keyDown(root, { key: '+' });
    fireEvent.keyDown(root, { key: '+' });
    const zoomed = stage.style.transform;
    expect(zoomed).not.toBe('');
    fireEvent.click(screen.getByLabelText('Maximize'));
    fireEvent.click(screen.getByLabelText('Restore'));
    // Same DOM node, same transform — no remount/reset.
    const stageAfter = container.querySelector('[data-flow-stage]') as HTMLElement;
    expect(stageAfter).toBe(stage);
    expect(stageAfter.style.transform).toBe(zoomed);
  });

  it('allows maximize in readOnly', () => {
    render(<FlowCanvas nodes={NODES} edges={EDGES} readOnly />);
    const root = screen.getByRole('application');
    fireEvent.click(screen.getByLabelText('Maximize'));
    expect(root).toHaveAttribute('data-flowcanvas-maximized');
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test -w @eocrm/design-system -- FlowCanvas`
Expected: PASS. If the transform test FAILS with `stageAfter` !== `stage`, an earlier task introduced a remount — revisit that the root is styled in place (`.rootMaximized` class) and NOT wrapped in a portal.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/FlowCanvas/FlowCanvas.test.tsx
git commit -m "test(FlowCanvas): maximize preserves viewport, works in readOnly"
```

---

## Task 8: Elevation integration — a menu inside the maximized canvas stacks above it

This validates Task 2's `OVERLAY_PORTAL_SELECTOR` change end-to-end with a real DS floating component.

**Files:**

- Test: `packages/design-system/src/components/FlowCanvas/FlowCanvas.test.tsx`

- [ ] **Step 1: Write the failing test**

Add the `Select` import at the top of the test file (next to the existing `import { FlowCanvas } from './FlowCanvas';`):

```tsx
import { Select } from '../Select';
import { overlayStack } from '../_internal/overlay';
```

Append the test:

```tsx
describe('FlowCanvas maximize elevation', () => {
  afterEach(() => {
    overlayStack._reset();
  });

  it('elevates a Select opened from the controls slot above the maximized canvas', async () => {
    render(
      <FlowCanvas
        nodes={NODES}
        edges={EDGES}
        defaultMaximized
        controls={
          <Select aria-label="Node type" defaultValue="task">
            <Select.Option value="task">Task</Select.Option>
            <Select.Option value="gate">Gate</Select.Option>
          </Select>
        }
      />,
    );
    // Open the Select — its listbox portals to document.body.
    fireEvent.click(screen.getByRole('combobox', { name: 'Node type' }));
    const listbox = await screen.findByRole('listbox');
    // Registered against [data-flowcanvas-maximized] via OVERLAY_PORTAL_SELECTOR,
    // so it stamps data-in-overlay and elevates above the fixed maximized canvas.
    expect(listbox).toHaveAttribute('data-in-overlay');
  });
});
```

> VERIFY the `Select` API before running: open `packages/design-system/src/components/Select/` and confirm the trigger role (`combobox`), the `Select.Option` subcomponent name, and how a controlled/uncontrolled value is passed. Adjust the JSX in this test to match the real Select API (the assertion on `data-in-overlay` is the point of the test and does not change). If `Select` proves awkward in jsdom, substitute `DropdownMenu` (whose content carries `data-dropdown-menu-content`) and assert `data-in-overlay` on its `[role="menu"]` panel instead.

- [ ] **Step 2: Run the test to verify it fails without Task 2's change**

Temporarily confirm the dependency: if you revert the `[data-flowcanvas-maximized]` addition in `useInOverlay.ts`, this test FAILS (`data-in-overlay` absent). Re-apply it and the test PASSES. (Don't commit the revert — this is just to confirm the test is meaningful.)

Run: `npm test -w @eocrm/design-system -- FlowCanvas`
Expected: PASS with Task 2 in place.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/FlowCanvas/FlowCanvas.test.tsx
git commit -m "test(FlowCanvas): consumer menu elevates above the maximized canvas"
```

---

## Task 9: Playground demo — controls slot + maximize note

**Files:**

- Modify: `packages/playground/src/pages/components/FlowCanvasDemo.tsx`

- [ ] **Step 1: Add the controls handlers and imports**

Change the import from `@eocrm/design-system` to add `Button` and `Cluster`:

```tsx
import {
  Badge,
  Button,
  Cluster,
  FlowCanvas,
  Stack,
  Text,
  Title,
  type FlowCanvasEdge,
  type FlowCanvasNode,
} from '@eocrm/design-system';
```

Inside `FlowCanvasDemo`, after the existing `handleSelectionChange` callback, add two custom-control handlers:

```tsx
const handleAddNode = useCallback(() => {
  const id = `state-${nextId++}`;
  const offset = 40 + nodes.length * 24;
  setNodes((prev) => [
    ...prev,
    { id, label: `New state ${nextId - 1}`, position: { x: offset, y: offset } },
  ]);
  setLastEvent('controls: add node');
}, [nodes.length]);
const handleReset = useCallback(() => {
  setNodes(WORKFLOW_NODES);
  setEdges(WORKFLOW_EDGES);
  setLastEvent('controls: reset');
}, []);
```

- [ ] **Step 2: Wire `controls` into the interactive `FlowCanvas`**

In the "Workflow builder" `Example`, add the `controls` prop to the live `<FlowCanvas>` (the one at line ~124, not the code string):

```tsx
<FlowCanvas
  nodes={nodes}
  edges={edges}
  controls={
    <Cluster gap="xs">
      <Button size="sm" variant="primary" onClick={handleAddNode}>
        Add node
      </Button>
      <Button size="sm" variant="secondary" onClick={handleReset}>
        Reset
      </Button>
    </Cluster>
  }
  onNodeCreate={handleNodeCreate}
  onNodeMove={handleNodeMove}
  onNodeDelete={handleNodeDelete}
  onNodeOpen={handleNodeOpen}
  onEdgeCreate={handleEdgeCreate}
  onEdgeDelete={handleEdgeDelete}
  onEdgeOpen={handleEdgeOpen}
  onSelectionChange={handleSelectionChange}
/>
```

- [ ] **Step 3: Update the example description + code string**

Change the "Workflow builder" `Example`'s `description` to mention the new affordances:

```tsx
description =
  "Drag nodes, drag from a node's edge handle to connect, double-click empty space to add a state, Delete to remove the selection. Custom controls (top-left) and a Maximize toggle (top-right) — press F or Escape to toggle fullscreen. Full keyboard support: arrows rove, E cycles edges, C connects, Shift+arrows nudge.";
```

In the same `Example`'s `code={`...`}` template string, add the `controls` prop so the copy-pasteable snippet matches the live demo. Insert after `edges={edges}` inside the template's `<FlowCanvas`:

```tsx
      <FlowCanvas
        nodes={nodes}
        edges={edges}
        controls={
          <button onClick={() => setNodes((prev) => [...prev, { id: crypto.randomUUID(), label: 'New state', position: { x: 40, y: 40 } }])}>
            Add node
          </button>
        }
        onNodeCreate={(pos) =>
```

(Keep the rest of the code string unchanged.)

- [ ] **Step 4: Update the Implementation notes**

In the final `Stack` "Implementation notes" `Text`, append a sentence about the new capabilities:

```tsx
          +/−/0 zoom and fit, Ctrl+arrows pan. Pass `controls` to render your own
          buttons top-left; the built-in Maximize toggle (top-right, or F / Escape)
          expands the canvas to fill the viewport.
```

- [ ] **Step 5: Typecheck the playground build**

Run: `npm run build -w @eocrm/playground` (or `make build` from repo root)
Expected: PASS (typecheck + bundle). The demo is already routed/navigated (it's an existing component), so no `App.tsx`/`AppShell`/`ComponentsIndex`/`registry` changes are needed.

- [ ] **Step 6: Commit**

```bash
git add packages/playground/src/pages/components/FlowCanvasDemo.tsx
git commit -m "docs(FlowCanvas): demo the controls slot + maximize toggle"
```

---

## Task 10: Component JSDoc + AGENTS.md

**Files:**

- Modify: `packages/design-system/src/components/FlowCanvas/FlowCanvas.tsx` (component `@remarks`)
- Modify: `packages/design-system/AGENTS.md:937` (the `### <FlowCanvas>` TL;DR section)

- [ ] **Step 1: Extend the component `@remarks`**

In the `FlowCanvas` component JSDoc (the big block at lines ~69–128), add to the "When NOT to use" `@remarks` list a bullet clarifying the maximize semantics, and mention the two new capabilities in the opening paragraph. After the existing paragraph that starts "Nodes without `position` are auto-laid-out...", add:

```ts
 * Pass `controls` to render your own buttons in a top-left toolbar (e.g. an
 * "Add node" button wired to your state). A built-in Maximize toggle (top-right,
 * or the `F` key; Escape restores) expands the canvas **in place** to fill the
 * viewport — this is an in-page maximize, not the native Fullscreen API.
```

And add a bullet to the "When NOT to use" list:

```ts
 * - Do not hide primary, always-needed actions solely behind Maximize or in the
 *   `controls` slot — those are canvas chrome, not a substitute for the page's
 *   own toolbar; keep essential actions reachable when the canvas is inline.
```

- [ ] **Step 2: Update the AGENTS.md TL;DR**

Open `packages/design-system/AGENTS.md` and find the `### <FlowCanvas>` section (~line 937). Add a sentence to the prose summary:

> Pass `controls` (a `ReactNode`) to render your own buttons top-left; a built-in Maximize toggle (top-right / `F` key, Escape to restore) expands the canvas in place to fill the viewport. `maximizeControl={false}` hides the toggle if you drive `maximized` yourself.

Extend the canonical snippet in that section to show the `controls` slot, e.g. add to the example `<FlowCanvas ...>`:

```tsx
  controls={<Button size="sm" onClick={addNode}>Add node</Button>}
```

- [ ] **Step 3: Verify JSDoc renders in the demo API table**

The demo auto-renders a props table from `props.manifest.json` (Vite plugin). Run `npm run build -w @eocrm/design-system` to regenerate types, then spot-check that the new props carry their JSDoc (this is validated by the review loop in Task 11).

Run: `npm run typecheck -w @eocrm/design-system`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/FlowCanvas/FlowCanvas.tsx packages/design-system/AGENTS.md
git commit -m "docs(FlowCanvas): document maximize + controls in JSDoc and AGENTS.md"
```

---

## Task 11: Gates, review-fix loop, browser verification

Per `packages/design-system/CLAUDE.md` Rule 8, any library change runs the review-fix loop before push.

- [ ] **Step 1: Run all gates**

```bash
npm test -w @eocrm/design-system
npm run typecheck -w @eocrm/design-system
npm run lint:css -w @eocrm/design-system
npm run build -w @eocrm/design-system
npm pack --dry-run -w @eocrm/design-system
```

Expected: all PASS; `npm pack --dry-run` shows no `*.test.tsx` and no internal-only paths in the tarball.

- [ ] **Step 2: Browser-verify the maximize paint** (jsdom can't see paint — required for a visually-novel change)

Start the playground (`make dev`), open the FlowCanvas demo, and with Playwright (or Claude-in-Chrome) confirm:

- The Maximize toggle (top-right) and the custom controls (top-left) render over the canvas.
- Clicking Maximize expands the canvas to fill the viewport; zoom cluster stays bottom-left, controls top-left, toggle (now Restore) top-right.
- `F` and `Escape` toggle/exit; the page behind does not scroll while maximized.
- A control that opens a menu (if added) renders ABOVE the maximized canvas.
  Capture a screenshot of the maximized state for the PR.

- [ ] **Step 3: Fresh-context review agent**

Spawn a `general-purpose` review agent scoped to `packages/design-system/`, briefed on the 10 review categories in CLAUDE.md Rule 8 (bugs, a11y, API consistency, type safety, Rules 1–7, test coverage, token discipline, SCSS, cross-package leakage, packaging). Fix every Critical + Important; document any deliberate skips. Re-run gates and re-review until the verdict is "clean enough to stop".

- [ ] **Step 4: Push + open PR**

```bash
git push -u origin feat/flowcanvas-maximize-controls
gh pr create --title "feat(FlowCanvas): in-page maximize + custom controls slot" --body "$(cat <<'EOF'
Adds an in-page Maximize mode and a consumer `controls` render slot to FlowCanvas.

- `controls?: ReactNode` — top-left toolbar the consumer fills with DS Buttons ("Add node" etc.)
- `maximizeControl?`, `maximized?`, `defaultMaximized?`, `onMaximizedChange?` — the Maximize toggle (top-right / `F` key, Escape restores)
- In-place `position: fixed` (not a portal) to preserve viewport/observer/focus; reuses `useScrollLock`/`useFocusTrap`/`overlayStack`; new `--z-flowcanvas-maximized` token + `OVERLAY_PORTAL_SELECTOR` registration so consumer menus stack above the maximized canvas.

Spec: docs/superpowers/specs/2026-07-04-flowcanvas-maximize-and-controls-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Wait for the `Quality / check` status check to pass, then merge.** The Release workflow auto-publishes a patch version on merge (per repo release automation).

---

## Self-review notes

- **Spec coverage:** props (T3) · in-place fixed mechanism (T3 SCSS) · z-index token + selector (T2) · Escape precedence + `F` (T5) · scroll lock/focus trap/restore (T6) · viewport preservation + readOnly (T7) · elevation of inner menus (T8) · i18n (T1) · demo (T9) · JSDoc + AGENTS.md (T10) · tests throughout · browser verify + review loop (T11). All spec sections mapped.
- **Deviation from spec:** mechanism is in-place `position: fixed`, not `createPortal` — rationale documented at the top of this plan and in the spec update. The elevation requirement is unchanged and still satisfied.
- **Type consistency:** `maximized`/`setMaximized`/`setMaximizedAnnounced`, `data-flowcanvas-maximized`, `--z-flowcanvas-maximized` / `--flow-canvas-maximized-z`, and i18n keys `enterFullscreen`/`exitFullscreen`/`controlsLabel`/`maximized`/`restored` are used identically across tasks.
- **Open verification during execution:** Task 8's exact `Select` JSX must be checked against the real Select API before running (noted inline).
