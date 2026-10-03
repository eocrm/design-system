import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './MediaTile.module.scss';

/** When the overlay bars reveal. */
export type MediaTileReveal = 'hover' | 'focus' | 'visible';
/** Corner rounding (clips the media). */
export type MediaTileRadius = 'none' | 'sm' | 'md' | 'lg';

export interface MediaTileProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  /** Tile body — full-bleed media (an `<Image>`, or a centered file-type icon). */
  media: ReactNode;
  /** Top-bar leading content (e.g. the file name). Truncates with an ellipsis. */
  title?: ReactNode;
  /** Top-bar trailing content (e.g. the file size). Sits at the end of the row. */
  meta?: ReactNode;
  /** Bottom-bar controls (e.g. preview / download / delete icon buttons), centered. */
  actions?: ReactNode;
  /**
   * When the bars + scrims reveal. Default `'hover'`.
   * - `'hover'` — on pointer hover OR keyboard focus-within (focus always included for a11y).
   * - `'focus'` — only on focus-within (no mouse-over reveal).
   * - `'visible'` — always shown.
   */
  revealOn?: MediaTileReveal;
  /** Corner rounding (clips the media). Default `'md'`. */
  radius?: MediaTileRadius;
}

/**
 * Gallery / file-grid tile: a full-bleed media body with title/meta and action bars revealed on hover or keyboard focus.
 * @see docs/components/MediaTile.md
 */
// {...rest} last (Pattern A) so the consumer can add onClick / data-* to the tile.
export const MediaTile = forwardRef<HTMLDivElement, MediaTileProps>(function MediaTile(
  { media, title, meta, actions, revealOn = 'hover', radius = 'md', className, ...rest },
  ref,
) {
  const hasTopBar = title != null || meta != null;
  return (
    <div
      ref={ref}
      className={clsx(
        styles.root,
        styles[`radius-${radius}`],
        styles[`reveal-${revealOn}`],
        className,
      )}
      {...rest}
    >
      <div className={styles.media}>{media}</div>

      {hasTopBar && (
        <div className={clsx(styles.bar, styles.barTop)}>
          {title != null && <span className={styles.title}>{title}</span>}
          {meta != null && <span className={styles.meta}>{meta}</span>}
        </div>
      )}

      {actions != null && <div className={clsx(styles.bar, styles.barBottom)}>{actions}</div>}
    </div>
  );
});
