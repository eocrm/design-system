import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Divider } from './Divider';

describe('<Divider>', () => {
  // ─── Element + ARIA ────────────────────────────────────────────────────

  it('renders an <hr> when no children', () => {
    const { container } = render(<Divider />);
    expect(container.querySelector('hr')).toBeInTheDocument();
    expect(container.querySelector('div[role="separator"]')).toBeNull();
  });

  it('renders a <div role="separator"> when children present', () => {
    const { container } = render(<Divider>OR</Divider>);
    expect(container.querySelector('hr')).toBeNull();
    expect(container.querySelector('div[role="separator"]')).toBeInTheDocument();
  });

  it('always has role="separator"', () => {
    render(<Divider />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('aria-orientation defaults to "horizontal"', () => {
    render(<Divider />);
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('aria-orientation="vertical" when orientation="vertical"', () => {
    render(<Divider orientation="vertical" />);
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
  });

  // ─── Variants + sizes (classes) ────────────────────────────────────────

  it('default: applies horizontal class, no dashed/sizeMd/sizeLg', () => {
    render(<Divider />);
    const sep = screen.getByRole('separator');
    expect(sep.className).toMatch(/horizontal/);
    expect(sep.className).not.toMatch(/dashed/);
    expect(sep.className).not.toMatch(/sizeMd/);
    expect(sep.className).not.toMatch(/sizeLg/);
  });

  it('variant="dashed" applies the dashed class', () => {
    render(<Divider variant="dashed" />);
    expect(screen.getByRole('separator').className).toMatch(/dashed/);
  });

  it('size="md" applies the sizeMd class', () => {
    render(<Divider size="md" />);
    expect(screen.getByRole('separator').className).toMatch(/sizeMd/);
  });

  it('size="lg" applies the sizeLg class', () => {
    render(<Divider size="lg" />);
    expect(screen.getByRole('separator').className).toMatch(/sizeLg/);
  });

  // ─── Label slot ────────────────────────────────────────────────────────

  it('children render inside the .label span', () => {
    render(<Divider>OR</Divider>);
    expect(screen.getByText('OR')).toBeInTheDocument();
  });

  it('labeled divider has two .line spans flanking the label', () => {
    const { container } = render(<Divider>OR</Divider>);
    const lines = container.querySelectorAll('span[aria-hidden="true"]');
    expect(lines).toHaveLength(2);
  });

  it('the .line spans have aria-hidden="true"', () => {
    const { container } = render(<Divider>OR</Divider>);
    const lines = container.querySelectorAll('span[aria-hidden="true"]');
    lines.forEach((line) => {
      expect(line).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // ─── Misc ──────────────────────────────────────────────────────────────

  it('className merges, does not replace', () => {
    render(<Divider className="custom" />);
    const sep = screen.getByRole('separator');
    expect(sep.className).toMatch(/divider/);
    expect(sep.className).toMatch(/custom/);
  });

  it('ref forwards to the <hr> root (no children case)', () => {
    const ref = createRef<HTMLElement>();
    render(<Divider ref={ref} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('HR');
  });

  it('ref forwards to the <div> root (labeled case)', () => {
    const ref = createRef<HTMLElement>();
    render(<Divider ref={ref}>OR</Divider>);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('DIV');
  });
});
