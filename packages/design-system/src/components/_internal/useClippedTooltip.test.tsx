// useClippedTooltip.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { Tooltip } from '../Tooltip';
import { useClippedTooltip } from './useClippedTooltip';

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
  it('opens on hover only when the label is clipped', async () => {
    const user = userEvent.setup();
    render(<Probe label="A very long stage name" />);
    const label = screen.getByTestId('label');
    fakeClip(label, false);
    await user.hover(label);
    expect(screen.queryByRole('tooltip')).toBeNull();
    await user.unhover(label);
    fakeClip(label, true);
    await user.hover(label);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('A very long stage name');
  });

  it('shows plain text for a non-string label', async () => {
    const user = userEvent.setup();
    render(<Probe label={<b>Bold stage</b>} />);
    const label = screen.getByTestId('label');
    fakeClip(label, true);
    await user.hover(label);
    const tip = await screen.findByRole('tooltip');
    expect(tip).toHaveTextContent('Bold stage');
    expect(tip.querySelector('b')).toBeNull();
  });

  it('does not remount already open after being disabled while open', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Probe label="A very long stage name" />);
    const label = screen.getByTestId('label');
    fakeClip(label, true);
    await user.hover(label);
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    rerender(<Probe label="A very long stage name" enabled={false} />);
    rerender(<Probe label="A very long stage name" />);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
