import { createRef } from 'react';
import { render } from '@testing-library/react';
import { BrandIcon } from './BrandIcon';

function svgOf(c: HTMLElement): SVGSVGElement {
  return c.querySelector('svg') as SVGSVGElement;
}

describe('BrandIcon', () => {
  it('renders the google mark (4 colored paths, 0 0 48 48)', () => {
    const { container } = render(<BrandIcon name="google" />);
    const svg = svgOf(container);
    expect(svg).not.toBeNull();
    expect(svg.querySelectorAll('path')).toHaveLength(4);
    expect(svg.getAttribute('viewBox')).toBe('0 0 48 48');
  });

  it('renders the yandex mark (distinct viewBox + brand red)', () => {
    const { container } = render(<BrandIcon name="yandex" />);
    expect(svgOf(container).getAttribute('viewBox')).toBe('0 0 24 24');
    expect(container.innerHTML).toMatch(/#FC3F1D/i);
  });

  it('renders every known brand without throwing', () => {
    (['google', 'yandex'] as const).forEach((name) => {
      expect(() => render(<BrandIcon name={name} />)).not.toThrow();
    });
  });

  it('sizes the svg (default 20, overridable)', () => {
    const { container, rerender } = render(<BrandIcon name="google" />);
    expect(svgOf(container).getAttribute('width')).toBe('20');
    expect(svgOf(container).getAttribute('height')).toBe('20');
    rerender(<BrandIcon name="google" size={32} />);
    expect(svgOf(container).getAttribute('width')).toBe('32');
    expect(svgOf(container).getAttribute('height')).toBe('32');
  });

  it('is decorative by default (aria-hidden, no role)', () => {
    const { container } = render(<BrandIcon name="google" />);
    const svg = svgOf(container);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
  });

  it('title makes it a labeled image', () => {
    const { container, getByTitle } = render(<BrandIcon name="yandex" title="Yandex" />);
    const svg = svgOf(container);
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Yandex');
    expect(svg.getAttribute('aria-hidden')).toBeNull();
    expect(getByTitle('Yandex')).toBeInTheDocument();
  });

  it('forwards ref to the svg, merges className, spreads attrs', () => {
    const ref = createRef<SVGSVGElement>();
    const { container } = render(
      <BrandIcon name="google" ref={ref} className="custom" data-testid="bi" />,
    );
    expect(ref.current).toBe(svgOf(container));
    expect(svgOf(container).getAttribute('class')).toMatch(/custom/);
    expect(svgOf(container).getAttribute('data-testid')).toBe('bi');
  });
});
