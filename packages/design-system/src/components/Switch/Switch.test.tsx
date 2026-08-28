import { renderToStaticMarkup } from 'react-dom/server';
import { createRef, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
    const { container } = render(<Switch aria-label="x" className="custom-wrap" />);
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
    const { container } = render(<Switch aria-label="x" checked onChange={() => {}} />);
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
    expect(handleChange).toHaveBeenLastCalledWith(
      true,
      expect.objectContaining({ target: expect.anything() }),
    );
    await user.click(input);
    expect(handleChange).toHaveBeenLastCalledWith(
      false,
      expect.objectContaining({ target: expect.anything() }),
    );
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

  // ─── Loading ───────────────────────────────────────────────────────────

  it('loading keeps an uncontrolled input focused while blocking pointer and Space changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch aria-label="x" loading onChange={handleChange} />);
    const input = screen.getByRole('switch') as HTMLInputElement;

    expect(input).not.toBeDisabled();
    expect(input).toHaveAttribute('aria-busy', 'true');

    input.focus();
    expect(input).toHaveFocus();
    await user.click(input);
    expect(input).toHaveFocus();
    expect(input.checked).toBe(false);

    await user.keyboard(' ');
    expect(input).toHaveFocus();
    expect(input.checked).toBe(false);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('loading keeps a controlled input checked while blocking pointer and Space changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Switch aria-label="x" loading checked onChange={handleChange} />);
    const input = screen.getByRole('switch') as HTMLInputElement;

    input.focus();
    await user.click(input);
    expect(input).toHaveFocus();
    expect(input.checked).toBe(true);

    await user.keyboard(' ');
    expect(input).toHaveFocus();
    expect(input.checked).toBe(true);
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

describe('loading state reaches assistive tech (#488)', () => {
  it('announces from a live region rather than aria-busy alone', () => {
    const { rerender, container } = render(<Switch loading={false}>Mute</Switch>);
    const region = container.querySelector('[role="status"][aria-live="polite"]');
    // Rendered unconditionally and empty, so the announcement fires on the
    // TEXT change. Mounting region and text together is the unreliable case.
    expect(region).not.toBeNull();
    expect(region!.textContent).toBe('');
    rerender(<Switch loading>Mute</Switch>);
    expect(region!.textContent).toBe('Saving…');
  });

  it('does not mutate the accessible name when it goes busy', () => {
    // Queried BY NAME, not by reading aria-label. The first version of this
    // test compared `getAttribute('aria-label')` before and after — <Switch>
    // never sets one, so it asserted null === null and passed while the
    // component measurably renamed itself to "MuteSaving…". Testing the
    // mechanism instead of the outcome is how the bug shipped past its guard.
    const { rerender, getByRole } = render(<Switch loading={false}>Mute</Switch>);
    expect(getByRole('switch', { name: 'Mute' })).not.toBeNull();
    rerender(<Switch loading>Mute</Switch>);
    // The user is focused on the control they just activated, so this is a
    // change to announce — not a property of something they arrived at.
    expect(getByRole('switch', { name: 'Mute' })).not.toBeNull();
  });
});

it('mounts the region EMPTY, so the word always arrives as a change', () => {
  // Server render runs the render pass and NOT effects, so this is literally
  // the first-paint DOM. That is the only way to observe the deferral: RTL's
  // render() flushes passive effects inside act(), so by the time a test reads
  // the region the effect has landed — and the old render-time version
  // produced the same final text. The previous version of this test passed
  // against the exact bug it was written to pin.
  const html = renderToStaticMarkup(<Switch loading>Mute</Switch>);
  // Asserted as an EMPTY element, not as "does not contain the word". The
  // word-based form went blind the moment anyone renamed the i18n string:
  // review verified that reverting the deferral AND renaming `switch.busy`
  // made this pass against the very bug it pins. This shape cannot be
  // satisfied by a rename, and it also pins `aria-live="polite"`.
  //
  // Load-bearing pair: this asserts the region mounts EMPTY, and the sibling
  // test below asserts the word then arrives. Delete the text binding entirely
  // and this one still passes — it certifies the first half only. Weaken the
  // sibling and the pair degrades back to the vacuous state both were written
  // to escape.
  const region = new DOMParser()
    .parseFromString(html, 'text/html')
    .querySelector('[role="status"]');
  expect(region, 'the region exists on first paint').not.toBeNull();
  expect(region!.getAttribute('aria-live')).toBe('polite');
  expect(region!.textContent).toBe('');
});

it('announces even when it mounts already loading', async () => {
  // Mounting region and text together is the case Hard rule 10 forbids: most
  // screen readers do not announce content that was already present when the
  // region appeared. The text is deferred one tick so the word always arrives
  // as a change, including on a route remount or a virtualized row scrolling
  // back into view mid-flight.
  const { container } = render(<Switch loading>Mute</Switch>);
  const region = container.querySelector('[role="status"][aria-live="polite"]');
  expect(region).not.toBeNull();
  await waitFor(() => expect(region!.textContent).toBe('Saving…'));
});
