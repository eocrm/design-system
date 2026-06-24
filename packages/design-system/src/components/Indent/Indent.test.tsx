import { render, screen } from '@testing-library/react';
import { createRef, type CSSProperties } from 'react';
import { Indent } from './Indent';

describe('Indent', () => {
  it('renders children with default level=1 and gutter=lg', () => {
    render(<Indent data-testid="ind">hi</Indent>);
    const el = screen.getByTestId('ind');
    expect(el).toHaveTextContent('hi');
    expect(el.className).toMatch(/indent/);
    expect(el.className).toMatch(/gutter-lg/);
    expect(el.style.getPropertyValue('--indent-level')).toBe('1');
  });

  it('level={0} renders a flush box (--indent-level: 0)', () => {
    render(
      <Indent data-testid="ind" level={0}>
        x
      </Indent>,
    );
    expect(screen.getByTestId('ind').style.getPropertyValue('--indent-level')).toBe('0');
  });

  it('level={3} sets --indent-level to 3', () => {
    render(
      <Indent data-testid="ind" level={3}>
        x
      </Indent>,
    );
    expect(screen.getByTestId('ind').style.getPropertyValue('--indent-level')).toBe('3');
  });

  it('clamps a negative level to 0', () => {
    render(
      <Indent data-testid="ind" level={-2}>
        x
      </Indent>,
    );
    expect(screen.getByTestId('ind').style.getPropertyValue('--indent-level')).toBe('0');
  });

  it.each(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const)(
    'gutter=%s renders the matching gutter class',
    (g) => {
      render(
        <Indent data-testid="ind" gutter={g}>
          x
        </Indent>,
      );
      expect(screen.getByTestId('ind').className).toMatch(new RegExp(`gutter-${g}`));
    },
  );

  it('forwards ref to the div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Indent ref={ref}>x</Indent>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className, not replaces', () => {
    render(
      <Indent data-testid="ind" className="custom">
        x
      </Indent>,
    );
    const el = screen.getByTestId('ind');
    expect(el.className).toMatch(/custom/);
    expect(el.className).toMatch(/indent/);
  });

  it('merges consumer style without clobbering --indent-level', () => {
    render(
      <Indent data-testid="ind" level={2} style={{ background: 'red' }}>
        x
      </Indent>,
    );
    const el = screen.getByTestId('ind');
    expect(el.style.background).toBe('red');
    expect(el.style.getPropertyValue('--indent-level')).toBe('2');
  });

  it('the level prop wins over a conflicting --indent-level in consumer style', () => {
    render(
      <Indent
        data-testid="ind"
        level={2}
        style={{ ['--indent-level' as string]: 99 } as CSSProperties}
      >
        x
      </Indent>,
    );
    expect(screen.getByTestId('ind').style.getPropertyValue('--indent-level')).toBe('2');
  });

  it('clamps a non-finite level to 0', () => {
    render(
      <Indent data-testid="ind" level={Number.NaN}>
        x
      </Indent>,
    );
    expect(screen.getByTestId('ind').style.getPropertyValue('--indent-level')).toBe('0');
  });

  it('spreads arbitrary HTML attributes', () => {
    render(
      <Indent data-testid="ind" role="treeitem" aria-level={2}>
        x
      </Indent>,
    );
    const el = screen.getByTestId('ind');
    expect(el).toHaveAttribute('role', 'treeitem');
    expect(el).toHaveAttribute('aria-level', '2');
  });
});
