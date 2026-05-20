# Popover + ConfirmationPopover — design

**Status:** approved, ready for plan
**Author:** dpws + Claude
**Date:** 2026-05-19
**Scope:** two new components — `packages/design-system/src/components/Popover/` and `packages/design-system/src/components/ConfirmationPopover/`

## Goal

Ship the next two floating-UI primitives from the wishlist in `packages/design-system/CLAUDE.md`:

1. `<Popover>` — generalized non-menu floating panel. Hand-rolled on `@floating-ui/react-dom`. Compound API (`Popover.Trigger`, `Popover.Content`, `Popover.Heading`, `Popover.Close`). Non-modal: focus moves into the panel on open, Tab continues to traverse out of the panel into the page behind, click-outside or Escape dismisses.
2. `<ConfirmationPopover>` — opinionated preset on top of Popover. Declarative API (`title` / `description` / `confirmLabel` / `cancelLabel` / `variant` / `onConfirm`). Async-aware: while `onConfirm`'s Promise is in flight, buttons disable and dismissal is blocked. Initial focus on Cancel for both variants.

## Non-goals

- **No modal popover in v1.** The `<Popover>` root accepts a `modal?: boolean` prop reserved as a future type hint, but in v1 it is always non-modal (no focus trap, no inert background, `aria-modal="false"`). True modal behavior is what `<Modal>` will be for.
- **No arrow toggle.** Arrow is always on, matching Tooltip's posture. If a chromeless floating panel is needed later, that's a separate component.
- **No `initialFocus` override on ConfirmationPopover.** Cancel is the safe default for both variants; revisit if a real use case appears.
- **No inline error rendering in ConfirmationPopover.** When `onConfirm` rejects, the popover stays open and buttons re-enable — the consumer surfaces the error externally (toast, inline message, etc.).
- **No multi-step confirmations** ("Type the name to confirm"). That's Modal territory.
- **No animation on close.** Same posture as DropdownMenu / Tooltip — panel unmounts on close.
- **No `<Popover.Description>` slot.** `<Popover.Content>` body is consumer markup; there is no opinionated description slot. ConfirmationPopover renders its own description internally because it is an opinionated preset.

## Popover public API

```tsx
import { Popover } from '@eocrm/design-system';

// Canonical use — a filter panel:
<Popover>
  <Popover.Trigger>
    <Button variant="secondary">Filters</Button>
  </Popover.Trigger>
  <Popover.Content>
    <Stack gap="sm">
      <Cluster justify="between" align="center">
        <Popover.Heading>Filter results</Popover.Heading>
        <Popover.Close>
          <Button variant="ghost" size="sm" aria-label="Close">
            ✕
          </Button>
        </Popover.Close>
      </Cluster>
      {/* …form controls… */}
      <Cluster justify="end" gap="sm">
        <Popover.Close>
          <Button variant="secondary" size="sm">
            Cancel
          </Button>
        </Popover.Close>
        <Popover.Close>
          <Button size="sm" onClick={applyFilters}>
            Apply
          </Button>
        </Popover.Close>
      </Cluster>
    </Stack>
  </Popover.Content>
</Popover>;

// Controlled (rare):
const [open, setOpen] = useState(false);
<Popover open={open} onOpenChange={setOpen}>
  …
</Popover>;
```

### `<Popover>` root props

| Prop           | Type                      | Default | Notes                                                                                            |
| -------------- | ------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `children`     | `ReactNode`               | —       | Must contain exactly one `<Popover.Trigger>` and one `<Popover.Content>` (validated at runtime). |
| `open`         | `boolean`                 | —       | Optional controlled state.                                                                       |
| `onOpenChange` | `(open: boolean) => void` | —       | Required when `open` is provided.                                                                |
| `defaultOpen`  | `boolean`                 | `false` | Uncontrolled initial state.                                                                      |
| `modal`        | `boolean`                 | `false` | Reserved future hint. v1 ignores the value and always renders non-modal.                         |

### `<Popover.Trigger>` props

| Prop       | Type           | Default | Notes                                                                                                                          |
| ---------- | -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `children` | `ReactElement` | —       | Exactly one element that accepts a ref. Same `forwardRef`-required contract as `<DropdownMenu.Trigger>`. `<Button>` qualifies. |

Trigger clones its child to inject:

- `ref` merged with the consumer's ref (via `mergeRefs`).
- `aria-haspopup="dialog"`.
- `aria-expanded={open}`.
- `aria-controls={contentId}` while open.
- `onClick` chained with the consumer's onClick (consumer runs first).
- `onKeyDown` chained for Enter / Space activation.

### `<Popover.Content>` props

| Prop         | Type                                     | Default      | Notes                                                                                                            |
| ------------ | ---------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------- |
| `children`   | `ReactNode`                              | —            | Free-form. Compose with `<Stack>` / `<Cluster>` / etc.                                                           |
| `side`       | `'top' \| 'right' \| 'bottom' \| 'left'` | `'bottom'`   | Preferred placement. Floating UI auto-flips on collision.                                                        |
| `align`      | `'start' \| 'center' \| 'end'`           | `'center'`   | Edge alignment.                                                                                                  |
| `sideOffset` | `number`                                 | `10`         | Gap in px between trigger and panel. Larger than Tooltip's 6 to fit the arrow on a larger panel.                 |
| `minWidth`   | `number \| string`                       | token-driven | Override the panel's minimum width. Default uses `--size-popover-min-width` (220px).                             |
| `className`  | `string`                                 | —            | Composed with the component's own className.                                                                     |
| `style`      | reserved                                 | —            | Floating UI sets inline `position`/`top`/`left`; consumer `style` is silently overridden — same as DropdownMenu. |

### `<Popover.Heading>` props

| Prop       | Type                                   | Default | Notes             |
| ---------- | -------------------------------------- | ------- | ----------------- |
| `children` | `ReactNode`                            | —       | The heading text. |
| `as`       | `'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6'` | `'h3'`  | Semantic tag.     |

When present, `<Popover.Content>` gets `aria-labelledby` pointing at the heading's auto-generated id. The heading registers via context on mount and unregisters on unmount.

### `<Popover.Close>` props

| Prop       | Type           | Default | Notes                                                                                                                    |
| ---------- | -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| `children` | `ReactElement` | —       | Exactly one element. Cloned to inject an `onClick` that closes the popover, chained with the child's existing `onClick`. |

Exported types: `PopoverProps`, `PopoverTriggerProps`, `PopoverContentProps`, `PopoverHeadingProps`, `PopoverCloseProps`, `PopoverSide`, `PopoverAlign`.

## ConfirmationPopover public API

```tsx
import { ConfirmationPopover } from '@eocrm/design-system';

// Destructive confirmation:
<ConfirmationPopover
  title="Delete record?"
  description="This action cannot be undone."
  confirmLabel="Delete"
  cancelLabel="Cancel"
  variant="danger"
  onConfirm={async () => {
    await api.deleteRecord(id);
  }}
>
  <Button variant="danger">Delete</Button>
</ConfirmationPopover>

// Default variant (lighter weight, e.g., archive / publish):
<ConfirmationPopover
  title="Archive this contact?"
  description="You can unarchive later from the archive view."
  onConfirm={() => archive(id)}
>
  <Button variant="secondary">Archive</Button>
</ConfirmationPopover>
```

### Props

| Prop                                    | Type                          | Default      | Notes                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------- | ----------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `children`                              | `ReactElement`                | — (required) | The trigger. Same forwardRef-required contract.                                                                                                                                                                                                                                                                                            |
| `title`                                 | `string`                      | — (required) | Renders inside `<Popover.Heading>`. Wires `aria-labelledby`.                                                                                                                                                                                                                                                                               |
| `description`                           | `ReactNode`                   | —            | Optional body text under the title. Wires `aria-describedby` when present.                                                                                                                                                                                                                                                                 |
| `confirmLabel`                          | `string`                      | `'Confirm'`  | Confirm button text.                                                                                                                                                                                                                                                                                                                       |
| `cancelLabel`                           | `string`                      | `'Cancel'`   | Cancel button text.                                                                                                                                                                                                                                                                                                                        |
| `variant`                               | `'default' \| 'danger'`       | `'default'`  | `'danger'` → Confirm renders as `<Button variant="danger">`. Default → `<Button variant="primary">`.                                                                                                                                                                                                                                       |
| `onConfirm`                             | `() => void \| Promise<void>` | — (required) | Async-aware. Click on Confirm runs `onConfirm()`. If it returns a Promise, both buttons disable and dismissal paths are blocked until resolve. On resolve, popover closes. On reject, popover stays open, buttons re-enable, `onCancel` is NOT fired. ConfirmationPopover does NOT render the error — the consumer surfaces it externally. |
| `onCancel`                              | `() => void`                  | —            | Optional. Fires on Cancel click, Escape, or click-outside dismissal. Does NOT fire if `onConfirm` rejects.                                                                                                                                                                                                                                 |
| `side`                                  | (same as `<Popover.Content>`) | `'top'`      | Confirmations anchor above the trigger by default — keeps the user's eye near where they clicked.                                                                                                                                                                                                                                          |
| `align`                                 | (same as `<Popover.Content>`) | `'center'`   | —                                                                                                                                                                                                                                                                                                                                          |
| `sideOffset`                            | `number`                      | `10`         | —                                                                                                                                                                                                                                                                                                                                          |
| `open` / `onOpenChange` / `defaultOpen` | (same as `<Popover>`)         | —            | Optional controlled state, forwarded to the underlying Popover.                                                                                                                                                                                                                                                                            |

Exported types: `ConfirmationPopoverProps`, `ConfirmationVariant`.

### Behavior specifics

- **Initial focus** lands on the **Cancel button** regardless of variant. Industry conventions split (GitHub/Linear focus Cancel, Notion focuses Confirm); going with Cancel for safety — keyboard "Enter" never accidentally confirms a destructive action; the user must Tab once to Confirm.
- **Pending state.** While the Promise returned by `onConfirm` is unresolved:
  - Both Cancel and Confirm get the `disabled` attribute.
  - Confirm shows a small spinner (12×12 inline SVG, `currentColor`) to the left of the label.
  - Escape and click-outside are no-oped.
  - An internal `pending` boolean state, reset on resolve / reject.
- **Failure mode.** `onConfirm` rejects → `pending` flips back to `false`, buttons re-enable, popover stays open, `onCancel` not fired. The consumer is expected to render their own error feedback (toast, inline message, etc.).
- **Double-click guard.** While pending, additional Confirm clicks are ignored (no second `onConfirm` invocation).

## Accessibility & dismissal

### Popover ARIA wiring

- `<Popover.Content>`: `role="dialog"`, `aria-modal="false"`, `tabIndex={-1}` (so it can receive programmatic focus on open), `id={contentId}`.
- `<Popover.Heading>` (optional): renders as the configured semantic tag (default `h3`), with auto-generated `id`. When present, `<Popover.Content>` gets `aria-labelledby={headingId}`. Heading registers via context on mount; unregisters on unmount.
- `<Popover.Trigger>`: clones its child to add `aria-haspopup="dialog"`, `aria-expanded={open}`, `aria-controls={contentId}` (only when open).

### ConfirmationPopover ARIA

- Internally uses `<Popover.Heading>` for `title` → `aria-labelledby` wired automatically.
- When `description` is provided, it renders inside a `<p id="…">` and `<Popover.Content>` gets `aria-describedby` pointing at it.
- Cancel and Confirm buttons receive their labels via `cancelLabel` / `confirmLabel`; no extra ARIA needed beyond what `<Button>` provides.

### Open / close triggers

| Event                                               | Popover                                                          | ConfirmationPopover                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Trigger click (or Enter / Space on focused trigger) | Toggle open.                                                     | Open.                                                                       |
| Click anywhere inside `<Popover.Content>`           | **No close** unless wrapped in `<Popover.Close>`.                | Confirm runs `onConfirm`; Cancel closes + `onCancel`; other clicks ignored. |
| `<Popover.Close>`-wrapped element click             | Close (chains with consumer's `onClick`).                        | n/a — internal.                                                             |
| Click outside content + trigger                     | Close.                                                           | Close + `onCancel`. **Blocked while pending.**                              |
| `Escape` anywhere while open                        | Close. Focus returns to trigger.                                 | Close + `onCancel`. **Blocked while pending.**                              |
| `Tab` from inside content past the last focusable   | Continues to next focusable on the page; popover **stays open**. | Same.                                                                       |
| Trigger unmount while open                          | Cleanup listeners; ref check guards against stale state.         | Same.                                                                       |

### Focus management

- **On open**: render the portaled `<Popover.Content>`, then `queueMicrotask(() => contentRef.current?.focus({ preventScroll: true }))`. Focus lands on the panel itself (`tabIndex={-1}`). `preventScroll` matches DropdownMenu's pattern — the portal starts at document origin until Floating UI computes coords, so focusing without `preventScroll` would yank the page.
- **ConfirmationPopover** overrides this: after the content mounts, internal logic focuses the Cancel button via an internal ref (consumer cannot override in v1).
- **On close**: `triggerRef.current?.focus({ preventScroll: true })`. Same recipe DropdownMenu uses.

### Click-outside detection

Same `pointerdown` + capture-phase document listener pattern DropdownMenu uses. The handler checks:

1. Target is inside `<Popover.Content>` → ignore.
2. Target is inside `<Popover.Trigger>` → ignore (the trigger's own click handler toggles).
3. Otherwise → close.

ConfirmationPopover wraps the same logic with a `pending`-check short-circuit.

### Escape handling

Document-level capture-phase `keydown` listener while open. Closes the popover and returns focus to the trigger. ConfirmationPopover wraps with the same `pending`-check.

### Touch & disabled triggers

- **Touch**: tap fires `click`, which opens the popover normally — no special-case logic needed (unlike Tooltip, which has no tap-to-open by design).
- **Disabled triggers**: same anti-pattern as Tooltip. `<button disabled>` does not fire `click`, so the popover won't open. Documented JSDoc anti-pattern: use `aria-disabled="true"` + intercept click if you need a popover on a disabled-looking control, or wrap the control in a span.

### Multiple popovers

Each `<Popover>` instance manages its own state and listeners. Opening Popover B while Popover A is open does not automatically close A — A only closes if the click that opens B is outside A's content + trigger (which it usually is, so A naturally closes via outside-click).

## Positioning

```ts
useFloating({
  open,
  placement, // computed from side + align
  transform: false, // CSS transform reserved for entrance animation
  middleware: [
    offset(sideOffset), // default 10
    flip(), // auto-flip on collision
    shift({ padding: 8 }), // viewport edge padding
    arrow({ element: arrowRef }), // populates middlewareData.arrow.{x, y}
  ],
  whileElementsMounted: autoUpdate,
  elements: { reference: triggerRef.current },
});
```

Same `transform: false` as Tooltip — Floating UI writes `top` / `left` instead of `transform: translate`, leaving the CSS `transform` property free for the entrance animation.

**No `size` middleware.** Popover content is consumer-determined; if it's tall enough to need scrolling, that's Modal territory.

### Arrow

- 10×10 (vs Tooltip's 8×8) — proportional to the larger panel.
- Inline-positioned by `middlewareData.arrow.{x, y}` on the cross-axis. The trigger-facing edge is anchored by SCSS `[data-side]` rules (same recipe Tooltip uses).
- Background `var(--color-bg)` (panel-colored), matching the panel.
- 1px border on the two outward-facing edges so the arrow visually fuses with the panel chrome. Exact rendering recipe (clip-path vs rotated span with synthetic `box-shadow` borders vs inline SVG) deferred to implementation — same posture as Tooltip's spec.
- `aria-hidden="true"`, `pointer-events: none`.

## Visual chrome

```scss
.content {
  position: relative;
  min-width: var(--size-popover-min-width); /* 220px — new token */
  max-width: 360px; /* intrinsic geometric constraint, raw value OK */
  padding: var(--space-3);
  background: var(--color-bg);
  color: var(--color-fg);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg); /* heavier than Tooltip's --shadow-md */
  z-index: var(--z-popover);
  outline: none;
  /* …animation rules below… */
}
```

### Z-index — new token

Add to `tokens.scss`:

```scss
--z-popover: 1050; /* above dropdown (1000), below modal (1100), toast (1200), tooltip (1300) */
```

Full layer hierarchy after this change:

```
--z-dropdown: 1000;
--z-popover:  1050;   ← new
--z-modal:    1100;
--z-toast:    1200;
--z-tooltip:  1300;
```

Rationale: a popover opened from inside a DropdownMenu item must appear above the menu (1050 > 1000). A Modal opened on top of a Popover must bury the popover behind its backdrop (1100 > 1050). Tooltips inside popovers stay on top (1300 > 1050).

### New token — `--size-popover-min-width`

```scss
--size-popover-min-width: 220px;
```

Slightly wider than DropdownMenu's `--size-dropdown-min-width: 160px` because popover content is typically richer (form-style, with multiple rows).

## Animation

Reuses DropdownMenu / Tooltip's `@starting-style` scale-fade pattern. Tuned for the larger panel:

```scss
.content {
  transform: none;
  transition:
    opacity var(--transition-base),
    transform var(--transition-base);

  @starting-style {
    opacity: var(--opacity-hidden);
  }
}

.content[data-side='top'] {
  transform-origin: bottom center;
  @starting-style {
    transform: scale(0.95) translateY(4px);
  }
}
.content[data-side='bottom'] {
  transform-origin: top center;
  @starting-style {
    transform: scale(0.95) translateY(-4px);
  }
}
.content[data-side='right'] {
  transform-origin: left center;
  @starting-style {
    transform: scale(0.95) translateX(-4px);
  }
}
.content[data-side='left'] {
  transform-origin: right center;
  @starting-style {
    transform: scale(0.95) translateX(4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .content {
    transition: none;
  }
}
```

Differences from Tooltip's animation:

- `scale(0.95)` instead of `0.92` — the larger panel needs less aggressive scale-down.
- `4px` translate (matches DropdownMenu) instead of Tooltip's `2px` — proportional to the larger panel.
- Same `--transition-base` duration (140ms) for cross-component consistency.

No close animation. Same rationale as DropdownMenu / Tooltip: "get out of the way" beats "play a transition."

## Internal structure

### Popover (compound)

```
context.ts                ← PopoverContext: open, setOpen, triggerRef, contentRef, contentId, headingId, setHeadingId, closeAll
PopoverRoot.tsx           ← PopoverRoot function (state machine + provider)
Popover.tsx               ← namespace assembly: Popover = PopoverRoot; Popover.Trigger = Trigger; etc.
Trigger.tsx               ← cloneElement + aria + click/key handlers
Content.tsx               ← createPortal + useFloating + arrow + focus-on-open + document listeners
Heading.tsx               ← <h{level} id> + heading-id registration via context
Close.tsx                 ← cloneElement + chained onClick that calls ctx.setOpen(false)
Popover.module.scss       ← chrome + arrow + per-side @starting-style
index.ts                  ← export { Popover }; export type { … }
```

`Popover.tsx`:

```tsx
import { Trigger } from './Trigger';
import { Content } from './Content';
import { Heading } from './Heading';
import { Close } from './Close';
import { PopoverRoot } from './PopoverRoot';

type PopoverNamespace = typeof PopoverRoot & {
  Trigger: typeof Trigger;
  Content: typeof Content;
  Heading: typeof Heading;
  Close: typeof Close;
};

const Popover = PopoverRoot as PopoverNamespace;
Popover.Trigger = Trigger;
Popover.Content = Content;
Popover.Heading = Heading;
Popover.Close = Close;

export { Popover };
```

`PopoverRoot.tsx`:

```tsx
export function PopoverRoot({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  modal: _modal = false, // reserved future hint; v1 ignores
}: PopoverProps) {
  const isControlled = controlledOpen !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = isControlled ? (controlledOpen as boolean) : uncontrolled;

  const setOpen = useCallback(
    (next: boolean) => {
      onOpenChange?.(next);
      if (!isControlled) setUncontrolled(next);
    },
    [isControlled, onOpenChange],
  );

  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const reactId = useId();
  const contentId = `popover-${sanitizeId(reactId)}`;
  const [headingId, setHeadingId] = useState<string | null>(null);

  const closeAll = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }, [setOpen]);

  const value: PopoverContextValue = {
    open,
    setOpen,
    triggerRef,
    contentRef,
    contentId,
    headingId,
    setHeadingId,
    closeAll,
  };

  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}
```

`Trigger.tsx` — cloneElement injecting `ref`, `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, and chained click/keydown handlers. Pattern identical to DropdownMenu's `Trigger.tsx`.

`Content.tsx` — the heaviest file:

- `useFloating` with `transform: false` + offset / flip / shift / arrow middleware
- Document-level `pointerdown` listener (capture) → close on outside click
- Document-level `keydown` listener (capture) → close on Escape, return focus to trigger
- `useLayoutEffect` on open → focus the panel (`contentRef.current?.focus({ preventScroll: true })`)
- Renders `createPortal(<div role="dialog" ref={…} tabIndex={-1} aria-labelledby={headingId ?? undefined} …>{children}<span ref={arrowRef} …/></div>, document.body)`

`Heading.tsx`:

```tsx
export function Heading({ children, as: As = 'h3', ...rest }: PopoverHeadingProps) {
  const ctx = usePopoverContext('Heading');
  const id = `popover-heading-${sanitizeId(useId())}`;

  useLayoutEffect(() => {
    ctx.setHeadingId(id);
    return () => ctx.setHeadingId(null);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps — ctx is stable per Popover instance

  return (
    <As id={id} {...rest}>
      {children}
    </As>
  );
}
```

`Close.tsx` — cloneElement injecting an onClick that calls `ctx.closeAll()`, chained with the consumer's onClick (chain order: consumer first, then close).

### ConfirmationPopover (single component)

```
ConfirmationPopover.tsx              ← single component; uses Popover internally
ConfirmationPopover.module.scss      ← title/description typography + spinner keyframes
ConfirmationPopover.test.tsx
index.ts
```

`ConfirmationPopover.tsx` (sketch):

```tsx
export function ConfirmationPopover({
  children,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  side = 'top',
  align = 'center',
  sideOffset = 10,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: ConfirmationPopoverProps) {
  const [pending, setPending] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const reactId = useId();
  const descriptionId = description ? `confirm-desc-${sanitizeId(reactId)}` : undefined;

  // We layer our own dismissal-blocking on top of Popover by wrapping the
  // onOpenChange the consumer provided and short-circuiting when pending.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (pending && !next) return; // don't allow close while pending
      onOpenChange?.(next);
      if (!next) onCancel?.();
    },
    [pending, onOpenChange, onCancel],
  );

  // Focus Cancel after Popover opens. Popover focuses the panel; we move it.
  // useLayoutEffect on the visibility transition runs after the panel is mounted.
  // Implementation detail: we observe open via a controlled-uncontrolled hybrid
  // similar to PopoverRoot, or rely on rendering pattern. See implementation plan.

  const onConfirmClick = useCallback(async () => {
    if (pending) return;
    const result = onConfirm();
    if (result instanceof Promise) {
      setPending(true);
      try {
        await result;
        setPending(false);
        // close — this requires controlled-or-internal-state coordination;
        // see implementation plan for the exact wiring
      } catch {
        setPending(false);
        // popover stays open
      }
    } else {
      // sync confirm → close immediately
    }
  }, [pending, onConfirm]);

  return (
    <Popover open={controlledOpen} onOpenChange={handleOpenChange} defaultOpen={defaultOpen}>
      <Popover.Trigger>{children}</Popover.Trigger>
      <Popover.Content
        side={side}
        align={align}
        sideOffset={sideOffset}
        aria-describedby={descriptionId}
      >
        <Stack gap="sm">
          <Popover.Heading>{title}</Popover.Heading>
          {description && <p id={descriptionId}>{description}</p>}
          <Cluster justify="end" gap="sm">
            <Button
              ref={cancelButtonRef}
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => handleOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={variant === 'danger' ? 'danger' : 'primary'}
              size="sm"
              disabled={pending}
              onClick={onConfirmClick}
            >
              {pending && <Spinner />}
              {confirmLabel}
            </Button>
          </Cluster>
        </Stack>
      </Popover.Content>
    </Popover>
  );
}
```

**Note:** the sketch above glosses over a few coordination details that the implementation plan must resolve:

- How ConfirmationPopover triggers Popover to close after a successful `onConfirm` (probably by hoisting open state into ConfirmationPopover itself and passing it controlled to Popover).
- How focus moves to the Cancel button after Popover focuses the panel. The cleanest approach is `useLayoutEffect` on `open` inside ConfirmationPopover that runs _after_ Popover's own focus-on-open layout effect, since both fire after mount but ConfirmationPopover's effect fires after Popover's (parent effects run after child effects in React's commit phase). The plan must verify this ordering. If timing is brittle, fall back to a `queueMicrotask` from a content-level effect.
- The `<Spinner>` is a 12×12 inline SVG owned by `ConfirmationPopover.tsx` (~10 lines). Not a separate component.

### Shared helpers — already promoted

`mergeRefs`, `chain`, `sanitizeId`, `mergeAriaDescribedby` already live at `packages/design-system/src/components/_internal/refs.ts` from the Tooltip work. Popover and ConfirmationPopover import from there. No new shared helpers needed for v1.

## File layout

```
packages/design-system/src/components/
  Popover/
    Popover.tsx                       ← namespace export
    PopoverRoot.tsx                   ← PopoverRoot function + props interface
    Trigger.tsx
    Content.tsx
    Heading.tsx
    Close.tsx
    Popover.module.scss
    Popover.test.tsx
    context.ts
    index.ts                          ← export { Popover }; export type { … }

  ConfirmationPopover/
    ConfirmationPopover.tsx
    ConfirmationPopover.module.scss
    ConfirmationPopover.test.tsx
    index.ts                          ← export { ConfirmationPopover }; export type { … }
```

Plus:

- `packages/design-system/src/styles/tokens.scss` — add `--z-popover: 1050` and `--size-popover-min-width: 220px`.
- `packages/design-system/src/index.ts` — re-export `Popover` (the namespace) + `ConfirmationPopover` + all the type names.
- `packages/design-system/AGENTS.md` — two new TL;DR sections (Popover + ConfirmationPopover) after the Tooltip section. Token table updated. Anti-patterns rows added.
- `packages/design-system/README.md` — two new rows in the components table.
- `packages/playground/src/pages/components/PopoverDemo.tsx` — playground demo (~6 examples).
- `packages/playground/src/pages/components/ConfirmationPopoverDemo.tsx` — playground demo (~5 examples covering default + danger + async + error + on-DropdownMenu-item).
- `packages/playground/src/App.tsx` — two new routes.
- `packages/playground/src/layout/AppShell/AppShell.tsx` — two new entries in the Overlays group.
- `packages/playground/src/pages/components/ComponentsIndex.tsx` — two new grid cards.
- `packages/playground/src/pages/mockups/registry.ts` — extend `ComponentName` union with `'Popover'` and `'ConfirmationPopover'`.

## Tests

### `Popover.test.tsx` — ~25 tests

**Rendering & API:**

1. Renders trigger as-is; no portaled content on mount.
2. Throws when `<Popover.Trigger>` has non-element children.
3. `defaultOpen={true}` renders the panel on mount.
4. Controlled `open` + `onOpenChange` round-trip.
5. Rerender from `open={false}` to `open={true}` flips the panel; rerender back closes it.

**Trigger contract:**

6. Trigger has `aria-haspopup="dialog"` and `aria-expanded="false"` initially.
7. Click on trigger opens the popover; `aria-expanded="true"`.
8. Second click on trigger closes it.
9. Enter / Space on focused trigger opens.
10. Consumer `ref`, `className`, `data-*`, `onClick` all preserved; consumer `onClick` chains and runs first.

**Content portal & ARIA:**

11. Open → panel renders in `document.body` with `role="dialog"`, `aria-modal="false"`, `tabIndex={-1}`.
12. `data-side` reflects resolved placement (default `'bottom'`).
13. `<Popover.Heading>` renders as the configured tag (default `h3`); `<Popover.Content>` gets `aria-labelledby` pointing at it.
14. Without `<Popover.Heading>`, `<Popover.Content>` has no `aria-labelledby`.

**Focus:**

15. Open → focus moves to the panel.
16. Close (Escape) → focus returns to trigger.
17. Close (outside click) → focus returns to trigger.
18. Close (`<Popover.Close>` click) → focus returns to trigger.

**Dismissal:**

19. Escape from inside the panel closes.
20. `pointerdown` outside the panel + outside the trigger closes.
21. `pointerdown` inside the panel does NOT close.
22. `<Popover.Close>`-wrapped element click closes AND fires the consumer's `onClick`.

**Tab behavior:**

23. Tab from inside the panel walks through focusable children, then exits to the page; popover stays open (NOT a focus trap).

**Cleanup:**

24. Unmount-while-open removes document `pointerdown` + `keydown` listeners.

**Animation contract:**

25. `Popover.module.scss` contains `.content { … @starting-style … }` (substring assertion).

**Arrow:**

26. Content contains a `span[aria-hidden="true"]` with the arrow class.

Test infrastructure: reuse the `asyncWrapper` + `configure` shim from Tooltip's test file (already established for fake-timer + RTL `act()` cooperation).

### `ConfirmationPopover.test.tsx` — ~15 tests

Doesn't re-test Popover internals.

1. Renders trigger as-is; no popover on mount.
2. Click trigger → popover renders with `title` as the heading and `description` as accessible text.
3. `variant="danger"` makes Confirm a `<Button variant="danger">`; default uses `primary`.
4. Custom `confirmLabel` / `cancelLabel` reflected.
5. `aria-labelledby` (title) and `aria-describedby` (description) wired.
6. On open, focus lands on the Cancel button (both variants).
7. Confirm click → sync `onConfirm` invoked once → popover closes.
8. Confirm doesn't fire `onCancel`.
9. Async `onConfirm` returns Promise → both buttons disabled → resolve → popover closes.
10. While pending: Escape does NOT close.
11. While pending: click-outside does NOT close.
12. `onConfirm` rejects → popover stays open, buttons re-enable, `onCancel` not fired.
13. Double-click Confirm during pending → only one invocation.
14. Cancel click → close + `onCancel`.
15. Escape (non-pending) → close + `onCancel`.
16. Outside click (non-pending) → close + `onCancel`.

### Out of scope for unit tests

- Real positioning math (Floating UI's job; visual in playground demo).
- Real arrow rendering (visual only).
- `prefers-reduced-motion` actual disabling (CSS; the `@starting-style` substring test is the proxy).

## Playground

### `PopoverDemo.tsx` — ~6 Examples

1. **Default — filter panel** — `Filters` button → popover with form-style content + Apply / Cancel.
2. **Sides grid** — four triggers, one per side; verifies arrow rotation and Floating UI flip.
3. **With Popover.Heading** — visually confirms the heading style + `aria-labelledby` wiring.
4. **On a DropdownMenu item** — z-index sanity check (popover > dropdown).
5. **Controlled open** — toggle button drives `open` externally.
6. **Rich content** — popover containing a small list + a footer with multiple `<Popover.Close>`-wrapped buttons.

### `ConfirmationPopoverDemo.tsx` — ~5 Examples

1. **Default variant** — Archive contact, sync `onConfirm`.
2. **Danger variant** — Delete record, sync `onConfirm`.
3. **Async (success)** — `onConfirm` returns a Promise that resolves after a fake 1.5s delay; visually confirms the pending spinner.
4. **Async (failure)** — `onConfirm` returns a Promise that rejects after 1s; visually confirms the popover stays open + buttons re-enable.
5. **Inside a DropdownMenu** — kebab-menu's Delete item opens a ConfirmationPopover.

## Docs

### JSDoc (Rule 7)

Every exported member gets full JSDoc:

- `Popover` (the namespace) — one-paragraph description + 2–3 `@example` blocks + `@remarks When NOT to use` + `@remarks Anti-patterns`. Uses the rule-7 pattern Tooltip established.
- `PopoverRoot` (internal) — keep JSDoc minimal; the public API is the namespace.
- Each sub-component (`Trigger`, `Content`, `Heading`, `Close`) — one paragraph + canonical snippet.
- `ConfirmationPopover` — full prose with 2–3 examples (canonical, danger variant, async).
- Every prop in every interface.
- Both exported union types (`PopoverSide`, `PopoverAlign`, `ConfirmationVariant`).

### `AGENTS.md`

Two new TL;DR sections after the Tooltip section, mirroring its shape:

- `<Popover>` — compound API, snippets, props summary, dismissal contract, focus behavior, z-popover token.
- `<ConfirmationPopover>` — opinionated preset, snippets (default + danger), async-aware contract, anti-pattern callouts.

Token table updated with `--z-popover` and `--size-popover-min-width`.

Anti-patterns table extended:

- `<Popover><DisabledThing /></Popover>` → disabled buttons don't fire click; use `aria-disabled` or wrap in a span.
- Putting required action confirmation in a Popover that can be dismissed by click-outside → use `<ConfirmationPopover>` (blocks dismissal while pending) or a Modal.
- `<Popover.Content>` with no `<Popover.Close>` button AND content that isn't dismissable by clicking outside → keyboard / screen-reader users have no obvious close affordance. Add a `<Popover.Close>` close button or document why outside-click is enough.

### `README.md`

Two new rows in the components table, format-matched to existing rows.

## Risks & mitigations

- **Focus ordering between PopoverRoot's focus-on-open and ConfirmationPopover's focus-on-Cancel.** Both use `useLayoutEffect`. React fires child effects before parent effects, so PopoverRoot's effect (in `Content.tsx`) runs first, then ConfirmationPopover's. Net: panel focuses first, then Cancel gets focus — correct. The plan must verify this with a test that asserts `document.activeElement` after open is the Cancel button. If the test reveals timing brittleness, fall back to `queueMicrotask`.
- **`useFloating` runs unconditionally even when `isEmpty` / not open.** Same pattern Tooltip uses; safe because the hook returns stable refs/styles regardless of `open`. Only the portal render is gated by `open`.
- **Popover with no focusable content** — Tab inside the panel finds nothing focusable and walks straight out. Escape still works because the panel itself has `tabIndex={-1}` and receives focus on open. Verified by test #23.
- **`<Popover.Trigger>` child that doesn't accept a ref** — same forwardRef-required contract as DropdownMenu and Tooltip. Throws at runtime; documented as anti-pattern.
- **Multiple `<Popover.Heading>` instances inside one `<Popover.Content>`** — the second mount overwrites `headingId`. Behavior: `aria-labelledby` points at the last-mounted heading. Acceptable — having two headings is itself an anti-pattern; we document it but don't enforce.
- **`onConfirm` that never settles** — Promise that hangs forever. The popover would stay pending forever. v1 accepts this; the consumer is responsible for adding their own timeout if needed. Documented as a consumer-responsibility note in the JSDoc.
- **ConfirmationPopover with controlled `open`** — when the consumer provides `open`, our internal `pending`-check still works because we wrap their `onOpenChange`. But the consumer could force-close from outside while we're pending. Documented as: "If you provide `open`/`onOpenChange`, ConfirmationPopover cannot block your external close; coordinate `pending` state in your own code."

## Acceptance

- `make test` green: existing suite + ~25 Popover tests + ~15 ConfirmationPopover tests.
- `make build-lib`, `npm run typecheck -w playground`, `make lint`, `make build`, `npm pack --dry-run -w @eocrm/design-system` all green.
- Visual in `make up`:
  - `/components/popover` shows all 6 examples; arrow tracks each side; Tab walks out of the panel; Escape closes; outside-click closes; `<Popover.Close>` buttons close.
  - `/components/confirmation-popover` shows all 5 examples; pending spinner appears during async; failure leaves popover open + buttons re-enabled; Cancel button has initial focus.
  - DevTools → emulate `prefers-reduced-motion: reduce` → both components appear instantly.
- Hard Rule 8 pre-push review-fix loop completes with verdict `clean enough to stop`.

## Open decisions deferred to implementation

- Exact arrow rendering recipe (clip-path vs rotated span with synthetic borders vs inline SVG). All three work; choice made when wiring against real chrome.
- Whether ConfirmationPopover's `Spinner` is inline SVG with CSS rotation or a CSS-only `border` spinner. Both fine; pick during implementation.
- Whether ConfirmationPopover internally hoists open state (with controlled-or-uncontrolled hybrid) or finds another coordination pattern to close-after-resolve. The plan must pick one and verify focus return works.
