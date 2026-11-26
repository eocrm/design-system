import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import * as Y from 'yjs';
import {
  RichTextEditor,
  type RichTextEditKind,
  type RichTextEditorController,
  type RichTextEditorProps,
  type RichTextPresence,
  type RichTextUploadOwner,
} from '../components/RichTextEditor/RichTextEditor';
import type { Point, Range, RichDoc } from '../components/RichText/engine/model';
import { runsText } from '../components/RichText/engine/inlines';
import {
  applyLocal,
  decodeSelection,
  encodeSelection,
  newBlockId,
  readChanged,
  type CollabPoint,
  type CollabSelection,
  type LocalResult,
} from './bridge';
import { BLOCKS, blockMeta, isBlockEntry, toRichDoc } from './schema';
import { keptIndices } from './textDiff';

/** Origin of this editor's own transactions: the only one `Y.UndoManager` tracks. */
const LOCAL_ORIGIN = Symbol('eocrm-collab-local');
/** Origin of this editor's history-less writes (upload settles and removals): never undo steps. */
const UNTRACKED_ORIGIN = Symbol('eocrm-collab-untracked');
const isOwn = (origin: unknown) => origin === LOCAL_ORIGIN || origin === UNTRACKED_ORIGIN;
/** Minimum gap between two `onPresenceChange` calls for selection moves. */
const PRESENCE_THROTTLE_MS = 100;

export type { CollabPoint, CollabSelection };

/** The local user as others see them. */
export interface CollabUser {
  /** Shown on this user's caret flag in other editors. */
  name: string;
  /**
   * Any CSS colour, for this user's caret, flag and selection tint in other editors. App data
   * (like an avatar colour): the one raw colour the library accepts. Pick colours that keep
   * white flag text legible.
   */
  color: string;
}

/** One user's presence, as relayed by the app. */
export interface CollabPresence extends CollabUser {
  /** The user's `doc.clientID`. */
  clientId: number;
  /** Their selection, or `null` when their editor is not focused. */
  selection: CollabSelection | null;
}

/**
 * Connection state of the app's transport, shown in the editor: `'synced'` (quiet), `'connecting'`
 * (reconnecting; edits are kept) or `'offline'` (no connection; edits sync on reconnect).
 */
export type CollabStatus = 'synced' | 'connecting' | 'offline';

type StackItem = Y.UndoManager['undoStack'][number];

/** Props of {@link CollaborativeRichTextEditor}. */
export interface CollaborativeRichTextEditorProps extends Omit<
  RichTextEditorProps,
  | 'value'
  | 'onChange'
  | 'history'
  | 'onUndo'
  | 'onRedo'
  | 'canUndo'
  | 'canRedo'
  | 'onEdit'
  | 'createBlockId'
  | 'onSelectionChange'
  | 'controller'
  | 'onCompositionEnd'
  | 'presence'
  | 'syncStatus'
  | 'uploadOwner'
> {
  /**
   * The shared document. The app owns it and its transport (`doc.on('update')` → send;
   * `Y.applyUpdate` on receive). Apply the stored Y update log if one exists and do not seed; seed
   * with `fromRichDoc` only when there is no stored log, and persist that seed as the log's first
   * entry. On a swap, broadcast a "left" for the old `clientID` so peers drop its `presence`
   * entry. Swapping it remounts nothing but starts a fresh undo history.
   */
  doc: Y.Doc;
  /** The local user (name and colour) as other editors show them. */
  user: CollabUser;
  /**
   * Other users' presence, as relayed by the app: drawn as carets and selection tints, and listed
   * in the status area's accessible text. The entry for `doc.clientID` and entries whose
   * selection no longer resolves are skipped. Removing users who left is the app's job.
   *
   * Once passed, keep an entry for **every connected client**, including ones that never focused
   * the editor (`selection: null`): an `uploading` attachment whose uploader has no entry shows
   * as "Upload interrupted" with Remove. Omit the prop and no upload ever reads as interrupted.
   */
  presence?: readonly CollabPresence[];
  /**
   * Fires with this user's presence (`clientId: doc.clientID`) on mount, on a `doc` swap and
   * when `user` changes (`selection: null` unless focused), when the local selection moves
   * (throttled to one call per ~100ms) and with `selection: null` when the editor loses focus.
   * Relay it to the other clients.
   */
  onPresenceChange?: (presence: CollabPresence) => void;
  /**
   * Connection state of the app's transport, shown as a small text + icon indicator in the
   * toolbar row (`toolbar={true}`) or below the editor, and announced politely on change.
   * @default 'synced'
   */
  status?: CollabStatus;
}

type Renamed = LocalResult['renamed'];
const NO_PRESENCE: readonly CollabPresence[] = [];

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
>(function CollaborativeRichTextEditor(
  { doc, user, presence: presenceProp, onPresenceChange, status = 'synced', ...rest },
  ref,
) {
  const presence = presenceProp ?? NO_PRESENCE;
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
  const controller = useRef<RichTextEditorController | null>(null);
  const getSel = () => controller.current?.getSelection() ?? null;
  // The selection before the current local edit (captured in onEdit, before its caret is pending).
  const localBeforeRef = useRef<Range | null>(null);
  const applyingRef = useRef(false);
  const umRef = useRef<Y.UndoManager | null>(null);
  const flushRef = useRef(() => {});
  // Kind of the last local edit: like the editor's own history, only same-kind edits (never
  // 'other') share an undo step.
  const lastKindRef = useRef<RichTextEditKind | null>(null);
  // The undo item the current transaction added or extended (to store the caret after the edit).
  const touchedRef = useRef<StackItem | null>(null);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  // The next onChange is a history-less commit (onEdit 'silent').
  const untrackedRef = useRef(false);
  // Blocks the last local edit wrote under new ids (an upload resolves its block's id right
  // after inserting it).
  const renamedRef = useRef<Renamed>(undefined);

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
      const now = isOwn(tr.origin) ? localBeforeRef.current : getSel();
      before = encodeSelection(doc, now, renderedRef.current);
      if (!isOwn(tr.origin) && viewRef.current === renderedRef.current) {
        sel = before;
        selBase = viewRef.current;
      }
    };
    const flush = () => {
      if (viewRef.current === renderedRef.current) return;
      const range = sel && decodeSelection(doc, sel, selBase);
      if (range) controller.current?.setSelection(range);
      show(viewRef.current);
    };
    flushRef.current = flush;
    const onDeep = (events: Y.YEvent<Y.AbstractType<unknown>>[], tr: Y.Transaction) => {
      // Our own edits are adopted by onChange (applyLocal returns the merged view).
      if (isOwn(tr.origin) || applyingRef.current) return;
      viewRef.current = readChanged(doc, viewRef.current, events);
      // Mid-composition the DOM belongs to the IME: wait for compositionend.
      if (!controller.current?.isComposing()) flush();
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
      if (range) controller.current?.setSelection(range);
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
      const origin = untrackedRef.current ? UNTRACKED_ORIGIN : LOCAL_ORIGIN;
      untrackedRef.current = false;
      let r;
      try {
        r = applyLocal(doc, renderedRef.current, next, origin);
      } finally {
        applyingRef.current = false;
      }
      viewRef.current = r.view;
      renamedRef.current = r.renamed;
      // The editor placed its caret in `next`'s terms; the view may hold more (a merged remote edit).
      const p = getSel();
      if (p && (r.view !== next || r.renamed)) {
        const { view: v, renamed } = r;
        controller.current!.setSelection({
          anchor: mapPoint(p.anchor, next, v, renamed),
          focus: mapPoint(p.focus, next, v, renamed),
        } satisfies Range);
      }
      // Set by the undo manager's events during applyLocal (TS can't see that).
      (touchedRef.current as StackItem | null)?.meta.set(
        'after',
        encodeSelection(doc, getSel(), r.view),
      );
      setState((s) => (s.doc === doc ? { doc, view: r.view } : s));
    },
    [doc],
  );

  const onUndo = useCallback(() => {
    touchedRef.current = null;
    umRef.current?.undo();
  }, []);
  const onRedo = useCallback(() => {
    touchedRef.current = null;
    umRef.current?.redo();
  }, []);
  const onEdit = useCallback(({ kind }: { kind: RichTextEditKind }) => {
    localBeforeRef.current = controller.current?.getSelection() ?? null;
    if (kind === 'silent') {
      untrackedRef.current = true;
      return;
    }
    if (kind === 'other' || kind !== lastKindRef.current) umRef.current?.stopCapturing();
    lastKindRef.current = kind;
  }, []);
  const createBlockId = useCallback(() => newBlockId(latestRef.current.doc), []);

  // Local presence: selection moves throttled (leading + trailing), focus loss at once.
  const presenceRef = useRef<(sel: Range | null) => void>(() => {});
  const sendRef = useRef({
    at: -Infinity,
    timer: 0 as ReturnType<typeof setTimeout> | 0,
    nulled: true,
  });
  // The trailing call runs after later renders: it reads these, not this render's closure.
  const latestRef = useRef({ onPresenceChange, user, doc });
  latestRef.current = { onPresenceChange, user, doc };
  presenceRef.current = (sel) => {
    if (!latestRef.current.onPresenceChange) return;
    const st = sendRef.current;
    const send = (selection: CollabSelection | null) => {
      const { onPresenceChange: cb, user: u, doc: d } = latestRef.current;
      cb?.({ clientId: d.clientID, name: u.name, color: u.color, selection });
    };
    if (!sel) {
      clearTimeout(st.timer);
      st.timer = 0;
      if (!st.nulled) send(null);
      st.nulled = true;
      return;
    }
    if (st.timer) return; // the trailing call reads the selection then
    const fire = () => {
      st.timer = 0;
      st.at = Date.now();
      const now = getSel();
      if (!now) return;
      st.nulled = false;
      send(encodeSelection(latestRef.current.doc, now, renderedRef.current));
    };
    const wait = st.at + PRESENCE_THROTTLE_MS - Date.now();
    if (wait <= 0) fire();
    else st.timer = setTimeout(fire, wait);
  };
  useEffect(() => () => clearTimeout(sendRef.current.timer), []);
  // Announce this client on mount, on a doc swap and when the user changes, focused or not:
  // others treat an uploader with no presence entry as gone ("Upload interrupted").
  const announce = !!onPresenceChange;
  useEffect(() => {
    const cb = latestRef.current.onPresenceChange;
    if (!cb) return;
    const now = controller.current?.getSelection() ?? null;
    sendRef.current.nulled = !now;
    cb({
      clientId: doc.clientID,
      name: user.name,
      color: user.color,
      selection: now && encodeSelection(doc, now, renderedRef.current),
    });
  }, [announce, doc, user.name, user.color]);

  // Others' presence in editor terms: our own entry and undecodable selections dropped.
  const editorPresence = useMemo<RichTextPresence[]>(
    () =>
      presence
        .filter((p) => p.clientId !== doc.clientID)
        .map((p) => {
          let selection: Range | null = null;
          const s = p.selection;
          const has = (id: unknown) => view.blocks.some((b) => b.id === id);
          try {
            // Pointing at blocks the doc no longer has: no "nearest point" guess.
            if (s && has(s.anchor?.blockId) && has(s.focus?.blockId))
              selection = decodeSelection(doc, s, view);
          } catch {
            // Untrusted relayed data: draw no caret for it.
          }
          return { id: String(p.clientId), name: p.name, color: p.color, selection };
        }),
    [presence, doc, view],
  );
  // Upload state only the Y.Doc knows: who started it (and whether they are still here).
  // Without a `presence` prop nobody can be known absent, so nothing reads as interrupted (else
  // everyone would be offered Remove on a live upload).
  const uploadOwner = useMemo(() => {
    const here = presenceProp && new Set(presenceProp.map((p) => p.clientId));
    return (id: string): RichTextUploadOwner => {
      const m = doc.getMap<unknown>(BLOCKS).get(id);
      const by = isBlockEntry(id, m) ? blockMeta(m).uploadedBy : undefined;
      if (by === doc.clientID) return 'mine';
      return here && (by === undefined || !here.has(by)) ? 'orphaned' : 'theirs';
    };
  }, [doc, presenceProp]);

  return (
    <RichTextEditor
      ref={ref}
      {...rest}
      value={view}
      onChange={onChange}
      history="external"
      onUndo={onUndo}
      onRedo={onRedo}
      canUndo={umRef.current?.canUndo() ?? false}
      canRedo={umRef.current?.canRedo() ?? false}
      onEdit={onEdit}
      createBlockId={createBlockId}
      onSelectionChange={(sel) => presenceRef.current(sel)}
      controller={controller}
      onCompositionEnd={() => flushRef.current()}
      presence={editorPresence}
      syncStatus={status}
      uploadOwner={uploadOwner}
    />
  );
});
