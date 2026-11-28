import { act, renderHook, waitFor } from '@testing-library/react';
import type { Block, Range, RichDoc } from '../RichText/engine/model';

vi.mock('./selection', async () => {
  const actual = await vi.importActual<typeof import('./selection')>('./selection');
  return { ...actual, selectionRect: vi.fn(() => ({ top: 0, left: 0, width: 0, height: 10 })) };
});
import { useSlashMenu } from './useSlashMenu';
import type { SlashItem } from './slashItems';

const items: SlashItem[] = [{ id: 'h', group: 'text', label: 'Heading', run: () => {} }];
const caretAt = (offset: number): Range => ({
  anchor: { blockId: 'b', offset },
  focus: { blockId: 'b', offset },
});

function setup(block: Partial<Block>, composing = false) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const doc: RichDoc = {
    blocks: [{ id: 'b', type: 'paragraph', inlines: [{ text: '/he', marks: [] }], ...block }],
  };
  return renderHook(() =>
    useSlashMenu({
      enabled: true,
      rootRef: { current: root },
      doc,
      items,
      isComposing: () => composing,
      onRun: () => {},
    }),
  );
}

it('opens in a heading, filtered by the query', async () => {
  const { result } = setup({ type: 'heading', level: 2 });
  act(() => result.current.recompute(caretAt(3)));
  expect(result.current.open).toBe(true);
  await waitFor(() => expect(result.current.items.map((i) => i.id)).toEqual(['h']));
});

it('stays closed in other block types and while composing', () => {
  const quote = setup({ type: 'blockquote' }).result;
  act(() => quote.current.recompute(caretAt(3)));
  expect(quote.current.open).toBe(false);
  const ime = setup({}, true).result;
  act(() => ime.current.recompute(caretAt(3)));
  expect(ime.current.open).toBe(false);
});

it('dismiss keeps the menu closed for that trigger until the caret leaves it', () => {
  const { result } = setup({});
  act(() => result.current.recompute(caretAt(3)));
  act(() => result.current.dismiss());
  act(() => result.current.recompute(caretAt(2)));
  expect(result.current.open).toBe(false);
  act(() => result.current.recompute(caretAt(0))); // before the `/`: no context
  act(() => result.current.recompute(caretAt(3)));
  expect(result.current.open).toBe(true);
});
