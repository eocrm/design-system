import { render } from '@testing-library/react';
import { createRef } from 'react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders a span by default', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild?.nodeName).toBe('SPAN');
  });

  it('default variant is text — applies the text class + height defaults to 1em', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/variant-text/);
    expect(el.style.height).toBe('1em');
  });

  it('variant="circular" — when only width is set, height matches (square)', () => {
    const { container } = render(<Skeleton variant="circular" width={32} />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/variant-circular/);
    expect(el.style.width).toBe('32px');
    expect(el.style.height).toBe('32px');
  });

  it('variant="circular" — when only height is set, width matches (square)', () => {
    const { container } = render(<Skeleton variant="circular" height={40} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('40px');
    expect(el.style.height).toBe('40px');
  });

  it('variant="rectangular" — applies the rectangular class, no default height', () => {
    const { container } = render(<Skeleton variant="rectangular" width={120} height={32} />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/variant-rectangular/);
    expect(el.style.width).toBe('120px');
    expect(el.style.height).toBe('32px');
  });

  it('numeric dimensions become `px`; string dimensions pass through as-is', () => {
    const { container } = render(<Skeleton width={50} height="60%" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('50px');
    expect(el.style.height).toBe('60%');
  });

  it('animation="pulse" (default) applies the pulse class', () => {
    const { container } = render(<Skeleton />);
    expect((container.firstChild as HTMLElement).className).toMatch(/pulse/);
  });

  it('animation="none" — no pulse class', () => {
    const { container } = render(<Skeleton animation="none" />);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/pulse/);
  });

  it('aria-hidden="true" by default; consumer can override', () => {
    const { container, rerender } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    rerender(<Skeleton aria-hidden="false" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'false');
  });

  it('forwards ref to the root element', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Skeleton ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it('merges className without replacing', () => {
    const { container } = render(<Skeleton className="my-cls" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/my-cls/);
    expect(el.className).toMatch(/skeleton/);
  });

  it('consumer style is merged into inline style', () => {
    const { container } = render(<Skeleton width={100} style={{ marginTop: 4 }} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('100px');
    expect(el.style.marginTop).toBe('4px');
  });
});
