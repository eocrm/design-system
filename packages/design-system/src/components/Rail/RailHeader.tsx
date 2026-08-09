import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Rail.module.scss';

export type RailHeaderProps = HTMLAttributes<HTMLDivElement>;

/**
 * Top slot of the rail — typically a logo or brand mark. By default it's a
 * padded brand area with a header→nav divider, matching the canonical rail
 * brand: `--rail-header-padding` (default
 * `0 var(--rail-item-padding-x, var(--space-3)) var(--space-2)` — the inset mirrors
 * the nav items' so the brand mark starts on the same x as their icons; no top
 * inset because `--rail-padding-y` already supplies one) +
 * `--rail-header-divider-width` (default `var(--border-width)`, color
 * `--rail-border-color`). A DS-only consumer gets the mockup rail brand with
 * **no prop and no raw CSS**. For a bare slot (no padding / no divider),
 * override either token to `0` in your scope — there is no prop.
 *
 * When the rail is collapsed the header drops its horizontal inset and centers
 * its content in the 56px track, so a mark-sized brand lands on the item icons'
 * axis. Render a smaller brand at collapsed widths (typically the mark without
 * the wordmark) — read the state with `useRail()`. A brand too wide for the
 * track is clipped rather than allowed to stretch the rail; the centering is
 * `safe`, so in that case it aligns to the start edge and you lose the trailing
 * end of the brand instead of both sides of it.
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
