import { render } from '@testing-library/react';
import { createRef } from 'react';
import { Select } from './Select';

describe('Select — Phase 1 scaffold', () => {
  it('renders an empty root div with the data-select marker', () => {
    const { container } = render(<Select />);
    const root = container.firstChild as HTMLElement;
    expect(root).toBeInstanceOf(HTMLDivElement);
    expect(root).toHaveAttribute('data-select', '');
  });

  it('forwards refs to the underlying div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Select ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges the className prop (does not replace the internal class)', () => {
    const { container } = render(<Select className="external" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/external/);
    expect(root.className).toMatch(/root/);
  });
});
