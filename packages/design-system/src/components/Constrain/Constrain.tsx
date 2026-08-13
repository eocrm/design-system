import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Constrain.module.scss';

/** Named width step → a `--measure-*` token; `'full'` = 100%. */
export type ConstrainWidth = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

/** Fixed named measure, `'full'` (containing block), or a dynamic viewport height. */
export type ConstrainHeight = ConstrainWidth | 'viewport' | 'viewport-70';

/** How the box behaves as a flex child (`Cluster`/`Stack` item). */
export type ConstrainFlex = 'grow' | 'shrink' | 'auto' | 'none';

export interface ConstrainProps extends HTMLAttributes<HTMLDivElement> {
  /** Fixed width — a named step (`xs`–`xl`) or `'full'` (100%). */
  width?: ConstrainWidth;
  /** Minimum width floor — a named step or `'full'` (100%). */
  minWidth?: ConstrainWidth;
  /** Maximum width cap — the common case (e.g. a search input at `'sm'`). */
  maxWidth?: ConstrainWidth;
  /** Fixed height — a named measure, `'full'` (100%), `'viewport'` (100dvh), or `'viewport-70'` (70dvh). */
  height?: ConstrainHeight;
  /** Minimum height floor — a named measure, `'full'`, `'viewport'`, or `'viewport-70'`. */
  minHeight?: ConstrainHeight;
  /** Maximum height cap — a named measure, `'full'`, `'viewport'`, or `'viewport-70'`. */
  maxHeight?: ConstrainHeight;
  /**
   * Flex behavior as a child of a flex row/column.
   * - `'grow'` — fill remaining space (`flex: 1 1 0`) and shrink below content
   *   width (`min-width: 0`) so a truncating child (`<Text truncate>`) can clip.
   * - `'auto'` — size to content, may grow/shrink (`flex: 1 1 auto`).
   * - `'shrink'` — don't grow, may shrink (`flex: 0 1 auto`, the flex default).
   * - `'none'` — fixed, never grow/shrink (`flex: 0 0 auto`).
   */
  flex?: ConstrainFlex;
  /** The content to size. Required — a Constrain with nothing inside has nothing to constrain. */
  children: ReactNode;
}

/**
 * Size / flex constraint primitive. The one place layout-sizing props live —
 * `Stack`/`Cluster`/`Grid` are spacing-only by design, so when you need to cap a
 * search input's width, floor a column, or let a box fill a flex row, wrap it in
 * `<Constrain>`.
 *
 * It sizes its OWN box only — it does not lay out its children. Put a layout
 * primitive (`Cluster`/`Stack`) *inside* it when you need both.
 *
 * @example
 * // Cap a search field's width:
 * <Constrain maxWidth="sm">
 *   <Input placeholder="Search…" />
 * </Constrain>
 *
 * @example
 * // Let a Progress bar fill a row next to a fixed button:
 * <Cluster wrap={false} gap="sm">
 *   <Constrain flex="grow"><Progress value={x} max={y} /></Constrain>
 *   <Button>Upgrade plan</Button>
 * </Cluster>
 *
 * @example
 * // Keep a viewport-sized canvas no taller than the large measure:
 * <Constrain height="viewport-70" maxHeight="lg">
 *   <FlowCanvas nodes={nodes} edges={edges} />
 * </Constrain>
 *
 * @remarks When NOT to use
 * - Spacing / arranging children → `<Stack>` / `<Cluster>` / `<Grid>`. Constrain
 *   sizes its own box; it doesn't arrange what's inside.
 * - A bordered, padded surface → `<Card>`. Constrain has no padding / border / bg.
 * - A full-bleed page shell → `<Screen>`.
 *
 * @remarks Anti-patterns
 * - ❌ Reaching for Constrain to add `margin`/`padding` — it carries size/flex
 *   only. Spacing comes from the parent layout primitive.
 */
// `children` is destructured out of `rest` and rendered once below (Stack/Cluster
// pass children via {...props} instead — both are correct; this is explicit).
export const Constrain = forwardRef<HTMLDivElement, ConstrainProps>(function Constrain(
  { width, minWidth, maxWidth, height, minHeight, maxHeight, flex, className, children, ...rest },
  ref,
) {
  // {...rest} last so consumer overrides win (Pattern A) — Constrain locks no attrs.
  return (
    <div
      ref={ref}
      className={clsx(
        width && styles[`w-${width}`],
        minWidth && styles[`minW-${minWidth}`],
        maxWidth && styles[`maxW-${maxWidth}`],
        height && styles[`h-${height}`],
        minHeight && styles[`minH-${minHeight}`],
        maxHeight && styles[`maxH-${maxHeight}`],
        flex && styles[`flex-${flex}`],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
