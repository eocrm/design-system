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
import { renderDoc } from '../RichText/engine/renderDoc';
import { blockLength, isCollapsed } from '../RichText/engine/position';
import { linkAt, setLink, removeLink } from './links';
import { RichTextLinkEditor } from './RichTextLinkEditor';
import { insertText } from '../RichText/engine/transforms';
import { hasMark, withMark, withoutMark } from '../RichText/engine/marks';
import { useTranslation } from '../../i18n';
import { readSelection, writeSelection } from './selection';
import { applyInput } from './input';
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
import styles from './RichTextEditor.module.scss';

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
   * Render the built-in formatting toolbar above the editor — mark toggle
   * buttons (bold/italic/underline/strike), a block-type dropdown
   * (paragraph/headings/quote/code), and bullet/numbered list toggles. The
   * toolbar dispatches through the same commit path the keyboard uses and
   * reflects the active marks + current block of the live selection. Default
   * `false` (keyboard-only). When `readOnly`, the toolbar renders disabled.
   */
  toolbar?: boolean;
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
    if (caret.offset - 1 >= pos && caret.offset - 1 < end) return run.marks;
    pos = end;
  }
  return [];
}

type Rect = { top: number; left: number; height: number; width: number };

interface LinkEditorOpen {
  range: Range;
  href: string;
  editing: boolean;
  anchorRect: Rect;
  key: number;
}

/** The viewport rect of the current DOM selection, falling back to the editor root. */
function selectionRect(root: HTMLElement): Rect {
  const sel = typeof window !== 'undefined' ? window.getSelection() : null;
  if (sel && sel.rangeCount > 0) {
    let r: DOMRect | null = null;
    try {
      r = sel.getRangeAt(0).getBoundingClientRect();
    } catch {
      // jsdom does not implement Range.getBoundingClientRect — fall through.
    }
    if (r && (r.width || r.height || r.top || r.left)) {
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    }
  }
  const rr = root.getBoundingClientRect();
  return { top: rr.top, left: rr.left, width: 0, height: rr.height };
}

/**
 * Controlled rich-text editor — a contentEditable surface over the in-house
 * engine. Type to edit; ⌘/Ctrl+B/I/U and ⌘/Ctrl+⇧X toggle marks over a
 * selection (with a collapsed caret they stage a *pending* mark applied to the
 * next typed text); Enter splits, Backspace/Delete merge. Pass `toolbar` for the
 * built-in formatting toolbar. ⌘/Ctrl+K (or the toolbar link button) opens a
 * floating editor to add, edit, or remove a link on the selection. Inside a
 * list, Tab/⇧Tab indent/outdent and Enter on an empty item exits to a paragraph.
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
 * - ❌ Expecting undo/redo — not in this slice.
 * - ❌ Hand-rolling a link UI by reaching into the DOM — press ⌘/Ctrl+K or the
 *   toolbar link button; both open the built-in editor and route through the
 *   controlled `value`/`onChange` round-trip.
 * - ❌ Building your own toolbar by reaching into the DOM — pass `toolbar`, or
 *   drive marks/blocks through the controlled `value`/`onChange` round-trip.
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
    const latest = useRef({ value, onChange, readOnly });
    latest.current = { value, onChange, readOnly };

    // Link editor state.
    const [linkEditor, setLinkEditor] = useState<LinkEditorOpen | null>(null);
    const linkKeyRef = useRef(0);

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

    const commit = useCallback((result: { doc: RichDoc; selection: Range }) => {
      // No-op transforms (e.g. Backspace at the very start of the document)
      // return the SAME doc reference — skip so we don't fire onChange or leave a
      // stale pending selection that React would never consume (no re-render).
      if (result.doc === latest.current.value) return;
      pendingSelectionRef.current = result.selection;
      latest.current.onChange(result.doc);
    }, []);

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
      const root = rootRef.current;
      const pending = pendingSelectionRef.current;
      if (root && pending) {
        writeSelection(root, pending);
        pendingSelectionRef.current = null;
      }
    }, [value]);

    // Native beforeinput (React's onBeforeInput is NOT the modern beforeinput —
    // it's a legacy textInput polyfill that carries no `inputType`).
    useEffect(() => {
      const root = rootRef.current;
      if (!root) return;
      const onBeforeInput = (e: InputEvent) => {
        const { value: doc, readOnly: ro } = latest.current;
        if (ro || isComposingRef.current) return;
        const range = readSelection(root);
        if (!range) return;
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
            commit({ doc: marked, selection: inserted.selection });
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
        commit(result);
      };
      root.addEventListener('beforeinput', onBeforeInput);
      return () => root.removeEventListener('beforeinput', onBeforeInput);
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

    const onKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (readOnly) return;
        const root = rootRef.current;
        if (!root) return;
        const range = readSelection(root);
        if (!range) return;
        // ⌘/Ctrl+K opens the link editor (create or edit a link).
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
          e.preventDefault();
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
      [value, readOnly, commit, stageOrToggleMark, openLinkEditor],
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
        if (result) commit(result);
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
    const onToolbarMark = useCallback(
      (type: MarkType) => {
        if (type === 'link') return; // link needs an href; toolbar never fires it
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

    const editable = (
      <div
        // {...rest} FIRST so the component's own role/aria/contentEditable/handlers
        // below win — the textbox contract must be preserved (Rule 7, Pattern B).
        // A consumer aria-label still flows in via the spread AND is read above to
        // decide whether to fall back to the i18n default.
        {...rest}
        ref={setRefs}
        className={clsx(styles.root, readOnly && styles.readOnly, className)}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-readonly={readOnly || undefined}
        aria-label={
          rest['aria-label'] ??
          (rest['aria-labelledby'] ? undefined : t('richTextEditor.editorLabel'))
        }
        data-empty={isEmptyDoc(value) ? '' : undefined}
        data-placeholder={placeholder}
        spellCheck
        onKeyDown={onKeyDown}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
      >
        {renderDoc(value, { editable: true })}
      </div>
    );

    const linkBubble =
      linkEditor && !readOnly ? (
        <RichTextLinkEditor
          key={linkEditor.key}
          href={linkEditor.href}
          editing={linkEditor.editing}
          anchorRect={linkEditor.anchorRect}
          onApply={onLinkApply}
          onRemove={onLinkRemove}
          onCancel={onLinkCancel}
        />
      ) : null;

    if (!toolbar) {
      return (
        <>
          {editable}
          {linkBubble}
        </>
      );
    }
    return (
      <div className={styles.shell}>
        <RichTextToolbar
          activeMarks={toolbarMarks}
          block={toolbarBlock}
          disabled={readOnly}
          onToggleMark={onToolbarMark}
          onSetBlock={onToolbarSetBlock}
          onToggleList={onToolbarToggleList}
          linkActive={toolbarLinkActive}
          onOpenLink={openLinkEditor}
        />
        {editable}
        {linkBubble}
      </div>
    );
  },
);
