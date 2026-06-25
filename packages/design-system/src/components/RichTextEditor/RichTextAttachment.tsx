// RichTextAttachment.tsx — renders one attachment block's body (spinner / error /
// image preview / file chip). Pure presentational: the error Retry/Remove buttons
// carry data-attachment-action + data-block-id hooks the editor delegates (so the
// pure renderDoc stays callback-free). The read-only viewer renders the same markup;
// its action buttons simply have no editor delegate.
import { Image } from '../Image';
import { CircularProgress } from '../CircularProgress';
import { useTranslation } from '../../i18n';
import type { Block } from '../RichText/engine/model';
import { safeHref } from '../RichText/engine/safeHref';
import { attachmentIsImage } from '../RichText/engine/attachment';
import { AttachFileIcon } from './icons';
import styles from './RichTextEditor.module.scss';

export function RichTextAttachment({ block }: { block: Block }) {
  const t = useTranslation();
  const name = block.name ?? '';

  if (block.status === 'uploading') {
    return (
      <span className={styles.attachmentLoading}>
        <CircularProgress size="sm" aria-label={t('richTextEditor.uploadingFile')} />
        <span className={styles.attachmentName}>{name}</span>
      </span>
    );
  }
  if (block.status === 'error') {
    return (
      <span className={styles.attachmentError}>
        <span className={styles.attachmentName}>{name}</span>
        <span className={styles.attachmentLabel}>{t('richTextEditor.uploadFailed')}</span>
        <button
          type="button"
          data-attachment-action="retry"
          data-block-id={block.id}
          aria-label={name ? `${t('richTextEditor.uploadRetry')} ${name}` : undefined}
        >
          {t('richTextEditor.uploadRetry')}
        </button>
        <button
          type="button"
          data-attachment-action="remove"
          data-block-id={block.id}
          aria-label={name ? `${t('richTextEditor.uploadRemove')} ${name}` : undefined}
        >
          {t('richTextEditor.uploadRemove')}
        </button>
      </span>
    );
  }
  // ready (or absent status on an imported doc)
  const href = safeHref(block.src ?? '');
  if (attachmentIsImage(block) && href) {
    return <Image src={href} alt={block.alt ?? name} width={block.width} height={block.height} />;
  }
  return (
    <a className={styles.attachmentChip} href={href} download rel="noopener noreferrer">
      <AttachFileIcon />
      <span className={styles.attachmentName}>{name}</span>
    </a>
  );
}
