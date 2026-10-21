import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { autoUpdate } from '@floating-ui/react-dom';
import { useInOverlay } from '../_internal/overlay';
import { paletteTokens, type PaletteColor } from '../../palette/palette';
import styles from './Highlight.module.scss';

type Box = { top: number; left: number; width: number; height: number } | null;

/**
 * The part of `el` not clipped by an ancestor with `overflow` ≠ `visible` or
 * by the viewport, in viewport coordinates; `null` when nothing shows.
 *
 * Floating UI's `platform.getClippingRect` would do this, but it reads a
 * private per-call cache (`this._c`) that only `computePosition` sets, so it
 * throws when called directly — hence this walk.
 * ponytail: ignores ancestors a positioned child escapes (an absolute child of
 * a non-positioned `overflow: hidden` box) and `contain: paint`; switch to
 * Floating UI's clipping-ancestor logic if a consumer hits one.
 */
export function visibleRect(el: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  let top = Math.max(r.top, 0);
  let left = Math.max(r.left, 0);
  let bottom = Math.min(r.bottom, window.innerHeight);
  let right = Math.min(r.right, window.innerWidth);
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    const { overflow, overflowX, overflowY } = getComputedStyle(a);
    if (!/auto|scroll|hidden|clip/.test(overflow + overflowX + overflowY)) continue;
    const c = a.getBoundingClientRect();
    top = Math.max(top, c.top);
    left = Math.max(left, c.left);
    bottom = Math.min(bottom, c.bottom);
    right = Math.min(right, c.right);
  }
  if (right <= left || bottom <= top) return null;
  return { top, left, width: right - left, height: bottom - top };
}

const sameBox = (a: Box, b: Box) =>
  a === b ||
  (!!a &&
    !!b &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height);

/**
 * Decorative ring + outward waves over `target`'s visible rect (internal to
 * `<Highlight>`). Portaled to `<body>` and `position: fixed`, so no scroll
 * container or `overflow` clips it and nothing on the target changes.
 */
export function HighlightOverlay({
  target,
  stage,
  color,
}: {
  target: HTMLElement;
  stage: 'on' | 'fading';
  color?: PaletteColor;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<Box>(null);
  const [radius, setRadius] = useState('0px');
  const targetRef = useMemo(() => ({ current: target }), [target]);
  const elevated = useInOverlay(targetRef, true);

  useLayoutEffect(() => {
    setRadius(getComputedStyle(target).borderTopLeftRadius || '0px');
    const update = () => {
      const next = visibleRect(target);
      setBox((prev) => (sameBox(prev, next) ? prev : next));
    };
    update();
    // Tracks scroll (any ancestor), resize and layout shift — as Tour's Spotlight.
    return autoUpdate(target, ref.current!, update);
  }, [target]);

  const style = {
    position: 'fixed',
    ...box,
    '--highlight-radius': radius,
    ...(color && { '--highlight-color': paletteTokens(color).fg }),
  } as CSSProperties;

  return createPortal(
    <div
      ref={ref}
      aria-hidden="true"
      data-highlight-overlay=""
      data-stage={stage}
      data-in-overlay={elevated ? '' : undefined}
      hidden={!box}
      className={styles.overlay}
      style={style}
    />,
    document.body,
  );
}
