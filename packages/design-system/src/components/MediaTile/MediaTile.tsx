import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './MediaTile.module.scss';

/** When the overlay bars reveal. */
export type MediaTileReveal = 'hover' | 'focus' | 'visible';
/** Corner rounding (clips the media). */
export type MediaTileRadius = 'none' | 'sm' | 'md' | 'lg';

export interface MediaTileProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
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
 * Media tile for gallery / file-grid views — a full-bleed `media` body (an `<Image>`, or a
 * centered file-type icon) with a top bar (`title` + `meta`) and a bottom bar (`actions`),
 * each over a gradient gray scrim, **revealed on hover / keyboard focus** so the image isn't
 * permanently cluttered. Drop one per tile inside a `<Masonry>` / `<Grid>`.
 *
 * The reveal uses `opacity` (not `visibility`), so the action buttons stay in the tab order:
 * tabbing to a control fires `:focus-within` and reveals the bar. Set `revealOn="visible"` to
 * always show the bars, or `"focus"` to reveal only on keyboard focus.
 *
 * @example
 * <Masonry minColumnWidth="180px" gap="sm">
 *   {files.map((f) => (
 *     <MediaTile
 *       key={f.id}
 *       media={<Image src={f.thumbUrl} alt={f.name} aspectRatio={1} objectFit="cover" />}
 *       title={f.name}
 *       meta={formatBytes(f.size)}
 *       actions={
 *         <Cluster gap="xs">
 *           <Button iconOnly variant="ghost" size="sm" aria-label={`Download ${f.name}`} onClick={...}>
 *             <Download size={16} />
 *           </Button>
 *         </Cluster>
 *       }
 *     />
 *   ))}
 * </Masonry>
 *
 * @remarks When NOT to use
 * - A plain, non-revealing image block → `<Image>` (optionally inside a `<Card>`).
 * - A colored icon chip → `<IconTile>`.
 *
 * @remarks Anti-patterns
 * - ❌ Putting the ONLY copy of critical info in a hover-revealed bar — it's hidden at rest
 *   for mouse users until hover. Use `revealOn="visible"` if the info must always show.
 * - ❌ Omitting `aria-label` on icon-only action buttons — they're the tile's only labels.
 * - ❌ Expecting `MediaTile` to size the body — the `media` (`<Image aspectRatio>` or a fixed
 *   box) owns the tile's aspect; MediaTile only clips + overlays.
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
