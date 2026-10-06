import { act, configure, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { Tooltip } from '../Tooltip';
import { TOOLTIP_DEFAULT_DELAY } from '../Tooltip/Tooltip';
import { useClippedTooltip } from './useClippedTooltip';

// Tooltip opens after a fixed delay: run it on fake timers (same recipe as
// Tooltip.test.tsx) instead of sleeping. RTL's asyncWrapper only drains Jest
// fake timers, so override it to also advance Vitest's.
function useFakeTooltipTimers() {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
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
}

const setupUser = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

// Elapse the tooltip delay, then return the open tooltip.
function findTooltip() {
  act(() => {
    vi.advanceTimersByTime(TOOLTIP_DEFAULT_DELAY);
  });
  return screen.getByRole('tooltip');
}

// jsdom has no layout: fake the label's box to say whether it is clipped.
function fakeClip(el: HTMLElement, clipped: boolean) {
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: 100 });
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: clipped ? 300 : 100 });
}

function Probe({ label, enabled = true }: { label: ReactNode; enabled?: boolean }) {
  const tip = useClippedTooltip<HTMLSpanElement>(label, enabled);
  return enabled ? (
    <Tooltip content={tip.content} open={tip.open} onOpenChange={tip.onOpenChange}>
      <span ref={tip.ref} data-testid="label">
        {label}
      </span>
    </Tooltip>
  ) : (
    <span data-testid="label">{label}</span>
  );
}

describe('useClippedTooltip', () => {
  useFakeTooltipTimers();
  it('opens on hover only when the label is clipped', async () => {
    const user = setupUser();
    render(<Probe label="A very long stage name" />);
    const label = screen.getByTestId('label');
    fakeClip(label, false);
    await user.hover(label);
    expect(screen.queryByRole('tooltip')).toBeNull();
    await user.unhover(label);
    fakeClip(label, true);
    await user.hover(label);
    expect(findTooltip()).toHaveTextContent('A very long stage name');
  });

  it('shows plain text for a non-string label', async () => {
    const user = setupUser();
    render(<Probe label={<b>Bold stage</b>} />);
    const label = screen.getByTestId('label');
    fakeClip(label, true);
    await user.hover(label);
    const tip = findTooltip();
    expect(tip).toHaveTextContent('Bold stage');
    expect(tip.querySelector('b')).toBeNull();
  });

  it('does not remount already open after being disabled while open', async () => {
    const user = setupUser();
    const { rerender } = render(<Probe label="A very long stage name" />);
    const label = screen.getByTestId('label');
    fakeClip(label, true);
    await user.hover(label);
    expect(findTooltip()).toBeInTheDocument();
    rerender(<Probe label="A very long stage name" enabled={false} />);
    rerender(<Probe label="A very long stage name" />);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
