import { createRef } from 'react';
import { render } from '@testing-library/react';
import { Sortable, restrictTransformToRect } from './Sortable';

describe('Sortable', () => {
  it('renders <ol> with items as <li> elements', () => {
    const { container } = render(
      <Sortable>
        <Sortable.Item id="a">A</Sortable.Item>
        <Sortable.Item id="b">B</Sortable.Item>
      </Sortable>,
    );
    expect(container.querySelector('ol')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('forwards ref to the underlying <ol>', () => {
    const ref = createRef<HTMLOListElement>();
    render(
      <Sortable ref={ref}>
        <Sortable.Item id="a">A</Sortable.Item>
      </Sortable>,
    );
    expect(ref.current?.tagName).toBe('OL');
  });

  it('Item forwards ref to the underlying <li>', () => {
    const ref = createRef<HTMLLIElement>();
    render(
      <Sortable>
        <Sortable.Item ref={ref} id="a">
          A
        </Sortable.Item>
      </Sortable>,
    );
    expect(ref.current?.tagName).toBe('LI');
  });

  it('Handle forwards ref to the underlying <button>', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Sortable>
        <Sortable.Item id="a">
          <Sortable.Handle ref={ref}>handle</Sortable.Handle>
        </Sortable.Item>
      </Sortable>,
    );
    expect(ref.current?.tagName).toBe('BUTTON');
  });

  it('merges consumer className on root and Items', () => {
    const { container } = render(
      <Sortable className="custom-ol">
        <Sortable.Item id="a" className="custom-li">
          A
        </Sortable.Item>
      </Sortable>,
    );
    expect(container.querySelector('ol')?.className).toContain('custom-ol');
    expect(container.querySelector('li')?.className).toContain('custom-li');
  });

  it('accepts both string and number for Item id', () => {
    const { container } = render(
      <Sortable>
        <Sortable.Item id={1}>One</Sortable.Item>
        <Sortable.Item id="two">Two</Sortable.Item>
      </Sortable>,
    );
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('Item renders consumer children inside the <li>', () => {
    const { container } = render(
      <Sortable>
        <Sortable.Item id="a">
          <span data-testid="content">hello</span>
        </Sortable.Item>
      </Sortable>,
    );
    expect(container.querySelector('li [data-testid="content"]')?.textContent).toBe('hello');
  });

  it('Handle renders <button type="button"> with default aria-label "Reorder item"', () => {
    const { container } = render(
      <Sortable>
        <Sortable.Item id="a">
          <Sortable.Handle>h</Sortable.Handle>
        </Sortable.Item>
      </Sortable>,
    );
    const handle = container.querySelector('button[data-sortable-handle="true"]');
    expect(handle).not.toBeNull();
    expect(handle?.getAttribute('type')).toBe('button');
    expect(handle?.getAttribute('aria-label')).toBe('Reorder item');
  });

  it('Handle aria-label is overridable', () => {
    const { container } = render(
      <Sortable>
        <Sortable.Item id="a">
          <Sortable.Handle aria-label="Reorder card A">h</Sortable.Handle>
        </Sortable.Item>
      </Sortable>,
    );
    expect(
      container.querySelector('[data-sortable-handle="true"]')?.getAttribute('aria-label'),
    ).toBe('Reorder card A');
  });

  it('with Handle present: <li> does not get tabIndex or role from dnd-kit', () => {
    const { container } = render(
      <Sortable>
        <Sortable.Item id="a">
          <Sortable.Handle>h</Sortable.Handle>
        </Sortable.Item>
      </Sortable>,
    );
    const li = container.querySelector('li');
    expect(li?.getAttribute('tabIndex')).toBeNull();
    expect(li?.getAttribute('role')).toBeNull();
  });

  it('without Handle: <li> is focusable (tabIndex=0) for keyboard reorder', () => {
    const { container } = render(
      <Sortable>
        <Sortable.Item id="a">A</Sortable.Item>
      </Sortable>,
    );
    const li = container.querySelector('li');
    expect(li?.getAttribute('tabIndex')).toBe('0');
  });

  it('throws when Sortable.Handle is rendered outside a Sortable.Item', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Sortable.Handle>orphan</Sortable.Handle>)).toThrow(
      /must be rendered inside a <Sortable.Item>/,
    );
    consoleError.mockRestore();
  });

  it('at rest renders one <li> per item and no DragOverlay clone', () => {
    // DragOverlay only renders content during an active drag. With no drag in
    // progress it renders null, so each item's content appears exactly once
    // (in its <li>) — there is no second, overlay copy in the DOM.
    const { container } = render(
      <Sortable>
        <Sortable.Item id="a">
          <span data-testid="content">Alpha</span>
        </Sortable.Item>
        <Sortable.Item id="b">
          <span data-testid="content">Beta</span>
        </Sortable.Item>
      </Sortable>,
    );
    expect(container.querySelectorAll('li')).toHaveLength(2);
    // No overlay clone at rest — exactly one node per item content.
    expect(container.querySelectorAll('[data-testid="content"]')).toHaveLength(2);
    // The lifted-overlay marker is never present without an active drag.
    expect(container.querySelectorAll('[data-dragging="true"]')).toHaveLength(0);
  });

  it('renders empty list (no items) without crashing', () => {
    const { container } = render(<Sortable>{null}</Sortable>);
    expect(container.querySelector('ol')).not.toBeNull();
  });

  it('renders without console warnings under default props', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Sortable>
        <Sortable.Item id="a">
          <Sortable.Handle>h</Sortable.Handle>
        </Sortable.Item>
        <Sortable.Item id="b">B</Sortable.Item>
      </Sortable>,
    );
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  it('renders with restrictToContainer={false} (free drag) without crashing', () => {
    const { container } = render(
      <Sortable restrictToContainer={false}>
        <Sortable.Item id="a">A</Sortable.Item>
        <Sortable.Item id="b">B</Sortable.Item>
      </Sortable>,
    );
    expect(container.querySelector('ol')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('forwards ref to the <ol> with restrictToContainer enabled (default)', () => {
    // restrictToContainer merges an internal ref onto the <ol>; the consumer's
    // ref must still resolve to the same node.
    const ref = createRef<HTMLOListElement>();
    render(
      <Sortable ref={ref}>
        <Sortable.Item id="a">A</Sortable.Item>
      </Sortable>,
    );
    expect(ref.current?.tagName).toBe('OL');
  });
});

describe('restrictTransformToRect', () => {
  // A 50px-tall, 100px-wide node sitting at (left:10, top:20) inside a
  // 400x300 bounding box anchored at (left:0, top:0).
  const nodeRect = { top: 20, bottom: 70, left: 10, right: 110 };
  const boundingRect = { top: 0, left: 0, width: 400, height: 300 };

  it('returns the transform unchanged when fully within bounds', () => {
    const transform = { x: 5, y: 5, scaleX: 1, scaleY: 1 };
    expect(restrictTransformToRect(transform, nodeRect, boundingRect)).toEqual(transform);
  });

  it('clamps y so the top edge stays at the bound when dragged above', () => {
    // y = -100 would push top to -80 (above boundingRect.top=0). Clamp to keep
    // the top edge at the bound: y = boundingRect.top - nodeRect.top = -20.
    const result = restrictTransformToRect(
      { x: 0, y: -100, scaleX: 1, scaleY: 1 },
      nodeRect,
      boundingRect,
    );
    expect(result.y).toBe(-20);
    expect(result.x).toBe(0);
  });

  it('clamps y so the bottom edge stays at the bound when dragged below', () => {
    // y = 1000 would push bottom way past 300. Clamp:
    // y = boundingRect.top + height - nodeRect.bottom = 0 + 300 - 70 = 230.
    const result = restrictTransformToRect(
      { x: 0, y: 1000, scaleX: 1, scaleY: 1 },
      nodeRect,
      boundingRect,
    );
    expect(result.y).toBe(230);
  });

  it('clamps x so the left edge stays at the bound when dragged left', () => {
    // x = -100 would push left to -90 (< boundingRect.left=0). Clamp:
    // x = boundingRect.left - nodeRect.left = 0 - 10 = -10.
    const result = restrictTransformToRect(
      { x: -100, y: 0, scaleX: 1, scaleY: 1 },
      nodeRect,
      boundingRect,
    );
    expect(result.x).toBe(-10);
    expect(result.y).toBe(0);
  });

  it('clamps x so the right edge stays at the bound when dragged right', () => {
    // x = 1000 would push right past 400. Clamp:
    // x = boundingRect.left + width - nodeRect.right = 0 + 400 - 110 = 290.
    const result = restrictTransformToRect(
      { x: 1000, y: 0, scaleX: 1, scaleY: 1 },
      nodeRect,
      boundingRect,
    );
    expect(result.x).toBe(290);
  });

  it('preserves scaleX / scaleY untouched', () => {
    const result = restrictTransformToRect(
      { x: 1000, y: 1000, scaleX: 0.5, scaleY: 0.75 },
      nodeRect,
      boundingRect,
    );
    expect(result.scaleX).toBe(0.5);
    expect(result.scaleY).toBe(0.75);
  });
});
