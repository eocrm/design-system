import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Screen } from './Screen';

describe('Screen', () => {
  it('renders children inside the main slot', () => {
    render(<Screen>hello</Screen>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('defaults to fill="viewport", backdrop="none", align="center"', () => {
    const { container } = render(<Screen>x</Screen>);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/fillViewport/);
    expect(root.className).not.toMatch(/backdrop/);
    // main carries the align class
    const main = root.querySelector('[class*="main"]') as HTMLElement;
    expect(main.className).toMatch(/alignCenter/);
  });

  it('fill="block" swaps the fill class', () => {
    const { container } = render(<Screen fill="block">x</Screen>);
    expect((container.firstChild as HTMLElement).className).toMatch(/fillBlock/);
  });

  it('applies each backdrop class', () => {
    const { container, rerender } = render(<Screen backdrop="plain">x</Screen>);
    expect((container.firstChild as HTMLElement).className).toMatch(/backdropPlain/);
    rerender(<Screen backdrop="accent">x</Screen>);
    expect((container.firstChild as HTMLElement).className).toMatch(/backdropAccent/);
    rerender(<Screen backdrop="danger">x</Screen>);
    expect((container.firstChild as HTMLElement).className).toMatch(/backdropDanger/);
  });

  it('align="start" swaps the main align class', () => {
    const { container } = render(<Screen align="start">x</Screen>);
    const main = (container.firstChild as HTMLElement).querySelector(
      '[class*="main"]',
    ) as HTMLElement;
    expect(main.className).toMatch(/alignStart/);
  });

  it('renders header and footer when provided', () => {
    render(
      <Screen header={<span data-testid="hdr">H</span>} footer={<span data-testid="ftr">F</span>}>
        x
      </Screen>,
    );
    expect(screen.getByTestId('hdr')).toBeInTheDocument();
    expect(screen.getByTestId('ftr')).toBeInTheDocument();
  });

  it('root has only the main child when header/footer omitted; three when both provided', () => {
    const { container } = render(<Screen>x</Screen>);
    expect((container.firstChild as HTMLElement).children).toHaveLength(1);
    const { container: c2 } = render(
      <Screen header={<i />} footer={<i />}>
        x
      </Screen>,
    );
    expect((c2.firstChild as HTMLElement).children).toHaveLength(3);
  });

  it('forwards ref to the root div and merges className / spreads attrs', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Screen ref={ref} className="my-cls" data-foo="bar">
        x
      </Screen>,
    );
    expect(ref.current).toBe(container.firstChild);
    expect((container.firstChild as HTMLElement).className).toMatch(/my-cls/);
    expect(container.firstChild).toHaveAttribute('data-foo', 'bar');
  });
});
