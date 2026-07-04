// RichTextAttachmentConfig.tsx — floating config popover for a ready attachment.
// Internal + presentational: the editor owns the model and passes the block's
// current values + callbacks. Mirrors RichTextLinkEditor's portal + Floating-UI
// virtual-anchor + Esc/pointerdown-outside pattern. Image attachments get alt/
// align/replace/open/download — plus width ONLY when the image renders as a
// preview (a safe, fetchable src — an embed); an uploaded object-URL image is a
// chip, so it gets no width. Non-image chips get replace/open/download.
import { useCallback, useEffect, useRef, useState } from 'react';
import { overlayStack, useFloatingSurface } from '../_internal/overlay';
import { createPortal } from 'react-dom';
import { Button } from '../Button';
import { Input } from '../Input';
import { Slider } from '../Slider';
import { Stack } from '../Stack';
import { Cluster } from '../Cluster';
import { useTranslation } from '../../i18n';
import type { Block } from '../RichText/engine/model';
import { safeHref } from '../RichText/engine/safeHref';
import { attachmentIsImage } from '../RichText/engine/attachment';
import type { Rect } from './selection';
import { useAnchoredFloating } from './useAnchoredFloating';
import { useDismissOnOutsidePointerDown } from './useDismissOnOutsidePointerDown';
import styles from './RichTextEditor.module.scss';

export interface RichTextAttachmentConfigProps {
  /** The attachment block being configured (current values). */
  block: Block;
  /** Figure rect (viewport coords) to anchor the popover to. */
  anchorRect: Rect;
  /**
   * Live anchor rect — re-queried by Floating UI on scroll/resize so the popover
   * tracks the figure (the static `anchorRect` is only the initial position; it
   * goes stale on a pure scroll). Falls back to `anchorRect` when it returns null.
   */
  getAnchorRect?: () => Rect | null;
  /** Editor content width (px) — the upper bound for the width slider. */
  maxWidth: number;
  /** Native picker filter for Replace. */
  accept?: string;
  onAltChange: (alt: string) => void;
  onAlignChange: (align: 'left' | 'center' | 'right') => void;
  onWidthChange: (width: number) => void;
  onWidthReset: () => void;
  onReplace: (file: File) => void;
  onClose: () => void;
}

const MIN_W = 80;
const ALIGNS = ['left', 'center', 'right'] as const;
const ALIGN_GLYPH: Record<(typeof ALIGNS)[number], string> = {
  left: '⇤',
  center: '↔',
  right: '⇥',
};
const ALIGN_LABEL_KEY = {
  left: 'richTextEditor.attachmentAlignLeft',
  center: 'richTextEditor.attachmentAlignCenter',
  right: 'richTextEditor.attachmentAlignRight',
} as const;

/**
 * Internal floating config popover for a ready attachment. Rendered by
 * `<RichTextEditor>` when the attachment config is open; not exported from the
 * package. Image attachments get alt / align / replace / open / download — and a
 * width slider ONLY when the image renders as a preview (a safe, fetchable src —
 * an embedded image); an uploaded object-URL image renders as a chip and gets no
 * width control. Non-image chips get replace / open / download. Remount it (via
 * `key`) per open so the alt + width fields re-seed from the block.
 */
export function RichTextAttachmentConfig({
  block,
  anchorRect,
  getAnchorRect,
  maxWidth,
  accept,
  onAltChange,
  onAlignChange,
  onWidthChange,
  onWidthReset,
  onReplace,
  onClose,
}: RichTextAttachmentConfigProps) {
  // #274: mounted only while open — register as a floating surface so
  // Modal/Drawer/Lightbox yield Escape to us (our own Escape handling closes
  // us; without registration one press would close the host too).
  useFloatingSurface(true);
  const t = useTranslation();
  const isImage = attachmentIsImage(block);
  const popRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const seededAlt = block.alt ?? block.name ?? '';
  const [alt, setAlt] = useState(seededAlt);
  const sliderMax = Math.max(MIN_W + 1, Math.round(maxWidth));
  const [width, setWidth] = useState<number>(
    Math.max(MIN_W, Math.min(block.width ?? sliderMax, sliderMax)),
  );

  // Commit alt only when it differs from what was shown on open, so a focus→blur
  // with no edit doesn't write the seeded `block.name` fallback into `alt`.
  const commitAlt = useCallback(() => {
    if (alt !== seededAlt) onAltChange(alt);
  }, [alt, seededAlt, onAltChange]);

  const { refs, floatingStyles } = useAnchoredFloating(anchorRect, getAnchorRect, { offset: 6 });
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      popRef.current = node;
      refs.setFloating(node);
    },
    [refs],
  );

  // Dismiss on a pointerdown outside the popover.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useDismissOnOutsidePointerDown(popRef, onClose);

  // #274: Escape from anywhere — see RichTextLinkEditor for the rationale
  // (focus trap can hold focus outside this body-portaled popover).
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      overlayStack.consumeEscape(e);
      onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  // Move focus into the popover on open so the Escape handler (on the container)
  // works without the trigger keeping focus — mirrors RichTextLinkEditor focusing
  // its input. Prefer the first focusable control (alt input, else first button).
  useEffect(() => {
    const root = popRef.current;
    if (!root) return;
    const focusable = root.querySelector<HTMLElement>('input, button, [tabindex]');
    focusable?.focus();
  }, []);

  const href = safeHref(block.src ?? '');
  const curAlign = block.align ?? 'left';
  // Slider is single-thumb here, so its value is a number; guard a tuple defensively.
  const sliderNum = (v: number | [number, number]): number => (Array.isArray(v) ? v[0] : v);

  return createPortal(
    <div
      ref={setRefs}
      className={styles.configPopover}
      style={floatingStyles}
      role="group"
      data-rte-overlay=""
      aria-label={t('richTextEditor.attachmentConfigure')}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <Stack gap="sm">
        {isImage && (
          <>
            <label className={styles.configRow}>
              <span className={styles.configLabel}>{t('richTextEditor.attachmentAlt')}</span>
              <Input
                size="sm"
                value={alt}
                aria-label={t('richTextEditor.attachmentAlt')}
                onChange={(e) => setAlt(e.target.value)}
                onBlur={commitAlt}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitAlt();
                  }
                }}
              />
            </label>
            <Cluster gap="xs">
              <span className={styles.configLabel}>{t('richTextEditor.attachmentAlign')}</span>
              {ALIGNS.map((a) => (
                <Button
                  key={a}
                  size="sm"
                  iconOnly
                  variant={curAlign === a ? 'secondary' : 'ghost'}
                  aria-pressed={curAlign === a}
                  aria-label={t(ALIGN_LABEL_KEY[a])}
                  onClick={() => onAlignChange(a)}
                >
                  {ALIGN_GLYPH[a]}
                </Button>
              ))}
            </Cluster>
            {/* Width is offered only for an image that actually renders as a
                preview — i.e. one with a safe, fetchable src (`href`). An uploaded
                image carries an object-URL src that `safeHref` blocks, so it renders
                as a download chip (RichTextAttachment uses the same isImage && href
                test); resizing such a chip does nothing, so the slider is hidden.
                Gating on the src (not on `block.width`) keeps it available after a
                Reset and for embeds that arrived without an explicit width attr. */}
            {href && (
              <Cluster gap="xs">
                <span className={styles.configLabel}>{t('richTextEditor.attachmentWidth')}</span>
                <Slider
                  value={width}
                  min={MIN_W}
                  max={sliderMax}
                  step={1}
                  aria-label={t('richTextEditor.attachmentWidth')}
                  onChange={(v) => {
                    const w = sliderNum(v);
                    setWidth(w); // drive the thumb
                    onWidthChange(w); // live: resize the image on every move
                  }}
                  onChangeEnd={(v) => onWidthChange(sliderNum(v))} // seal the final value
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onWidthReset();
                    setWidth(sliderMax); // re-seed the thumb to "natural/full"
                  }}
                >
                  {t('richTextEditor.attachmentWidthReset')}
                </Button>
              </Cluster>
            )}
          </>
        )}
        <Cluster gap="xs">
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onReplace(f);
              e.target.value = '';
            }}
          />
          <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
            {t('richTextEditor.attachmentReplace')}
          </Button>
          {href && (
            <a className={styles.configLink} href={href} target="_blank" rel="noopener noreferrer">
              {t('richTextEditor.attachmentOpen')}
            </a>
          )}
          {href && (
            <a className={styles.configLink} href={href} download rel="noopener noreferrer">
              {t('richTextEditor.attachmentDownload')}
            </a>
          )}
        </Cluster>
      </Stack>
    </div>,
    document.body,
  );
}
