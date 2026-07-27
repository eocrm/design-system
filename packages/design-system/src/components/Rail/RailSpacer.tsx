import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Rail.module.scss';

export type RailSpacerProps = HTMLAttributes<HTMLDivElement>;

/**
 * `flex-grow: 1` filler that pushes anything after it to the bottom of the
 * rail's scrolling body.
 *
 * You do NOT need one to pin the footer — `<Rail.Footer>` is extracted out of
 * the scroll box and anchored on its own. Use the spacer to push trailing
 * *sections* down instead.
 *
 * Anything you render AFTER the spacer gets pushed down, so a secondary
 * section of items (Settings, Help, Sign out) sits at the bottom of the rail
 * just above the footer. Matches Jira / Linear / VS Code sidebars.
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
 * Note: when the item list overflows, the rail's body scrolls and the spacer
 * collapses to nothing — items after it scroll WITH the content. Only
 * `<Rail.Footer>` sits outside the scroll box. Use the Footer slot for
 * anything that must stay visible on a tall scroll.
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
