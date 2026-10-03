import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { mergeRefs } from '../_internal/refs';
import {
  balanceColumns,
  columnsForWidth,
  distributionsEqual,
  roundRobinColumns,
} from './masonryUtils';
import styles from './Masonry.module.scss';

/** Gap between columns and between items. Same token scale as Grid/Stack. */
export type MasonryGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Pixel value of each gap token (mirrors --space-1/2/3/4/6/8). Used only for
// the responsive column-count math; the rendered gap uses the token classes.
const GAP_PX: Record<MasonryGap, number> = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32 };

const gapClass: Record<MasonryGap, string> = {
  xs: styles.gapXs,
  sm: styles.gapSm,
  md: styles.gapMd,
  lg: styles.gapLg,
  xl: styles.gapXl,
  '2xl': styles.gap2xl,
};

interface MasonryBaseProps {
  /** `xs`(4) / `sm`(8) / `md`(12, default) / `lg`(16) / `xl`(24) / `2xl`(32). */
  gap?: MasonryGap;
  children?: ReactNode;
}
interface MasonryFixedColumns extends MasonryBaseProps, HTMLAttributes<HTMLDivElement> {
  /** Fixed number of columns. Mutually exclusive with `minColumnWidth`. */
  columns: number;
  minColumnWidth?: never;
}
interface MasonryResponsive extends MasonryBaseProps, HTMLAttributes<HTMLDivElement> {
  /** Min column width (px) for a responsive column count. Default `'240px'`. */
  minColumnWidth?: string;
  columns?: never;
}
export type MasonryProps = MasonryFixedColumns | MasonryResponsive;

/**
 * Height-balanced masonry layout: packs variable-height children into the shortest column.
 * @see docs/components/Masonry.md
 */
export const Masonry = forwardRef<HTMLDivElement, MasonryProps>(function Masonry(
  { gap = 'md', columns, minColumnWidth, className, children, ...rest },
  ref,
) {
  const items = useMemo(() => Children.toArray(children).filter(isValidElement), [children]);
  const itemCount = items.length;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<Array<HTMLDivElement | null>>([]);

  const parsedMinCol = minColumnWidth != null ? parseFloat(minColumnWidth) : NaN;
  const minColPx = Number.isFinite(parsedMinCol) && parsedMinCol > 0 ? parsedMinCol : 240;
  const fixedColumnCount = columns != null ? Math.max(1, Math.floor(columns)) : null;
  const initialCount = fixedColumnCount ?? 1;

  const [columnCount, setColumnCount] = useState(initialCount);
  const [cols, setCols] = useState<number[][]>(() => roundRobinColumns(itemCount, initialCount));

  const recompute = useCallback(() => {
    const nextCount =
      fixedColumnCount ?? columnsForWidth(rootRef.current?.offsetWidth ?? 0, minColPx, GAP_PX[gap]);
    const heights = Array.from(
      { length: itemCount },
      (_, i) => cellRefs.current[i]?.getBoundingClientRect().height ?? 0,
    );
    // Before any real measurement (all heights 0 — e.g. unsized images mid-load),
    // keep the round-robin distribution instead of collapsing into column 0.
    const next =
      itemCount > 0 && heights.every((h) => h === 0)
        ? roundRobinColumns(itemCount, nextCount)
        : balanceColumns(heights, nextCount);
    setColumnCount((prev) => (prev === nextCount ? prev : nextCount));
    setCols((prev) => (distributionsEqual(prev, next) ? prev : next));
  }, [fixedColumnCount, minColPx, gap, itemCount]);

  useLayoutEffect(() => {
    recompute();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => recompute());
    if (rootRef.current) ro.observe(rootRef.current);
    for (let i = 0; i < itemCount; i++) {
      const el = cellRefs.current[i];
      if (el) ro.observe(el);
    }
    return () => ro.disconnect();
  }, [recompute, itemCount]);

  // Guard against a transient columnCount/distribution mismatch (the frame
  // between the two setState calls): fall back to round-robin for that render.
  const distribution =
    cols.length === columnCount ? cols : roundRobinColumns(itemCount, columnCount);

  return (
    <div
      // {...rest} last so consumer className overrides are still possible via className merge
      ref={mergeRefs(ref, rootRef)}
      className={clsx(styles.masonry, gapClass[gap], className)}
      {...rest}
    >
      {distribution.map((indices, col) => (
        <div key={col} className={clsx(styles.column, gapClass[gap])}>
          {indices.map((i) => (
            <div
              key={i}
              className={styles.cell}
              ref={(el) => {
                cellRefs.current[i] = el;
              }}
            >
              {items[i]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});
