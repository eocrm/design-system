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

// Wheel deltas arrive in pixels (Chrome, deltaMode 0), lines (Firefox mouse
// wheels, deltaMode 1, ~3 per notch), or pages (deltaMode 2). Normalize to
// pixels so pan/zoom speed matches across browsers.
const WHEEL_LINE_PX = 16;
const WHEEL_PAGE_PX = 800;
const wheelDeltaToPixels = (delta: number, deltaMode: number): number => {
  if (deltaMode === 1) return delta * WHEEL_LINE_PX;
  if (deltaMode === 2) return delta * WHEEL_PAGE_PX;
  return delta;
};

// Continuous ctrl/cmd-wheel zoom: one mouse notch (~100px) multiplies the
// zoom by ZOOM_STEP, while a trackpad pinch (a rapid stream of small
// fractional ctrlKey deltas) scales proportionally per event instead of
// slamming a full step each time.
const WHEEL_ZOOM_SENSITIVITY = Math.log(ZOOM_STEP) / 100;

/**
 * Pan/zoom state for the canvas stage. Wheel: plain scroll pans, ctrl/cmd
 * zooms toward the cursor (native non-passive listener — React's onWheel
 * can't preventDefault reliably). `fitTo` returns whether it applied — it's
 * a no-op returning `false` when the root or bounds have no measurable size
 * (jsdom, display: none), so callers can retry once measurable.
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
    (bounds: FitBounds | null): boolean => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!bounds || !rect || rect.width === 0 || rect.height === 0) return false;
      if (bounds.width === 0 || bounds.height === 0) return false;
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
      return true;
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
      const deltaX = wheelDeltaToPixels(event.deltaX, event.deltaMode);
      const deltaY = wheelDeltaToPixels(event.deltaY, event.deltaMode);
      if (event.ctrlKey || event.metaKey) {
        zoomByRef.current(Math.exp(-deltaY * WHEEL_ZOOM_SENSITIVITY), {
          x: event.clientX,
          y: event.clientY,
        });
      } else {
        panByRef.current(-deltaX, -deltaY);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [rootRef]);

  return { viewport, panBy, zoomBy, fitTo, setViewport };
}
