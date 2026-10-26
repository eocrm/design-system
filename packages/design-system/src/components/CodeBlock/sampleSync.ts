import { useCallback, useSyncExternalStore } from 'react';

// In-memory only: no window, no storage. Module-level state is per-page-load,
// which is the scope a syncKey is meant to span.
const values = new Map<string, string>();
const listeners = new Map<string, Set<() => void>>();

export function getSynced(key: string): string | undefined {
  return values.get(key);
}

export function setSynced(key: string, sampleId: string): void {
  values.set(key, sampleId);
  listeners.get(key)?.forEach((onChange) => onChange());
}

export function subscribeSynced(key: string, onChange: () => void): () => void {
  const set = listeners.get(key) ?? new Set<() => void>();
  set.add(onChange);
  listeners.set(key, set);
  return () => {
    set.delete(onChange);
    if (set.size === 0 && listeners.get(key) === set) listeners.delete(key);
  };
}

export function useSyncedSample(key: string | undefined): string | undefined {
  const subscribe = useCallback(
    (onChange: () => void) => (key === undefined ? () => {} : subscribeSynced(key, onChange)),
    [key],
  );
  const getSnapshot = useCallback(() => (key === undefined ? undefined : getSynced(key)), [key]);
  return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
}

export function resolveActiveSample(
  ids: readonly string[],
  opts: { controlled?: string; synced?: string; own?: string; fallback?: string },
): string {
  const candidates = [opts.controlled, opts.synced, opts.own, opts.fallback];
  return candidates.find((id): id is string => id !== undefined && ids.includes(id)) ?? ids[0];
}
