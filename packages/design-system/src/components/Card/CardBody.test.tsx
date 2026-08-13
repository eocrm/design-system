import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { CardBody } from './CardBody';

describe('CardBody', () => {
  it('renders its content in a div without scrolling by default', () => {
    const { container } = render(<CardBody>Account details</CardBody>);
    const body = container.firstElementChild!;

    expect(body.tagName).toBe('DIV');
    expect(body).toHaveTextContent('Account details');
    expect(body.className).toMatch(/body/);
    expect(body.className).not.toMatch(/scroll/);
  });

  it('forwards its ref to the underlying div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<CardBody ref={ref}>Account details</CardBody>);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges a consumer class with the body class', () => {
    const { container } = render(<CardBody className="consumer-class">Account details</CardBody>);
    const body = container.firstElementChild!;

    expect(body.className).toMatch(/body/);
    expect(body.className).toMatch(/consumer-class/);
  });

  it('spreads native div attributes', () => {
    render(
      <CardBody data-testid="body" aria-label="Pipeline entries" data-region="pipeline">
        Pipeline
      </CardBody>,
    );

    const body = screen.getByTestId('body');
    expect(body).toHaveAttribute('aria-label', 'Pipeline entries');
    expect(body).toHaveAttribute('data-region', 'pipeline');
  });

  it('adds the scrolling modifier without leaking the scroll prop', () => {
    const { container } = render(<CardBody scroll>Pipeline</CardBody>);
    const body = container.firstElementChild!;

    expect(body.className).toMatch(/scroll/);
    expect(body).not.toHaveAttribute('scroll');
  });
});
