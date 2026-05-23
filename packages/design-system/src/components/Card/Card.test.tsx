import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Card, type CardPadding, type CardTone } from './Card';

describe('Card', () => {
  it('renders its children', () => {
    render(<Card>Body content</Card>);
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('defaults to padding="md"', () => {
    const { container } = render(<Card>x</Card>);
    expect((container.firstChild as HTMLElement).className).toMatch(/paddingMd/);
  });

  it.each<CardPadding>(['none', 'sm', 'md', 'lg'])('applies the %s padding class', (padding) => {
    const { container } = render(<Card padding={padding}>x</Card>);
    const cap = padding[0].toUpperCase() + padding.slice(1);
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`padding${cap}`));
  });

  it('merges the className prop', () => {
    const { container } = render(<Card className="external">x</Card>);
    expect((container.firstChild as HTMLElement).className).toMatch(/external/);
    expect((container.firstChild as HTMLElement).className).toMatch(/card/);
  });

  it('forwards refs to the underlying div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref}>x</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('no tone prop: data-tone attribute is not set', () => {
    const { container } = render(<Card>x</Card>);
    expect(container.firstElementChild).not.toHaveAttribute('data-tone');
  });

  it.each(['accent', 'info', 'success', 'warning', 'danger'] as const)(
    'tone="%s" sets data-tone="%s"',
    (tone: CardTone) => {
      const { container } = render(<Card tone={tone}>x</Card>);
      expect(container.firstElementChild).toHaveAttribute('data-tone', tone);
    },
  );

  it('tone composes with padding without affecting either', () => {
    const { container } = render(<Card padding="lg" tone="success">x</Card>);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute('data-tone', 'success');
    expect(root.className).toMatch(/padding/);
  });

  it('tone="accent" with custom className merges (does not replace)', () => {
    const { container } = render(<Card tone="accent" className="custom">x</Card>);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute('data-tone', 'accent');
    expect(root.className).toMatch(/custom/);
  });
});
