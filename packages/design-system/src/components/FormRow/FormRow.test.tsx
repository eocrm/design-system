import { render } from '@testing-library/react';
import { createRef } from 'react';
import { FormRow } from './FormRow';

describe('FormRow', () => {
  it('defaults to responsive auto-fit at 16rem', () => {
    const { container } = render(
      <FormRow>
        <div>a</div>
        <div>b</div>
      </FormRow>,
    );
    const cols = (container.firstChild as HTMLElement).style.getPropertyValue('--grid-columns');
    expect(cols).toContain('auto-fit');
    expect(cols).toContain('16rem');
  });

  it('columns={2} renders a fixed 2-column template', () => {
    const { container } = render(
      <FormRow columns={2}>
        <div>a</div>
        <div>b</div>
      </FormRow>,
    );
    expect((container.firstChild as HTMLElement).style.getPropertyValue('--grid-columns')).toBe(
      'repeat(2, minmax(0, 1fr))',
    );
  });

  it('honors a custom minColumnWidth', () => {
    const { container } = render(
      <FormRow minColumnWidth="20rem">
        <div>a</div>
      </FormRow>,
    );
    expect(
      (container.firstChild as HTMLElement).style.getPropertyValue('--grid-columns'),
    ).toContain('20rem');
  });

  it('forwards ref, className, and rest to the grid element', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <FormRow ref={ref} className="my-cls" data-foo="bar">
        <div>a</div>
      </FormRow>,
    );
    const el = container.firstChild as HTMLElement;
    expect(ref.current).toBe(el);
    expect(el.className).toMatch(/my-cls/);
    expect(el).toHaveAttribute('data-foo', 'bar');
  });
});
