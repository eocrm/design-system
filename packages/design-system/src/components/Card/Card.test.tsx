import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Card, type CardPadding } from './Card';

describe('Card', () => {
  it('renders its children', () => {
    render(<Card>Body content</Card>);
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('defaults to padding="md"', () => {
    const { container } = render(<Card>x</Card>);
    expect((container.firstChild as HTMLElement).className).toMatch(/paddingMd/);
  });

  it.each<CardPadding>(['none', 'sm', 'md', 'lg'])(
    'applies the %s padding class',
    (padding) => {
      const { container } = render(<Card padding={padding}>x</Card>);
      const cap = padding[0].toUpperCase() + padding.slice(1);
      expect((container.firstChild as HTMLElement).className).toMatch(
        new RegExp(`padding${cap}`),
      );
    },
  );

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
});
