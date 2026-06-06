import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Rail.module.scss';

export type RailHeaderProps = HTMLAttributes<HTMLDivElement>;

/**
 * Top slot of the rail — typically a logo or brand mark. By default it's a
 * padded brand area with a header→nav divider, matching the canonical rail
 * brand: `--rail-header-padding` (default `var(--space-4)`) +
 * `--rail-header-divider-width` (default `var(--border-width)`, color
 * `--rail-border-color`). A DS-only consumer gets the mockup rail brand with
 * **no prop and no raw CSS**. For a bare slot (no padding / no divider),
 * override either token to `0` in your scope — there is no prop.
 *
 * When the rail is collapsed, the header has `overflow: hidden` so anything
 * wider than the collapsed rail (~56px) is clipped. The consumer is expected to
 * render a smaller version of their brand at collapsed widths (e.g., just the
 * mark, no wordmark) — the library doesn't enforce this; we just clip overflow
 * so a stretched logo never visually breaks the rail.
 *
 * @example
 * <Rail.Header>
 *   <BrandLogo />
 * </Rail.Header>
 */
export const RailHeader = forwardRef<HTMLDivElement, RailHeaderProps>(function RailHeader(
  { className, ...props },
  ref,
) {
  // {...props} last so consumer overrides win (Pattern A).
  return <div ref={ref} className={clsx(styles.header, className)} {...props} />;
});
