import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '../Button';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './FlowCanvas.module.scss';

interface FlowControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

/** Internal: the bottom-left zoom control cluster. */
export function FlowControls({ onZoomIn, onZoomOut, onFit }: FlowControlsProps) {
  const t = useTranslation();
  return (
    <div className={styles.controls} data-flow-controls="">
      <Button
        variant="secondary"
        size="sm"
        iconOnly
        aria-label={t('flowCanvas.zoomIn')}
        onClick={onZoomIn}
      >
        <ZoomIn size={16} aria-hidden="true" />
      </Button>
      <Button
        variant="secondary"
        size="sm"
        iconOnly
        aria-label={t('flowCanvas.zoomOut')}
        onClick={onZoomOut}
      >
        <ZoomOut size={16} aria-hidden="true" />
      </Button>
      <Button
        variant="secondary"
        size="sm"
        iconOnly
        aria-label={t('flowCanvas.zoomToFit')}
        onClick={onFit}
      >
        <Maximize size={16} aria-hidden="true" />
      </Button>
    </div>
  );
}
