// PLACEHOLDER tests for the FlowCanvas skeleton. Task 8 of
// docs/superpowers/plans/2026-07-02-flowcanvas.md replaces this file with
// the real rendering/interaction suite.

import { createRef } from 'react';
import { render } from '@testing-library/react';
import { FlowCanvas } from './FlowCanvas';
import type { FlowCanvasEdge, FlowCanvasNode } from './types';

const NODES: FlowCanvasNode[] = [
  { id: 'open', label: 'Open', position: { x: 0, y: 0 } },
  { id: 'done', label: 'Done' },
];
const EDGES: FlowCanvasEdge[] = [{ id: 't1', from: 'open', to: 'done' }];

describe('FlowCanvas (placeholder skeleton)', () => {
  it('renders without crashing', () => {
    const { container } = render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it('forwards ref to the root div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<FlowCanvas ref={ref} nodes={NODES} edges={EDGES} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className from props instead of replacing it', () => {
    const ref = createRef<HTMLDivElement>();
    render(<FlowCanvas ref={ref} nodes={NODES} edges={EDGES} className="custom" />);
    expect(ref.current).toHaveClass('custom');
    expect(ref.current!.classList.length).toBeGreaterThan(1);
  });
});
