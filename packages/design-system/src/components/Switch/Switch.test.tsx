import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './Switch';

describe('<Switch>', () => {
  // ─── Baseline ──────────────────────────────────────────────────────────

  it('renders without crashing with default props', () => {
    render(<Switch aria-label="Notifications" />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('renders the label from children', () => {
    render(<Switch>Enable notifications</Switch>);
    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
  });

  it('icon-only works with aria-label and no children', () => {
    render(<Switch aria-label="Mute" />);
    expect(screen.getByRole('switch', { name: 'Mute' })).toBeInTheDocument();
  });

  it('defaults to size="md"', () => {
    const { container } = render(<Switch aria-label="x" />);
    const track = container.querySelector('[data-tone]')!;
    expect(track.className).toMatch(/sizeMd/);
  });

  it('size="sm" applies the sm class', () => {
    const { container } = render(<Switch aria-label="x" size="sm" />);
    const track = container.querySelector('[data-tone]')!;
    expect(track.className).toMatch(/sizeSm/);
  });

  it('size="lg" applies the lg class', () => {
    const { container } = render(<Switch aria-label="x" size="lg" />);
    const track = container.querySelector('[data-tone]')!;
    expect(track.className).toMatch(/sizeLg/);
  });

  it('defaults to tone="accent"', () => {
    const { container } = render(<Switch aria-label="x" />);
    const track = container.querySelector('[data-tone]')!;
    expect(track).toHaveAttribute('data-tone', 'accent');
  });

  it.each([
    ['success', 'success'],
    ['danger', 'danger'],
    ['accent', 'accent'],
  ] as const)('tone="%s" sets data-tone="%s"', (toneIn, toneOut) => {
    const { container } = render(<Switch aria-label="x" tone={toneIn} />);
    const track = container.querySelector('[data-tone]')!;
    expect(track).toHaveAttribute('data-tone', toneOut);
  });

  it('forwards ref to the <input> element', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Switch aria-label="x" ref={ref} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe('checkbox');
  });

  it('className is merged onto the wrapper, not replaced', () => {
    const { container } = render(
      <Switch aria-label="x" className="custom-wrap" />,
    );
    const wrapper = container.querySelector('label')!;
    expect(wrapper.className).toMatch(/custom-wrap/);
    expect(wrapper.className).toMatch(/wrapper/);
  });

  it('role="switch" is set on the input', () => {
    render(<Switch aria-label="x" />);
    const input = screen.getByRole('switch');
    expect(input).toHaveAttribute('role', 'switch');
  });

  it('the native input has type="checkbox"', () => {
    render(<Switch aria-label="x" />);
    const input = screen.getByRole('switch') as HTMLInputElement;
    expect(input.type).toBe('checkbox');
  });

  // ─── State ─────────────────────────────────────────────────────────────

  it('controlled: checked={true} reflects in the input AND data-checked on track', () => {
    const { container } = render(
      <Switch aria-label="x" checked onChange={() => {}} />,
    );
    const input = screen.getByRole('switch') as HTMLInputElement;
    const track = container.querySelector('[data-tone]')!;
    expect(input.checked).toBe(true);
    expect(track).toHaveAttribute('data-checked', 'true');
  });

  it('controlled: clicking fires onChange with the next boolean (both directions)', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    function Controlled() {
      const [v, setV] = useState(false);
      return (
        <Switch
          aria-label="x"
          checked={v}
          onChange={(next, e) => {
            handleChange(next, e);
            setV(next);
          }}
        />
      );
    }
    render(<Controlled />);
    const input = screen.getByRole('switch');
    await user.click(input);
    expect(handleChange).toHaveBeenLastCalledWith(true, expect.objectContaining({ target: expect.anything() }));
    await user.click(input);
    expect(handleChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ target: expect.anything() }));
  });

  it('uncontrolled: defaultChecked={true} starts checked', () => {
    const { container } = render(<Switch aria-label="x" defaultChecked />);
    const input = screen.getByRole('switch') as HTMLInputElement;
    const track = container.querySelector('[data-tone]')!;
    expect(input.checked).toBe(true);
    expect(track).toHaveAttribute('data-checked', 'true');
  });

  it('uncontrolled: defaultChecked={false} (or omitted) starts unchecked', () => {
    const { container } = render(<Switch aria-label="x" />);
    const input = screen.getByRole('switch') as HTMLInputElement;
    const track = container.querySelector('[data-tone]')!;
    expect(input.checked).toBe(false);
    expect(track).toHaveAttribute('data-checked', 'false');
  });

  it('uncontrolled: click toggles the input + flips data-checked', async () => {
    const user = userEvent.setup();
    const { container } = render(<Switch aria-label="x" />);
    const input = screen.getByRole('switch') as HTMLInputElement;
    const track = container.querySelector('[data-tone]')!;
    await user.click(input);
    expect(input.checked).toBe(true);
    expect(track).toHaveAttribute('data-checked', 'true');
  });

  it('disabled={true} sets disabled on the input AND blocks onChange', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch aria-label="x" disabled onChange={handleChange} />);
    const input = screen.getByRole('switch') as HTMLInputElement;
    expect(input).toBeDisabled();
    await user.click(input);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('Space-key toggles when the input is focused (uncontrolled)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Switch aria-label="x" />);
    const input = screen.getByRole('switch') as HTMLInputElement;
    input.focus();
    await user.keyboard(' ');
    expect(input.checked).toBe(true);
    const track = container.querySelector('[data-tone]')!;
    expect(track).toHaveAttribute('data-checked', 'true');
  });

  it('Space-key does NOT toggle when loading (input is disabled)', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch aria-label="x" loading onChange={handleChange} />);
    const input = screen.getByRole('switch') as HTMLInputElement;
    input.focus();
    await user.keyboard(' ');
    expect(input.checked).toBe(false);
    expect(handleChange).not.toHaveBeenCalled();
  });

  // ─── Loading ───────────────────────────────────────────────────────────

  it('loading={true} sets aria-busy="true" on the input', () => {
    render(<Switch aria-label="x" loading />);
    const input = screen.getByRole('switch');
    expect(input).toHaveAttribute('aria-busy', 'true');
  });

  it('loading={true} also disables the input (so clicks do not fire onChange)', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch aria-label="x" loading onChange={handleChange} />);
    const input = screen.getByRole('switch');
    expect(input).toBeDisabled();
    await user.click(input);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('loading={true} renders a spinner inside the thumb', () => {
    // The spinner is the Loader2 lucide icon; we identify it via the spin class.
    const { container } = render(<Switch aria-label="x" loading />);
    const spinner = container.querySelector('[class*="spin"]');
    expect(spinner).not.toBeNull();
  });

  it('loading={false} (default) does NOT render the spinner', () => {
    const { container } = render(<Switch aria-label="x" />);
    const spinner = container.querySelector('[class*="spin"]');
    expect(spinner).toBeNull();
  });

  // ─── Invalid ───────────────────────────────────────────────────────────

  it('invalid={true} sets aria-invalid="true" on the input', () => {
    render(<Switch aria-label="x" invalid />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-invalid', 'true');
  });

  it('invalid={true} sets data-invalid="true" on the track', () => {
    const { container } = render(<Switch aria-label="x" invalid />);
    const track = container.querySelector('[data-tone]')!;
    expect(track).toHaveAttribute('data-invalid', 'true');
  });

  it('invalid omitted does NOT set aria-invalid', () => {
    render(<Switch aria-label="x" />);
    expect(screen.getByRole('switch')).not.toHaveAttribute('aria-invalid');
  });
});
