import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Code, type CodeTone } from './Code';

describe('Code', () => {
  it('renders its children', () => {
    render(<Code>npm install</Code>);
    expect(screen.getByText('npm install')).toBeInTheDocument();
  });

  it('renders a <code> element', () => {
    const { container } = render(<Code>x</Code>);
    expect(container.firstElementChild!.tagName).toBe('CODE');
  });

  it('defaults to tone="default"', () => {
    const { container } = render(<Code>x</Code>);
    expect((container.firstChild as HTMLElement).className).toMatch(/toneDefault/);
  });

  it.each<[CodeTone, string]>([
    ['default', 'toneDefault'],
    ['muted', 'toneMuted'],
    ['accent', 'toneAccent'],
    ['danger', 'toneDanger'],
  ])('tone="%s" applies class %s', (tone, expectedClass) => {
    const { container } = render(<Code tone={tone}>x</Code>);
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(expectedClass));
  });

  it('className from props merges with the base class (not replace)', () => {
    const { container } = render(<Code className="custom">x</Code>);
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toMatch(/custom/);
    expect(cls).toMatch(/code_/);
  });

  it('forwards ref to the underlying <code> element', () => {
    const ref = createRef<HTMLElement>();
    render(<Code ref={ref}>x</Code>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('CODE');
  });

  it('spreads native HTML attributes to the <code> element', () => {
    render(
      <Code data-testid="c" id="cli" aria-label="cli">
        x
      </Code>,
    );
    const el = screen.getByTestId('c');
    expect(el).toHaveAttribute('id', 'cli');
    expect(el).toHaveAttribute('aria-label', 'cli');
  });

  it('composes inline inside text — DOM nesting check', () => {
    render(
      <p data-testid="wrapper">
        Use <Code>npm install</Code> to add deps.
      </p>,
    );
    const wrapper = screen.getByTestId('wrapper');
    expect(wrapper.querySelector('code')).toHaveTextContent('npm install');
  });
});
