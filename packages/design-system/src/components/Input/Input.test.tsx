import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Profiler, createRef, useState, type FormEvent } from 'react';
import { Input } from './Input';
import { I18nProvider } from '../../i18n/I18nProvider';

describe('Input', () => {
  it('round-trips a controlled value via onChange', async () => {
    function Wrapper() {
      const [v, setV] = useState('');
      return <Input placeholder="email" value={v} onChange={(e) => setV(e.target.value)} />;
    }
    const user = userEvent.setup();
    render(<Wrapper />);
    const input = screen.getByPlaceholderText('email');
    await user.type(input, 'hello@example.com');
    expect(input).toHaveValue('hello@example.com');
  });

  it('sets aria-invalid="true" when invalid', () => {
    render(<Input invalid placeholder="email" />);
    expect(screen.getByPlaceholderText('email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not set aria-invalid when not invalid', () => {
    render(<Input placeholder="email" />);
    expect(screen.getByPlaceholderText('email')).not.toHaveAttribute('aria-invalid');
  });

  it('applies the invalid class when invalid', () => {
    render(<Input invalid placeholder="email" />);
    expect(screen.getByPlaceholderText('email').className).toMatch(/invalid/);
  });

  it('reflects the disabled attribute and blocks input', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Input placeholder="email" disabled onChange={onChange} />);
    const input = screen.getByPlaceholderText('email');
    expect(input).toBeDisabled();
    await user.type(input, 'x');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('forwards native HTML attributes (type, autoComplete)', () => {
    render(<Input placeholder="email" type="email" autoComplete="email" />);
    const input = screen.getByPlaceholderText('email');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('autocomplete', 'email');
  });

  it('merges the className prop', () => {
    render(<Input placeholder="email" className="external" />);
    expect(screen.getByPlaceholderText('email').className).toMatch(/external/);
  });

  it('forwards refs to the underlying input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} placeholder="email" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('lets a consumer override aria-invalid even when invalid={true}', () => {
    render(<Input placeholder="email" invalid aria-invalid="false" />);
    // Consumer-provided aria-invalid wins. The invalid class is still applied
    // (visual error styling) because className composition runs after spread.
    expect(screen.getByPlaceholderText('email')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByPlaceholderText('email').className).toMatch(/invalid/);
  });

  it('honors readOnly — the attribute is set and typing does not change the value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Input placeholder="email" value="locked" readOnly onChange={onChange} />);
    const input = screen.getByPlaceholderText('email') as HTMLInputElement;
    expect(input).toHaveAttribute('readonly');
    await user.type(input, 'x');
    // readOnly inputs receive focus and key events but value stays put;
    // onChange fires only when the user agent commits a value change.
    expect(input.value).toBe('locked');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies size class names for sm / md / lg', () => {
    const { rerender, container } = render(<Input size="sm" />);
    expect(container.querySelector('input')!.className).toMatch(/size-sm/);
    rerender(<Input size="md" />);
    expect(container.querySelector('input')!.className).toMatch(/size-md/);
    rerender(<Input size="lg" />);
    expect(container.querySelector('input')!.className).toMatch(/size-lg/);
  });

  it('defaults to size="md" when no size prop is passed', () => {
    const { container } = render(<Input />);
    expect(container.querySelector('input')!.className).toMatch(/size-md/);
  });

  it('does NOT pass component size prop through to the DOM size attribute', () => {
    const { container } = render(<Input size="sm" />);
    expect(container.querySelector('input')).not.toHaveAttribute('size');
  });

  it('blocks autofill by default when no autoComplete is set', () => {
    const { container } = render(<Input />);
    const input = container.querySelector('input')!;
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveAttribute('data-1p-ignore');
    expect(input).toHaveAttribute('data-lpignore', 'true');
    expect(input).toHaveAttribute('data-form-type', 'other');
  });

  it('opts INTO autofill when consumer specifies a real autoComplete value', () => {
    const { container } = render(<Input autoComplete="email" />);
    const input = container.querySelector('input')!;
    expect(input).toHaveAttribute('autocomplete', 'email');
    expect(input).not.toHaveAttribute('data-1p-ignore');
    expect(input).not.toHaveAttribute('data-lpignore');
    expect(input).not.toHaveAttribute('data-form-type');
  });

  it('treats autoComplete="off" the same as omitted (blocks autofill)', () => {
    const { container } = render(<Input autoComplete="off" />);
    const input = container.querySelector('input')!;
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveAttribute('data-1p-ignore');
  });

  it('disableAutofill={true} force-blocks even with an autoComplete hint', () => {
    const { container } = render(<Input autoComplete="email" disableAutofill />);
    const input = container.querySelector('input')!;
    // Consumer's autoComplete still wins (spread order)…
    expect(input).toHaveAttribute('autocomplete', 'email');
    // …but the data-* opt-outs are applied.
    expect(input).toHaveAttribute('data-1p-ignore');
  });

  it('disableAutofill={false} force-allows autofill even without an autoComplete hint', () => {
    const { container } = render(<Input disableAutofill={false} />);
    const input = container.querySelector('input')!;
    expect(input).not.toHaveAttribute('autocomplete');
    expect(input).not.toHaveAttribute('data-1p-ignore');
  });
});

describe('Input suggestions', () => {
  const SUGGESTIONS = ['acme', 'acme-staging', 'northwind'];

  function Uncontrolled(props: { onChange?: (v: string) => void; defaultValue?: string }) {
    return (
      <Input
        aria-label="Workspace"
        suggestions={SUGGESTIONS}
        defaultValue={props.defaultValue}
        onChange={(e) => props.onChange?.(e.target.value)}
      />
    );
  }

  function Controlled({ onChange }: { onChange?: (v: string) => void }) {
    const [v, setV] = useState('');
    return (
      <Input
        aria-label="Workspace"
        suggestions={SUGGESTIONS}
        value={v}
        onChange={(e) => {
          setV(e.target.value);
          onChange?.(e.target.value);
        }}
      />
    );
  }

  const optionNames = () => screen.queryAllByRole('option').map((o) => o.textContent);

  it('is a plain input without suggestions or with an empty list', () => {
    const { rerender } = render(<Input aria-label="Workspace" />);
    expect(screen.queryByRole('combobox')).toBeNull();
    rerender(<Input aria-label="Workspace" suggestions={[]} />);
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-expanded');
  });

  it('is a collapsed combobox until focused, then lists every suggestion even when prefilled', async () => {
    const user = userEvent.setup();
    render(<Uncontrolled defaultValue="acme" />);
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).not.toHaveAttribute('aria-controls');
    expect(screen.queryByRole('listbox')).toBeNull();
    await user.click(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox', { name: 'Suggestions' });
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(optionNames()).toEqual(SUGGESTIONS);
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('filters by case-insensitive substring once the user types, and closes on no match', async () => {
    const user = userEvent.setup();
    render(<Uncontrolled />);
    const input = screen.getByRole('combobox');
    await user.type(input, 'NORTH');
    expect(optionNames()).toEqual(['northwind']);
    await user.clear(input);
    await user.type(input, 'zzz');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('moves the highlight with wrap-around and selects on Enter', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Uncontrolled onChange={onChange} />);
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    const options = screen.getAllByRole('option');
    expect(input).toHaveAttribute('aria-activedescendant', options[0]!.id);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveAttribute('aria-activedescendant', options[2]!.id);
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[0]!.id);
    await user.keyboard('{Enter}');
    expect(input).toHaveValue('acme');
    expect(onChange).toHaveBeenLastCalledWith('acme');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('opens on ArrowDown after Escape closed it', async () => {
    const user = userEvent.setup();
    render(<Uncontrolled />);
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    await user.keyboard('{ArrowDown}');
    expect(optionNames()).toEqual(SUGGESTIONS);
  });

  it('leaves Enter native when nothing is highlighted (submits the form)', async () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <Uncontrolled />
      </form>,
    );
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not submit the form when Enter picks a highlighted option', async () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <Uncontrolled />
      </form>,
    );
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('closes on Escape, and on Tab without changing the value', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Uncontrolled defaultValue="x" />
        <button type="button">next</button>
      </>,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    await user.tab();
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveValue('x');
  });

  it('selects a clicked option, keeps focus on the input and closes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Uncontrolled onChange={onChange} />);
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.click(screen.getByRole('option', { name: 'northwind' }));
    expect(input).toHaveValue('northwind');
    expect(onChange).toHaveBeenLastCalledWith('northwind');
    expect(input).toHaveFocus();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('updates a controlled value through onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Controlled onChange={onChange} />);
    const input = screen.getByRole('combobox');
    await user.type(input, 'stag');
    expect(optionNames()).toEqual(['acme-staging']);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(input).toHaveValue('acme-staging');
    expect(onChange).toHaveBeenLastCalledWith('acme-staging');
  });

  it('names the listbox in the active locale', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider locale="ru">
        <Uncontrolled />
      </I18nProvider>,
    );
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox', { name: 'Подсказки' })).toBeInTheDocument();
  });

  it('still calls consumer focus and keydown handlers', async () => {
    const onFocus = vi.fn();
    const onKeyDown = vi.fn();
    const user = userEvent.setup();
    render(
      <Input
        aria-label="Workspace"
        suggestions={SUGGESTIONS}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{ArrowDown}');
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalled();
  });

  it('renders duplicate suggestions once, in first-occurrence order', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<Input aria-label="Workspace" suggestions={['acme', 'northwind', 'acme']} />);
    await user.click(screen.getByRole('combobox'));
    expect(optionNames()).toEqual(['acme', 'northwind']);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('is a plain textbox when readOnly', () => {
    render(<Input aria-label="Workspace" suggestions={SUGGESTIONS} readOnly />);
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('ignores Enter and arrows while an IME is composing', async () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <Uncontrolled />
      </form>,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    fireEvent.keyDown(input, { key: 'ArrowDown', isComposing: true });
    expect(input).not.toHaveAttribute('aria-activedescendant');
    await user.keyboard('{ArrowDown}');
    const enter = fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(enter).toBe(true); // not prevented: the IME commits the composition
    expect(input).toHaveValue('');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  // The popup machinery mounts only while the list is shown, so a plain or
  // closed Input must not re-render on mount (e.g. via a Floating UI ref setState).
  it.each([
    ['without suggestions', undefined],
    ['with suggestions while closed', SUGGESTIONS],
  ])('commits once on mount %s', (_, suggestions) => {
    const onRender = vi.fn();
    const ref = createRef<HTMLInputElement>();
    render(
      <Profiler id="input" onRender={onRender}>
        <Input ref={ref} aria-label="Workspace" suggestions={suggestions} />
      </Profiler>,
    );
    expect(onRender).toHaveBeenCalledTimes(1);
    expect(onRender.mock.calls[0]![1]).toBe('mount');
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
