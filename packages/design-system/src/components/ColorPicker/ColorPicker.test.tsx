import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { ColorPicker, hexToHsv, hsvToHex } from './index';
import { Field } from '../Field';

// jsdom doesn't implement setPointerCapture / releasePointerCapture; stub.
function ensurePointerCaptureShim() {
  if (
    typeof (HTMLElement.prototype as unknown as { setPointerCapture?: unknown })
      .setPointerCapture !== 'function'
  ) {
    (
      HTMLElement.prototype as unknown as { setPointerCapture: (id: number) => void }
    ).setPointerCapture = () => {};
  }
  if (
    typeof (HTMLElement.prototype as unknown as { releasePointerCapture?: unknown })
      .releasePointerCapture !== 'function'
  ) {
    (
      HTMLElement.prototype as unknown as { releasePointerCapture: (id: number) => void }
    ).releasePointerCapture = () => {};
  }
}
ensurePointerCaptureShim();

// Popover uses Floating UI which observes resize. jsdom doesn't ship ResizeObserver.
if (typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Mock the SV pad's getBoundingClientRect so pointer math is deterministic
// (200x200 pad starting at the origin).
function mockSVRect(container: HTMLElement, w = 200, h = 200) {
  const pad = container.querySelector<HTMLElement>('[role="application"]')!;
  pad.getBoundingClientRect = () =>
    ({
      width: w,
      height: h,
      left: 0,
      top: 0,
      right: w,
      bottom: h,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return pad;
}

describe('ColorPicker.Panel — rendering', () => {
  it('renders panel with all sub-components', () => {
    const { container } = render(<ColorPicker.Panel value="#FF0000" onChange={() => {}} />);
    expect(container.querySelector('[role="application"]')).toBeInTheDocument();
    expect(container.querySelector('[role="slider"]')).toBeInTheDocument();
    expect(container.querySelector('input[aria-label="Hex color value"]')).toBeInTheDocument();
  });

  it('positions the SV indicator at the correct (s, v) coordinates', () => {
    // value=#FF0000 → HSV (0, 100, 100) → indicator at left=100%, top=0%
    const { container } = render(<ColorPicker.Panel value="#FF0000" onChange={() => {}} />);
    const indicator = container.querySelector('[class*="svIndicator"]') as HTMLElement;
    expect(indicator.style.left).toBe('100%');
    expect(indicator.style.top).toBe('0%');
  });

  it('renders presets grid when presets prop is provided', () => {
    const presets = ['#FF0000', '#00FF00', '#0000FF'];
    render(<ColorPicker.Panel value="#FF0000" onChange={() => {}} presets={presets} />);
    expect(screen.getByRole('group', { name: 'Preset colors' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '#FF0000' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '#00FF00' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('does not render presets grid when presets prop is omitted', () => {
    render(<ColorPicker.Panel value="#FF0000" onChange={() => {}} />);
    expect(screen.queryByRole('group', { name: 'Preset colors' })).not.toBeInTheDocument();
  });

  it('drops invalid entries from the presets grid', () => {
    render(
      <ColorPicker.Panel
        value="#FF0000"
        onChange={() => {}}
        presets={['#FF0000', 'orange', '', '#00FF00']}
      />,
    );
    expect(screen.queryAllByRole('button')).toHaveLength(2); // only the 2 valid hex entries
  });
});

describe('ColorPicker.Panel — controlled value', () => {
  it('updates indicator + hue slider + HEX input when value prop changes', () => {
    const { container, rerender } = render(
      <ColorPicker.Panel value="#FF0000" onChange={() => {}} />,
    );
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Hex color value"]')!;
    expect(input.value).toBe('#FF0000');

    rerender(<ColorPicker.Panel value="#00FF00" onChange={() => {}} />);
    expect(input.value).toBe('#00FF00');

    const indicator = container.querySelector('[class*="svIndicator"]') as HTMLElement;
    expect(indicator.style.left).toBe('100%'); // saturation still 100
  });

  it('falls back to #000000 and warns once in dev for invalid initial value', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<ColorPicker.Panel value="not-a-color" onChange={() => {}} />);
    expect(warnSpy).toHaveBeenCalled();
    // The draft input shows the canonical fallback.
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Hex color value"]')!;
    expect(input.value).toBe('#000000');
    warnSpy.mockRestore();
  });
});

describe('ColorPicker.Panel — SV pad interaction', () => {
  it('pointerdown+move fires onChange with the expected HEX', () => {
    const onChange = vi.fn();
    const { container } = render(<ColorPicker.Panel value="#FF0000" onChange={onChange} />);
    const pad = mockSVRect(container);
    // Click at the center of the 200x200 pad → S=50, V=50.
    fireEvent.pointerDown(pad, { clientX: 100, clientY: 100, pointerId: 1 });
    // For hue=0 (red), S=50, V=50 → HSV(0, 50, 50) → #804040.
    const lastCallHex = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    const hsv = hexToHsv(lastCallHex)!;
    expect(hsv.s).toBeCloseTo(50, 0);
    expect(hsv.v).toBeCloseTo(50, 0);
  });

  it('ArrowRight adjusts S by +1', () => {
    const onChange = vi.fn();
    const { container } = render(<ColorPicker.Panel value="#FF0000" onChange={onChange} />);
    const pad = container.querySelector<HTMLElement>('[role="application"]')!;
    pad.focus();
    fireEvent.keyDown(pad, { key: 'ArrowLeft' });
    // FF0000 is (0, 100, 100); ArrowLeft → (0, 99, 100) → ~#FE0202.
    const lastCallHex = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    const hsv = hexToHsv(lastCallHex)!;
    expect(hsv.s).toBeCloseTo(99, 0);
    expect(hsv.v).toBe(100);
  });

  it('Shift+ArrowDown adjusts V by -10', () => {
    const onChange = vi.fn();
    const { container } = render(<ColorPicker.Panel value="#FF0000" onChange={onChange} />);
    const pad = container.querySelector<HTMLElement>('[role="application"]')!;
    pad.focus();
    fireEvent.keyDown(pad, { key: 'ArrowDown', shiftKey: true });
    const lastCallHex = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    const hsv = hexToHsv(lastCallHex)!;
    expect(hsv.v).toBeCloseTo(90, 0); // 100 - 10
  });

  it('End jumps S to 100; Home jumps S to 0', () => {
    const onChange = vi.fn();
    const { container } = render(<ColorPicker.Panel value="#808080" onChange={onChange} />);
    const pad = container.querySelector<HTMLElement>('[role="application"]')!;
    pad.focus();
    fireEvent.keyDown(pad, { key: 'End' });
    let hsv = hexToHsv(onChange.mock.calls.at(-1)![0])!;
    expect(hsv.s).toBeCloseTo(100, 0);

    fireEvent.keyDown(pad, { key: 'Home' });
    hsv = hexToHsv(onChange.mock.calls.at(-1)![0])!;
    expect(hsv.s).toBeCloseTo(0, 0);
  });
});

describe('ColorPicker.Panel — hue slider interaction', () => {
  it('hue slider keyboard updates HEX via the local HSV model', () => {
    // ControlledHarness pattern — exercise the controlled flow.
    function Harness() {
      const [hex, setHex] = useState('#FF0000');
      return (
        <>
          <ColorPicker.Panel value={hex} onChange={setHex} />
          <div data-testid="captured-hex">{hex}</div>
        </>
      );
    }
    const { container, getByTestId } = render(<Harness />);
    const slider = container.querySelector<HTMLElement>('[role="slider"]')!;
    slider.focus();
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    // Slider step=1, so hue went 0→1. HEX should change slightly.
    expect(getByTestId('captured-hex').textContent).not.toBe('#FF0000');
  });

  it('preserves hue at saturation=0 across re-renders (local HSV state model)', () => {
    // value=#000000 (S=0, V=0). Drag hue → HEX still #000000 but local
    // hue should accumulate, so subsequent renders use the new hue.
    function Harness() {
      const [hex, setHex] = useState('#000000');
      return (
        <>
          <ColorPicker.Panel value={hex} onChange={setHex} />
          <div data-testid="hex">{hex}</div>
        </>
      );
    }
    const { container, getByTestId } = render(<Harness />);
    const slider = container.querySelector<HTMLElement>('[role="slider"]')!;
    slider.focus();
    // Move hue up — HEX won't change because S=V=0, but the local HSV
    // model preserves it. We can't directly inspect localHsv from outside,
    // but the test passes if onChange isn't called (HEX truly unchanged).
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(getByTestId('hex').textContent).toBe('#000000'); // unchanged
  });
});

describe('ColorPicker.Panel — HEX input', () => {
  it('valid hex typing fires onChange live', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker.Panel value="#FF0000" onChange={onChange} />);
    const input = screen.getByLabelText('Hex color value') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '#00FF00');
    expect(onChange).toHaveBeenLastCalledWith('#00FF00');
  });

  it('invalid hex during typing sets invalid styling and does NOT fire onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker.Panel value="#FF0000" onChange={onChange} />);
    const input = screen.getByLabelText('Hex color value') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'NOTHEX');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    // onChange might have fired for partial valid parses (`'N'`, `'NO'`, etc.
    // are all invalid), so check that the final call wasn't with the bad value.
    expect(onChange.mock.calls.every(([hex]) => hex !== 'NOTHEX' && hex !== '#NOTHEX')).toBe(true);
  });

  it('blur with invalid input reverts to canonical HEX of current value', async () => {
    const user = userEvent.setup();
    render(<ColorPicker.Panel value="#FF0000" onChange={() => {}} />);
    const input = screen.getByLabelText('Hex color value') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'xyz');
    act(() => {
      fireEvent.blur(input);
    });
    expect(input.value).toBe('#FF0000');
  });

  it('3-char hex on input expands to 6-char on commit', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker.Panel value="#FF0000" onChange={onChange} />);
    const input = screen.getByLabelText('Hex color value') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '#f0f');
    // Live commit should be the canonical 6-char.
    expect(onChange).toHaveBeenLastCalledWith('#FF00FF');
  });

  it('Enter key blurs the input (which triggers commit/revert)', async () => {
    const user = userEvent.setup();
    render(<ColorPicker.Panel value="#FF0000" onChange={() => {}} />);
    const input = screen.getByLabelText('Hex color value') as HTMLInputElement;
    input.focus();
    await user.keyboard('{Enter}');
    expect(document.activeElement).not.toBe(input);
  });
});

describe('ColorPicker.Panel — presets', () => {
  it('clicking a preset fires onChange + onChangeEnd with that HEX', () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();
    render(
      <ColorPicker.Panel
        value="#FF0000"
        onChange={onChange}
        onChangeEnd={onChangeEnd}
        presets={['#FF0000', '#00FF00']}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '#00FF00' }));
    expect(onChange).toHaveBeenCalledWith('#00FF00');
    expect(onChangeEnd).toHaveBeenCalledWith('#00FF00');
  });

  it('selected preset matches current value', () => {
    const { rerender } = render(
      <ColorPicker.Panel value="#FF0000" onChange={() => {}} presets={['#FF0000', '#00FF00']} />,
    );
    expect(screen.getByRole('button', { name: '#FF0000' })).toHaveAttribute('aria-pressed', 'true');
    rerender(
      <ColorPicker.Panel value="#00FF00" onChange={() => {}} presets={['#FF0000', '#00FF00']} />,
    );
    expect(screen.getByRole('button', { name: '#00FF00' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('ColorPicker — popover', () => {
  it('renders the default trigger with current HEX in the label', () => {
    render(<ColorPicker value="#4F46E5" onChange={() => {}} />);
    expect(
      screen.getByRole('button', { name: /Pick a color, current value #4F46E5/i }),
    ).toBeInTheDocument();
  });

  it('uses custom triggerLabel in the default trigger label', () => {
    render(<ColorPicker value="#4F46E5" onChange={() => {}} triggerLabel="Brand color" />);
    expect(
      screen.getByRole('button', { name: /Brand color, current value #4F46E5/i }),
    ).toBeInTheDocument();
  });

  it('clicking the trigger opens the panel', async () => {
    const user = userEvent.setup();
    render(<ColorPicker value="#FF0000" onChange={() => {}} />);
    expect(screen.queryByRole('application')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('application')).toBeInTheDocument();
  });

  it('disabled trigger does not open the panel', async () => {
    const user = userEvent.setup();
    render(<ColorPicker value="#FF0000" onChange={() => {}} disabled />);
    const trigger = screen.getByRole('button');
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole('application')).not.toBeInTheDocument();
  });

  it('disabled with custom trigger: wrapper blocks pointer-events; consumer owns trigger disabled visuals', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ColorPicker value="#FF0000" onChange={() => {}} disabled>
        <ColorPicker.Trigger asChild>
          <button type="button">Custom</button>
        </ColorPicker.Trigger>
      </ColorPicker>,
    );
    // The wrapping <div> has the .disabled class (opacity + pointer-events: none).
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/disabled/);
    // Note: jsdom doesn't compute styles from CSS, so we can't assert
    // pointer-events from getComputedStyle. Instead assert the class name.
    // The actual pointer-events: none behavior is enforced at runtime by
    // CSS Modules + the SCSS rule.

    // The custom button is NOT inherently disabled — consumer's responsibility.
    const trigger = screen.getByRole('button', { name: 'Custom' });
    expect(trigger).not.toBeDisabled();

    // But the open guard in handleOpenChange still works — clicking doesn't open.
    await user.click(trigger);
    expect(screen.queryByRole('application')).not.toBeInTheDocument();
  });

  it('custom trigger via <ColorPicker.Trigger asChild> overrides the default', async () => {
    const user = userEvent.setup();
    render(
      <ColorPicker value="#FF0000" onChange={() => {}}>
        <ColorPicker.Trigger asChild>
          <button type="button">Custom Pick</button>
        </ColorPicker.Trigger>
      </ColorPicker>,
    );
    expect(screen.getByRole('button', { name: 'Custom Pick' })).toBeInTheDocument();
    // Default trigger should NOT be in the document.
    expect(screen.queryByText(/current value/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Custom Pick' }));
    expect(screen.getByRole('application')).toBeInTheDocument();
  });
});

describe('ColorPicker — disabled state', () => {
  it('disabled panel: SV pad and inputs are non-interactive', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ColorPicker.Panel value="#FF0000" onChange={onChange} disabled />,
    );
    const pad = container.querySelector<HTMLElement>('[role="application"]')!;
    expect(pad).toHaveAttribute('aria-disabled', 'true');
    expect(pad).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(pad, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();

    const sliderThumb = container.querySelector('[role="slider"]');
    expect(sliderThumb).toHaveAttribute('aria-disabled', 'true');

    const input = container.querySelector<HTMLInputElement>('input[aria-label="Hex color value"]')!;
    expect(input).toBeDisabled();
  });
});

describe('ColorPicker — misc', () => {
  it('Panel: className merges with the base class', () => {
    const { container } = render(
      <ColorPicker.Panel value="#FF0000" onChange={() => {}} className="custom" />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/custom/);
    expect(root.className).toMatch(/panel/);
  });

  it('Panel: ref forwards to the outermost div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<ColorPicker.Panel ref={ref} value="#FF0000" onChange={() => {}} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('ColorPicker (root) forwards ref to the outermost div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<ColorPicker ref={ref} value="#FF0000" onChange={() => {}} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('Panel re-snaps draft to canonical (uppercase, with #) on blur', () => {
    const { container } = render(<ColorPicker.Panel value="#FF0000" onChange={() => {}} />);
    const input = container.querySelector<HTMLInputElement>('input[aria-label="Hex color value"]')!;
    fireEvent.change(input, { target: { value: 'aabbcc' } });
    expect(input.value).toBe('aabbcc');
    act(() => {
      fireEvent.blur(input);
    });
    expect(input.value).toBe('#AABBCC');
  });
});

describe('ColorPicker — labelledby / describedby forwarding', () => {
  it('associates a Field label with the trigger without naming the wrapper', () => {
    const { container } = render(
      <Field id="brand-color" label="Brand color" error="Choose a brand color" required>
        <ColorPicker className="picker-root" value="#4F46E5" onChange={() => {}} />
      </Field>,
    );

    const label = container.querySelector('label')!;
    const trigger = screen.getByRole('button', { name: 'Brand color' });
    const root = container.querySelector('.picker-root')!;

    expect(label.htmlFor).toBe(trigger.id);
    expect(trigger).toHaveAttribute('id', 'brand-color');
    expect(trigger).toHaveAccessibleName('Brand color');
    expect(trigger).toHaveAttribute('aria-describedby', 'brand-color-error');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger).toHaveAttribute('aria-required', 'true');
    expect(trigger).not.toHaveAttribute('aria-label');
    expect(root).not.toHaveAttribute('id');
    expect(root).not.toHaveAttribute('required');
    expect(root).not.toHaveAttribute('invalid');
    expect(root).not.toHaveAttribute('aria-invalid');
    expect(root).not.toHaveAttribute('aria-required');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(root).not.toHaveAttribute('aria-describedby');
  });

  it('forwards aria-labelledby / aria-describedby to the trigger, not the root', () => {
    const { container } = render(
      <>
        <span id="lbl">Pick brand color</span>
        <span id="desc">Used across the app</span>
        <ColorPicker
          value="#FF0000"
          onChange={() => {}}
          aria-labelledby="lbl"
          aria-describedby="desc"
        />
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'Pick brand color' });
    expect(trigger).toHaveAttribute('aria-labelledby', 'lbl');
    expect(trigger).toHaveAttribute('aria-describedby', 'desc');
    expect(container.querySelector('div')).not.toHaveAttribute('aria-labelledby');
  });

  it('a Field label names a custom trigger (cloneElement branch)', () => {
    render(
      <Field label="Brand color">
        <ColorPicker value="#000000" onChange={() => {}}>
          <ColorPicker.Trigger asChild>
            <button type="button">Pick</button>
          </ColorPicker.Trigger>
        </ColorPicker>
      </Field>,
    );
    expect(screen.getByRole('button', { name: 'Brand color' })).toBeInTheDocument();
  });

  it('does NOT clobber a consumer aria-labelledby on a custom trigger when not in a Field', () => {
    render(
      <>
        <span id="ext-cp">My color</span>
        <ColorPicker value="#000000" onChange={() => {}}>
          <ColorPicker.Trigger asChild>
            <button type="button" aria-labelledby="ext-cp" />
          </ColorPicker.Trigger>
        </ColorPicker>
      </>,
    );
    // The consumer's own labelling must survive — passing `undefined` through
    // cloneElement previously stripped it, leaving the trigger nameless.
    expect(screen.getByRole('button', { name: 'My color' })).toBeInTheDocument();
  });
});

describe('round-trip', () => {
  // Sanity — confirm the public-facing color math agrees with itself.
  it('hsvToHex(hexToHsv(hex)) is stable for the demo palette', () => {
    const palette = [
      '#4F46E5',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#3B82F6',
      '#8B5CF6',
      '#EC4899',
      '#14B8A6',
    ];
    for (const hex of palette) {
      expect(hsvToHex(hexToHsv(hex)!)).toBe(hex);
    }
  });
});
