import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, render } from '@testing-library/react';
import { createRef } from 'react';
import { Sticky } from './Sticky';
import type { StickyTop } from './Sticky';

describe('Sticky', () => {
  const scss = readFileSync(resolve(__dirname, 'Sticky.module.scss'), 'utf8');
  const tokens = readFileSync(resolve(__dirname, 'Sticky.tokens.scss'), 'utf8');
  const globalTokens = readFileSync(resolve(__dirname, '../../styles/tokens.scss'), 'utf8');

  it('renders children in a <div> and forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Sticky ref={ref}>
        <span data-testid="child">x</span>
      </Sticky>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(container.querySelector('[data-testid="child"]')).toBeInTheDocument();
  });

  it('carries the data-sticky hook a collapsed Split uses to unstick it (#558)', () => {
    const { container } = render(<Sticky>x</Sticky>);
    expect(container.firstChild).toHaveAttribute('data-sticky');
  });

  it('always applies the base sticky class', () => {
    const { container } = render(<Sticky>x</Sticky>);
    // The base class carries position:sticky + align-self:start.
    expect((container.firstChild as HTMLElement).className).toMatch(/sticky/);
  });

  it('defaults to top="none"', () => {
    const { container } = render(<Sticky>x</Sticky>);
    expect((container.firstChild as HTMLElement).className).toMatch(/top-none/);
  });

  it.each<StickyTop>(['none', 'xs', 'sm', 'md', 'lg', 'xl', 'topbar'])(
    'top="%s" applies the top- class',
    (t) => {
      const { container } = render(<Sticky top={t}>x</Sticky>);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`top-${t}`));
    },
  );

  it('emits Sticky token defaults from the order-stable global token entry', () => {
    expect(globalTokens).toContain("@use '../components/Sticky/Sticky.tokens';");
    expect(scss).not.toContain("@use './Sticky.tokens';");
  });

  it('maps the topbar step to a chrome-aware token', () => {
    expect(scss).toContain('top: var(--sticky-top-topbar);');
    expect(scss).toContain('--sticky-offset: var(--sticky-top-topbar);');
    expect(tokens).toContain(
      '--sticky-top-topbar: calc(var(--topbar-height, 56px) + var(--space-4));',
    );
  });

  it('applies the scroll class only when scroll is set', () => {
    const { container, rerender } = render(<Sticky top="lg">x</Sticky>);
    // default: no scroll-viewport class
    expect((container.firstChild as HTMLElement).className).not.toMatch(/scroll/);
    rerender(
      <Sticky top="lg" scroll>
        x
      </Sticky>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/scroll/);
  });

  it('lets the scroll cap override its bottom gap without changing the symmetric default', () => {
    const normalizedScss = scss
      .replace(/\s+/g, ' ')
      .replaceAll('calc( ', 'calc(')
      .replaceAll('var( ', 'var(')
      .replaceAll(' )', ')');
    const bottomGap =
      'var(--sticky-bottom-gap, var(--sticky-default-bottom-gap, var(--sticky-offset, 0px)))';
    expect(normalizedScss).toContain(
      `max-height: calc(100vh - var(--sticky-offset, 0px) - ${bottomGap});`,
    );
    expect(normalizedScss).toContain(
      `max-height: calc(100dvh - var(--sticky-offset, 0px) - ${bottomGap});`,
    );
  });

  it('adds neither layer nor surface by default', () => {
    const { container } = render(<Sticky>x</Sticky>);
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).not.toMatch(/layer/);
    expect(cls).not.toMatch(/surface/);
  });

  it('layer and surface add their classes alongside top/scroll/className', () => {
    const { container } = render(
      <Sticky top="topbar" scroll layer surface className="my-cls">
        x
      </Sticky>,
    );
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toMatch(/layer/);
    expect(cls).toMatch(/surface/);
    expect(cls).toMatch(/top-topbar/);
    expect(cls).toMatch(/scroll/);
    expect(cls).toMatch(/my-cls/);
  });

  it('layer sits below the TopBar and surface uses page background + divider tokens', () => {
    expect(tokens).toContain('--sticky-layer-z: calc(var(--topbar-z-index) - 1);');
    expect(tokens).toContain('--sticky-surface-bg: var(--app-layout-content-background);');
    expect(tokens).toContain('--sticky-surface-border-color: var(--color-border);');
    expect(scss).toContain('z-index: var(--sticky-layer-z);');
  });

  it('merges className and spreads other attrs', () => {
    const { container } = render(
      <Sticky className="my-cls" data-foo="bar">
        x
      </Sticky>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/my-cls/);
    expect(el).toHaveAttribute('data-foo', 'bar');
  });

  describe('surface pinned state', () => {
    type Cb = (e: Partial<IntersectionObserverEntry>[]) => void;
    let cb: Cb;
    const disconnect = vi.fn();
    const ctor = vi.fn();
    beforeEach(() => {
      ctor.mockClear();
      disconnect.mockClear();
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(c: Cb) {
            cb = c;
            ctor();
          }
          observe() {}
          disconnect = disconnect;
        },
      );
    });
    afterEach(() => vi.unstubAllGlobals());

    it('sets data-pinned only while the observer reports the box pinned', () => {
      const { container } = render(<Sticky surface>x</Sticky>);
      const el = container.firstChild as HTMLElement;
      act(() => cb([{ intersectionRatio: 0.9, boundingClientRect: { top: 0 } as DOMRect }]));
      expect(el).toHaveAttribute('data-pinned');
      act(() => cb([{ intersectionRatio: 1, boundingClientRect: { top: 80 } as DOMRect }]));
      expect(el).not.toHaveAttribute('data-pinned');
    });

    it('creates no observer without surface and disconnects on unmount', () => {
      render(<Sticky>x</Sticky>);
      expect(ctor).not.toHaveBeenCalled();
      const { unmount } = render(<Sticky surface>x</Sticky>);
      unmount();
      expect(disconnect).toHaveBeenCalled();
    });

    it('paints the strip shadow and divider colour only under [data-pinned]', () => {
      expect(scss).toMatch(/\.surface\[data-pinned\]\s*\{[^}]*box-shadow/);
      expect(scss).not.toMatch(/\.surface\s*\{[^}]*box-shadow/);
    });
  });
});
