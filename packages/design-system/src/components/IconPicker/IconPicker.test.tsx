import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRef, useState, type CSSProperties } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconPicker, type IconPickerOption, type IconPickerPopoverPlacement } from './IconPicker';
import { Field } from '../Field';
import type { PaletteColor } from '../../palette';

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

it('bridges per-instance component tokens from the root into the portaled grid', async () => {
  const user = userEvent.setup();
  render(
    <IconPicker
      data-testid="picker-root"
      style={
        {
          '--icon-picker-cell-size': '72px',
          '--icon-picker-grid-gap': '13px',
        } as CSSProperties
      }
      value="flame"
      options={options}
      onChange={() => {}}
    />,
  );
  const root = screen.getByTestId('picker-root');
  await user.click(screen.getByRole('button', { name: 'Pick icon: Flame' }));
  const grid = screen.getByRole('radiogroup');

  expect(root).not.toContainElement(grid);
  await waitFor(() => {
    expect(grid.style.getPropertyValue('--icon-picker-cell-size')).toBe('72px');
    expect(grid.style.getPropertyValue('--icon-picker-grid-gap')).toBe('13px');
  });
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

it.each<
  [
    placement: IconPickerPopoverPlacement,
    expectedSide: 'top' | 'bottom',
    expectedAlign: 'start' | 'center' | 'end',
  ]
>([
  ['top', 'top', 'center'],
  ['top-start', 'top', 'start'],
  ['top-end', 'top', 'end'],
  ['bottom', 'bottom', 'center'],
  ['bottom-start', 'bottom', 'start'],
  ['bottom-end', 'bottom', 'end'],
])(
  'maps popoverPlacement="%s" to side="%s" and align="%s"',
  async (placement, expectedSide, expectedAlign) => {
    const user = userEvent.setup();
    render(
      <IconPicker
        value="flame"
        options={options}
        onChange={() => {}}
        popoverPlacement={placement}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Pick icon: Flame' }));
    expect(screen.getByRole('dialog')).toHaveAttribute('data-side', expectedSide);
    expect(screen.getByRole('dialog')).toHaveAttribute('data-align', expectedAlign);
  },
);

it('commits a click and closes', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<IconPicker value="flame" options={options} onChange={onChange} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Flame' }));
  await user.click(screen.getByRole('radio', { name: 'Lightning' }));
  expect(onChange).toHaveBeenCalledWith('zap');
  expect(onChange).toHaveBeenCalledTimes(1);
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

it('closes and rejects stale selection when disabled becomes true while open', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  const { rerender } = render(<IconPicker value="flame" options={options} onChange={onChange} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Flame' }));
  const staleRadio = screen.getByRole('radio', { name: 'Lightning' });

  rerender(<IconPicker value="flame" options={options} onChange={onChange} disabled />);

  expect.soft(screen.getByRole('button', { name: 'Pick icon: Flame' })).toBeDisabled();
  expect.soft(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  act(() => staleRadio.click());
  expect.soft(onChange).toHaveBeenCalledTimes(0);
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
  expect(onChange).toHaveBeenCalledTimes(1);
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

it('does not reclaim focus when the active option disappears after Tab leaves the grid', async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <IconPicker value="one" options={eightOptions} onChange={() => {}} />,
  );
  await user.click(screen.getByRole('button', { name: 'Pick icon: One' }));
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('radio', { name: 'Two' })).toHaveFocus();
  const grid = screen.getByRole('radiogroup');
  await user.tab();
  const focusAfterTab = document.activeElement;
  expect(grid).not.toContainElement(focusAfterTab as HTMLElement);

  rerender(
    <IconPicker
      value="one"
      options={eightOptions.filter((option) => option.value !== 'two')}
      onChange={() => {}}
    />,
  );

  expect(document.activeElement).toBe(focusAfterTab);
  expect(screen.getByRole('radio', { name: 'Three' })).toHaveAttribute('tabindex', '0');
});

it('does not reclaim focus after the grid blurs without a related target', async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <IconPicker value="one" options={eightOptions} onChange={() => {}} />,
  );
  await user.click(screen.getByRole('button', { name: 'Pick icon: One' }));
  await user.keyboard('{ArrowRight}');
  const activeRadio = screen.getByRole('radio', { name: 'Two' });
  expect(activeRadio).toHaveFocus();
  fireEvent.blur(activeRadio, { relatedTarget: null });

  rerender(
    <IconPicker
      value="one"
      options={eightOptions.filter((option) => option.value !== 'two')}
      onChange={() => {}}
    />,
  );

  await Promise.resolve();
  expect(screen.getByRole('radio', { name: 'Three' })).not.toHaveFocus();
});

it('preserves the roved active option by value across insertion and reordering', async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <IconPicker value="one" options={eightOptions} onChange={() => {}} />,
  );
  await user.click(screen.getByRole('button', { name: 'Pick icon: One' }));
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('radio', { name: 'Two' })).toHaveFocus();

  const inserted: IconPickerOption = { value: 'zero', label: 'Zero', icon: <svg /> };
  const reorderedOptions = [
    inserted,
    eightOptions[3],
    eightOptions[0],
    eightOptions[1],
    ...eightOptions.slice(4),
    eightOptions[2],
  ];
  rerender(<IconPicker value="one" options={reorderedOptions} onChange={() => {}} />);

  expect(screen.getByRole('radio', { name: 'Two' })).toHaveFocus();
  expect(screen.getByRole('radio', { name: 'Two' })).toHaveAttribute('tabindex', '0');
});

it('moves focus to the next valid option when the focused option is removed', async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <IconPicker value="one" options={eightOptions} onChange={() => {}} />,
  );
  await user.click(screen.getByRole('button', { name: 'Pick icon: One' }));
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('radio', { name: 'Two' })).toHaveFocus();

  rerender(
    <IconPicker
      value="one"
      options={eightOptions.filter((option) => option.value !== 'two')}
      onChange={() => {}}
    />,
  );

  await waitFor(() => expect(screen.getByRole('radio', { name: 'Three' })).toHaveFocus());
  expect(screen.getByRole('radio', { name: 'Three' })).toHaveAttribute('tabindex', '0');
});

it('selects and wraps with Arrow keys', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  function ArrowSelectionHarness() {
    const [value, setValue] = useState('eight');
    return (
      <IconPicker
        value={value}
        options={eightOptions}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
      />
    );
  }
  render(<ArrowSelectionHarness />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Eight' }));

  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('radio', { name: 'One' })).toHaveFocus();
  expect(screen.getByRole('radio', { name: 'One' })).toBeChecked();

  await user.keyboard('{ArrowLeft}');
  expect(screen.getByRole('radio', { name: 'Eight' })).toHaveFocus();
  expect(screen.getByRole('radio', { name: 'Eight' })).toBeChecked();

  await user.keyboard('{ArrowDown}{ArrowUp}');
  expect(onChange.mock.calls.map(([value]) => value)).toEqual(['one', 'eight', 'one', 'eight']);
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
  render(<IconPicker value="two" options={eightOptions} onChange={onChange} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Two' }));
  await user.keyboard('{Enter}');
  expect(onChange).toHaveBeenCalledWith('two');
  expect(onChange).toHaveBeenCalledTimes(1);
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

it('appends the selected value to an external label only for the trigger', () => {
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

it('keeps the selected value out of the externally labelled dialog and radio grid', async () => {
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
  expect(screen.queryByRole('dialog', { name: 'Priority icon Flame' })).not.toBeInTheDocument();
  expect(screen.queryByRole('radiogroup', { name: 'Priority icon Flame' })).not.toBeInTheDocument();
});

it('associates Field label and state with the trigger without leaking them to the wrapper', () => {
  const { container } = render(
    <Field id="priority-icon" label="Priority icon" error="Choose a priority icon" required>
      <IconPicker className="picker-root" value="flame" options={options} onChange={() => {}} />
    </Field>,
  );

  const label = container.querySelector('label')!;
  const trigger = screen.getByRole('button', { name: 'Priority icon Flame' });
  const root = container.querySelector('.picker-root')!;

  expect(label.htmlFor).toBe(trigger.id);
  expect(trigger).toHaveAttribute('id', 'priority-icon');
  expect(trigger).toHaveAccessibleName('Priority icon Flame');
  expect(trigger).toHaveAttribute('aria-describedby', 'priority-icon-error');
  expect(trigger).toHaveAttribute('aria-invalid', 'true');
  expect(trigger).not.toHaveAttribute('aria-required');
  expect(trigger).not.toHaveAttribute('aria-label');
  expect(screen.getByText('*')).toBeInTheDocument();

  expect(root).not.toHaveAttribute('id');
  expect(root).not.toHaveAttribute('required');
  expect(root).not.toHaveAttribute('invalid');
  expect(root).not.toHaveAttribute('aria-invalid');
  expect(root).not.toHaveAttribute('aria-required');
  expect(root).not.toHaveAttribute('aria-labelledby');
  expect(root).not.toHaveAttribute('aria-describedby');
});

it('forwards explicit invalid state but consumes unsupported aria-required', () => {
  const { container } = render(
    <IconPicker
      className="picker-root"
      aria-invalid="grammar"
      aria-required="true"
      value="flame"
      options={options}
      onChange={() => {}}
    />,
  );

  const trigger = screen.getByRole('button', { name: 'Pick icon: Flame' });
  const root = container.querySelector('.picker-root')!;
  expect(trigger).toHaveAttribute('aria-invalid', 'grammar');
  expect(trigger).not.toHaveAttribute('aria-required');
  expect(root).not.toHaveAttribute('aria-invalid');
  expect(root).not.toHaveAttribute('aria-required');
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

describe('IconPicker — empty aria-label', () => {
  it('falls back to the default purpose when aria-label is an empty string', () => {
    render(<IconPicker value="flame" options={options} onChange={() => {}} aria-label="" />);
    expect(screen.getByRole('button', { name: 'Pick icon: Flame' })).toBeInTheDocument();
  });
});

it.each(['sm', 'md', 'lg'] as const)('applies the %s size class to the trigger', (size) => {
  render(<IconPicker value="flame" options={options} onChange={() => {}} size={size} />);
  expect(screen.getByRole('button', { name: 'Pick icon: Flame' }).className).toContain(
    `size-${size}`,
  );
});

it('defaults to md', () => {
  render(<IconPicker value="flame" options={options} onChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Pick icon: Flame' }).className).toContain('size-md');
});

// jsdom has no cascade, so the size->token wiring is guarded on the SCSS source.
it('resolves each size class through its trigger-size token', () => {
  const scss = readFileSync(resolve(__dirname, 'IconPicker.module.scss'), 'utf8');
  const rule = (name: string) => scss.match(new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
  for (const [name, token] of [
    ['size-sm', '--icon-picker-trigger-size-sm'],
    ['size-md', '--icon-picker-trigger-size'],
    ['size-lg', '--icon-picker-trigger-size-lg'],
  ]) {
    expect(rule(name)).toContain(`width: var(${token});`);
    expect(rule(name)).toContain(`height: var(${token});`);
  }
});

describe('IconPicker — colour mode', () => {
  const onChangeSpy = vi.fn();
  const onColorChangeSpy = vi.fn();
  beforeEach(() => {
    onChangeSpy.mockReset();
    onColorChangeSpy.mockReset();
  });

  function ColorHarness({
    initialColor,
    colors,
    disabled,
  }: {
    initialColor: PaletteColor;
    colors?: PaletteColor[];
    disabled?: boolean;
  }) {
    const [value, setValue] = useState('flame');
    const [color, setColor] = useState<PaletteColor>(initialColor);
    return (
      <IconPicker
        value={value}
        options={options}
        onChange={(next) => {
          onChangeSpy(next);
          setValue(next);
        }}
        color={color}
        onColorChange={(next) => {
          onColorChangeSpy(next);
          setColor(next);
        }}
        colors={colors}
        disabled={disabled}
      />
    );
  }

  it('requires onColorChange together with color (type-level)', () => {
    // @ts-expect-error — color without onColorChange is rejected by the type.
    const element = <IconPicker value="flame" options={options} onChange={() => {}} color="teal" />;
    expect(element).toBeTruthy();
  });

  it('names the trigger with icon and colour', () => {
    render(<ColorHarness initialColor="teal" />);
    expect(
      screen.getByRole('button', { name: 'Pick icon and colour: Flame, Teal' }),
    ).toBeInTheDocument();
  });

  it('tints the trigger with palette vars', () => {
    render(<ColorHarness initialColor="teal" />);
    const trigger = screen.getByRole('button', { name: /Pick icon and colour/ });
    expect(trigger.style.getPropertyValue('--icon-picker-tint-bg')).toBe(
      'var(--color-palette-teal-bg)',
    );
    expect(trigger.style.getPropertyValue('--icon-picker-tint-fg')).toBe(
      'var(--color-palette-teal-fg)',
    );
    expect(trigger.className).toMatch(/tinted/);
    expect(trigger.className).toContain('size-md');
  });

  it('renders Colour and Icon radiogroups labelled by visible headings', async () => {
    const user = userEvent.setup();
    render(<ColorHarness initialColor="teal" />);
    await user.click(screen.getByRole('button', { name: /Pick icon and colour/ }));
    expect(screen.getByRole('dialog', { name: 'Pick icon and colour' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Colour' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Icon' })).toBeInTheDocument();
    expect(screen.getByText('Colour')).toBeVisible();
    expect(screen.getByText('Icon')).toBeVisible();
    expect(screen.getAllByRole('radio', { name: /^(Red|Teal|Charcoal)$/ })).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'Teal' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Red' })).toHaveAttribute('aria-checked', 'false');
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Teal' })).toHaveFocus());
  });

  it('tints the icon cells with the selected colour', async () => {
    const user = userEvent.setup();
    render(<ColorHarness initialColor="teal" />);
    await user.click(screen.getByRole('button', { name: /Pick icon and colour/ }));
    const iconGroup = screen.getByRole('radiogroup', { name: 'Icon' });
    const panel = iconGroup.parentElement!;
    expect(panel.style.getPropertyValue('--icon-picker-tint-bg')).toBe(
      'var(--color-palette-teal-bg)',
    );
    expect(screen.getByRole('radio', { name: 'Flame' }).className).toMatch(/tinted/);
  });

  it('clicking a colour or icon commits without closing', async () => {
    const user = userEvent.setup();
    render(<ColorHarness initialColor="teal" />);
    await user.click(screen.getByRole('button', { name: /Pick icon and colour/ }));
    await user.click(screen.getByRole('radio', { name: 'Blue' }));
    expect(onColorChangeSpy).toHaveBeenCalledTimes(1);
    expect(onColorChangeSpy).toHaveBeenCalledWith('blue');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Blue' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: 'Lightning' }));
    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect(onChangeSpy).toHaveBeenCalledWith('zap');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Pick icon and colour: Lightning, Blue' }),
    ).toBeInTheDocument();
  });

  it('respects the colors subset and order', async () => {
    const user = userEvent.setup();
    render(<ColorHarness initialColor="teal" colors={['blue', 'teal']} />);
    await user.click(screen.getByRole('button', { name: /Pick icon and colour/ }));
    const dots = within(screen.getByRole('radiogroup', { name: 'Colour' })).getAllByRole('radio');
    expect(dots.map((dot) => dot.getAttribute('aria-label'))).toEqual(['Blue', 'Teal']);
    expect(dots.map((dot) => dot.getAttribute('data-color-index'))).toEqual(['0', '1']);
    expect(dots.map((dot) => dot.tabIndex)).toEqual([-1, 0]);
  });

  it('unknown color: trigger tinted, no dot checked, focus lands on first dot', async () => {
    const user = userEvent.setup();
    render(<ColorHarness initialColor="teal" colors={['blue', 'red']} />);
    const trigger = screen.getByRole('button', { name: 'Pick icon and colour: Flame, Teal' });
    expect(trigger.style.getPropertyValue('--icon-picker-tint-bg')).toBe(
      'var(--color-palette-teal-bg)',
    );
    await user.click(trigger);
    const dots = within(screen.getByRole('radiogroup', { name: 'Colour' })).getAllByRole('radio');
    for (const dot of dots) expect(dot).toHaveAttribute('aria-checked', 'false');
    expect(dots.map((dot) => dot.tabIndex)).toEqual([0, -1]);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Blue' })).toHaveFocus());
  });

  it('colors={[]} hides the colour section but keeps the icon grid', async () => {
    const user = userEvent.setup();
    render(<ColorHarness initialColor="teal" colors={[]} />);
    await user.click(screen.getByRole('button', { name: 'Pick icon and colour: Flame, Teal' }));
    expect(screen.queryByRole('radiogroup', { name: 'Colour' })).not.toBeInTheDocument();
    expect(screen.queryByText('Colour')).not.toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Icon' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Flame' })).toHaveFocus());
  });

  it('disabled colour mode keeps the tint and cannot open', async () => {
    const user = userEvent.setup();
    render(<ColorHarness initialColor="teal" disabled />);
    const trigger = screen.getByRole('button', { name: 'Pick icon and colour: Flame, Teal' });
    expect(trigger).toBeDisabled();
    expect(trigger.className).toMatch(/tinted/);
    expect(trigger.style.getPropertyValue('--icon-picker-tint-bg')).toBe(
      'var(--color-palette-teal-bg)',
    );
    await user.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // jsdom has no cascade: guard that the disabled tint dims via the opacity token.
    const scss = readFileSync(resolve(__dirname, 'IconPicker.module.scss'), 'utf8');
    const rule = scss.match(/\.tinted:disabled\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toContain('opacity: var(--icon-picker-disabled-opacity);');
    expect(rule).toContain('background: var(--icon-picker-tint-bg);');
  });

  it('icon-only mode is unchanged: label "Pick icon: Flame", closes on pick, no Colour group', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<IconPicker value="flame" options={options} onChange={onChange} />);
    const trigger = screen.getByRole('button', { name: 'Pick icon: Flame' });
    expect(trigger.className).not.toMatch(/tinted/);
    expect(trigger.style.getPropertyValue('--icon-picker-tint-bg')).toBe('');
    await user.click(trigger);
    expect(screen.queryByRole('radiogroup', { name: 'Colour' })).not.toBeInTheDocument();
    expect(screen.queryByText('Icon')).not.toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Pick icon' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Flame' }).className).not.toMatch(/tinted/);
    await user.click(screen.getByRole('radio', { name: 'Lightning' }));
    expect(onChange).toHaveBeenCalledWith('zap');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Field label + aria-labelledby path appends icon and colour', async () => {
    const user = userEvent.setup();
    render(
      <Field label="Appearance">
        <IconPicker
          value="flame"
          options={options}
          onChange={() => {}}
          color="teal"
          onColorChange={() => {}}
        />
      </Field>,
    );
    const trigger = screen.getByRole('button', { name: 'Appearance Flame Teal' });
    expect(trigger).not.toHaveAttribute('aria-label');
    await user.click(trigger);
    // The dialog is named by the purpose alone.
    expect(screen.getByRole('dialog', { name: 'Appearance' })).toBeInTheDocument();
  });

  it('uses a consumer aria-label as the colour-mode purpose', () => {
    render(
      <IconPicker
        aria-label="Look"
        value="flame"
        options={options}
        onChange={() => {}}
        color="teal"
        onColorChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Look: Flame, Teal' })).toBeInTheDocument();
  });

  describe('keyboard', () => {
    const three: PaletteColor[] = ['red', 'teal', 'blue'];
    const eight: PaletteColor[] = [
      'red',
      'coral',
      'orange',
      'amber',
      'gold',
      'yellow',
      'olive',
      'lime',
    ];
    const openPicker = async (user: ReturnType<typeof userEvent.setup>) =>
      user.click(screen.getByRole('button', { name: 'Pick icon and colour: Flame, Teal' }));

    it('Tab moves from the colour group to the icon group and Shift+Tab back', async () => {
      const user = userEvent.setup();
      render(<ColorHarness initialColor="teal" colors={three} />);
      await openPicker(user);
      await waitFor(() => expect(screen.getByRole('radio', { name: 'Teal' })).toHaveFocus());
      await user.tab();
      expect(screen.getByRole('radio', { name: 'Flame' })).toHaveFocus();
      await user.tab({ shift: true });
      expect(screen.getByRole('radio', { name: 'Teal' })).toHaveFocus();
    });

    it('arrows move and select colours, wrapping, without closing', async () => {
      const user = userEvent.setup();
      render(<ColorHarness initialColor="blue" colors={three} />);
      await user.click(screen.getByRole('button', { name: /Pick icon and colour/ }));
      await waitFor(() => expect(screen.getByRole('radio', { name: 'Blue' })).toHaveFocus());
      await user.keyboard('{ArrowRight}');
      expect(onColorChangeSpy).toHaveBeenLastCalledWith('red');
      expect(screen.getByRole('radio', { name: 'Red' })).toHaveFocus();
      expect(screen.getByRole('radio', { name: 'Red' })).toHaveAttribute('aria-checked', 'true');
      await user.keyboard('{ArrowLeft}');
      expect(onColorChangeSpy).toHaveBeenLastCalledWith('blue');
      await user.keyboard('{ArrowDown}{ArrowUp}');
      expect(onColorChangeSpy).toHaveBeenCalledTimes(4);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('Home/End move focus within the swatch row without selecting', async () => {
      const user = userEvent.setup();
      render(<ColorHarness initialColor="gold" colors={eight} />);
      await user.click(screen.getByRole('button', { name: /Pick icon and colour/ }));
      await waitFor(() => expect(screen.getByRole('radio', { name: 'Gold' })).toHaveFocus());
      await user.keyboard('{End}');
      expect(screen.getByRole('radio', { name: 'Yellow' })).toHaveFocus();
      await user.keyboard('{Home}');
      expect(screen.getByRole('radio', { name: 'Red' })).toHaveFocus();
      expect(onColorChangeSpy).not.toHaveBeenCalled();
    });

    it('End on the last short row stops at the final swatch', async () => {
      const user = userEvent.setup();
      render(<ColorHarness initialColor="olive" colors={eight} />);
      await user.click(screen.getByRole('button', { name: /Pick icon and colour/ }));
      await waitFor(() => expect(screen.getByRole('radio', { name: 'Olive' })).toHaveFocus());
      await user.keyboard('{Home}');
      expect(screen.getByRole('radio', { name: 'Olive' })).toHaveFocus();
      await user.keyboard('{End}');
      expect(screen.getByRole('radio', { name: 'Lime' })).toHaveFocus();
    });

    it('Enter/Space on a dot commits and stays open; Esc closes and refocuses trigger', async () => {
      const user = userEvent.setup();
      render(<ColorHarness initialColor="teal" colors={three} />);
      await user.click(screen.getByRole('button', { name: /Pick icon and colour/ }));
      await waitFor(() => expect(screen.getByRole('radio', { name: 'Teal' })).toHaveFocus());
      await user.keyboard('{Enter}');
      expect(onColorChangeSpy).toHaveBeenLastCalledWith('teal');
      await user.keyboard(' ');
      expect(onColorChangeSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pick icon and colour/ })).toHaveFocus();
    });

    it('arrow selection in the icon grid still fires onChange and does not close in colour mode', async () => {
      const user = userEvent.setup();
      render(<ColorHarness initialColor="teal" colors={three} />);
      await user.click(screen.getByRole('button', { name: /Pick icon and colour/ }));
      await waitFor(() => expect(screen.getByRole('radio', { name: 'Teal' })).toHaveFocus());
      await user.tab();
      await user.keyboard('{ArrowRight}');
      expect(onChangeSpy).toHaveBeenLastCalledWith('zap');
      expect(screen.getByRole('radio', { name: 'Lightning' })).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(onChangeSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('shares the swatch column count between TS and SCSS', () => {
      const scss = readFileSync(resolve(__dirname, 'IconPicker.module.scss'), 'utf8');
      expect(scss).toContain('repeat(var(--icon-picker-swatch-columns)');
    });
  });
});
