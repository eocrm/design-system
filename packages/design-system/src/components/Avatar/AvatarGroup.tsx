import {
  Children,
  forwardRef,
  isValidElement,
  useMemo,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import type { AvatarSize } from './Avatar';
import { AvatarGroupContext, type AvatarGroupContextValue } from './AvatarGroupContext';
import styles from './AvatarGroup.module.scss';
import { useTranslation } from '../../i18n/useTranslation';

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Avatar children. */
  children: ReactNode;

  /**
   * Diameter default for child avatars. Defaults to `'md'`. Each child can
   * still override via its own `size` prop (idiomatic React composition —
   * explicit prop wins). For a strictly uniform group, don't set `size` on
   * individual children.
   * - `sm` (24px) — table rows, dense lists.
   * - `md` (32px, default) — most uses.
   * - `lg` (40px) — detail-page headers.
   * - `xl` (80px) — member-card popovers / profile headers.
   */
  size?: AvatarSize;

  /**
   * Maximum number of visible avatars. Children beyond this count collapse
   * into a single `+N` button at the tail. Defaults to `4`. The `+N` only
   * appears when there are STRICTLY more children than `max`.
   */
  max?: number;

  /**
   * Whether to render a name tooltip on each child avatar. Defaults to `true`
   * inside the group; overridable per-child by setting `tooltip` on the Avatar.
   */
  tooltip?: boolean;

  /**
   * Fires when the user clicks the `+N` overflow button. The library does
   * NOT render a popover — apps decide what happens (open a modal, navigate,
   * etc.). When omitted, the `+N` is rendered as a non-interactive `<span>`.
   *
   * @param event The native click event.
   * @param hiddenCount The number of children not visible in the strip.
   */
  onOverflowClick?: (event: MouseEvent<HTMLButtonElement>, hiddenCount: number) => void;
}

/**
 * Horizontal stack of `<Avatar>`s with `+N` overflow when count exceeds `max`.
 *
 * The group propagates `size` and `tooltip` to descendant `<Avatar>`s via
 * context. The first `max` children render; any remainder collapses to a
 * single overflow control.
 *
 * @example
 * // Static — non-interactive +N:
 * <AvatarGroup max={3}>
 *   <Avatar name="Alex Rivera" />
 *   <Avatar name="Priya Patel" />
 *   <Avatar name="Tom Kim" />
 *   <Avatar name="Sara Chen" />
 *   <Avatar name="Jaden Lee" />
 * </AvatarGroup>
 *
 * @example
 * // With overflow handler — app composes whatever popover/modal it wants:
 * <AvatarGroup
 *   max={4}
 *   size="lg"
 *   onOverflowClick={(_e, hiddenCount) => openMembersPopover(hiddenCount)}
 * >
 *   {members.map((m) => <Avatar key={m.id} name={m.name} src={m.avatarUrl} status={m.presence} />)}
 * </AvatarGroup>
 *
 * @remarks When NOT to use
 * - For a single avatar — use `<Avatar>` directly.
 * - When you want to show member counts but not faces — use a `Badge` next to a label.
 *
 * @remarks Anti-patterns
 * - ❌ Wrapping `<AvatarGroup>` in a `<button>` and treating it as one click target.
 *   The `+N` is the click affordance; the visible avatars are deliberately not
 *   interactive in the library — wrap individual avatars in `<button>` / `<Link>`
 *   if needed.
 * - ❌ Mixing avatar sizes inside one group on purpose. The group's `size`
 *   is the default; per-child explicit `size` wins, which is useful for
 *   emphasising a specific member but visually noisy if used carelessly.
 */
export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(function AvatarGroup(
  { children, size = 'md', max = 4, tooltip = true, onOverflowClick, className, ...props },
  ref,
) {
  const t = useTranslation();
  const items = Children.toArray(children).filter(isValidElement);
  const visible = items.slice(0, max);
  const hiddenCount = Math.max(0, items.length - max);

  const ctx: AvatarGroupContextValue = useMemo(() => ({ size, tooltip }), [size, tooltip]);

  const overflowClass = clsx(styles.overflow, styles[`overflowSize-${size}`]);

  const overflowNode =
    hiddenCount > 0 ? (
      onOverflowClick ? (
        <button
          type="button"
          className={overflowClass}
          aria-label={t('avatarGroup.overflow', { count: hiddenCount })}
          onClick={(e) => onOverflowClick(e, hiddenCount)}
        >
          +{hiddenCount}
        </button>
      ) : (
        <span
          className={overflowClass}
          role="img"
          aria-label={t('avatarGroup.overflow', { count: hiddenCount })}
        >
          +{hiddenCount}
        </span>
      )
    ) : null;

  return (
    // Pattern A — props last so consumer overrides win.
    <AvatarGroupContext.Provider value={ctx}>
      <div
        ref={ref}
        role="list"
        className={clsx(styles.group, styles[`groupSize-${size}`], className)}
        {...props}
      >
        {visible.map((child, i) => (
          <div key={i} role="listitem" className={styles.item}>
            {child}
          </div>
        ))}
        {overflowNode && (
          <div role="listitem" className={clsx(styles.item, styles.overflowItem)}>
            {overflowNode}
          </div>
        )}
      </div>
    </AvatarGroupContext.Provider>
  );
});
