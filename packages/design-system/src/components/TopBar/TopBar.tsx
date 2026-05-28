import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { TopBarStart } from './TopBarStart';
import { TopBarEnd } from './TopBarEnd';
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
   * so screen readers always announce a name for the region. Override when a
   * page has multiple bars to disambiguate them.
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
 * Sticky application top-bar primitive. Renders an inline-padded horizontal
 * bar pinned to the top of its scroll container with a subtle bottom border.
 *
 * **Layout-owning primitive (Hard rule 4 exception).** Like `<Modal>`,
 * `<Drawer>`, `<Page>`, and `<Rail>`, `<TopBar>` is a layout container by
 * design — it owns its own height, sticky positioning, padding, and
 * background because that IS its job as a top-bar chrome. The consumer
 * chooses where to place the bar by styling its parent (typically a CSS
 * grid app shell); the bar itself fills the available inline space.
 *
 * Compound API — combine the subcomponents to build the bar you need:
 *
 * - `<TopBar.Start>` — the left cluster. Flex-grows to take remaining space.
 * - `<TopBar.End>` — the right cluster. Shrinks to its content.
 * - `<TopBar.Search>` — a styled `<input type="search">` with leading icon
 *   and optional trailing `<kbd>` hint.
 * - `<TopBar.IconButton>` — a thin `<Button iconOnly variant="ghost">` with
 *   an optional notification-dot indicator.
 *
 * @example
 * // Canonical app-shell pattern: Start has the search, End has the actions.
 * <TopBar>
 *   <TopBar.Start>
 *     <TopBar.Search placeholder="Search contacts, deals…" hotkey="⌘K" />
 *   </TopBar.Start>
 *   <TopBar.End>
 *     <TopBar.IconButton aria-label="Create new"><Plus size={16} /></TopBar.IconButton>
 *     <TopBar.IconButton aria-label="Notifications" indicator>
 *       <Bell size={16} />
 *     </TopBar.IconButton>
 *     <Avatar name="Alex Rivera" size="sm" />
 *   </TopBar.End>
 * </TopBar>
 *
 * @example
 * // Right-aligned actions only — Start can be omitted; End still shrinks to
 * // the right because the flex row has no growing sibling to push it.
 * <TopBar>
 *   <TopBar.End>
 *     <TopBar.IconButton aria-label="Settings"><Settings size={16} /></TopBar.IconButton>
 *   </TopBar.End>
 * </TopBar>
 *
 * @example
 * // Nested secondary toolbar — use `as="div"` to avoid stacking two
 * // `<header>` landmarks on the page.
 * <TopBar as="div" aria-label="Filters">
 *   <TopBar.Start>…</TopBar.Start>
 * </TopBar>
 *
 * @remarks When NOT to use
 * - For a left-side navigation column → use `<Rail>`.
 * - For a page-local heading + actions → use `<PageHeader>`, not a TopBar.
 * - For an action toolbar attached to a specific section → use a `<Cluster>`
 *   inside that section; TopBar is for the application's top chrome.
 *
 * @remarks Anti-patterns
 * - ❌ Wrapping the bar in additional `position: sticky` containers — the
 *   bar already sticks. Layered sticky parents stack the bar at the wrong
 *   offset.
 * - ❌ Reaching for `<TopBar.IconButton>` outside the bar. It's a
 *   topbar-specific size + indicator pattern; for general icon buttons use
 *   `<Button iconOnly variant="ghost">`.
 * - ❌ Putting a `<Button variant="primary">` inside the bar. Primary
 *   actions belong inside the page body where they're discoverable; the
 *   topbar is for navigation, search, and global ambient actions only.
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
      aria-label={ariaLabel ?? t('topBar.label')}
      className={clsx(styles.topBar, className)}
      // {...props} last so consumer overrides win (Pattern A).
      {...props}
    >
      {children}
    </Comp>
  );
});

/**
 * `<TopBar>` — sticky application top-bar primitive. See `TopBarRoot` JSDoc
 * for the full per-prop and per-subcomponent contract. Subcomponents are
 * attached to the root via `Object.assign` (the canonical compound pattern
 * used by `<Card>`, `<Rail>`, `<DropdownMenu>`, etc.).
 */
// NOTE: Search and IconButton are attached in Task 5 once their modules
// exist. This file's compose is updated then.
export const TopBar = Object.assign(TopBarRoot, {
  Start: TopBarStart,
  End: TopBarEnd,
});
