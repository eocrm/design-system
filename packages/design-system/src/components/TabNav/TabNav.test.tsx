import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createRef,
  forwardRef,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import { TabNav } from './TabNav';

// jsdom has no layout: drive offsetLeft/offsetWidth from data attributes.
const offsetLeft = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetLeft');
const offsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
    configurable: true,
    get(this: HTMLElement) {
      return Number(this.dataset.left ?? 0);
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return Number(this.dataset.width ?? 0);
    },
  });
});
afterAll(() => {
  if (offsetLeft) Object.defineProperty(HTMLElement.prototype, 'offsetLeft', offsetLeft);
  if (offsetWidth) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', offsetWidth);
});

// A tiny stand-in for react-router's location store + NavLink: the link sets
// aria-current itself and re-renders on its own, without TabNav re-rendering.
let location = '/a';
const listeners = new Set<() => void>();
function navigate(to: string) {
  location = to;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const FakeNavLink = forwardRef<
  HTMLAnchorElement,
  { to: string; children?: ReactNode } & ComponentPropsWithoutRef<'a'>
>(function FakeNavLink({ to, children, ...rest }, ref) {
  const path = useSyncExternalStore(subscribe, () => location);
  return (
    <a ref={ref} href={to} data-to={to} aria-current={path === to ? 'page' : undefined} {...rest}>
      {children}
    </a>
  );
});

const indicatorOf = (c: HTMLElement) => c.querySelector('[class*="indicator"]') as HTMLElement;

describe('<TabNav>', () => {
  it('renders a labelled nav with a list of real links and no tab roles', () => {
    const { container } = render(
      <TabNav aria-label="Pet Control">
        <TabNav.Link href="/today">Today</TabNav.Link>
        <TabNav.Link href="/trends">Trends</TabNav.Link>
      </TabNav>,
    );
    const nav = screen.getByRole('navigation', { name: 'Pet Control' });
    expect(nav.querySelectorAll('ul > li')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('href', '/today');
    expect(container.querySelector('[role="tab"], [role="tablist"], [role="tabpanel"]')).toBe(null);
  });

  it('warns in dev when the nav has no accessible name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <TabNav>
        <TabNav.Link href="/a">A</TabNav.Link>
      </TabNav>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[TabNav]'));
    warn.mockClear();
    render(
      <TabNav aria-labelledby="x">
        <TabNav.Link href="/a">A</TabNav.Link>
      </TabNav>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('sets aria-current="page" from `current` and positions the indicator on it', () => {
    const { container, rerender } = render(
      <TabNav aria-label="Sections">
        <TabNav.Link href="/a" data-left="0" data-width="40">
          A
        </TabNav.Link>
        <TabNav.Link href="/b" data-left="48" data-width="60" current>
          B
        </TabNav.Link>
      </TabNav>,
    );
    expect(screen.getByRole('link', { name: 'B' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'A' })).not.toHaveAttribute('aria-current');
    const indicator = indicatorOf(container);
    expect(indicator).toHaveAttribute('aria-hidden', 'true');
    expect(indicator.style.opacity).toBe('1');
    expect(indicator.style.transform).toBe('translateX(48px)');
    expect(indicator.style.width).toBe('60px');

    rerender(
      <TabNav aria-label="Sections">
        <TabNav.Link href="/a" data-left="0" data-width="40" current>
          A
        </TabNav.Link>
        <TabNav.Link href="/b" data-left="48" data-width="60">
          B
        </TabNav.Link>
      </TabNav>,
    );
    expect(indicator.style.transform).toBe('translateX(0px)');
    expect(indicator.style.width).toBe('40px');
  });

  it('hides the indicator when no link is current', () => {
    const { container } = render(
      <TabNav aria-label="Sections">
        <TabNav.Link href="/a">A</TabNav.Link>
      </TabNav>,
    );
    expect(indicatorOf(container).style.opacity).toBe('0');
  });

  it('follows a router link that sets aria-current itself, across route changes', async () => {
    location = '/a';
    const { container } = render(
      <TabNav aria-label="Sections">
        <TabNav.Link as={FakeNavLink} to="/a" data-left="0" data-width="40">
          A
        </TabNav.Link>
        <TabNav.Link as={FakeNavLink} to="/b" data-left="48" data-width="60">
          B
        </TabNav.Link>
      </TabNav>,
    );
    const indicator = indicatorOf(container);
    expect(indicator.style.opacity).toBe('1');
    expect(indicator.style.transform).toBe('translateX(0px)');

    act(() => navigate('/b'));
    await waitFor(() => expect(indicator.style.transform).toBe('translateX(48px)'));
    expect(indicator.style.width).toBe('60px');
  });

  it('positions the indicator from the current link in RTL too', () => {
    const { container } = render(
      <div dir="rtl">
        <TabNav aria-label="Sections">
          <TabNav.Link href="/a" data-left="120" data-width="40" current>
            A
          </TabNav.Link>
          <TabNav.Link href="/b" data-left="20" data-width="60">
            B
          </TabNav.Link>
        </TabNav>
      </div>,
    );
    expect(indicatorOf(container).style.transform).toBe('translateX(120px)');
    expect(indicatorOf(container).style.width).toBe('40px');
  });

  it('scrolls the current link into view when it is outside the strip', () => {
    const spy = vi.fn();
    const original = Element.prototype.scrollIntoView;
    const rect = Element.prototype.getBoundingClientRect;
    Element.prototype.scrollIntoView = spy;
    // The strip shows 0–100px; link B sits at 150–200px.
    Element.prototype.getBoundingClientRect = function (this: Element) {
      const right = this.getAttribute('href') === '/b' ? 200 : 100;
      const left = this.getAttribute('href') === '/b' ? 150 : 0;
      return { left, right, top: 0, bottom: 0, width: right - left, height: 0 } as DOMRect;
    };
    try {
      render(
        <TabNav aria-label="Sections">
          <TabNav.Link href="/a">A</TabNav.Link>
          <TabNav.Link href="/b" current>
            B
          </TabNav.Link>
        </TabNav>,
      );
      expect(spy).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
      expect(spy.mock.contexts[0]).toBe(screen.getByRole('link', { name: 'B' }));
    } finally {
      Element.prototype.scrollIntoView = original;
      Element.prototype.getBoundingClientRect = rect;
    }
  });

  it('does not scroll when the current link is already visible', () => {
    const spy = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = spy;
    try {
      render(
        <TabNav aria-label="Sections">
          <TabNav.Link href="/a" current>
            A
          </TabNav.Link>
        </TabNav>,
      );
      expect(spy).not.toHaveBeenCalled();
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it('forwards `as`, extra props, refs and merges className', () => {
    const navRef = createRef<HTMLElement>();
    const linkRef = createRef<HTMLAnchorElement>();
    render(
      <TabNav aria-label="Sections" ref={navRef} className="custom-nav">
        <TabNav.Link as={FakeNavLink} to="/x" ref={linkRef} className="custom-link">
          X
        </TabNav.Link>
      </TabNav>,
    );
    const link = screen.getByRole('link', { name: 'X' });
    expect(link).toHaveAttribute('data-to', '/x');
    expect(linkRef.current).toBe(link);
    expect(navRef.current?.tagName).toBe('NAV');
    expect(navRef.current).toHaveClass('custom-nav');
    expect(navRef.current?.className).toMatch(/root/);
    expect(link).toHaveClass('custom-link');
    expect(link.className).toMatch(/link/);
  });

  it('renders leading and trailing inside the link', () => {
    render(
      <TabNav aria-label="Sections">
        <TabNav.Link href="/a" leading={<span>L</span>} trailing={<span>3</span>}>
          Inbox
        </TabNav.Link>
      </TabNav>,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('LInbox3');
  });

  it('keeps every link in the Tab order (no roving tabindex)', async () => {
    const user = userEvent.setup();
    render(
      <TabNav aria-label="Sections">
        <TabNav.Link href="/a" current>
          A
        </TabNav.Link>
        <TabNav.Link href="/b">B</TabNav.Link>
        <TabNav.Link href="/c">C</TabNav.Link>
      </TabNav>,
    );
    const links = screen.getAllByRole('link');
    links.forEach((l) => expect(l).not.toHaveAttribute('tabindex'));
    await user.tab();
    expect(links[0]).toHaveFocus();
    await user.tab();
    expect(links[1]).toHaveFocus();
    await user.tab();
    expect(links[2]).toHaveFocus();
  });
});

describe('TabNav styles', () => {
  const tokens = readFileSync(resolve(__dirname, 'TabNav.tokens.scss'), 'utf8');
  const mod = readFileSync(resolve(__dirname, 'TabNav.module.scss'), 'utf8');
  it('reaches --size-touch on coarse pointers', () => {
    expect(tokens).toMatch(
      /@media \(pointer: coarse\)[\s\S]*--tab-nav-link-min-height:\s*var\(--size-touch\)/,
    );
    expect(mod).toContain('min-block-size: var(--tab-nav-link-min-height)');
  });
  it('aliases Tabs tokens so both look identical', () => {
    expect(tokens).toMatch(/--tab-nav-link-fg-active:\s*var\(--tabs-tab-fg-active\)/);
    expect(tokens).toMatch(/--tab-nav-indicator-bg:\s*var\(--tabs-indicator-bg\)/);
  });
  it('styles focus with :focus-visible and current with aria-current', () => {
    expect(mod).toContain(':focus-visible');
    expect(mod).not.toMatch(/:focus\s*[{,]/);
    expect(mod).toContain("[aria-current='page']");
  });
});
