import { createRef } from 'react';
import { renderToString } from 'react-dom/server';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n/I18nProvider';
import { TableOfContents, type TableOfContentsItem } from './index';

const ITEMS: TableOfContentsItem[] = [
  { id: 'a', label: 'A', level: 2 },
  { id: 'b', label: 'B', level: 2 },
  { id: 'c', label: 'C', level: 3 },
];

const OFFSET = 72;
const tops: Record<string, number> = {};

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function setScroll(scrollY: number, scrollHeight = 5000) {
  Object.defineProperty(window, 'scrollY', { value: scrollY, configurable: true });
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    value: scrollHeight,
    configurable: true,
  });
}

/** Headings live outside the RTL container, in document order. */
function mountHeadings(positions: Record<string, number>) {
  for (const [id, top] of Object.entries(positions)) {
    const h = document.createElement('h2');
    h.id = id;
    h.textContent = id.toUpperCase();
    tops[id] = top;
    h.getBoundingClientRect = () => ({ top: tops[id] }) as DOMRect;
    document.body.appendChild(h);
  }
}

const link = (name: string) => screen.getByRole('link', { name });
const current = () =>
  screen.queryAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'location');

let scrollTo: ReturnType<typeof vi.fn>;
beforeEach(() => {
  scrollTo = vi.fn();
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  mockReducedMotion(false);
  setScroll(0);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(OFFSET);
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const id of Object.keys(tops)) {
    document.getElementById(id)?.remove();
    delete tops[id];
  }
  history.replaceState(null, '', '/');
});

describe('TableOfContents', () => {
  it('renders nothing for an empty list', () => {
    const { container } = render(<TableOfContents items={[]} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  describe('expanded', () => {
    it('is one navigation named "On this page" with hash links; level 3 is nested', () => {
      mountHeadings({ a: 0, b: 400, c: 800 });
      render(<TableOfContents items={ITEMS} />);
      expect(screen.getAllByRole('navigation')).toHaveLength(1);
      expect(screen.getByRole('navigation', { name: 'On this page' })).toBeInTheDocument();
      expect(link('A')).toHaveAttribute('href', '#a');
      expect(link('C').className).toMatch(/nested/);
      expect(link('A').className).not.toMatch(/nested/);
    });
  });

  describe('scroll-spy', () => {
    it('marks the last heading above the offset line current, and follows scroll', async () => {
      mountHeadings({ a: -300, b: 40, c: 500 });
      render(<TableOfContents items={ITEMS} />);
      expect(current()).toEqual([link('B')]);

      tops.c = OFFSET;
      fireEvent.scroll(window);
      await waitFor(() => expect(current()).toEqual([link('C')]));
    });

    it('has no current item in the server render', () => {
      const html = renderToString(<TableOfContents items={ITEMS} />);
      expect(html).not.toContain('aria-current');
    });

    it('marks the last item current when scrolled to the bottom', () => {
      mountHeadings({ a: -300, b: 40, c: 500 });
      setScroll(5000 - window.innerHeight);
      render(<TableOfContents items={ITEMS} />);
      expect(current()).toEqual([link('C')]);
    });
  });

  it('lets a consumer aria-label override the default nav name', () => {
    mountHeadings({ a: 0, b: 400, c: 800 });
    render(<TableOfContents items={ITEMS} aria-label="Contents" />);
    expect(screen.getByRole('navigation', { name: 'Contents' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'On this page' })).toBeNull();
  });

  describe('click', () => {
    it('scrolls below the offset, pushes the hash, marks and focuses the heading', async () => {
      const user = userEvent.setup();
      mountHeadings({ a: 0, b: 400, c: 800 });
      setScroll(100);
      render(<TableOfContents items={ITEMS} />);
      await user.click(link('C'));
      expect(scrollTo).toHaveBeenCalledWith({ top: 800 + 100 - OFFSET, behavior: 'smooth' });
      expect(location.hash).toBe('#c');
      expect(current()).toEqual([link('C')]);
      const heading = document.getElementById('c')!;
      expect(heading).toHaveAttribute('tabindex', '-1');
      expect(heading).toHaveFocus();
    });

    it('holds the clicked entry until scrollend, then follows scroll again', async () => {
      const user = userEvent.setup();
      mountHeadings({ a: 0, b: 400, c: 800 });
      render(<TableOfContents items={ITEMS} />);
      await user.click(link('C'));
      tops.b = 40;
      tops.c = 500;
      fireEvent.scroll(window);
      await new Promise((r) => setTimeout(r, 50));
      expect(current()).toEqual([link('C')]);

      fireEvent(window, new Event('scrollend'));
      fireEvent.scroll(window);
      await waitFor(() => expect(current()).toEqual([link('B')]));
    });

    it('resumes the spy after 1000 ms when scrollend never fires', () => {
      vi.useFakeTimers();
      try {
        mountHeadings({ a: 0, b: 400, c: 800 });
        render(<TableOfContents items={ITEMS} />);
        fireEvent.click(link('C'));
        tops.b = 40;
        tops.c = 500;
        fireEvent.scroll(window);
        act(() => vi.advanceTimersByTime(999));
        expect(current()).toEqual([link('C')]);

        act(() => vi.advanceTimersByTime(1));
        fireEvent.scroll(window);
        act(() => vi.advanceTimersByTime(50));
        expect(current()).toEqual([link('B')]);
      } finally {
        vi.useRealTimers();
      }
    });

    it('clears the pause timer and scrollend listener when unmounted mid-pause', () => {
      vi.useFakeTimers();
      try {
        mountHeadings({ a: 0, b: 400, c: 800 });
        const { unmount } = render(<TableOfContents items={ITEMS} />);
        fireEvent.click(link('C'));
        // Other pending timers belong to React/jsdom; only the pause timer must go.
        const pending = vi.getTimerCount();
        const removed = vi.spyOn(window, 'removeEventListener');
        expect(() => unmount()).not.toThrow();
        expect(vi.getTimerCount()).toBe(pending - 1);
        expect(removed).toHaveBeenCalledWith('scrollend', expect.any(Function));
      } finally {
        vi.useRealTimers();
      }
    });

    it('replaces instead of pushing history when the hash is already current', async () => {
      const user = userEvent.setup();
      const push = vi.spyOn(history, 'pushState');
      const replace = vi.spyOn(history, 'replaceState');
      mountHeadings({ a: 0, b: 400, c: 800 });
      render(<TableOfContents items={ITEMS} />);
      await user.click(link('C'));
      await user.click(link('C'));
      expect(push).toHaveBeenCalledTimes(1);
      expect(replace).toHaveBeenCalledTimes(1);
      expect(location.hash).toBe('#c');
    });

    it('replaces instead of pushing when a non-ASCII id is already current', async () => {
      const user = userEvent.setup();
      const push = vi.spyOn(history, 'pushState');
      const replace = vi.spyOn(history, 'replaceState');
      mountHeadings({ раздел: 0 });
      render(<TableOfContents items={[{ id: 'раздел', label: 'Раздел', level: 2 }]} />);
      await user.click(link('Раздел'));
      await user.click(link('Раздел'));
      expect(push).toHaveBeenCalledTimes(1);
      expect(replace).toHaveBeenCalledTimes(1);
    });

    it('scrolls instantly under reduced motion', async () => {
      const user = userEvent.setup();
      mockReducedMotion(true);
      mountHeadings({ a: 0, b: 400, c: 800 });
      render(<TableOfContents items={ITEMS} />);
      await user.click(link('C'));
      expect(scrollTo).toHaveBeenCalledWith({ top: 800 - OFFSET, behavior: 'auto' });
    });

    it('leaves a ctrl-click to the browser', async () => {
      const user = userEvent.setup();
      mountHeadings({ a: 0, b: 400, c: 800 });
      render(<TableOfContents items={ITEMS} />);
      await user.keyboard('{Control>}');
      await user.click(link('C'));
      await user.keyboard('{/Control}');
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('renders a link for a missing target and leaves its click to the browser', async () => {
      const user = userEvent.setup();
      mountHeadings({ a: 0 });
      render(<TableOfContents items={[...ITEMS, { id: 'gone', label: 'Gone', level: 2 }]} />);
      await user.click(link('Gone'));
      expect(scrollTo).not.toHaveBeenCalled();
    });
  });

  describe('collapsed', () => {
    it('is one navigation; the summary names the active section; picking closes it', async () => {
      const user = userEvent.setup();
      // No headings on the page yet, so nothing is active.
      const { container } = render(<TableOfContents items={ITEMS} collapsed />);
      expect(screen.getAllByRole('navigation')).toHaveLength(1);
      const summary = container.querySelector('summary')!;
      expect(summary.textContent).toBe('On this page');

      // Headings that mount after the TOC are picked up on the next scroll.
      mountHeadings({ a: -300, b: 40, c: 800 });
      fireEvent.scroll(window);
      await waitFor(() => expect(summary.textContent).toBe('On this page · B'));

      const details = container.querySelector('details')!;
      details.open = true;
      await user.click(link('C'));
      expect(details.open).toBe(false);
    });
  });

  it('names the nav in Russian under the ru locale', () => {
    render(
      <I18nProvider locale="ru">
        <TableOfContents items={ITEMS} />
      </I18nProvider>,
    );
    expect(screen.getByRole('navigation', { name: 'На этой странице' })).toBeInTheDocument();
  });

  it('forwards the ref to the nav, merges className and passes data-* through', () => {
    const ref = createRef<HTMLElement>();
    render(<TableOfContents ref={ref} items={ITEMS} className="mine" data-testid="toc" />);
    const nav = screen.getByRole('navigation');
    expect(ref.current).toBe(nav);
    expect(nav).toHaveClass('mine');
    expect(nav.className).toMatch(/root/);
    expect(nav).toHaveAttribute('data-testid', 'toc');
  });
});
