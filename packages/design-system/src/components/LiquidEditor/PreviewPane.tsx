import type { ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import type { LiquidPreviewStatus } from './types';
import styles from './LiquidEditor.module.scss';

export interface PreviewPaneProps {
  /** Chrome state: `idle` shows `content`, `loading`/`error` show their messages. */
  status: LiquidPreviewStatus;
  /** Consumer-rendered preview output, shown only when `status` is `idle`. */
  content: ReactNode;
}

/** Preview chrome: a label + the consumer-rendered output, with loading/error states. */
export function PreviewPane({ status, content }: PreviewPaneProps) {
  const t = useTranslation();
  return (
    <div className={styles.preview}>
      <span className={styles.previewLabel}>{t('liquidEditor.preview')}</span>
      <div className={clsx(styles.previewBody, status === 'loading' && styles.previewLoading)}>
        {status === 'loading'
          ? t('liquidEditor.previewRendering')
          : status === 'error'
            ? t('liquidEditor.previewError')
            : content}
      </div>
    </div>
  );
}
