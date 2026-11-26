import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import * as Y from 'yjs';
import {
  RichTextEditor,
  type RichTextEditorProps,
} from '../components/RichTextEditor/RichTextEditor';
import {
  CollabSeamContext,
  type CollabEditorHandle,
  type CollabSeam,
} from '../components/RichTextEditor/collabSeam';
import type { EditKind } from '../components/RichTextEditor/history';
import type { Point, Range, RichDoc } from '../components/RichText/engine/model';
import { runsText } from '../components/RichText/engine/inlines';
import {
  applyLocal,
  decodeSelection,
  encodeSelection,
  readChanged,
  type CollabSelection,
  type LocalResult,
} from './bridge';
import { BLOCKS, toRichDoc } from './schema';
import { keptIndices } from './textDiff';

/** Origin of this editor's own transactions: the only one `Y.UndoManager` tracks. */
const LOCAL_ORIGIN = Symbol('eocrm-collab-local');

type StackItem = Y.UndoManager['undoStack'][number];

/** Props of {@link CollaborativeRichTextEditor}. */
export interface CollaborativeRichTextEditorProps extends Omit<
  RichTextEditorProps,
  'value' | 'onChange'
> {
  /**
   * The shared document. The app owns it and its transport (`doc.on('update')` → send;
   * `Y.applyUpdate` on receive). Seed an empty one with `fromRichDoc`. Swapping it remounts nothing
   * but starts a fresh undo history.
   */
  doc: Y.Doc;
}

type Renamed = LocalResult['renamed'];

// `p` (an offset in `next`) moved into `view`, which may hold remote text `next` lacks: through a
// character diff, sticking to the character before it (remote text at the caret lands after it).
function mapPoint(p: Point, next: RichDoc, view: RichDoc, renamed: Renamed): Point {
  const blockId = renamed?.find((r) => r.from === p.blockId)?.to ?? p.blockId;
  const to = view.blocks.find((b) => b.id === blockId);
  // ponytail: a block deleted remotely mid-edit sends the caret to the doc start.
  if (!to) return { blockId: view.blocks[0].id, offset: 0 };
  const from = next.blocks.find((b) => b.id === p.blockId);
  const a = runsText(from?.inlines ?? []);
  const y = runsText(to.inlines ?? []);
  if (a === y) return { blockId, offset: p.offset };
  const keep = keptIndices(a, y);
  if (p.offset > 0 && keep[p.offset - 1] >= 0) return { blockId, offset: keep[p.offset - 1] + 1 };
  for (let j = p.offset; j < a.length; j++) if (keep[j] >= 0) return { blockId, offset: keep[j] };
  return { blockId, offset: y.length };
}

/**
 * `RichTextEditor` bound to a shared `Y.Doc`: live sync with other editors of the doc, per-user undo, caret kept across remote edits.
 * @see docs/components/CollaborativeRichTextEditor.md
 */
export const CollaborativeRichTextEditor = forwardRef<
  HTMLDivElement,
  CollaborativeRichTextEditorProps
>(function CollaborativeRichTextEditor({ doc, ...rest }, ref) {
  const [state, setState] = useState(() => ({ doc, view: toRichDoc(doc) }));
  let view = state.view;
  if (state.doc !== doc) {
    view = toRichDoc(doc);
    setState({ doc, view });
  }
  // What the editor shows (its edits' base) vs the doc's latest state (ahead while a remote change
  // waits for its render or for an IME composition to end).
  const renderedRef = useRef(view);
  renderedRef.current = view;
  const viewRef = useRef(view);
  const handle = useRef<CollabEditorHandle | null>(null);
  const applyingRef = useRef(false);
  const umRef = useRef<Y.UndoManager | null>(null);
  const flushRef = useRef(() => {});
  // Kind of the last local edit: like the editor's own history, only same-kind edits (never
  // 'other') share an undo step.
  const lastKindRef = useRef<EditKind | null>(null);
  // The undo item the current transaction added or extended (to store the caret after the edit).
  const touchedRef = useRef<StackItem | null>(null);
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useLayoutEffect(() => {
    viewRef.current = renderedRef.current;
    const blocks = doc.getMap<unknown>(BLOCKS);
    const show = (v: RichDoc) => setState((s) => (s.doc === doc ? { doc, view: v } : s));
    // The selection before the current transaction, and (for remote changes) the one to remap with
    // its view: kept from before the first change the editor hasn't shown yet.
    let before: CollabSelection | null = null;
    let sel: CollabSelection | null = null;
    let selBase = viewRef.current;
    const onBefore = (tr: Y.Transaction) => {
      before = encodeSelection(doc, handle.current?.readSelection() ?? null, renderedRef.current);
      if (tr.origin !== LOCAL_ORIGIN && viewRef.current === renderedRef.current) {
        sel = before;
        selBase = viewRef.current;
      }
    };
    const flush = () => {
      if (viewRef.current === renderedRef.current) return;
      const range = sel && decodeSelection(doc, sel, selBase);
      if (range) handle.current?.setPendingSelection(range);
      show(viewRef.current);
    };
    flushRef.current = flush;
    const onDeep = (events: Y.YEvent<Y.AbstractType<unknown>>[], tr: Y.Transaction) => {
      // Our own edits are adopted by onChange (applyLocal returns the merged view).
      if (tr.origin === LOCAL_ORIGIN || applyingRef.current) return;
      viewRef.current = readChanged(doc, viewRef.current, events);
      // Mid-composition the DOM belongs to the IME: wait for compositionend.
      if (!handle.current?.isComposing()) flush();
    };
    const um = new Y.UndoManager(blocks, {
      trackedOrigins: new Set([LOCAL_ORIGIN]),
      captureTimeout: 600,
    });
    umRef.current = um;
    // Each item carries the caret before its change ('before', restored by undo) and after it
    // ('after', restored by redo). Undoing / redoing an item adds its counterpart on the other stack,
    // which inherits both.
    um.on('stack-item-added', ({ stackItem }) => {
      stackItem.meta.set('before', before);
      touchedRef.current = stackItem;
      rerender();
    });
    um.on('stack-item-updated', ({ stackItem }) => {
      touchedRef.current = stackItem;
    });
    um.on('stack-item-popped', ({ stackItem, type }) => {
      lastKindRef.current = null;
      const counter = touchedRef.current;
      if (counter && counter !== stackItem)
        for (const k of ['before', 'after']) counter.meta.set(k, stackItem.meta.get(k));
      const saved = stackItem.meta.get(type === 'undo' ? 'before' : 'after') ?? null;
      const range = decodeSelection(doc, saved, viewRef.current);
      if (range) handle.current?.setPendingSelection(range);
      rerender();
    });
    um.on('stack-cleared', rerender);
    rerender();
    doc.on('beforeTransaction', onBefore);
    blocks.observeDeep(onDeep);
    return () => {
      doc.off('beforeTransaction', onBefore);
      blocks.unobserveDeep(onDeep);
      um.destroy();
      umRef.current = null;
    };
  }, [doc]);

  const onChange = useCallback(
    (next: RichDoc) => {
      applyingRef.current = true;
      touchedRef.current = null;
      let r;
      try {
        r = applyLocal(doc, renderedRef.current, next, LOCAL_ORIGIN);
      } finally {
        applyingRef.current = false;
      }
      viewRef.current = r.view;
      // The editor placed its caret in `next`'s terms; the view may hold more (a merged remote edit).
      const p = handle.current?.pendingSelection();
      if (p && (r.view !== next || r.renamed)) {
        const { view: v, renamed } = r;
        handle.current!.setPendingSelection({
          anchor: mapPoint(p.anchor, next, v, renamed),
          focus: mapPoint(p.focus, next, v, renamed),
        } satisfies Range);
      }
      // Set by the undo manager's events during applyLocal (TS can't see that).
      (touchedRef.current as StackItem | null)?.meta.set(
        'after',
        encodeSelection(doc, handle.current?.pendingSelection() ?? null, r.view),
      );
      setState((s) => (s.doc === doc ? { doc, view: r.view } : s));
    },
    [doc],
  );

  // Stable (everything goes through refs), so the editor's handlers never re-subscribe.
  const seam = useMemo<CollabSeam>(
    () => ({
      handle,
      undo: () => {
        touchedRef.current = null;
        umRef.current?.undo();
      },
      redo: () => {
        touchedRef.current = null;
        umRef.current?.redo();
      },
      canUndo: () => umRef.current?.canUndo() ?? false,
      canRedo: () => umRef.current?.canRedo() ?? false,
      editKind: (kind) => {
        if (kind === 'other' || kind !== lastKindRef.current) umRef.current?.stopCapturing();
        lastKindRef.current = kind;
      },
      compositionEnd: () => flushRef.current(),
    }),
    [],
  );

  return (
    <CollabSeamContext.Provider value={seam}>
      <RichTextEditor ref={ref} {...rest} value={view} onChange={onChange} />
    </CollabSeamContext.Provider>
  );
});
