import { createRef } from 'react';
import { render } from '@testing-library/react';
import { Sortable } from './Sortable';

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
});
