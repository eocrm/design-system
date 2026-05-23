import { useEffect, useState } from 'react';

export type ModalStackMode = 'replace' | 'overlay';

interface Entry {
  id: string;
  mode: ModalStackMode;
}

// Internal ordered list of open modal entries, most-recently-registered last.
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
 * Module-level singleton tracking open modal ids in registration order.
 * Each modal calls `register` on open and `unregister` on close. Depth is
 * the modal's index in the open-stack (0 = bottom, length-1 = top).
 * Subscribers are notified after every register/unregister so consumers
 * can re-derive `isTop` / `depth` / `topMode`.
 */
export const modalStack = {
  /**
   * Register this modal. If already present, update its mode in place
   * (handles a parent re-render where stackMode prop changed).
   */
  register(id: string, mode: ModalStackMode): number {
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
  topMode(): ModalStackMode | null {
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

export interface ModalStackState {
  /** Current depth in the stack, or null if not registered. */
  depth: number | null;
  /** True iff this modal is the topmost open modal. */
  isTop: boolean;
  /** Mode of the current top modal (null if stack is empty). */
  topMode: ModalStackMode | null;
}

/**
 * Register/unregister this modal in the singleton stack while `active` is
 * true. Returns the current depth, whether this modal is on top, and the
 * top modal's stackMode. Subscribes to stack mutations so state stays
 * accurate when sibling modals open/close.
 */
export function useModalStack(id: string, active: boolean, mode: ModalStackMode): ModalStackState {
  const [state, setState] = useState<ModalStackState>({
    depth: null,
    isTop: false,
    topMode: null,
  });

  useEffect(() => {
    if (!active) {
      setState({ depth: null, isTop: false, topMode: null });
      return;
    }
    modalStack.register(id, mode);
    const sync = () => {
      setState({
        depth: modalStack.depthOf(id),
        isTop: modalStack.isTop(id),
        topMode: modalStack.topMode(),
      });
    };
    sync();
    const unsubscribe = modalStack._subscribe(sync);
    return () => {
      unsubscribe();
      modalStack.unregister(id);
    };
  }, [id, active, mode]);

  return state;
}
