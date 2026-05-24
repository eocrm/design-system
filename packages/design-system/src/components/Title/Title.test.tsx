import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import {
  Title,
  type TitleOrder,
  type TitleSize,
  type TitleTone,
  type TitleWeight,
} from './Title';

describe('Title', () => {
  it('renders its children', () => {
    render(<Title order={1}>Hello</Title>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it.each<[TitleOrder, string]>([
    [1, 'H1'],
    [2, 'H2'],
    [3, 'H3'],
    [4, 'H4'],
    [5, 'H5'],
    [6, 'H6'],
  ])('order=%i renders a %s element', (order, tag) => {
    const { container } = render(<Title order={order}>x</Title>);
    expect(container.firstElementChild!.tagName).toBe(tag);
  });

  it.each<[TitleOrder, string]>([
    [1, /size3xl/.source],
    [2, /size2xl/.source],
    [3, /sizeXl/.source],
    [4, /sizeLg/.source],
    [5, /sizeMd/.source],
    [6, /sizeSm/.source],
  ])('order=%i defaults to its mapped size class (%s)', (order, classMatch) => {
    const { container } = render(<Title order={order}>x</Title>);
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(classMatch));
  });

  it('explicit size overrides the order-derived size', () => {
    const { container } = render(
      <Title order={1} size="xs">
        x
      </Title>,
    );
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toMatch(/sizeXs/);
    expect(cls).not.toMatch(/size3xl/);
  });

  it.each<TitleTone>(['default', 'muted', 'subtle', 'accent', 'danger'])(
    'tone="%s" applies the matching tone class',
    (tone) => {
      const { container } = render(
        <Title order={3} tone={tone}>
          x
        </Title>,
      );
      const cap = tone[0].toUpperCase() + tone.slice(1);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`tone${cap}`));
    },
  );

  it.each<TitleWeight>(['regular', 'medium', 'semibold', 'bold'])(
    'weight="%s" applies the matching weight class',
    (weight) => {
      const { container } = render(
        <Title order={3} weight={weight}>
          x
        </Title>,
      );
      const cap = weight[0].toUpperCase() + weight.slice(1);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`weight${cap}`));
    },
  );

  it('truncate adds the truncate class', () => {
    const { container } = render(
      <Title order={2} truncate>
        x
      </Title>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/truncate/);
  });

  it('omitting truncate does NOT add the truncate class', () => {
    const { container } = render(<Title order={2}>x</Title>);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/truncate/);
  });

  it('className from props merges with the base class (not replace)', () => {
    const { container } = render(
      <Title order={3} className="custom">
        x
      </Title>,
    );
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toMatch(/custom/);
    expect(cls).toMatch(/title/);
  });

  it('forwards ref to the underlying heading element', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(
      <Title order={2} ref={ref}>
        x
      </Title>,
    );
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    expect(ref.current?.tagName).toBe('H2');
  });

  it('spreads native HTML attributes to the heading element', () => {
    render(
      <Title order={3} id="page-heading" data-testid="t" aria-label="ariaLabel">
        x
      </Title>,
    );
    const el = screen.getByTestId('t');
    expect(el).toHaveAttribute('id', 'page-heading');
    expect(el).toHaveAttribute('aria-label', 'ariaLabel');
  });

  it<{ size: TitleSize }>('every size token maps to a class (smoke test)', () => {
    const sizes: TitleSize[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];
    sizes.forEach((size) => {
      const { container } = render(
        <Title order={3} size={size}>
          x
        </Title>,
      );
      const cap = size === '2xl' || size === '3xl' ? size : size[0].toUpperCase() + size.slice(1);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`size${cap}`));
    });
  });
});
