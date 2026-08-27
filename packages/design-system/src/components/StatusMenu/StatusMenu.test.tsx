import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { StatusMenu, type StatusMenuStatus } from './StatusMenu';

beforeEach(() => {
  window.ResizeObserver = class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const toDo: StatusMenuStatus = { id: 1, name: 'To do', category: 'to_do' };
const inProgress: StatusMenuStatus = { id: 2, name: 'In progress', category: 'in_progress' };
const done: StatusMenuStatus = { id: 3, name: 'Done', category: 'done' };
const options: StatusMenuStatus[] = [toDo, inProgress, done];

describe('StatusMenu — color resolution', () => {
  it('renders a trigger button with the current status name', () => {
    render(<StatusMenu current={inProgress} options={options} />);
    expect(screen.getByRole('button', { name: /In progress/ })).toBeInTheDocument();
  });

  it('maps category="in_progress" to the blue palette color', () => {
    render(<StatusMenu current={inProgress} options={options} />);
    const trigger = screen.getByRole('button');
    expect(trigger.style.getPropertyValue('--status-menu-bg')).toBe('var(--color-palette-blue-bg)');
    expect(trigger.style.getPropertyValue('--status-menu-fg')).toBe('var(--color-palette-blue-fg)');
  });

  it('an explicit color wins over category', () => {
    render(<StatusMenu current={{ ...inProgress, color: 'purple' }} options={options} />);
    const trigger = screen.getByRole('button');
    expect(trigger.style.getPropertyValue('--status-menu-bg')).toBe(
      'var(--color-palette-purple-bg)',
    );
  });

  it('falls back to slate with no category and no color', () => {
    render(<StatusMenu current={{ id: 9, name: 'Mystery' }} options={options} />);
    const trigger = screen.getByRole('button');
    expect(trigger.style.getPropertyValue('--status-menu-bg')).toBe(
      'var(--color-palette-slate-bg)',
    );
  });
});

describe('StatusMenu — interactive mode', () => {
  it('opens the menu on click and renders every option as a menuitem with its own color', async () => {
    const user = userEvent.setup();
    render(<StatusMenu current={toDo} options={options} />);
    await user.click(screen.getByRole('button'));
    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(3);
    expect(items[1].style.getPropertyValue('--status-menu-bg')).toBe(
      'var(--color-palette-blue-bg)',
    );
  });

  it('clicking an option fires onSelect with the option id and closes the menu', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<StatusMenu current={toDo} options={options} onSelect={onSelect} />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('menuitem', { name: 'Done' }));
    expect(onSelect).toHaveBeenCalledWith(3);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('ArrowDown then Enter selects the highlighted option', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<StatusMenu current={toDo} options={options} onSelect={onSelect} />);
    const trigger = screen.getByRole('button');
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('disabled trigger is disabled and does not open on click', async () => {
    const user = userEvent.setup();
    render(<StatusMenu current={toDo} options={options} disabled />);
    const trigger = screen.getByRole('button');
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('does not reopen when busy clears after forcing an open menu closed', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<StatusMenu current={toDo} options={options} />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    rerender(<StatusMenu current={toDo} options={options} busy />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    rerender(<StatusMenu current={toDo} options={options} busy={false} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('busy trigger gets aria-busy and is disabled', () => {
    render(<StatusMenu current={toDo} options={options} busy />);
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-busy', 'true');
    expect(trigger).toBeDisabled();
  });

  it('aria-label uses the i18n change-status string with the current name', () => {
    render(<StatusMenu current={inProgress} options={options} />);
    expect(screen.getByRole('button', { name: 'Change status: In progress' })).toBeInTheDocument();
  });

  it('forwards ref to the trigger button', () => {
    const ref = createRef<HTMLElement>();
    render(<StatusMenu current={toDo} options={options} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('merges className with the internal trigger class', () => {
    render(<StatusMenu current={toDo} options={options} className="external" />);
    const trigger = screen.getByRole('button');
    expect(trigger.className).toMatch(/external/);
  });
});

describe('StatusMenu — read-only mode', () => {
  it('renders a plain span (no button role, no aria-haspopup) when options is omitted', () => {
    render(<StatusMenu current={done} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const chip = screen.getByText('Done');
    expect(chip.tagName).toBe('SPAN');
    expect(chip).not.toHaveAttribute('aria-haspopup');
  });

  it('renders a plain span when options is an empty array', () => {
    render(<StatusMenu current={done} options={[]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Done').tagName).toBe('SPAN');
  });

  it('still applies the resolved color to the read-only chip', () => {
    render(<StatusMenu current={done} />);
    const chip = screen.getByText('Done');
    expect(chip.style.getPropertyValue('--status-menu-bg')).toBe('var(--color-palette-green-bg)');
  });

  it('forwards ref to the span in read-only mode', () => {
    const ref = createRef<HTMLElement>();
    render(<StatusMenu current={done} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it('merges className with the internal chip class', () => {
    render(<StatusMenu current={done} className="external" />);
    expect(screen.getByText('Done').className).toMatch(/external/);
  });
});

describe('busy state reaches assistive tech (#488)', () => {
  it('announces from a live region rather than aria-busy alone', () => {
    const { rerender, container } = render(
      <StatusMenu current={inProgress} options={options} busy={false} />,
    );
    const region = container.querySelector('[role="status"][aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region!.textContent).toBe('');
    rerender(<StatusMenu current={inProgress} options={options} busy />);
    expect(region!.textContent).toBe('Saving status…');
  });

  it('leaves the trigger name alone while busy', () => {
    const { rerender, getByRole } = render(
      <StatusMenu current={inProgress} options={options} busy={false} />,
    );
    expect(getByRole('button', { name: 'Change status: In progress' })).not.toBeNull();
    rerender(<StatusMenu current={inProgress} options={options} busy />);
    expect(getByRole('button', { name: 'Change status: In progress' })).not.toBeNull();
  });

  it('keeps the region OUTSIDE the trigger', () => {
    // The by-name assertion above cannot catch StatusMenu's actual bug. The
    // trigger sets an explicit aria-label, which wins over name-from-content,
    // so its name is invariant to anything nested inside it — the name test
    // passes with the region back in the button. StatusMenu's failure mode is
    // PRUNING, not renaming: `button` is children-presentational in ARIA, so a
    // region nested in it is spec'd to be dropped. That has to be asserted
    // structurally.
    const { container, getByRole } = render(
      <StatusMenu current={inProgress} options={options} busy />,
    );
    expect(getByRole('button').querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });
});
