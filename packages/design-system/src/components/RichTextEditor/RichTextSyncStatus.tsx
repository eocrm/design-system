// RichTextSyncStatus.tsx — RichTextEditor's `syncStatus` indicator (text + icon) and the
// accessible "N others editing" text derived from `presence`.
import { useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { LiveRegion } from '../LiveRegion';
import { VisuallyHidden } from '../VisuallyHidden';
import { useTranslation } from '../../i18n';
import type { RichTextSyncStatus as Status } from './RichTextEditor';
import styles from './RichTextPresence.module.scss';

const ICON = { synced: Cloud, connecting: RefreshCw, offline: CloudOff } as const;

/**
 * Status changes are announced through a region that is always mounted while `status` is set
 * (Rule 10); the initial status is not. `others` (names) only reach the accessible text.
 * @internal
 */
export function RichTextSyncStatus({
  status,
  others,
}: {
  status: Status | undefined;
  others: readonly string[];
}) {
  const t = useTranslation();
  const [shown, setShown] = useState(status);
  const [announced, setAnnounced] = useState('');
  const hint = status === 'offline' ? ` — ${t('richTextEditor.offlineHint')}` : '';
  if (shown !== status) {
    setShown(status);
    setAnnounced(status ? t(`richTextEditor.${status}`) + hint : '');
  }
  if (!status && !others.length) return null;
  const Icon = status && ICON[status];
  return (
    <span className={styles.status} data-sync-status={status ?? ''}>
      {Icon && <Icon size={14} aria-hidden="true" />}
      {status && <span>{t(`richTextEditor.${status}`)}</span>}
      {hint && <VisuallyHidden>{hint}</VisuallyHidden>}
      {others.length > 0 && (
        <VisuallyHidden>
          {status ? '. ' : ''}
          {t('richTextEditor.othersEditing', { names: others })}
        </VisuallyHidden>
      )}
      {status && <LiveRegion>{announced}</LiveRegion>}
    </span>
  );
}
