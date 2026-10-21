import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Args accepted by `useAsyncOptions`.
 *
 * `loadOptions` is the consumer-supplied fetcher; the hook is a no-op when
 * it's `undefined`. `query` and `enabled` drive when fetches happen:
 * `enabled` gates the very first request (the `loadOnOpen` semantic — wait
 * until the popover opens), `query` is what gets debounced and passed to
 * each call. `debounceMs` is the delay between the last `query` change and
 * the actual `loadOptions` invocation.
 */
export interface UseAsyncOptionsArgs<R extends readonly unknown[]> {
  /** Async fetcher. Receives the current query and an `AbortSignal`. */
  loadOptions?: (query: string, signal: AbortSignal) => Promise<R>;
  /** Current search query string. Empty string is a valid fetch trigger. */
  query: string;
  /**
   * When `false`, no fetches happen. Select wires it to "has the popover ever
   * opened"; OptionsPicker to "is the panel open now" (a fresh fetch per open).
   */
  enabled: boolean;
  /** Debounce window before firing `loadOptions` after a query change. */
  debounceMs: number;
}

/**
 * Return value of `useAsyncOptions`.
 *
 * `options` is `[]` until the first successful fetch resolves. `loading` is
 * `true` while a request is in flight (but flips back to `false` on abort
 * too — the next request's `loading=true` takes over immediately). `error`
 * is set on non-abort rejections and cleared at the start of each new
 * fetch. `retry()` re-runs the current query (no debounce).
 */
export interface UseAsyncOptionsReturn<R extends readonly unknown[]> {
  options: R;
  loading: boolean;
  error: Error | null;
  /** The query `options` belongs to; `null` until the first request settles. */
  loadedQuery: string | null;
  retry: () => void;
}

/**
 * Hook that wraps an async `loadOptions(query, signal)` into a state-row
 * friendly shape (options/loading/error + retry). Handles three concerns
 * the Select would otherwise reinvent:
 *
 * 1. Debouncing — collapses keystroke bursts into one request.
 * 2. Cancellation — aborts the in-flight request when a new one starts, so
 *    a slow response from query "ab" can't overwrite a fresh result for
 *    "abc".
 * 3. Lifecycle — aborts on unmount.
 *
 * The hook is gated by `enabled`: while it is false no fetches fire. Select
 * passes "has opened at least once" (its `loadOnOpen` semantic); OptionsPicker
 * passes "is open now", so every open refetches. Shared by both — not
 * exported from the package root.
 */
export function useAsyncOptions<R extends readonly unknown[]>(
  args: UseAsyncOptionsArgs<R>,
): UseAsyncOptionsReturn<R> {
  const { loadOptions, query, enabled, debounceMs } = args;

  const [options, setOptions] = useState<R>([] as unknown as R);
  const [loading, setLoading] = useState<boolean>(false);
  // The query `options` actually belongs to, or null before the first settle.
  // Callers cannot infer this from `loading`: it is false for the whole
  // debounce window, during which `options` is still the PREVIOUS query's.
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [retryToken, setRetryToken] = useState<number>(0);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // `runFetch` aborts any in-flight request before starting a new one, so a
  // slow response can never overwrite a fresher one. `signal.aborted` is
  // checked again on both resolution paths to handle the race where the
  // abort fires AFTER the network call resolved but BEFORE React processes
  // the `.then`.
  const runFetch = useCallback(
    (q: string) => {
      if (!loadOptions) return;
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);
      loadOptions(q, ac.signal)
        .then((next) => {
          if (ac.signal.aborted) return;
          setOptions(next);
          setLoadedQuery(q);
          setLoading(false);
        })
        .catch((err) => {
          if (ac.signal.aborted) return;
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoadedQuery(q);
          setLoading(false);
        });
    },
    [loadOptions],
  );

  // Debounced trigger: any time `query`, `enabled`, or the retry token
  // changes, queue a fetch `debounceMs` later. The cleanup clears the
  // pending timer so rapid changes collapse to a single fetch.
  useEffect(() => {
    if (!enabled || !loadOptions) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      runFetch(query);
    }, debounceMs);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query, enabled, debounceMs, retryToken, runFetch, loadOptions]);

  // Abort on unmount so a still-in-flight request can't write into a
  // dead component.
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const retry = useCallback(() => {
    setRetryToken((n) => n + 1);
  }, []);

  return { options, loading, error, retry, loadedQuery };
}
