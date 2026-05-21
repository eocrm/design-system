import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Radio } from './Radio';

describe('Radio (standalone)', () => {
  it('renders unchecked by default', () => {
    render(<Radio name="x" value="a" label="A" />);
    expect(screen.getByRole('radio', { name: 'A' })).not.toBeChecked();
  });

  it('defaultChecked initializes uncontrolled state', () => {
    render(<Radio name="x" value="a" label="A" defaultChecked />);
    expect(screen.getByRole('radio')).toBeChecked();
  });

  it('controlled `checked` reflects in the DOM', () => {
    const { rerender } = render(
      <Radio name="x" value="a" label="A" checked={false} onChange={() => {}} />,
    );
    expect(screen.getByRole('radio')).not.toBeChecked();
    rerender(<Radio name="x" value="a" label="A" checked onChange={() => {}} />);
    expect(screen.getByRole('radio')).toBeChecked();
  });

  it('onChange fires with (value, event)', async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(<Radio name="x" value="a" label="A" onChange={handle} />);
    await user.click(screen.getByRole('radio'));
    expect(handle).toHaveBeenCalledTimes(1);
    expect(handle.mock.calls[0][0]).toBe('a');
    expect(handle.mock.calls[0][1].target).toBeInstanceOf(HTMLInputElement);
  });

  it('clicking the label text also fires onChange', async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(<Radio name="x" value="a" label="Click me" onChange={handle} />);
    await user.click(screen.getByText('Click me'));
    expect(handle).toHaveBeenCalledTimes(1);
  });

  it('disabled propagates and blocks click on both input and label', async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(<Radio name="x" value="a" label="Locked" disabled onChange={handle} />);
    const input = screen.getByRole('radio');
    expect(input).toBeDisabled();
    await user.click(input);
    expect(handle).not.toHaveBeenCalled();
    await user.click(screen.getByText('Locked'));
    expect(handle).not.toHaveBeenCalled();
  });

  it('invalid sets aria-invalid + the invalid class', () => {
    const { container } = render(<Radio name="x" value="a" label="A" invalid />);
    expect(screen.getByRole('radio')).toHaveAttribute('aria-invalid', 'true');
    expect(container.querySelector('label')!.className).toMatch(/invalid/);
  });

  it('renders without label when only aria-label is provided', () => {
    const { container } = render(<Radio name="x" value="a" aria-label="Option A" />);
    expect(screen.getByRole('radio', { name: 'Option A' })).toBeInTheDocument();
    expect(container.querySelector('span[class*="labelText"]')).toBeNull();
  });

  it('applies size class names for sm / md / lg', () => {
    const { container, rerender } = render(<Radio name="x" value="a" label="A" size="sm" />);
    expect(container.querySelector('label')!.className).toMatch(/size-sm/);
    rerender(<Radio name="x" value="a" label="A" size="md" />);
    expect(container.querySelector('label')!.className).toMatch(/size-md/);
    rerender(<Radio name="x" value="a" label="A" size="lg" />);
    expect(container.querySelector('label')!.className).toMatch(/size-lg/);
  });

  it('defaults to size="md"', () => {
    const { container } = render(<Radio name="x" value="a" label="A" />);
    expect(container.querySelector('label')!.className).toMatch(/size-md/);
  });

  it('does NOT pass component size prop through to the DOM size attribute', () => {
    render(<Radio name="x" value="a" label="A" size="sm" />);
    expect(screen.getByRole('radio')).not.toHaveAttribute('size');
  });

  it('forwards ref to the native input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Radio name="x" value="a" label="A" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe('radio');
  });

  it('merges className on the outer label', () => {
    const { container } = render(<Radio name="x" value="a" label="A" className="my-cls" />);
    expect(container.querySelector('label.my-cls')).not.toBeNull();
  });
});
