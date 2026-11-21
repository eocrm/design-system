import { act, fireEvent, render } from '@testing-library/react';
import { DashboardCanvas } from './DashboardCanvas';
import type { DashboardCanvasRenderItemContext } from './DashboardCanvas';
import type { DashboardCanvasValue } from './engine';

// jsdom has no IntersectionObserver: stub one that captures its callback and
// the observed cells, so tests can report intersections by item id.
let ioCallback: IntersectionObserverCallback | null;
let observed: Element[];

function stubIO() {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionObserverCallback) {
        ioCallback = cb;
      }
      observe(el: Element) {
        observed.push(el);
      }
      unobserve() {}
      disconnect() {
        observed = [];
      }
      takeRecords() {
        return [];
      }
    },
  );
}

beforeEach(() => {
  ioCallback = null;
  observed = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function intersect(entries: Record<string, boolean>) {
  act(() => {
    ioCallback!(
      Object.entries(entries).map(([id, isIntersecting]) => ({
        target: observed.find((el) => el.getAttribute('data-dc-item') === id)!,
        isIntersecting,
      })) as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    );
  });
}

function canvasValue(collapsed: boolean): DashboardCanvasValue {
  return {
    items: [{ id: 'a', x: 0, y: 0, w: 4, h: 2 }],
    sections: [
      {
        id: 's1',
        title: 'Section One',
        collapsed,
        items: [{ id: 'd', x: 0, y: 0, w: 4, h: 2 }],
      },
    ],
  };
}

function renderCanvas(collapsed = false) {
  const renderItem = vi.fn((id: string | number, { visible }: DashboardCanvasRenderItemContext) => (
    <div data-testid={`body-${id}`}>{visible ? 'visible' : 'hidden'}</div>
  ));
  const utils = render(
    <DashboardCanvas value={canvasValue(collapsed)} onChange={() => {}} renderItem={renderItem} />,
  );
  const rerenderCollapsed = (next: boolean) =>
    utils.rerender(
      <DashboardCanvas value={canvasValue(next)} onChange={() => {}} renderItem={renderItem} />,
    );
  return { ...utils, renderItem, rerenderCollapsed };
}

describe('DashboardCanvas renderItem visibility', () => {
  it('passes visible=false until intersecting, then true', () => {
    stubIO();
    const { getByTestId } = renderCanvas();
    expect(getByTestId('body-a')).toHaveTextContent('hidden');
    intersect({ a: true });
    expect(getByTestId('body-a')).toHaveTextContent('visible');
    intersect({ a: false });
    expect(getByTestId('body-a')).toHaveTextContent('hidden');
  });

  it('items in a collapsed section are not visible even when intersecting', () => {
    stubIO();
    const { getByTestId, rerenderCollapsed } = renderCanvas(true);
    intersect({ d: true });
    expect(getByTestId('body-d')).toHaveTextContent('hidden');
    rerenderCollapsed(false);
    expect(getByTestId('body-d')).toHaveTextContent('visible');
    // Collapsing flips it immediately, without waiting for the observer.
    rerenderCollapsed(true);
    expect(getByTestId('body-d')).toHaveTextContent('hidden');
  });

  it('without IntersectionObserver, visible follows collapse only', () => {
    const { getByTestId } = renderCanvas(true);
    expect(getByTestId('body-a')).toHaveTextContent('visible');
    expect(getByTestId('body-d')).toHaveTextContent('hidden');
  });

  it('the drag ghost renders with visible=true', () => {
    stubIO();
    const { container, renderItem } = renderCanvas();
    const root = container.firstElementChild as HTMLElement;
    const cell = container.querySelector('[data-dc-item="a"]') as HTMLElement;
    fireEvent.pointerDown(cell, { clientX: 10, clientY: 10, pointerId: 1, button: 0 });
    renderItem.mockClear();
    fireEvent.pointerMove(root, { clientX: 60, clientY: 60, pointerId: 1 });
    const ghost = container.querySelector('[data-dc-ghost]');
    expect(ghost).toHaveTextContent('visible');
    expect(renderItem).toHaveBeenCalledWith('a', { visible: true });
  });
});
