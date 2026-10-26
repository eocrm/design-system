import type { ReactNode } from 'react';

export type ToastTone = 'info' | 'success' | 'warning' | 'error' | 'loading';

export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface ToastEntry {
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
  status: 'visible' | 'exiting';
}

/** Input shape accepted by `store.add` — `createdAt` and `status` are computed internally. */
export type ToastInput = Omit<ToastEntry, 'createdAt' | 'status'>;

/** Partial shape accepted by `store.update`. `status` is owned by `dismiss` (and a
 *  re-`add`), so an update never resurrects a dismissed toast. */
export type ToastUpdate = Partial<Omit<ToastEntry, 'id' | 'createdAt' | 'status'>>;

type Listener = () => void;

interface StoreState {
  toasts: readonly ToastEntry[];
}

/** Duration of the exit animation. The store delays full removal by this many ms
 *  so the viewport can animate `data-status="exiting"` before unmount. */
export const EXIT_ANIMATION_MS = 250;

let state: StoreState = { toasts: [] };
const listeners = new Set<Listener>();
/** Exiting id → the id set its pending removal will delete. Re-adding the id
 *  drops it from that set, cancelling its removal. */
const pendingExit = new Map<string, Set<string>>();

function notify() {
  listeners.forEach((l) => l());
}

let nextSeq = 0;
/** Generates a short id with millisecond timestamp + monotonic counter so
 *  rapid-fire calls within the same ms never collide. */
export function generateId(): string {
  return `t${Date.now().toString(36)}${(++nextSeq).toString(36)}`;
}

export const store = {
  getSnapshot(): StoreState {
    return state;
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  add(input: ToastInput): string {
    const existing = state.toasts.find((t) => t.id === input.id);
    // Re-firing an id mid-exit shows it again as a fresh toast. The new
    // `createdAt` is part of the viewport's React key, so it remounts with a
    // fresh auto-dismiss timer.
    if (existing?.status === 'exiting') {
      pendingExit.get(input.id)?.delete(input.id);
      pendingExit.delete(input.id);
      const createdAt = Math.max(Date.now(), existing.createdAt + 1);
      state = {
        toasts: state.toasts.map((t) =>
          t.id === input.id ? { ...input, createdAt, status: 'visible' } : t,
        ),
      };
      notify();
      return input.id;
    }
    // Reusing a live id is an implicit update — lets `toast.success('done', { id })`
    // mutate an existing loading toast in place.
    if (existing) return store.update(input.id, input);
    const entry: ToastEntry = { ...input, createdAt: Date.now(), status: 'visible' };
    state = { toasts: [...state.toasts, entry] };
    notify();
    return entry.id;
  },
  update(id: string, partial: ToastUpdate): string {
    state = {
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, ...partial } : t)),
    };
    notify();
    return id;
  },
  dismiss(id?: string): void {
    // Capture the ids now so the deferred removal can't take toasts added
    // during the exit window (#713). Already-exiting toasts keep their pending
    // removal rather than arming a second one.
    const ids = new Set(
      state.toasts
        .filter((t) => t.status !== 'exiting' && (id === undefined || t.id === id))
        .map((t) => t.id),
    );
    if (ids.size === 0) return;
    state = {
      toasts: state.toasts.map((t) => (ids.has(t.id) ? { ...t, status: 'exiting' } : t)),
    };
    notify();
    ids.forEach((exitId) => pendingExit.set(exitId, ids));
    setTimeout(() => {
      if (ids.size === 0) return;
      ids.forEach((exitId) => pendingExit.delete(exitId));
      state = { toasts: state.toasts.filter((t) => !ids.has(t.id)) };
      notify();
    }, EXIT_ANIMATION_MS);
  },
  /** Test-only: synchronously clears state. NOT exported from the package. */
  _reset(): void {
    state = { toasts: [] };
    pendingExit.forEach((ids) => ids.clear());
    pendingExit.clear();
    nextSeq = 0;
    listeners.clear();
  },
};
