import { useId, useLayoutEffect, useState } from 'react';

export type OverlayStackMode = 'replace' | 'overlay';

interface Entry {
  id: string;
  mode: OverlayStackMode;
}

// Internal ordered list of open overlay entries, most-recently-registered last.
const stack: Entry[] = [];
const listeners = new Set<() => void>();
const floating = new Set<string>();
// Escape events already handled (surface closed on them). Order-independent
// complement to the registry: a re-render can re-register a surface's
// document-capture listener AHEAD of its host's (effects re-fire child-
// first), so the surface may close + unregister within the same press —
// the host must still yield to a consumed event. WeakSet: no leaks.
const consumedEscapes = new WeakSet<Event>();

// Open floating surfaces (Select listbox, Popover, DropdownMenu levels,
// date/time popovers, Rail flyout). Hosts' Escape handlers yield while any
// is open so a single press closes the innermost surface, not the host too
// (#274). A Set of ids — surfaces have no meaningful order; their own
// (later-registered) capture listeners close them innermost-first already.

function notify() {
  for (const fn of listeners) fn();
}

function indexOf(id: string): number {
  return stack.findIndex((e) => e.id === id);
}

function depthOf(id: string): number {
  return indexOf(id);
}

function topEntry(): Entry | null {
  return stack.length === 0 ? null : stack[stack.length - 1]!;
}

/**
 * Module-level singleton tracking open overlay ids in registration order.
 * Each overlay (Modal, Drawer) calls `register` on open and `unregister` on close. Depth is
 * the overlay's index in the open-stack (0 = bottom, length-1 = top).
 * Subscribers are notified after every register/unregister so consumers
 * can re-derive `isTop` / `depth` / `topMode`.
 */
export const overlayStack = {
  /**
   * Register this overlay. If already present, update its mode in place
   * (handles a parent re-render where stackMode prop changed).
   */
  register(id: string, mode: OverlayStackMode): number {
    const idx = indexOf(id);
    if (idx === -1) {
      stack.push({ id, mode });
    } else {
      stack[idx]!.mode = mode;
    }
    notify();
    return depthOf(id);
  },
  unregister(id: string): void {
    const idx = indexOf(id);
    if (idx >= 0) {
      stack.splice(idx, 1);
      notify();
    }
  },
  isTop(id: string): boolean {
    return topEntry()?.id === id;
  },
  topDepth(): number {
    return stack.length;
  },
  topMode(): OverlayStackMode | null {
    return topEntry()?.mode ?? null;
  },
  depthOf,
  /** Register an open floating surface (Escape-yield participant, #274). */
  registerFloating(id: string): void {
    floating.add(id);
  },
  unregisterFloating(id: string): void {
    floating.delete(id);
  },
  /** True while any floating surface is open — hosts yield Escape to it. */
  hasOpenFloating(): boolean {
    return floating.size > 0;
  },
  /** A closing surface marks its Escape so hosts yield even when the
   *  surface's listener ran first (registration order is not stable). */
  consumeEscape(e: Event): void {
    consumedEscapes.add(e);
  },
  wasEscapeConsumed(e: Event): boolean {
    return consumedEscapes.has(e);
  },
  /** Subscribe to register/unregister notifications. Returns unsubscribe. */
  _subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  /** Test-only escape hatch. */
  _reset(): void {
    stack.length = 0;
    listeners.clear();
    floating.clear();
  },
};

export interface OverlayStackState {
  /** Current depth in the stack, or null if not registered. */
  depth: number | null;
  /** True iff this overlay is the topmost open overlay. */
  isTop: boolean;
  /** Mode of the current top overlay (null if stack is empty). */
  topMode: OverlayStackMode | null;
}

/**
 * Register/unregister this overlay in the singleton stack while `active` is
 * true. Returns the current depth, whether this overlay is on top, and the
 * top overlay's stackMode. Subscribes to stack mutations so state stays
 * accurate when sibling overlays open/close.
 */
export function useOverlayStack(
  id: string,
  active: boolean,
  mode: OverlayStackMode,
): OverlayStackState {
  // Lazy initializer pre-computes the post-registration state so the FIRST
  // render of an opened overlay already has correct `topMode` / `isTop` /
  // `depth`. Without this, paint and stack-position attributes would be
  // wrong on the first paint (transparent overlay flash, etc.). The actual
  // register() still happens in useLayoutEffect; this is read-only.
  const [state, setState] = useState<OverlayStackState>(() => {
    if (!active) return { depth: null, isTop: false, topMode: null };
    return {
      depth: overlayStack.topDepth(),
      isTop: true,
      topMode: mode,
    };
  });

  // useLayoutEffect (not useEffect) so registration + state sync happen
  // synchronously after commit, before the browser paints. Prevents a
  // one-frame flash of the wrong overlay attributes.
  useLayoutEffect(() => {
    if (!active) {
      setState({ depth: null, isTop: false, topMode: null });
      return;
    }
    overlayStack.register(id, mode);
    const sync = () => {
      setState({
        depth: overlayStack.depthOf(id),
        isTop: overlayStack.isTop(id),
        topMode: overlayStack.topMode(),
      });
    };
    sync();
    const unsubscribe = overlayStack._subscribe(sync);
    return () => {
      unsubscribe();
      overlayStack.unregister(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mode handled by separate effect below to avoid tear-down on mode change
  }, [id, active]);

  // Update mode in place without tearing down the entry. overlayStack.register
  // handles existing entries by updating their mode and re-notifying.
  useLayoutEffect(() => {
    if (!active) return;
    overlayStack.register(id, mode);
  }, [id, active, mode]);

  return state;
}

/**
 * Register this floating surface in the Escape-yield registry while `open`
 * (#274). Hosts (Modal/Drawer/Lightbox) skip their Escape-close while any
 * surface is registered, so the surface's own capture listener — which runs
 * later in the same keydown (registration order) — closes it instead; the
 * next press reaches the host. Layout effect: the registration must be
 * observable before the browser can deliver the next keydown.
 */
export function useFloatingSurface(open: boolean): void {
  const id = useId();
  useLayoutEffect(() => {
    if (!open) return;
    overlayStack.registerFloating(id);
    return () => {
      overlayStack.unregisterFloating(id);
    };
  }, [id, open]);
}
