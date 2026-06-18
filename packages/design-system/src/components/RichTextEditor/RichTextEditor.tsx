import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
} from 'react';
import clsx from 'clsx';
import type { RichDoc, Range } from '../RichText/engine/model';
import { renderDoc } from '../RichText/engine/renderDoc';
import { blockLength } from '../RichText/engine/position';
import { useTranslation } from '../../i18n';
import { readSelection, writeSelection } from './selection';
import { applyInput } from './input';
import { applyShortcut } from './shortcuts';
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
}

function isEmptyDoc(doc: RichDoc): boolean {
  return doc.blocks.length === 1 && blockLength(doc.blocks[0]) === 0;
}

/**
 * Controlled rich-text editor — a contentEditable surface over the in-house
 * engine. Type to edit; ⌘/Ctrl+B/I/U and ⌘/Ctrl+⇧X toggle marks over a
 * selection; Enter splits, Backspace/Delete merge. The model is the source of
 * truth: every input is replayed as an engine transform and the DOM re-rendered.
 *
 * @example
 * const [doc, setDoc] = useState(emptyDoc());
 * <RichTextEditor value={doc} onChange={setDoc} placeholder="Write a note…" />
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
 * - ❌ Expecting a toolbar / lists / links / undo — not in this slice; use the
 *   keyboard shortcuts for marks and Enter/Backspace for structure.
 */
export const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(
  function RichTextEditor(
    { value, onChange, readOnly = false, placeholder, autoFocus, className, ...rest },
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

    const onKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (readOnly) return;
        const root = rootRef.current;
        if (!root) return;
        const range = readSelection(root);
        if (!range) return;
        const result = applyShortcut(value, range, e);
        if (!result) return;
        e.preventDefault();
        commit(result);
      },
      [value, readOnly, commit],
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

    return (
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
  },
);
