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
import {
  AgentAvatar,
  Avatar,
  type AgentAvatarProps,
  type AvatarProps,
  type AvatarSize,
} from '../Avatar';
import { useTranslation } from '../../i18n';
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
   * `<PersonDisplay.Avatar>` (or `<PersonDisplay.AgentAvatar>`) +
   * `<PersonDisplay.Name>` (+ optional `<PersonDisplay.OnBehalfOf>` and
   * repeating `<PersonDisplay.Description>`) subcomponents in any order — Root
   * sorts the avatar into its own slot. With an `OnBehalfOf`, Name and
   * OnBehalfOf share one truncating row above the Descriptions.
   */
  children: ReactNode;
}

export interface PersonDisplayAvatarProps extends Omit<AvatarProps, 'size'> {}

/** `AgentAvatar` props minus `size` (from context) and `decorative` (always on). */
export interface PersonDisplayAgentAvatarProps extends Omit<
  AgentAvatarProps,
  'size' | 'decorative' | 'name'
> {
  /**
   * Agent label. Not announced here: the avatar is decorative, and the
   * visible `PersonDisplay.Name` (pass the same label) names the agent.
   */
  name: string;
}

export interface PersonDisplayOnBehalfOfProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * The member the agent acts for, rendered after a muted "for" prefix. A
   * plain name, or a `<Link>` to the member. Omit (or pass an empty string)
   * when the member was erased: renders "for a former member". Plain-text
   * children (a string, a number, or text-only nodes like `{first} {last}`)
   * give the member box a hover `title` of the full "for {member}" text (the
   * erased copy when erased), which shadows a consumer `title` on
   * OnBehalfOf; a `<Link>` or other element child gets none. The root span is
   * `display: contents` (its prefix and member join the Name's row), so box
   * styles passed via `className`/`style` on it don't paint.
   */
  children?: ReactNode;
}

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
  /** An OnBehalfOf is present, so Name sits in the truncating agent row. */
  agentRow: boolean;
}

const PersonDisplayContext = createContext<PersonDisplayContextValue | null>(null);

function useSize(): PersonDisplaySize {
  return useContext(PersonDisplayContext)?.size ?? 'md';
}

function useAgentRow(): boolean {
  return useContext(PersonDisplayContext)?.agentRow ?? false;
}

/**
 * Children as one plain string when they are text only: a string, a number,
 * or an array of them (nullish and boolean entries ignored) (JSX `{first} {last}`). Otherwise undefined.
 */
function plainText(children: ReactNode): string | undefined {
  const isText = (c: unknown): c is string | number =>
    typeof c === 'string' || typeof c === 'number';
  if (isText(children)) return String(children);
  if (Array.isArray(children)) {
    // null, undefined and booleans render as nothing, so they do not make it non-text.
    const parts = children.filter((c) => c != null && typeof c !== 'boolean');
    if (parts.every(isText)) return parts.join('');
  }
  return undefined;
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

/**
 * Agent slot: a decorative `<AgentAvatar>` sized from the PersonDisplay root (`PersonDisplay.AgentAvatar`).
 * @see docs/components/PersonDisplay.md
 */
const PersonDisplayAgentAvatar = forwardRef<HTMLSpanElement, PersonDisplayAgentAvatarProps>(
  function PersonDisplayAgentAvatar(props, ref) {
    const size = useSize();
    // {...props} first so context size and decorative win (Pattern B): the
    // visible Name + OnBehalfOf already carry both identities.
    return <AgentAvatar {...props} ref={ref} size={AVATAR_SIZE[size]} decorative />;
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
    // In the agent row the Name may ellipsise, so plain text carries its full text.
    const title = useAgentRow() ? plainText(children) : undefined;
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
          title={title}
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
        title={title}
        // {...rest} last so consumer overrides win (Pattern A)
        {...rest}
      >
        {content}
      </span>
    );
  },
);

// ----------------------------------------------------------------------------
// OnBehalfOf
// ----------------------------------------------------------------------------

/**
 * Muted "for {member}" after the Name, for an agent acting for a member (`PersonDisplay.OnBehalfOf`).
 * @see docs/components/PersonDisplay.md
 */
const PersonDisplayOnBehalfOf = forwardRef<HTMLSpanElement, PersonDisplayOnBehalfOfProps>(
  function PersonDisplayOnBehalfOf({ className, children, ...rest }, ref) {
    const size = useSize();
    const t = useTranslation();
    const prefix = t('personDisplay.onBehalfOfPrefix');
    const plain = plainText(children);
    const former = children == null || children === false || plain?.trim() === '';
    const text = former
      ? t('personDisplay.onBehalfOfFormer')
      : plain !== undefined
        ? `${prefix} ${plain}`
        : undefined;
    const textProps = {
      size: size === 'inline' ? 'inherit' : NAME_TEXT_SIZE[size],
      tone: 'muted',
      weight: 'regular',
    } as const;
    return (
      <span
        ref={ref}
        className={clsx(styles.onBehalfOf, className)}
        // {...rest} last so consumer overrides win (Pattern A)
        {...rest}
      >
        {/* Leading space: name-from-content (a row link, a cell) would
            otherwise glue the Name to "for". A whitespace-only flex item is
            not rendered, so it adds no width. */}{' '}
        {/* `display: contents` makes prefix and member items of the agent row:
            the prefix never shrinks, the member ellipsises (and carries the
            title, as the box the pointer can hover). Separate nodes also
            because children may be a Link. */}
        {!former && (
          <>
            <Text as="span" className={styles.onBehalfOfPrefix} {...textProps}>
              {prefix}
            </Text>{' '}
          </>
        )}
        <Text as="span" className={styles.onBehalfOfMember} title={text} {...textProps}>
          {former ? text : (plain ?? children)}
        </Text>
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
  let columnChildren: ReactNode[] = [];
  const rowChildren: ReactNode[] = [];
  const otherChildren: ReactNode[] = [];
  let agentRow = false;
  Children.forEach(children, (child) => {
    const type = isValidElement(child) ? child.type : null;
    if (type === PersonDisplayAvatar || type === PersonDisplayAgentAvatar) {
      avatarChildren.push(child);
      return;
    }
    columnChildren.push(child);
    if (type === PersonDisplayName || type === PersonDisplayOnBehalfOf) rowChildren.push(child);
    else otherChildren.push(child);
    if (type === PersonDisplayOnBehalfOf) agentRow = true;
  });
  // Only with an OnBehalfOf: Name + OnBehalfOf share one row, first in the
  // column. Without one the column keeps its source order and no wrapper.
  if (agentRow) {
    // Name always before OnBehalfOf, whatever the written order (stable sort).
    const isOnBehalfOf = (c: ReactNode) => isValidElement(c) && c.type === PersonDisplayOnBehalfOf;
    rowChildren.sort((a, b) => Number(isOnBehalfOf(a)) - Number(isOnBehalfOf(b)));
    columnChildren = [
      <div key="agent-row" className={styles.agentRow}>
        {rowChildren}
      </div>,
      ...otherChildren,
    ];
  }
  return (
    <PersonDisplayContext.Provider value={{ size, agentRow }}>
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
  AgentAvatar: PersonDisplayAgentAvatar,
  Name: PersonDisplayName,
  OnBehalfOf: PersonDisplayOnBehalfOf,
  Description: PersonDisplayDescription,
});
