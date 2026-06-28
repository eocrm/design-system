import { useCallback, useState } from 'react';
import type { RichDoc, Range } from '../RichText/engine/model';
import type { EditKind } from './history';
import { collapsedRange } from '../RichText/engine/position';
import { updateAttachmentBlock, clearAttachmentFields } from '../RichText/engine/attachment';

interface UseAttachmentConfigArgs {
  /** The editable root — read to refocus the editor on close. */
  rootRef: React.RefObject<HTMLDivElement | null>;
  /** The editor's commit path (history + onChange round-trip) for the
   * non-live config edits (alt / align / width-reset). */
  commit: (result: { doc: RichDoc; selection: Range }, kind?: EditKind) => void;
  /** The editor-owned live-resize commit: records ONE coalescing `'resize'`
   * history entry (whole drag = one undo step), writes NO pending selection (so
   * the slider/handle keeps focus mid-drag), and chains off `liveDocRef`. The
   * hook builds the resized doc and hands it here so the history coupling stays
   * isolated in the editor. */
  commitResizeLive: (doc: RichDoc) => void;
  /** The synchronously-latest controlled doc (`() => latest.current.value`). */
  getValue: () => RichDoc;
  /** The synchronously-latest live doc (`() => liveDocRef.current`) — read by
   * the live-resize handler so rapid moves chain off each other before React
   * re-renders. */
  getLiveDoc: () => RichDoc;
  /** Mirror of the upload controller — `replace` swaps an attachment's file. */
  uploaderRef: React.RefObject<{ replace: (id: string, file: File) => void }>;
}

/**
 * The attachment-config cluster, extracted from `RichTextEditor`: owns the
 * `configBlockId` open-state and the alt/align/width/width-reset/replace
 * handlers for the `<RichTextAttachmentConfig>` popover. The editor keeps the
 * popover JSX (it derives the configured block + anchor rect from render scope)
 * and the live-resize history coupling (via the injected `commitResizeLive`);
 * only the state + handlers live here.
 *
 * Config edits don't move the caret meaningfully (the popover holds focus), so
 * each non-live commit pins a collapsed selection on the block. `onConfigWidth`
 * is the LIVE-resize path (fires on every slider/handle move) — it builds the
 * resized doc here and routes through `commitResizeLive`, NOT `commit`.
 */
export function useAttachmentConfig({
  rootRef,
  commit,
  commitResizeLive,
  getValue,
  getLiveDoc,
  uploaderRef,
}: UseAttachmentConfigArgs) {
  const [configBlockId, setConfigBlockId] = useState<string | null>(null);

  // Open/close toggle `configBlockId`; close returns focus to the editor.
  const onConfigOpen = useCallback((id: string) => setConfigBlockId(id), []);
  const onConfigClose = useCallback(() => {
    setConfigBlockId(null);
    rootRef.current?.focus();
  }, [rootRef]);

  const onConfigAlt = useCallback(
    (id: string, alt: string) => {
      commit(
        {
          doc: updateAttachmentBlock(getValue(), id, { alt }),
          selection: collapsedRange(id),
        },
        'other',
      );
    },
    [commit, getValue],
  );
  const onConfigAlign = useCallback(
    (id: string, align: 'left' | 'center' | 'right') => {
      commit(
        {
          doc: updateAttachmentBlock(getValue(), id, { align }),
          selection: collapsedRange(id),
        },
        'other',
      );
    },
    [commit, getValue],
  );
  const onConfigWidth = useCallback(
    (id: string, width: number) => {
      // Live resize: fires on every slider/handle MOVE (not just the end) so the
      // image tracks the control. Three deliberate choices vs a plain `commit`,
      // all owned by the injected `commitResizeLive`:
      //  • Coalescing 'resize' kind → the whole drag is ONE undo step (reverting
      //    to the pre-drag width), instead of one per pixel.
      //  • No `pendingSelectionRef` write → the slider/handle keeps focus; a
      //    `writeSelection` into the editable would yank focus mid-drag.
      //  • Reads `liveDocRef` (the synchronously-latest doc) so rapid moves that
      //    fire before React re-renders still chain off each other.
      // Width only; clearing height lets the browser keep the aspect ratio.
      let d = updateAttachmentBlock(getLiveDoc(), id, { width });
      d = clearAttachmentFields(d, id, ['height']);
      commitResizeLive(d);
    },
    [commitResizeLive, getLiveDoc],
  );
  const onConfigWidthReset = useCallback(
    (id: string) => {
      commit(
        {
          doc: clearAttachmentFields(getValue(), id, ['width', 'height']),
          selection: collapsedRange(id),
        },
        'other',
      );
    },
    [commit, getValue],
  );
  const onConfigReplace = useCallback(
    (id: string, file: File) => {
      uploaderRef.current?.replace(id, file);
      // The block flips to `status: 'uploading'`, which unmounts the popover (it
      // only shows for `ready`). Clear config state too so it doesn't spontaneously
      // reappear when the upload settles back to `ready`.
      setConfigBlockId(null);
    },
    [uploaderRef],
  );

  return {
    configBlockId,
    onConfigOpen,
    onConfigClose,
    onConfigAlt,
    onConfigAlign,
    onConfigWidth,
    onConfigWidthReset,
    onConfigReplace,
  };
}
