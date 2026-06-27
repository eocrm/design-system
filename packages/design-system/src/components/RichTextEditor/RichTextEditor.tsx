import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
} from 'react';
import clsx from 'clsx';
import type { RichDoc, Range, Mark, MarkType, Point } from '../RichText/engine/model';
import { nextId } from '../RichText/engine/model';
import { renderDoc } from '../RichText/engine/renderDoc';
import type { RenderLink } from '../RichText/engine/renderLink';
import type { RenderMention } from '../RichText/engine/renderMention';
import { blockLength, isCollapsed } from '../RichText/engine/position';
import { linkAt, setLink, removeLink } from './links';
import { applyTypeAutolink, atomicLinkDeleteRange } from './autolinkInput';
import { RichTextLinkEditor } from './RichTextLinkEditor';
import {
  insertText,
  insertFragment,
  insertMention,
  deleteRange,
} from '../RichText/engine/transforms';
import { linkifyRuns, findUrl } from '../RichText/engine/autolink';
import { useMention } from './useMention';
import { RichTextMentionMenu } from './RichTextMentionMenu';
import type { MentionItem, MentionsConfig } from './mentions';
import { fromHtml } from '../RichText/engine/fromHtml';
import { hasMark, withMark, withoutMark } from '../RichText/engine/marks';
import { useTranslation } from '../../i18n';
import { readSelection, writeSelection, selectionRect, rangeRect, type Rect } from './selection';
import { applyInput } from './input';
import { matchBlockRule, applyBlockRule } from './inputRules';
import { runsText } from '../RichText/engine/inlines';
import { shortcutMark } from './shortcuts';
import {
  activeMarks as deriveActiveMarks,
  currentBlock as deriveCurrentBlock,
  runToggleMark,
  runSetBlock,
  runToggleList,
  runIndent,
  applyExactMarks,
} from './commands';
import { RichTextToolbar, type BlockChoice } from './RichTextToolbar';
import {
  moveBlockUnit,
  moveBlockUnitToIndex,
  duplicateBlockUnit,
  removeBlockUnit,
  insertEmptyBlockBelow,
} from '../RichText/engine/blockUnit';
import { RichTextBlockControls } from './RichTextBlockControls';
import { RichTextAttachmentConfig } from './RichTextAttachmentConfig';
import { RichTextImageResizer } from './RichTextImageResizer';
import {
  updateAttachmentBlock,
  clearAttachmentFields,
  attachmentIsImage,
} from '../RichText/engine/attachment';
import { safeHref } from '../RichText/engine/safeHref';
import type { BlockAction } from './RichTextBlockMenu';
import { useUpload, type UploadConfig } from './useUpload';
import {
  reset as historyReset,
  record as historyRecord,
  undo as historyUndo,
  redo as historyRedo,
  canUndo as historyCanUndo,
  canRedo as historyCanRedo,
} from './history';
import type { History, EditKind } from './history';
import styles from './RichTextEditor.module.scss';

// Stable sentinel ReactNode passed as `renderLink`'s `defaultNode` when probing
// whether a link is "resolved" (the consumer returns a custom chip) vs. declined
// (returns the fallback). A custom return is `!== FALLBACK_SENTINEL` by identity;
// declining returns the exact sentinel back. A frozen one-off element keeps a
// stable reference across calls.
const FALLBACK_SENTINEL: React.ReactNode = Object.freeze(<span key="rt-fallback-sentinel" />);

export interface RichTextEditorProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'children'
> {
  /** Controlled document. Render the doc returned by `onChange` back into `value`. */
  value: RichDoc;
  /** Fires with the new document after every edit. */
  onChange: (doc: RichDoc) => void;
  /** Non-editable: renders the content read-only (prefer `<RichText>` for pure display). */
  readOnly?: boolean;
  /** Shown when the document is empty. */
  placeholder?: string;
  /** Focus the editor on mount. */
  autoFocus?: boolean;
  /**
   * Render the built-in formatting toolbar above the editor — Undo/Redo buttons,
   * mark toggle buttons (bold/italic/underline/strike), a block-type dropdown
   * (paragraph/headings/quote/code), and bullet/numbered list toggles. The
   * toolbar dispatches through the same commit path the keyboard uses and
   * reflects the active marks + current block of the live selection. Default
   * `false` (keyboard-only). When `readOnly`, the toolbar renders disabled.
   *
   * `'auto'` shows the toolbar only when the editor is **focused or non-empty**,
   * and keeps it shown while the editor's own overlays (the link editor / mention
   * menu) are open — so opening the link editor on a focused-but-empty composer
   * doesn't collapse the bar. The editable is NOT remounted as the bar appears or
   * hides (the bar toggles in a stable shell), so there's no focus/selection loss.
   * Use it for a compact, focus-gated composer (e.g. a comment box) instead of
   * hand-rolling the show-on-focus logic and working around overlay focus theft.
   */
  toolbar?: boolean | 'auto';
  /**
   * Enable `@`-mention autocomplete. Supply `onQuery` to resolve candidates for
   * the text typed after the trigger (default `@`); the editor renders a floating
   * combobox and inserts a styled mention chip carrying the chosen item's `id`.
   * Omit to disable mentions. See {@link MentionsConfig}.
   */
  mentions?: MentionsConfig;
  /**
   * Turn typed and pasted URLs into links automatically. While typing, a URL is
   * linked when you type a space after it; on paste, plain-text URLs are linked
   * (a single bare URL pasted over a selection links the selection). Default
   * `true`. Set `false` to disable both the type rule and paste autolinking (the
   * ⌘/Ctrl+K link tool still works). The href is sanitized — only safe schemes
   * (http/https/`www.`) become links.
   */
  autolink?: boolean;
  /**
   * Substitute how a link renders. Called per link with `{ href, text }` and the
   * default `<a>`; return your own node (e.g. a task/member chip) or the
   * `defaultNode` to keep the standard anchor. A custom node renders as a
   * non-editable **atomic chip** — the caret steps over it and a single Backspace/
   * Delete removes the whole link.
   *
   * @remarks Render-time only — the model is unchanged, so `toHtml`/`toMarkdown`
   * still serialize a plain link. Keep it cheap (it runs on every render): don't
   * do heavy synchronous work or block on the network inside `renderLink`; return
   * a component that fetches/caches the lookup itself (falling back to
   * `defaultNode` while loading). Because the chip is atomic and not editable
   * text, only links your `renderLink` actually replaces become chips — links you
   * return `defaultNode` for stay plain, editable anchors.
   */
  renderLink?: RenderLink;
  /**
   * Substitute how an `@`-mention renders. Called per mention with `{ id, label }`
   * and the default mention span; return your own node (e.g. an interactive member
   * chip / popover trigger) or the `defaultNode` to keep the standard
   * non-interactive span. A custom node renders as a non-editable **atomic chip** —
   * the caret steps over it as a single unit. Composes with `renderLink` (both
   * usable together).
   *
   * @remarks Render-time only — the model is unchanged, so `toHtml`/`toMarkdown`
   * still serialize the mention mark. Keep it cheap (it runs on every render):
   * don't do heavy synchronous work or block on the network inside `renderMention`;
   * return a component that fetches/caches the lookup itself (falling back to
   * `defaultNode` while loading).
   */
  renderMention?: RenderMention;
  /**
   * Show Notion-style per-block controls: a left gutter that appears on the
   * hovered/focused block with an insert button (`＋`, adds an empty paragraph
   * below) and a drag handle (`⠿`) that opens a block menu (Turn into ▸,
   * Duplicate, Move up/down, Delete). Reordering is subtree-aware for nested
   * lists. Keyboard: Shift+F10 / the ContextMenu key opens the focused block's
   * menu; ⌘/Ctrl+⇧↑ / ⌘/Ctrl+⇧↓ move the block; ⌘/Ctrl+D duplicates. Default
   * `false`. Ignored when `readOnly`. Independent of `toolbar`.
   */
  blockControls?: boolean;
  /**
   * Enable file upload: a toolbar button (when `toolbar`) and clipboard-file paste.
   * `onUpload(file)` resolves with where the file landed; images render inline as a
   * preview, other files as a download chip. Reject `onUpload` to show a retry/remove
   * error. `onUploadingChange` fires while any upload is in flight — wire it to your
   * submit button's disabled state. Validation (size/type) belongs in `onUpload`
   * (`accept` is only a native-picker hint and is bypassed by paste). Omit to
   * disable. Ignored when `readOnly`.
   * When `blockControls` is also on, a ready image attachment can be configured
   * (alt text, alignment, replace, open/download) via the block menu's
   * "Configure" item. The width slider appears only for an image that renders as
   * a preview (a safe, fetchable src — an embed); an uploaded image whose
   * object-URL src renders as a download chip isn't resizable here. Alignment +
   * width round-trip through HTML but not Markdown.
   */
  upload?: UploadConfig;
}

function isEmptyDoc(doc: RichDoc): boolean {
  return doc.blocks.length === 1 && blockLength(doc.blocks[0]) === 0;
}

/** Toggle `mark` within a `Mark[]` (used to fold a shortcut into pending marks). */
function toggleInList(marks: Mark[], mark: Mark): Mark[] {
  return hasMark(marks, mark.type) ? withoutMark(marks, mark.type) : withMark(marks, mark);
}

/** Marks of the character immediately before the caret (none at a block start). */
function marksAtCaretMarks(doc: RichDoc, caret: Point): Mark[] {
  const idx = doc.blocks.findIndex((b) => b.id === caret.blockId);
  if (idx === -1 || caret.offset <= 0) return [];
  let pos = 0;
  for (const run of doc.blocks[idx].inlines) {
    const end = pos + run.text.length;
    if (caret.offset - 1 >= pos && caret.offset - 1 < end)
      return run.marks.filter((m) => m.type !== 'mention');
    pos = end;
  }
  return [];
}

interface LinkEditorOpen {
  range: Range;
  href: string;
  editing: boolean;
  anchorRect: Rect;
  key: number;
}

/**
 * Controlled rich-text editor — a contentEditable surface over the in-house
 * engine. Type to edit; ⌘/Ctrl+B/I/U and ⌘/Ctrl+⇧X toggle marks over a
 * selection (with a collapsed caret they stage a *pending* mark applied to the
 * next typed text); Enter splits, Backspace/Delete merge. Pass `toolbar` for the
 * built-in formatting toolbar. ⌘/Ctrl+K (or the toolbar link button) opens a
 * floating editor to add, edit, or remove a link on the selection. Inside a
 * list, Tab/⇧Tab indent/outdent and Enter on an empty item exits to a paragraph.
 * Pasting rich HTML (web, Word, Google Docs) imports it as formatted content.
 * ⌘/Ctrl+Z / ⌘/Ctrl+Shift+Z (and the toolbar Undo/Redo buttons) undo and redo.
 * Markdown shortcuts auto-format on typing — `# `, `- `, `1. `, `> `, or a code
 * fence at a line start convert the block (Undo reverts the conversion).
 * Pass `mentions={{ onQuery }}` to enable `@`-mention autocomplete: typing the
 * trigger opens a combobox of candidates and inserts a chip carrying the id.
 * The model is the source of truth: every input is replayed as an engine
 * transform and the DOM re-rendered.
 *
 * @example
 * const [doc, setDoc] = useState(emptyDoc());
 * <RichTextEditor value={doc} onChange={setDoc} placeholder="Write a note…" />
 *
 * @example
 * // With the built-in toolbar (mark buttons, block-type menu, list toggles).
 * <RichTextEditor value={doc} onChange={setDoc} toolbar />
 *
 * @example
 * // @-mentions: resolve candidates from your data (sync or async).
 * <RichTextEditor value={doc} onChange={setDoc}
 *   mentions={{ onQuery: (q) => searchUsers(q) }} />
 *
 * @example
 * // Read-only display of an existing document.
 * <RichTextEditor value={doc} onChange={() => {}} readOnly />
 *
 * @remarks When NOT to use
 * - Displaying read-only content → `<RichText>` (or `<RichTextEditor readOnly>`).
 *
 * @remarks Anti-patterns
 * - ❌ Treating it as uncontrolled — you MUST feed `onChange`'s doc back into
 *   `value`, or edits won't stick.
 * - ❌ Mutating `value` in place — pass the new doc the transforms return.
 * - ❌ Implementing your own undo/redo stack — the editor tracks history internally; use ⌘/Ctrl+Z (undo), ⌘/Ctrl+⇧Z or ⌘/Ctrl+Y (redo), or the toolbar Undo/Redo buttons.
 * - ❌ Hand-rolling a link UI by reaching into the DOM — press ⌘/Ctrl+K or the
 *   toolbar link button; both open the built-in editor and route through the
 *   controlled `value`/`onChange` round-trip.
 * - ❌ Building your own toolbar by reaching into the DOM — pass `toolbar`, or
 *   drive marks/blocks through the controlled `value`/`onChange` round-trip.
 * - ❌ Pre-stripping pasted HTML to plain text — paste rich HTML directly; the
 *   editor parses it (sanitized) into the model. Seed stored content with
 *   `fromHtml` / `fromMarkdown`.
 * - ❌ Hand-rolling HTML/Markdown from the model — use `toHtml` / `toMarkdown`
 *   (the inverse of `fromHtml` / `fromMarkdown`).
 * - ❌ Using mentions to insert plain links — that's the link tool (⌘K). A
 *   mention chip is an inert reference carrying an `id`, not a navigable anchor.
 * - ❌ Using `renderMention` for plain links — that's `renderLink`; a mention chip
 *   is an inert reference carrying an `id`. The two compose; use each for its mark.
 * - ❌ Returning thousands of unfiltered items from `onQuery` — filter server-side
 *   (or by the `query`); the menu renders what you return.
 * - ❌ Relying on Markdown to preserve mentions — `toMarkdown` is lossy (plain
 *   `@label`); use `toHtml`/`fromHtml` to round-trip a mention's id.
 * - ❌ Building a custom block drag/menu by reaching into the DOM — pass
 *   `blockControls`; insert/move/duplicate/delete route through the controlled
 *   `value`/`onChange` round-trip and are undoable.
 * - ❌ Expecting Backspace to delete a whole block — it edits text; use the block
 *   menu's Delete (or select the block's text and delete) to remove a block.
 * - ❌ Persisting or submitting the doc while an upload is in flight — gate your
 *   submit on `upload.onUploadingChange` (transient attachment blocks are skipped
 *   by `toHtml`/`toMarkdown`, but the model still carries them until they settle).
 * - ❌ Relying on the picker `accept` for validation — it's only a hint and paste
 *   bypasses it; enforce size/type inside `onUpload` and reject to show an error.
 * - ❌ Expecting image alignment/width to survive a Markdown round-trip — they
 *   serialize to HTML only (Markdown has no syntax for them); the stored RichDoc
 *   JSON is lossless.
 */
export const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(
  function RichTextEditor(
    {
      value,
      onChange,
      readOnly = false,
      placeholder,
      autoFocus,
      toolbar = false,
      blockControls = false,
      mentions,
      autolink = true,
      renderLink,
      renderMention,
      upload,
      className,
      ...rest
    },
    ref,
  ) {
    const t = useTranslation();
    const rootRef = useRef<HTMLDivElement | null>(null);
    const isComposingRef = useRef(false);
    // Selection to restore after the next model-driven re-render.
    const pendingSelectionRef = useRef<Range | null>(null);
    // Latest props for the native beforeinput listener (avoids stale closures).
    const latest = useRef({
      value,
      onChange,
      readOnly,
      autolink,
      renderLink,
      upload,
    });
    latest.current = {
      value,
      onChange,
      readOnly,
      autolink,
      renderLink,
      upload,
    };
    // The synchronous "live" doc — kept ahead of `value` between renders by the
    // commit paths, so several async upload settles in the same tick chain off each
    // other's result instead of all reading the stale last-rendered `value` (which
    // would make the last settle clobber the earlier ones). Re-synced to `value`
    // each render so external replacements flow in.
    const liveDocRef = useRef(value);
    liveDocRef.current = value;

    // Link editor state.
    const [linkEditor, setLinkEditor] = useState<LinkEditorOpen | null>(null);
    const linkKeyRef = useRef(0);

    // Focus state — only consulted by `toolbar="auto"` to gate the bar's visibility.
    // Focus moving to an editor overlay (the link editor / mention menu, portaled to
    // <body>) fires a blur, so `focused` flips false there; the `showToolbar`
    // formula keeps the bar up via the overlay-open term instead.
    const [focused, setFocused] = useState(false);
    const autoToolbar = toolbar === 'auto';

    // Toolbar state: the live selection (tracked via `selectionchange`) and any
    // marks staged at a collapsed caret to apply to the next typed character.
    const [selection, setSelection] = useState<Range | null>(null);
    const [pendingMarks, setPendingMarks] = useState<Mark[] | null>(null);
    // Mirror pending marks into a ref so the native beforeinput listener reads
    // the current value without re-subscribing.
    const pendingMarksRef = useRef<Mark[] | null>(null);
    pendingMarksRef.current = pendingMarks;
    // The collapsed caret where pending marks were staged. Used to clear them
    // when the caret moves to a different spot (vs. typing at the same point).
    const pendingAtRef = useRef<Point | null>(null);

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const controlsOn = blockControls && !readOnly;
    const shellRef = useRef<HTMLDivElement | null>(null);
    // Active block = hover wins, else the caret block (keyboard / after the mouse
    // leaves). Split so clearing hover on editor-leave never wipes the caret target.
    const [hoverBlockId, setHoverBlockId] = useState<string | null>(null);
    const [caretBlockId, setCaretBlockId] = useState<string | null>(null);
    const activeBlockId = hoverBlockId ?? caretBlockId;
    const [configBlockId, setConfigBlockId] = useState<string | null>(null);
    const [blockMenuOpen, setBlockMenuOpen] = useState(false);
    // Mirror the open state into a ref so the hover listener can read it without
    // re-subscribing: while the menu is open, hovering another block must NOT move
    // the active block (the menu's actions are bound to it — moving it would make
    // a click act on the wrong block).
    const blockMenuOpenRef = useRef(false);
    blockMenuOpenRef.current = blockMenuOpen;
    // Set by RichTextBlockControls' onDraggingChange. While a block drag is in
    // progress the active block must not change (it IS the block being dragged), so
    // the hover handlers below read this ref and bail — mirroring blockMenuOpenRef.
    const draggingRef = useRef(false);

    // Resolve the [data-block-id] of the block element containing a DOM node.
    const blockIdFromNode = useCallback((node: Node | null): string | null => {
      let el: HTMLElement | null =
        node instanceof HTMLElement ? node : (node?.parentElement ?? null);
      while (el && el !== rootRef.current) {
        if (el.hasAttribute('data-block-id')) return el.getAttribute('data-block-id');
        el = el.parentElement;
      }
      return null; // reached the root (or ran out of ancestors) — no block
    }, []);

    // The block whose vertical band contains viewport-y `clientY`, or null. Used to
    // resolve a hover over the gutter/padding column (where there is no block element
    // under the pointer) to the row beside it. Block elements are in document order =
    // top-to-bottom, so we can stop once a block starts below the pointer; among the
    // blocks that contain the pointer the LAST in document order is the deepest (a
    // nested list item comes after — and sits inside — its parent), matching how a
    // direct hover resolves to the innermost block. Reads a layout rect per block up
    // to the pointer's row — an accepted cost: the caller only invokes this for the
    // narrow no-block-under-pointer case (the gutter/padding column), never the hot
    // text-hover path, so there's no need to cache rects or rAF-throttle.
    const blockAtPointerY = useCallback((root: HTMLElement, clientY: number): string | null => {
      let found: string | null = null;
      for (const el of root.querySelectorAll<HTMLElement>('[data-block-id]')) {
        const box = el.getBoundingClientRect();
        if (box.top > clientY) break;
        if (clientY <= box.bottom) found = el.getAttribute('data-block-id');
      }
      return found;
    }, []);

    const historyRef = useRef<History>(historyReset({ doc: value, selection: null }));
    // Timestamp of the last ⌘Z/⌘⇧Z/⌘Y keydown — lets the beforeinput net skip the
    // historyUndo/historyRedo event that a keydown ALSO emits (already handled),
    // while still honoring a menu/trackpad undo that emits no keydown.
    const historyKeyAtRef = useRef(0);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const syncHistoryFlags = useCallback(() => {
      setCanUndo(historyCanUndo(historyRef.current));
      setCanRedo(historyCanRedo(historyRef.current));
    }, []);

    const commit = useCallback(
      (result: { doc: RichDoc; selection: Range }, kind: EditKind = 'other') => {
        // No-op transforms (e.g. Backspace at the very start of the document)
        // return the SAME doc reference — skip so we don't fire onChange or leave a
        // stale pending selection that React would never consume (no re-render).
        if (result.doc === latest.current.value) return;
        historyRef.current = historyRecord(
          historyRef.current,
          { doc: result.doc, selection: result.selection },
          kind,
          Date.now(),
        );
        syncHistoryFlags();
        pendingSelectionRef.current = result.selection;
        liveDocRef.current = result.doc;
        latest.current.onChange(result.doc);
      },
      [syncHistoryFlags],
    );

    // Like commit, but records NO history entry — used for async upload settles so
    // Undo never steps through an upload resolving. Preserves the caret across the
    // model-driven re-render by re-pinning the current selection, and keeps the
    // history's `present` snapshot in sync with the new doc (without pushing a
    // past/future entry) so the layout effect's `value !== present.doc` external-
    // replacement heuristic doesn't mistake a settle for a doc swap and reset undo.
    const commitSilent = useCallback((doc: RichDoc) => {
      if (doc === latest.current.value) return;
      const root = rootRef.current;
      const sel = root ? readSelection(root) : null;
      if (sel) pendingSelectionRef.current = sel;
      historyRef.current = {
        ...historyRef.current,
        present: { doc, selection: sel ?? historyRef.current.present.selection },
      };
      liveDocRef.current = doc;
      latest.current.onChange(doc);
    }, []);

    const uploadOn = !!upload && !readOnly;
    const uploader = useUpload({
      config: upload ?? { onUpload: async () => ({ url: '' }) },
      getValue: () => liveDocRef.current,
      applyInsert: (doc) => {
        const root = rootRef.current;
        const sel = (root ? readSelection(root) : null) ?? {
          anchor: { blockId: liveDocRef.current.blocks[0].id, offset: 0 },
          focus: { blockId: liveDocRef.current.blocks[0].id, offset: 0 },
        };
        commit({ doc, selection: sel }, 'other');
      },
      applySettle: commitSilent,
      getCaret: () =>
        (rootRef.current ? readSelection(rootRef.current)?.anchor : undefined) ?? {
          blockId: liveDocRef.current.blocks[0].id,
          offset: 0,
        },
    });
    // The paste/click handlers close over a stale `uploader`; mirror it in a ref so
    // we read the current one without re-subscribing the native paste listener.
    const uploaderRef = useRef(uploader);
    uploaderRef.current = uploader;

    // Drop any caret-staged pending mark — the doc + caret are about to change,
    // so a mark staged at the old caret must not bleed into the next typed text.
    const clearPendingMarks = useCallback(() => {
      setPendingMarks(null);
      pendingAtRef.current = null;
    }, []);

    const onUndo = useCallback(() => {
      const h = historyRef.current;
      if (!historyCanUndo(h)) return;
      const next = historyUndo(h);
      historyRef.current = next;
      syncHistoryFlags();
      clearPendingMarks();
      pendingSelectionRef.current = next.present.selection;
      latest.current.onChange(next.present.doc);
    }, [syncHistoryFlags, clearPendingMarks]);

    const onRedo = useCallback(() => {
      const h = historyRef.current;
      if (!historyCanRedo(h)) return;
      const next = historyRedo(h);
      historyRef.current = next;
      syncHistoryFlags();
      clearPendingMarks();
      pendingSelectionRef.current = next.present.selection;
      latest.current.onChange(next.present.doc);
    }, [syncHistoryFlags, clearPendingMarks]);

    const insertMentionItem = useCallback(
      (
        blockId: string,
        range: { from: number; to: number },
        trigger: string,
        item: MentionItem,
      ) => {
        commit(insertMention(latest.current.value, blockId, range, trigger, item), 'other');
        clearPendingMarks();
      },
      [commit, clearPendingMarks],
    );

    const mention = useMention({
      enabled: !!mentions && !readOnly,
      rootRef,
      doc: value,
      trigger: mentions?.trigger ?? '@',
      onQuery: mentions?.onQuery,
      onInsert: insertMentionItem,
    });

    // Shared by the keyboard shortcut and the toolbar: with a collapsed caret,
    // stage a pending mark for the next typed text (remembering where); with a
    // selection, toggle the mark over it now.
    const stageOrToggleMark = useCallback(
      (range: Range, mark: Mark) => {
        if (isCollapsed(range)) {
          pendingAtRef.current = range.anchor;
          setPendingMarks((prev) =>
            toggleInList(prev ?? marksAtCaretMarks(latest.current.value, range.anchor), mark),
          );
        } else {
          commit(runToggleMark(latest.current.value, range, mark));
        }
      },
      [commit],
    );

    // Open the link editor for the live selection: edit the link under the caret
    // if there is one (href pre-filled, Remove available), else create over the
    // selection (or insert at a collapsed caret on Apply).
    const openLinkEditor = useCallback(() => {
      if (latest.current.readOnly) return;
      const root = rootRef.current;
      if (!root) return;
      const range = readSelection(root);
      if (!range) return;
      const existing = linkAt(latest.current.value, range.focus);
      const anchorRect = selectionRect(root);
      linkKeyRef.current += 1;
      setLinkEditor(
        existing
          ? {
              range: existing.range,
              href: existing.href,
              editing: true,
              anchorRect,
              key: linkKeyRef.current,
            }
          : { range, href: '', editing: false, anchorRect, key: linkKeyRef.current },
      );
    }, []);

    const onLinkApply = useCallback(
      (href: string) => {
        const le = linkEditor;
        if (!le) return;
        const trimmed = href.trim();
        if (trimmed !== '') {
          commit(setLink(latest.current.value, le.range, trimmed));
        } else if (le.editing) {
          commit(removeLink(latest.current.value, le.range));
        }
        // empty href while creating → just close (cancel).
        setLinkEditor(null);
        rootRef.current?.focus();
      },
      [linkEditor, commit],
    );

    const onLinkRemove = useCallback(() => {
      const le = linkEditor;
      if (!le) return;
      commit(removeLink(latest.current.value, le.range));
      setLinkEditor(null);
      rootRef.current?.focus();
    }, [linkEditor, commit]);

    const onLinkCancel = useCallback(() => {
      const le = linkEditor;
      setLinkEditor(null);
      const root = rootRef.current;
      if (root && le) writeSelection(root, le.range);
      root?.focus();
    }, [linkEditor]);

    // Restore the caret/selection after a model-driven re-render.
    useLayoutEffect(() => {
      // External value replacement (parent sets a wholly different doc) — reset
      // history so Undo can't travel back into the old document's timeline.
      if (value !== historyRef.current.present.doc) {
        historyRef.current = historyReset({ doc: value, selection: null });
        syncHistoryFlags();
      }
      const root = rootRef.current;
      const pending = pendingSelectionRef.current;
      if (root && pending) {
        writeSelection(root, pending);
        pendingSelectionRef.current = null;
      }
    }, [value, syncHistoryFlags]);

    // Native beforeinput (React's onBeforeInput is NOT the modern beforeinput —
    // it's a legacy textInput polyfill that carries no `inputType`).
    useEffect(() => {
      const root = rootRef.current;
      if (!root) return;
      const onBeforeInput = (e: InputEvent) => {
        const { value: doc, readOnly: ro, autolink: autolinkOn, renderLink: rl } = latest.current;
        if (ro || isComposingRef.current) return;
        // Undo/redo via beforeinput. Always preventDefault so the browser's native
        // contentEditable undo never mutates the DOM under the controlled model.
        // A ⌘Z/⌘⇧Z/⌘Y keydown ALSO emits a paired historyUndo/historyRedo here —
        // the keydown handler already ran onUndo/onRedo, so skip that one (within a
        // short window of the keydown). A menu/trackpad undo emits no keydown, so it
        // falls through and is honored here.
        if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
          e.preventDefault();
          if (Date.now() - historyKeyAtRef.current < 100) return;
          if (e.inputType === 'historyUndo') onUndo();
          else onRedo();
          return;
        }
        const range = readSelection(root);
        if (!range) return;
        // Markdown block input rules: a marker + space at the start of a paragraph
        // converts the block (e.g. "# " → heading, "- " → bullet). The space is
        // consumed; one commit → one undo step (⌘Z reverts the conversion).
        if (e.inputType === 'insertText' && e.data === ' ' && isCollapsed(range)) {
          const block = doc.blocks.find((b) => b.id === range.anchor.blockId);
          if (block) {
            const before = runsText(block.inlines).slice(0, range.anchor.offset);
            const match = matchBlockRule(block.type, before, ' ');
            if (match) {
              e.preventDefault();
              setPendingMarks(null);
              pendingAtRef.current = null;
              commit(applyBlockRule(doc, block.id, match), 'other');
              return;
            }
          }
        }
        // Autolink on type: typing a space after a URL links the URL AND inserts the
        // space — both in one commit (one undo step). `applyTypeAutolink` inserts the
        // boundary first (so it stays OUTSIDE the link) and links only the URL. Skips
        // when the caret is already inside a link.
        if (
          autolinkOn !== false &&
          e.inputType === 'insertText' &&
          e.data === ' ' &&
          isCollapsed(range)
        ) {
          const linked = applyTypeAutolink(doc, range.anchor, e.data);
          if (linked) {
            e.preventDefault();
            setPendingMarks(null);
            pendingAtRef.current = null;
            commit(linked, 'type');
            return;
          }
        }
        // Atomic delete: a Backspace just after (or Delete just before) a link that
        // `renderLink` resolves to a custom chip removes the whole link in one step.
        // `isResolved` probes `renderLink` with a stable fallback sentinel: a custom
        // return (chip) is `!== FALLBACK_SENTINEL`; declining returns the sentinel.
        if (
          rl &&
          (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward') &&
          isCollapsed(range)
        ) {
          const dir = e.inputType === 'deleteContentBackward' ? 'backward' : 'forward';
          const isResolved = (href: string) =>
            rl({ href, text: href }, FALLBACK_SENTINEL) !== FALLBACK_SENTINEL;
          const delRange = atomicLinkDeleteRange(doc, range.anchor, dir, isResolved);
          if (delRange) {
            e.preventDefault();
            setPendingMarks(null);
            pendingAtRef.current = null;
            commit(deleteRange(doc, delRange), 'delete');
            return;
          }
        }
        // Pending marks: a mark toggled at a collapsed caret applies to the next
        // typed text, then clears. Handle insertText here before generic input.
        const pend = pendingMarksRef.current;
        if (pend && e.inputType === 'insertText' && isCollapsed(range)) {
          const text = e.data ?? '';
          if (text) {
            e.preventDefault();
            const inserted = insertText(doc, range.anchor, text);
            const span: Range = {
              anchor: range.anchor,
              focus: { blockId: range.anchor.blockId, offset: range.anchor.offset + text.length },
            };
            const marked = applyExactMarks(inserted.doc, span, pend);
            setPendingMarks(null);
            pendingAtRef.current = null;
            commit({ doc: marked, selection: inserted.selection }, 'type');
            return;
          }
        }
        const data = e.data ?? e.dataTransfer?.getData('text/plain') ?? null;
        const result = applyInput(doc, range, e.inputType, data);
        if (result === null) {
          // Unsupported (incl. format* from ⌘B) — stop the browser editing, no
          // model change. Marks are handled in onKeyDown to avoid a double-toggle.
          if (e.inputType.startsWith('format')) e.preventDefault();
          return;
        }
        e.preventDefault();
        const kind: EditKind =
          e.inputType === 'insertText' ||
          e.inputType === 'insertCompositionText' ||
          e.inputType === 'insertReplacementText'
            ? 'type'
            : e.inputType.startsWith('delete')
              ? 'delete'
              : 'other';
        commit(result, kind);
      };
      root.addEventListener('beforeinput', onBeforeInput);
      return () => root.removeEventListener('beforeinput', onBeforeInput);
    }, [commit, onUndo, onRedo]);

    // Rich paste: when the clipboard carries HTML, parse it into the model and
    // splice it at the selection. No usable HTML → if autolink is on and the
    // plain text carries a URL, linkify it; otherwise don't preventDefault, so the
    // native beforeinput path inserts text/plain (unchanged behavior).
    useEffect(() => {
      const root = rootRef.current;
      if (!root) return;
      const onPaste = (e: ClipboardEvent) => {
        if (latest.current.readOnly) return;
        // File paste (images/files from the clipboard) → upload. Takes priority
        // over HTML/URL paste. Gated on `upload` being configured.
        if (latest.current.upload && !latest.current.readOnly) {
          const files = Array.from(e.clipboardData?.files ?? []);
          if (files.length > 0) {
            e.preventDefault();
            uploaderRef.current.uploadFiles(files);
            return;
          }
        }
        const html = e.clipboardData?.getData('text/html');
        if (html && html.trim()) {
          const range = readSelection(root);
          if (!range) return;
          const fragment = fromHtml(html);
          if (isEmptyDoc(fragment)) return;
          e.preventDefault();
          commit(insertFragment(latest.current.value, range, fragment));
          return;
        }
        // No usable HTML — autolink plain-text URLs.
        if (latest.current.autolink === false) return;
        const plain = e.clipboardData?.getData('text/plain');
        if (!plain || !plain.trim()) return;
        const runs = linkifyRuns(plain);
        const hasLink = runs.some((r) => r.marks.some((m) => m.type === 'link'));
        if (!hasLink) return; // no URL → let the native path insert the text
        const range = readSelection(root);
        if (!range) return;
        const trimmed = plain.trim();
        const whole = findUrl(trimmed);
        // A single bare URL pasted over a selection → link the selection in place.
        if (!isCollapsed(range) && whole && whole.start === 0 && whole.end === trimmed.length) {
          e.preventDefault();
          commit(setLink(latest.current.value, range, trimmed));
          return;
        }
        // Otherwise splice a one-paragraph fragment of linkified runs.
        const fragment: RichDoc = {
          blocks: [{ id: nextId(), type: 'paragraph', inlines: runs }],
        };
        e.preventDefault();
        commit(insertFragment(latest.current.value, range, fragment));
      };
      root.addEventListener('paste', onPaste);
      return () => root.removeEventListener('paste', onPaste);
    }, [commit]);

    useEffect(() => {
      if (autoFocus) rootRef.current?.focus();
    }, [autoFocus]);

    // Track the selection so the toolbar can reflect active marks + block type.
    // Only subscribed when the toolbar needs it (and the editor is editable).
    useEffect(() => {
      if (!toolbar || readOnly) return;
      const root = rootRef.current;
      if (!root) return;
      const onSelChange = () => {
        const sel = readSelection(root);
        setSelection(sel);
        // Abandon pending marks if the caret left its staged point (the user
        // moved the caret or made a selection instead of typing there).
        const pend = pendingMarksRef.current;
        const stagedAt = pendingAtRef.current;
        const sameSpot =
          sel != null &&
          isCollapsed(sel) &&
          stagedAt != null &&
          sel.anchor.blockId === stagedAt.blockId &&
          sel.anchor.offset === stagedAt.offset;
        if (pend && !sameSpot) {
          setPendingMarks(null);
          pendingAtRef.current = null;
        }
      };
      document.addEventListener('selectionchange', onSelChange);
      return () => document.removeEventListener('selectionchange', onSelChange);
    }, [toolbar, readOnly]);

    // Hover tracking (mouse). Listens on the SHELL (which wraps both the editable and
    // the gutter) so reaching from a block onto its controls keeps them alive:
    // `mouseover` over the gutter finds no `data-block-id` on the walk up (the gutter
    // isn't inside the editable), so blockIdFromNode returns null and hoverBlockId is
    // left unchanged — keeping the controls alive as you reach for them. `mouseleave`
    // on the shell fires only when the pointer truly leaves the editor → clear hover.
    useEffect(() => {
      if (!controlsOn) return;
      const shell = shellRef.current;
      if (!shell) return;
      const onOver = (e: MouseEvent) => {
        // Don't let hover steal the active block while the menu is open (its actions
        // are bound to the active block) or while a drag is in progress.
        if (blockMenuOpenRef.current || draggingRef.current) return;
        const id = blockIdFromNode(e.target as Node);
        if (id) setHoverBlockId(id);
      };
      // The gutter (＋ / ⠿) and the reserved left column are NOT inside the editable,
      // so `mouseover` there resolves to no block id and would leave the controls
      // stranded on whichever row was last hovered. Track the pointer's height while
      // it's over that controls column and activate the row at that height — so
      // hovering the controls area reveals/follows the adjacent row's controls.
      // Scoped to the no-block case so block-targeted hovers stay on the cheap
      // `mouseover` path; `mousemove` (not `mouseover`) is needed because sliding
      // within the column fires no new `mouseover`.
      const onMove = (e: MouseEvent) => {
        if (blockMenuOpenRef.current || draggingRef.current) return;
        const root = rootRef.current;
        if (!root) return;
        // Only the editable's OWN area (its reserved left column / padding). The gutter
        // overlay is a sibling of the editable, not a descendant, so this skips it —
        // its buttons stay alive via onOver's leave-unchanged path, and we never fight
        // the controls the pointer is aiming for.
        const target = e.target as Node;
        if (!root.contains(target)) return;
        if (blockIdFromNode(target)) return; // a real block hover — onOver has it
        const id = blockAtPointerY(root, e.clientY);
        if (id) setHoverBlockId(id);
      };
      const onLeave = () => {
        // Keep the active block while the menu is open or a drag is mid-flight.
        if (blockMenuOpenRef.current || draggingRef.current) return;
        setHoverBlockId(null);
      };
      shell.addEventListener('mouseover', onOver);
      shell.addEventListener('mousemove', onMove);
      shell.addEventListener('mouseleave', onLeave);
      return () => {
        shell.removeEventListener('mouseover', onOver);
        shell.removeEventListener('mousemove', onMove);
        shell.removeEventListener('mouseleave', onLeave);
      };
    }, [controlsOn, blockIdFromNode, blockAtPointerY]);

    // Caret tracking → active block (keyboard users get a gutter target too).
    useEffect(() => {
      if (!controlsOn) return;
      const onSel = () => {
        const root = rootRef.current;
        const sel = root?.ownerDocument.getSelection();
        if (sel && root && sel.anchorNode && root.contains(sel.anchorNode)) {
          const id = blockIdFromNode(sel.anchorNode);
          if (id) setCaretBlockId(id);
        }
      };
      document.addEventListener('selectionchange', onSel);
      return () => document.removeEventListener('selectionchange', onSel);
    }, [controlsOn, blockIdFromNode]);

    const onKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (readOnly) return;
        const root = rootRef.current;
        if (!root) return;
        // Undo/redo don't need a live selection — check them BEFORE the
        // readSelection guard so ⌘Z still works if the caret was lost. stopPropagation
        // keeps the shortcut from triggering a host app's undo. preventDefault
        // suppresses the browser's native contentEditable undo. We stamp the time so
        // the paired historyUndo/historyRedo beforeinput (emitted by this same
        // keydown) is skipped there rather than double-applied.
        const mod = e.metaKey || e.ctrlKey;
        if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          historyKeyAtRef.current = Date.now();
          onUndo();
          return;
        }
        if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
          e.preventDefault();
          e.stopPropagation();
          historyKeyAtRef.current = Date.now();
          onRedo();
          return;
        }
        const range = readSelection(root);
        if (!range) return;
        if (controlsOn) {
          const caretBlock = range.anchor.blockId;
          if (mod && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();
            e.stopPropagation();
            commit(moveBlockUnit(value, caretBlock, e.key === 'ArrowUp' ? -1 : 1), 'other');
            return;
          }
          if (mod && !e.shiftKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            e.stopPropagation();
            commit(duplicateBlockUnit(value, caretBlock), 'other');
            return;
          }
          if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
            e.preventDefault();
            // Clear hover so the menu binds to the caret block, not a stale hovered one.
            setHoverBlockId(null);
            setCaretBlockId(caretBlock);
            setBlockMenuOpen(true);
            return;
          }
        }
        // Mention menu navigation takes priority over editor keys when open.
        if (mention.open && mention.items.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            mention.move(1);
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            mention.move(-1);
            return;
          }
          if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            mention.commitActive();
            return;
          }
        }
        if (mention.open && e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          mention.close();
          return;
        }
        // ⌘/Ctrl+K opens the link editor (create or edit a link). Stop
        // propagation so the shortcut doesn't ALSO trigger a host app's global
        // ⌘K (command palette / search) while the editor is focused.
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          e.stopPropagation();
          openLinkEditor();
          return;
        }

        const blockType = deriveCurrentBlock(value, range)?.type;
        const inList = blockType === 'bullet_item' || blockType === 'ordered_item';

        // Tab / Shift+Tab indent/outdent — only inside a list, so Tab still
        // moves focus out of the editor everywhere else (keyboard a11y).
        if (e.key === 'Tab' && inList) {
          e.preventDefault();
          commit(runIndent(value, range, e.shiftKey ? 'out' : 'in'));
          return;
        }

        // Enter in an EMPTY list item exits the list (→ paragraph).
        if (e.key === 'Enter' && inList && isCollapsed(range)) {
          const idx = value.blocks.findIndex((b) => b.id === range.anchor.blockId);
          if (idx !== -1 && blockLength(value.blocks[idx]) === 0) {
            e.preventDefault();
            commit(runSetBlock(value, range, { type: 'paragraph' }));
            return;
          }
        }

        // Mark shortcut: with a collapsed caret, stage a pending mark for the
        // next typed text instead of a no-op toggle; with a selection, toggle it.
        const mark = shortcutMark(e);
        if (mark) {
          e.preventDefault();
          stageOrToggleMark(range, mark);
          return;
        }
      },
      [
        value,
        readOnly,
        commit,
        stageOrToggleMark,
        openLinkEditor,
        onUndo,
        onRedo,
        mention,
        controlsOn,
      ],
    );

    const onCompositionStart = useCallback(() => {
      isComposingRef.current = true;
    }, []);

    const onCompositionEnd = useCallback(
      (e: React.CompositionEvent<HTMLDivElement>) => {
        isComposingRef.current = false;
        const root = rootRef.current;
        if (readOnly || !root) return;
        const text = e.data;
        if (!text) return;
        // The browser composed text into the DOM (diverged from the model). Read
        // where the caret now is, map it back, and replace the composed span:
        // delete the composed text length before the caret, then insert it into
        // the model — then re-render snaps the DOM back to the model.
        const range = readSelection(root);
        if (!range) return;
        const caret = range.focus;
        const start = { blockId: caret.blockId, offset: Math.max(0, caret.offset - text.length) };
        const result = applyInput(value, { anchor: start, focus: caret }, 'insertText', text);
        if (result) commit(result, 'type');
      },
      [value, readOnly, commit],
    );

    // Active marks + current block derived from the live selection for the toolbar.
    const toolbarMarks = useMemo<MarkType[]>(
      () => (selection ? deriveActiveMarks(value, selection, pendingMarks) : []),
      [value, selection, pendingMarks],
    );
    const toolbarBlock = useMemo<BlockChoice | null>(
      () => (selection ? deriveCurrentBlock(value, selection) : null),
      [value, selection],
    );
    const toolbarLinkActive = useMemo<boolean>(
      () => (selection ? linkAt(value, selection.focus) != null : false),
      [value, selection],
    );

    // Toolbar dispatch — read the live selection (falling back to tracked state)
    // and route through the same commit path the keyboard uses. A mark at a
    // collapsed caret stages a pending mark, mirroring the keyboard shortcut.
    const onInsertEmoji = useCallback(
      (emoji: string) => {
        const root = rootRef.current;
        const range = (root ? readSelection(root) : null) ?? selection;
        if (range) commit(insertText(latest.current.value, range.anchor, emoji));
      },
      [selection, commit],
    );

    const onToolbarMark = useCallback(
      (type: MarkType) => {
        if (type === 'link' || type === 'mention') return; // link needs an href; mention needs id+label — toolbar fires neither
        const root = rootRef.current;
        const range = (root ? readSelection(root) : null) ?? selection;
        if (range) stageOrToggleMark(range, { type });
      },
      [selection, stageOrToggleMark],
    );
    const onToolbarSetBlock = useCallback(
      (choice: BlockChoice) => {
        const root = rootRef.current;
        const range = (root ? readSelection(root) : null) ?? selection;
        if (range) commit(runSetBlock(value, range, choice));
      },
      [value, selection, commit],
    );
    const onToolbarToggleList = useCallback(
      (listType: 'bullet_item' | 'ordered_item') => {
        const root = rootRef.current;
        const range = (root ? readSelection(root) : null) ?? selection;
        if (range) commit(runToggleList(value, range, listType));
      },
      [value, selection, commit],
    );

    const onBlockInsertBelow = useCallback(
      (id: string) => commit(insertEmptyBlockBelow(latest.current.value, id), 'other'),
      [commit],
    );
    const onBlockAction = useCallback(
      (id: string, action: BlockAction) => {
        const v = latest.current.value;
        switch (action) {
          case 'duplicate':
            commit(duplicateBlockUnit(v, id), 'other');
            break;
          case 'moveUp':
            commit(moveBlockUnit(v, id, -1), 'other');
            break;
          case 'moveDown':
            commit(moveBlockUnit(v, id, 1), 'other');
            break;
          case 'delete':
            commit(removeBlockUnit(v, id), 'other');
            break;
          default: {
            // Exhaustiveness: a new BlockAction must be handled above.
            const _never: never = action;
            return _never;
          }
        }
        setBlockMenuOpen(false);
      },
      [commit],
    );
    const onBlockTurnInto = useCallback(
      (id: string, choice: BlockChoice) => {
        const v = latest.current.value;
        const range = { anchor: { blockId: id, offset: 0 }, focus: { blockId: id, offset: 0 } };
        // "Turn into X" is an idempotent SET (not a toggle) on the single anchor
        // block — choosing the block's current type is a no-op, never a revert.
        // List types carry depth 0; runSetBlock routes both through setBlockType.
        const patch =
          choice.type === 'bullet_item' || choice.type === 'ordered_item'
            ? { type: choice.type, depth: 0 }
            : choice;
        commit(runSetBlock(v, range, patch), 'other');
        setBlockMenuOpen(false);
      },
      [commit],
    );
    const onBlockReorder = useCallback(
      (id: string, targetIndex: number) =>
        commit(moveBlockUnitToIndex(latest.current.value, id, targetIndex), 'other'),
      [commit],
    );

    // Attachment config popover. Config edits don't move the caret meaningfully —
    // the popover holds focus — so each commit pins a collapsed selection on the
    // block. Open/close toggle `configBlockId`; close returns focus to the editor.
    const blockCaret = (id: string): Range => ({
      anchor: { blockId: id, offset: 0 },
      focus: { blockId: id, offset: 0 },
    });
    const onConfigOpen = useCallback((id: string) => setConfigBlockId(id), []);
    const onConfigClose = useCallback(() => {
      setConfigBlockId(null);
      rootRef.current?.focus();
    }, []);
    const onConfigAlt = useCallback(
      (id: string, alt: string) => {
        commit(
          {
            doc: updateAttachmentBlock(latest.current.value, id, { alt }),
            selection: blockCaret(id),
          },
          'other',
        );
      },
      [commit],
    );
    const onConfigAlign = useCallback(
      (id: string, align: 'left' | 'center' | 'right') => {
        commit(
          {
            doc: updateAttachmentBlock(latest.current.value, id, { align }),
            selection: blockCaret(id),
          },
          'other',
        );
      },
      [commit],
    );
    const onConfigWidth = useCallback(
      (id: string, width: number) => {
        // Live resize: fires on every slider/handle MOVE (not just the end) so the
        // image tracks the control. Three deliberate choices vs a plain `commit`:
        //  • Coalescing 'resize' kind → the whole drag is ONE undo step (reverting
        //    to the pre-drag width), instead of one per pixel.
        //  • No `pendingSelectionRef` write → the slider/handle keeps focus; a
        //    `writeSelection` into the editable would yank focus mid-drag.
        //  • Reads `liveDocRef` (the synchronously-latest doc) so rapid moves that
        //    fire before React re-renders still chain off each other.
        // Width only; clearing height lets the browser keep the aspect ratio.
        let d = updateAttachmentBlock(liveDocRef.current, id, { width });
        d = clearAttachmentFields(d, id, ['height']);
        if (d === liveDocRef.current) return;
        historyRef.current = historyRecord(
          historyRef.current,
          { doc: d, selection: historyRef.current.present.selection },
          'resize',
          Date.now(),
        );
        syncHistoryFlags();
        liveDocRef.current = d;
        latest.current.onChange(d);
      },
      [syncHistoryFlags],
    );
    const onConfigWidthReset = useCallback(
      (id: string) => {
        commit(
          {
            doc: clearAttachmentFields(latest.current.value, id, ['width', 'height']),
            selection: blockCaret(id),
          },
          'other',
        );
      },
      [commit],
    );
    const onConfigReplace = useCallback((id: string, file: File) => {
      uploaderRef.current.replace(id, file);
      // The block flips to `status: 'uploading'`, which unmounts the popover (it
      // only shows for `ready`). Clear config state too so it doesn't spontaneously
      // reappear when the upload settles back to `ready`.
      setConfigBlockId(null);
    }, []);

    // Delegate clicks on the error-state attachment Retry/Remove buttons (they
    // carry data-attachment-action + data-block-id). On the editable so it works
    // in every return branch, including the toolbar-less bare-fragment path.
    const onEditableClick = useCallback((e: React.MouseEvent) => {
      if (latest.current.readOnly) return; // never mutate a read-only doc
      const el = (e.target as HTMLElement).closest?.('[data-attachment-action]');
      if (!el) return;
      const id = el.getAttribute('data-block-id');
      const action = el.getAttribute('data-attachment-action');
      if (!id) return;
      if (action === 'retry') uploaderRef.current.retry(id);
      else if (action === 'remove') uploaderRef.current.remove(id);
    }, []);

    const editable = (
      <div
        // {...rest} FIRST so the component's own role/aria/contentEditable/handlers
        // below win — the textbox contract must be preserved (Rule 7, Pattern B).
        // A consumer aria-label still flows in via the spread AND is read above to
        // decide whether to fall back to the i18n default.
        {...rest}
        ref={setRefs}
        className={clsx(
          styles.root,
          readOnly && styles.readOnly,
          controlsOn && styles.withGutter,
          className,
        )}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-readonly={readOnly || undefined}
        // Mentions makes the textbox an editable combobox. role stays "textbox"
        // (ARIA combobox is single-line only; this editor is multiline), with
        // aria-autocomplete + aria-controls + aria-activedescendant describing the
        // popup. Gated so a readOnly or mention-less editor advertises no popup.
        aria-haspopup={mentions && !readOnly ? 'listbox' : undefined}
        aria-autocomplete={mentions && !readOnly ? 'list' : undefined}
        aria-expanded={mentions && !readOnly ? mention.open : undefined}
        aria-controls={mention.open ? mention.listboxId : undefined}
        aria-activedescendant={mention.open ? mention.activeOptionId : undefined}
        aria-label={
          rest['aria-label'] ??
          (rest['aria-labelledby'] ? undefined : t('richTextEditor.editorLabel'))
        }
        data-empty={isEmptyDoc(value) ? '' : undefined}
        data-placeholder={placeholder}
        spellCheck
        onKeyDown={onKeyDown}
        onClick={onEditableClick}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        // Only tracked for `toolbar="auto"` (gates the bar's visibility); omitted
        // otherwise so other modes never re-render on focus changes.
        onFocus={autoToolbar ? () => setFocused(true) : undefined}
        onBlur={autoToolbar ? () => setFocused(false) : undefined}
      >
        {renderDoc(value, { editable: true, renderLink, renderMention })}
      </div>
    );

    const linkBubble =
      linkEditor && !readOnly ? (
        <RichTextLinkEditor
          key={linkEditor.key}
          href={linkEditor.href}
          editing={linkEditor.editing}
          anchorRect={linkEditor.anchorRect}
          // Re-derive the anchor from the captured model range on each reposition so
          // the bubble tracks the line on scroll (the editor's live selection is
          // gone once the URL input takes focus, so re-measure the range, not it).
          getAnchorRect={() =>
            rootRef.current ? rangeRect(rootRef.current, linkEditor.range) : null
          }
          onApply={onLinkApply}
          onRemove={onLinkRemove}
          onCancel={onLinkCancel}
        />
      ) : null;

    const mentionMenu =
      mention.open && !readOnly && mention.anchorRect ? (
        <RichTextMentionMenu
          items={mention.items}
          activeIndex={mention.activeIndex}
          anchorRect={mention.anchorRect}
          getAnchorRect={mention.getAnchorRect}
          listboxId={mention.listboxId}
          getOptionId={mention.getOptionId}
          label={t('richTextEditor.mentionsLabel')}
          emptyLabel={t('richTextEditor.mentionsEmpty')}
          onSelect={mention.selectIndex}
          onHover={mention.setActiveIndex}
        />
      ) : null;

    const activeBlock = activeBlockId
      ? value.blocks.find((b) => b.id === activeBlockId)
      : undefined;
    const activeBlockType = activeBlock?.type;
    const canConfigure =
      uploadOn && activeBlock?.type === 'attachment' && activeBlock.status === 'ready';
    const configBlock = configBlockId
      ? value.blocks.find((b) => b.id === configBlockId)
      : undefined;
    const blockControlsEl = controlsOn ? (
      <RichTextBlockControls
        rootRef={shellRef}
        activeBlockId={activeBlockId}
        blockOrderKey={value.blocks.map((b) => b.id).join('|')}
        activeBlockType={activeBlockType}
        menuOpen={blockMenuOpen}
        onMenuOpenChange={setBlockMenuOpen}
        onInsertBelow={onBlockInsertBelow}
        onAction={onBlockAction}
        onTurnInto={onBlockTurnInto}
        onReorder={onBlockReorder}
        onConfigure={canConfigure ? onConfigOpen : undefined}
        onDraggingChange={(d) => {
          draggingRef.current = d;
        }}
      />
    ) : null;

    // A bottom-right resize handle on the active image — only when it renders as a
    // preview (a safe, fetchable src) AND the keyboard-accessible Width slider is
    // also available (`uploadOn`, same as `canConfigure`), so the pointer-only handle
    // never appears without its accessible fallback. The layoutKey carries the
    // image's width so the handle re-measures and tracks the corner as it resizes.
    const activeIsResizableImage =
      controlsOn &&
      uploadOn &&
      activeBlock?.type === 'attachment' &&
      activeBlock.status === 'ready' &&
      attachmentIsImage(activeBlock) &&
      !!safeHref(activeBlock.src ?? '');
    const imageResizerEl =
      activeIsResizableImage && activeBlockId ? (
        <RichTextImageResizer
          rootRef={shellRef}
          blockId={activeBlockId}
          layoutKey={`${value.blocks.map((b) => b.id).join('|')}:${activeBlock?.width ?? ''}`}
          maxWidth={rootRef.current?.getBoundingClientRect().width ?? 600}
          onResize={(w) => onConfigWidth(activeBlockId, w)}
          onDraggingChange={(d) => {
            draggingRef.current = d;
          }}
        />
      ) : null;

    const configEl =
      configBlock && configBlock.type === 'attachment' && configBlock.status === 'ready' && uploadOn
        ? (() => {
            const figEl = rootRef.current?.querySelector<HTMLElement>(
              `[data-block-id="${CSS.escape(configBlock.id)}"]`,
            );
            const r = figEl?.getBoundingClientRect();
            if (!r) return null;
            return (
              <RichTextAttachmentConfig
                key={configBlock.id}
                block={configBlock}
                anchorRect={{ top: r.top, left: r.left, width: r.width, height: r.height }}
                getAnchorRect={() => {
                  // Re-query the figure live so the popover tracks it on scroll.
                  const el = rootRef.current?.querySelector<HTMLElement>(
                    `[data-block-id="${CSS.escape(configBlock.id)}"]`,
                  );
                  if (!el) return null;
                  const b = el.getBoundingClientRect();
                  return { top: b.top, left: b.left, width: b.width, height: b.height };
                }}
                maxWidth={rootRef.current?.getBoundingClientRect().width ?? 600}
                accept={latest.current.upload?.accept}
                onAltChange={(alt) => onConfigAlt(configBlock.id, alt)}
                onAlignChange={(align) => onConfigAlign(configBlock.id, align)}
                onWidthChange={(w) => onConfigWidth(configBlock.id, w)}
                onWidthReset={() => onConfigWidthReset(configBlock.id)}
                onReplace={(file) => onConfigReplace(configBlock.id, file)}
                onClose={onConfigClose}
              />
            );
          })()
        : null;

    // Toolbar visibility. `true` → always; `'auto'` → focused, non-empty, or while
    // one of the editor's own overlays is open (so opening the link editor on a
    // focused-but-empty composer keeps the bar up rather than collapsing it). The
    // overlay term is what survives the blur caused by the overlay stealing focus.
    const overlayOpen = linkEditor != null || mention.open;
    const showToolbar =
      toolbar === true || (autoToolbar && (focused || !isEmptyDoc(value) || overlayOpen));
    // Render the stable `.shell` whenever a toolbar mode is active (so the bar can
    // toggle WITHOUT remounting the editable) or block controls need the anchor.
    const usesShell = toolbar === true || autoToolbar || controlsOn;

    const toolbarBar = showToolbar ? (
      <RichTextToolbar
        activeMarks={toolbarMarks}
        block={toolbarBlock}
        disabled={readOnly}
        onToggleMark={onToolbarMark}
        onSetBlock={onToolbarSetBlock}
        onToggleList={onToolbarToggleList}
        linkActive={toolbarLinkActive}
        onOpenLink={openLinkEditor}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        onUpload={uploadOn ? (files) => uploaderRef.current.uploadFiles(files) : undefined}
        uploadAccept={upload?.accept}
        onInsertEmoji={onInsertEmoji}
      />
    ) : null;

    if (!usesShell) {
      return (
        <>
          {editable}
          {linkBubble}
          {mentionMenu}
        </>
      );
    }
    return (
      <div className={styles.shell} ref={shellRef}>
        {toolbarBar}
        {editable}
        {linkBubble}
        {mentionMenu}
        {blockControlsEl}
        {imageResizerEl}
        {configEl}
      </div>
    );
  },
);
