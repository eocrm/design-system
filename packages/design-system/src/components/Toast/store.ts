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

/** Partial shape accepted by `store.update` — internal-only fields are also acceptable
 *  (the viewport uses this to flip a toast to `exiting` before removal). */
export type ToastUpdate = Partial<Omit<ToastEntry, 'id' | 'createdAt'>>;

type Listener = () => void;

interface StoreState {
  toasts: readonly ToastEntry[];
}

/** Duration of the exit animation. The store delays full removal by this many ms
 *  so the viewport can animate `data-status="exiting"` before unmount. */
export const EXIT_ANIMATION_MS = 250;

let state: StoreState = { toasts: [] };
const listeners = new Set<Listener>();

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
    // Reusing an id is an implicit update — lets `toast.success('done', { id })`
    // mutate an existing loading toast in place.
    if (state.toasts.some((t) => t.id === input.id)) {
      return store.update(input.id, input);
    }
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
    if (id === undefined) {
      state = { toasts: state.toasts.map((t) => ({ ...t, status: 'exiting' })) };
      notify();
      setTimeout(() => {
        state = { toasts: [] };
        notify();
      }, EXIT_ANIMATION_MS);
      return;
    }
    if (!state.toasts.some((t) => t.id === id)) return;
    state = {
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, status: 'exiting' } : t)),
    };
    notify();
    setTimeout(() => {
      state = { toasts: state.toasts.filter((t) => t.id !== id) };
      notify();
    }, EXIT_ANIMATION_MS);
  },
  /** Test-only: synchronously clears state. NOT exported from the package. */
  _reset(): void {
    state = { toasts: [] };
    nextSeq = 0;
    listeners.clear();
  },
};
