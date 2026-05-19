import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRef, useState, type ReactNode } from 'react';
import { act, configure, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from './Tooltip';

describe('Tooltip — initial render', () => {
  it('renders the trigger and does not render the tooltip on mount', () => {
    render(
      <Tooltip content="Save the record">
        <button type="button">Save</button>
      </Tooltip>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('throws a clear error when children is not a valid React element', () => {
    // React 19 logs console.error for thrown render errors. Silence it so the
    // test output stays clean; we still assert the throw with toThrow().
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <Tooltip content="x">
          {/* @ts-expect-error — intentionally invalid */}
          {null}
        </Tooltip>,
      ),
    ).toThrow(/exactly one React element/);
    spy.mockRestore();
  });

  it('forwards a consumer ref on the child to the underlying DOM node', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Tooltip content="x">
        <button type="button" ref={ref}>
          Save
        </button>
      </Tooltip>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe('Save');
  });
});

describe('Tooltip — controlled / uncontrolled', () => {
  it('renders the tooltip when defaultOpen=true', () => {
    render(
      <Tooltip content="Hello" defaultOpen>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent('Hello');
  });

  it('renders the tooltip when open={true} (controlled)', () => {
    render(
      <Tooltip content="Hello" open onOpenChange={() => undefined}>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent('Hello');
  });

  it('does not render the tooltip when open={false} (controlled)', () => {
    render(
      <Tooltip content="Hello" open={false} onOpenChange={() => undefined}>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('flips the panel when controlled open prop changes across rerenders', () => {
    const { rerender } = render(
      <Tooltip content="Hello" open={false} onOpenChange={() => undefined}>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    rerender(
      <Tooltip content="Hello" open onOpenChange={() => undefined}>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent('Hello');

    rerender(
      <Tooltip content="Hello" open={false} onOpenChange={() => undefined}>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

describe('Tooltip — empty content', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
  ])('renders trigger with no listeners or aria when content is %s', (_label, value) => {
    render(
      <Tooltip content={value as ReactNode}>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    expect(trigger).not.toHaveAttribute('aria-describedby');
    // No tooltip element should exist no matter what.
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

describe('Tooltip — hover open / close', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // @testing-library/react's asyncWrapper has a setTimeout(0) drain step that
    // only knows how to advance Jest fake timers. Override it to also advance
    // Vitest fake timers so the internal act() wrapper doesn't deadlock.
    configure({
      asyncWrapper: async (cb) => {
        const result = await cb();
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
          vi.advanceTimersByTime(0);
        });
        return result;
      },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    // Restore the default asyncWrapper for all other test suites.
    configure({ asyncWrapper: async (cb) => cb() });
  });

  it('opens after the delay on pointerenter and closes on pointerleave', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <Tooltip content="Hello" delay={400}>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Trigger' });

    await user.hover(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent('Hello');

    await user.unhover(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('cancels the pending open if pointerleave fires before the delay elapses', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <Tooltip content="Hello" delay={400}>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Trigger' });

    await user.hover(trigger);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    await user.unhover(trigger);
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('closes an open tooltip when pointerdown fires anywhere on the document', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <>
        <Tooltip content="Hello" delay={0}>
          <button type="button">Trigger</button>
        </Tooltip>
        <div data-testid="elsewhere">elsewhere</div>
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'Trigger' });

    await user.hover(trigger);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    await user.pointer({ keys: '[MouseLeft>]', target: screen.getByTestId('elsewhere') });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

describe('Tooltip — focus open / close', () => {
  // jsdom 29 implements `:focus-visible` but its "last interaction was keyboard"
  // heuristic flips to false once any prior test has run, so userEvent.tab() in
  // later tests returns `:focus-visible = false` and the production gate would
  // (correctly) suppress the open. To exercise the keyboard-open path
  // deterministically, stub matches(':focus-visible') to true. The gated test
  // below stubs to false instead to exercise the mouse-focus suppression path.
  let originalMatches: typeof Element.prototype.matches;
  function stubFocusVisible(value: boolean) {
    Element.prototype.matches = function (this: Element, selector: string) {
      if (selector === ':focus-visible') return value;
      return originalMatches.call(this, selector);
    };
  }
  beforeEach(() => {
    originalMatches = Element.prototype.matches;
  });
  afterEach(() => {
    Element.prototype.matches = originalMatches;
  });

  it('opens immediately on focus (no delay) when :focus-visible matches', async () => {
    stubFocusVisible(true);
    const user = userEvent.setup();
    render(
      <Tooltip content="Hello" delay={400}>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    await user.tab(); // keyboard focus to the only focusable element
    expect(screen.getByRole('tooltip')).toHaveTextContent('Hello');
  });

  it('does NOT open on focus when :focus-visible does not match (mouse-focus path)', () => {
    stubFocusVisible(false);
    render(
      <Tooltip content="Hello" delay={400}>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    trigger.focus();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('closes on blur', async () => {
    stubFocusVisible(true);
    const user = userEvent.setup();
    render(
      <>
        <Tooltip content="Hello">
          <button type="button">Trigger</button>
        </Tooltip>
        <button type="button">Next</button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.tab();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(
      <Tooltip content="Hello" defaultOpen>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not move focus when Escape closes the tooltip', () => {
    render(
      <Tooltip content="Hello" defaultOpen>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    // Initial render: focus is on document.body — Tooltip never owns focus.
    expect(document.activeElement).not.toBe(trigger);
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    // Still not on the trigger — Tooltip's Escape close must not steal/return focus,
    // unlike DropdownMenu which returns focus to its trigger on Escape.
    expect(document.activeElement).not.toBe(trigger);
  });
});

describe('Tooltip — aria wiring', () => {
  it('sets aria-describedby on the trigger to the tooltip id while open', () => {
    render(
      <Tooltip content="Hello" defaultOpen>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    const tooltip = screen.getByRole('tooltip');
    expect(trigger.getAttribute('aria-describedby')).toBe(tooltip.id);
  });

  it('does not set aria-describedby while closed (and no consumer value)', () => {
    render(
      <Tooltip content="Hello">
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    expect(screen.getByRole('button', { name: 'Trigger' })).not.toHaveAttribute('aria-describedby');
  });

  it('merges a consumer aria-describedby (consumer first), then de-merges on close', () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <Tooltip content="tip" open={open} onOpenChange={setOpen}>
            <button type="button" aria-describedby="hint-1">
              Trigger
            </button>
          </Tooltip>
          <button type="button" onClick={() => setOpen(false)}>
            close
          </button>
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    const tooltipId = screen.getByRole('tooltip').id;
    expect(trigger.getAttribute('aria-describedby')).toBe(`hint-1 ${tooltipId}`);

    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(trigger.getAttribute('aria-describedby')).toBe('hint-1');
  });
});

describe('Tooltip — positioning + arrow', () => {
  beforeEach(() => {
    window.ResizeObserver = class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });

  it('sets data-side on the tooltip panel to the resolved side (default top)', () => {
    render(
      <Tooltip content="Hello" defaultOpen>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    expect(screen.getByRole('tooltip').getAttribute('data-side')).toBe('top');
  });

  it('uses the configured side', () => {
    render(
      <Tooltip content="Hello" side="bottom" defaultOpen>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    expect(screen.getByRole('tooltip').getAttribute('data-side')).toBe('bottom');
  });

  it('renders an arrow element with aria-hidden inside the tooltip panel', () => {
    render(
      <Tooltip content="Hello" defaultOpen>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    const panel = screen.getByRole('tooltip');
    // The arrow is a span with aria-hidden inside the panel.
    const arrow = panel.querySelector('span[aria-hidden="true"]');
    expect(arrow).not.toBeNull();
    // Confirm it's via the SCSS class hook by class membership (not exact name).
    expect((arrow as HTMLElement).className).toMatch(/arrow/);
    // Sanity sweep against document.body (where the portal lives) so the test
    // fails loudly if the arrow ever escapes the panel.
    expect(document.body.querySelector('[role="tooltip"] span[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('Tooltip — animation contract', () => {
  it('the compiled .content rule contains an @starting-style block', () => {
    const scss = readFileSync(resolve(__dirname, './Tooltip.module.scss'), 'utf8');
    // Conservative check: the file contains an @starting-style block
    // nested inside a .content selector. We do not parse the SCSS — a
    // substring match is enough to lock the contract in.
    expect(scss).toMatch(/\.content\s*{[\s\S]*@starting-style/);
  });
});

describe('Tooltip — cleanup + props preservation', () => {
  // Mirror the hover describe's asyncWrapper override so the timer-using
  // tests below don't deadlock inside Testing Library's internal act() drain.
  beforeEach(() => {
    vi.useFakeTimers();
    configure({
      asyncWrapper: async (cb) => {
        const result = await cb();
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
          vi.advanceTimersByTime(0);
        });
        return result;
      },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    configure({ asyncWrapper: async (cb) => cb() });
  });

  it('does not throw when unmounted while a delay timer is pending', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = render(
      <Tooltip content="Hello" delay={400}>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole('button', { name: 'Trigger' }));
    expect(() => unmount()).not.toThrow();
    act(() => {
      vi.advanceTimersByTime(400);
    });
  });

  it('removes document-level listeners on unmount while open', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(
      <Tooltip content="Hello" defaultOpen>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    unmount();
    // Both pointerdown and keydown were registered while open; both should
    // have been removed during unmount cleanup.
    expect(removeSpy.mock.calls.some(([type]) => type === 'pointerdown')).toBe(true);
    expect(removeSpy.mock.calls.some(([type]) => type === 'keydown')).toBe(true);
    removeSpy.mockRestore();
  });

  it('preserves consumer props on the cloned trigger (className, data-*)', () => {
    render(
      <Tooltip content="Hello">
        <button type="button" className="consumer" data-testid="t">
          Trigger
        </button>
      </Tooltip>,
    );
    const trigger = screen.getByTestId('t');
    expect(trigger).toHaveClass('consumer');
  });

  it('fires onOpenChange(true) after the hover delay and onOpenChange(false) on close', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onOpenChange = vi.fn();
    render(
      <Tooltip content="Hello" delay={300} onOpenChange={onOpenChange}>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Trigger' });

    await user.hover(trigger);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onOpenChange).toHaveBeenCalledWith(true);

    await user.unhover(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
