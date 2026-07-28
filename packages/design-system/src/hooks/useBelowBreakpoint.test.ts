import { renderHook } from '@testing-library/react';
import { useBelowBreakpoint } from './useBelowBreakpoint';
import { stubMatchMedia } from '../components/_internal/matchMediaStub.testutil';

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
