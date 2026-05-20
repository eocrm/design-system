import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Select, type SelectOption } from './Select';
import styles from './Select.module.scss';

const STATUSES: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'archived', label: 'Archived' },
];

describe('Select — Phase 1 scaffold', () => {
  it('forwards refs to the underlying div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Select ref={ref} options={STATUSES} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges the className prop (does not replace the internal class)', () => {
    const { container } = render(<Select options={STATUSES} className="external" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('external');
    expect(root.className).toContain(styles.root);
  });
});

describe('Select — single, non-searchable, sync', () => {
  it('renders a button trigger with placeholder when no value', () => {
    render(<Select options={STATUSES} placeholder="Pick one" />);
    expect(screen.getByRole('button')).toHaveTextContent('Pick one');
  });

  it('renders the selected label when value is set', () => {
    render(<Select options={STATUSES} value="pending" />);
    expect(screen.getByRole('button')).toHaveTextContent('Pending');
  });
});

describe('Select — open/close', () => {
  it('opens the listbox on trigger click', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} placeholder="Pick" />);
    expect(screen.queryByRole('listbox')).toBeNull();
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
  });

  it('listbox renders in a portal at document.body level', async () => {
    const user = userEvent.setup();
    const { container } = render(<Select options={STATUSES} />);
    await user.click(screen.getByRole('button'));
    const listbox = screen.getByRole('listbox');
    expect(container.contains(listbox)).toBe(false);
  });

  it('closes on second click of trigger', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    const trigger = screen.getByRole('button');
    await user.click(trigger);
    expect(screen.queryByRole('listbox')).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('aria-expanded reflects open state', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('aria-controls points at the listbox id when open', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    const trigger = screen.getByRole('button');
    await user.click(trigger);
    const listbox = screen.getByRole('listbox');
    expect(trigger.getAttribute('aria-controls')).toBe(listbox.id);
  });
});
