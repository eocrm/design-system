import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { stubClientRects } from '../_internal/layoutStub.testutil';
import { findTourTarget, useTourTarget } from './useTourTarget';

function add(id: string, attrs: Record<string, string> = {}) {
  const el = document.createElement('button');
  el.dataset.tour = id;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  stubClientRects();
});
afterEach(() => {
  // Unmount rendered hooks (disconnecting their MutationObservers) BEFORE
  // wiping the body — otherwise the body wipe is itself a mutation an
  // observer picks up, driving a real `waiting` state update outside act().
  cleanup();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('findTourTarget', () => {
  it('returns the element whose data-tour matches exactly', () => {
    add('filter-x');
    const el = add('filter');
    expect(findTourTarget('filter')).toBe(el);
  });

  it('skips hidden matches and returns the first visible one', () => {
    add('a', { hidden: '' });
    const visible = add('a');
    expect(findTourTarget('a')).toBe(visible);
  });

  it('returns null when nothing matches', () => {
    expect(findTourTarget('nope')).toBeNull();
  });

  it('returns the first of duplicate matches and warns exactly once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const first = add('dupe-warn-once');
    add('dupe-warn-once');
    expect(findTourTarget('dupe-warn-once')).toBe(first);
    expect(findTourTarget('dupe-warn-once')).toBe(first);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('useTourTarget', () => {
  it("is 'none' without a target id", () => {
    const { result } = renderHook(() => useTourTarget(undefined, 1000, () => {}));
    expect(result.current).toEqual({ element: null, status: 'none' });
  });

  it("is 'found' immediately when the target exists", () => {
    const el = add('x');
    const { result } = renderHook(() => useTourTarget('x', 1000, () => {}));
    expect(result.current).toEqual({ element: el, status: 'found' });
  });

  it('waits, then resolves when the target mounts later', async () => {
    const { result } = renderHook(() => useTourTarget('late', 1000, () => {}));
    expect(result.current.status).toBe('waiting');
    let el!: HTMLElement;
    act(() => {
      el = add('late');
    });
    await waitFor(() => expect(result.current).toEqual({ element: el, status: 'found' }));
  });

  it('resolves a hidden target once it is revealed', async () => {
    const el = add('acc', { hidden: '' });
    const { result } = renderHook(() => useTourTarget('acc', 1000, () => {}));
    expect(result.current.status).toBe('waiting');
    act(() => el.removeAttribute('hidden'));
    await waitFor(() => expect(result.current.status).toBe('found'));
  });

  it("times out to 'missing' and calls onMissing once", async () => {
    const onMissing = vi.fn();
    const { result } = renderHook(() => useTourTarget('never', 30, onMissing));
    await waitFor(() => expect(result.current.status).toBe('missing'));
    expect(onMissing).toHaveBeenCalledTimes(1);
  });

  it('never times out when timeout is Infinity', async () => {
    const onMissing = vi.fn();
    const { result } = renderHook(() => useTourTarget('never', Infinity, onMissing));
    await new Promise((r) => setTimeout(r, 30));
    expect(result.current.status).toBe('waiting');
    expect(onMissing).not.toHaveBeenCalled();
  });

  it('returns to waiting when the target is removed, and re-attaches to a replacement', async () => {
    const first = add('swap');
    const { result } = renderHook(() => useTourTarget('swap', 1000, () => {}));
    expect(result.current.element).toBe(first);
    act(() => first.remove());
    await waitFor(() => expect(result.current.status).toBe('waiting'));
    let second!: HTMLElement;
    act(() => {
      second = add('swap');
    });
    await waitFor(() => expect(result.current.element).toBe(second));
  });

  it('resets when the target id changes', () => {
    add('one');
    const two = add('two');
    const { result, rerender } = renderHook(({ id }) => useTourTarget(id, 1000, () => {}), {
      initialProps: { id: 'one' },
    });
    rerender({ id: 'two' });
    expect(result.current.element).toBe(two);
  });
});
