import { useEffect, useState } from 'react';

// Internal ordered list of open modal ids, most-recently-registered last.
const stack: string[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

function depthOf(id: string): number {
  return stack.indexOf(id);
}

function topId(): string | null {
  return stack.length === 0 ? null : stack[stack.length - 1]!;
}

/**
 * Module-level singleton tracking open modal ids in registration order.
 * Each modal calls `register` on open and `unregister` on close. Depth is
 * the modal's index in the open-stack (0 = bottom, length-1 = top).
 * Subscribers are notified after every register/unregister so consumers
 * can re-derive `isTop` / `depth`.
 */
export const modalStack = {
  register(id: string): number {
    if (!stack.includes(id)) {
      stack.push(id);
      notify();
    }
    return depthOf(id);
  },
  unregister(id: string): void {
    const idx = stack.indexOf(id);
    if (idx >= 0) {
      stack.splice(idx, 1);
      notify();
    }
  },
  isTop(id: string): boolean {
    return topId() === id;
  },
  topDepth(): number {
    return stack.length;
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
}

/**
 * Register/unregister this modal in the singleton stack while `active` is
 * true. Returns the current depth + whether this modal is on top. Subscribes
 * to stack mutations so `isTop` stays accurate when sibling modals open/close.
 *
 * Re-renders on stack changes elsewhere (e.g. a sibling modal opens) so
 * `isTop` stays accurate. The state is cheap (one number + one boolean).
 */
export function useModalStack(id: string, active: boolean): ModalStackState {
  const [state, setState] = useState<ModalStackState>({ depth: null, isTop: false });

  useEffect(() => {
    if (!active) {
      setState({ depth: null, isTop: false });
      return;
    }
    modalStack.register(id);
    const sync = () => {
      setState({
        depth: modalStack.depthOf(id),
        isTop: modalStack.isTop(id),
      });
    };
    sync();
    const unsubscribe = modalStack._subscribe(sync);
    return () => {
      unsubscribe();
      modalStack.unregister(id);
    };
  }, [id, active]);

  return state;
}
