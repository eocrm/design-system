import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { WidgetShape } from './WidgetShape';
import styles from './WidgetPreview.module.scss';

/** Widget kind depicted by a WidgetPreview. */
export type WidgetPreviewVariant = 'kpi' | 'list' | 'chart' | 'pipeline' | 'activity';

export interface WidgetPreviewProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Which widget kind the miniature depicts. Required.
   * - `'kpi'` — label, a large value block (accent), a trend line.
   * - `'list'` — rows of avatar + line; first avatar accented.
   * - `'chart'` — a bar series (accented, one bar strong).
   * - `'pipeline'` — stage columns of cards; current stage header strong.
   * - `'activity'` — timeline rows with accented dots.
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
