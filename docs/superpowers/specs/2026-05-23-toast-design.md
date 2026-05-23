# Toast — design spec

**Date:** 2026-05-23
**Branch:** `feat/toast`
**Scope:** New `Toast` component for `@eocrm/design-system` — imperative transient notification primitive with portal-based rendering, 6 positions, 5 tones, queue/stack management, auto-dismiss with pause-on-hover/focus, action slot, programmatic update, `toast.promise()` sugar, and `prefers-reduced-motion` support.

## Goal

Provide a single global notification primitive that any consumer code can fire from anywhere — event handlers, async flows, error boundaries — without threading providers or hooks. The runtime is a vanilla observable store; the React surface is one `<ToastViewport>` component mounted at the app root. Tone-prefixed shorthands (`toast.success`, `toast.error`) cover the common cases; programmatic update + promise sugar covers async flows; an action slot covers undo/retry.

## Why now

- The CRM has open-coded notification UI in multiple places: inline alerts under forms, ad-hoc `<div>`s in the topbar, plain `alert()` calls during prototypes. None are consistent and none survive route changes.
- Async flows (save, upload, send) need a "Uploading…" → "Uploaded" pattern that has no current primitive.
- Errors that need user acknowledgement are currently swallowed or shown as inline text — Toast with `duration: 'persistent'` + `role="alert"` is the right shape.
- The token reserve already has `--z-toast: 1200` waiting for this exact use.

## Non-goals (v1)

- **No alternate visual treatments.** One look — white card, accent stripe, shadow. No "filled" variant matching the tone background; no outlined variant. Defer until requested.
- **No grouping/threading.** Each toast is independent. No "5 errors collapsed into one" UI.
- **No keyboard hotkey to focus the viewport.** Sonner adds `Alt+T`; we skip until requested. Toasts remain reachable via natural tab order.
- **No richest-content slots.** Description accepts `ReactNode`, but we don't expose explicit "header / body / footer" slots like Modal. Toasts are short by design.
- **No swipe-to-dismiss.** Desktop primary; touch gestures deferred.
- **No vertical-stacking direction prop.** Direction is auto from the position (top-anchored stacks grow downward; bottom-anchored grow upward).
- **No undo timer on the action.** The action button just fires its `onClick` and dismisses the toast — no "undo expires in 3s" timer ring. If a consumer needs that, they can compose with the `duration` prop.
- **No persistence across reloads.** Pure in-memory.
- **No theming hooks beyond the existing tokens.** No `<ToastViewport theme={...}>` override. If a consumer needs different colors, they layer CSS over the existing tokens.

## Architecture

### Dependencies

No new packages. Reuses:
- React + ReactDOM (peer)
- `lucide-react` (already a peer dep) for default tone icons: `Info`, `CheckCircle2`, `AlertTriangle`, `XCircle`, `Loader2`
- Existing tokens: `--z-toast`, `--shadow-md`, `--shadow-lg`, `--radius-md`, `--space-*`, `--color-fg-*` (info/success/warning/danger/muted), `--color-bg`, `--color-fg`, `--font-size-md`, `--font-size-sm`, `--font-weight-medium`, `--transition-base`

Animation durations (300ms enter, 250ms exit, 200ms reflow) are hardcoded — they're meaningfully longer than `--transition-base: 140ms` because slide-in is more visible and 140ms feels too abrupt. We can token-ify later if a second component needs the same scale.

### File layout

```
packages/design-system/src/components/Toast/
  store.ts              ← Vanilla observable store: add/update/dismiss/dismissAll/subscribe. NO React imports. Pure JS singleton.
  store.test.ts         ← Unit tests for store mechanics (no DOM, no React).
  api.ts                ← Public `toast` singleton: tones, promise(), update(), dismiss(). Thin wrapper over store.
  api.test.ts           ← Tests the public API shape + tone-to-store-payload mapping.
  useToastTimer.ts      ← Custom hook: per-toast timeout with pause-on-hover/focus/document-hidden.
  Toast.tsx             ← Internal <Toast> renders one entry. Owns toast card markup, role="status"/role="alert" branching, action button, close button.
  ToastViewport.tsx     ← Exported. Portal + 6 position sub-stacks. Subscribes via useSyncExternalStore. Owns position + animation state + hover-expand state.
  Toast.module.scss     ← Card + viewport positioning + 6 position variants + slide animations (per direction).
  Toast.test.tsx        ← <ToastViewport> rendering + integration tests with userEvent + fake timers.
  index.ts              ← exports `toast`, `ToastViewport`, types
```

Plus standard integration points:

- `packages/design-system/src/index.ts` — re-export `toast`, `ToastViewport`, types
- `packages/design-system/AGENTS.md` — TL;DR slot after EmptyState
- `packages/playground/src/pages/components/ToastDemo.tsx` — 8-example demo
- `packages/playground/src/App.tsx` — route + viewport mount at app root
- `packages/playground/src/layout/AppShell/AppShell.tsx` — sidebar entry (create new "Feedback" group; siblings: Skeleton, EmptyState)
- `packages/playground/src/pages/components/ComponentsIndex.tsx` — overview card
- `packages/playground/src/pages/mockups/registry.ts` — `'Toast'` in `ComponentName` union

### Composition

```
        Consumer code                  (no React import needed)
              │
              ▼
        toast.success("Saved") ────►  store.add({ tone, message, ... })
                                          │
                                          │ store notifies subscribers
                                          ▼
                              <ToastViewport> (subscribed via useSyncExternalStore)
                                          │
                                          ▼
                              createPortal → 6 position regions → <Toast> nodes
```

The store + API are pure JS — testable without React. The viewport is the only React surface. Consumers see exactly two public symbols: `toast` and `<ToastViewport />`.

## Public API

```ts
// ─── Tone shorthands (most common) ─────────────────────────────────────
toast.success(message: string, options?: ToastOptions): string
toast.error(message: string, options?: ToastOptions): string
toast.warning(message: string, options?: ToastOptions): string
toast.info(message: string, options?: ToastOptions): string
toast.loading(message: string, options?: ToastOptions): string
// `loading` defaults to `duration: 'persistent'` — clears via update or dismiss.

// ─── Untoned default (tone: 'info') ────────────────────────────────────
toast(message: string, options?: ToastOptions): string

// ─── Programmatic update ───────────────────────────────────────────────
toast.update(id: string, partial: ToastUpdateOptions): void
// where:
//   type ToastUpdateOptions = Partial<Omit<ToastOptions, 'id'>> & {
//     message?: ReactNode;
//     tone?: ToastTone;
//   };
// (id, createdAt, status are internal-only — not consumer-settable)
// Or use the `id` option on a tone shorthand to update in place:
const id = toast.loading('Uploading…');
toast.success('Uploaded', { id });   // mutates the existing entry instead of adding a new one

// ─── Promise sugar (Sonner-style) ──────────────────────────────────────
toast.promise<T>(promise: Promise<T>, msgs: {
  loading: string;
  success: string | ((value: T) => string);
  error: string | ((err: unknown) => string);
  options?: Omit<ToastOptions, 'duration'>;
}): Promise<T>
// Returns the original promise unmodified, so consumers can chain `.then`/`await`.

// ─── Dismissal ─────────────────────────────────────────────────────────
toast.dismiss(id: string): void   // dismiss a specific toast
toast.dismiss(): void             // dismiss ALL toasts
```

**Types:**
```ts
type ToastTone = 'info' | 'success' | 'warning' | 'error' | 'loading';

type ToastPosition =
  | 'top-left'    | 'top-center'    | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface ToastOptions {
  /** Optional second-line content. Accepts `ReactNode` so you can embed links/icons. */
  description?: ReactNode;
  /** Auto-dismiss timeout (ms) or `'persistent'` for no auto-dismiss. Default: 4000. */
  duration?: number | 'persistent';
  /** Per-call override of the viewport's default position. */
  position?: ToastPosition;
  /** Assign a stable id (else auto-generated). Reusing an existing id triggers `update`. */
  id?: string;
  /** Single primary action button rendered inside the toast. */
  action?: { label: string; onClick: () => void };
  /** Show the close (×) button. Default: true. Forced `true` when `duration: 'persistent'`. */
  dismissible?: boolean;
  /** Override the tone's default icon. Pass `null` to hide. */
  icon?: ReactNode | null;
}

interface ToastViewportProps {
  /** Default position for toasts that don't specify one. Default: 'bottom-right'. */
  position?: ToastPosition;
  /** Default duration for toasts without explicit duration. Default: 4000. */
  duration?: number;
  /** How many toasts are fully visible at once per position bucket. Default: 3. Beyond this, toasts render as collapsed peek-cards behind the visible stack. */
  maxVisible?: number;
  /** Spacing between stacked toasts. Default: 'sm' (8px). */
  gap?: 'sm' | 'md';
  /** false (default): collapsed stack with peek-cards behind, hover to fan out. true: always fanned. */
  expand?: boolean;
}
```

**All `toast.x()` calls return the toast id (string).** This is what consumers use for `update()` / `dismiss(id)`. Auto-generated ids are nanoid-style short strings; consumers may pass their own via `options.id`.

**No exported `Toast` component.** The internal `<Toast>` is implementation detail. The only React export is `<ToastViewport>`.

## Architecture flow

### Store (`store.ts`)

Vanilla JS module, no React:

```ts
type Listener = () => void;

interface ToastEntry {
  id: string;
  tone: ToastTone;
  message: ReactNode;
  description?: ReactNode;
  duration: number | 'persistent';
  position: ToastPosition;
  action?: { label: string; onClick: () => void };
  dismissible: boolean;
  icon?: ReactNode | null;
  createdAt: number;
  status: 'visible' | 'exiting';   // 'entering' is a CSS-only state on the DOM
}

interface StoreState {
  toasts: ToastEntry[];
}

// Internal state + listener set
let state: StoreState = { toasts: [] };
const listeners = new Set<Listener>();

export const store = {
  getSnapshot: (): StoreState => state,
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  add(entry: Omit<ToastEntry, 'createdAt' | 'status'>): string {
    if (state.toasts.some((t) => t.id === entry.id)) {
      // Reusing an id is an implicit update.
      return store.update(entry.id, entry);
    }
    state = {
      toasts: [...state.toasts, { ...entry, createdAt: Date.now(), status: 'visible' }],
    };
    notify();
    return entry.id;
  },
  update(id: string, partial: Partial<ToastEntry>): string {
    state = {
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, ...partial } : t)),
    };
    notify();
    return id;
  },
  dismiss(id?: string): void {
    if (id === undefined) {
      // Mark all as exiting; full removal happens after exit-animation timeout (~250ms)
      state = { toasts: state.toasts.map((t) => ({ ...t, status: 'exiting' })) };
      notify();
      setTimeout(() => {
        state = { toasts: [] };
        notify();
      }, 250);
      return;
    }
    state = {
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, status: 'exiting' } : t)),
    };
    notify();
    setTimeout(() => {
      state = { toasts: state.toasts.filter((t) => t.id !== id) };
      notify();
    }, 250);
  },
};

function notify() {
  listeners.forEach((l) => l());
}

// id generator — short, URL-safe, no external dep
let nextId = 0;
export function generateId(): string {
  return `t${Date.now().toString(36)}${(++nextId).toString(36)}`;
}
```

**Key choices:**
- `add` with an existing id delegates to `update` — this is what makes the `toast.success('done', { id: existingId })` pattern work.
- `dismiss` does a two-step (mark exiting → remove after 250ms) so the viewport can play the exit animation before the DOM unmounts.
- IDs are timestamp-based; no nanoid dependency.

### API (`api.ts`)

```ts
import { store, generateId } from './store';

function buildEntry(
  tone: ToastTone,
  message: ReactNode,
  options: ToastOptions = {},
  defaults: { duration: number; position: ToastPosition }
): Omit<ToastEntry, 'createdAt' | 'status'> {
  const isLoading = tone === 'loading';
  const duration = options.duration ?? (isLoading ? 'persistent' : defaults.duration);
  const isPersistent = duration === 'persistent';
  return {
    id: options.id ?? generateId(),
    tone,
    message,
    description: options.description,
    duration,
    position: options.position ?? defaults.position,
    action: options.action,
    // Persistent toasts force dismissible: true (so the user has a way out).
    // Otherwise consumer override wins; default true.
    dismissible: isPersistent ? true : (options.dismissible ?? true),
    icon: options.icon,
  };
}

// Note: defaults are read from the viewport via a tiny "config" sub-store
// that ToastViewport writes to on mount/update. This is how we let viewport
// props (position, duration) influence the API without a React context.

interface ViewportConfig { position: ToastPosition; duration: number; }
let viewportConfig: ViewportConfig = { position: 'bottom-right', duration: 4000 };
export function _setViewportConfig(cfg: ViewportConfig) { viewportConfig = cfg; }

function fire(tone: ToastTone, message: ReactNode, options?: ToastOptions): string {
  return store.add(buildEntry(tone, message, options, viewportConfig));
}

export const toast = Object.assign(
  (message: string, options?: ToastOptions) => fire('info', message, options),
  {
    info: (m: string, o?: ToastOptions) => fire('info', m, o),
    success: (m: string, o?: ToastOptions) => fire('success', m, o),
    warning: (m: string, o?: ToastOptions) => fire('warning', m, o),
    error: (m: string, o?: ToastOptions) => fire('error', m, o),
    loading: (m: string, o?: ToastOptions) => fire('loading', m, o),
    update: (id: string, partial: Partial<ToastEntry>) => store.update(id, partial),
    dismiss: (id?: string) => store.dismiss(id),
    promise: <T>(p: Promise<T>, msgs: {
      loading: string;
      success: string | ((v: T) => string);
      error: string | ((e: unknown) => string);
      options?: Omit<ToastOptions, 'duration'>;
    }): Promise<T> => {
      const id = fire('loading', msgs.loading, msgs.options);
      return p.then(
        (v) => {
          const successMsg = typeof msgs.success === 'function' ? msgs.success(v) : msgs.success;
          store.update(id, { tone: 'success', message: successMsg, duration: viewportConfig.duration, status: 'visible' });
          return v;
        },
        (err) => {
          const errorMsg = typeof msgs.error === 'function' ? msgs.error(err) : msgs.error;
          store.update(id, { tone: 'error', message: errorMsg, duration: viewportConfig.duration, status: 'visible' });
          throw err;
        }
      );
    },
  }
);
```

**On `_setViewportConfig`:** the API needs the viewport's default position + duration but the API can't depend on React. Solution is a tiny mutable config slot the viewport writes to on mount. If no viewport mounts, config stays at the constants (`'bottom-right'`, `4000`), which is the right behavior anyway.

### useToastTimer (`useToastTimer.ts`)

Hook used by each `<Toast>` to manage its dismiss timer. Encapsulates pause/resume math.

```ts
interface TimerControls {
  pause: () => void;
  resume: () => void;
}

function useToastTimer(args: {
  id: string;
  duration: number | 'persistent';
  onDismiss: () => void;
}): TimerControls {
  // Internals:
  // - if duration === 'persistent', no-op
  // - else: setTimeout, store expectedEnd. pause(): clearTimeout, capture remaining.
  //   resume(): setTimeout(onDismiss, remaining)
  // - On `document.visibilityState === 'hidden'`, pause; on visible, resume.
  //   (Subscribed via document.addEventListener once per hook instance.)
  // - On unmount, clearTimeout + remove visibility listener.
  // - Indirection: use a getVisibility() function so tests can mock without
  //   poking at the read-only document.visibilityState property in jsdom.
}
```

### Toast (`Toast.tsx`)

Internal one-toast component. Receives an entry + viewport-level config (max-visible position, expand state).

Owns:
- The card markup
- `role="alert"` for `tone: 'error'`, `role="status"` for everything else
- `aria-live="assertive"` paired with role="alert" (technically redundant since `role="alert"` implies assertive, but explicit is fine and matches Radix); `aria-live="polite"` for status
- Mounting `data-status="visible"` / `data-status="exiting"` for the CSS animation hook
- Hover/focus handlers that call `timer.pause()` / `timer.resume()` (the viewport wires these up across all toasts inside it — see below)
- Action button rendering (when present): `<button onClick={() => { entry.action.onClick(); store.dismiss(entry.id); }}>{entry.action.label}</button>`
- Close button (×) — when `entry.dismissible` is true OR `entry.duration === 'persistent'`
- Spread order: Pattern B (component owns ARIA contract — `role`, `aria-live`, `data-*` cannot be overridden by consumer props)

### ToastViewport (`ToastViewport.tsx`)

Exported. The single React entry point.

Owns:
- Subscribing to `store` via `useSyncExternalStore`
- Pushing its `position`/`duration` defaults to `_setViewportConfig` on mount + on prop change
- Dev-warning if a second viewport mounts (uses a module-level counter)
- Creating the portal — `createPortal` into `document.body` (or `props.container` if we want to expose that — not in v1)
- Splitting the toasts array into 6 buckets by `position`
- Rendering 6 sub-stack `<ol>` elements with `data-position={key}`. Empty buckets render nothing.
- Hover-expand state per bucket: `isHovered: Set<ToastPosition>` — when a bucket is hovered, render its stack expanded; otherwise collapsed (unless `props.expand`).
- `aria-label="Notifications"` on each rendered stack `<ol>` for landmark navigation.

```tsx
function ToastViewport({
  position = 'bottom-right',
  duration = 4000,
  maxVisible = 3,
  gap = 'sm',
  expand = false,
}: ToastViewportProps) {
  // Dev-warn second viewport
  useDevWarnSecondViewport();

  // Push config to API
  useEffect(() => { _setViewportConfig({ position, duration }); }, [position, duration]);

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const buckets = groupByPosition(state.toasts);   // { 'top-left': [...], ... }

  return createPortal(
    <>
      {POSITIONS.map((pos) => buckets[pos]?.length ? (
        <ol
          key={pos}
          className={clsx(styles.stack, styles[`pos-${pos}`], styles[`gap-${gap}`])}
          aria-label="Notifications"
          data-position={pos}
          data-expanded={expand || hovered.has(pos) ? 'true' : 'false'}
          onMouseEnter={() => setHovered(prev => new Set(prev).add(pos))}
          onMouseLeave={() => setHovered(prev => { const next = new Set(prev); next.delete(pos); return next; })}
        >
          {buckets[pos].map((t, idx) => (
            <Toast
              key={t.id}
              entry={t}
              indexFromEdge={idx}
              maxVisible={maxVisible}
            />
          ))}
        </ol>
      ) : null)}
    </>,
    document.body
  );
}
```

**Stack direction is encoded in SCSS** via `flex-direction`:
- Top positions: `flex-direction: column` — first child is closest to top edge, last child further from edge
- Bottom positions: `flex-direction: column-reverse` — last child is closest to bottom edge

Combined with the `createdAt`-sorted store array, this puts the newest toast nearest the screen edge in both cases without any JS sorting on render.

## Styling — `Toast.module.scss`

```scss
@use '../../styles/mixins' as *;

// ─── Viewport stacks ─────────────────────────────────────────────────────
.stack {
  position: fixed;
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
  pointer-events: none;       // stack itself doesn't intercept clicks
  max-width: calc(100vw - 2 * var(--space-3));
  width: 360px;
}

.stack > li { pointer-events: auto; }   // individual toasts do

// 6 position variants
.pos-top-left    { top: var(--space-3); left: var(--space-3); }
.pos-top-center  { top: var(--space-3); left: 50%; transform: translateX(-50%); }
.pos-top-right   { top: var(--space-3); right: var(--space-3); }
.pos-bottom-left { bottom: var(--space-3); left: var(--space-3); flex-direction: column-reverse; }
.pos-bottom-center { bottom: var(--space-3); left: 50%; transform: translateX(-50%); flex-direction: column-reverse; }
.pos-bottom-right { bottom: var(--space-3); right: var(--space-3); flex-direction: column-reverse; }

.gap-sm > li + li { margin-top: var(--space-2); }
.gap-md > li + li { margin-top: var(--space-3); }

// Bottom-anchored stacks: gap goes the other way
.pos-bottom-left.gap-sm > li + li,
.pos-bottom-center.gap-sm > li + li,
.pos-bottom-right.gap-sm > li + li { margin-top: 0; margin-bottom: var(--space-2); }
// (and md variant)

// ─── Toast card ─────────────────────────────────────────────────────────
.toast {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-2);
  align-items: start;
  padding: var(--space-3);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  border-left: 3px solid var(--color-fg-muted);   // overridden per tone
}

.tone-info     { border-left-color: var(--color-fg-info); }
.tone-success  { border-left-color: var(--color-fg-success); }
.tone-warning  { border-left-color: var(--color-fg-warning); }
.tone-error    { border-left-color: var(--color-fg-danger); }
.tone-loading  { border-left-color: var(--color-fg-muted); }

.icon { color: var(--color-fg-muted); }
.tone-info .icon    { color: var(--color-fg-info); }
.tone-success .icon { color: var(--color-fg-success); }
.tone-warning .icon { color: var(--color-fg-warning); }
.tone-error .icon   { color: var(--color-fg-danger); }
// loading icon spins via animation

.message {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--color-fg);
  line-height: 1.4;
}

.description {
  font-size: var(--font-size-sm);
  color: var(--color-fg-muted);
  margin-top: var(--space-1);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.action {
  // tone-colored compact button
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-fg);
  cursor: pointer;
}
.action:focus-visible { @include focus-ring; outline: none; }

.close {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-fg-muted);
  padding: 0;
  display: grid;
  place-items: center;
}
.close:hover { color: var(--color-fg); }
.close:focus-visible { @include focus-ring; outline: none; }

// ─── Animations ─────────────────────────────────────────────────────────
.toast[data-status='visible']  { animation: enter 300ms cubic-bezier(0.22, 1, 0.36, 1); }
.toast[data-status='exiting']  { animation: exit 250ms ease-in forwards; }

// Slide direction varies by position — defined as 6 keyframes
@keyframes enter-from-right { from { transform: translateX(30px); opacity: 0; } }
// ...etc per direction

// Reflow animation when stack shifts after a dismissal
.toast { transition: transform 200ms ease-out; }

// Peek-collapsed: toasts beyond maxVisible
.toast[data-peek='true'] {
  transform: scale(0.95) translateY(8px);
  opacity: 0.6;
  pointer-events: none;
}
.stack[data-expanded='true'] .toast[data-peek='true'] {
  transform: none;
  opacity: 1;
  pointer-events: auto;
}

// Reduced motion: kill all animations
@media (prefers-reduced-motion: reduce) {
  .toast,
  .toast[data-status='visible'],
  .toast[data-status='exiting'] {
    animation: none;
    transition: none;
  }
}

// Loading spin
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
```

**Rule 4 check:** Every component-internal `position`, `margin`, `transform` here is either on the viewport (which is layout-by-design — it's a fixed-position container, not a flow component) or on the toast for animation purposes. The toast card itself doesn't claim layout space in any parent grid. Documented as "viewport owns its own positioning" exception.

## ARIA + behavior reference

| Concern | Behavior |
|---|---|
| Live region announcement | Each toast renders with `role="status"` (polite) or `role="alert"` (assertive, error only). SR announces on insertion. |
| Focus management | Never auto-focus. Toasts reachable via natural Tab order. |
| Pause-on-hover | Pointer entering the viewport stack pauses ALL timers in that bucket. Leaving resumes. |
| Pause-on-focus | Focusing any element inside a toast (action / close) pauses that toast's timer. Blurring resumes. |
| Pause when hidden | `document.visibilityState === 'hidden'` pauses all timers. Becoming visible resumes. |
| Reduced motion | `prefers-reduced-motion: reduce` disables enter/exit/reflow animations; toasts appear/disappear instantly. |
| Multiple viewports | First viewport renders; subsequent ones render `null` and log a dev warning. |
| Mount-before-viewport | Toasts fired before viewport mounts sit in the store, render on mount. |
| Close button visibility | Shown when `dismissible: true` (default) OR `duration: 'persistent'`. Hidden when consumer passes `dismissible: false` and a finite duration. |

## Testing

**Coverage by file:**

`store.test.ts` (~15 cases, no DOM):
- `add()` returns id and appends; auto-generates id if not provided
- `add()` with existing id is treated as `update`
- `update(id, partial)` mutates entry; unknown id is no-op
- `dismiss(id)` marks exiting then removes after 250ms
- `dismiss()` clears all
- `subscribe(listener)` fires on every state change; returns unsub
- IDs are unique across 1000 rapid `add()` calls

`api.test.ts` (~10 cases):
- Each tone shorthand writes the right `tone` field
- `loading` defaults to `duration: 'persistent'`
- `update(id, partial)` calls store.update
- `dismiss()` and `dismiss(id)` both delegate
- `promise(p, msgs)` writes loading, then success on resolve, error on reject
- `promise()` returns the original promise (chain-through works)
- `_setViewportConfig` controls the defaults used by subsequent fires

`Toast.test.tsx` (~20 cases, RTL + userEvent + fake timers):
- Renders nothing when store is empty
- Adding a toast renders one card with the message
- All 5 tones render with the right class + icon
- `role="alert"` only for error tone; `role="status"` for others
- Auto-dismisses after `duration` ms
- `duration: 'persistent'` does not auto-dismiss
- Pause-on-hover: timer advances while hovered → no dismiss
- Pause-on-focus: tabbing into the action button pauses
- Document-hidden pauses globally (via mocked `getVisibility()`)
- Action button click fires onClick AND dismisses
- Close button (×) dismisses
- `toast.dismiss(id)` dismisses programmatically
- `toast.update(id, ...)` mutates the rendered card
- 2 toasts → 2 cards in the right position bucket
- Per-call `position` routes to the right bucket
- `maxVisible: 2` with 4 toasts → 2 visible + 2 peek-collapsed via `data-peek="true"`
- Hovering the stack expands peek-collapsed toasts (`data-expanded="true"`)
- `expand: true` keeps stack fanned without hover
- `prefers-reduced-motion`: no enter animation (computed style)
- `toast.promise()` loading → success on resolve
- Two `<ToastViewport>` mounted: only first renders, console.error called

**Vitest fake-timer specifics:**
- `vi.useFakeTimers()` in `beforeEach`, `vi.useRealTimers()` in `afterEach`
- Use `await act(() => vi.advanceTimersByTime(ms))` to flush both timer + React effects
- Reset store between tests via a `store._reset()` test helper (export-only, no public API)

## Playground demo — `ToastDemo.tsx`

8 buttons grouped into sections:

1. **Tone gallery** — 5 buttons firing each tone with a representative message
2. **With description** — `toast.success('Saved', { description: 'Your changes are now live.' })`
3. **Action slot (Undo)** — fires `toast.success('Item deleted', { action: { label: 'Undo', onClick: () => toast.info('Restored') } })`
4. **Programmatic update** — button fires `const id = toast.loading('Uploading…')`, sets a setTimeout to `toast.success('Uploaded', { id })` after 2s
5. **`toast.promise()`** — button kicks off a 2s fake promise (50% resolve / 50% reject) with all three messages wired
6. **Persistent error** — fires `toast.error('Request failed', { duration: 'persistent' })`
7. **Per-call position override** — 4 buttons each firing into a different position (top-right, top-center, bottom-left, bottom-center)
8. **Burst** — fires 7 toasts in rapid succession to show stacking + maxVisible + hover-to-expand

The viewport mounts once in `App.tsx`, at app root, position default `bottom-right`, maxVisible 3, expand false. All demo buttons share that one viewport.

## AGENTS.md TL;DR slot

After EmptyState. Section title `### Toast`. One ~30-line block showing:

```tsx
// Mount once at app root
<ToastViewport position="bottom-right" />

// Fire from anywhere
toast.success('Saved');
toast.error('Request failed', { description: err.message });
toast.success('Item deleted', { action: { label: 'Undo', onClick: restore } });

// Async sugar
toast.promise(api.upload(file), {
  loading: 'Uploading…',
  success: (r) => `Uploaded ${r.name}`,
  error: (e) => `Failed: ${e.message}`,
});

// Update in place
const id = toast.loading('Saving…');
await api.save();
toast.success('Saved', { id });
```

## Open questions (none)

All clarifications made during brainstorming are baked in above. Locked decisions:
- All 6 positions supported; default `bottom-right`; per-call override available but documented as an escape hatch.
- 5 tones; `role="alert"` only for `error`; warning stays polite.
- Action slot + close button + persistent + promise + update — all in scope.
- maxVisible: 3 default, hover-to-expand collapsed peek-cards beneath.
- `expand: false` default.
- No new tokens.

## Hard Rule 8 closeout (executed during plan Task 5)

Pre-push review-fix cycle with fresh-context reviewers, repeated until 0 Critical + 0 Important. Gates green (test, typecheck, stylelint, build) before each review round.
