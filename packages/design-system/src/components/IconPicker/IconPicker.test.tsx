import { createRef, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconPicker, type IconPickerOption } from './IconPicker';

const options: IconPickerOption[] = [
  { value: 'flame', label: 'Flame', icon: <svg data-testid="flame-icon" /> },
  { value: 'zap', label: 'Lightning', icon: <svg data-testid="zap-icon" /> },
  { value: 'flag', label: 'Flag', icon: <svg data-testid="flag-icon" /> },
];

const eightOptions: IconPickerOption[] = [
  { value: 'one', label: 'One', icon: <svg /> },
  { value: 'two', label: 'Two', icon: <svg /> },
  { value: 'three', label: 'Three', icon: <svg /> },
  { value: 'four', label: 'Four', icon: <svg /> },
  { value: 'five', label: 'Five', icon: <svg /> },
  { value: 'six', label: 'Six', icon: <svg /> },
  { value: 'seven', label: 'Seven', icon: <svg /> },
  { value: 'eight', label: 'Eight', icon: <svg /> },
];

function ControlledIconPicker() {
  const [value, setValue] = useState('flame');
  return <IconPicker value={value} options={options} onChange={setValue} />;
}

it('renders the selected glyph and forwards root props and ref', () => {
  const ref = createRef<HTMLDivElement>();
  render(
    <IconPicker
      ref={ref}
      value="flame"
      options={options}
      onChange={() => {}}
      className="consumer"
      data-testid="root"
    />,
  );
  expect(ref.current).toBe(screen.getByTestId('root'));
  expect(ref.current).toHaveClass('consumer');
  expect(screen.getByTestId('flame-icon')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pick icon: Flame' })).toBeInTheDocument();
});

it('renders a labelled single-select radio grid', async () => {
  const user = userEvent.setup();
  render(<IconPicker value="flame" options={options} onChange={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Flame' }));
  expect(screen.getByRole('dialog', { name: 'Pick icon' })).toBeInTheDocument();
  expect(screen.getByRole('radiogroup', { name: 'Pick icon' })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Flame' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('radio', { name: 'Lightning' })).toHaveAttribute('aria-checked', 'false');
});

it('uses the custom picker purpose to name the dialog and radio grid', async () => {
  const user = userEvent.setup();
  render(
    <IconPicker aria-label="Status icon" value="flame" options={options} onChange={() => {}} />,
  );
  await user.click(screen.getByRole('button', { name: 'Status icon: Flame' }));
  expect(screen.getByRole('dialog', { name: 'Status icon' })).toBeInTheDocument();
  expect(screen.getByRole('radiogroup', { name: 'Status icon' })).toBeInTheDocument();
});

it('commits a click and closes', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<IconPicker value="flame" options={options} onChange={onChange} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Flame' }));
  await user.click(screen.getByRole('radio', { name: 'Lightning' }));
  expect(onChange).toHaveBeenCalledWith('zap');
  expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
});

it('updates the trigger from the controlled value after a selection', async () => {
  const user = userEvent.setup();
  render(<ControlledIconPicker />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Flame' }));
  await user.click(screen.getByRole('radio', { name: 'Lightning' }));
  expect(screen.getByRole('button', { name: 'Pick icon: Lightning' })).toBeInTheDocument();
  expect(screen.getByTestId('zap-icon')).toBeInTheDocument();
});

it('does not open when disabled', async () => {
  const user = userEvent.setup();
  render(<IconPicker value="flame" options={options} onChange={() => {}} disabled />);
  const trigger = screen.getByRole('button', { name: 'Pick icon: Flame' });
  expect(trigger).toBeDisabled();
  await user.click(trigger);
  expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
});

it('does not open when no options are available', async () => {
  const user = userEvent.setup();
  render(<IconPicker value="flame" options={[]} onChange={() => {}} />);
  const trigger = screen.getByRole('button', { name: 'Pick icon' });
  expect(trigger).toBeDisabled();
  await user.click(trigger);
  expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
});

it('seeds focus from the controlled value every time the popover opens', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<IconPicker value="zap" options={options} onChange={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Lightning' }));
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Lightning' })).toHaveFocus());
  await user.keyboard('{Escape}');
  rerender(<IconPicker value="flag" options={options} onChange={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Flag' }));
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Flag' })).toHaveFocus());
});

it('focuses on open and arrow navigation without requestAnimationFrame', async () => {
  const animationFrame = vi.spyOn(window, 'requestAnimationFrame');
  const user = userEvent.setup();
  render(<IconPicker value="flame" options={options} onChange={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Flame' }));
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Flame' })).toHaveFocus());
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('radio', { name: 'Lightning' })).toHaveFocus();
  expect(animationFrame).not.toHaveBeenCalled();
});

it('opens an unmatched value on the first radio without a trigger glyph', async () => {
  const user = userEvent.setup();
  render(<IconPicker value="missing" options={options} onChange={() => {}} />);
  const trigger = screen.getByRole('button', { name: 'Pick icon' });
  expect(trigger).toBeEmptyDOMElement();
  await user.click(trigger);
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Flame' })).toHaveFocus());
});

it('invokes onChange when the already-selected option is chosen', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<IconPicker value="flame" options={options} onChange={onChange} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Flame' }));
  await user.click(screen.getByRole('radio', { name: 'Flame' }));
  expect(onChange).toHaveBeenCalledWith('flame');
});

it('reseeds the tabbable radio when options change while open', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<IconPicker value="flag" options={options} onChange={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Flag' }));
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Flag' })).toHaveFocus());
  rerender(<IconPicker value="zap" options={options.slice(0, 2)} onChange={() => {}} />);
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Lightning' })).toHaveFocus());
  expect(screen.getAllByRole('radio').filter((radio) => radio.tabIndex === 0)).toHaveLength(1);
});

it('moves spatially and selects with Space', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<IconPicker value="one" options={eightOptions} onChange={onChange} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: One' }));
  await user.keyboard('{ArrowRight}{ArrowDown}{Home}{End}{Space}');
  expect(onChange).toHaveBeenCalledWith('eight');
});

it('clamps Left and Up navigation at the first option', async () => {
  const user = userEvent.setup();
  render(<IconPicker value="one" options={eightOptions} onChange={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: One' }));
  await user.keyboard('{ArrowLeft}{ArrowUp}');
  expect(screen.getByRole('radio', { name: 'One' })).toHaveFocus();
});

it('moves Home and End within the current row', async () => {
  const user = userEvent.setup();
  render(<IconPicker value="six" options={eightOptions} onChange={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Six' }));
  await user.keyboard('{Home}');
  expect(screen.getByRole('radio', { name: 'Five' })).toHaveFocus();
  await user.keyboard('{End}');
  expect(screen.getByRole('radio', { name: 'Eight' })).toHaveFocus();
});

it('selects the focused icon with Enter', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<IconPicker value="one" options={eightOptions} onChange={onChange} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: One' }));
  await user.keyboard('{ArrowRight}{Enter}');
  expect(onChange).toHaveBeenCalledWith('two');
});

it('restores focus to the trigger after selection', async () => {
  const user = userEvent.setup();
  render(<IconPicker value="flame" options={options} onChange={() => {}} />);
  const trigger = screen.getByRole('button', { name: 'Pick icon: Flame' });
  await user.click(trigger);
  await user.click(screen.getByRole('radio', { name: 'Flag' }));
  expect(trigger).toHaveFocus();
});

it('dismisses with Escape or an outside click without changing the value', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<IconPicker value="flame" options={options} onChange={onChange} />);
  const trigger = screen.getByRole('button', { name: 'Pick icon: Flame' });
  await user.click(trigger);
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
  await user.click(trigger);
  await user.click(document.body);
  expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
});

it('composes external labels with the selected option', () => {
  render(
    <>
      <span id="field-label">Priority icon</span>
      <IconPicker
        aria-labelledby="field-label"
        value="flame"
        options={options}
        onChange={() => {}}
      />
    </>,
  );
  expect(screen.getByRole('button', { name: 'Priority icon Flame' })).toBeInTheDocument();
});

it('uses an external label to name the trigger, dialog, and radio grid', async () => {
  const user = userEvent.setup();
  render(
    <>
      <span id="picker-label">Priority icon</span>
      <IconPicker
        aria-labelledby="picker-label"
        value="flame"
        options={options}
        onChange={() => {}}
      />
    </>,
  );
  await user.click(screen.getByRole('button', { name: 'Priority icon Flame' }));
  expect(screen.getByRole('dialog', { name: 'Priority icon' })).toBeInTheDocument();
  expect(screen.getByRole('radiogroup', { name: 'Priority icon' })).toBeInTheDocument();
});

it('closes and disables the trigger when options become empty while open', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<IconPicker value="flame" options={options} onChange={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Flame' }));
  expect(screen.getByRole('dialog', { name: 'Pick icon' })).toBeInTheDocument();
  rerender(<IconPicker value="flame" options={[]} onChange={() => {}} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pick icon' })).toBeDisabled();
});

it('forwards trigger descriptions and hides decorative glyphs from assistive technology', () => {
  render(
    <>
      <span id="icon-description">Used on priority records</span>
      <IconPicker
        aria-describedby="icon-description"
        value="flame"
        options={options}
        onChange={() => {}}
      />
    </>,
  );
  expect(screen.getByRole('button', { name: 'Pick icon: Flame' })).toHaveAttribute(
    'aria-describedby',
    'icon-description',
  );
  expect(screen.getByTestId('flame-icon').parentElement).toHaveAttribute('aria-hidden', 'true');
});

it('hides custom non-SVG glyph wrappers in the trigger and radio cells', async () => {
  const user = userEvent.setup();
  const customOptions: IconPickerOption[] = [
    { value: 'custom', label: 'Custom', icon: <span data-testid="custom-glyph">★</span> },
  ];
  render(<IconPicker value="custom" options={customOptions} onChange={() => {}} />);
  const triggerGlyph = screen.getByTestId('custom-glyph').parentElement;
  expect(triggerGlyph).toHaveAttribute('aria-hidden', 'true');
  await user.click(screen.getByRole('button', { name: 'Pick icon: Custom' }));
  const glyphs = screen.getAllByTestId('custom-glyph');
  expect(glyphs[1]?.parentElement).toHaveAttribute('aria-hidden', 'true');
});

it('renders the selected option with the selected CSS class', async () => {
  const user = userEvent.setup();
  render(<IconPicker value="flame" options={options} onChange={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Flame' }));
  expect(screen.getByRole('radio', { name: 'Flame' }).className).toMatch(/selected/);
});

it('disables an empty picker and tolerates an unmatched value', () => {
  const { rerender } = render(<IconPicker value="missing" options={[]} onChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Pick icon' })).toBeDisabled();
  rerender(<IconPicker value="missing" options={options} onChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Pick icon' })).toBeEnabled();
});
