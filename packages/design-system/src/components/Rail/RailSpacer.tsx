import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Rail.module.scss';

export type RailSpacerProps = HTMLAttributes<HTMLDivElement>;

/**
 * `flex-grow: 1` filler that pushes anything after it to the bottom of the
 * rail. Two common patterns:
 *
 * **Footer-only pinning** — the spacer sits between the last section and
 * the footer so the footer (CollapseToggle, user chip) anchors at the
 * bottom regardless of how many sections appear above:
 *
 * @example
 * <Rail>
 *   <Rail.Section>…</Rail.Section>
 *   <Rail.Section>…</Rail.Section>
 *   <Rail.Spacer />
 *   <Rail.Footer><UserChip /></Rail.Footer>
 * </Rail>
 *
 * **Pinning items to the bottom** — anything you render AFTER the spacer
 * gets pushed down, so a secondary section of items (Settings, Help,
 * Sign out) sits at the bottom of the rail just above the footer. Anchor
 * positioning matches Jira / Linear / VS Code sidebars.
 *
 * @example
 * <Rail>
 *   <Rail.Section title="Main">…</Rail.Section>
 *   <Rail.Spacer />
 *   <Rail.Section>
 *     <Rail.Item icon={<SettingsIcon />} href="…">Settings</Rail.Item>
 *     <Rail.Item icon={<HelpIcon />}     href="…">Help</Rail.Item>
 *   </Rail.Section>
 *   <Rail.Footer><Rail.CollapseToggle /></Rail.Footer>
 * </Rail>
 *
 * Note: when the item list overflows the rail's height, the rail scrolls
 * and items after the spacer scroll WITH the content (only `Rail.Footer`
 * is sticky-pinned). Use the Footer slot for items that must stay visible
 * even on a tall scroll.
 */
export const RailSpacer = forwardRef<HTMLDivElement, RailSpacerProps>(function RailSpacer(
  { className, 'aria-hidden': ariaHidden = true, ...props },
  ref,
) {
  // {...props} last so consumer overrides win (Pattern A).
  return (
    <div ref={ref} aria-hidden={ariaHidden} className={clsx(styles.spacer, className)} {...props} />
  );
});
