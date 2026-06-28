// useMention.ts — menu-state hook for RichTextEditor @-mention autocomplete.
// Owns context detection (driven by the editor's selection/content cycle), async
// querying with stale-drop, and the active-index for keyboard navigation. DOM
// glue only; the pure decision lives in mentionContext.ts.
import { useCallback, useId, useRef, useState } from 'react';
import type { RichDoc, Range } from '../RichText/engine/model';
import { runsText } from '../RichText/engine/inlines';
import { isCollapsed } from '../RichText/engine/position';
import { selectionRect, type Rect } from './selection';
import { getMentionContext } from './mentionContext';
import type { MentionItem } from './mentions';

export interface UseMentionParams {
  enabled: boolean;
  rootRef: React.RefObject<HTMLElement | null>;
  doc: RichDoc;
  trigger: string;
  onQuery?: (query: string) => MentionItem[] | Promise<MentionItem[]>;
  /** Perform the insertion (editor wires this to commit(insertMention(...))). */
  onInsert: (
    blockId: string,
    range: { from: number; to: number },
    trigger: string,
    item: MentionItem,
  ) => void;
}

export interface UseMentionResult {
  open: boolean;
  items: MentionItem[];
  activeIndex: number;
  anchorRect: Rect | null;
  /**
   * Read the caret rect LIVE (current viewport coords). The menu's Floating UI
   * virtual anchor calls this on every `autoUpdate` (incl. scroll/resize) so the
   * menu tracks the caret instead of sticking to the rect captured on open — the
   * static `anchorRect` only updates on `selectionchange`, which scroll doesn't fire.
   */
  getAnchorRect: () => Rect | null;
  listboxId: string;
  activeOptionId: string | undefined;
  getOptionId: (index: number) => string;
  /**
   * Recompute the menu from a model selection the EDITOR already read. The hook no
   * longer owns a `selectionchange` listener — the editor drives this from its
   * single consolidated subscription, passing the selection it read once. A
   * `null` / non-collapsed / out-of-trigger-context selection closes the menu.
   */
  recompute: (sel: Range | null) => void;
  setActiveIndex: (index: number) => void;
  move: (delta: 1 | -1) => void;
  selectIndex: (index: number) => void;
  commitActive: () => void;
  close: () => void;
}

/** True when two Rect values are equal (avoids spurious re-renders). */
function rectEqual(a: Rect | null, b: Rect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

export function useMention(params: UseMentionParams): UseMentionResult {
  const { enabled, rootRef, doc, trigger, onQuery, onInsert } = params;
  const baseId = useId();
  const listboxId = `${baseId}-mention-listbox`;
  const getOptionId = useCallback((index: number) => `${baseId}-mention-opt-${index}`, [baseId]);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MentionItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<Rect | null>(null);

  // Detected context (block + range), kept in a ref for commitActive.
  const ctxRef = useRef<{ blockId: string; from: number; to: number } | null>(null);
  // Monotonic token to drop stale async resolutions.
  const queryToken = useRef(0);
  // Last query string we issued (dedupe redundant onQuery calls).
  const lastQuery = useRef<string | null>(null);
  // Track open + anchorRect in refs for stable-function pattern.
  const openRef = useRef(false);
  const anchorRectRef = useRef<Rect | null>(null);

  // Keep latest props in refs so recompute() is stable and doesn't cause effect re-fires.
  const enabledRef = useRef(enabled);
  const docRef = useRef(doc);
  const triggerRef = useRef(trigger);
  const onQueryRef = useRef(onQuery);
  enabledRef.current = enabled;
  docRef.current = doc;
  triggerRef.current = trigger;
  onQueryRef.current = onQuery;

  const close = useCallback(() => {
    openRef.current = false;
    setOpen(false);
    anchorRectRef.current = null;
    setAnchorRect(null);
    ctxRef.current = null;
    lastQuery.current = null;
    queryToken.current += 1; // invalidate any in-flight query
  }, []);

  const runQuery = useCallback(
    (query: string) => {
      const qFn = onQueryRef.current;
      if (!qFn) return;
      const token = (queryToken.current += 1);
      Promise.resolve(qFn(query)).then(
        (resolved) => {
          if (token !== queryToken.current) return; // stale
          setItems(resolved);
          setActiveIndex(0);
        },
        () => {
          if (token !== queryToken.current) return;
          setItems([]);
          setActiveIndex(0);
        },
      );
    },
    [], // stable: reads onQueryRef.current
  );

  // Stable recompute — reads all mutable values via refs, never recreated. The
  // editor passes the model selection it already read from its single
  // `selectionchange` listener, so the menu doesn't re-walk the DOM here.
  const recompute = useCallback(
    (sel: Range | null) => {
      const root = rootRef.current;
      const qFn = onQueryRef.current;
      if (!enabledRef.current || !root || !qFn) {
        if (openRef.current) close();
        return;
      }
      if (!sel || !isCollapsed(sel)) {
        if (openRef.current) close();
        return;
      }
      const currentDoc = docRef.current;
      const block = currentDoc.blocks.find((b) => b.id === sel.anchor.blockId);
      if (!block) {
        if (openRef.current) close();
        return;
      }
      const text = runsText(block.inlines);
      const trig = triggerRef.current;
      const ctx = getMentionContext(text, sel.anchor.offset, trig);
      if (!ctx) {
        if (openRef.current) close();
        return;
      }
      ctxRef.current = {
        blockId: block.id,
        from: ctx.triggerOffset,
        to: ctx.triggerOffset + trig.length + ctx.query.length,
      };
      // Only update anchorRect state if the value changed (prevents render loops).
      const newRect = selectionRect(root);
      if (!rectEqual(anchorRectRef.current, newRect)) {
        anchorRectRef.current = newRect;
        setAnchorRect(newRect);
      }
      // Only flip open state if not already open (prevents render loops).
      if (!openRef.current) {
        openRef.current = true;
        setOpen(true);
      }
      if (ctx.query !== lastQuery.current) {
        lastQuery.current = ctx.query;
        runQuery(ctx.query);
      }
    },
    [rootRef, close, runQuery], // stable: reads props via refs
  );

  const move = useCallback(
    (delta: 1 | -1) => {
      setActiveIndex((i) => {
        const n = items.length;
        if (n === 0) return 0;
        return (i + delta + n) % n;
      });
    },
    [items.length],
  );

  const selectIndex = useCallback(
    (index: number) => {
      const ctx = ctxRef.current;
      const item = items[index];
      if (!ctx || !item) return;
      onInsert(ctx.blockId, { from: ctx.from, to: ctx.to }, triggerRef.current, item);
      close();
    },
    [items, onInsert, close],
  );

  const commitActive = useCallback(() => selectIndex(activeIndex), [selectIndex, activeIndex]);

  // Live caret rect — read on demand (current viewport coords). Stable identity so
  // the menu's virtual anchor doesn't churn; Floating UI's autoUpdate calls it on
  // scroll/resize so the menu follows the caret.
  const getAnchorRect = useCallback((): Rect | null => {
    const root = rootRef.current;
    return root ? selectionRect(root) : null;
  }, [rootRef]);

  return {
    open,
    items,
    activeIndex,
    anchorRect,
    getAnchorRect,
    listboxId,
    activeOptionId: open && items.length > 0 ? getOptionId(activeIndex) : undefined,
    getOptionId,
    recompute,
    setActiveIndex,
    move,
    selectIndex,
    commitActive,
    close,
  };
}
