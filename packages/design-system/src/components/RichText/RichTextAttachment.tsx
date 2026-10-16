// RichTextAttachment.tsx — renders one attachment block's body (spinner / error /
// image preview / file chip). Pure presentational: the error Retry/Remove buttons
// carry data-attachment-action + data-block-id hooks the editor delegates (so the
// pure renderDoc stays callback-free). The read-only viewer renders the same markup;
// its action buttons simply have no editor delegate.
import { useId } from 'react';
import { RotateCw, X } from 'lucide-react';
import { Button } from '../Button';
import { CircularProgress } from '../CircularProgress';
import { Tooltip } from '../Tooltip';
import { useTranslation } from '../../i18n';
import type { Block } from './engine/model';
import { safeHref } from './engine/safeHref';
import { attachmentIsImage } from './engine/attachment';
import { AttachFileIcon } from './attachmentIcon';
import styles from './RichTextAttachment.module.scss';

export function RichTextAttachment({ block }: { block: Block }) {
  const t = useTranslation();
  const name = block.name ?? '';
  const errorId = useId();

  if (block.status === 'uploading') {
    return (
      <span className={styles.attachmentLoading}>
        <CircularProgress size="sm" aria-label={t('richTextEditor.uploadingFile')} />
        <span className={styles.attachmentName}>{name}</span>
      </span>
    );
  }
  if (block.status === 'error') {
    const retry = t('richTextEditor.uploadRetry');
    const remove = t('richTextEditor.uploadRemove');
    // The failure (and its reason) is visible text, reachable in browse mode; the
    // icon buttons also point aria-describedby at it so focusing Retry/Remove
    // says WHY (a persistent state → property, per Hard rule 10).
    return (
      <span className={styles.attachmentError}>
        <span className={styles.attachmentName}>{name}</span>
        <span id={errorId}>
          <span className={styles.attachmentLabel}>{t('richTextEditor.uploadFailed')}</span>
          {block.uploadError && (
            <>
              {' '}
              <span className={styles.attachmentReason}>{block.uploadError}</span>
            </>
          )}
        </span>
        <Tooltip content={retry}>
          <Button
            size="xs"
            iconOnly
            data-attachment-action="retry"
            data-block-id={block.id}
            aria-label={name ? `${retry} ${name}` : retry}
            aria-describedby={errorId}
          >
            <RotateCw size={14} aria-hidden="true" />
          </Button>
        </Tooltip>
        <Tooltip content={remove}>
          <Button
            size="xs"
            iconOnly
            variant="danger-outline"
            data-attachment-action="remove"
            data-block-id={block.id}
            aria-label={name ? `${remove} ${name}` : remove}
            aria-describedby={errorId}
          >
            <X size={14} aria-hidden="true" />
          </Button>
        </Tooltip>
      </span>
    );
  }
  // ready (or absent status on an imported doc)
  const href = safeHref(block.src ?? '');
  if (attachmentIsImage(block) && href) {
    // A plain <img> (not the DS <Image>, whose wrapper hard-sets width/height:100%
    // so the rendered size is decoupled from the width attr). Here the width attr +
    // `height: auto` give the configured display size at natural aspect, and the
    // `inline-block` lets the figure's `text-align` (data-align) position it.
    return (
      <img
        className={styles.attachmentImg}
        src={href}
        // `??`, NOT `||`, and the one place in the library where that is right.
        // `alt=""` is a real HTML value — "decorative, skip me" — so an empty
        // `block.alt` is a choice to honour, not an unset to fall back from.
        // Everywhere else in this library an empty label means unset; see
        // AI-PRIMER.md, which names this as the exception.
        alt={block.alt ?? name}
        width={block.width}
        height={block.height}
        // Publish the natural aspect so the SCSS height cap (#644) can shrink the
        // WIDTH instead of squashing the image. Read from the loaded image, not the
        // block: a resize stores width only (height cleared). Set imperatively so
        // React (which owns no `style` here) never re-renders it away.
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight)
            img.style.setProperty(
              '--rich-text-image-aspect',
              String(img.naturalWidth / img.naturalHeight),
            );
        }}
      />
    );
  }
  return (
    <a className={styles.attachmentChip} href={href} download rel="noopener noreferrer">
      <AttachFileIcon />
      <span className={styles.attachmentName}>{name}</span>
    </a>
  );
}
