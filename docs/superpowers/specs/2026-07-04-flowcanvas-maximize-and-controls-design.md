# FlowCanvas — in-page maximize + custom controls slot

**Date:** 2026-07-04
**Component:** `packages/design-system/src/components/FlowCanvas/`
**Status:** Approved design, ready for planning
**Builds on:** `2026-07-02-flowcanvas-design.md` (original component)

## Summary

Extend `FlowCanvas` with two additive capabilities:

1. **In-page maximize** — a toggle that expands the canvas to fill the viewport (browser chrome stays visible), and a way to exit back to inline size.
2. **Custom controls slot** — a `controls` render slot (top-left) where the consumer renders their own DS `<Button>`s. "Add node" is the motivating example; the slot is generic ("or something else").

Both are purely additive. The events-only architecture (parent owns the graph; canvas fires intent callbacks) is untouched. No breaking changes.

### Decisions locked during brainstorming

- **Controls model:** generic slot, not built-in buttons. The consumer owns the actions and wires them to their own state.
- **Controls API shape:** a **render slot** (`controls?: ReactNode`), not a declarative `actions[]` array. Maximum flexibility; the consumer puts DS Buttons/menus inside.
- **Fullscreen mechanism:** **in-page maximize**, NOT native `element.requestFullscreen()`. Native fullscreen would break the DS's body-portaled floating surfaces (dropdowns/tooltips/menus render outside the fullscreen element) and fight the browser's reserved Escape. In-page maximize integrates with the existing overlay/Escape infrastructure.
- **Maximize is applied in place (`position: fixed` on the existing root), NOT via `createPortal`.** _(Revised during planning.)_ FlowCanvas holds heavy in-place DOM state — a `ResizeObserver` on node elements, `rootRef`, viewport transform. Conditionally wrapping the root in a portal (or swapping a portal container) forces React to **remount** that subtree, resetting the observer and dropping focus/viewport — the exact "viewport preservation" this spec calls out as its primary risk. `position: fixed` on the same node escapes ancestor `overflow` clipping and needs only a scoped `stylelint-disable` (the sanctioned pattern). Caveat: a transformed/filtered ancestor becomes the containing block for `fixed` (rare; documented in JSDoc). Elevation of consumer menus is unaffected — the `[data-flowcanvas-maximized]` marker sits on the root and menus are DOM descendants.
- **Layout:** zoom cluster stays **bottom-left** (unchanged); custom controls **top-left**; maximize/restore toggle **top-right**.
- **Prop naming:** `maximized` (accurate — it is not native fullscreen), not `fullscreen`.
- **Keyboard:** `F` toggles maximize; `Escape` exits it (as the final tier of the existing Escape precedence).
- **`defaultMaximized`:** kept, for symmetry with the existing `defaultSelection` convention.

## Existing infrastructure this builds on

All overlay plumbing already exists in `packages/design-system/src/components/_internal/overlay/` (imported by Modal, Drawer, Popover, Select, DropdownMenu, Rail, etc.). FlowCanvas imports from the same place. Nothing new needs to be invented — only wired.

| Need | Reuse | Notes |
| --- | --- | --- |
| Body scroll lock | `useScrollLock(active)` | Ref-counted, module-level. Drop-in. |
| Focus trap | `useFocusTrap(ref, active)` | Tab-wrap + focusin recapture; already bypasses body-portaled floating UI so nested menus keep focus. |
| Escape-yield protocol (#274) | `useFloatingSurface` / `overlayStack.consumeEscape` / `hasOpenFloating()` / `wasEscapeConsumed(e)` | Lets an open consumer menu win the Escape press before maximize exits. |
| Transitive elevation (if maximized inside a Modal) | `useInOverlay(ref, active)` + `[data-in-overlay]` SCSS override | Optional; include for correctness. |
| **Floating surfaces opened _inside_ the maximized canvas must sit above it** | Register `[data-flowcanvas-maximized]` in `OVERLAY_PORTAL_SELECTOR` (`useInOverlay.ts`) | **Required.** Without this, a consumer `DropdownMenu`/`Select`/`Popover` opened from a `controls` button portals to body at `--z-dropdown` (1000) and renders _behind_ the maximized canvas (1090). Adding the marker to the selector makes those surfaces detect they are "in an overlay", stamp `data-in-overlay`, and elevate to `--z-overlay-floating` (1190) — above the maximized canvas. Same mechanism Modal/Drawer already rely on. |
| Fixed-overlay positioning | `.rootMaximized` class → `position: fixed` on the existing root + `data-flowcanvas-maximized` marker | **No portal** (would remount the canvas — see decision above). Scoped `stylelint-disable` guards `position: fixed`, exactly as `Modal.module.scss` does. |
| z-index | new token `--z-flowcanvas-maximized` in `tokens.scss` layering ladder | Sits near `--z-modal: 1100`. See "z-index" below. |
| Fixed positioning inside stylelint rules | scoped `// stylelint-disable ... -- reason` block | `position: fixed` is the only hard-blocked value; Modal's `.overlay` shows the exact pattern. Legit because the surface is portaled out of page layout. |
| Fill-viewport CSS | `100dvw/100dvh` with `100vw/100vh` fallback | The repo idiom (`Modal.module.scss`). |
| Focus restore on exit | copy the ~20-line capture/restore block from `ModalRoot.tsx:207-226` | No extracted `useFocusRestore` hook exists. Mind the effect-ordering note: focus-restore effect must sit **above** `useScrollLock` so cleanups run scroll-then-focus. |
| Icons | `Maximize2` / `Minimize2` from `lucide-react` | `Maximize` is already taken in FlowCanvas for zoom-to-fit — do not reuse it. |

## Public API — new props

Added to `FlowCanvasProps` (`FlowCanvas.tsx`). Controlled/uncontrolled mirrors the existing `selection` / `defaultSelection` / `onSelectionChange` convention exactly.

```ts
interface FlowCanvasProps extends HTMLAttributes<HTMLDivElement> {
  // ...existing props unchanged...

  /**
   * Consumer-rendered controls, shown in a top-left toolbar overlay. Put DS
   * `<Button>`s here (e.g. an "Add node" button wired to your own state).
   * The toolbar stays pinned when the canvas is maximized.
   * @default none
   */
  controls?: ReactNode;

  /**
   * Show the built-in maximize / restore toggle (top-right).
   * Set false to drive maximize entirely via the `maximized` prop.
   * @default true
   */
  maximizeControl?: boolean;

  /** Controlled maximize state. Use with `onMaximizedChange`. */
  maximized?: boolean;

  /** Initial maximize state when uncontrolled. @default false */
  defaultMaximized?: boolean;

  /** Fires whenever maximize is toggled (button, `F` key, or Escape). */
  onMaximizedChange?: (maximized: boolean) => void;
}
```

No new exported types. `controls` is a plain `ReactNode`; there is no `FlowCanvasAction` type because we chose the render slot.

## Behavior

### Maximize mechanism

- When `maximized` is true, the **existing root** (the `role="application"` element) gets a `.rootMaximized` class → `position: fixed; inset 0; width:100dvw; height:100dvh; z-index: var(--flow-canvas-maximized-z)`, plus `data-flowcanvas-maximized=""`. No DOM node moves; nothing is portaled.
- **Viewport (pan/zoom) and selection are preserved across toggling** — because it is the same DOM node (no remount), `useViewport` state, `rootRef`, the `ResizeObserver`, and focus all survive trivially. This is the whole reason for choosing in-place `fixed` over a portal.
- On enter: `useScrollLock(true)`, `useFocusTrap(surfaceRef, true)`, capture `document.activeElement`, move focus into the surface. On exit: release both, restore focus to the maximize toggle (or the previously-focused element).

### z-index

Add to the layering ladder in `packages/design-system/src/styles/tokens.scss` (near `--z-modal: 1100`):

```scss
--z-flowcanvas-maximized: 1090; // in-page maximized canvas; below modal so a Modal opened over it still wins
```

Rationale: a maximized canvas should sit above normal page content and app-shell chrome (Modal's 1100 is the reference "covers everything" level) but **below** `--z-modal` (1100), so a Modal launched from a control still overlays correctly. If the maximized canvas is itself opened inside a Modal/Drawer, `useInOverlay` + the `[data-in-overlay]` override elevates it transitively (same pattern as every other floating surface).

**Required companion change (`useInOverlay.ts`):** add `[data-flowcanvas-maximized]` to `OVERLAY_PORTAL_SELECTOR`. This is what lets a consumer `DropdownMenu`/`Select`/`Popover` opened from a `controls` button elevate _above_ the maximized canvas (to `--z-overlay-floating` 1190) instead of rendering behind it at `--z-dropdown` (1000). Because the selector is also how elevation is transitive, this simultaneously fixes nesting for surfaces opened at any depth inside the maximized canvas. Without this one-line addition, consumer menus inside maximize are invisible — so it has a dedicated test (below).

### Escape precedence (single press → exactly one action)

FlowCanvas becomes a "host" in the #274 sense. Ordered:

1. **Open consumer floating surface** (a Popover/DropdownMenu the consumer rendered in `controls`) closes itself first — it runs in capture phase and calls `overlayStack.consumeEscape(e)`. FlowCanvas checks `overlayStack.hasOpenFloating() || overlayStack.wasEscapeConsumed(e)` and yields.
2. Else **cancel an in-progress connection drag** *(existing behavior)*.
3. Else **clear the selection** *(existing behavior)*.
4. Else if **maximized → exit maximize** *(new final tier)*.

So maximized + selected: first Escape clears selection, second Escape exits maximize. Implemented by extending `handleRootKeyDown` (tiers 2–4) plus a capture-phase yield check for tier 1, following `Modal/Content.tsx`'s handler shape.

### Keyboard

- **`F`** toggles maximize. Added to `handleRootKeyDown` alongside the existing `E` / `C` / `+` / `-` / `0`. Ignored when a text input inside `controls` has focus (guard on event target, consistent with existing key handling).
- **`Escape`** exits maximize per the precedence above.

### Controls slot & toggle placement

- `controls` renders into a positioned **top-left** container that carries `data-flow-controls=""` (the same background-pan carve-out the zoom cluster uses at `FlowCanvas.tsx:489`, so clicking a control never starts a pan). The container gets `role="toolbar"` and an i18n `aria-label` (`flowCanvas.controlsLabel`). The consumer fills it with DS components.
- The **maximize toggle** is a `<Button iconOnly variant="secondary" size="sm">` in a **top-right** container (also `data-flow-controls=""`), using `Maximize2` when inline and `Minimize2` when maximized, with `aria-label` from `flowCanvas.enterFullscreen` / `flowCanvas.exitFullscreen`. Hidden when `maximizeControl={false}`.
- All three zones (zoom bottom-left, controls top-left, toggle top-right) live inside the portaled surface, so they stay pinned in maximize.

### readOnly

- Maximize works in `readOnly` (viewing a large graph fullscreen is valid).
- The `controls` slot renders regardless of `readOnly`; disabling edit actions in read-only is the consumer's responsibility (they already know their own `readOnly`).

## i18n

New keys in `src/i18n/messages.ts`, `en.ts`, `ru.ts` (following the existing `flowCanvas.*` keys like `flowCanvas.zoomToFit`):

- `flowCanvas.enterFullscreen` — en: "Maximize" / ru: "На весь экран"
- `flowCanvas.exitFullscreen` — en: "Restore" / ru: "Свернуть"
- `flowCanvas.controlsLabel` — en: "Canvas actions" / ru: "Действия"

(Wording finalized during implementation; Russian reviewed for accuracy.)

## Styling

- New positioning lives in `FlowCanvas.module.scss`, wrapped in the sanctioned scoped disable:
  ```scss
  // stylelint-disable declaration-property-value-disallowed-list -- maximized canvas must be fixed to fill the viewport
  ```
  filling `100dvw/100dvh` with `vw/vh` fallbacks, `z-index: var(--z-flowcanvas-maximized)`.
- Top-left and top-right control containers positioned like the existing bottom-left `FlowControls` (absolute within the surface). Tokens only — no raw colors/spacing/radii (Stylelint `declaration-strict-value`).
- The `[data-in-overlay]` elevation override added for the maximized container, matching the other overlays.

## Testing (`FlowCanvas.test.tsx`)

- Toggle maximize via the button, via `F`, and exit via `Escape`; `onMaximizedChange` fires with the right value; controlled `maximized` prop respected; uncontrolled `defaultMaximized` honored.
- Escape precedence: with a selection present, first Escape clears selection, second exits maximize; an open floating surface (simulated via the overlayStack registry) wins over maximize-exit.
- `useScrollLock` applied on enter and released on exit; focus moves into the surface on enter and restores to the toggle on exit (focus-trap active).
- Viewport preserved: set a pan/zoom, toggle maximize twice, assert transform unchanged.
- `controls` renders its children; a pointer-down on a control does **not** start a background pan (`data-flow-controls` carve-out).
- **Elevation:** a floating surface (e.g. `Select`/`DropdownMenu`) opened from a `controls` button while maximized stamps `data-in-overlay` and receives the elevated z-index (proves the `OVERLAY_PORTAL_SELECTOR` registration works), so it is not hidden behind the maximized canvas.
- `maximizeControl={false}` hides the toggle but `maximized` prop still drives state.
- `readOnly` still allows maximize.
- SSR/portal safety: no crash when `document.body` portal mounts/unmounts.

**Browser verification (required before PR):** jsdom cannot see paint. Playwright-load the FlowCanvas demo in the running playground, toggle maximize, and confirm the surface fills the viewport with all three control zones pinned, then exits cleanly. (Per the "verify visual components in browser" memory.)

## Demo (`packages/playground/src/pages/components/FlowCanvasDemo.tsx`)

Extend the existing interactive "Workflow builder" example:

- Pass a `controls` slot containing an **"Add node"** DS `<Button>` (wired to the demo's `setNodes`, placing a new node at a sensible spot) and a second **"Auto-arrange"** button (re-runs auto-layout by clearing positions) — demonstrating "add node **or something else**".
- The maximize toggle appears automatically (`maximizeControl` defaults true); add a one-line note that `F` / `Escape` toggle it.
- Keep the existing three examples; the new slot goes on the first (interactive) one.

## Documentation & definition of done

Per the repo core invariant, this extension is not complete until:

1. Unit tests above pass.
2. Demo updated (above).
3. `FlowCanvas.tsx` JSDoc `@remarks` updated: note it is **in-page maximize, not native fullscreen**; "when not to use" additions (e.g. don't hide layout-critical actions solely behind maximize; the `controls` slot is not a place for primary page navigation).
4. Export unchanged (`FlowCanvas` already exported from `src/index.ts`; no new types to export).
5. AGENTS.md TL;DR section (`### <FlowCanvas>`) updated with a short line on `controls` + `maximized`, and the canonical snippet extended to show the `controls` slot and maximize toggle.

Not a new component, so no new `_meta/manifest.ts` CLUSTERS entry is needed; `props.manifest.json` regenerates automatically via the Vite plugin on build.

## Out of scope (YAGNI)

- Native `element.requestFullscreen()` (explicitly rejected).
- A declarative `actions[]` API (chose the render slot).
- A minimap, multi-select, or any change to the graph model.
- A general-purpose extracted `useFocusRestore` hook (copy Modal's block; extraction can be a later refactor if a third caller appears).
- Surface-vs-surface Escape ordering beyond what #274 already provides (tracked separately in #280).

## Primary risk

The original risk was **preserving viewport/selection when entering/exiting maximize**. The in-place `position: fixed` decision (above) removes it at the root: because no DOM node moves, there is no remount and state survives by construction. A guard test still pans/zooms, toggles maximize twice, and asserts the same stage node and unchanged transform — to catch any accidental remount reintroduced by a future refactor. The residual risk is the `position: fixed` transformed-ancestor caveat, documented in the component JSDoc.
