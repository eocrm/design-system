import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Checkbox } from '../Checkbox';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './MediaTile.module.scss';

/** When the overlay bars / controls reveal. */
export type MediaTileReveal = 'hover' | 'focus' | 'visible';
/** Corner rounding (clips the media). */
export type MediaTileRadius = 'none' | 'sm' | 'md' | 'lg';
/** Where `title` + `meta` render: over the media, or in a solid bar below it. */
export type MediaTileCaptionPlacement = 'overlay' | 'below';

export interface MediaTileProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  /** Tile body — full-bleed media (an `<Image>`, or a centered file-type icon). */
  media: ReactNode;
  /** Caption leading content (e.g. the file name). Truncates with an ellipsis. */
  title?: ReactNode;
  /** Caption trailing content (e.g. the file size). Sits at the end of the row. */
  meta?: ReactNode;
  /**
   * Tile controls (e.g. preview / download / delete icon buttons). With
   * `captionPlacement="overlay"` they sit in a centered bottom bar over a scrim;
   * with `"below"` they sit in a top-right cluster over the media. Either way they
   * follow `revealOn`.
   */
  actions?: ReactNode;
  /**
   * Where `title` + `meta` render. Default `'overlay'`.
   * - `'overlay'` — a top bar over a gradient scrim on the media, revealed per `revealOn`.
   *   Compact, but the name is hidden at rest for mouse users.
   * - `'below'` — a solid bar under the media in normal text colour, ALWAYS visible
   *   (not affected by `revealOn`). Use for file grids where the name must be readable.
   */
  captionPlacement?: MediaTileCaptionPlacement;
  /**
   * When the overlay bars, `actions` and the selection checkbox reveal. Default `'hover'`.
   * - `'hover'` — on pointer hover OR keyboard focus-within (focus always included for a11y).
   *   On touch devices (`(hover: none)`) it behaves like `'visible'`.
   * - `'focus'` — only on focus-within (no mouse-over reveal).
   * - `'visible'` — always shown.
   *
   * A checked selection checkbox is always shown regardless.
   */
  revealOn?: MediaTileReveal;
  /** Corner rounding (clips the media). Default `'md'`. */
  radius?: MediaTileRadius;
  /**
   * Render a selection checkbox top-left over the media. Default `false`.
   * Only the checkbox toggles selection — clicking the tile does not (so a tile
   * `onClick`, e.g. open preview, keeps working; checkbox clicks don't bubble to it).
   */
  selectable?: boolean;
  /** Controlled selected state (only used when `selectable`). Sets `data-selected` + an accent ring on the tile. Default `false`. */
  selected?: boolean;
  /** Fires with the next selected state when the checkbox is toggled. */
  onSelectedChange?: (next: boolean) => void;
  /**
   * Accessible name of the selection checkbox, e.g. `"Select report.pdf"`.
   * Defaults to the localized "Select {title}" when `title` is a string, else "Select".
   */
  selectLabel?: string;
}

/**
 * Gallery / file-grid tile: full-bleed media with a title/meta caption, revealed actions and optional selection.
 * @see docs/components/MediaTile.md
 */
// {...rest} last (Pattern A) so the consumer can add onClick / data-* to the tile.
export const MediaTile = forwardRef<HTMLDivElement, MediaTileProps>(function MediaTile(
  {
    media,
    title,
    meta,
    actions,
    captionPlacement = 'overlay',
    revealOn = 'hover',
    radius = 'md',
    selectable = false,
    selected = false,
    onSelectedChange,
    selectLabel,
    className,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const below = captionPlacement === 'below';
  const hasCaption = title != null || meta != null;
  const isSelected = selectable && selected;
  const caption = (
    <>
      {title != null && <span className={styles.title}>{title}</span>}
      {meta != null && <span className={styles.meta}>{meta}</span>}
    </>
  );

  return (
    <div
      ref={ref}
      className={clsx(
        styles.root,
        below && styles['placement-below'],
        styles[`radius-${radius}`],
        styles[`reveal-${revealOn}`],
        selectable && styles.selectable,
        className,
      )}
      data-selected={isSelected || undefined}
      {...rest}
    >
      <div className={styles.media}>
        {media}

        {!below && hasCaption && <div className={clsx(styles.bar, styles.barTop)}>{caption}</div>}

        {selectable && (
          // Stops the checkbox's clicks (label + synthetic input click) reaching a tile onClick.
          <div className={clsx(styles.chip, styles.select)} onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onChange={(next) => onSelectedChange?.(next)}
              aria-label={
                selectLabel ||
                (typeof title === 'string' && title
                  ? t('mediaTile.selectNamed', { name: title })
                  : t('mediaTile.select'))
              }
            />
          </div>
        )}

        {actions != null && (
          <div
            className={
              below ? clsx(styles.chip, styles.actionsTop) : clsx(styles.bar, styles.barBottom)
            }
          >
            {actions}
          </div>
        )}
      </div>

      {below && hasCaption && <div className={styles.caption}>{caption}</div>}
    </div>
  );
});
