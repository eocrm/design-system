import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Radio } from './Radio';
import { RadioGroup } from './RadioGroup';

describe('RadioGroup', () => {
  it('renders a fieldset + optional legend', () => {
    const { container } = render(
      <RadioGroup name="x" label="Choose one">
        <Radio value="a" label="A" />
        <Radio value="b" label="B" />
      </RadioGroup>,
    );
    expect(container.querySelector('fieldset')).toBeInTheDocument();
    expect(container.querySelector('legend')).toHaveTextContent('Choose one');
  });

  it('omits the legend when label is unset', () => {
    const { container } = render(
      <RadioGroup name="x">
        <Radio value="a" label="A" />
      </RadioGroup>,
    );
    expect(container.querySelector('legend')).toBeNull();
  });

  it('propagates `name` to children via context', () => {
    render(
      <RadioGroup name="plan">
        <Radio value="free" label="Free" />
        <Radio value="pro" label="Pro" />
      </RadioGroup>,
    );
    const radios = screen.getAllByRole('radio');
    expect(radios.every((r) => r.getAttribute('name') === 'plan')).toBe(true);
  });

  it('controlled `value` marks the matching child as checked', () => {
    const { rerender } = render(
      <RadioGroup name="x" value="a" onChange={() => {}}>
        <Radio value="a" label="A" />
        <Radio value="b" label="B" />
      </RadioGroup>,
    );
    expect(screen.getByRole('radio', { name: 'A' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'B' })).not.toBeChecked();

    rerender(
      <RadioGroup name="x" value="b" onChange={() => {}}>
        <Radio value="a" label="A" />
        <Radio value="b" label="B" />
      </RadioGroup>,
    );
    expect(screen.getByRole('radio', { name: 'A' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'B' })).toBeChecked();
  });

  it('defaultValue initializes uncontrolled selection', () => {
    render(
      <RadioGroup name="x" defaultValue="b">
        <Radio value="a" label="A" />
        <Radio value="b" label="B" />
      </RadioGroup>,
    );
    expect(screen.getByRole('radio', { name: 'B' })).toBeChecked();
  });

  it('fires group onChange(value, event) when a child is clicked', async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(
      <RadioGroup name="x" onChange={handle}>
        <Radio value="a" label="A" />
        <Radio value="b" label="B" />
      </RadioGroup>,
    );
    await user.click(screen.getByRole('radio', { name: 'B' }));
    expect(handle).toHaveBeenCalledTimes(1);
    expect(handle.mock.calls[0][0]).toBe('b');
    expect(handle.mock.calls[0][1].target).toBeInstanceOf(HTMLInputElement);
  });

  it('per-child onChange fires BEFORE group onChange', async () => {
    const user = userEvent.setup();
    const order: string[] = [];
    const childHandler = () => order.push('child');
    const groupHandler = () => order.push('group');
    render(
      <RadioGroup name="x" onChange={groupHandler}>
        <Radio value="a" label="A" onChange={childHandler} />
      </RadioGroup>,
    );
    await user.click(screen.getByRole('radio'));
    expect(order).toEqual(['child', 'group']);
  });

  it('group `size` propagates as the default; per-child explicit size wins', () => {
    const { container } = render(
      <RadioGroup name="x" size="lg">
        <Radio value="a" label="A" />
        <Radio value="b" label="B" size="sm" />
      </RadioGroup>,
    );
    const labels = container.querySelectorAll('label');
    expect(labels[0].className).toMatch(/size-lg/);
    expect(labels[1].className).toMatch(/size-sm/);
  });

  it('group `disabled` propagates to all children', () => {
    render(
      <RadioGroup name="x" disabled>
        <Radio value="a" label="A" />
        <Radio value="b" label="B" />
      </RadioGroup>,
    );
    for (const r of screen.getAllByRole('radio')) {
      expect(r).toBeDisabled();
    }
  });

  it('group `invalid` propagates + sets aria-invalid on the fieldset', () => {
    const { container } = render(
      <RadioGroup name="x" invalid>
        <Radio value="a" label="A" />
      </RadioGroup>,
    );
    expect(container.querySelector('fieldset')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('radio')).toHaveAttribute('aria-invalid', 'true');
  });

  it('per-child `disabled={false}` and `invalid={false}` win over group `true`', () => {
    render(
      <RadioGroup name="x" disabled invalid>
        <Radio value="a" label="A" />
        <Radio value="b" label="B" disabled={false} invalid={false} />
      </RadioGroup>,
    );
    const [a, b] = screen.getAllByRole('radio');
    // Group-disabled + group-invalid apply to a
    expect(a).toBeDisabled();
    expect(a).toHaveAttribute('aria-invalid', 'true');
    // b explicitly overrides with false — neither attribute applies
    expect(b).not.toBeDisabled();
    expect(b).not.toHaveAttribute('aria-invalid');
  });

  it('orientation applies the right class', () => {
    const { container, rerender } = render(
      <RadioGroup name="x">
        <Radio value="a" label="A" />
      </RadioGroup>,
    );
    expect(container.querySelector('fieldset')!.className).toMatch(/orientation-vertical/);
    rerender(
      <RadioGroup name="x" orientation="horizontal">
        <Radio value="a" label="A" />
      </RadioGroup>,
    );
    expect(container.querySelector('fieldset')!.className).toMatch(/orientation-horizontal/);
  });

  it('forwards ref to the fieldset', () => {
    const ref = createRef<HTMLFieldSetElement>();
    render(
      <RadioGroup name="x" ref={ref}>
        <Radio value="a" label="A" />
      </RadioGroup>,
    );
    expect(ref.current).toBeInstanceOf(HTMLFieldSetElement);
  });

  it('merges className on the fieldset', () => {
    const { container } = render(
      <RadioGroup name="x" className="my-cls">
        <Radio value="a" label="A" />
      </RadioGroup>,
    );
    expect(container.querySelector('fieldset.my-cls')).not.toBeNull();
  });

  it('FormData round-trips the selected value (form integration)', () => {
    render(
      <form data-testid="form">
        <RadioGroup name="plan" defaultValue="pro">
          <Radio value="free" label="Free" />
          <Radio value="pro" label="Pro" />
        </RadioGroup>
      </form>,
    );
    const form = screen.getByTestId('form') as HTMLFormElement;
    const fd = new FormData(form);
    expect(fd.get('plan')).toBe('pro');
  });
});
