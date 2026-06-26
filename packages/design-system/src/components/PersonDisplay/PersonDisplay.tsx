import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import clsx from 'clsx';
import { Avatar, type AvatarProps, type AvatarSize } from '../Avatar';
import { Text, type TextSize } from '../Text';
import { Link } from '../Link';
import styles from './PersonDisplay.module.scss';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

/**
 * Visual size of the PersonDisplay composition. Drives Avatar diameter
 * and Name / Description text sizes via context.
 */
export type PersonDisplaySize = 'sm' | 'md' | 'lg';

export interface PersonDisplayProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Visual size of the entire composition. `md` is the default — suits
   * sidebars, members lists, and most card / table contexts. `sm` is
   * the compact density for tight table cells; `lg` is the detail-page
   * hero size. Propagates to the Avatar size and the Name / Description
   * text sizes via context.
   */
  size?: PersonDisplaySize;
  /**
   * Force the composition to shrink-wrap to its content (avatar + name) instead of
   * stretching to fill a parent. Default `false`. The root is `inline-flex` and
   * shrink-wraps on its own — but as a child of a *stretching* flex/grid container
   * (a detail/sidebar card column with `align-items: stretch` / `justify-self:
   * stretch`) CSS blockifies it and the parent stretches it to the full column
   * width. The avatar+name then sit in the left portion and the trailing empty
   * space joins the box, so a `Popover.Trigger` / `Tooltip` cloned onto the
   * PersonDisplay anchors to that wide box and centers far to the right of the
   * person. Set `shrink` on such an overlay trigger to keep it content-width
   * (`width: fit-content`) regardless of the parent, so the overlay anchors to the
   * visible avatar+name.
   */
  shrink?: boolean;
  /**
   * `<PersonDisplay.Avatar>` + `<PersonDisplay.Name>` (+ optional repeating
   * `<PersonDisplay.Description>`) subcomponents in any order — Root sorts
   * the Avatar into its own slot.
   */
  children: ReactNode;
}

export interface PersonDisplayAvatarProps extends Omit<AvatarProps, 'size'> {}

export interface PersonDisplayNameProps extends HTMLAttributes<HTMLElement> {
  /**
   * When set, the name renders as a `<Link>` to this URL. Use for
   * navigable people (contacts, members) where the row links to a
   * detail page. Omit for read-only displays (audit actor, activity
   * timeline) where the name is plain text.
   */
  href?: string;
  /** The person's display name — usually a plain string. */
  children: ReactNode;
}

export interface PersonDisplayDescriptionProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * One line of descriptive metadata — email, role, company, etc.
   * Repeat the subcomponent for additional lines; each renders on its
   * own row beneath the name. Accepts arbitrary `ReactNode` children
   * so consumers can inline a `<Badge>` or other small decoration.
   */
  children: ReactNode;
}

// ----------------------------------------------------------------------------
// Size context + lookup tables
// ----------------------------------------------------------------------------

interface PersonDisplayContextValue {
  size: PersonDisplaySize;
}

const PersonDisplayContext = createContext<PersonDisplayContextValue | null>(null);

function useSize(): PersonDisplaySize {
  return useContext(PersonDisplayContext)?.size ?? 'md';
}

const AVATAR_SIZE: Record<PersonDisplaySize, AvatarSize> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
};

const NAME_TEXT_SIZE: Record<PersonDisplaySize, TextSize> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
};

const DESCRIPTION_TEXT_SIZE: Record<PersonDisplaySize, TextSize> = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
};

// ----------------------------------------------------------------------------
// Avatar (declared before Root because Root identifies Avatar children by type)
// ----------------------------------------------------------------------------

/**
 * Avatar slot — thin wrapper around `<Avatar>` that reads its `size`
 * from the PersonDisplay root context. All other Avatar props (`name`,
 * `src`, `status`, `tooltip`) flow through unchanged.
 *
 * @example
 * <PersonDisplay.Avatar name="Priya Mehta" src="/a/priya.png" status="online" />
 */
const PersonDisplayAvatar = forwardRef<HTMLSpanElement, PersonDisplayAvatarProps>(
  function PersonDisplayAvatar(props, ref) {
    const size = useSize();
    // {...props} first so internally-computed size (from context) wins (Pattern B)
    return <Avatar {...props} ref={ref} size={AVATAR_SIZE[size]} />;
  },
);

// ----------------------------------------------------------------------------
// Name
// ----------------------------------------------------------------------------

/**
 * Name slot. Renders as plain `<Text>` by default; when `href` is set,
 * renders as `<Link>` (a real `<a>` element) — use for navigable
 * people. Text size follows the PersonDisplay root's `size`.
 *
 * @example
 * <PersonDisplay.Name>Marcus Vega</PersonDisplay.Name>
 *
 * @example
 * <PersonDisplay.Name href="/contacts/sarah-chen">Sarah Chen</PersonDisplay.Name>
 */
const PersonDisplayName = forwardRef<HTMLElement, PersonDisplayNameProps>(
  function PersonDisplayName({ href, className, children, ...rest }, ref) {
    const size = useSize();
    const textSize = NAME_TEXT_SIZE[size];
    if (href) {
      return (
        <Link
          ref={ref as Ref<HTMLAnchorElement>}
          href={href}
          variant="subtle"
          className={clsx(styles.name, className)}
          // {...rest} last so consumer overrides win (Pattern A)
          {...rest}
        >
          <Text as="span" size={textSize} weight="medium">
            {children}
          </Text>
        </Link>
      );
    }
    return (
      <span
        ref={ref as Ref<HTMLSpanElement>}
        className={clsx(styles.name, className)}
        // {...rest} last so consumer overrides win (Pattern A)
        {...rest}
      >
        <Text as="span" size={textSize} weight="medium">
          {children}
        </Text>
      </span>
    );
  },
);

// ----------------------------------------------------------------------------
// Description
// ----------------------------------------------------------------------------

/**
 * One line of descriptive metadata (email, role, company, …). Repeat
 * the subcomponent to add more lines — each one stacks below the
 * previous. Renders muted text; children can be a string or any
 * `ReactNode` (e.g., inline `<Badge>` decorations).
 *
 * @example
 * <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
 *
 * @example
 * <PersonDisplay.Description>
 *   admin@acme.com <Badge tone="warning" size="sm">impersonating</Badge>
 * </PersonDisplay.Description>
 */
const PersonDisplayDescription = forwardRef<HTMLSpanElement, PersonDisplayDescriptionProps>(
  function PersonDisplayDescription({ className, children, ...rest }, ref) {
    const size = useSize();
    const textSize = DESCRIPTION_TEXT_SIZE[size];
    return (
      <span
        ref={ref}
        className={clsx(styles.description, className)}
        // {...rest} last so consumer overrides win (Pattern A)
        {...rest}
      >
        <Text as="span" size={textSize} tone="muted">
          {children}
        </Text>
      </span>
    );
  },
);

// ----------------------------------------------------------------------------
// Root
// ----------------------------------------------------------------------------

/**
 * Avatar + Name (+ optional Description lines) — the most-duplicated
 * "person row" composition across the CRM mockups. Compound API:
 * `<PersonDisplay>` root + `<PersonDisplay.Avatar>` + `<PersonDisplay.Name>` +
 * optional repeating `<PersonDisplay.Description>` children. Three sizes
 * (`sm` / `md` / `lg`) drive the Avatar size and the Name / Description
 * text sizes via context.
 *
 * Use it for contact rows, owner cells, audit actors, activity-timeline
 * authors, members lists, and detail-page owner sidebars. NOT for
 * Avatar-only badges (use `<Avatar>` directly) or stacks of avatars
 * (use `<AvatarGroup>`).
 *
 * @example
 * // Canonical: avatar + linked name + email
 * <PersonDisplay size="md">
 *   <PersonDisplay.Avatar name="Sarah Chen" src="/avatars/sarah.png" />
 *   <PersonDisplay.Name href="/contacts/sarah-chen">Sarah Chen</PersonDisplay.Name>
 *   <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
 * </PersonDisplay>
 *
 * @example
 * // Multiple description lines
 * <PersonDisplay size="md">
 *   <PersonDisplay.Avatar name="Marcus Vega" />
 *   <PersonDisplay.Name>Marcus Vega</PersonDisplay.Name>
 *   <PersonDisplay.Description>marcus@acme.com</PersonDisplay.Description>
 *   <PersonDisplay.Description>Account Executive</PersonDisplay.Description>
 * </PersonDisplay>
 *
 * @example
 * // Tight table cell — sm
 * <PersonDisplay size="sm">
 *   <PersonDisplay.Avatar name="Avery Liu" />
 *   <PersonDisplay.Name>Avery Liu</PersonDisplay.Name>
 * </PersonDisplay>
 *
 * @remarks When NOT to use
 * - Avatar-only badges (no name beside the avatar) — use `<Avatar>` directly.
 * - Stacks of avatars (overlapping circles) — use `<AvatarGroup>`.
 * - A "profile hero" with centered avatar above the name — this primitive
 *   is always a horizontal Avatar-left layout. A vertical/centered variant
 *   is out of scope; compose by hand if needed.
 *
 * @remarks Anti-patterns
 * - Wrapping the entire PersonDisplay in a `<Link>` to make the whole
 *   row clickable. The Name owns the link via its `href` prop.
 * - Passing `size` to `<PersonDisplay.Avatar>` directly. Root's `size`
 *   controls all children — overriding the Avatar size in isolation
 *   makes the proportions wrong. The Avatar's `size` prop is omitted
 *   from `PersonDisplayAvatarProps` by design.
 * - Wrapping `<PersonDisplay.Avatar>` in a Fragment or a custom
 *   component. Root identifies the Avatar slot by element-type
 *   identity, so a wrapped Avatar lands inside the text column
 *   instead of the dedicated avatar slot. Render the Avatar as a
 *   direct child; use `{shouldShow ? <PersonDisplay.Avatar … /> : null}`
 *   for conditional rendering (`null`/`false` are safely ignored).
 */
const PersonDisplayRoot = forwardRef<HTMLDivElement, PersonDisplayProps>(function PersonDisplayRoot(
  { size = 'md', shrink = false, className, children, ...rest },
  ref,
) {
  // Sort children into the Avatar (rendered first as a flex sibling)
  // and everything else (rendered inside an inner column so Name +
  // Descriptions stack vertically). Consumers write children in
  // natural source order; the split layout is internal.
  const avatarChildren: ReactNode[] = [];
  const columnChildren: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === PersonDisplayAvatar) {
      avatarChildren.push(child);
    } else {
      columnChildren.push(child);
    }
  });
  return (
    <PersonDisplayContext.Provider value={{ size }}>
      {/* {...rest} first so internally-computed data-size (load-bearing for SCSS gap)
            can't be stomped by a consumer (Pattern B — data-size is the only locked attr). */}
      <div
        ref={ref}
        className={clsx(styles.root, shrink && styles.shrink, className)}
        {...rest}
        data-size={size}
      >
        {avatarChildren}
        {columnChildren.length > 0 && <div className={styles.column}>{columnChildren}</div>}
      </div>
    </PersonDisplayContext.Provider>
  );
});

// ----------------------------------------------------------------------------
// Compound export
// ----------------------------------------------------------------------------

export const PersonDisplay = Object.assign(PersonDisplayRoot, {
  Avatar: PersonDisplayAvatar,
  Name: PersonDisplayName,
  Description: PersonDisplayDescription,
});
