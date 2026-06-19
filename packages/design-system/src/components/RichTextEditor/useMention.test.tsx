import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type { RichDoc } from '../RichText/engine/model';

// Mock readSelection (jsdom has no caret); keep the rest of ./selection real.
vi.mock('./selection', async () => {
  const actual = await vi.importActual<typeof import('./selection')>('./selection');
  return { ...actual, readSelection: vi.fn(actual.readSelection) };
});
import { readSelection } from './selection';
import { useMention } from './useMention';

const mockReadSelection = vi.mocked(readSelection);

function makeRoot(): HTMLDivElement {
  const root = document.createElement('div');
  document.body.appendChild(root);
  return root;
}

const docWith = (text: string): RichDoc => ({
  blocks: [{ id: 'b', type: 'paragraph', inlines: [{ text, marks: [] }] }],
});

beforeEach(() => mockReadSelection.mockReset());

it('opens and queries with the text after the trigger', async () => {
  const root = makeRoot();
  mockReadSelection.mockReturnValue({
    anchor: { blockId: 'b', offset: 4 },
    focus: { blockId: 'b', offset: 4 },
  });
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
  await waitFor(() => expect(onQuery).toHaveBeenCalledWith(''));
  await waitFor(() => expect(result.current.open).toBe(true));
  await waitFor(() => expect(result.current.items).toHaveLength(1));
});

it('commitActive inserts the active item over the trigger+query range', async () => {
  const root = makeRoot();
  mockReadSelection.mockReturnValue({
    anchor: { blockId: 'b', offset: 6 },
    focus: { blockId: 'b', offset: 6 },
  });
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
  await waitFor(() => expect(result.current.items).toHaveLength(1));
  act(() => result.current.commitActive());
  expect(onInsert).toHaveBeenCalledWith('b', { from: 3, to: 6 }, '@', { id: 'u1', label: 'Alice' });
});

it('drops a stale async resolution', async () => {
  const root = makeRoot();
  mockReadSelection.mockReturnValue({
    anchor: { blockId: 'b', offset: 5 },
    focus: { blockId: 'b', offset: 5 },
  });
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
  await waitFor(() => expect(onQuery).toHaveBeenCalledWith('a'));
  // caret moves: query becomes 'ab'
  mockReadSelection.mockReturnValue({
    anchor: { blockId: 'b', offset: 6 },
    focus: { blockId: 'b', offset: 6 },
  });
  rerender({ doc: docWith('hi @ab') });
  await waitFor(() => expect(onQuery).toHaveBeenCalledWith('ab'));
  await waitFor(() => expect(result.current.items).toEqual([{ id: 'u2', label: 'Bob' }]));
  // late resolution of the first (stale) query must be ignored
  act(() => resolveFirst([{ id: 'u1', label: 'Alice' }]));
  await Promise.resolve();
  expect(result.current.items).toEqual([{ id: 'u2', label: 'Bob' }]);
});
