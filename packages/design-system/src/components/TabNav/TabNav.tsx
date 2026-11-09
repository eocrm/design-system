import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { TabNavLink } from './TabNavLink';
import styles from './TabNav.module.scss';

export interface TabNavProps extends HTMLAttributes<HTMLElement> {
  /**
   * Accessible name of the `<nav>` landmark (e.g. `"Pet Control"`,
   * `"Record sections"`). Required in practice — pass this or
   * `aria-labelledby`; a dev warning fires when neither is set.
   */
  'aria-label'?: string;
  /** `TabNav.Link` children, in display order. */
  children?: ReactNode;
}

// Some consumer environments (RSC, edge runtimes) don't define `process`.
const IS_DEV = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

/**
 * Tab-styled page sub-navigation: a `<nav>` of links with a sliding underline on the current page.
 * @see docs/components/TabNav.md
 */
const TabNavRoot = forwardRef<HTMLElement, TabNavProps>(function TabNav(
  { className, children, ...props },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const measuredRef = useRef(false);
  const lastCurrentRef = useRef<Element | null>(null);
  const syncRef = useRef<() => void>(() => {});

  // Mirrors Tabs' horizontal indicator + overflow logic rather than sharing
  // it: Tabs' version is keyed to its item ids, orientation and action cells,
  // so a shared helper would not be a clean lift. The current link is read
  // from the DOM (`[aria-current='page']`) so router NavLinks that set it
  // themselves work without `current`.
  syncRef.current = () => {
    const wrap = wrapRef.current;
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!wrap || !list || !indicator) return;
    // Scroll only on real overflow — same 1px rounding allowance as Tabs (#710).
    const track = list.parentElement as HTMLElement;
    wrap.toggleAttribute('data-fits', track.getBoundingClientRect().width - wrap.clientWidth <= 1);

    const node = list.querySelector<HTMLElement>("[aria-current='page']");
    if (!node) {
      indicator.style.opacity = '0';
      lastCurrentRef.current = null;
      return;
    }
    indicator.style.opacity = '1';
    const write = () => {
      // offsetLeft is physical, so this is correct in RTL as well.
      indicator.style.transform = `translateX(${node.offsetLeft}px)`;
      indicator.style.width = `${node.offsetWidth}px`;
    };
    if (!measuredRef.current) {
      // First paint: no slide in from 0.
      indicator.style.transition = 'none';
      write();
      void indicator.offsetWidth;
      indicator.style.transition = '';
      measuredRef.current = true;
    } else {
      write();
    }

    if (lastCurrentRef.current !== node) {
      lastCurrentRef.current = node;
      // Scroll the strip alone (scrollIntoView would also move the page or an
      // outer scroller). A viewport-space delta is correct in RTL as well.
      const w = wrap.getBoundingClientRect();
      const r = node.getBoundingClientRect();
      wrap.scrollLeft +=
        r.left < w.left ? r.left - w.left : r.right > w.right ? r.right - w.right : 0;
    }
  };

  // Every render: `current` moved, links added or removed.
  useLayoutEffect(() => syncRef.current());

  // Changes TabNav does not render: a NavLink flipping aria-current on a
  // route change, or link widths changing (fonts, resize).
  useLayoutEffect(() => {
    const list = listRef.current;
    const wrap = wrapRef.current;
    if (!list || !wrap) return;
    const sync = () => syncRef.current();
    const mo = typeof MutationObserver === 'undefined' ? null : new MutationObserver(sync);
    mo?.observe(list, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-current'],
    });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(sync);
    ro?.observe(list);
    ro?.observe(wrap);
    return () => {
      mo?.disconnect();
      ro?.disconnect();
    };
  }, []);

  const labelled = props['aria-label'] || props['aria-labelledby'];
  useEffect(() => {
    if (IS_DEV && !labelled) {
      console.warn('[TabNav] pass `aria-label` or `aria-labelledby` to name the navigation.');
    }
  }, [labelled]);

  return (
    // {...props} before className so the root class is merged, not replaced.
    <nav ref={ref} {...props} className={clsx(styles.root, className)}>
      <div ref={wrapRef} className={styles.scrollWrap}>
        <div className={styles.track}>
          <ul ref={listRef} role="list" className={styles.list}>
            {children}
          </ul>
          <span ref={indicatorRef} className={styles.indicator} aria-hidden="true" />
        </div>
      </div>
    </nav>
  );
});

/**
 * Tab-styled page sub-navigation: a `<nav>` of links with a sliding underline on the current page.
 * @see docs/components/TabNav.md
 */
export const TabNav = Object.assign(TabNavRoot, { Link: TabNavLink });
