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
    render(<OtpInput length={2} size="lg" />);
    for (const box of boxes()) {
      expect(box.className).toMatch(/size-lg/);
    }
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

  it('puts id on the first cell only, and aria-required on every cell', () => {
    const { container } = render(<OtpInput length={3} id="code" required />);
    const [first, second] = boxes();
    expect(first).toHaveAttribute('id', 'code');
    expect(second).not.toHaveAttribute('id');
    // role="group" does not support aria-required (ARIA 1.2 permits it only
    // on textbox and a few other roles), so it goes on the cells instead —
    // same placement as aria-invalid and aria-describedby.
    expect(container.firstChild).not.toHaveAttribute('aria-required');
    for (const box of boxes()) expect(box).toHaveAttribute('aria-required', 'true');
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

  it('leaves a filled code alone when a rejected character overtypes a cell', async () => {
    // Regression: "sanitizes to empty" was treated as "the cell was
    // cleared", but a character the sanitizer rejects also sanitizes to
    // empty. A rejected keystroke must be a no-op, not a truncation.
    const user = userEvent.setup();
    render(<OtpInput length={4} defaultValue="1234" />);
    await user.click(boxes()[1]!);
    await user.keyboard('a');
    expect(codeOf()).toBe('1234');
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

  it('replaces rather than swallows when overtyping the box focus just landed on', async () => {
    // Regression: focus() on an already-focused cell fires no focus event, so
    // the select-on-focus that turns a keystroke into a replacement has to
    // come from somewhere else too, or the very next keystroke into the cell
    // typing just advanced into gets silently absorbed and discarded.
    const user = userEvent.setup();
    render(<OtpInput length={4} />);
    await user.click(boxes()[0]!);
    await user.keyboard('1234');
    expect(codeOf()).toBe('1234');
    expect(boxes()[3]).toHaveFocus();
    await user.keyboard('9');
    expect(codeOf()).toBe('1239');
    expect(boxes()[3]).toHaveFocus();
  });

  it('stays receptive after retyping the character a cell already holds', async () => {
    // Regression: retyping the same character leaves the DOM value
    // byte-identical, so React's value tracker fires no change event —
    // nothing re-selects, and the caret is left collapsed. Every keystroke
    // after that must still land rather than silently appending and being
    // sliced back off.
    const user = userEvent.setup();
    render(<OtpInput length={4} defaultValue="1234" />);
    await user.click(boxes()[3]!);
    await user.keyboard('4');
    expect(codeOf()).toBe('1234');
    await user.keyboard('9');
    expect(codeOf()).toBe('1239');
  });

  it('replaces on every keystroke in a row when overtyping, even when sanitizing transforms the character', async () => {
    // Regression: sanitizing (uppercasing here) makes the committed value
    // differ from the raw DOM value, so React DOES write node.value on the
    // next render and collapses whatever selection was made before that
    // commit. A second overtype keystroke right after the first must still
    // land. Coverage note: `handleKeyDown`'s own select-on-every-printable-
    // keydown already makes this pass even with the `useLayoutEffect`
    // re-select deleted — that effect's unique coverage is the
    // external-controlled-value case in "re-selects a focused cell when a
    // controlled value changes externally" below, not this test.
    const user = userEvent.setup();
    render(<OtpInput length={4} type="alphanumeric" defaultValue="ABCD" />);
    await user.click(boxes()[3]!);
    await user.keyboard('b');
    expect(codeOf()).toBe('ABCB');
    await user.keyboard('c');
    expect(codeOf()).toBe('ABCC');
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

  it('replaces the whole value when a full-length delivery lands in a non-first box', async () => {
    // B2 regression: SMS/email autofill fills whichever box happens to be
    // focused, not necessarily box 0. A user who started typing before the
    // message arrived must not get the delivered code spliced into their
    // partial entry at that position — a delivery of exactly `length`
    // characters IS the code, arriving wherever the platform decided to
    // drop it.
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<OtpInput length={6} defaultValue="123" onComplete={onComplete} />);
    await user.click(boxes()[3]!);
    await user.paste('987654');
    expect(codeOf()).toBe('987654');
    expect(boxes()[5]).toHaveFocus();
    expect(onComplete).toHaveBeenCalledWith('987654');
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

  it('re-fires onComplete when correcting a character inside a full code changes it', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<OtpInput length={3} defaultValue="123" onComplete={onComplete} />);
    await user.click(boxes()[0]!);
    await user.keyboard('9');
    expect(codeOf()).toBe('923');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('923');
  });

  it('does not re-fire onComplete when the sanitized value matches even though the raw keystroke differs', async () => {
    // Regression: the previous version of this test retyped the exact same
    // character over a selected cell, which fires ZERO change events (React's
    // value tracker sees no DOM diff) — `commit` never runs, so it can't
    // exercise the `next !== code` guard at all. This one reaches `commit`
    // with a raw keystroke ('a') that differs from the DOM value ('A') but
    // sanitizes back to the same code, so the guard is what suppresses it.
    const onChange = vi.fn();
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(
      <OtpInput
        length={3}
        type="alphanumeric"
        defaultValue="ABC"
        onChange={onChange}
        onComplete={onComplete}
      />,
    );
    await user.click(boxes()[0]!);
    await user.keyboard('a');
    expect(onChange).toHaveBeenCalledWith('ABC');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not re-fire onComplete when pasting the code already there', async () => {
    // Same guard, reached via the paste path instead of a keystroke.
    const onChange = vi.fn();
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<OtpInput length={3} defaultValue="123" onChange={onChange} onComplete={onComplete} />);
    await user.click(boxes()[0]!);
    await user.paste('123');
    expect(onChange).toHaveBeenCalledWith('123');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('re-fires onComplete when fixing the last digit of a wrong full code', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    render(<OtpInput length={6} onComplete={onComplete} />);
    await user.click(boxes()[0]!);
    await user.keyboard('123455');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('123455');
    await user.click(boxes()[5]!);
    await user.keyboard('6');
    expect(codeOf()).toBe('123456');
    expect(onComplete).toHaveBeenCalledTimes(2);
    expect(onComplete).toHaveBeenLastCalledWith('123456');
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

  it('clamps the roving tabindex when a controlled value shrinks without moving focus', async () => {
    // No Tab/Arrow/click moves focus here — the DOM focus stays on box 4
    // throughout. This isolates the `Math.min(focusedIndex, lastReachable)`
    // clamp itself: nothing else in the component could make it pass.
    const user = userEvent.setup();
    const { container, rerender } = render(
      <OtpInput length={5} value="1234" onChange={() => {}} />,
    );
    const tabbable = () => container.querySelectorAll('input[tabindex="0"]');
    await user.click(boxes()[4]!);
    expect(tabbable()[0]).toBe(boxes()[4]);

    // Parent resets the code externally (e.g. after a failed verification).
    rerender(<OtpInput length={5} value="1" onChange={() => {}} />);
    expect(tabbable()).toHaveLength(1);
    expect(tabbable()[0]).toBe(boxes()[1]);
  });

  it('pulls focus back into range after a controlled value shrinks under a focused cell', async () => {
    // B1 regression: the standard "clear the code after a failed
    // verification" reset shrinks `value` while DOM focus stays on whatever
    // cell the user was on — `lastReachable` moves but nothing moves DOM
    // focus. A keystroke from that stranded cell must pull focus back into
    // range, not stay stuck outputting into the wrong box forever. The
    // `codeOf()` assertion below is a regression guard, not the proof: at an
    // out-of-range index the splice is already a value no-op, so only the
    // focus assertion can fail without the clamp.
    function Controlled() {
      const [code, setCode] = useState('123456');
      return (
        // Fires the reset from a keydown on the field itself (capture phase,
        // so it runs before OtpInput's own handler) rather than a click on a
        // separate button, so DOM focus is left exactly where a real
        // parent-driven reset would leave it: on the cell the user was on.
        <div
          onKeyDownCapture={(event) => {
            if (event.key === 'F2') setCode('');
          }}
        >
          <OtpInput length={6} value={code} onChange={setCode} />
        </div>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(boxes()[5]!);
    await user.keyboard('{F2}');
    expect(codeOf()).toBe('');
    expect(boxes()[5]).toHaveFocus();

    await user.keyboard('7');
    expect(codeOf()).toBe('7');
    expect(boxes()[1]).toHaveFocus();
  });

  it('clamps Backspace to where the code actually ends after a controlled value shrinks under a focused cell', async () => {
    // B1 sibling: the handleChange clamp above doesn't cover handleKeyDown.
    // Backspace reads `code` at the raw stranded index, and unlike the
    // splice in handleChange, `code.slice(0, index - 1)` at an out-of-range
    // index is a REAL out-of-range read that returns the whole code
    // unchanged — so without a matching clamp here, Backspace on a stranded
    // cell is a no-op that only steps focus back one dead cell at a time.
    function Controlled() {
      const [code, setCode] = useState('123456');
      return (
        <div
          onKeyDownCapture={(event) => {
            if (event.key === 'F2') setCode('1');
          }}
        >
          <OtpInput length={6} value={code} onChange={setCode} />
        </div>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(boxes()[5]!);
    await user.keyboard('{F2}');
    expect(codeOf()).toBe('1');
    expect(boxes()[5]).toHaveFocus();

    await user.keyboard('{Backspace}');
    expect(codeOf()).toBe('');
    expect(boxes()[0]).toHaveFocus();
  });

  it('re-selects a focused cell when a controlled value changes externally', async () => {
    // Load-bearing: a parent that rewrites `value` (e.g. correcting a digit
    // after a failed check) must land the focused cell SELECTED, not just
    // focused, so the next keystroke replaces its content instead of
    // appending onto it. Deliberately lands the rerender on a FILLED cell —
    // an empty cell's selectionStart/selectionEnd are both 0 regardless of
    // whether select() ever ran, which is exactly the shape of vacuous
    // assertion that let the rejected-character truncation bug ship.
    const user = userEvent.setup();
    const { rerender } = render(<OtpInput length={4} value="1234" onChange={() => {}} />);
    await user.click(boxes()[1]!);

    // Parent corrects a digit externally while box 1 stays focused and filled.
    rerender(<OtpInput length={4} value="1934" onChange={() => {}} />);
    const active = boxes()[1]!;
    expect(active).toHaveFocus();
    expect(active.value).toBe('9');
    expect(active.selectionStart).toBe(0);
    expect(active.selectionEnd).toBe(1);
  });

  it('does not let a consumer-supplied role clobber the group role', () => {
    // {...rest} is spread before role="group" specifically so the structural
    // ARIA contract can't be overridden — see the comment at the JSX root.
    const { container } = render(<OtpInput length={2} role="presentation" />);
    expect(container.firstChild).toHaveAttribute('role', 'group');
  });

  it('focuses the first box on mount when autoFocus is set', () => {
    render(<OtpInput length={4} autoFocus />);
    expect(boxes()[0]).toHaveFocus();
  });
});
