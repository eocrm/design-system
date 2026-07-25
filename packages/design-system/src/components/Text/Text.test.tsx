import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import {
  Text,
  type TextAlign,
  type TextAs,
  type TextSize,
  type TextTone,
  type TextWeight,
} from './Text';

describe('Text', () => {
  it('renders its children', () => {
    render(<Text>Hello body</Text>);
    expect(screen.getByText('Hello body')).toBeInTheDocument();
  });

  it('defaults to a <p> element', () => {
    const { container } = render(<Text>x</Text>);
    expect(container.firstElementChild!.tagName).toBe('P');
  });

  it.each<[TextAs, string]>([
    ['p', 'P'],
    ['span', 'SPAN'],
    ['div', 'DIV'],
    ['label', 'LABEL'],
  ])('as="%s" renders a %s element', (asValue, tag) => {
    const { container } = render(<Text as={asValue}>x</Text>);
    expect(container.firstElementChild!.tagName).toBe(tag);
  });

  it('defaults to size="md"', () => {
    const { container } = render(<Text>x</Text>);
    expect((container.firstChild as HTMLElement).className).toMatch(/sizeMd/);
  });

  it.each<[TextSize, string]>([
    ['xs', 'sizeXs'],
    ['sm', 'sizeSm'],
    ['md', 'sizeMd'],
    ['lg', 'sizeLg'],
    ['xl', 'sizeXl'],
  ])('size="%s" applies class %s', (size, expectedClass) => {
    const { container } = render(<Text size={size}>x</Text>);
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(expectedClass));
  });

  it('defaults to tone="default" when no tone prop is supplied', () => {
    const { container } = render(<Text>x</Text>);
    expect((container.firstChild as HTMLElement).className).toMatch(/toneDefault/);
  });

  it.each<[TextTone, string]>([
    ['default', 'toneDefault'],
    ['muted', 'toneMuted'],
    ['subtle', 'toneSubtle'],
    ['accent', 'toneAccent'],
    ['danger', 'toneDanger'],
    ['success', 'toneSuccess'],
    ['warning', 'toneWarning'],
  ])('tone="%s" applies class %s', (tone, expectedClass) => {
    const { container } = render(<Text tone={tone}>x</Text>);
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(expectedClass));
  });

  it('defaults to weight="regular" when no weight prop is supplied', () => {
    const { container } = render(<Text>x</Text>);
    expect((container.firstChild as HTMLElement).className).toMatch(/weightRegular/);
  });

  it.each<[TextWeight, string]>([
    ['regular', 'weightRegular'],
    ['medium', 'weightMedium'],
    ['semibold', 'weightSemibold'],
    ['bold', 'weightBold'],
  ])('weight="%s" applies class %s', (weight, expectedClass) => {
    const { container } = render(<Text weight={weight}>x</Text>);
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(expectedClass));
  });

  it('defaults to align="left" when no align prop is supplied', () => {
    const { container } = render(<Text>x</Text>);
    expect((container.firstChild as HTMLElement).className).toMatch(/alignLeft/);
  });

  it.each<[TextAlign, string]>([
    ['left', 'alignLeft'],
    ['center', 'alignCenter'],
    ['right', 'alignRight'],
  ])('align="%s" applies class %s', (align, expectedClass) => {
    const { container } = render(<Text align={align}>x</Text>);
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(expectedClass));
  });

  it('truncate adds the truncate class', () => {
    const { container } = render(<Text truncate>x</Text>);
    expect((container.firstChild as HTMLElement).className).toMatch(/truncate/);
  });

  it('omitting truncate does NOT add the truncate class', () => {
    const { container } = render(<Text>x</Text>);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/truncate/);
  });

  it('lineClamp={N} adds the lineClamp class AND sets style.WebkitLineClamp', () => {
    const { container } = render(<Text lineClamp={3}>x</Text>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/lineClamp/);
    expect(el.style.getPropertyValue('-webkit-line-clamp')).toBe('3');
  });

  it('lineClamp overrides truncate when both set', () => {
    const { container } = render(
      <Text truncate lineClamp={2}>
        x
      </Text>,
    );
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toMatch(/lineClamp/);
    expect(cls).not.toMatch(/truncate/);
  });

  it('lineClamp={0} is ignored (no class, no style)', () => {
    const { container } = render(<Text lineClamp={0}>x</Text>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).not.toMatch(/lineClamp/);
    expect(el.style.getPropertyValue('-webkit-line-clamp')).toBe('');
  });

  it('className from props merges with the base class (not replace)', () => {
    const { container } = render(<Text className="custom">x</Text>);
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toMatch(/custom/);
    expect(cls).toMatch(/text_/);
  });

  it('merges consumer style with the dynamic lineClamp style', () => {
    const { container } = render(
      <Text lineClamp={2} style={{ marginTop: 8 }}>
        x
      </Text>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.marginTop).toBe('8px');
    expect(el.style.getPropertyValue('-webkit-line-clamp')).toBe('2');
  });

  it('lineClamp prop takes precedence over consumer-passed style.WebkitLineClamp', () => {
    const { container } = render(
      <Text lineClamp={2} style={{ WebkitLineClamp: 5 }}>
        x
      </Text>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('-webkit-line-clamp')).toBe('2');
  });

  it('forwards ref to the underlying element (default <p>)', () => {
    const ref = createRef<HTMLElement>();
    render(<Text ref={ref}>x</Text>);
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });

  it('forwards ref to a <label> when as="label"', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Text as="label" ref={ref}>
        x
      </Text>,
    );
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
    expect(ref.current?.tagName).toBe('LABEL');
  });

  it('spreads native HTML attributes (htmlFor on <label>)', () => {
    render(
      <Text as="label" htmlFor="email-input" data-testid="lbl">
        Email
      </Text>,
    );
    const el = screen.getByTestId('lbl');
    expect(el).toHaveAttribute('for', 'email-input');
  });
});

describe('Text size="inherit" (#319)', () => {
  it('renders the sizeInherit class and no fixed-size class', () => {
    render(
      <Text as="span" size="inherit" data-testid="t">
        ENG-5
      </Text>,
    );
    const el = screen.getByTestId('t');
    expect(el.className).toMatch(/sizeInherit/);
    expect(el.className).not.toMatch(/sizeMd/);
  });

  it('tone and weight still apply with size="inherit"', () => {
    render(
      <Text as="span" size="inherit" tone="muted" weight="medium" data-testid="t">
        ENG-5
      </Text>,
    );
    const el = screen.getByTestId('t');
    expect(el.className).toMatch(/toneMuted/);
    expect(el.className).toMatch(/weightMedium/);
  });
});
