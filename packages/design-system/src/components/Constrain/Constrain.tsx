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
  /** Fixed width — a named step (`xs` 200 / `sm` 320 / `md` 448 / `lg` 640 / `xl` 800px, via `--measure-*` tokens) or `'full'` (100%). */
  width?: ConstrainWidth;
  /** Minimum width floor — a named step or `'full'` (100%). */
  minWidth?: ConstrainWidth;
  /** Maximum width cap — the common case (e.g. a search input at `'sm'`). */
  maxWidth?: ConstrainWidth;
  /**
   * Fixed height — a named measure (same scale as the widths), `'full'` (100%),
   * `'viewport'` (100dvh), or `'viewport-70'` (70dvh). `height="viewport-70"` with
   * `maxHeight="lg"` makes a viewport-relative panel that never exceeds 640px.
   */
  height?: ConstrainHeight;
  /** Minimum height floor — a named measure, `'full'`, `'viewport'`, or `'viewport-70'`. */
  minHeight?: ConstrainHeight;
  /** Maximum height cap — a named measure, `'full'`, `'viewport'`, or `'viewport-70'`. */
  maxHeight?: ConstrainHeight;
  /**
   * Flex behavior as a child of a flex row/column.
   * - `'grow'` — fill remaining space (`flex: 1 1 0`) and shrink below content
   *   width (`min-width: 0`) so a truncating child (`<Text truncate>`) can clip.
   *   To opt a `Stack`/`Cluster` into that truncating chain WITHOUT also making
   *   it fill the row, use their `minWidth0` prop instead — and note Constrain
   *   renders a `<div>`, so it is invalid inside a `<button>`/`<a>`/`<label>`,
   *   where `<Cluster as="span" minWidth0>` is the only option.
   * - `'auto'` — size to content, may grow/shrink (`flex: 1 1 auto`).
   * - `'shrink'` — don't grow, may shrink (`flex: 0 1 auto`, the flex default).
   * - `'none'` — fixed, never grow/shrink (`flex: 0 0 auto`).
   *
   * Omit for no flex class: the element behaves as its flex container dictates.
   */
  flex?: ConstrainFlex;
  /** The content to size. Required — a Constrain with nothing inside has nothing to constrain. */
  children: ReactNode;
}

/**
 * Size / flex constraint primitive; sizes its own box and does not lay out its children.
 * @see docs/components/Constrain.md
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
