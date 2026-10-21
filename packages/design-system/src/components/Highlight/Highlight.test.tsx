import { act, render, screen } from '@testing-library/react';
import { createRef, useState, type Ref } from 'react';
import { Highlight } from './Highlight';

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

const block = () => screen.getByTestId('block');
const overlay = () => document.querySelector<HTMLElement>('[data-highlight-overlay]');

function stubRect(el: HTMLElement, top: number, left = 0, width = 200, height = 100) {
  el.getBoundingClientRect = () =>
    ({
      top,
      left,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
    }) as DOMRect;
}

beforeEach(() => {
  vi.useFakeTimers();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  // @ts-expect-error -- jsdom has no matchMedia; remove any per-test stub
  delete window.matchMedia;
});

describe('Highlight', () => {
  it('renders no wrapper and leaves an inactive child untouched', () => {
    const { container } = render(
      <Highlight active={false}>
        <div data-testid="block" className="own" />
      </Highlight>,
    );
    expect(container.firstChild).toBe(block());
    expect(block()).toHaveAttribute('class', 'own');
    expect(block()).not.toHaveAttribute('data-highlight');
  });

  it('keeps the child ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Highlight active>
        <div data-testid="block" ref={ref} />
      </Highlight>,
    );
    expect(block()).toHaveAttribute('data-highlight', 'on');
    expect(ref.current).toBe(block());
  });

  it('leaves the child className, style and box-shadow untouched', () => {
    render(
      <Highlight active duration={1000}>
        <div data-testid="block" className="x" style={{ color: 'red' }} />
      </Highlight>,
    );
    expect(block()).toHaveAttribute('class', 'x');
    expect(block()).toHaveAttribute('style', 'color: red;');
    expect(block().style.boxShadow).toBe('');
    expect(block()).toHaveAttribute('data-highlight', 'on');
    act(() => vi.advanceTimersByTime(1000));
    expect(block()).toHaveAttribute('class', 'x');
    expect(block()).toHaveAttribute('style', 'color: red;');
  });

  it('portals an overlay while active and removes it after onDone', () => {
    const onDone = vi.fn();
    const { container } = render(
      <Highlight active onDone={onDone}>
        <div data-testid="block" />
      </Highlight>,
    );
    const el = overlay();
    expect(el).not.toBeNull();
    expect(container).not.toContainElement(el);
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).toHaveAttribute('data-stage', 'on');
    expect(el).not.toHaveAttribute('data-in-overlay');
    act(() => vi.advanceTimersByTime(3000));
    expect(overlay()).toHaveAttribute('data-stage', 'fading');
    act(() => vi.advanceTimersByTime(260));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(overlay()).toBeNull();
  });

  it('paints the overlay with the palette colour', () => {
    const { rerender } = render(
      <Highlight active color="green">
        <div data-testid="block" />
      </Highlight>,
    );
    expect(overlay()!.style.getPropertyValue('--highlight-color')).toBe(
      'var(--color-palette-green-fg)',
    );
    rerender(
      <Highlight active>
        <div data-testid="block" />
      </Highlight>,
    );
    expect(overlay()!.style.getPropertyValue('--highlight-color')).toBe('');
  });

  it('elevates the overlay when the child is inside a Modal', () => {
    render(
      <div data-modal-portal-root="">
        <Highlight active>
          <div data-testid="block" />
        </Highlight>
      </div>,
    );
    expect(overlay()).toHaveAttribute('data-in-overlay', '');
    expect(block()).not.toHaveAttribute('data-in-overlay');
  });

  it('places the overlay over the visible rect and hides it when fully clipped', () => {
    const { rerender } = render(
      <div data-testid="scroller" style={{ overflow: 'auto' }}>
        <Highlight active={false}>
          <div data-testid="block" />
        </Highlight>
      </div>,
    );
    stubRect(screen.getByTestId('scroller'), 0, 0, 1000, 300);
    stubRect(block(), 250);
    rerender(
      <div data-testid="scroller" style={{ overflow: 'auto' }}>
        <Highlight active>
          <div data-testid="block" />
        </Highlight>
      </div>,
    );
    // Clipped by the scroller's bottom edge at 300.
    expect(overlay()).not.toHaveAttribute('hidden');
    const { top, left, width, height } = overlay()!.style;
    expect({ top, left, width, height }).toEqual({
      top: '250px',
      left: '0px',
      width: '200px',
      height: '50px',
    });

    stubRect(block(), 400);
    act(() => window.dispatchEvent(new Event('resize')));
    expect(overlay()).toHaveAttribute('hidden');
  });

  it('removes the overlay when the child unmounts', () => {
    function Maybe({ show, ref }: { show: boolean; ref?: Ref<HTMLDivElement> }) {
      return show ? <div ref={ref} data-testid="block" /> : null;
    }
    const { rerender, unmount } = render(
      <Highlight active duration={Infinity}>
        <Maybe show />
      </Highlight>,
    );
    expect(overlay()).not.toBeNull();
    rerender(
      <Highlight active duration={Infinity}>
        <Maybe show={false} />
      </Highlight>,
    );
    expect(overlay()).toBeNull();
    rerender(
      <Highlight active duration={Infinity}>
        <Maybe show />
      </Highlight>,
    );
    expect(overlay()).not.toBeNull();
    unmount();
    expect(overlay()).toBeNull();
  });

  it('runs on → fading → done and calls onDone once', () => {
    const onDone = vi.fn();
    render(
      <Highlight active duration={1000} onDone={onDone}>
        <div data-testid="block" />
      </Highlight>,
    );
    expect(block()).toHaveAttribute('data-highlight', 'on');
    act(() => vi.advanceTimersByTime(1000));
    expect(block()).toHaveAttribute('data-highlight', 'fading');
    expect(onDone).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(260));
    expect(block()).not.toHaveAttribute('data-highlight');
    expect(block()).not.toHaveAttribute('class');
    expect(onDone).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(10_000));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('defaults duration to 3000ms', () => {
    render(
      <Highlight active>
        <div data-testid="block" />
      </Highlight>,
    );
    act(() => vi.advanceTimersByTime(2999));
    expect(block()).toHaveAttribute('data-highlight', 'on');
    act(() => vi.advanceTimersByTime(1));
    expect(block()).toHaveAttribute('data-highlight', 'fading');
  });

  it('never ends with duration={Infinity}', () => {
    const onDone = vi.fn();
    render(
      <Highlight active duration={Infinity} onDone={onDone}>
        <div data-testid="block" />
      </Highlight>,
    );
    act(() => vi.advanceTimersByTime(60_000));
    expect(block()).toHaveAttribute('data-highlight', 'on');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('clearing active during the fade removes the ring and cancels onDone', () => {
    const onDone = vi.fn();
    const { rerender } = render(
      <Highlight active duration={1000} onDone={onDone}>
        <div data-testid="block" />
      </Highlight>,
    );
    act(() => vi.advanceTimersByTime(1100));
    expect(block()).toHaveAttribute('data-highlight', 'fading');
    rerender(
      <Highlight active={false} duration={1000} onDone={onDone}>
        <div data-testid="block" />
      </Highlight>,
    );
    expect(block()).not.toHaveAttribute('data-highlight');
    act(() => vi.advanceTimersByTime(10_000));
    expect(onDone).not.toHaveBeenCalled();
  });

  it('new onDone identity on re-render does not restart the timer', () => {
    const calls: number[] = [];
    function Host() {
      const [n, setN] = useState(0);
      return (
        <>
          <button onClick={() => setN((x) => x + 1)}>tick</button>
          <Highlight active duration={1000} onDone={() => calls.push(n)}>
            <div data-testid="block" />
          </Highlight>
        </>
      );
    }
    render(<Host />);
    act(() => vi.advanceTimersByTime(900));
    act(() => screen.getByText('tick').click());
    act(() => vi.advanceTimersByTime(100 + 260));
    // Fired on the original schedule, through the LATEST callback.
    expect(calls).toEqual([1]);
  });

  it('re-triggers when active toggles false → true', () => {
    const onDone = vi.fn();
    const el = (active: boolean) => (
      <Highlight active={active} duration={1000} onDone={onDone}>
        <div data-testid="block" />
      </Highlight>
    );
    const { rerender } = render(el(true));
    act(() => vi.advanceTimersByTime(1260));
    expect(onDone).toHaveBeenCalledTimes(1);
    rerender(el(false));
    rerender(el(true));
    expect(block()).toHaveAttribute('data-highlight', 'on');
    act(() => vi.advanceTimersByTime(1260));
    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it('unmount clears timers', () => {
    const onDone = vi.fn();
    const { unmount } = render(
      <Highlight active duration={1000} onDone={onDone}>
        <div data-testid="block" />
      </Highlight>,
    );
    unmount();
    act(() => vi.advanceTimersByTime(10_000));
    expect(onDone).not.toHaveBeenCalled();
  });

  it('scrolls and focuses on activation only when asked', () => {
    const { rerender } = render(
      <Highlight active={false} scrollIntoView focus>
        <div data-testid="block" tabIndex={-1} />
      </Highlight>,
    );
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    const focusSpy = vi.spyOn(block(), 'focus');
    rerender(
      <Highlight active scrollIntoView focus>
        <div data-testid="block" tabIndex={-1} />
      </Highlight>,
    );
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      block: 'center',
      inline: 'nearest',
      behavior: 'smooth',
    });
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(block()).toHaveFocus();
  });

  it('does not scroll or focus without the flags', () => {
    render(
      <Highlight active>
        <div data-testid="block" tabIndex={-1} />
      </Highlight>,
    );
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    expect(block()).not.toHaveFocus();
  });

  it('under reduced motion: instant scroll, no fading phase', () => {
    mockReducedMotion(true);
    const onDone = vi.fn();
    render(
      <Highlight active duration={1000} onDone={onDone} scrollIntoView>
        <div data-testid="block" />
      </Highlight>,
    );
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'auto' }),
    );
    act(() => vi.advanceTimersByTime(1000));
    expect(block()).not.toHaveAttribute('data-highlight');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('adds no ARIA, role or tabindex to the child', () => {
    render(
      <Highlight active focus>
        <div data-testid="block" />
      </Highlight>,
    );
    const attrs = Array.from(block().attributes).map((a) => a.name);
    expect(attrs.filter((n) => n === 'role' || n === 'tabindex' || n.startsWith('aria-'))).toEqual(
      [],
    );
  });

  it('changing duration after it finished does not fire onDone again', () => {
    const onDone = vi.fn();
    const el = (duration: number) => (
      <Highlight active duration={duration} onDone={onDone}>
        <div data-testid="block" />
      </Highlight>
    );
    const { rerender } = render(el(1000));
    act(() => vi.advanceTimersByTime(1260));
    rerender(el(2000));
    act(() => vi.advanceTimersByTime(10_000));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(block()).not.toHaveAttribute('data-highlight');
  });

  it('changing duration mid-hold keeps the original schedule', () => {
    const onDone = vi.fn();
    const el = (duration: number) => (
      <Highlight active duration={duration} onDone={onDone}>
        <div data-testid="block" />
      </Highlight>
    );
    const { rerender } = render(el(1000));
    act(() => vi.advanceTimersByTime(500));
    rerender(el(5000));
    act(() => vi.advanceTimersByTime(500));
    expect(block()).toHaveAttribute('data-highlight', 'fading');
    act(() => vi.advanceTimersByTime(260));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('changing duration during the fade still completes at +260', () => {
    const onDone = vi.fn();
    const el = (duration: number) => (
      <Highlight active duration={duration} onDone={onDone}>
        <div data-testid="block" />
      </Highlight>
    );
    const { rerender } = render(el(1000));
    act(() => vi.advanceTimersByTime(1100));
    expect(block()).toHaveAttribute('data-highlight', 'fading');
    rerender(el(5000));
    act(() => vi.advanceTimersByTime(160));
    expect(block()).not.toHaveAttribute('data-highlight');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('warns in development when the child drops the ref', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    function DropsRef() {
      return <div data-testid="block" />;
    }
    try {
      render(
        <Highlight active>
          <DropsRef />
        </Highlight>,
      );
      expect(warn).toHaveBeenCalledWith(
        'Highlight: child did not attach the ref — it must forward ref to a DOM element',
      );
    } finally {
      warn.mockRestore();
    }
  });
});
