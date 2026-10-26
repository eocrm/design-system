import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent,
} from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { Text } from '../Text';
import { pickActiveSection } from './activeSection';
import styles from './TableOfContents.module.scss';

/** One entry: a heading already on the page, found by `id`. */
export interface TableOfContentsItem {
  /** The heading element's `id`. The link is `#id`; a missing element still renders and falls back to native hash navigation. */
  id: string;
  /** Visible link text — usually the heading's own text. */
  label: string;
  /** Heading level. `2` sits flush; `3` is indented under the `2` before it. */
  level: 2 | 3;
}

export interface TableOfContentsProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Entries in document order. An empty list renders nothing. */
  items: readonly TableOfContentsItem[];
  /**
   * Render a `<details>` disclosure (summary "On this page · <active>") instead
   * of the heading + list. Use where there is no room for a side rail, e.g. on
   * narrow viewports above the content. Default `false`.
   */
  collapsed?: boolean;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * "On this page" navigation for a long page's h2/h3 headings, with scroll-spy and offset-aware click-scroll.
 * @see docs/components/TableOfContents.md
 */
export const TableOfContents = forwardRef<HTMLElement, TableOfContentsProps>(
  function TableOfContents({ items, collapsed = false, className, ...props }, ref) {
    const t = useTranslation();
    const [activeId, setActiveId] = useState<string>();
    const probeRef = useRef<HTMLSpanElement>(null);
    const detailsRef = useRef<HTMLDetailsElement>(null);
    const offsetRef = useRef(0);
    const pausedRef = useRef(false);
    const resumeRef = useRef<() => void>(undefined);
    // Ids are whitespace-free in HTML, so the joined string is a stable effect key.
    const idKey = items.map((item) => item.id).join(' ');

    useEffect(() => {
      if (!idKey) return;
      const ids = idKey.split(' ');
      let frame = 0;
      const readOffset = () => {
        offsetRef.current = probeRef.current?.offsetHeight ?? 0;
      };
      // Resolved every pass, so headings that mount after the TOC are picked up.
      const update = () => {
        frame = 0;
        if (pausedRef.current) return;
        const headings = ids.flatMap((id) => {
          const el = document.getElementById(id);
          return el ? [{ id, top: el.getBoundingClientRect().top }] : [];
        });
        const atBottom =
          window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
        setActiveId(pickActiveSection(headings, offsetRef.current + 1, atBottom));
      };
      const onScroll = () => {
        if (!frame) frame = requestAnimationFrame(update);
      };
      const onResize = () => {
        readOffset();
        onScroll();
      };
      readOffset();
      update();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize);
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
      };
    }, [idKey]);

    useEffect(() => () => resumeRef.current?.(), []);

    if (items.length === 0) return null;

    const onLinkClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      if (detailsRef.current) detailsRef.current.open = false;
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - offsetRef.current,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
      // Re-clicking the current entry must not stack history entries.
      // location.hash is percent-encoded for non-ASCII ids, so compare decoded.
      let same = false;
      try {
        same = decodeURIComponent(location.hash.slice(1)) === id;
      } catch {
        // malformed % escape: treat as a different hash
      }
      if (same) history.replaceState(null, '', `#${id}`);
      else history.pushState(null, '', `#${id}`);
      setActiveId(id);

      // Hold the clicked entry while the smooth scroll passes the others.
      resumeRef.current?.();
      pausedRef.current = true;
      const resume = () => {
        pausedRef.current = false;
        window.clearTimeout(timer);
        window.removeEventListener('scrollend', resume);
        resumeRef.current = undefined;
      };
      const timer = window.setTimeout(resume, 1000);
      window.addEventListener('scrollend', resume);
      resumeRef.current = resume;

      if (target.tabIndex < 0 && !target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus({ preventScroll: true });
    };

    const label = t('tableOfContents.label');
    const activeLabel = items.find((item) => item.id === activeId)?.label;
    const list = (
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={clsx(styles.link, item.level === 3 && styles.nested)}
              aria-current={item.id === activeId ? 'location' : undefined}
              onClick={(event) => onLinkClick(event, item.id)}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    );

    return (
      // {...props} last so a consumer can rename the nav (e.g. two TOCs on one page).
      <nav ref={ref} aria-label={label} className={clsx(styles.root, className)} {...props}>
        <span ref={probeRef} className={styles.probe} aria-hidden />
        {collapsed ? (
          <details ref={detailsRef} className={styles.details}>
            <summary className={styles.summary}>
              {label}
              {activeLabel ? ` · ${activeLabel}` : null}
            </summary>
            {list}
          </details>
        ) : (
          <>
            <Text size="xs" weight="semibold" tone="muted" aria-hidden>
              {label}
            </Text>
            {list}
          </>
        )}
      </nav>
    );
  },
);
