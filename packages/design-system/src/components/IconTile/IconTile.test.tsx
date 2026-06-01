import { render } from '@testing-library/react';
import { createRef } from 'react';
import { IconTile } from './IconTile';

describe('IconTile', () => {
  it('renders the icon inside a <span>', () => {
    const { container } = render(<IconTile icon={<svg data-testid="icon" />} />);
    expect(container.firstChild?.nodeName).toBe('SPAN');
    expect(container.querySelector('[data-testid="icon"]')).toBeInTheDocument();
  });

  it('defaults to size md, square shape, slate color', () => {
    const { container } = render(<IconTile icon={<svg />} />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/size-md/);
    expect(el.className).toMatch(/shape-square/);
    expect(el.style.getPropertyValue('--icon-tile-bg')).toBe('var(--color-palette-slate-bg)');
    expect(el.style.getPropertyValue('--icon-tile-fg')).toBe('var(--color-palette-slate-fg)');
  });

  it('applies size + shape classes', () => {
    const { container, rerender } = render(<IconTile icon={<svg />} size="sm" shape="circle" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-sm/);
    expect((container.firstChild as HTMLElement).className).toMatch(/shape-circle/);
    rerender(<IconTile icon={<svg />} size="lg" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-lg/);
  });

  it('color sets the palette CSS vars', () => {
    const { container } = render(<IconTile icon={<svg />} color="blue" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--icon-tile-bg')).toBe('var(--color-palette-blue-bg)');
    expect(el.style.getPropertyValue('--icon-tile-fg')).toBe('var(--color-palette-blue-fg)');
  });

  it('is decorative by default (aria-hidden, no role)', () => {
    const { container } = render(<IconTile icon={<svg />} />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstChild).not.toHaveAttribute('role');
  });

  it('label promotes it to a labelled image', () => {
    const { container } = render(<IconTile icon={<svg />} label="Pending invite" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute('role', 'img');
    expect(el).toHaveAttribute('aria-label', 'Pending invite');
    expect(el).not.toHaveAttribute('aria-hidden');
  });

  it('forwards ref to the span', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<IconTile icon={<svg />} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it('empty label is still decorative (aria-hidden, no role)', () => {
    const { container } = render(<IconTile icon={<svg />} label="" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstChild).not.toHaveAttribute('role');
  });

  it('Pattern A — consumer-supplied a11y attr via rest wins over component default', () => {
    // No label → default is aria-hidden. Consumer passes role="presentation"
    // which spreads last via {...rest} and wins (Pattern A contract).
    const { container } = render(<IconTile icon={<svg />} role="presentation" />);
    expect(container.firstChild).toHaveAttribute('role', 'presentation');
  });

  it('merges className + consumer style, spreads other attrs', () => {
    const { container } = render(
      <IconTile
        icon={<svg />}
        color="blue"
        className="my-cls"
        style={{ opacity: 0.5 }}
        data-foo="bar"
      />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/my-cls/);
    expect(el.style.opacity).toBe('0.5');
    expect(el.style.getPropertyValue('--icon-tile-bg')).toBe('var(--color-palette-blue-bg)');
    expect(el).toHaveAttribute('data-foo', 'bar');
  });
});
