import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { VisuallyHidden } from './VisuallyHidden';

describe('<VisuallyHidden>', () => {
  it('renders a span by default with its text in the accessibility tree', () => {
    render(<VisuallyHidden>Opens in a new tab</VisuallyHidden>);
    const el = screen.getByText('Opens in a new tab');
    expect(el.tagName).toBe('SPAN');
    expect(el).not.toHaveAttribute('aria-hidden');
  });

  it('as="div" renders a div', () => {
    render(<VisuallyHidden as="div">x</VisuallyHidden>);
    expect(screen.getByText('x').tagName).toBe('DIV');
  });

  it('forwards ref, merges className, spreads props', () => {
    const ref = createRef<HTMLElement>();
    render(
      <VisuallyHidden ref={ref} className="extra" id="vh" data-x="1">
        x
      </VisuallyHidden>,
    );
    const el = screen.getByText('x');
    expect(ref.current).toBe(el);
    expect(el).toHaveClass('extra');
    expect(el.className.split(' ').length).toBeGreaterThan(1);
    expect(el).toHaveAttribute('id', 'vh');
    expect(el).toHaveAttribute('data-x', '1');
  });
});
