import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OtpInput } from './OtpInput';

const boxes = () => screen.getAllByRole('textbox') as HTMLInputElement[];
const codeOf = () =>
  boxes()
    .map((b) => b.value)
    .join('');

describe('OtpInput', () => {
  it('renders six boxes by default', () => {
    render(<OtpInput />);
    expect(boxes()).toHaveLength(6);
  });

  it('renders `length` boxes', () => {
    render(<OtpInput length={4} />);
    expect(boxes()).toHaveLength(4);
  });

  it('renders the mobile one-time-code autofill hints on every box', () => {
    render(<OtpInput length={3} />);
    for (const box of boxes()) {
      expect(box).toHaveAttribute('autocomplete', 'one-time-code');
      expect(box).toHaveAttribute('inputmode', 'numeric');
      expect(box).toHaveAttribute('pattern', '[0-9]*');
      expect(box).toHaveAttribute('type', 'text');
    }
  });

  it('switches inputmode and drops the numeric pattern in alphanumeric mode', () => {
    render(<OtpInput length={3} type="alphanumeric" />);
    for (const box of boxes()) {
      expect(box).toHaveAttribute('inputmode', 'text');
      expect(box).not.toHaveAttribute('pattern');
    }
  });

  it('applies the size class to every cell', () => {
    const { container } = render(<OtpInput length={2} size="lg" />);
    for (const box of boxes()) {
      expect(box.className).toMatch(/size-lg/);
    }
    expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
  });

  it('marks every cell invalid', () => {
    render(<OtpInput length={3} invalid />);
    for (const box of boxes()) {
      expect(box).toHaveAttribute('aria-invalid', 'true');
      expect(box.className).toMatch(/invalid/);
    }
  });

  it('disables every cell', () => {
    render(<OtpInput length={3} disabled />);
    for (const box of boxes()) expect(box).toBeDisabled();
  });

  it('forwards ref to the wrapper div', () => {
    let node: HTMLDivElement | null = null;
    render(
      <OtpInput
        length={2}
        ref={(n) => {
          node = n;
        }}
      />,
    );
    expect(node).toBeInstanceOf(HTMLDivElement);
    expect(node).toHaveAttribute('role', 'group');
  });

  it('merges className instead of replacing it', () => {
    const { container } = render(<OtpInput length={2} className="mine" />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('mine');
    expect(root.className.split(' ').length).toBeGreaterThan(1);
  });

  it('names the group from the default message, then aria-label, then aria-labelledby', () => {
    const { rerender, container } = render(<OtpInput length={2} />);
    const root = () => container.firstChild as HTMLElement;
    expect(root()).toHaveAttribute('aria-label', 'Verification code');

    rerender(<OtpInput length={2} aria-label="Enter the code" />);
    expect(root()).toHaveAttribute('aria-label', 'Enter the code');

    rerender(<OtpInput length={2} aria-label="Enter the code" aria-labelledby="lbl" />);
    expect(root()).toHaveAttribute('aria-labelledby', 'lbl');
    expect(root()).not.toHaveAttribute('aria-label');
  });

  it('names each cell by position, per type', () => {
    const { rerender } = render(<OtpInput length={3} />);
    expect(screen.getByLabelText('Digit 1 of 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Digit 3 of 3')).toBeInTheDocument();

    rerender(<OtpInput length={3} type="alphanumeric" />);
    expect(screen.getByLabelText('Character 2 of 3')).toBeInTheDocument();
  });

  it('describes every cell so the error is heard wherever focus lands', () => {
    render(<OtpInput length={3} aria-describedby="err" />);
    for (const box of boxes()) expect(box).toHaveAttribute('aria-describedby', 'err');
  });

  it('puts id and required on the first cell only', () => {
    render(<OtpInput length={3} id="code" required />);
    const [first, second] = boxes();
    expect(first).toHaveAttribute('id', 'code');
    expect(first).toBeRequired();
    expect(second).not.toHaveAttribute('id');
    expect(second).not.toBeRequired();
  });

  it('seeds the boxes from defaultValue', () => {
    render(<OtpInput length={4} defaultValue="1234" />);
    expect(codeOf()).toBe('1234');
  });

  it('sanitizes and truncates an over-long or dirty value', () => {
    render(<OtpInput length={4} value="1a2b3c4d5" onChange={() => {}} />);
    expect(codeOf()).toBe('1234');
  });

  it('uppercases in alphanumeric mode', () => {
    render(<OtpInput length={4} type="alphanumeric" defaultValue="ab12" />);
    expect(codeOf()).toBe('AB12');
  });

  it('advances focus as each digit is typed', async () => {
    const user = userEvent.setup();
    render(<OtpInput length={4} />);
    await user.click(boxes()[0]!);
    await user.keyboard('12');
    expect(codeOf()).toBe('12');
    expect(boxes()[2]).toHaveFocus();
  });

  it('rejects non-digits in numeric mode', async () => {
    const user = userEvent.setup();
    render(<OtpInput length={4} />);
    await user.click(boxes()[0]!);
    await user.keyboard('a1');
    expect(codeOf()).toBe('1');
  });

  it('accepts and uppercases letters in alphanumeric mode', async () => {
    const user = userEvent.setup();
    render(<OtpInput length={4} type="alphanumeric" />);
    await user.click(boxes()[0]!);
    await user.keyboard('a1');
    expect(codeOf()).toBe('A1');
  });

  it('replaces in place when typing into an already-filled box', async () => {
    const user = userEvent.setup();
    render(<OtpInput length={4} defaultValue="1234" />);
    await user.click(boxes()[1]!);
    await user.keyboard('9');
    expect(codeOf()).toBe('1934');
  });

  it('distributes a pasted code across the boxes and lands on the last one', async () => {
    const user = userEvent.setup();
    render(<OtpInput length={6} />);
    await user.click(boxes()[0]!);
    await user.paste('123456');
    expect(codeOf()).toBe('123456');
    expect(boxes()[5]).toHaveFocus();
  });

  it('fills from the focused box onward and truncates an over-long paste', async () => {
    const user = userEvent.setup();
    render(<OtpInput length={6} defaultValue="12" />);
    await user.click(boxes()[2]!);
    await user.paste('34567890');
    expect(codeOf()).toBe('123456');
  });

  it('round-trips a controlled value', async () => {
    function Controlled() {
      const [code, setCode] = useState('');
      return (
        <>
          <OtpInput length={4} value={code} onChange={setCode} />
          <output>{code}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(boxes()[0]!);
    await user.keyboard('42');
    expect(screen.getByRole('status')).toHaveTextContent('42');
    expect(codeOf()).toBe('42');
  });

  it('fires onComplete once on the transition to full', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<OtpInput length={3} onComplete={onComplete} />);
    await user.click(boxes()[0]!);
    await user.keyboard('12');
    expect(onComplete).not.toHaveBeenCalled();
    await user.keyboard('3');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('123');
  });

  it('does not re-fire onComplete when a character inside a full code is replaced', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<OtpInput length={3} defaultValue="123" onComplete={onComplete} />);
    await user.click(boxes()[0]!);
    await user.keyboard('9');
    expect(codeOf()).toBe('923');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('clears from the focused box onward when its content is deleted', async () => {
    const user = userEvent.setup();
    render(<OtpInput length={5} defaultValue="12345" />);
    await user.click(boxes()[2]!);
    await user.keyboard('{Backspace}');
    expect(codeOf()).toBe('12');
    expect(boxes()[2]).toHaveFocus();
  });

  it('backspace on an empty box clears the previous one and moves focus back', async () => {
    const user = userEvent.setup();
    render(<OtpInput length={4} defaultValue="12" />);
    await user.click(boxes()[2]!);
    await user.keyboard('{Backspace}');
    expect(codeOf()).toBe('1');
    expect(boxes()[1]).toHaveFocus();
  });

  it('backspace on the first, empty box does nothing', async () => {
    const user = userEvent.setup();
    render(<OtpInput length={4} />);
    await user.click(boxes()[0]!);
    await user.keyboard('{Backspace}');
    expect(codeOf()).toBe('');
    expect(boxes()[0]).toHaveFocus();
  });

  it('moves focus with the arrow keys without wrapping', async () => {
    const user = userEvent.setup();
    render(<OtpInput length={4} defaultValue="1234" />);
    await user.click(boxes()[0]!);
    await user.keyboard('{ArrowLeft}');
    expect(boxes()[0]).toHaveFocus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(boxes()[2]).toHaveFocus();
  });

  it('Home and End jump to the first and last reachable box', async () => {
    const user = userEvent.setup();
    render(<OtpInput length={5} defaultValue="12" />);
    await user.click(boxes()[0]!);
    await user.keyboard('{End}');
    // Only boxes up to the first empty one are reachable.
    expect(boxes()[2]).toHaveFocus();
    await user.keyboard('{Home}');
    expect(boxes()[0]).toHaveFocus();
  });

  it('clicking past the first empty box redirects to it', async () => {
    const user = userEvent.setup();
    render(<OtpInput length={6} defaultValue="12" />);
    await user.click(boxes()[5]!);
    expect(boxes()[2]).toHaveFocus();
  });

  it('keeps exactly one box in the tab order', async () => {
    const user = userEvent.setup();
    const { container } = render(<OtpInput length={4} defaultValue="12" />);
    const tabbable = () => container.querySelectorAll('input[tabindex="0"]');
    expect(tabbable()).toHaveLength(1);
    expect(tabbable()[0]).toBe(boxes()[2]);

    await user.click(boxes()[0]!);
    expect(tabbable()).toHaveLength(1);
    expect(tabbable()[0]).toBe(boxes()[0]);
  });
});
