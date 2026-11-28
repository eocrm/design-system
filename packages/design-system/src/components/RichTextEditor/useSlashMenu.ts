// useSlashMenu.ts — the `/` insert menu's state: useMention's trigger/open/anchor
// machinery with a synchronous filter, gated to paragraphs/headings outside IME.
import { useCallback, useRef } from 'react';
import type { Block, RichDoc } from '../RichText/engine/model';
import { filterSlashItems, type SlashItem } from './slashItems';
import { useMention } from './useMention';

export interface UseSlashMenuParams {
  enabled: boolean;
  rootRef: React.RefObject<HTMLElement | null>;
  doc: RichDoc;
  items: SlashItem[];
  isComposing: () => boolean;
  /** Run the picked item over the `/query` range (editor commits it). */
  onRun: (blockId: string, range: { from: number; to: number }, item: SlashItem) => void;
}

export function useSlashMenu({
  enabled,
  rootRef,
  doc,
  items,
  isComposing,
  onRun,
}: UseSlashMenuParams) {
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const isComposingRef = useRef(isComposing);
  isComposingRef.current = isComposing;
  const onQuery = useCallback((q: string) => filterSlashItems(itemsRef.current, q), []);
  const canOpen = useCallback(
    (b: Block) => (b.type === 'paragraph' || b.type === 'heading') && !isComposingRef.current(),
    [],
  );
  const onInsert = useCallback(
    (blockId: string, range: { from: number; to: number }, _trigger: string, item: SlashItem) =>
      onRun(blockId, range, item),
    [onRun],
  );
  return useMention<SlashItem>({ enabled, rootRef, doc, trigger: '/', onQuery, canOpen, onInsert });
}
