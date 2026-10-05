import { createRef } from 'react';
import { render } from '@testing-library/react';
import { WidgetPreview, type WidgetPreviewVariant } from './WidgetPreview';
import { WidgetShape } from './WidgetShape';

const VARIANTS: WidgetPreviewVariant[] = ['kpi', 'list', 'chart', 'pipeline', 'activity'];

describe('WidgetPreview', () => {
  it.each(VARIANTS)('renders the %s shape in preview mode', (variant) => {
    const { container } = render(<WidgetPreview variant={variant} />);
    const shape = container.querySelector(`[data-widget-shape="${variant}"]`)!;
    expect(shape).toBeInTheDocument();
    expect(shape).toHaveAttribute('data-mode', 'preview');
    // Every variant has at least one accent "hero" piece.
    expect(shape.querySelector('[data-hero]')).not.toBeNull();
  });

  it('is aria-hidden even when the consumer passes aria-hidden={false}', () => {
    const { container } = render(<WidgetPreview variant="kpi" aria-hidden={false} />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('forwards ref and merges className + spreads attributes', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <WidgetPreview ref={ref} variant="chart" className="mine" data-testid="p" />,
    );
    const root = container.firstChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root.className).toMatch(/mine/);
    expect(root.className).toMatch(/root/);
    expect(root).toHaveAttribute('data-testid', 'p');
  });

  it('preview pieces are static (no pulse)', () => {
    const { container } = render(<WidgetPreview variant="list" />);
    container.querySelectorAll('[data-widget-shape] span').forEach((el) => {
      expect(el.className).not.toMatch(/pulse/);
    });
  });
});

describe('WidgetShape', () => {
  it.each(['kpi', 'list', 'chart', 'pipeline', 'activity', 'lines'] as const)(
    'loading mode for %s has no accent pieces and pulses',
    (kind) => {
      const { container } = render(<WidgetShape kind={kind} mode="loading" />);
      const shape = container.querySelector(`[data-widget-shape="${kind}"]`)!;
      expect(shape).toHaveAttribute('data-mode', 'loading');
      expect(shape.querySelector('[data-hero]')).toBeNull();
      expect(shape.querySelector('[class*="pulse"]')).not.toBeNull();
    },
  );

  it('is aria-hidden', () => {
    const { container } = render(<WidgetShape kind="lines" mode="loading" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
