# Escape ordering (#274) — innermost surface first

**Spec:** issue #274 + the Escape audit (2026-07-04): one Escape press with a
floating surface open inside a Modal/Drawer/Lightbox closes BOTH the surface
and its host. Hosts' document-capture listeners fire first (registration
order) and check nothing about inner surfaces.

**Design (audit-driven):**

1. **Floating-surface registry** in `_internal/overlay/useOverlayStack.ts`:
   module-level `Set<string>`; `overlayStack.registerFloating(id)` /
   `unregisterFloating(id)` / `hasOpenFloating()`; hook
   `useFloatingSurface(id: string, open: boolean)` (layout effect, mirrors
   `useOverlayStack` timing).
2. **Host yield guard** — one line in each host's Escape handler, before
   `setOpen(false)`: `if (overlayStack.hasOpenFloating()) return;`
   (Modal/Content.tsx, Drawer/Content.tsx, Lightbox.tsx). The surface's own
   later-firing capture listener closes it in the same press; the next press
   reaches the host.
3. **Surface registration** (7): Select `Listbox`, Popover `Content` (covers
   ConfirmationPopover), DropdownMenu `Content` (each open level registers its
   own id — covers Subs; Escape peels one level per press, host waits),
   TimeField, DatePicker, DateRangePicker, RailGroup flyout.
4. **DatePicker + DateRangePicker Escape upgrade**: element-scoped (input
   onKeyDown) → document-capture-while-open, matching Select/Popover. Without
   this, host-yield would DEAD-KEY Escape when focus is in the calendar grid;
   it is also a pre-existing standalone gap (Escape in grid closes nothing).
   Keep the input handler (fast path, preventDefault semantics preserved).
5. **ConfirmationPopover `pending`**: stays registered while pending → host
   keeps yielding → Escape is inert during async confirm (correct).

**Out of scope:** Tooltip (hover-transient, no Escape semantics to order);
making hosts check `defaultPrevented` (order makes it useless).

**TDD:** registry unit tests; per-host yield tests (surface-in-host: first
Escape closes only the surface, second closes the host); DatePicker/Range
grid-focus Escape tests (new behavior); regression — all existing suites.

**Ship:** gates → Rule-8 panel (2 lenses) → PR "Addresses #274".
