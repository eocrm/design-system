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
 * Height-balanced masonry layout. Packs variable-height children into columns,
 * placing each into the currently-shortest column so the result reads
 * left→right in source order with balanced column heights (Pinterest-style).
 *
 * Pick exactly one of `columns` (fixed N) or `minColumnWidth` (responsive count
 * from container width). TypeScript enforces this; neither → `minColumnWidth="240px"`.
 *
 * Heights are measured on the client; a `ResizeObserver` rebalances on container
 * resize and when child content settles (e.g. images finish loading). Before
 * measurement (and without JS) children render round-robin across the columns.
 *
 * @example
 * // Responsive photo wall.
 * <Masonry minColumnWidth="220px" gap="md">
 *   {photos.map((p) => <Image key={p.id} src={p.src} alt={p.alt} aspectRatio={p.ratio} />)}
 * </Masonry>
 *
 * @example
 * // Fixed 3-column card wall.
 * <Masonry columns={3} gap="lg">
 *   {notes.map((n) => <Card key={n.id}>{n.body}</Card>)}
 * </Masonry>
 *
 * @remarks When NOT to use
 * - Equal-height tiles / true 2D rows → use `<Grid>`.
 * - A single vertical column → use `<Stack>`.
 * - Wrapping rows of unequal items (toolbars, tag lists) → use `<Cluster>`.
 *
 * @remarks Anti-patterns
 * - ❌ Interactive / stateful children (videos, focus-holding forms). Rebalancing
 *   re-parents items between columns, so React remounts them — Masonry is for
 *   display content (image walls, card galleries).
 * - ❌ Expecting a single top-to-bottom reading column. Items are distributed
 *   across columns; order is left→right by placement.
 */
export const Masonry = forwardRef<HTMLDivElement, MasonryProps>(function Masonry(
  { gap = 'md', columns, minColumnWidth, className, children, ...rest },
  ref,
) {
  const items = useMemo(() => Children.toArray(children).filter(isValidElement), [children]);
  const itemCount = items.length;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<Array<HTMLDivElement | null>>([]);

  const minColPx = minColumnWidth ? parseFloat(minColumnWidth) : 240;
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
    const next = balanceColumns(heights, nextCount);
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
