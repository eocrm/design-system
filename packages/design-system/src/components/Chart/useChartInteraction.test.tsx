import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useChartDomain } from './useChartDomain';
import { useChartInteraction, type ChartInteractionOptions } from './useChartInteraction';

// A bare plot over a fixed geometry: 100px per category from x = 0.
function Harness({
  categories,
  onInspect,
}: {
  categories: string[];
  onInspect: ChartInteractionOptions['onInspect'];
}) {
  const [plotEl, setPlotEl] = useState<HTMLDivElement | null>(null);
  const domain = useChartDomain({ categories });
  const n = categories.length;
  const layout = {
    plot: { x: 0, y: 0, width: n * 100, height: 100 },
    categoryX: categories.map((_, i) => i * 100 + 50),
    step: 100,
  };
  const ix = useChartInteraction({ domain, layout, plotEl, rootEl: null, empty: false, onInspect });
  return <div ref={setPlotEl} data-testid="plot" tabIndex={0} {...ix.plotHandlers} />;
}

describe('useChartInteraction onInspect', () => {
  const mouse = { pointerId: 1, pointerType: 'mouse' };

  it('fires once on hover and once on leave, nothing on mount', () => {
    const onInspect = vi.fn();
    render(<Harness categories={['a', 'b', 'c']} onInspect={onInspect} />);
    expect(onInspect).not.toHaveBeenCalled();
    fireEvent.pointerMove(screen.getByTestId('plot'), { ...mouse, clientX: 250 });
    expect(onInspect.mock.calls).toEqual([[2, 'pointer']]);
    fireEvent.pointerLeave(screen.getByTestId('plot'), mouse);
    expect(onInspect.mock.calls).toEqual([
      [2, 'pointer'],
      [null, null],
    ]);
  });

  it('reports (null, null) once when the data shrinks under the inspected index', () => {
    const onInspect = vi.fn();
    const { rerender } = render(<Harness categories={['a', 'b', 'c']} onInspect={onInspect} />);
    fireEvent.pointerMove(screen.getByTestId('plot'), { ...mouse, clientX: 250 });
    rerender(<Harness categories={['a', 'b']} onInspect={onInspect} />);
    fireEvent.pointerLeave(screen.getByTestId('plot'), mouse);
    expect(onInspect.mock.calls).toEqual([
      [2, 'pointer'],
      [null, null],
    ]);
  });
});
