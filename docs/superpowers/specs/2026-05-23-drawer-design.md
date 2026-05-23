# Drawer — design spec

**Date:** 2026-05-23
**Branch:** `feat/drawer`
**Scope:** New `<Drawer>` compound overlay component (left / right / top / bottom slide-in panel) plus a refactor that relocates the overlay infrastructure hooks (`useFocusTrap`, `useScrollLock`, `useOverlayStack`) from `components/Modal/` to `components/_internal/overlay/` so Modal and Drawer share them as siblings.

## Goal

A drawer (a.k.a. side sheet / off-canvas panel) primitive for the CRM use cases that don't fit a center-positioned Modal: filter panels sliding from the right, mobile navigation drawers from the left, detail-preview drawers for row clicks, and bottom action sheets on mobile. Hand-rolled per the project's "no UI libraries" policy. Composes with Modal — they can stack in either direction (Drawer-inside-Modal, Modal-inside-Drawer), share a single body scroll lock, and route Escape to whichever is topmost.

## Why now

- Modal just shipped (v0.0.36) and its three internal hooks (`useFocusTrap`, `useScrollLock`, `useModalStack`) are the right behavioral primitives for Drawer too. Building Drawer now lets us extract those hooks into a clearly-shared location BEFORE more overlay-shaped components arrive — much cheaper to do at 2 callers than at 5.
- DataTable, contact pages, and any list-with-detail flow want a "click a row, see details slide in" pattern. Today consumers would compose Modal + custom positioning hacks. Drawer is the right primitive.
- Mobile nav for the CRM is on the roadmap and needs an off-canvas left drawer.

## Non-goals (v1)

- **No mouse drag-to-close.** Touch only. Desktop users have Escape + overlay click + Close button. Mouse drag-to-close is unusual on desktop and easy to trigger accidentally.
- **No drag from anywhere on the drawer.** Drag initiates only from `<Drawer.Header>`. Body keeps its native scroll, Footer is just tap targets. Resolving the body-scroll-vs-drag conflict with smart heuristics is left out for v1.
- **No explicit `<Drawer.Handle>` pill** (the iOS-style indicator pip at the top of bottom sheets). Header is the drag affordance.
- **No persistent / always-visible variant** for nav-rail use case. Use a regular `<Stack>` / `<aside>` for that. Drawer is for overlays.
- **No resize handle.**
- **No imperative `drawer.open()` Promise API.** Same controlled-only stance as Modal.
- **No push-content / body-shift pattern.** Drawer is an overlay — page content stays put while it's open.
- **No portal target customization.** Drawer always portals to `document.body`.

## Architecture

### Dependencies

No new packages. Hand-rolled.

### Refactor: hooks relocate to `_internal/overlay/`

Before this PR, the three hooks live in `packages/design-system/src/components/Modal/`. They move:

```
Before:
  components/Modal/useFocusTrap.ts
  components/Modal/useFocusTrap.test.ts
  components/Modal/useScrollLock.ts
  components/Modal/useScrollLock.test.ts
  components/Modal/useModalStack.ts          ← contains `modalStack` singleton
  components/Modal/useModalStack.test.ts

After:
  components/_internal/overlay/useFocusTrap.ts
  components/_internal/overlay/useFocusTrap.test.ts
  components/_internal/overlay/useScrollLock.ts
  components/_internal/overlay/useScrollLock.test.ts
  components/_internal/overlay/useOverlayStack.ts   ← contains `overlayStack` singleton
  components/_internal/overlay/useOverlayStack.test.ts
  components/_internal/overlay/index.ts             ← barrel re-export
```

Both `Modal/*.tsx` and `Drawer/*.tsx` import from `../_internal/overlay`.

**Public type compatibility:** `ModalStackMode` was exported from the Modal index. After the rename, the canonical type is `OverlayStackMode` in `_internal/overlay`. Modal re-exports it as `type ModalStackMode = OverlayStackMode` for backward compatibility — no consumer break. Drawer re-exports the same type as `DrawerStackMode`.

Test references to `modalStack._reset()` (in `Modal.test.tsx`, `useModalStack.test.ts`) get renamed to `overlayStack._reset()`.

### File layout

```
packages/design-system/src/components/Drawer/
  DrawerRoot.tsx           ← <Drawer> — context, controlled state, scroll lock, focus restore
  Overlay.tsx              ← Dimming/blurred backdrop; click-to-dismiss; per-stack-position attrs
  Content.tsx              ← Dialog container; portaled; focus-trapped; role="dialog"; data-side
  Header.tsx               ← Title bar + optional close button + drag origin
  Body.tsx                 ← Scrollable content area
  Footer.tsx               ← Pinned action bar (role="group")
  Close.tsx                ← cloneElement wrapper that calls onOpenChange(false)
  Drawer.tsx               ← Object.assign attaches subcomponents
  Drawer.module.scss
  Drawer.test.tsx
  context.ts               ← DrawerContext + useDrawerContext("ComponentName") guard
  useDragToClose.ts        ← Touch-only swipe-to-dismiss hook (new, Drawer-specific)
  useDragToClose.test.ts
  index.ts
```

### Composition

- `<Stack>` / `<Cluster>` used internally by Header / Footer for layout primitives.
- `<Button>` referenced in JSDoc examples and the playground demo, not imported by Drawer itself.
- Existing tokens for color / spacing / shadow / radius.
- Pattern reuse from Modal: compound context, portal mount, escape capture-phase listener, `cloneElement` for `Drawer.Close`, focus return via captured `previouslyFocused`.
- Shared hooks from `_internal/overlay`: `useFocusTrap`, `useScrollLock`, `useOverlayStack`.

### New tokens

Add to `packages/design-system/src/styles/tokens.scss`:

```scss
/* Drawer width (left/right) or height (top/bottom) per size variant. */
--size-drawer-sm: 320px; /* nav drawer, compact filter */
--size-drawer-md: 440px; /* detail panel, standard filter */
--size-drawer-lg: 640px; /* wide detail, composer */
```

The existing `--z-modal: 1100`, `--color-bg-overlay`, `--color-bg-overlay-blur`, `--transition-base`, `--space-*`, `--radius-*`, `--shadow-lg` all get reused. Drawer is on the same z-ladder as Modal (`var(--z-modal)`).

## Public API

### `<Drawer>` root

```ts
export type DrawerSide = 'left' | 'right' | 'top' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg';
export type DrawerOverlayVariant = 'solid' | 'blur';
export type DrawerStackMode = OverlayStackMode; // re-export alias

export interface DrawerProps {
  /** Controlled open state. Required — Drawer has no uncontrolled mode. */
  open: boolean;
  /** Fired when Drawer wants to change open state — Esc, overlay click, Close button, swipe, programmatic. */
  onOpenChange: (open: boolean) => void;

  /** Edge the drawer slides in from. Defaults to 'right'. */
  side?: DrawerSide;

  /**
   * Size preset.
   * - For side='left' | 'right': width.
   * - For side='top' | 'bottom': height.
   * Capped at `100vw - 32px` (or `100vh - 32px` for top/bottom) on narrow viewports.
   * Defaults to 'md'.
   */
  size?: DrawerSize;

  /**
   * Overlay variant. 'solid' (default) paints a dark dimming layer.
   * 'blur' uses a light tinted background plus `backdrop-filter: blur(4px)`
   * for a frosted-glass effect. Same semantics as Modal.
   */
  overlay?: DrawerOverlayVariant;

  /**
   * How this drawer relates to other open overlays (Modals or Drawers) in
   * the stack.
   * - 'overlay' (default): parent stays visible underneath; this drawer's
   *   overlay paints transparent so only the bottom of the stack tints.
   * - 'replace': parent is hidden via display:none (React state preserved).
   */
  stackMode?: DrawerStackMode;

  /** Disable Escape-to-close. Default false. */
  disableEscapeClose?: boolean;
  /** When false, clicking the overlay does NOT close the drawer. Default true. */
  dismissOnOverlayClick?: boolean;
  /**
   * Enable swipe-to-close gesture on touch devices. Drag initiates only from
   * `<Drawer.Header>`. Default true. Pass `false` for forced-step drawers.
   */
  dragToClose?: boolean;

  /** Initial focus target on open. Default: the dialog container itself. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;

  /** Compound children: Header / Body / Footer / Close + any consumer JSX. */
  children: ReactNode;

  /** className passes through to the dialog container. */
  className?: string;
  /** style passes through to the dialog container. */
  style?: CSSProperties;

  /**
   * Required for a11y when no Drawer.Header is rendered. When Header IS rendered,
   * aria-labelledby auto-binds to the heading id; this prop is then ignored.
   */
  'aria-label'?: string;
  /** Optional id of an external descriptor element; sets aria-describedby on the dialog. */
  'aria-describedby'?: string;
}
```

### Sub-component props (all `forwardRef`)

All mirror Modal's subcomponent shapes exactly — consumers learn one pattern.

```ts
export interface DrawerHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Show the built-in × close button on the right edge. Default true. */
  closeButton?: boolean;
}

export interface DrawerBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** Override body's padding. Default 'default' (--space-4). 'none' for edge-to-edge content. */
  padding?: 'default' | 'none';
}

export interface DrawerFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Horizontal action alignment. Default 'end'. */
  align?: 'start' | 'end' | 'space-between';
}

export interface DrawerCloseProps {
  /**
   * Single clickable child. Click anywhere on it triggers onOpenChange(false).
   * Uses cloneElement to chain the existing onClick (matches Modal.Close pattern).
   */
  children: ReactElement;
}
```

### Exports

From `packages/design-system/src/components/Drawer/index.ts`:

```ts
export { Drawer } from './Drawer';
export type {
  DrawerProps,
  DrawerSide,
  DrawerSize,
  DrawerOverlayVariant,
  DrawerStackMode,
  DrawerHeaderProps,
  DrawerBodyProps,
  DrawerFooterProps,
  DrawerCloseProps,
} from './Drawer';
```

From the library root `src/index.ts`:

```ts
export { Drawer } from './components/Drawer';
export type {} from /* all of the above */ './components/Drawer';
```

## Architecture flow

### Mount / unmount

**Open transition (open: false → true):**

1. `useOverlayStack.register(drawerId, stackMode)` — returns depth + isTop. Same singleton Modal uses.
2. `useScrollLock(open)` — ref-counted body scroll lock; first acquire pins body to `position: fixed; top: -<scrollY>px`. Shared across Modal + Drawer; opening a Drawer while a Modal is already open increments the count but doesn't re-acquire.
3. `previouslyFocused = document.activeElement` captured in a `useLayoutEffect` (BEFORE Content's auto-focus microtask runs — same fix Modal landed in v0.0.36).
4. Portal mounts overlay + content.
5. Content's `useLayoutEffect` queueMicrotasks the initial focus call: `initialFocusRef.current?.focus({preventScroll: true}) ?? contentRef.current?.focus({preventScroll: true})`.
6. Focus trap activates (only when `isTop && open`). Same `useFocusTrap` from `_internal/overlay`.
7. Animations: overlay fades via `@starting-style { opacity: 0 }`. Content slides in via `@starting-style { transform: translate<axis>(±100%) }` — per-side.
8. `inert` attribute applied to body children EXCEPT all `[data-modal-portal-root]` AND `[data-drawer-portal-root]` elements (mutually exempting overlays of either type for cross-component stacking).

**Close transition (open: true → false):**

1. Layout-effect cleanups run in reverse mount order:
   - `useScrollLock` cleanup: restore body styles, force reflow, `scrollTo({behavior: 'instant'})` + rAF fallback.
   - `useOverlayStack` cleanup: unregister; notify subscribers (sibling overlays re-sync `isTop` / `topMode`).
   - Focus restore (in `DrawerRoot`'s `useLayoutEffect`): `previouslyFocused.focus({preventScroll: true})` if still in DOM.
2. `data-state="closed"` set before unmount drives exit animation (overlay fade + content slide-out).
3. Portal unmounts after transition duration.

### Stacking math

The shared `overlayStack` singleton stores per-overlay entries `{id, mode}`. Each overlay calls `register(id, mode)` on open and `unregister(id)` on close. Depth is the entry's index in the ordered list (0 = bottom, length-1 = top).

**Cross-component stacking matrix** (all four combinations supported):

| Outer        | Inner        | Outer's `data-stack-position` | Inner's | Behavior                                                                                              |
| ------------ | ------------ | ----------------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| Modal        | Drawer       | `underneath` (overlay mode)   | `top`   | Modal stays visible, drawer slides in over it                                                         |
| Drawer       | Modal        | `underneath`                  | `top`   | Drawer stays visible, modal mounts on top                                                             |
| Drawer-right | Drawer-right | `underneath`                  | `top`   | Both right drawers visible; inner overlaps outer (paint=no on inner means parent's dim shows through) |
| Drawer-left  | Drawer-right | `underneath`                  | `top`   | Both visible at opposite edges; no overlap                                                            |

Same paint rule as Modal: `paint = (topMode === 'replace' && isTop) || (topMode === 'overlay' && depth === 0)`. Same `data-stack-position='hidden' { display: none }` for replace mode.

**Escape routing:** `useOverlayStack.isTop(id)` already routes Esc to the topmost across types. Inner closes first.

**Scroll lock:** acquired ONCE across the stack (refcount stays ≥ 1 while any overlay is open).

### Per-side positioning + animation

The Content element gets `data-side` attribute. SCSS handles per-side positioning + transform:

```scss
.content[data-side='right'] {
  right: 0;
  top: 0;
  bottom: 0;
  width: min(var(--drawer-size), 100vw - 32px);
  transform: translateX(0);
  transition: transform var(--transition-base);
  @starting-style {
    transform: translateX(100%);
  }
}
.content[data-side='right'][data-state='closed'] {
  transform: translateX(100%);
}

.content[data-side='left'] {
  left: 0;
  top: 0;
  bottom: 0;
  width: min(var(--drawer-size), 100vw - 32px);
  @starting-style {
    transform: translateX(-100%);
  }
}
.content[data-side='left'][data-state='closed'] {
  transform: translateX(-100%);
}

.content[data-side='top'] {
  top: 0;
  left: 0;
  right: 0;
  height: min(var(--drawer-size), 100vh - 32px);
  @starting-style {
    transform: translateY(-100%);
  }
}
.content[data-side='top'][data-state='closed'] {
  transform: translateY(-100%);
}

.content[data-side='bottom'] {
  bottom: 0;
  left: 0;
  right: 0;
  height: min(var(--drawer-size), 100vh - 32px);
  @starting-style {
    transform: translateY(100%);
  }
}
.content[data-side='bottom'][data-state='closed'] {
  transform: translateY(100%);
}
```

The size class (`.size-sm/md/lg`) sets `--drawer-size: var(--size-drawer-sm/md/lg)` which the side rule consumes via `min()`.

Reduced motion: `@media (prefers-reduced-motion: reduce)` disables the transform transition (and the @starting-style values) but the opacity transition on the overlay stays.

### Focus trap

Reused as-is from Modal — `useFocusTrap(contentRef, isTop && open)`. The `FLOATING_BYPASS_SELECTOR` from `useFocusTrap` (matching `[data-popover-content]`, `[data-dropdown-menu-content]`, `role="tooltip"`, `role="menu"`, `role="listbox"`, `role="dialog"`) already covers the case of opening a Popover from inside a Drawer.

For stacked drawers/modals, only the topmost has an ACTIVE trap. Inner overlays' traps stay mounted but `useFocusTrap` is gated by `ctx.isTop` and no-ops when false.

### Drag-to-close

New hook `useDragToClose` in `components/Drawer/`. Touch-only (filtered by `pointerType === 'touch'` if using pointer events, or by attaching `touchstart/touchmove/touchend` directly).

**Hook signature:**

```ts
interface UseDragToCloseOptions {
  side: DrawerSide;
  active: boolean; // false when dragToClose prop is false OR drawer is not top of stack
  onDismiss: () => void;
  contentRef: RefObject<HTMLElement | null>;
}
function useDragToClose(
  headerRef: RefObject<HTMLElement | null>,
  options: UseDragToCloseOptions,
): void;
```

The hook attaches touchstart listener to `headerRef.current` only. Body and Footer are not touched.

**State machine:**

1. **touchstart on header** → record startX, startY, startTime. Set `dragging = true`. Apply `style.transition = 'none'` on contentRef.
2. **touchmove** → compute delta in the side's dismiss direction. Apply `style.transform = 'translate<axis>(<delta>px)'` to contentRef (clamped to 0 in non-dismiss direction). Update overlay opacity proportionally: `1 - (|delta| / drawer size)` clamped to [0, 1].
3. **touchend** → measure final delta and velocity (Δposition / Δtime in px/ms).
   - If `delta >= 0.4 * drawerSize` OR `velocity >= 0.5 px/ms` → call `onDismiss()`. Drawer state goes to `open: false`, normal close animation plays from the current dragged position.
   - Otherwise → snap-back: re-enable `style.transition`, reset `style.transform = ''`. Overlay opacity returns to 1 via CSS transition.

**Per-side direction:** dismiss direction is the direction the drawer slides away.

- right: positive X (drag right)
- left: negative X (drag left)
- top: negative Y (drag up)
- bottom: positive Y (drag down)

**Conflict guards:**

- Header gets `touch-action: none` in CSS — gesture isn't hijacked by browser pull-to-refresh or body scroll.
- Body / Footer don't have any touchstart listener, so their native scroll / tap behavior is unchanged.
- If `active === false` (forced-step or not-top-of-stack), the hook attaches no listeners.

**Reduced motion:** drag-to-close still works (it's the user's gesture, not an animation), but the snap-back transition is disabled in `prefers-reduced-motion: reduce` — release-before-threshold snaps instantly back to position 0.

### Inert attribute lifecycle

Same as Modal, with one expanded skip list. In Drawer's `Overlay.tsx`:

```ts
const PORTAL_ATTR_SELECTOR = '[data-modal-portal-root], [data-drawer-portal-root]';

useEffect(() => {
  if (!ctx.isTop) return;
  const bodyChildren = Array.from(document.body.children) as HTMLElement[];
  const toRestore: Array<{ el: HTMLElement; had: boolean }> = [];
  for (const el of bodyChildren) {
    if (el.matches(PORTAL_ATTR_SELECTOR)) continue;
    const had = el.hasAttribute('inert');
    if (!had) el.setAttribute('inert', '');
    toRestore.push({ el, had });
  }
  return () => {
    for (const { el, had } of toRestore) if (!had) el.removeAttribute('inert');
  };
}, [ctx.isTop]);
```

Modal's `Overlay.tsx` gets the same selector update so a Modal opened on top of a Drawer doesn't inert the Drawer's portal.

## ARIA contract

| Element           | Role / attr                   | Notes                                                                                                                   |
| ----------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `.content`        | `role="dialog"`               | Standard dialog role for focus-locking overlay.                                                                         |
|                   | `aria-modal="true"`           | Same as Modal — captures focus.                                                                                         |
|                   | `tabIndex={-1}`               | So the focus trap can take the container.                                                                               |
|                   | `aria-labelledby={headingId}` | Auto-wired when `<Drawer.Header>` is rendered.                                                                          |
|                   | `aria-label`                  | Fallback when no Header. Dev warning otherwise.                                                                         |
|                   | `aria-describedby`            | Passed through if provided.                                                                                             |
|                   | `data-side`                   | `'left' \| 'right' \| 'top' \| 'bottom'`. Useful for testing / SR identification.                                       |
|                   | `data-size`                   | `'sm' \| 'md' \| 'lg'`.                                                                                                 |
|                   | `data-state`                  | `'open' \| 'closed'`. Drives animations.                                                                                |
| `.overlay`        | (no role)                     | Clickable backdrop. Carries `data-modal-portal-root`-style attr but uses `data-drawer-portal-root=""` to differentiate. |
| `<Drawer.Header>` | (no role)                     | The `<h2>` heading inside it gets a generated id that wires to `aria-labelledby`.                                       |
| `<Drawer.Footer>` | `role="group"`                | Same as Modal.                                                                                                          |

**Dev warning:** if neither Header nor `aria-label` is provided when `open=true`, emit a `console.warn` (deferred via `queueMicrotask` so Header's registration effect has a chance — same pattern Modal uses).

## SCSS sketch

```scss
@use '../../styles/mixins' as *;

.overlay {
  position: fixed;
  inset: 0;
  background: var(--color-bg-overlay);
  z-index: calc(var(--z-modal) + var(--modal-depth, 0) * 2);
  opacity: var(--opacity-visible);
  transition: opacity var(--transition-base);
  overscroll-behavior: contain;
  @starting-style {
    opacity: var(--opacity-hidden);
  }
}
.overlay[data-state='closed'] {
  opacity: var(--opacity-hidden);
}
.overlay[data-stack-position='hidden'] {
  display: none;
}
.overlay[data-variant='blur'] {
  background: var(--color-bg-overlay-blur);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.overlay[data-overlay-paint='no'] {
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.content {
  position: fixed;
  background: var(--color-bg);
  box-shadow: var(--shadow-lg);
  z-index: calc(var(--z-modal) + var(--modal-depth, 0) * 2 + 1);
  display: flex;
  flex-direction: column;
  transition: transform var(--transition-base);
}

// Per-side positioning + animation entries documented above.

// Size presets drive --drawer-size which the side rules consume via min().
.size-sm {
  --drawer-size: var(--size-drawer-sm);
}
.size-md {
  --drawer-size: var(--size-drawer-md);
}
.size-lg {
  --drawer-size: var(--size-drawer-lg);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: var(--border-width) solid var(--color-border);
  touch-action: none; // prevent browser gestures hijacking drag-to-close
}

.body {
  padding: var(--space-4);
  overflow-y: auto;
  flex: 1 1 auto;
  overscroll-behavior: contain;
}

.footer {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  border-top: var(--border-width) solid var(--color-border);
}

// Reduced motion
@media (prefers-reduced-motion: reduce) {
  .overlay,
  .content {
    transition: none;
    @starting-style {
      opacity: var(--opacity-visible);
      transform: none;
    }
  }
}
```

## Testing strategy

### Relocation tests (Modal must still pass)

- All 1154 existing tests pass after the hook relocation. Imports update; behavior unchanged.
- `useFocusTrap.test.ts`, `useScrollLock.test.ts`, `useOverlayStack.test.ts` (renamed) live in `_internal/overlay/` with all existing assertions intact. The `useOverlayStack` test renames `modalStack` references to `overlayStack` throughout.

### New Drawer.test.tsx (~25 cases)

Same shape as `Modal.test.tsx`:

- Renders nothing when closed.
- Open: `role="dialog"`, `aria-modal="true"`, `data-side`, `data-size`.
- Each of the 4 sides applies the correct positioning attr.
- Each of the 3 sizes applies the correct size class.
- `aria-labelledby` wires from `<Drawer.Header>`.
- `aria-label` fallback when no Header.
- Dev warning fires when neither label provided; does NOT fire when Header or aria-label is provided.
- Escape dismisses, `disableEscapeClose` suppresses.
- Overlay click dismisses, `dismissOnOverlayClick={false}` suppresses.
- Click inside Content does NOT dismiss.
- `<Drawer.Close>` click dismisses.
- Header `closeButton={false}` removes the × button.
- `initialFocusRef` receives focus on open.
- Body scroll locked on open, released on close (uses shared `useScrollLock`).
- Focus restored to trigger on close.
- Stacked Drawer+Drawer: outer is `data-stack-position='underneath'` (overlay mode) or `'hidden'` (replace mode); inner is `'top'`.
- Inert: neither portal carries inert when two overlays are stacked.
- **Cross-component stack: Drawer-inside-Modal** — Esc closes Drawer first, Modal stays open. Inert correct.
- **Cross-component stack: Modal-inside-Drawer** — mirror scenario.
- Overlay variant `data-variant` attribute.
- Mobile cap: at viewport 390px width, `size='md'` (440px) renders the content with `width: 358px` (= 100vw - 32px).
- Forced step combo (`disableEscapeClose + dismissOnOverlayClick={false} + dragToClose={false} + closeButton={false}` + no Close).
- Popover inside Drawer is interactive (focus trap bypass selector works).

### Drag-to-close tests (~7)

- Each side: drag past 40% threshold + release → `onOpenChange(false)` called.
- Velocity-based dismiss: drag <40% but release velocity > 0.5px/ms → `onOpenChange(false)` called.
- Below threshold + slow release → no `onOpenChange` call. Content `transform` returns to 0.
- `dragToClose={false}` → no touchstart listener attached; touch on Header does nothing.
- touchstart on Body does NOT initiate drag (Body has no listener).
- Reduced motion: drag still works; snap-back transition is disabled.
- Mid-gesture release after small movement → snap-back without dismiss.

## Demo page

`packages/playground/src/pages/components/DrawerDemo.tsx` with examples mirroring Modal's:

1. **Basic** — right drawer, default size, simple Header/Body/Footer.
2. **Sides** — buttons that open each of the 4 sides.
3. **Sizes** — sm/md/lg comparison at side='right'.
4. **Overlay variants** — solid vs blur.
5. **Forced step (non-dismissible)** — disableEscapeClose + dismissOnOverlayClick=false + dragToClose=false + closeButton=false.
6. **Form drawer with initial focus** — initialFocusRef on the first input.
7. **Stacked drawers (overlay mode)** — open a right drawer, click inside to open a confirmation drawer over it.
8. **Drawer ↔ Modal interop** — open a drawer, open a modal from inside it. Demonstrates cross-component Esc routing.
9. **No header (aria-label fallback)**.

Plus standard nav wiring (App.tsx route, AppShell sidebar, ComponentsIndex card, mockups registry).

## AGENTS.md updates

- Add a `<Drawer>` TL;DR section after Modal's.
- Cross-link from Modal's TL;DR: "see `<Drawer>` for edge-anchored alternatives".
- Add to the "Components" table.

## Hard Rule 8 cycle

Same as Modal:

1. Run all gates (test, build-lib, lint, build, npm pack --dry-run).
2. Spawn fresh-context reviewer with the 10 review categories.
3. Fix Critical + Important findings; re-run gates; re-review.
4. Loop until verdict is "clean enough to stop".

## Out-of-PR follow-ups (noted, not in v1)

- Drag-to-close on Modal (e.g., fullscreen Modal on mobile, swipe down to close).
- `<Drawer.Handle>` explicit drag-handle pill subcomponent (for bottom sheets).
- Persistent / always-visible Drawer variant (for nav rails).
- Push-content / body-shift pattern.
