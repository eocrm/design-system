import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import * as Y from 'yjs';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
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
  type CollabPoint,
  type CollabSelection,
  type LocalResult,
} from './bridge';
import { AttachmentCollabContext } from '../components/RichText/RichTextAttachment';
import { LiveRegion } from '../components/LiveRegion';
import { VisuallyHidden } from '../components/VisuallyHidden';
import { useTranslation } from '../i18n';
import { BLOCKS, blockMeta, isBlockEntry, toRichDoc } from './schema';
import { keptIndices } from './textDiff';
import { PresenceDataContext, PresenceOverlay, type PresenceData } from './presence';
import styles from './CollaborativeRichTextEditor.module.scss';

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

const STATUS_ICON = { synced: Cloud, connecting: RefreshCw, offline: CloudOff } as const;

interface StatusData {
  status: CollabStatus;
  others: string[];
}
const StatusContext = createContext<StatusData>({ status: 'synced', others: [] });

// Status text + icon; its accessible text also names the others editing. Status changes are
// announced through a region that is always mounted (Rule 10); the initial status is not.
function StatusArea() {
  const { status, others } = useContext(StatusContext);
  const t = useTranslation();
  const [shown, setShown] = useState(status);
  const [announced, setAnnounced] = useState('');
  const hint = status === 'offline' ? ` — ${t('collab.offlineHint')}` : '';
  if (shown !== status) {
    setShown(status);
    setAnnounced(t(`collab.${status}`) + hint);
  }
  const Icon = STATUS_ICON[status];
  return (
    <span className={styles.status} data-collab-status="" data-status={status}>
      <Icon size={14} aria-hidden="true" />
      <span>{t(`collab.${status}`)}</span>
      {hint && <VisuallyHidden>{hint}</VisuallyHidden>}
      {others.length > 0 && (
        <VisuallyHidden>. {t('collab.othersEditing', { names: others })}</VisuallyHidden>
      )}
      <LiveRegion>{announced}</LiveRegion>
    </span>
  );
}

type StackItem = Y.UndoManager['undoStack'][number];

/** Props of {@link CollaborativeRichTextEditor}. */
export interface CollaborativeRichTextEditorProps extends Omit<
  RichTextEditorProps,
  'value' | 'onChange'
> {
  /**
   * The shared document. The app owns it and its transport (`doc.on('update')` → send;
   * `Y.applyUpdate` on receive). Apply the stored Y update log first; seed with `fromRichDoc` only
   * a doc still empty after that. Swapping it remounts nothing but starts a fresh undo history.
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
  // The next onChange is a history-less commit (seam.untracked).
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
      before = encodeSelection(doc, handle.current?.readSelection() ?? null, renderedRef.current);
      if (!isOwn(tr.origin) && viewRef.current === renderedRef.current) {
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
      if (isOwn(tr.origin) || applyingRef.current) return;
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
      untracked: () => {
        untrackedRef.current = true;
      },
      resolveId: (id) => renamedRef.current?.find((r) => r.from === id)?.to ?? id,
      onSelectionChange: (sel) => presenceRef.current(sel),
      overlay: <PresenceOverlay />,
      status: <StatusArea />,
    }),
    [],
  );

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
      const now = handle.current?.readSelection() ?? null;
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
    const now = handle.current?.readSelection() ?? null;
    sendRef.current.nulled = !now;
    cb({
      clientId: doc.clientID,
      name: user.name,
      color: user.color,
      selection: now && encodeSelection(doc, now, renderedRef.current),
    });
  }, [announce, doc, user.name, user.color]);

  const presenceData = useMemo<PresenceData>(
    () => ({ doc, view, presence }),
    [doc, view, presence],
  );
  const statusData = useMemo<StatusData>(
    () => ({
      status,
      // One name per client (the first; an app may relay duplicates).
      others: presence
        .filter(
          (p, i) =>
            p.clientId !== doc.clientID &&
            presence.findIndex((q) => q.clientId === p.clientId) === i,
        )
        .map((p) => String(p.name)),
    }),
    [status, presence, doc],
  );
  // Upload state only the Y.Doc knows: who started it (and whether they are still here).
  // Without a `presence` prop nobody can be known absent, so nothing reads as interrupted (else
  // everyone would be offered Remove on a live upload).
  const attachmentState = useMemo(() => {
    const here = presenceProp && new Set(presenceProp.map((p) => p.clientId));
    return (id: string) => {
      const m = doc.getMap<unknown>(BLOCKS).get(id);
      const by = isBlockEntry(id, m) ? blockMeta(m).uploadedBy : undefined;
      const mine = by === doc.clientID;
      return {
        canRetry: mine,
        interrupted: !!here && !mine && (by === undefined || !here.has(by)),
      };
    };
  }, [doc, presenceProp]);

  return (
    <CollabSeamContext.Provider value={seam}>
      <PresenceDataContext.Provider value={presenceData}>
        <StatusContext.Provider value={statusData}>
          <AttachmentCollabContext.Provider value={attachmentState}>
            <RichTextEditor ref={ref} {...rest} value={view} onChange={onChange} />
          </AttachmentCollabContext.Provider>
        </StatusContext.Provider>
      </PresenceDataContext.Provider>
    </CollabSeamContext.Provider>
  );
});
