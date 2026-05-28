import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Kbd } from './Kbd';
import styles from './Kbd.module.scss';

describe('Kbd', () => {
  it('renders one <kbd> per key', () => {
    render(<Kbd keys={['Ctrl', 'Shift', 'P']} />);
    const kbds = screen.getAllByText(/Ctrl|Shift|P/);
    // Three <kbd> matches expected
    expect(kbds.filter((el) => el.tagName === 'KBD')).toHaveLength(3);
  });

  it('renders n-1 separators for n keys', () => {
    const { container } = render(<Kbd keys={['Ctrl', 'Shift', 'P']} />);
    const separators = container.querySelectorAll(`.${styles.separator}`);
    expect(separators).toHaveLength(2);
    separators.forEach((sep) => expect(sep.textContent).toBe('+'));
  });

  it('renders no separator for a single key', () => {
    const { container } = render(<Kbd keys={['Esc']} />);
    expect(container.querySelectorAll(`.${styles.separator}`)).toHaveLength(0);
  });

  it('defaults size to sm', () => {
    const { container } = render(<Kbd keys={['K']} />);
    expect(container.firstChild).toHaveClass(styles.kbdSizeSm);
  });

  it('applies kbdSizeMd when size="md"', () => {
    const { container } = render(<Kbd keys={['K']} size="md" />);
    expect(container.firstChild).toHaveClass(styles.kbdSizeMd);
    expect(container.firstChild).not.toHaveClass(styles.kbdSizeSm);
  });

  it('defaults aria-label to keys.join(" + ")', () => {
    render(<Kbd keys={['⌘', 'K']} />);
    expect(screen.getByLabelText('⌘ + K')).toBeInTheDocument();
  });

  it('uses custom aria-label when provided', () => {
    render(<Kbd keys={['⌘', 'K']} aria-label="Open command palette" />);
    expect(screen.getByLabelText('Open command palette')).toBeInTheDocument();
    expect(screen.queryByLabelText('⌘ + K')).not.toBeInTheDocument();
  });

  it('marks inner <kbd> elements aria-hidden', () => {
    const { container } = render(<Kbd keys={['⌘', 'K']} />);
    container.querySelectorAll('kbd').forEach((kbd) => {
      expect(kbd).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('marks the separator aria-hidden', () => {
    const { container } = render(<Kbd keys={['⌘', 'K']} />);
    const separator = container.querySelector(`.${styles.separator}`);
    expect(separator).toHaveAttribute('aria-hidden', 'true');
  });

  it('forwards ref to the wrapper span', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Kbd ref={ref} keys={['K']} />);
    expect(ref.current?.tagName).toBe('SPAN');
    expect(ref.current).toHaveClass(styles.kbd);
  });

  it('merges className with the base class', () => {
    const { container } = render(<Kbd keys={['K']} className="extra-class" />);
    expect(container.firstChild).toHaveClass(styles.kbd);
    expect(container.firstChild).toHaveClass('extra-class');
  });

  it('renders the wrapper as a <span> (inline flow)', () => {
    const { container } = render(<Kbd keys={['K']} />);
    expect(container.firstChild?.nodeName).toBe('SPAN');
  });
});
