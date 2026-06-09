import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import styles from './DefinitionList.module.scss';

/**
 * Layout direction.
 * - `'horizontal'` (default) — terms in column 1, descriptions in column 2.
 *   All rows share a single term column auto-sized to the longest term (or
 *   `termWidth` if set).
 * - `'stacked'` — terms stack above descriptions, one per row. Common for
 *   settings pages and narrow viewports.
 */
export type DefinitionListLayout = 'horizontal' | 'stacked';

/**
 * Vertical padding per item.
 * - `'sm'` — `var(--space-2)` (default; compact, dense rhythm).
 * - `'md'` — `var(--space-3)` (roomier; matches Card.ListRow rhythm).
 * - `'lg'` — `var(--space-4)` (emphasis panels).
 */
export type DefinitionListSpacing = 'sm' | 'md' | 'lg';

export interface DefinitionListProps extends HTMLAttributes<HTMLDListElement> {
  /** Layout direction. See `DefinitionListLayout`. Default `'horizontal'`. */
  layout?: DefinitionListLayout;
  /**
   * CSS length applied to the term column in horizontal layout (e.g. `'180px'`,
   * `'20%'`, `'max-content'`). Default `'max-content'` — column sizes to the
   * longest term across all rows. Set explicitly when you need consistent
   * alignment across multiple DefinitionLists on the same screen.
   */
  termWidth?: string;
  /** Vertical padding per item. See `DefinitionListSpacing`. Default `'sm'`. */
  spacing?: DefinitionListSpacing;
  /**
   * Render a 1px border between items. Default `false` (clean, dense look).
   * Set when migrating from a `Card.List` and you want to preserve the
   * table-row separator visual.
   */
  dividers?: boolean;
}

export interface DefinitionListItemProps extends HTMLAttributes<HTMLDivElement> {
  /** A `DefinitionList.Term` and a `DefinitionList.Description`. */
  children: ReactNode;
}

export interface DefinitionListTermProps extends HTMLAttributes<HTMLElement> {
  /** The label text — kept short, terms are headings for their values. */
  children: ReactNode;
}

export interface DefinitionListDescriptionProps extends HTMLAttributes<HTMLElement> {
  /**
   * Leading decorative icon, rendered inside the `<dd>` before children.
   * Wrapped in an `aria-hidden` span — the `<dt>` carries the semantic label
   * so the icon is purely visual.
   */
  icon?: ReactNode;
  /** The value content. Any ReactNode — text, Badges, Links, etc. */
  children: ReactNode;
}

/**
 * Flatten one level of React Fragments out of children. `React.Children.toArray`
 * does NOT recursively unwrap fragments — this helper handles the common case
 * of wrapping a single sub-component in `<>...</>`.
 */
function flattenChildren(children: ReactNode): ReactNode[] {
  const flat: ReactNode[] = [];
  Children.toArray(children).forEach((child) => {
    if (isValidElement(child) && child.type === Fragment) {
      flat.push(
        ...Children.toArray((child as ReactElement<{ children: ReactNode }>).props.children),
      );
    } else {
      flat.push(child);
    }
  });
  return flat;
}

/**
 * Compound layout primitive for semantic key/value pairs. Renders proper
 * `<dl>`/`<div>`/`<dt>`/`<dd>` HTML so screen readers announce term-description
 * pairs natively. Use this — not `Card.List` — when every row has a label.
 *
 * Compound children: `DefinitionList.Item` (wraps a term + description pair),
 * `DefinitionList.Term` (the dt), `DefinitionList.Description` (the dd, with
 * optional leading `icon` prop).
 *
 * @example
 * // Horizontal contact properties with icons.
 * <DefinitionList dividers>
 *   <DefinitionList.Item>
 *     <DefinitionList.Term>Email</DefinitionList.Term>
 *     <DefinitionList.Description icon={<Mail size={14} />}>
 *       ada@example.com
 *     </DefinitionList.Description>
 *   </DefinitionList.Item>
 *   <DefinitionList.Item>
 *     <DefinitionList.Term>Phone</DefinitionList.Term>
 *     <DefinitionList.Description icon={<Phone size={14} />}>
 *       +1 (415) 555-0142
 *     </DefinitionList.Description>
 *   </DefinitionList.Item>
 * </DefinitionList>
 *
 * @example
 * // Stacked (settings-style).
 * <DefinitionList layout="stacked">
 *   <DefinitionList.Item>
 *     <DefinitionList.Term>Workspace name</DefinitionList.Term>
 *     <DefinitionList.Description>Acme Corp</DefinitionList.Description>
 *   </DefinitionList.Item>
 * </DefinitionList>
 *
 * @remarks When NOT to use
 * - For non-keyed lists (activity feeds, list of cards). Use `Card.List` or a
 *   plain `Stack` of cards.
 * - For tabular data with multiple columns per row. Use `Table` / `DataTable`.
 *
 * @remarks Anti-patterns
 * - ❌ Putting interactive content inside `<DefinitionList.Term>`. Terms are
 *   labels; values (including links/buttons) go in `<DefinitionList.Description>`.
 * - ❌ Multiple `<DefinitionList.Description>` children under one Item.
 *   Works HTML-wise but breaks the grid layout. Render multiple Items with
 *   the same Term text instead.
 */
const DefinitionListRoot = forwardRef<HTMLDListElement, DefinitionListProps>(
  function DefinitionListRoot(
    {
      layout = 'horizontal',
      termWidth,
      spacing = 'sm',
      dividers,
      className,
      style,
      children,
      ...rest
    },
    ref,
  ) {
    if (process.env.NODE_ENV !== 'production') {
      flattenChildren(children).forEach((child) => {
        if (child == null || typeof child === 'boolean') return;
        if (!isValidElement(child) || child.type !== DefinitionListItem) {
          // eslint-disable-next-line no-console
          console.warn(
            '<DefinitionList> expects <DefinitionList.Item> children. Other children render but may break layout.',
          );
        }
      });
    }

    const mergedStyle: CSSProperties | undefined = termWidth
      ? ({ ['--dl-term-width' as string]: termWidth, ...style } as CSSProperties)
      : style;

    return (
      <dl
        ref={ref}
        data-layout={layout}
        data-spacing={spacing}
        data-dividers={dividers ? 'true' : undefined}
        className={clsx(styles.list, className)}
        style={mergedStyle}
        // {...rest} last so consumer overrides win (Pattern A).
        {...rest}
      >
        {children}
      </dl>
    );
  },
);
DefinitionListRoot.displayName = 'DefinitionList';

/**
 * Wrapper div for one term + description pair. Use as `DefinitionList.Item`.
 * In horizontal layout this renders `display: contents` so dt/dd participate
 * in the parent dl's grid.
 */
export const DefinitionListItem = forwardRef<HTMLDivElement, DefinitionListItemProps>(
  function DefinitionListItem({ className, children, ...rest }, ref) {
    return (
      <div ref={ref} className={clsx(styles.item, className)} {...rest}>
        {children}
      </div>
    );
  },
);
DefinitionListItem.displayName = 'DefinitionListItem';

/**
 * The label of one entry. Renders as `<dt>`. Use as `DefinitionList.Term`.
 */
export const DefinitionListTerm = forwardRef<HTMLElement, DefinitionListTermProps>(
  function DefinitionListTerm({ className, children, ...rest }, ref) {
    return (
      <dt ref={ref} className={clsx(styles.term, className)} {...rest}>
        {children}
      </dt>
    );
  },
);
DefinitionListTerm.displayName = 'DefinitionListTerm';

/**
 * The value of one entry. Renders as `<dd>`. Use as `DefinitionList.Description`.
 * Accepts an optional leading `icon` rendered before children, wrapped in an
 * `aria-hidden` span (decorative — the dt carries the semantic label).
 */
export const DefinitionListDescription = forwardRef<HTMLElement, DefinitionListDescriptionProps>(
  function DefinitionListDescription({ icon, className, children, ...rest }, ref) {
    return (
      <dd ref={ref} className={clsx(styles.description, className)} {...rest}>
        {icon && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
        {children}
      </dd>
    );
  },
);
DefinitionListDescription.displayName = 'DefinitionListDescription';

export const DefinitionList = Object.assign(DefinitionListRoot, {
  Item: DefinitionListItem,
  Term: DefinitionListTerm,
  Description: DefinitionListDescription,
});
