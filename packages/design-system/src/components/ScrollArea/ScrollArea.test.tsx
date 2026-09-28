import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRef } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { ScrollArea } from './ScrollArea';

// jsdom has no layout: scrollHeight/clientHeight are 0 and ResizeObserver is
// undefined. Stub both so the focusability logic can be driven.
function stubLayout(scrollHeight: number, clientHeight: number) {
  const sh = vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(scrollHeight);
  const ch = vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(clientHeight);
  return {
    set(nextScroll: number, nextClient: number) {
      sh.mockReturnValue(nextScroll);
      ch.mockReturnValue(nextClient);
    },
  };
}

function stubResizeObserver() {
  const callbacks: ResizeObserverCallback[] = [];
  const instances: MockResizeObserver[] = [];
  class MockResizeObserver {
    constructor(cb: ResizeObserverCallback) {
      callbacks.push(cb);
      instances.push(this);
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  return {
    instances,
    fire() {
      act(() => {
        for (const cb of callbacks) cb([], {} as ResizeObserver);
      });
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ScrollArea', () => {
  it('renders a div with the base class and data-scroll-area, not a tab stop by default', () => {
    render(<ScrollArea data-testid="sa">x</ScrollArea>);
    const el = screen.getByTestId('sa');
    expect(el.tagName).toBe('DIV');
    expect(el).toHaveAttribute('data-scroll-area', '');
    expect(el.className).toMatch(/root/);
    expect(el).not.toHaveAttribute('tabindex');
    expect(el).not.toHaveAttribute('role');
  });

  it('forwards ref to the div and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ScrollArea ref={ref} className="mine" data-testid="sa">
        x
      </ScrollArea>,
    );
    const el = screen.getByTestId('sa');
    expect(ref.current).toBe(el);
    expect(el.className).toMatch(/root/);
    expect(el.className).toMatch(/mine/);
  });

  it.each(['sm', 'md', 'lg'] as const)(
    'maxHeight="%s" applies its scale class and no inline max-height',
    (size) => {
      render(
        <ScrollArea maxHeight={size} data-testid="sa">
          x
        </ScrollArea>,
      );
      const el = screen.getByTestId('sa');
      expect(el.className).toMatch(new RegExp(`max-height-${size}`));
      expect(el.style.maxHeight).toBe('');
    },
  );

  it('a number maxHeight is inline px; a string passes through', () => {
    const { rerender } = render(
      <ScrollArea maxHeight={320} data-testid="sa">
        x
      </ScrollArea>,
    );
    expect(screen.getByTestId('sa').style.maxHeight).toBe('320px');
    rerender(
      <ScrollArea maxHeight="50vh" data-testid="sa">
        x
      </ScrollArea>,
    );
    expect(screen.getByTestId('sa').style.maxHeight).toBe('50vh');
  });

  it('a consumer style.maxHeight wins over the maxHeight prop', () => {
    render(
      <ScrollArea maxHeight={320} style={{ maxHeight: '100px' }} data-testid="sa">
        x
      </ScrollArea>,
    );
    expect(screen.getByTestId('sa').style.maxHeight).toBe('100px');
  });

  it('overflowing with no focusable content: a named region in the tab order', () => {
    stubLayout(500, 100);
    render(<ScrollArea aria-label="Log">plain text</ScrollArea>);
    const region = screen.getByRole('region', { name: 'Log' });
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('named, overflowing with a link inside: a region, but not a tab stop', () => {
    stubLayout(500, 100);
    render(
      <ScrollArea aria-label="Feed" data-testid="sa">
        <a href="/x">row</a>
      </ScrollArea>,
    );
    const el = screen.getByTestId('sa');
    expect(el).not.toHaveAttribute('tabindex');
    expect(el).toHaveAttribute('role', 'region');
  });

  it('unnamed, overflowing with a link inside: no role, no tab stop', () => {
    stubLayout(500, 100);
    render(
      <ScrollArea data-testid="sa">
        <a href="/x">row</a>
      </ScrollArea>,
    );
    const el = screen.getByTestId('sa');
    expect(el).not.toHaveAttribute('tabindex');
    expect(el).not.toHaveAttribute('role');
  });

  it('named, not overflowing: a region, but not a tab stop', () => {
    stubLayout(100, 100);
    render(
      <ScrollArea aria-label="Log" data-testid="sa">
        plain text
      </ScrollArea>,
    );
    const el = screen.getByTestId('sa');
    expect(el).not.toHaveAttribute('tabindex');
    expect(el).toHaveAttribute('role', 'region');
  });

  it('a hidden input does not count as focusable content', () => {
    stubLayout(500, 100);
    render(
      <ScrollArea aria-label="Log" data-testid="sa">
        plain text
        <input type="hidden" name="x" value="1" />
      </ScrollArea>,
    );
    expect(screen.getByTestId('sa')).toHaveAttribute('tabindex', '0');
  });

  it('keeps the tab stop while it has focus, and drops it once focus leaves', async () => {
    stubLayout(500, 100);
    const { rerender } = render(
      <ScrollArea aria-label="Feed" data-testid="sa">
        <span>row</span>
      </ScrollArea>,
    );
    const el = screen.getByTestId('sa');
    act(() => el.focus());
    expect(document.activeElement).toBe(el);
    rerender(
      <ScrollArea aria-label="Feed" data-testid="sa">
        <a href="/x">row</a>
      </ScrollArea>,
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(el).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(el);
    act(() => el.blur());
    await waitFor(() => expect(el).not.toHaveAttribute('tabindex'));
  });

  it('not overflowing: not a tab stop', () => {
    stubLayout(100, 100);
    render(
      <ScrollArea aria-label="Log" data-testid="sa">
        plain text
      </ScrollArea>,
    );
    expect(screen.getByTestId('sa')).not.toHaveAttribute('tabindex');
  });

  it('drops the tab stop when a focusable child is added later', async () => {
    stubLayout(500, 100);
    const { rerender } = render(
      <ScrollArea aria-label="Feed" data-testid="sa">
        <span>row</span>
      </ScrollArea>,
    );
    expect(screen.getByTestId('sa')).toHaveAttribute('tabindex', '0');
    rerender(
      <ScrollArea aria-label="Feed" data-testid="sa">
        <a href="/x">row</a>
      </ScrollArea>,
    );
    await waitFor(() => expect(screen.getByTestId('sa')).not.toHaveAttribute('tabindex'));
  });

  it('becomes a tab stop again when its last focusable child is removed', async () => {
    stubLayout(500, 100);
    const { rerender } = render(
      <ScrollArea aria-label="Feed" data-testid="sa">
        <a href="/x">row</a>
      </ScrollArea>,
    );
    expect(screen.getByTestId('sa')).not.toHaveAttribute('tabindex');
    rerender(
      <ScrollArea aria-label="Feed" data-testid="sa">
        <span>row</span>
      </ScrollArea>,
    );
    await waitFor(() => expect(screen.getByTestId('sa')).toHaveAttribute('tabindex', '0'));
  });

  it('re-measures when a bare text-node child grows in place (no childList mutation)', async () => {
    const layout = stubLayout(100, 100);
    const { rerender } = render(
      <ScrollArea aria-label="Log" data-testid="sa">
        {'short'}
      </ScrollArea>,
    );
    expect(screen.getByTestId('sa')).not.toHaveAttribute('tabindex');
    layout.set(500, 100);
    rerender(
      <ScrollArea aria-label="Log" data-testid="sa">
        {'a much longer log'}
      </ScrollArea>,
    );
    await waitFor(() => expect(screen.getByTestId('sa')).toHaveAttribute('tabindex', '0'));
  });

  it('becomes a tab stop when a resize makes it overflow', () => {
    const layout = stubLayout(100, 100);
    const ro = stubResizeObserver();
    render(
      <ScrollArea aria-label="Log" data-testid="sa">
        plain text
      </ScrollArea>,
    );
    expect(screen.getByTestId('sa')).not.toHaveAttribute('tabindex');
    layout.set(500, 100);
    ro.fire();
    expect(screen.getByTestId('sa')).toHaveAttribute('tabindex', '0');
  });

  it('observes added direct children and unobserves removed ones', async () => {
    stubLayout(100, 100);
    const ro = stubResizeObserver();
    const { rerender } = render(
      <ScrollArea aria-label="Feed" data-testid="sa">
        <div data-testid="a">a</div>
      </ScrollArea>,
    );
    const a = screen.getByTestId('a');
    const obs = ro.instances[0]!;
    expect(obs.observe).toHaveBeenCalledWith(a);
    rerender(
      <ScrollArea aria-label="Feed" data-testid="sa">
        <p data-testid="b">b</p>
      </ScrollArea>,
    );
    const b = screen.getByTestId('b');
    await waitFor(() => expect(obs.observe).toHaveBeenCalledWith(b));
    expect(obs.unobserve).toHaveBeenCalledWith(a);
  });

  it('warns once in dev when it becomes a tab stop with no accessible name', () => {
    stubLayout(500, 100);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = render(<ScrollArea>plain text</ScrollArea>);
    rerender(<ScrollArea>plain text again</ScrollArea>);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toMatch(/ScrollArea/);
  });

  it('does not warn when named via aria-label or aria-labelledby', () => {
    stubLayout(500, 100);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <>
        <span id="lbl">Log</span>
        <ScrollArea aria-labelledby="lbl">plain text</ScrollArea>
        <ScrollArea aria-label="Log 2">plain text</ScrollArea>
      </>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('a consumer tabIndex / role wins over the computed ones', () => {
    stubLayout(500, 100);
    render(
      <ScrollArea aria-label="Log" tabIndex={-1} role="log" data-testid="sa">
        plain text
      </ScrollArea>,
    );
    const el = screen.getByTestId('sa');
    expect(el).toHaveAttribute('tabindex', '-1');
    expect(el).toHaveAttribute('role', 'log');
  });

  it('SCSS: scrolls vertically, can shrink, contains overscroll, rings through its own token', () => {
    const scss = readFileSync(resolve(__dirname, 'ScrollArea.module.scss'), 'utf8');
    const root = scss.match(/\.root \{[\s\S]*?\n\}/)![0];
    expect(root).toMatch(/overflow-y: auto;/);
    expect(root).toMatch(/overflow-x: hidden;/);
    // Room for a focused child's outset ring at the clip edge (focus-ring sweep).
    expect(root).toMatch(/padding: var\(--scroll-area-padding\);/);
    expect(root).toMatch(/scroll-padding: var\(--scroll-area-padding\);/);
    const tokens = readFileSync(resolve(__dirname, 'ScrollArea.tokens.scss'), 'utf8');
    expect(tokens).toMatch(
      /--scroll-area-padding: calc\(var\(--ring-offset\) \+ var\(--ring-width\)\);/,
    );
    expect(root).toMatch(/min-height: 0;/);
    expect(root).toMatch(/overscroll-behavior: contain;/);
    expect(root).toMatch(/focus-ring\(var\(--scroll-area-ring\)\)/);
    for (const size of ['sm', 'md', 'lg']) {
      expect(scss).toMatch(
        new RegExp(
          `\\.max-height-${size} \\{\\s*max-height: var\\(--scroll-area-max-height-${size}\\);`,
        ),
      );
    }
  });
});
