import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Bot, User } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { Avatar, type AvatarSize } from './Avatar';
import avatarStyles from './Avatar.module.scss';
import styles from './AgentAvatar.module.scss';

/** The member an agent acts for, shown as a badge on the tile. */
export interface AgentAvatarMember {
  /** Member's full name; drives the badge initials and the accessible name. */
  name: string;
  /** Member's photo URL; initials are shown when omitted or it fails to load. */
  src?: string;
}

export interface AgentAvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Agent label; drives the accessible name (an empty label reads as "?",
   * like `Avatar`). Unused when `decorative`.
   */
  name: string;
  /** Agent mark, inherits `currentColor` (a neutral foreground), so pass a glyph drawn with `fill`/`stroke="currentColor"`; marks with hard-coded fills keep their colours (the app's responsibility). Defaults to a lucide `Bot`. */
  mark?: ReactNode;
  /**
   * The member the agent acts for. Omit for an agent alone (no badge); `null`
   * or an empty name for an erased member (placeholder badge).
   */
  member?: AgentAvatarMember | null;
  /** Diameter, same scale as `Avatar`. The member badge is hidden at `inline`. */
  size?: AvatarSize;
  /**
   * Hide the avatar from assistive tech (`aria-hidden`, no role or label). Use
   * when visible text next to it already names the agent and the member, e.g.
   * a Thread node beside a "Scout for Sarah Chen" byline; otherwise both are
   * announced. Without such text keep the default: a `role="img"` named
   * "{agent}, on behalf of {member}". `PersonDisplay.AgentAvatar` always sets
   * it. Defaults to `false`.
   */
  decorative?: boolean;
}

const sizeClass: Record<AvatarSize, string> = {
  inline: styles.inline,
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
};

const avatarSizeClass: Record<AvatarSize, string> = {
  inline: avatarStyles.inline,
  sm: avatarStyles.sm,
  md: avatarStyles.md,
  lg: avatarStyles.lg,
  xl: avatarStyles.xl,
};

/**
 * AI agent tile with an optional badge of the member it acts for.
 * @see docs/components/AgentAvatar.md
 */
export const AgentAvatar = forwardRef<HTMLSpanElement, AgentAvatarProps>(function AgentAvatar(
  { name, mark, member, size = 'md', decorative, className, ...props },
  ref,
) {
  const t = useTranslation();
  const agent = name.trim() === '' ? '?' : name.trim();
  const memberName = member?.name?.trim() ?? '';
  const erased = member === null || (member !== undefined && memberName === '');

  const label = erased
    ? t('avatar.agent.onBehalfOfFormer', { agent })
    : member
      ? t('avatar.agent.onBehalfOf', { agent, member: memberName })
      : agent;

  const badge =
    size === 'inline' || member === undefined ? null : (
      <span
        aria-hidden="true"
        className={styles.badge}
        data-part="badge"
        data-erased={erased || undefined}
      >
        {erased ? (
          <span className={styles.erased}>
            <User />
          </span>
        ) : (
          <Avatar size="sm" name={memberName} src={member?.src} />
        )}
      </span>
    );

  // {...props} first so component-owned ARIA (role, aria-label) wins. Decorative
  // strips consumer role/label; otherwise aria-labelledby is dropped so it can't
  // override the computed aria-label.
  return (
    <span
      {...props}
      ref={ref}
      {...(decorative
        ? {
            'aria-hidden': true,
            role: undefined,
            'aria-label': undefined,
            'aria-labelledby': undefined,
          }
        : { role: 'img', 'aria-label': label, 'aria-labelledby': undefined })}
      className={clsx(styles.agent, avatarSizeClass[size], sizeClass[size], className)}
      data-agent-avatar=""
    >
      <span className={styles.tile}>
        <span aria-hidden="true" className={styles.mark} data-part="mark">
          {mark ?? <Bot />}
        </span>
      </span>
      {badge}
    </span>
  );
});
