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
export type PersonDisplaySize = 'inline' | 'sm' | 'md' | 'lg';

export interface PersonDisplayProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Visual size of the entire composition. `md` is the default — suits
   * sidebars, members lists, and most card / table contexts. `sm` is
   * the compact density for tight table cells; `lg` is the detail-page
   * hero size. Propagates to the Avatar size and the Name / Description
   * text sizes via context.
   *
   * `inline` fits a person into a text row: the Avatar is one line tall
   * (`1lh`) and the Name inherits the surrounding text's size and weight
   * (and colour, unless it has an `href` — then it's a subtle Link), so a
   * person in a `DefinitionList` value or a table cell is exactly as tall as
   * its plain-text neighbours. Follows the text size; no size decision per
   * call site. Skip Descriptions — a second line defeats it. The root is a
   * `<div>`, so not inside a `<p>`; in a line that also holds something
   * taller than one line it top-aligns rather than sharing the baseline.
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
  inline: 'inline',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
};

// `inline` is absent: its Name renders bare to inherit size AND weight
// (Text has no inherited weight).
const NAME_TEXT_SIZE: Record<Exclude<PersonDisplaySize, 'inline'>, TextSize> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
};

const DESCRIPTION_TEXT_SIZE: Record<PersonDisplaySize, TextSize> = {
  inline: 'inherit',
  sm: 'xs',
  md: 'sm',
  lg: 'md',
};

// ----------------------------------------------------------------------------
// Avatar (declared before Root because Root identifies Avatar children by type)
// ----------------------------------------------------------------------------

/**
 * Avatar slot: a thin `<Avatar>` wrapper that takes its size from the PersonDisplay root (`PersonDisplay.Avatar`).
 * @see docs/components/PersonDisplay.md
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
 * Name slot: plain text, or a real `<a>` link when `href` is set (`PersonDisplay.Name`).
 * @see docs/components/PersonDisplay.md
 */
const PersonDisplayName = forwardRef<HTMLElement, PersonDisplayNameProps>(
  function PersonDisplayName({ href, className, children, ...rest }, ref) {
    const size = useSize();
    // inline: bare text, so it inherits the row's size, weight and colour.
    const content =
      size === 'inline' ? (
        children
      ) : (
        <Text as="span" size={NAME_TEXT_SIZE[size]} weight="medium">
          {children}
        </Text>
      );
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
          {content}
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
        {content}
      </span>
    );
  },
);

// ----------------------------------------------------------------------------
// Description
// ----------------------------------------------------------------------------

/**
 * One line of muted descriptive metadata; repeat for more lines, not for interactive content (`PersonDisplay.Description`).
 * @see docs/components/PersonDisplay.md
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
 * Avatar + Name (+ optional Description lines): the standard horizontal "person row".
 * @see docs/components/PersonDisplay.md
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
