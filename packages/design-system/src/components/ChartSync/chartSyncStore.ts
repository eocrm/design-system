import { createContext, useContext, useEffect, useId, useMemo, useSyncExternalStore } from 'react';
import type { ChartSyncPoint } from './chartSyncMatch';

/** One `ChartSync` group's current point: a tiny external store, so a hover re-renders subscribers only. */
export interface ChartSyncStore {
  get(): ChartSyncPoint | null;
  set(p: ChartSyncPoint | null): void;
  subscribe(listener: () => void): () => void;
}

export function createChartSyncStore(): ChartSyncStore {
  let point: ChartSyncPoint | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => point,
    set(p) {
      point = p;
      listeners.forEach((l) => l());
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export const ChartSyncContext = createContext<ChartSyncStore | null>(null);

const NONE: ChartSyncStore = {
  get: () => null,
  set: () => {},
  subscribe: () => () => {},
};

/**
 * Internal: joins the nearest `ChartSync` (when `enabled`). `echo` is another chart's current point (never this
 * chart's own); `publish` shares this chart's point, `null` withdraws it. Outside a `ChartSync`, a no-op.
 */
export function useChartSync(enabled: boolean) {
  const ctx = useContext(ChartSyncContext);
  const store = (enabled && ctx) || NONE;
  const id = useId();
  const echo = useSyncExternalStore(
    store.subscribe,
    () => {
      const p = store.get();
      return p && p.source !== id ? p : null;
    },
    // Nothing is inspected on the server.
    () => null,
  );
  // Leaving the group (unmount, `sync={false}`, another provider) withdraws this chart's point.
  useEffect(
    () => () => {
      if (store.get()?.source === id) store.set(null);
    },
    [store, id],
  );
  const publish = useMemo(
    () => (p: Omit<ChartSyncPoint, 'source'> | null) => {
      // `null` only withdraws our own point: a later hover in another chart stays.
      if (p) store.set({ ...p, source: id });
      else if (store.get()?.source === id) store.set(null);
    },
    [store, id],
  );
  return { echo, publish };
}
