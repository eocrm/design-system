# Tooltip — design

**Status:** approved, ready for plan
**Author:** dpws + Claude
**Date:** 2026-05-19
**Scope:** new component `packages/design-system/src/components/Tooltip/`

## Goal

Ship a `<Tooltip>` that wraps a single trigger element and renders a small floating label on hover or keyboard focus, with a directional arrow pointing at the trigger and a short scale-fade entrance. Hand-rolled on `@floating-ui/react-dom` per the wishlist note in `packages/design-system/CLAUDE.md` ("hand-roll on Floating UI; lightweight, no focus trap").

## Non-goals

- **No close animation.** Same posture as DropdownMenu — Tooltip unmounts on close.
- **No `TooltipProvider`.** Skip-delay coordination across instances is deferred until a real toolbar in the CRM proves the need. The wrapper API is forward-compatible: a provider can be layered in later without changing `<Tooltip>`'s prop surface.
- **No hoverable content.** Moving the pointer into the tooltip body does not keep it open. If a future use case wants hoverable content, that is Popover (separate wishlist item), not Tooltip.
- **No compound API.** `<Tooltip>` is a single component that takes `content` as a prop. Compound (`<Tooltip.Trigger>` / `<Tooltip.Content>`) was considered for consistency with DropdownMenu and rejected — DropdownMenu's compound earns its weight because the content is a structured list; Tooltip's content is a single payload.
- **No `arrow` prop.** Arrow is always on. If you want a chromeless floating panel without an arrow, you want Popover.
- **No tap-to-open on touch.** Tooltips are progressive enhancement for pointer + keyboard users.
- **No exit timer / `delayClose` / `disableHoverableContent`.** Out of v1; revisit when a consumer asks.

## Public API

```tsx
import { Tooltip } from '@eocrm/design-system';

// Canonical use:
<Tooltip content="Save the record (⌘S)">
  <Button onClick={save}>Save</Button>
</Tooltip>

// Icon-only trigger (trigger must have its own aria-label):
<Tooltip content="Filter">
  <Button variant="ghost" aria-label="Filter">⏷</Button>
</Tooltip>

// Rich content:
<Tooltip content={<>Save&nbsp;<kbd>⌘S</kbd></>}>
  <Button>Save</Button>
</Tooltip>

// Configurable:
<Tooltip content="Edit" side="right" align="center" delay={200} sideOffset={8}>
  <Button variant="ghost" aria-label="Edit">✎</Button>
</Tooltip>
```

### Props

| Prop           | Type                                         | Default      | Notes                                                                                                                                  |
| -------------- | -------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `content`      | `ReactNode`                                  | — (required) | Tooltip body. If `null` / `undefined` / `""` → trigger renders as-is; no listeners, no `aria-describedby`. Useful for conditional UIs. |
| `children`     | `ReactElement`                               | — (required) | Exactly one element that accepts a ref. Same contract as `<DropdownMenu.Trigger>`.                                                     |
| `side`         | `'top' \| 'right' \| 'bottom' \| 'left'`     | `'top'`      | Preferred placement; Floating UI's `flip()` auto-corrects on collision.                                                                |
| `align`        | `'start' \| 'center' \| 'end'`               | `'center'`   | Edge alignment.                                                                                                                        |
| `sideOffset`   | `number`                                     | `6`          | Gap in px between trigger and tooltip. Slightly larger than DropdownMenu's 4 to fit the arrow.                                         |
| `delay`        | `number`                                     | `400`        | ms before hover-in opens. Focus-in is always immediate. Close is always immediate.                                                     |
| `open`         | `boolean`                                    | —            | Optional controlled open. Pair with `onOpenChange`.                                                                                    |
| `onOpenChange` | `(open: boolean) => void`                    | —            | Required when `open` is provided.                                                                                                      |
| `defaultOpen`  | `boolean`                                    | `false`      | Uncontrolled initial state. Mostly for tests / Storybook-style demos.                                                                  |

Exported types: `TooltipProps`, `TooltipSide`, `TooltipAlign`.

## Accessibility

### ARIA wiring

- Tooltip panel renders with `role="tooltip"` and a stable internal id (`tooltip-<reactId>` via `useId` + the existing `sanitizeId` helper).
- While open, the trigger element receives `aria-describedby="<tooltip-id>"` — **merged** with any consumer-supplied value, space-separated, consumer value first.
- While closed, the trigger's `aria-describedby` reverts to whatever the consumer provided (or is absent).
- The trigger must already have its own accessible name (visible text or `aria-label`). Tooltip is supplementary description, never the label. This is documented as a hard rule in JSDoc `@remarks`.

**Why `describedby`, not `labelledby`:** screen readers append described-by text after the trigger's own name. With `labelledby`, the tooltip would *replace* the label, so an icon button's `aria-label` would be discarded. `describedby` composes; `labelledby` overwrites.

### Open / close triggers

| Event on trigger              | Behavior                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `pointerenter` (mouse)        | Start `delay` (default 400 ms) → open.                                                         |
| `pointerleave` (mouse)        | Cancel any pending open OR close immediately if already open.                                  |
| `focus` (`:focus-visible`)    | Open immediately, no delay. Keyboard users should not wait.                                    |
| `blur`                        | Close immediately.                                                                             |
| `pointerdown` (anywhere)      | Close immediately. A click that mutates UI should not leave a tooltip hanging over the result. |
| `Escape` (anywhere while open) | Close immediately. Tooltip never had focus, so dismissal is silent w.r.t. focus.               |

### `:focus-visible` detection

Only open on focus when `triggerEl.matches(':focus-visible')`. Without this, a mouse click (which focuses the button) would race the click handler and feel laggy.

jsdom does not implement `:focus-visible`. The component treats a missing/undefined `matches` result as "open." Tests stub `Element.prototype.matches` for the `:focus-visible` selector to exercise production behavior.

### Touch devices

No special handling. Tap does not open. The trigger's existing accessible name (visible text or `aria-label`) is what touch users get. Documented anti-pattern: **"Don't put information only in a tooltip."**

### Disabled triggers

`<button disabled>` does not fire `pointerenter` / `focus` in any browser, so tooltips will not appear. Documented in JSDoc:

> If you need a tooltip explaining *why* a button is disabled, render the button as enabled with `aria-disabled="true"` and intercept its click — or wrap the disabled control in a `<span>` and pass the span as the Tooltip child.

### Multiple tooltips

Each `<Tooltip>` instance manages its own timers and state. Moving from one trigger to another closes the first (via `pointerleave`) and starts the second's delay. The "skip delay across instances" UX is deferred to a future `TooltipProvider`.

## Positioning

```ts
useFloating({
  open,
  placement, // computed from side + align (same shape as DropdownMenu.Content)
  transform: false, // CSS transform reserved for the entrance animation
  middleware: [
    offset(sideOffset),            // default 6
    flip(),                        // auto side-flip on collision
    shift({ padding: 8 }),         // 8px viewport edge padding
    arrow({ element: arrowRef }),  // populates middlewareData.arrow.{x, y}
  ],
  whileElementsMounted: autoUpdate,
  elements: { reference: triggerRef.current },
});
```

`transform: false` is deliberate — same as DropdownMenu. Floating UI writes `top` / `left` instead of `transform: translate`, leaving the CSS `transform` property free for the scale-fade entrance.

**No `size` middleware.** Tooltips don't need height clamping. If you'd reach for a scrollable tooltip, you want Popover.

### Arrow

- Single `<span aria-hidden="true">` inside `.content`.
- Floating UI populates `middlewareData.arrow.{x, y}`. The arrow gets inline `left` / `top` for the cross-axis position; the panel-side anchoring (the "press the arrow against the edge facing the trigger") is done in SCSS via `[data-side]`.
- A `staticSide` is derived from `resolvedPlacement.split('-')[0]` via the opposite map (`top → bottom`, `bottom → top`, `left → right`, `right → left`).
- Visual: 8×8 square, rotated 45°, half-overlapping the panel so the half inside the panel visually fuses with the panel chrome. Background = panel background. The exact rendering recipe (CSS `clip-path` vs. rotated `<span>` with synthetic borders via `box-shadow` vs. inline SVG) is left to implementation — all three work; the choice will be made when wiring against real chrome and verified in the playground demo.

### Z-index — new token

Add to `src/styles/tokens.scss`:

```scss
--z-tooltip: 1300; // above modal and toast — tooltips inside any layer must remain visible
```

Existing layer tokens (verified):

```scss
--z-dropdown: 1000;
--z-modal:    1100;
--z-toast:    1200;
--z-tooltip:  1300; // new
```

**Rationale for going *above* toast:** a tooltip inside a Modal must still be visible above the modal backdrop. Since tooltips portal to `document.body` (sibling to the modal portal in the DOM), the only way to keep them above any host UI is a strictly higher z. Toast at 1200 stays above modal; tooltip at 1300 stays above all. Stale tooltips lingering over a newly-opened modal are mitigated by the `pointerdown`-closes-tooltip rule.

This **revises** the design discussion's earlier "below `--z-modal`" framing — the revised value reflects what was discovered when reading the existing token file.

## Animation

Reuses DropdownMenu's `@starting-style` scale-fade, scaled down for the smaller surface.

```scss
.content {
  /* ...chrome (background, border, radius, shadow, padding) — see below... */
  transform: none;
  transition:
    opacity var(--transition-base),    /* 140ms */
    transform var(--transition-base);

  @starting-style {
    opacity: var(--opacity-hidden);
  }
}

.content[data-side='top']    { transform-origin: bottom center; @starting-style { transform: scale(0.92) translateY(2px); } }
.content[data-side='bottom'] { transform-origin: top center;    @starting-style { transform: scale(0.92) translateY(-2px); } }
.content[data-side='right']  { transform-origin: left center;   @starting-style { transform: scale(0.92) translateX(-2px); } }
.content[data-side='left']   { transform-origin: right center;  @starting-style { transform: scale(0.92) translateX(2px); } }

@media (prefers-reduced-motion: reduce) {
  .content { transition: none; }
}
```

Differences from DropdownMenu's animation:

- `scale(0.92)` instead of `0.96` — more visible on a tooltip-sized surface.
- `2px` translate instead of `4px` — proportional to the smaller payload.
- Same `--transition-base` duration (140 ms) for cross-component consistency.

No close animation. Same rationale as DropdownMenu: "get out of the way" beats "play a transition."

## Internal structure

```tsx
export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  sideOffset = 6,
  delay = 400,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: TooltipProps) {
  if (!isValidElement(children)) {
    throw new Error('<Tooltip> requires exactly one React element child.');
  }

  // Controlled / uncontrolled — same shape as DropdownMenuRoot.
  const isControlled = controlledOpen !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = isControlled ? (controlledOpen as boolean) : uncontrolled;
  const setOpen = useCallback((next: boolean) => {
    onOpenChange?.(next);
    if (!isControlled) setUncontrolled(next);
  }, [isControlled, onOpenChange]);

  // Refs.
  const triggerRef = useRef<HTMLElement | null>(null);
  const arrowRef = useRef<HTMLSpanElement | null>(null);
  const tooltipId = `tooltip-${sanitizeId(useId())}`;

  // Pending-open timer.
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cleared on every close, on every cancel, and on unmount.

  // Floating UI — only used while open (matches DropdownMenu).
  const { refs, floatingStyles, placement: resolvedPlacement, middlewareData } = useFloating({
    open,
    placement: align === 'center' ? side : `${side}-${align}`,
    transform: false,
    middleware: [offset(sideOffset), flip(), shift({ padding: 8 }), arrow({ element: arrowRef })],
    whileElementsMounted: autoUpdate,
    elements: { reference: triggerRef.current },
  });

  // Document-level Escape listener while open.
  // Document-level pointerdown listener while open (close on any click).

  // Empty-content escape hatch: clone child with merged ref only, no handlers, no aria.
  if (content == null || content === '') {
    return cloneElement(children, { ref: mergeRefs(triggerRef, (children.props as { ref?: Ref<HTMLElement> }).ref) });
  }

  const trigger = cloneElement(children, {
    ref: mergeRefs(triggerRef, childProps.ref),
    'aria-describedby': open
      ? mergeAriaDescribedby(childProps['aria-describedby'], tooltipId)
      : childProps['aria-describedby'],
    onPointerEnter: chain(childProps.onPointerEnter, handlePointerEnter),
    onPointerLeave: chain(childProps.onPointerLeave, handlePointerLeave),
    onFocus: chain(childProps.onFocus, handleFocus),
    onBlur: chain(childProps.onBlur, handleBlur),
  });

  return (
    <>
      {trigger}
      {open && createPortal(
        <div
          ref={refs.setFloating}
          id={tooltipId}
          role="tooltip"
          data-side={resolvedSide}
          style={floatingStyles}
          className={styles.content}
        >
          {content}
          <span
            ref={arrowRef}
            aria-hidden="true"
            className={styles.arrow}
            style={{ left: middlewareData.arrow?.x, top: middlewareData.arrow?.y }}
          />
        </div>,
        document.body,
      )}
    </>
  );
}
```

### Shared helpers — promote out of DropdownMenu

DropdownMenu's `src/components/DropdownMenu/utils.ts` exports `mergeRefs`, `chain`, and `sanitizeId` — three generic helpers Tooltip will need verbatim, and which Popover / Select on the wishlist will need too.

**Promote them to a shared internal location**: `src/components/_internal/refs.ts` (or similar). Update DropdownMenu imports. Tooltip imports from the same location. Add a new helper next to them:

```ts
/** Merge a consumer-supplied aria-describedby with the tooltip's id, deduping. */
export function mergeAriaDescribedby(consumer: string | undefined, tooltipId: string): string {
  if (!consumer) return tooltipId;
  const tokens = consumer.split(/\s+/).filter(Boolean);
  if (tokens.includes(tooltipId)) return consumer;
  return [...tokens, tooltipId].join(' ');
}
```

**Hard constraint:** the move must be source-only. DropdownMenu's existing 100+ tests must pass with zero behavioral changes. The shared file is included in the published tarball (`npm pack --dry-run` must show it).

## File layout

```
packages/design-system/src/components/Tooltip/
  Tooltip.tsx              ← single public component, full JSDoc per rule 7
  Tooltip.module.scss      ← chrome + arrow + per-side @starting-style
  Tooltip.test.tsx         ← unit tests (see Tests section)
  index.ts                 ← export { Tooltip } + export type { TooltipProps, TooltipSide, TooltipAlign }
```

Plus:

- `packages/design-system/src/components/_internal/refs.ts` — new shared helpers file (created from the move).
- `packages/design-system/src/components/DropdownMenu/utils.ts` — deleted; imports updated to the shared file. (Or: `utils.ts` re-exports from the shared file for one release — judgment call during implementation; the simpler option is delete + update all imports.)
- `packages/design-system/src/index.ts` — re-export `Tooltip` + types.
- `packages/design-system/src/styles/tokens.scss` — add `--z-tooltip: 1300;`.
- `packages/design-system/AGENTS.md` — new TL;DR section after DropdownMenu's, plus an anti-patterns table row for `<Tooltip><Button disabled>…</Button></Tooltip>`.
- `packages/playground/src/pages/components/TooltipDemo.tsx` — playground demo (see Playground section).
- `packages/playground/src/App.tsx` — route entry.
- `packages/playground/src/layout/AppShell/AppShell.tsx` — sidebar nav entry (Overlays group, alongside DropdownMenu).
- `packages/playground/src/pages/components/ComponentsIndex.tsx` — overview-grid card with a live preview.
- `packages/playground/src/pages/mockups/registry.ts` — extend the `ComponentName` union to include `'Tooltip'` (no mockup uses it yet; just keeps the union ready).

## Tests

`Tooltip.test.tsx`. Uses Vitest globals + Testing Library + `userEvent`. Mirrors DropdownMenu's coverage style.

### Rendering basics

1. Renders the trigger as-is when no interaction has occurred; tooltip not in DOM.
2. `content={null}` / `content=""` / `content={undefined}` — trigger renders with **no** pointer / focus / blur listeners and **no** `aria-describedby`. Asserted by inspecting the rendered DOM, not by simulating interaction.
3. Throws a clear error when `children` is not a single valid React element (`null`, a fragment, a string, multiple children).
4. `className`-style consumer props on the trigger child are preserved (merge, not replace).
5. Forwards a consumer-supplied `ref` on the child alongside the internal `triggerRef` (both receive the node).

### Hover open / close

6. `pointerenter` starts the delay; tooltip is **not** in the DOM during the delay window.
7. After `delay` ms (fake timers — `vi.useFakeTimers()` + `vi.advanceTimersByTime`), the tooltip appears with `role="tooltip"` and the configured `content` as accessible text.
8. `pointerleave` before the delay elapses cancels the open (tooltip never appears).
9. `pointerleave` after open closes the tooltip immediately (no exit delay).
10. `pointerdown` on the trigger closes an open tooltip.

### Focus open / close

11. Keyboard focus (`userEvent.tab()`) opens the tooltip immediately, no delay.
12. `userEvent.click()` on the trigger (which also focuses it) does **not** open the tooltip via the focus path. The test stubs `Element.prototype.matches(':focus-visible')` to return `false` to exercise production behavior (jsdom lacks `:focus-visible`).
13. `blur` closes an open tooltip.

### Escape & dismissal

14. `Escape` (dispatched anywhere on the document) closes an open tooltip.
15. After `Escape`, focus stays where it was — tooltip never owned focus.

### ARIA wiring

16. While open, the trigger gets `aria-describedby="<tooltip-id>"` matching the tooltip panel's `id`.
17. While closed, the trigger does **not** have `aria-describedby` set (unless the consumer supplied one).
18. A consumer-supplied `aria-describedby` is preserved and merged (space-separated, consumer value first), then de-merged on close.
19. The tooltip panel has `role="tooltip"` and its `id` matches the trigger's `aria-describedby`.

### Positioning & arrow

20. `data-side` on the panel reflects the resolved side (`'top'` by default, `'bottom'` when `side='bottom'` is passed). Floating UI's `flip()` is trusted — viewport collision is not exercised in jsdom (no real layout).
21. The arrow element is rendered with `aria-hidden="true"` and a class hook for SCSS styling.

### Controlled mode

22. `open` + `onOpenChange` round-trips: hovering fires `onOpenChange(true)` after delay; forcing `open={true}` renders the panel without hover; the close paths fire `onOpenChange(false)`.
23. `defaultOpen={true}` renders the tooltip on initial mount.

### Cleanup

24. Unmounting while a delay timer is pending does not throw — timer is cleared in unmount cleanup.
25. Unmounting while open does not leak the document-level Escape or pointerdown listeners — asserted by spying on `document.removeEventListener` calls.

### Animation parity

26. The compiled `.content` rule contains an `@starting-style` block. Same CSSOM-traversal pattern Tabs and DropdownMenu use. Cheap insurance against a future refactor silently dropping the entrance animation.

### Meta-tests

27. `src/structure.test.ts` (the existing meta-test) automatically picks up new components via the folder convention. Verify it passes; no new meta-test needed.

### Out of scope for unit tests

- Real positioning math (Floating UI's job; exercised visually in the playground demo).
- Skip-delay-across-instances (no `TooltipProvider` in v1).
- Touch behavior (tap doesn't open by design).
- Hoverable content (not a feature).

## Playground

`packages/playground/src/pages/components/TooltipDemo.tsx` covers:

- **Side / align grid** — eight buttons in a centered layout, each with a tooltip on a different (`side`, `align`) combination, so flips and the arrow are visible.
- **Long content / wrapping** — verify a long string wraps within a sensible max-width without breaking the arrow.
- **Rich content** — a `<kbd>` chord (e.g. "Save&nbsp;<kbd>⌘S</kbd>"), to demonstrate `content: ReactNode`.
- **Icon-only trigger** — a ghost-variant button with `aria-label="Filter"` and a tooltip "Filter results". Demonstrates the supplementary-description pattern.
- **Tooltip on a DropdownMenu item** — verifies z-index ordering (tooltip > dropdown).
- **Controlled `open`** — a toggle that drives `open` externally, for the rare case the consumer wants imperative control.
- **Code source display** — same `?raw` pattern the existing demos use (the `@lib-source/*` alias).

The demo is the integration test for positioning and arrow rendering; Floating UI's flip / shift only manifest at real-layout time, not in jsdom.

## Docs

### JSDoc on `Tooltip` (rule 7)

One-paragraph description, 2–3 `@example` blocks (canonical case, icon-only with `aria-label`, controlled mode), `@remarks When NOT to use` (e.g. "for click-to-open content → Popover", "for selection lists → Select"), `@remarks Anti-patterns` (e.g. "Tooltip on a `<Button disabled>`"), every prop's default annotated.

### `AGENTS.md`

Add a new TL;DR section after the DropdownMenu section. Shape mirrors the other components:

- Canonical snippet (the wrapper-API example).
- Props summary (`content`, `side`, `align`, `sideOffset`, `delay`, controlled-open trio).
- A short "When NOT to use" paragraph.
- Anti-patterns table rows:
  - `<Tooltip><Button disabled>…</Button></Tooltip>` → use `aria-disabled` or a `<span>` wrapper.
  - Putting essential info only in a tooltip → make it visible or use the trigger's `aria-label`.

## Risks & mitigations

- **`:focus-visible` not in jsdom.** Mitigated by stubbing `Element.prototype.matches` in the relevant test (#12).
- **`@starting-style` stylelint allowlist.** Already resolved during the DropdownMenu animation work — the rule is on the project's allowlist. Verify in CI via `npm run lint:css`.
- **Floating UI `transform: false` mode.** Same behavior contract as DropdownMenu; no new risk.
- **Helper-move regression in DropdownMenu.** Mitigated by re-running the full DropdownMenu test suite after the move; expected to pass with zero behavioral changes.
- **Rapid open/close.** Each open re-mounts the panel, so `@starting-style` re-fires every time. No animation queue, no half-closed state — same robustness as DropdownMenu's entrance.
- **Tooltip on a non-focusable child** (e.g. `<Tooltip><div /></Tooltip>`). Hover still works, but keyboard users see nothing. Documented as anti-pattern in AGENTS.md; not enforced in code.
- **Consumer passes their own `onPointerEnter` / `onFocus` and expects them to run first/last.** Handlers are *chained* (consumer's runs before the tooltip's). Consumer can `e.preventDefault()` to short-circuit if needed — same pattern as DropdownMenu's Trigger.

## Acceptance

- `make test` green: existing suite (including DropdownMenu) + new Tooltip tests.
- `make typecheck`, `make lint`, `make build` green.
- `npm pack --dry-run -w @eocrm/design-system` shows `Tooltip/` and `_internal/` paths, no test files.
- Visual in `make up`:
  - Hovering any demo button opens its tooltip after ~400 ms with the scale-fade + arrow pointing at the trigger.
  - Keyboard `Tab` to any trigger opens its tooltip immediately, no delay.
  - `Escape` closes any open tooltip.
  - Clicking the trigger closes the tooltip and runs the trigger's own handler.
  - Pointer-leave closes the tooltip immediately.
  - DevTools → "Emulate prefers-reduced-motion: reduce" → tooltips appear instantly with no transform / fade.
- Hard Rule 8 pre-push review-fix loop completes with verdict `clean enough to stop`.

## Open decisions deferred to implementation

- Exact arrow rendering recipe (`clip-path` vs. rotated `<span>` with synthetic borders vs. inline SVG). All three are viable; the choice is made when wiring against the real chrome and verified visually.
- Whether the deleted DropdownMenu `utils.ts` is removed outright or kept as a one-release re-export shim. Default plan: remove outright and update all imports — there are no external consumers of `DropdownMenu/utils.ts`.
