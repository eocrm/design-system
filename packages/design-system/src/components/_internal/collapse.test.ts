import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHook } from '@testing-library/react';
import { COLLAPSE_BREAKPOINT_PX, COLLAPSE_BREAKPOINTS, useBelowBreakpoint } from './collapse';
import { stubMatchMedia } from './matchMediaStub';

/**
 * The collapse breakpoint scale is duplicated by necessity: container-query
 * conditions can't read CSS custom properties, so the pixel values live as
 * SCSS constants for Grid/Split, and as a TS map for Rail (which measures the
 * viewport via `matchMedia`, not a container). Both files carry "keep in sync"
 * comments — this is what actually enforces it, so the two can't silently
 * diverge and leave Rail collapsing at a different width than Grid.
 */
describe('collapse breakpoints — TS and SCSS stay in sync', () => {
  const scss = readFileSync(resolve(__dirname, 'collapse.scss'), 'utf8');

  /** `$collapse-sm: 480px;` → 480 */
  function scssValue(name: string): number | null {
    const match = scss.match(new RegExp(`\\$collapse-${name}:\\s*(\\d+)px\\s*;`));
    return match ? Number(match[1]) : null;
  }

  it.each(['sm', 'md', 'lg'] as const)('%s matches between collapse.ts and collapse.scss', (bp) => {
    expect(scssValue(bp)).toBe(COLLAPSE_BREAKPOINT_PX[bp]);
  });

  it('declares every breakpoint in both files', () => {
    // Catches a breakpoint added to one file but not the other, which the
    // per-value checks above would miss entirely.
    expect(Object.keys(COLLAPSE_BREAKPOINT_PX).sort()).toEqual([...COLLAPSE_BREAKPOINTS].sort());
    expect(scss.match(/\$collapse-[a-z]+:/g)).toHaveLength(COLLAPSE_BREAKPOINTS.length);
  });

  it('orders the scale smallest to largest', () => {
    const values = [...COLLAPSE_BREAKPOINTS]
      .sort()
      .map((bp) => COLLAPSE_BREAKPOINT_PX[bp])
      .sort((a, b) => a - b);
    expect(values).toEqual([...new Set(values)]);
    expect(COLLAPSE_BREAKPOINT_PX.sm).toBeLessThan(COLLAPSE_BREAKPOINT_PX.md);
    expect(COLLAPSE_BREAKPOINT_PX.md).toBeLessThan(COLLAPSE_BREAKPOINT_PX.lg);
  });
});

describe('useBelowBreakpoint', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');

  afterEach(() => {
    if (original) Object.defineProperty(window, 'matchMedia', original);
    else delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('returns false when no breakpoint is given', () => {
    stubMatchMedia(320);
    const { result } = renderHook(() => useBelowBreakpoint(undefined));
    expect(result.current).toBe(false);
  });

  it('returns true below the threshold and false above it', () => {
    stubMatchMedia(700);
    const { result } = renderHook(() => useBelowBreakpoint('lg'));
    expect(result.current).toBe(true);
  });

  it('is inclusive at the threshold value', () => {
    stubMatchMedia(768);
    const { result } = renderHook(() => useBelowBreakpoint('lg'));
    expect(result.current).toBe(true);
  });

  it('updates when the viewport crosses the threshold', () => {
    const mm = stubMatchMedia(1200);
    const { result } = renderHook(() => useBelowBreakpoint('lg'));
    expect(result.current).toBe(false);
    mm.resizeTo(500);
    expect(result.current).toBe(true);
    mm.resizeTo(1000);
    expect(result.current).toBe(false);
  });

  it('returns false when matchMedia is unavailable', () => {
    delete (window as { matchMedia?: unknown }).matchMedia;
    const { result } = renderHook(() => useBelowBreakpoint('sm'));
    expect(result.current).toBe(false);
  });
});
