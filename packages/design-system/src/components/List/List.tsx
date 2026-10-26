import { createContext, forwardRef, useContext, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './List.module.scss';

/**
 * Marker style.
 * - `'bullet'` (default) — a dot per item, rendered in a `<ul>`.
 * - `'number'` — 1, 2, 3 per item, rendered in an `<ol>`.
 */
export type ListVariant = 'bullet' | 'number';

/**
 * Space between items.
 * - `'xs'` — `var(--space-1)`; dense reference lists.
 * - `'sm'` — `var(--space-2)` (default); prose rhythm.
 * - `'md'` — `var(--space-3)`; items that wrap to several lines.
 */
export type ListGap = 'xs' | 'sm' | 'md';

/**
 * How `variant="number"` draws its numbers.
 * - `'plain'` (default) — a muted figure.
 * - `'badge'` — a small circular accent badge (numbered steps). Ignored for bullets.
 */
export type ListNumberStyle = 'plain' | 'badge';

export interface ListProps extends HTMLAttributes<HTMLElement> {
  /** Marker style. See `ListVariant`. Default `'bullet'`. */
  variant?: ListVariant;
  /** Space between items. See `ListGap`. Default `'sm'`. */
  gap?: ListGap;
  /** Number look; only applies to `variant="number"`. See `ListNumberStyle`. Default `'plain'`. */
  numberStyle?: ListNumberStyle;
  /** `List.Item` elements. A nested `List` goes inside a `List.Item`. */
  children?: ReactNode;
}

export interface ListItemProps extends HTMLAttributes<HTMLLIElement> {
  /** Item content. Text, inline elements, or a nested `List`. */
  children?: ReactNode;
}

interface ListContext {
  variant: ListVariant;
  numberStyle: ListNumberStyle;
}

const Ctx = createContext<ListContext>({ variant: 'bullet', numberStyle: 'plain' });
const DepthCtx = createContext(0);

/**
 * Semantic bulleted or numbered list of prose items (`<ul>` / `<ol>` with `List.Item`).
 * @see docs/components/List.md
 */
const ListRoot = forwardRef<HTMLElement, ListProps>(function ListRoot(
  { variant = 'bullet', gap = 'sm', numberStyle = 'plain', className, children, ...rest },
  ref,
) {
  const depth = useContext(DepthCtx);
  const Tag = variant === 'number' ? 'ol' : 'ul';
  return (
    <DepthCtx.Provider value={depth + 1}>
      <Ctx.Provider value={{ variant, numberStyle }}>
        <Tag
          ref={ref as never}
          // Explicit role: Safari/VoiceOver drops list semantics under `list-style: none`.
          role="list"
          data-gap={gap}
          data-variant={variant}
          data-nested={depth > 0 ? 'true' : undefined}
          className={clsx(styles.list, className)}
          // {...rest} last so consumer overrides win (Pattern A).
          {...rest}
        >
          {children}
        </Tag>
      </Ctx.Provider>
    </DepthCtx.Provider>
  );
});

/** One list entry; the marker is drawn here and hidden from assistive tech. */
export const ListItem = forwardRef<HTMLLIElement, ListItemProps>(function ListItem(
  { className, children, ...rest },
  ref,
) {
  const { variant, numberStyle } = useContext(Ctx);
  const inner =
    variant === 'bullet' ? (
      <span className={styles.bullet} />
    ) : (
      // Number comes from a CSS counter on ::before, so it survives wrappers that render 0 or 2 items.
      <span className={numberStyle === 'badge' ? styles.badge : styles.number} />
    );
  return (
    <li ref={ref} className={clsx(styles.item, className)} {...rest}>
      <span aria-hidden="true" className={styles.marker}>
        {inner}
      </span>
      <div className={styles.content}>{children}</div>
    </li>
  );
});
ListItem.displayName = 'ListItem';

export const List = Object.assign(ListRoot, { Item: ListItem });
