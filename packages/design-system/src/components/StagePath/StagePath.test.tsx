import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StagePath, type StagePathStage } from './StagePath';

const STAGES: StagePathStage[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'negotiation', label: 'Negotiation' },
];

function fakeClip(el: HTMLElement, clipped: boolean) {
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: 100 });
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: clipped ? 300 : 100 });
}

describe('<StagePath>', () => {
  it('renders an ordered list with one item per stage', () => {
    render(<StagePath aria-label="Deal stage" stages={STAGES} value="proposal" />);
    const list = screen.getByRole('list', { name: 'Deal stage' });
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
  });

  it('derives done / current / upcoming from value', () => {
    render(<StagePath stages={STAGES} value="proposal" />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('data-state', 'done');
    expect(items[1]).toHaveAttribute('data-state', 'done');
    expect(items[2]).toHaveAttribute('data-state', 'current');
    expect(items[2]).toHaveAttribute('aria-current', 'step');
    expect(items[3]).toHaveAttribute('data-state', 'upcoming');
    expect(items.filter((li) => li.hasAttribute('aria-current'))).toHaveLength(1);
  });

  it('speaks done and upcoming state as hidden text, not colour alone', () => {
    render(<StagePath stages={STAGES} value="proposal" />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Lead, completed');
    expect(items[2]).toHaveTextContent(/^Proposal$/);
    expect(items[3]).toHaveTextContent('Negotiation, upcoming');
  });

  it.each(['default', 'success', 'danger'] as const)('tone="%s" sets data-tone', (tone) => {
    render(<StagePath stages={STAGES} value="lead" tone={tone} />);
    expect(screen.getByRole('list')).toHaveAttribute('data-tone', tone);
  });

  it('defaults tone to "default"', () => {
    render(<StagePath stages={STAGES} value="lead" />);
    expect(screen.getByRole('list')).toHaveAttribute('data-tone', 'default');
  });

  it('is read-only without onStageChange: no buttons', () => {
    render(<StagePath stages={STAGES} value="proposal" />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('with onStageChange, every non-current stage is a button that reports its id', async () => {
    const user = userEvent.setup();
    const onStageChange = vi.fn();
    render(<StagePath stages={STAGES} value="proposal" onStageChange={onStageChange} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /Proposal/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Lead, completed' }));
    expect(onStageChange).toHaveBeenLastCalledWith('lead');
    screen.getByRole('button', { name: 'Negotiation, upcoming' }).focus();
    await user.keyboard('{Enter}');
    expect(onStageChange).toHaveBeenLastCalledWith('negotiation');
    expect(onStageChange).toHaveBeenCalledTimes(2);
  });

  it('keeps keyboard focus in the list when the activated stage becomes current', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <StagePath stages={STAGES} value="proposal" onStageChange={() => {}} />,
    );
    screen.getByRole('button', { name: 'Negotiation, upcoming' }).focus();
    await user.keyboard('{Enter}');
    rerender(<StagePath stages={STAGES} value="negotiation" onStageChange={() => {}} />);
    const current = screen.getAllByRole('listitem')[3].querySelector('span[tabindex="-1"]');
    expect(current).not.toBeNull();
    expect(document.activeElement).toBe(current);
  });

  it('does not steal focus from outside the list when value changes', async () => {
    const { rerender } = render(
      <>
        <button type="button">Won</button>
        <StagePath stages={STAGES} value="proposal" onStageChange={() => {}} />
      </>,
    );
    const won = screen.getByRole('button', { name: 'Won' });
    won.focus();
    rerender(
      <>
        <button type="button">Won</button>
        <StagePath stages={STAGES} value="negotiation" onStageChange={() => {}} />
      </>,
    );
    expect(document.activeElement).toBe(won);
  });

  it('the current stage is a tabIndex=-1 span, not a button (never a Tab stop)', () => {
    render(<StagePath stages={STAGES} value="proposal" onStageChange={() => {}} />);
    const items = screen.getAllByRole('listitem');
    expect(within(items[2]).queryByRole('button')).toBeNull();
    const span = items[2].querySelector('span[tabindex]');
    expect(span?.tagName).toBe('SPAN');
    expect(span).toHaveAttribute('tabindex', '-1');
  });

  it('stage buttons are type="button" (never submit an enclosing form)', () => {
    render(<StagePath stages={STAGES} value="lead" onStageChange={() => {}} />);
    for (const b of screen.getAllByRole('button')) expect(b).toHaveAttribute('type', 'button');
  });

  it('unknown value: every stage upcoming, warns once per value, does not throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = render(<StagePath stages={STAGES} value="lead" />);
    expect(warn).not.toHaveBeenCalled();
    rerender(<StagePath stages={STAGES} value="ghost" />);
    rerender(<StagePath stages={STAGES} value="ghost" />);
    for (const li of screen.getAllByRole('listitem')) {
      expect(li).toHaveAttribute('data-state', 'upcoming');
      expect(li).not.toHaveAttribute('aria-current');
    }
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('ghost');
    warn.mockRestore();
  });

  it('forwards ref to the <ol> and merges className', () => {
    const ref = createRef<HTMLOListElement>();
    render(<StagePath ref={ref} className="mine" stages={STAGES} value="lead" />);
    expect(ref.current?.tagName).toBe('OL');
    expect(ref.current).toHaveClass('mine');
    expect(ref.current?.className.split(' ').length).toBeGreaterThan(1);
  });

  it('shows the full label in a tooltip when it is clipped, and not otherwise', async () => {
    const user = userEvent.setup();
    render(<StagePath stages={STAGES} value="lead" />);
    const label = screen.getByText('Negotiation');
    fakeClip(label, false);
    await user.hover(label);
    expect(screen.queryByRole('tooltip')).toBeNull();
    await user.unhover(label);
    fakeClip(label, true);
    await user.hover(label);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Negotiation');
  });

  it('clipped ReactNode label tooltips as plain text', async () => {
    const user = userEvent.setup();
    render(<StagePath stages={[{ id: 'a', label: <b>Bold stage</b> }]} value="a" />);
    const label = screen.getByText('Bold stage').parentElement!;
    fakeClip(label, true);
    await user.hover(label);
    const tip = await screen.findByRole('tooltip');
    expect(tip).toHaveTextContent('Bold stage');
    expect(tip.querySelector('b')).toBeNull();
  });
});
