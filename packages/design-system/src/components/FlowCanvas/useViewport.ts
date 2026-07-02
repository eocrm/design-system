import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/** Stage transform: translation in px plus a uniform scale. */
export interface Viewport {
  tx: number;
  ty: number;
  z: number;
}

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 2;
export const ZOOM_STEP = 1.2;
export const PAN_STEP = 40;

/** Canvas-space bounding box that {@link useViewport}'s `fitTo` centers on. */
export interface FitBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Pan/zoom state for the canvas stage. Wheel: plain scroll pans, ctrl/cmd
 * zooms toward the cursor (native non-passive listener — React's onWheel
 * can't preventDefault reliably). Fit is a no-op when the root has no
 * measurable size (jsdom, display: none).
 */
export function useViewport(rootRef: RefObject<HTMLDivElement | null>) {
  const [viewport, setViewport] = useState<Viewport>({ tx: 0, ty: 0, z: 1 });

  const panBy = useCallback((dx: number, dy: number) => {
    setViewport((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
  }, []);

  const zoomBy = useCallback(
    (factor: number, clientCenter?: { x: number; y: number }) => {
      const rect = rootRef.current?.getBoundingClientRect();
      setViewport((v) => {
        const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.z * factor));
        if (z === v.z) return v;
        const cx = clientCenter && rect ? clientCenter.x - rect.left : (rect?.width ?? 0) / 2;
        const cy = clientCenter && rect ? clientCenter.y - rect.top : (rect?.height ?? 0) / 2;
        // Keep the canvas point under (cx, cy) stationary while scaling.
        const px = (cx - v.tx) / v.z;
        const py = (cy - v.ty) / v.z;
        return { tx: cx - px * z, ty: cy - py * z, z };
      });
    },
    [rootRef],
  );

  const fitTo = useCallback(
    (bounds: FitBounds | null) => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!bounds || !rect || rect.width === 0 || rect.height === 0) return;
      if (bounds.width === 0 || bounds.height === 0) return;
      const pad = 32;
      const z = Math.min(
        1,
        Math.max(
          MIN_ZOOM,
          Math.min((rect.width - pad * 2) / bounds.width, (rect.height - pad * 2) / bounds.height),
        ),
      );
      setViewport({
        tx: (rect.width - bounds.width * z) / 2 - bounds.x * z,
        ty: (rect.height - bounds.height * z) / 2 - bounds.y * z,
        z,
      });
    },
    [rootRef],
  );

  // Native wheel listener: React attaches wheel passively, so preventDefault
  // (needed to stop page scroll/browser zoom) requires a manual listener.
  const zoomByRef = useRef(zoomBy);
  zoomByRef.current = zoomBy;
  const panByRef = useRef(panBy);
  panByRef.current = panBy;
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        zoomByRef.current(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, {
          x: event.clientX,
          y: event.clientY,
        });
      } else {
        panByRef.current(-event.deltaX, -event.deltaY);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [rootRef]);

  return { viewport, panBy, zoomBy, fitTo, setViewport };
}
