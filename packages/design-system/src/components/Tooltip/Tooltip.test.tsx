import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Tooltip } from './Tooltip';

describe('Tooltip — initial render', () => {
  it('renders the trigger and does not render the tooltip on mount', () => {
    render(
      <Tooltip content="Save the record">
        <button type="button">Save</button>
      </Tooltip>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('throws a clear error when children is not a valid React element', () => {
    // React 19 logs console.error for thrown render errors. Silence it so the
    // test output stays clean; we still assert the throw with toThrow().
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <Tooltip content="x">
          {/* @ts-expect-error — intentionally invalid */}
          {null}
        </Tooltip>,
      ),
    ).toThrow(/exactly one React element/);
    spy.mockRestore();
  });

  it('forwards a consumer ref on the child to the underlying DOM node', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Tooltip content="x">
        <button type="button" ref={ref}>
          Save
        </button>
      </Tooltip>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe('Save');
  });
});
