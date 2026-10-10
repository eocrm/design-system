import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { WidgetShape } from './WidgetShape';
import styles from './WidgetPreview.module.scss';

/** Widget kind depicted by a WidgetPreview. */
export type WidgetPreviewVariant = 'kpi' | 'list' | 'chart' | 'line' | 'pipeline' | 'activity';

export interface WidgetPreviewProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Which widget kind the miniature depicts. Required.
   * - `'kpi'` — label, a large value block (strong accent), an accented trend line.
   * - `'list'` — rows of accented avatar + line; first avatar strong.
   * - `'chart'` — a bar series (accented, one bar strong).
   * - `'line'` — a line series over a light area (strong accent line).
   * - `'pipeline'` — stage columns of cards; current stage header strong and its cards accented; next stage header accented.
   * - `'activity'` — timeline rows with accented dots; first dot strong.
   */
  variant: WidgetPreviewVariant;
}

/**
 * Decorative, data-free miniature of a dashboard widget kind (for CatalogPicker items).
 * @see docs/components/WidgetPreview.md
 */
// {...rest} FIRST so aria-hidden always wins (Pattern B): the surrounding card names the item.
export const WidgetPreview = forwardRef<HTMLDivElement, WidgetPreviewProps>(function WidgetPreview(
  { variant, className, ...rest },
  ref,
) {
  return (
    <div {...rest} ref={ref} aria-hidden="true" className={clsx(styles.root, className)}>
      <WidgetShape kind={variant} mode="preview" />
    </div>
  );
});
