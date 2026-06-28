import { useCallback, useRef, useState } from 'react';
import type { RichDoc, Range } from '../RichText/engine/model';
import type { EditKind } from './history';
import { linkAt, setLink, removeLink } from './links';
import { readSelection, writeSelection, selectionRect, type Rect } from './selection';

/** Open-state of the floating link editor: the captured model range, the href
 * being edited, whether it's editing an existing link (vs. creating) — which
 * gates the Remove action and the empty-href→remove branch — the anchor rect to
 * position against, and a `key` that remounts the bubble on each open. */
export interface LinkEditorOpen {
  range: Range;
  href: string;
  editing: boolean;
  anchorRect: Rect;
  key: number;
}

interface UseLinkEditorArgs {
  /** The editable root — read to resolve the live selection and to refocus. */
  rootRef: React.RefObject<HTMLDivElement | null>;
  /** The editor's commit path (history + onChange round-trip). */
  commit: (result: { doc: RichDoc; selection: Range }, kind?: EditKind) => void;
  /** The synchronously-latest controlled doc (`() => latest.current.value`). */
  getValue: () => RichDoc;
  /** The synchronously-latest readOnly flag (`() => latest.current.readOnly`). */
  getReadOnly: () => boolean;
}

/**
 * The link-editor cluster, extracted from `RichTextEditor`: owns the open-state
 * and the apply/remove/cancel handlers for the floating link editor. The editor
 * keeps the `<RichTextLinkEditor>` JSX (it needs `rangeRect`/`rootRef` from
 * render scope) and the toolbar's `linkActive` derivation (a render-memo on the
 * live selection, not on this open-state) — only the state + handlers live here.
 *
 * Returns the open-state plus stable handlers. `openLinkEditor` opens for the
 * live selection (editing the link under the caret if there is one — href
 * pre-filled, Remove available — else creating over the selection, inserting at
 * a collapsed caret on Apply); `onLinkApply`/`onLinkRemove` route through
 * `commit`; `onLinkCancel` restores the captured selection and refocuses.
 */
export function useLinkEditor({ rootRef, commit, getValue, getReadOnly }: UseLinkEditorArgs) {
  // Link editor state.
  const [linkEditor, setLinkEditor] = useState<LinkEditorOpen | null>(null);
  const linkKeyRef = useRef(0);

  // Open the link editor for the live selection: edit the link under the caret
  // if there is one (href pre-filled, Remove available), else create over the
  // selection (or insert at a collapsed caret on Apply).
  const openLinkEditor = useCallback(() => {
    if (getReadOnly()) return;
    const root = rootRef.current;
    if (!root) return;
    const range = readSelection(root);
    if (!range) return;
    const existing = linkAt(getValue(), range.focus);
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
  }, [rootRef, getValue, getReadOnly]);

  const onLinkApply = useCallback(
    (href: string) => {
      const le = linkEditor;
      if (!le) return;
      const trimmed = href.trim();
      if (trimmed !== '') {
        commit(setLink(getValue(), le.range, trimmed));
      } else if (le.editing) {
        commit(removeLink(getValue(), le.range));
      }
      // empty href while creating → just close (cancel).
      setLinkEditor(null);
      rootRef.current?.focus();
    },
    [linkEditor, commit, getValue, rootRef],
  );

  const onLinkRemove = useCallback(() => {
    const le = linkEditor;
    if (!le) return;
    commit(removeLink(getValue(), le.range));
    setLinkEditor(null);
    rootRef.current?.focus();
  }, [linkEditor, commit, getValue, rootRef]);

  const onLinkCancel = useCallback(() => {
    const le = linkEditor;
    setLinkEditor(null);
    const root = rootRef.current;
    if (root && le) writeSelection(root, le.range);
    root?.focus();
  }, [linkEditor, rootRef]);

  return { linkEditor, openLinkEditor, onLinkApply, onLinkRemove, onLinkCancel };
}
