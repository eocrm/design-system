import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { paletteTokens, type PaletteColor } from '../../palette';
import { useLocale, useTranslation } from '../../i18n';
import { VisuallyHidden } from '../VisuallyHidden';
import { dateTileParts, type DateTileInput, type DateTileShow } from './dateTileModel';
import styles from './DateTile.module.scss';

type StyleWithVars = CSSProperties & { [key: `--${string}`]: string | number };

export type { DateTileInput, DateTileShow };

/** `'stacked'` (month / day / bottom, default) or `'page'` (coloured month band on top). */
export type DateTileLayout = 'stacked' | 'page';

/** Tile size — `'sm'` ~40px (month + day only), `'md'` (default), `'lg'`. */
export type DateTileSize = 'sm' | 'md' | 'lg';

/** `'filled'` (subtle bg + border, default) or `'plain'` (no bg/border). */
export type DateTileSurface = 'filled' | 'plain';

export interface DateTileProps extends Omit<HTMLAttributes<HTMLTimeElement>, 'color' | 'children'> {
  /** The date: a `Date`, a `'YYYY-MM-DD'` calendar day (no time zone shift), or any other string parsed as an instant (e.g. ISO datetime). */
  date: DateTileInput;
  /** Optional range end; an end not after `date` is ignored. */
  end?: DateTileInput;
  /** `'stacked'` (**default**) or `'page'`. */
  layout?: DateTileLayout;
  /** `'sm'` / `'md'` (**default**) / `'lg'`. `'sm'` has no bottom line. */
  size?: DateTileSize;
  /** `'filled'` (**default**) or `'plain'`. */
  surface?: DateTileSurface;
  /** Bottom line: `'weekday'` (**default**), `'time'` or `'weekday-time'`. Time needs an instant (`Date` or non-day string). */
  show?: DateTileShow;
  /** Highlight today/ongoing, mute the past, and show Today/Tomorrow/Yesterday words. Default `true`. */
  relative?: boolean;
  /** The reference "now" for `relative`. Defaults to the current time at render. */
  now?: Date;
  /** IANA time zone used to resolve instants to a day and time. Defaults to the runtime zone. */
  timeZone?: string;
  /** Palette color of the month band — `layout="page"` only, ignored for stacked. */
  color?: PaletteColor;
}

/**
 * A compact calendar-date tile — month, day and a weekday/time/relative line.
 * @see docs/components/DateTile.md
 */
export const DateTile = forwardRef<HTMLTimeElement, DateTileProps>(function DateTile(
  {
    date,
    end,
    layout = 'stacked',
    size = 'md',
    surface = 'filled',
    show = 'weekday',
    relative = true,
    now,
    timeZone,
    color,
    className,
    style,
    ...rest
  },
  ref,
) {
  const locale = useLocale();
  const t = useTranslation();
  const words = {
    today: t('dateTile.today'),
    tomorrow: t('dateTile.tomorrow'),
    yesterday: t('dateTile.yesterday'),
    ongoing: t('dateTile.ongoing'),
  };
  const parts = dateTileParts({
    date,
    end,
    show,
    relative,
    now: now ?? new Date(),
    timeZone,
    locale,
    words,
  });

  const cssVars: StyleWithVars = {};
  if (layout === 'page' && color) {
    const { bg, fg } = paletteTokens(color);
    cssVars['--date-tile-band-bg'] = bg;
    cssVars['--date-tile-band-fg'] = fg;
  }

  return (
    <time
      ref={ref}
      dateTime={parts.dateTime}
      className={clsx(
        styles.root,
        styles[layout],
        styles[`size-${size}`],
        styles[surface],
        (parts.relative === 'today' || parts.relative === 'ongoing') && styles.today,
        parts.relative === 'past' && styles.past,
        className,
      )}
      style={{ ...cssVars, ...style }}
      {...rest}
    >
      <VisuallyHidden>{parts.label}</VisuallyHidden>
      <span aria-hidden="true" className={styles.visual}>
        <span className={styles.month}>{parts.month}</span>
        <span className={styles.day}>{parts.day}</span>
        {size !== 'sm' && parts.bottom && <span className={styles.bottom}>{parts.bottom}</span>}
      </span>
    </time>
  );
});
