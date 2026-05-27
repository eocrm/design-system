import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/useTranslation';
import { _setViewportConfig } from './api';
import { store, type ToastEntry, type ToastPosition } from './store';
import { Toast } from './Toast';
import styles from './Toast.module.scss';

const POSITIONS: readonly ToastPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

const POSITION_CLASS: Record<ToastPosition, string> = {
  'top-left': styles.posTopLeft,
  'top-center': styles.posTopCenter,
  'top-right': styles.posTopRight,
  'bottom-left': styles.posBottomLeft,
  'bottom-center': styles.posBottomCenter,
  'bottom-right': styles.posBottomRight,
};

let mountedViewportCount = 0;

export interface ToastViewportProps {
  /** Default position for toasts that don't specify one. Default: 'bottom-right'. */
  position?: ToastPosition;
  /** Default duration (ms) for toasts without explicit duration. Default: 4000. */
  duration?: number;
  /** How many toasts are fully visible per position bucket. Default: 3. */
  maxVisible?: number;
  /** Spacing between stacked toasts. Default: 'sm' (8px). */
  gap?: 'sm' | 'md';
  /** false (default): peek-collapsed stack, hover to fan out. true: always fanned. */
  expand?: boolean;
}

/**
 * The single Toast portal. Mount exactly one of these at your app root.
 *
 * @example
 * ```tsx
 * <ToastViewport position="bottom-right" />
 * ```
 *
 * @remarks
 * - **Mount once.** A dev-warning logs if a second one mounts; only the first renders.
 * - **Mounts before consumers can fire are fine.** Toasts fired before this is in
 *   the tree sit in the store and render the moment this mounts.
 * - **Portal target is `document.body`.** Toasts are not constrained by any
 *   parent overflow/transform/contain context.
 */
export function ToastViewport({
  position = 'bottom-right',
  duration = 4000,
  maxVisible = 3,
  gap = 'sm',
  expand = false,
}: ToastViewportProps) {
  const t = useTranslation();
  // Track viewport count for dev-warning. State so React doesn't unmount us
  // when the count flips back to 1.
  const [isFirstViewport] = useState(() => {
    mountedViewportCount += 1;
    return mountedViewportCount === 1;
  });

  useEffect(() => {
    if (!isFirstViewport && process.env.NODE_ENV !== 'production') {
      console.error(
        '[ToastViewport] Multiple <ToastViewport> instances detected. Only the first one renders. Mount exactly one at your app root.',
      );
    }
    return () => {
      mountedViewportCount -= 1;
    };
  }, [isFirstViewport]);

  useEffect(() => {
    _setViewportConfig({ position, duration });
  }, [position, duration]);

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const [hovered, setHovered] = useState<Set<ToastPosition>>(() => new Set());
  // useRef instead of state so we don't trigger an extra render
  // when the portal target appears.
  const portalTargetRef = useRef<HTMLElement | null>(null);
  if (portalTargetRef.current === null && typeof document !== 'undefined') {
    portalTargetRef.current = document.body;
  }

  if (!isFirstViewport) return null;
  if (portalTargetRef.current === null) return null;

  const buckets = groupByPosition(state.toasts);

  const content = (
    <>
      {POSITIONS.map((pos) => {
        const list = buckets[pos];
        if (!list || list.length === 0) return null;
        const isExpanded = expand || hovered.has(pos);
        return (
          <ol
            key={pos}
            className={clsx(
              styles.stack,
              POSITION_CLASS[pos],
              gap === 'sm' ? styles.gapSm : styles.gapMd,
            )}
            aria-label={t('toast.notifications')}
            data-position={pos}
            data-expanded={isExpanded ? 'true' : 'false'}
            onMouseEnter={() => {
              setHovered((prev) => {
                if (prev.has(pos)) return prev;
                const next = new Set(prev);
                next.add(pos);
                return next;
              });
            }}
            onMouseLeave={() => {
              setHovered((prev) => {
                if (!prev.has(pos)) return prev;
                const next = new Set(prev);
                next.delete(pos);
                return next;
              });
            }}
          >
            {list.map((entry, idx) => (
              <Toast key={entry.id} entry={entry} isPeek={!isExpanded && idx >= maxVisible} />
            ))}
          </ol>
        );
      })}
    </>
  );

  return createPortal(content, portalTargetRef.current);
}

function groupByPosition(
  toasts: readonly ToastEntry[],
): Partial<Record<ToastPosition, ToastEntry[]>> {
  const out: Partial<Record<ToastPosition, ToastEntry[]>> = {};
  for (const t of toasts) {
    (out[t.position] ??= []).push(t);
  }
  return out;
}
