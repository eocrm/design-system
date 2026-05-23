import { useLayoutEffect, useState } from 'react';

export type OverlayStackMode = 'replace' | 'overlay';

interface Entry {
  id: string;
  mode: OverlayStackMode;
}

// Internal ordered list of open overlay entries, most-recently-registered last.
const stack: Entry[] = [];
const listeners = new Set<() => void>();

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
