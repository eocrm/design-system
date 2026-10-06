import { act, render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
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

  it('merges className and keeps the child ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Highlight active>
        <div data-testid="block" className="own" ref={ref} />
      </Highlight>,
    );
    expect(block().className).toMatch(/^own \S+$/);
    expect(block()).toHaveAttribute('data-highlight', 'on');
    expect(ref.current).toBe(block());
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
});
