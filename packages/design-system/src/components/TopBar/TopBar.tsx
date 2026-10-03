import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { TopBarStart } from './TopBarStart';
import { TopBarEnd } from './TopBarEnd';
import { TopBarSearch } from './TopBarSearch';
import { TopBarIconButton } from './TopBarIconButton';
import styles from './TopBar.module.scss';

/**
 * Element type the root renders as. `'header'` (default) is the right choice
 * for the application's primary top bar — it carries the implicit `banner`
 * landmark when placed as a direct child of `<body>`. Use `'div'` for the
 * rare case of a nested toolbar inside a main content area where another
 * `<header>` element would be semantically wrong.
 */
export type TopBarElement = 'header' | 'div';

/**
 * Props for `<TopBar>` — the application top-bar primitive.
 *
 * Composes via `<TopBar.Start>` + `<TopBar.End>` for the two horizontal
 * clusters, plus `<TopBar.Search>` and `<TopBar.IconButton>` for the most
 * common children. Any other children are accepted — the root is just a
 * flex row that owns its own height, padding, sticky positioning, and
 * bottom border.
 */
export interface TopBarProps extends Omit<HTMLAttributes<HTMLElement>, 'aria-label'> {
  /**
   * Element to render. Defaults to `'header'`. Pick `'div'` when the bar is
   * nested inside another content area where a second `<header>` landmark
   * would conflict with page semantics.
   */
  as?: TopBarElement;
  /**
   * Accessible label for the bar's landmark. Defaults to `t('topBar.label')`
   * when omitted OR empty — an empty string is not an explicit name — so screen
   * readers always announce a name for the region. Override when a page has
   * multiple bars to disambiguate them.
   */
  'aria-label'?: string;
  /**
   * Children of the bar — typically `<TopBar.Start>` + `<TopBar.End>`. The
   * children area is open so consumers can render a single cluster, a
   * single trailing element, or any other arrangement they need.
   */
  children?: ReactNode;
}

/**
 * Sticky application top-bar primitive; a layout-owning compound (`TopBar.Start`, `.End`, `.Search`, `.IconButton`).
 * @see docs/components/TopBar.md
 */
const TopBarRoot = forwardRef<HTMLElement, TopBarProps>(function TopBar(
  { as = 'header', 'aria-label': ariaLabel, className, children, ...props },
  ref,
) {
  const t = useTranslation();
  // The `as` union is narrow (`'header' | 'div'`), so a single cast is
  // enough — both elements accept the same HTMLAttributes<HTMLElement>
  // surface used by the props interface. The forwarded ref is typed to
  // HTMLElement (the common supertype) so the same ref works for either
  // rendered element without leaking a generic into the public type.
  const Comp = as as 'header';
  return (
    <Comp
      ref={ref as never}
      aria-label={ariaLabel || t('topBar.label')}
      className={clsx(styles.topBar, className)}
      // {...props} last so consumer overrides win (Pattern A).
      {...props}
    >
      {children}
    </Comp>
  );
});

/**
 * Compound `<TopBar>`; subcomponents are attached via `Object.assign`.
 * @see docs/components/TopBar.md
 */
export const TopBar = Object.assign(TopBarRoot, {
  Start: TopBarStart,
  End: TopBarEnd,
  Search: TopBarSearch,
  IconButton: TopBarIconButton,
});
