# Modal — design spec

**Date:** 2026-05-22
**Branch:** `feat/modal`
**Scope:** Single `<Modal>` compound component covering confirm/alert, form/edit, detail/preview, and forced-step use cases. Three size variants (`sm` / `md` / `lg`), fullscreen on narrow viewports, supports stacked modals.

## Goal

A modal dialog primitive that handles the patterns the CRM actually needs — focused confirmations, form editors, detail panels, and forced-step interrupts. Hand-rolled per the project's "no UI libraries" policy. Closes the explicit gap noted in `packages/design-system/CLAUDE.md`'s wishlist: "Modal/Dialog (hand-roll, no positioning needed; needs focus trap + scroll lock)."

## Why now

- Popover (already shipped) explicitly defers focus-trap + inert-background behavior to "once `<Modal>` lands" via a reserved `modal: boolean` prop note in its source. The seam exists; the component doesn't.
- DataTable, EditContact-style forms, and destructive-confirmation flows all need a focus-locked, scroll-locked dialog. Today these compose Popover + workarounds, which is the wrong primitive for full-attention interactions.
- Existing primitives cover everything Modal will compose with: Stack/Cluster for layout, Button for actions, the full token system for sizing and theming, `_internal/refs.ts` for `mergeRefs` + `sanitizeId`.

## Non-goals (v1)

- **No bottom-sheet variant.** Drag-to-dismiss + snap-points is its own component category. Phase 2 if real demand surfaces.
- **No imperative manager (`modal.open() => Promise`).** v1 is JSX-based, controlled-only. Promise-based opener is a 30-line wrapper consumers can build if they want it.
- **No built-in confirm/alert convenience component.** Consumers compose `<Modal>` + `<Modal.Header>` + body + `<Button>` for confirms. `ConfirmationPopover` already exists for the lightweight inline-confirm case.
- **No drag-to-position or resize.** Modals are centered. Period.
- **No multi-modal coordination beyond stacking.** No "queued modals" or "modal manager". Consumers manage their own state.
- **No `<dialog>` element semantics.** Browsers' native `<dialog>` lacks consistent focus-trap behavior across the project's support range. Use a `role="dialog"` div with explicit focus management.
- **No persistence helpers.** Modal doesn't remember it was open across navigations. Consumer-owned `open` state means consumers can persist if they want.

## Architecture

### Dependencies

No new packages. Hand-rolled per project policy.

### File layout

```
packages/design-system/src/components/Modal/
  ModalRoot.tsx         ← <Modal> — context, controlled state, scroll lock, focus restore
  Overlay.tsx           ← Dimming backdrop; click-to-dismiss
  Content.tsx           ← Dialog container; portaled; focus-trapped; role="dialog"
  Header.tsx            ← Title bar + optional close button; auto-registers aria-labelledby id
  Body.tsx              ← Scrollable content area
  Footer.tsx            ← Pinned action bar (role="group")
  Close.tsx             ← cloneElement wrapper that calls onOpenChange(false)
  Modal.tsx             ← Object.assign attaches subcomponents
  Modal.module.scss
  Modal.test.tsx
  context.ts            ← ModalContext + useModalContext("ComponentName") guard
  useFocusTrap.ts       ← Tab cycle within container + focusin recapture
  useFocusTrap.test.ts
  useScrollLock.ts      ← Ref-counted body scroll lock with scrollbar-gutter padding
  useScrollLock.test.ts
  useModalStack.ts      ← Module-level stack registry; depth indexing for z-index + Esc routing
  useModalStack.test.ts
  index.ts
```

### Composition

- `<Stack>` / `<Cluster>` used internally by `Header` / `Footer` for layout primitives
- `<Button>` referenced in JSDoc examples and the playground demo, not imported by Modal itself
- Existing tokens for color/spacing/shadow/radius
- Pattern reuse from Popover: compound context, portal mount, escape capture-phase listener, `cloneElement` for `Modal.Close`, focus return via captured `previouslyFocused`

### New tokens

`--z-modal: 1100` already exists in `tokens.scss` (part of the layered ladder: dropdown 1000, popover 1050, modal 1100, toast 1200, tooltip 1300). Reuse as the base for the stacking math.

Add to `packages/design-system/src/styles/tokens.scss`:

```scss
/* Modal width presets. Match the size= prop on <Modal>. */
--size-modal-sm: 400px;
--size-modal-md: 560px;
--size-modal-lg: 800px;

/* Dimming backdrop. rgb-modern notation matching existing shadow tokens. */
--color-bg-overlay: rgb(15 23 42 / 50%);              /* solid variant */
--color-bg-overlay-blur: rgb(255 255 255 / 30%);      /* blur variant: light frosted-glass tint paired with backdrop-filter: blur(4px) */
```

## Public API

### `<Modal>` root

```ts
export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  /** Controlled open state. Required — Modal has no uncontrolled mode. */
  open: boolean;
  /** Fired when Modal wants to change open state — Esc, overlay click, Close button, programmatic. */
  onOpenChange: (open: boolean) => void;

  /** Size preset → maps to `--size-modal-sm/md/lg` width. Defaults to 'md'. */
  size?: ModalSize;

  /**
   * Overlay variant. 'solid' (default) paints a dark dimming layer. 'blur' uses a
   * light tinted background plus `backdrop-filter: blur(4px)` for a frosted-glass
   * effect. 'blur' costs an extra compositor layer — fine for normal use; avoid
   * stacking three blurred modals on the same screen.
   */
  overlay?: 'solid' | 'blur';

  /**
   * Disable Escape-to-close. Default false. Combined with `dismissOnOverlayClick: false`
   * and omitting `<Modal.Close>` produces a fully forced step.
   */
  disableEscapeClose?: boolean;
  /**
   * When false, clicking the overlay backdrop does NOT close the modal. Default true.
   * Use for forms with unsaved-data guards.
   */
  dismissOnOverlayClick?: boolean;

  /**
   * Initial focus target on open. Default: the dialog container itself (tabIndex=-1).
   * Pass a ref to override (e.g. focus the first input in a form).
   */
  initialFocusRef?: React.RefObject<HTMLElement | null>;

  /** Compound children: Header / Body / Footer / Close + any consumer JSX. */
  children: ReactNode;

  /** className passes through to the dialog container. */
  className?: string;
  /** style passes through to the dialog container. */
  style?: CSSProperties;

  /**
   * Required for a11y when no Modal.Header is rendered. When Header IS rendered,
   * aria-labelledby auto-binds to the heading id; this prop is then ignored.
   * Throws a dev-only warning if neither this nor a Header is provided.
   */
  'aria-label'?: string;
  /** Optional id of an external descriptor element; sets aria-describedby on the dialog. */
  'aria-describedby'?: string;
}
```

### Sub-component props (all `forwardRef`)

```ts
export interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Show the built-in × close button on the right edge. Default true. */
  closeButton?: boolean;
}

export interface ModalBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** Override body's padding. Default 'default' (--space-4). 'none' for edge-to-edge content. */
  padding?: 'default' | 'none';
}

export interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Horizontal action alignment. Default 'end'. */
  align?: 'start' | 'end' | 'space-between';
}

export interface ModalCloseProps {
  /**
   * Single clickable child. Click anywhere on it triggers onOpenChange(false).
   * Uses cloneElement to chain the existing onClick (matches Popover.Close pattern).
   */
  children: ReactElement;
}
```

### Exports

From `packages/design-system/src/components/Modal/index.ts`:

```ts
export { Modal } from './Modal';
export type {
  ModalProps,
  ModalSize,
  ModalHeaderProps,
  ModalBodyProps,
  ModalFooterProps,
  ModalCloseProps,
} from './Modal';
```

From the library root `src/index.ts`:

```ts
export { Modal } from './components/Modal';
export type {
  ModalProps,
  ModalSize,
  ModalHeaderProps,
  ModalBodyProps,
  ModalFooterProps,
  ModalCloseProps,
} from './components/Modal';
```

### Canonical usage

```tsx
const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Edit contact</Button>

<Modal open={open} onOpenChange={setOpen} size="md">
  <Modal.Header>Edit contact</Modal.Header>
  <Modal.Body>
    <Stack gap="md">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
    </Stack>
  </Modal.Body>
  <Modal.Footer>
    <Modal.Close><Button variant="secondary">Cancel</Button></Modal.Close>
    <Button onClick={save}>Save</Button>
  </Modal.Footer>
</Modal>
```

### Forced-step variant

```tsx
<Modal
  open
  onOpenChange={() => {}}
  size="sm"
  disableEscapeClose
  dismissOnOverlayClick={false}
  aria-label="Session expired"
>
  <Modal.Header closeButton={false}>Session expired</Modal.Header>
  <Modal.Body>Please sign in again to continue.</Modal.Body>
  <Modal.Footer>
    <Button onClick={reauth}>Sign in</Button>
  </Modal.Footer>
</Modal>
```

### Stacked usage (Edit → Confirm Delete)

```tsx
const [editOpen, setEditOpen] = useState(false);
const [confirmOpen, setConfirmOpen] = useState(false);

<Modal open={editOpen} onOpenChange={setEditOpen} size="md">
  <Modal.Header>Edit contact</Modal.Header>
  <Modal.Body>{/* form */}</Modal.Body>
  <Modal.Footer align="space-between">
    <Button variant="danger" onClick={() => setConfirmOpen(true)}>Delete</Button>
    <Cluster gap="sm">
      <Modal.Close><Button variant="secondary">Cancel</Button></Modal.Close>
      <Button onClick={save}>Save</Button>
    </Cluster>
  </Modal.Footer>
</Modal>

<Modal open={confirmOpen} onOpenChange={setConfirmOpen} size="sm">
  <Modal.Header>Delete contact?</Modal.Header>
  <Modal.Body>This cannot be undone.</Modal.Body>
  <Modal.Footer>
    <Modal.Close><Button variant="secondary">Cancel</Button></Modal.Close>
    <Button variant="danger" onClick={confirmDelete}>Delete</Button>
  </Modal.Footer>
</Modal>
```

Both modals are open simultaneously. Confirm modal's overlay paints over the Edit modal. Esc closes Confirm only; Edit remains open. Body scroll stays locked.

## Rendering pipeline

### DOM structure (when open)

```
[react-dom portal → document.body]
  <div
    class="overlay"
    data-state="open|closed"
    style={{ '--modal-depth': depth }}    ← CSS reads depth via calc(var(--z-modal) + ...)
    onClick={handleOverlayClick}    ← dispatches only when e.target === e.currentTarget
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId ?? undefined}
      aria-label={!headingId ? props['aria-label'] : undefined}
      aria-describedby={props['aria-describedby']}
      tabIndex={-1}
      data-state="open|closed"
      data-size={size}
      class="content content-{size}"
      style={{ ...props.style }}
      ref={contentRef}
    >
      {children}
    </div>
  </div>
```

Overlay and content are sibling stacking layers within the portal. The content is positioned inside the overlay region via flex (overlay = `display: flex; align-items: center; justify-content: center`), not absolutely positioned, so click events on the overlay area resolve to the overlay element (not the content) and `e.target === e.currentTarget` cleanly detects backdrop clicks.

### Mount / unmount flow

**Open transition (`open: false → true`):**

1. `useModalStack.register(modalId)` — returns depth index. First modal: 0. Nested: 1, 2, etc.
2. `useScrollLock.acquire()` — ref-counted; on first acquire, sets `body { overflow: hidden; padding-right: <scrollbar-width>px }` to lock scroll without layout shift.
3. `previouslyFocused = document.activeElement` captured before portal mounts.
4. Portal mounts overlay + content.
5. `useLayoutEffect`: if `initialFocusRef.current` is set, call `.focus({ preventScroll: true })` on it. Otherwise focus the dialog container (which has `tabIndex={-1}`). If the ref points to a non-focusable element, the browser's `.focus()` no-ops; the subsequent focus-trap `focusin` recapture will then route focus back to the container.
6. `useFocusTrap(contentRef)` attaches `keydown` (Tab cycling) + `focusin` (escape recapture) listeners.
7. Animations: overlay fades via `@starting-style { opacity: 0 }`. Content scales in via `@starting-style { opacity: 0; transform: translateY(8px) scale(0.96) }`.
8. `inert` attribute applied to all `document.body.children` EXCEPT the portal root (for AT background suppression + extra focus-trap insurance).

**Close transition (`open: true → false`):**

1. `data-state="closed"` set before unmount to play exit animation (matches Popover convention).
2. After `--transition-base` (animationend listener), portal unmounts.
3. Focus restores via `previouslyFocused.focus({ preventScroll: true })` if element is still in the DOM. Otherwise focus falls through to `document.body`.
4. `useScrollLock.release()` — when refcount drops to 0, restore `body { overflow }` + remove the scrollbar-gutter padding.
5. `useModalStack.unregister(modalId)` — depth indexes of remaining open modals compact down.
6. `inert` removed from `body.children` if no modals remain.

### Stacking math

`useModalStack` is a module-level singleton (a `Set<string> + ordered array`). Each Modal calls `register(id)` and gets back its depth.

**Display model — only the topmost modal is visible.** When two modals are open, the outer one is hidden via `display: none` while the inner is on top. React state of the hidden modal is preserved (controlled inputs keep their values, refs stay populated). When the inner closes, the outer's `isTop` flips back to `true` and it re-appears instantly. The user sees one overlay at a time, never stacked dimming layers.

Implementation:

- `<Overlay>` reads `ctx.isTop` and writes `data-stack-position={isTop ? 'top' : 'hidden'}` on the portal root.
- SCSS: `.overlay[data-stack-position='hidden'] { display: none; }` hides both the overlay and its `<Content>` child (the content is rendered inside the overlay element).
- Z-index stays simple because at most one overlay is `display: block` at a time. We still emit `--modal-depth` for any future decoration that wants to read it, but the `calc()` collapses to a no-op for a single visible layer.

Re-show after popping is **instant** (no fade-in). `display: none → display: flex` is not transitionable; making it animatable would require `visibility + opacity` instead, which is fine but adds machinery we don't need yet.

Escape listener on each modal checks `if (!stack.isTop(id)) return;` so only the topmost modal handles Esc. Overlay-click dismissal: same guard via `data-stack-position='hidden'` making the lower overlays non-interactive (zero hit area).

Scroll lock is acquired ONCE across the stack (refcount stays >= 1 while any modal is open).

### Focus trap

`useFocusTrap(contentRef)`:

- Queries focusable descendants on each `keydown` invocation (no caching — DOM may have changed):
  ```
  button:not([disabled]),
  [href],
  input:not([disabled]),
  select:not([disabled]),
  textarea:not([disabled]),
  [tabindex]:not([tabindex="-1"])
  ```
- `Tab` from last focusable → first; `Shift+Tab` from first → last.
- `focusin` document-level listener: if focus moves to an element NOT inside `contentRef.current` AND this modal is top of stack, redirect to dialog container.
- Returns cleanup that removes both listeners on unmount.

For stacked modals, only the topmost has an ACTIVE trap. Inner modals' traps remain mounted but the `focusin` handler checks `stack.isTop(id)` and no-ops if false.

Edge case: zero focusables in the modal (rare — a Modal.Header with `closeButton: false` + read-only Body + empty Footer). The dialog container itself is `tabIndex=-1`, so focus stays on it; Tab does nothing.

### Animation

```scss
.overlay {
  background: var(--color-bg-overlay);
  opacity: 1;
  transition: opacity var(--transition-base);

  @starting-style { opacity: 0; }
}

/* Blur variant — opt-in via overlay="blur". Light tinted background +
   backdrop-filter for a frosted-glass effect. -webkit prefix for Safari. */
.overlay[data-variant='blur'] {
  background: var(--color-bg-overlay-blur);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.content {
  opacity: 1;
  transform: translateY(0) scale(1);
  transition:
    opacity var(--transition-base),
    transform var(--transition-base);

  @starting-style {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
}

.overlay[data-state='closed'] { opacity: 0; }
.content[data-state='closed'] {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}
```

### Mobile fullscreen

```scss
@media (max-width: 640px) {
  .content {
    width: 100vw;
    height: 100vh;
    max-width: 100vw;
    max-height: 100vh;
    border-radius: 0;
  }
}
```

Header + Body + Footer remain a flex column inside; Body fills the gap and scrolls. Overlay still painted (preserves click-to-dismiss consistency even though it's largely hidden behind the fullscreen content).

## Accessibility

### ARIA contract

| Element | Attributes |
|---|---|
| Overlay | (no role — clickable backdrop only) |
| Content | `role="dialog"`, `aria-modal="true"`, `tabIndex={-1}`, plus EITHER `aria-labelledby={headingId}` (Header rendered) OR `aria-label={prop}` (no Header), plus optional `aria-describedby` |
| Header inner `<h2>` | Auto-assigned id via `useId()` + `sanitizeId`; stored in context, consumed by Content for `aria-labelledby` |
| Header × button | `aria-label="Close dialog"` |
| Body | Plain `<div>`; if `aria-describedby` matches a child id, consumer wires it themselves |
| Footer | `<div role="group">` so AT announces the action set as a group |
| Modal.Close wrapper | No ARIA — cloned child's native semantics carry the contract |

**Dev warning:** if neither `aria-labelledby` (Header rendered) nor `aria-label` is set, console.warn in development only. Same precedent as Popover.

### Keyboard

| Key | Action |
|---|---|
| Tab | Cycle focus forward within modal; from last focusable wraps to first |
| Shift+Tab | Cycle focus backward; from first wraps to last |
| Escape | Close the **topmost** modal only; ignored when `disableEscapeClose: true` |
| Enter / Space | Native — activates focused control |

Auto-focus on open:
1. `initialFocusRef.current` if provided and focusable
2. Else the dialog container (`tabIndex=-1`)

Focus restore on close: `previouslyFocused.focus({ preventScroll: true })` if still in the document; otherwise falls through to `document.body`.

### Reduced motion

```scss
@media (prefers-reduced-motion: reduce) {
  .overlay,
  .content {
    transition: none;
    @starting-style { opacity: 1; transform: none; }
  }
}
```

Open/close becomes instantaneous. Eliminates motion-related discomfort.

### Inert background

When any modal is open, set `inert` attribute on every direct child of `<body>` EXCEPT the portal root. This:

- Hides background content from AT cursor navigation
- Blocks all focus into background (belt-and-suspenders with the focus trap)
- Disables pointer events on background

Removed on last modal close. No polyfill — modern browsers only (the project's support range allows native `inert`).

## Testing strategy

### `useFocusTrap.test.ts` (pure hook)

- Tab from last focusable → first
- Shift+Tab from first → last
- Programmatic focus escape outside the container → redirected back
- Cleanup on unmount removes listeners
- Zero focusables → focus stays on container, Tab no-ops
- Stack-aware: when not top of stack, focusin doesn't redirect

### `useScrollLock.test.ts` (pure hook)

- First `acquire()` sets `body.style.overflow = 'hidden'` + scrollbar-gutter padding
- Second `acquire()` increments refcount; body style unchanged
- `release()` decrements; only when count = 0 restores original `overflow` + removes padding
- Captures original `overflow` value pre-lock (so non-default values are restored, not blanked)

### `useModalStack.test.ts` (pure hook)

- `register()` returns 0 for first, 1 for second
- `unregister()` compacts indexes — closing modal #0 with #1 still open → #1 becomes index 0
- `isTop(id)` reflects most-recently-registered open modal
- `topDepth()` returns current stack height (number of open modals)
- Cleanup on unmount calls `unregister` exactly once

### `Modal.test.tsx` (integration via React Testing Library)

- Renders only when `open={true}`; nothing in DOM when `open={false}`
- `aria-labelledby` set when Header rendered; falls back to `aria-label` prop when Header omitted
- Dev warning when neither labelledby nor aria-label set
- Escape fires `onOpenChange(false)` by default; ignored when `disableEscapeClose: true`
- Overlay click fires `onOpenChange(false)` by default; ignored when `dismissOnOverlayClick: false`
- Overlay click on content (not the overlay edge) does NOT fire close (e.target === currentTarget guard)
- `Modal.Close` click fires `onOpenChange(false)`
- `initialFocusRef` focused on open; else dialog container has focus
- Focus restores to previously-focused element on close
- `Modal.Header closeButton={false}` doesn't render the X
- `data-size` reflects `size` prop
- Body scroll lock applied while open; released on close
- Stacked modals: Esc only closes topmost; nested z-index higher
- Forced-step combo: `open + disableEscapeClose + dismissOnOverlayClick=false + no Modal.Close` → modal cannot be dismissed via the four normal paths (test asserts onOpenChange is NOT called)
- Ref forwarding to content div
- `className` merged with internal classes
- `style` passed through to content div
- Footer `align` prop applies the right CSS class (test by checking data attr or computed style)

### Manual / playground smoke tests

- Focus-trap with screen reader (manual)
- Mobile fullscreen breakpoint (resize browser)
- Reduced-motion via DevTools

## Hard-rule compliance checklist

Per root `CLAUDE.md`:

1. `Modal.test.tsx`, `useFocusTrap.test.ts`, `useScrollLock.test.ts`, `useModalStack.test.ts` colocated with source
2. `ModalDemo.tsx` added to `packages/playground/src/pages/components/` showing: basic, three sizes, forced step, stacked, header-without-close, custom initial focus
3. Demo wired into `App.tsx` (route), `AppShell.tsx` (sidebar — Display or Navigation group), `ComponentsIndex.tsx` (tile). `mockups/registry.ts` updated if any mockup uses it (none in v1).
4. `Modal` re-exported from `packages/design-system/src/index.ts` with all sub-component prop types
5. JSDoc with `@example` blocks + `@remarks When NOT to use` + `@remarks Anti-patterns` on the `Modal` root and on each prop in `ModalProps`. AGENTS.md TL;DR section added.
6. Pre-push review-fix cycle (Hard rule 8) before push
