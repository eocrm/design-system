// RichTextAttachmentConfig.tsx — floating config popover for a ready attachment.
// Internal + presentational: the editor owns the model and passes the block's
// current values + callbacks. Mirrors RichTextLinkEditor's portal + Floating-UI
// virtual-anchor + Esc/pointerdown-outside pattern. Image attachments get alt/
// align/width/replace/open/download; non-image chips get replace/open/download.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, autoUpdate, flip, shift, offset } from '@floating-ui/react-dom';
import { Button } from '../Button';
import { Input } from '../Input';
import { Slider } from '../Slider';
import { Stack } from '../Stack';
import { Cluster } from '../Cluster';
import { useTranslation } from '../../i18n';
import type { Block } from '../RichText/engine/model';
import { safeHref } from '../RichText/engine/safeHref';
import { attachmentIsImage } from '../RichText/engine/attachment';
import styles from './RichTextEditor.module.scss';

export interface RichTextAttachmentConfigProps {
  /** The attachment block being configured (current values). */
  block: Block;
  /** Figure rect (viewport coords) to anchor the popover to. */
  anchorRect: { top: number; left: number; height: number; width: number };
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
 * package. Image attachments get alt / align / width / replace / open / download;
 * non-image chips get replace / open / download. Remount it (via `key`) per open
 * so the alt + width fields re-seed from the block.
 */
export function RichTextAttachmentConfig({
  block,
  anchorRect,
  maxWidth,
  accept,
  onAltChange,
  onAlignChange,
  onWidthChange,
  onWidthReset,
  onReplace,
  onClose,
}: RichTextAttachmentConfigProps) {
  const t = useTranslation();
  const isImage = attachmentIsImage(block);
  const popRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [alt, setAlt] = useState(block.alt ?? block.name ?? '');
  const sliderMax = Math.max(MIN_W + 1, Math.round(maxWidth));
  const [width, setWidth] = useState<number>(Math.min(block.width ?? sliderMax, sliderMax));

  // Floating UI virtual element — only `getBoundingClientRect` is required.
  const virtualRef = useMemo(
    () => ({
      getBoundingClientRect: () => ({
        x: anchorRect.left,
        y: anchorRect.top,
        top: anchorRect.top,
        left: anchorRect.left,
        right: anchorRect.left + anchorRect.width,
        bottom: anchorRect.top + anchorRect.height,
        width: anchorRect.width,
        height: anchorRect.height,
      }),
    }),
    [anchorRect],
  );
  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip(), shift({ padding: 4 })],
    elements: { reference: virtualRef },
  });
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      popRef.current = node;
      refs.setFloating(node);
    },
    [refs],
  );

  // Dismiss on a pointerdown outside the popover.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [onClose]);

  const href = safeHref(block.src ?? '');
  const curAlign = block.align ?? 'left';

  return createPortal(
    <div
      ref={setRefs}
      className={styles.configPopover}
      style={floatingStyles}
      role="group"
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
                onBlur={() => onAltChange(alt)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAltChange(alt);
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
            <Cluster gap="xs">
              <span className={styles.configLabel}>{t('richTextEditor.attachmentWidth')}</span>
              <Slider
                value={width}
                min={MIN_W}
                max={sliderMax}
                step={1}
                aria-label={t('richTextEditor.attachmentWidth')}
                onChange={(v) => setWidth(v as number)}
                onChangeEnd={(v) => onWidthChange(v as number)}
              />
              <Button size="sm" variant="ghost" onClick={onWidthReset}>
                {t('richTextEditor.attachmentWidthReset')}
              </Button>
            </Cluster>
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
