// RichTextImageResizer.tsx — a drag handle overlaid on a ready image attachment's
// bottom-right corner. Lives in the editor shell (outside the contentEditable),
// positioned over the image; dragging it resizes the image width live (the same
// model path the Configure → Width slider drives). It is a POINTER affordance only
// (mirrors the gutter drag handle); keyboard / assistive-tech users resize via the
// Configure → Width slider, which is the accessible, keyboard-operable control.
import { memo, useCallback, useRef, type RefObject } from 'react';
import { useTranslation } from '../../i18n';
import { useShellRelativeRect, useDraggingReporter } from './useOverlayRect';
import styles from './RichTextEditor.module.scss';

/** Smallest width the handle resizes to (matches RichTextAttachmentConfig's MIN_W). */
const MIN_W = 80;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export interface RichTextImageResizerProps {
  /** The editor shell element ref — to locate the image and anchor the handle. */
  rootRef: RefObject<HTMLElement | null>;
  /** Id of the active (ready, previewable) image attachment block. */
  blockId: string;
  /**
   * A signature that changes whenever block order or the image's width shifts, so
   * the handle re-measures and stays glued to the (resizing) image's corner.
   */
  layoutKey?: string;
  /** Upper clamp for the width (the editor's content width, px). */
  maxWidth: number;
  /** Live width — fired on every pointer move (the last move seals the value). */
  onResize: (width: number) => void;
  /**
   * Reports drag start/end so the editor can suppress hover-driven active-block
   * changes while resizing (mirrors RichTextBlockControls' onDraggingChange).
   */
  onDraggingChange?: (dragging: boolean) => void;
}

/**
 * Internal: the bottom-right resize handle for a ready image attachment. Rendered
 * by `<RichTextEditor>` when the active block is a previewable image; not exported
 * from the package.
 */
export const RichTextImageResizer = memo(function RichTextImageResizer({
  rootRef,
  blockId,
  layoutKey,
  maxWidth,
  onResize,
  onDraggingChange,
}: RichTextImageResizerProps) {
  const t = useTranslation();
  // Drag origin, captured on pointerdown. null when not dragging.
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  // Reports drag start/end + fires (false) on a mid-drag unmount (image removed,
  // blockControls/readOnly toggled, or `value` replaced) so the editor's draggingRef
  // never sticks `true`. Mirrors RichTextBlockControls.
  const reportDragging = useDraggingReporter(onDraggingChange);

  const imgEl = useCallback(
    () =>
      rootRef.current?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(blockId)}"] img`) ??
      null,
    [rootRef, blockId],
  );

  // Position the handle on the image's bottom-right corner, measured relative to the
  // shell. Re-runs on layoutKey so it tracks the corner as the image resizes.
  const rect = useShellRelativeRect(rootRef, imgEl, layoutKey);
  const box = rect ? { top: rect.top + rect.height, left: rect.left + rect.width } : null;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const img = imgEl();
    if (!img) return;
    e.preventDefault(); // don't move the caret / start a text selection
    e.stopPropagation(); // don't let the gutter dnd-kit sensor see this press
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startW: img.getBoundingClientRect().width };
    reportDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    // max(MIN_W, …) guards a sub-MIN_W editor so the upper clamp never falls below
    // the lower one (mirrors the slider's sliderMax floor).
    const hi = Math.max(MIN_W, Math.round(maxWidth));
    const next = clamp(Math.round(d.startW + (e.clientX - d.startX)), MIN_W, hi);
    onResize(next);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // capture may already be gone (pointercancel) — ignore
    }
    reportDragging(false);
  };

  if (!box) return null;

  return (
    <div
      className={styles.resizeHandle}
      style={{ top: box.top, left: box.left }}
      contentEditable={false}
      title={t('richTextEditor.attachmentResize')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    />
  );
});
