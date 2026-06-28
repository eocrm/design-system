import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type { RichDoc } from '../RichText/engine/model';

// Mock readSelection + selectionRect (jsdom has no caret); keep the rest real.
vi.mock('./selection', async () => {
  const actual = await vi.importActual<typeof import('./selection')>('./selection');
  return {
    ...actual,
    readSelection: vi.fn(actual.readSelection),
    selectionRect: vi.fn(actual.selectionRect),
  };
});
import { selectionRect } from './selection';
import { useMention } from './useMention';
import type { Range } from '../RichText/engine/model';

const mockSelectionRect = vi.mocked(selectionRect);

function makeRoot(): HTMLDivElement {
  const root = document.createElement('div');
  document.body.appendChild(root);
  return root;
}

const docWith = (text: string): RichDoc => ({
  blocks: [{ id: 'b', type: 'paragraph', inlines: [{ text, marks: [] }] }],
});

// A collapsed model selection at `offset` in the test doc's block. The hook no
// longer reads the DOM selection itself — the editor passes the already-read
// selection into recompute() — so tests drive it the same way the editor does.
const caretAt = (offset: number): Range => ({
  anchor: { blockId: 'b', offset },
  focus: { blockId: 'b', offset },
});

beforeEach(() => {
  mockSelectionRect.mockReset();
  // Default to a stable rect; individual tests override with mockReturnValueOnce.
  mockSelectionRect.mockReturnValue({ top: 0, left: 0, width: 0, height: 0 });
});

it('exposes getAnchorRect that reads the caret rect LIVE on each call (tracks scroll)', () => {
  const root = makeRoot();
  // Two distinct rects simulate the caret moving (e.g. on scroll) between reads.
  const r1 = { top: 100, left: 10, width: 0, height: 16 };
  const r2 = { top: 40, left: 10, width: 0, height: 16 };
  mockSelectionRect.mockReturnValueOnce(r1).mockReturnValueOnce(r2);

  const { result } = renderHook(() =>
    useMention({
      enabled: true,
      rootRef: { current: root },
      doc: docWith(''),
      trigger: '@',
      onQuery: vi.fn().mockResolvedValue([]),
      onInsert: vi.fn(),
    }),
  );

  // Each call re-reads selectionRect (live) rather than returning a cached value.
  expect(result.current.getAnchorRect()).toEqual(r1);
  expect(result.current.getAnchorRect()).toEqual(r2);

  // Stable identity (so the menu's virtual anchor doesn't churn every render).
  const first = result.current.getAnchorRect;
  act(() => result.current.close());
  expect(result.current.getAnchorRect).toBe(first);
});

it('opens and queries with the text after the trigger', async () => {
  const root = makeRoot();
  const onQuery = vi.fn().mockResolvedValue([{ id: 'u1', label: 'Alice' }]);
  const onInsert = vi.fn();
  const { result } = renderHook(() =>
    useMention({
      enabled: true,
      rootRef: { current: root },
      doc: docWith('hi @'),
      trigger: '@',
      onQuery,
      onInsert,
    }),
  );
  act(() => result.current.recompute(caretAt(4)));
  await waitFor(() => expect(onQuery).toHaveBeenCalledWith(''));
  await waitFor(() => expect(result.current.open).toBe(true));
  await waitFor(() => expect(result.current.items).toHaveLength(1));
});

it('commitActive inserts the active item over the trigger+query range', async () => {
  const root = makeRoot();
  const onQuery = vi.fn().mockResolvedValue([{ id: 'u1', label: 'Alice' }]);
  const onInsert = vi.fn();
  const { result } = renderHook(() =>
    useMention({
      enabled: true,
      rootRef: { current: root },
      doc: docWith('hi @al'),
      trigger: '@',
      onQuery,
      onInsert,
    }),
  );
  act(() => result.current.recompute(caretAt(6)));
  await waitFor(() => expect(result.current.items).toHaveLength(1));
  act(() => result.current.commitActive());
  expect(onInsert).toHaveBeenCalledWith('b', { from: 3, to: 6 }, '@', { id: 'u1', label: 'Alice' });
});

it('drops a stale async resolution', async () => {
  const root = makeRoot();
  let resolveFirst: (v: { id: string; label: string }[]) => void = () => {};
  const first = new Promise<{ id: string; label: string }[]>((r) => (resolveFirst = r));
  const onQuery = vi
    .fn()
    .mockReturnValueOnce(first)
    .mockResolvedValueOnce([{ id: 'u2', label: 'Bob' }]);
  const { result, rerender } = renderHook(
    ({ doc }) =>
      useMention({
        enabled: true,
        rootRef: { current: root },
        doc,
        trigger: '@',
        onQuery,
        onInsert: vi.fn(),
      }),
    { initialProps: { doc: docWith('hi @a') } },
  );
  act(() => result.current.recompute(caretAt(5)));
  await waitFor(() => expect(onQuery).toHaveBeenCalledWith('a'));
  // caret moves + a char is typed: doc + selection update, query becomes 'ab'
  rerender({ doc: docWith('hi @ab') });
  act(() => result.current.recompute(caretAt(6)));
  await waitFor(() => expect(onQuery).toHaveBeenCalledWith('ab'));
  await waitFor(() => expect(result.current.items).toEqual([{ id: 'u2', label: 'Bob' }]));
  // late resolution of the first (stale) query must be ignored
  act(() => resolveFirst([{ id: 'u1', label: 'Alice' }]));
  await Promise.resolve();
  expect(result.current.items).toEqual([{ id: 'u2', label: 'Bob' }]);
});

it('move() wraps around the item list', async () => {
  const root = makeRoot();
  const onQuery = vi.fn().mockResolvedValue([
    { id: 'u1', label: 'Alice' },
    { id: 'u2', label: 'Bob' },
  ]);
  const { result } = renderHook(() =>
    useMention({
      enabled: true,
      rootRef: { current: root },
      doc: docWith('hi @al'),
      trigger: '@',
      onQuery,
      onInsert: vi.fn(),
    }),
  );
  act(() => result.current.recompute(caretAt(6)));
  await waitFor(() => expect(result.current.items).toHaveLength(2));
  act(() => result.current.move(1));
  expect(result.current.activeIndex).toBe(1);
  act(() => result.current.move(1)); // wraps 1 -> 0
  expect(result.current.activeIndex).toBe(0);
  act(() => result.current.move(-1)); // wraps 0 -> 1
  expect(result.current.activeIndex).toBe(1);
});

it('close() drops an in-flight query result', async () => {
  const root = makeRoot();
  let resolveQuery: (v: { id: string; label: string }[]) => void = () => {};
  const pending = new Promise<{ id: string; label: string }[]>((r) => (resolveQuery = r));
  const onQuery = vi.fn().mockReturnValue(pending);
  const { result } = renderHook(() =>
    useMention({
      enabled: true,
      rootRef: { current: root },
      doc: docWith('hi @al'),
      trigger: '@',
      onQuery,
      onInsert: vi.fn(),
    }),
  );
  act(() => result.current.recompute(caretAt(6)));
  await waitFor(() => expect(onQuery).toHaveBeenCalled());
  // close() bumps the stale token, so the in-flight resolution is dropped.
  act(() => result.current.close());
  act(() => resolveQuery([{ id: 'u1', label: 'Alice' }]));
  await Promise.resolve();
  expect(result.current.open).toBe(false);
  // The in-flight query result is dropped (close() bumped the stale token).
  expect(result.current.items).toEqual([]);
});
