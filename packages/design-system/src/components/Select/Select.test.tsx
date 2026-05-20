import { render, screen } from '@testing-library/react';
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
