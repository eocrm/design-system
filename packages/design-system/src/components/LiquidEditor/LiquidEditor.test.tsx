import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactElement } from 'react';
import { LiquidEditor } from './LiquidEditor';
import { I18nProvider } from '../../i18n';
import type { LiquidVariable } from './types';

const VARS: LiquidVariable[] = [
  { code: 'first_name', label: 'First name', type: 'text', group: 'Built-in' },
  { code: 'last_name', label: 'Last name', type: 'text', group: 'Built-in' },
  { code: 'score', label: 'Score', type: 'number', group: 'Custom fields' },
];

function renderEditor(ui: ReactElement) {
  return render(<I18nProvider locale="en">{ui}</I18nProvider>);
}

// A controlled harness so onChange round-trips like a real consumer.
function Harness({ initial = '', ...rest }: { initial?: string } & Record<string, unknown>) {
  const [value, setValue] = useState(initial);
  return <LiquidEditor value={value} onChange={setValue} variables={VARS} {...rest} />;
}

describe('LiquidEditor', () => {
  it('renders a textarea with the value', () => {
    renderEditor(<LiquidEditor value="{{ first_name }}" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveValue('{{ first_name }}');
  });

  it('uses the default aria-label when none is supplied', () => {
    renderEditor(<LiquidEditor value="" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveAccessibleName('Liquid template');
  });

  it('respects a supplied aria-label over the default', () => {
    renderEditor(<LiquidEditor value="" onChange={() => {}} aria-label="Email body" />);
    expect(screen.getByRole('combobox')).toHaveAccessibleName('Email body');
  });

  it('round-trips controlled typing', async () => {
    const user = userEvent.setup();
    renderEditor(<Harness />);
    const ta = screen.getByRole('combobox');
    await user.type(ta, 'hello');
    expect(ta).toHaveValue('hello');
  });

  it('forwards ref to the textarea', () => {
    const ref = { current: null as HTMLTextAreaElement | null };
    renderEditor(<LiquidEditor ref={ref} value="" onChange={() => {}} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('merges className onto the root', () => {
    const { container } = renderEditor(
      <LiquidEditor value="" onChange={() => {}} className="custom" />,
    );
    expect(container.querySelector('.custom')).not.toBeNull();
  });

  it('sets the combobox ARIA contract on the textarea', () => {
    renderEditor(<LiquidEditor value="" onChange={() => {}} />);
    const ta = screen.getByRole('combobox');
    expect(ta).toHaveAttribute('aria-autocomplete', 'list');
    expect(ta).toHaveAttribute('aria-expanded', 'false');
    // aria-controls is only present while the listbox is open.
    expect(ta).not.toHaveAttribute('aria-controls');
  });

  it('shows the line-number gutter by default and hides it when disabled', () => {
    // The gutter is aria-hidden, so query the rendered text content directly.
    // Default whitespace normalization collapses the newline-joined numbers,
    // so match the raw textContent of the gutter <div> instead.
    const isGutter = (_content: string, el: Element | null) =>
      el?.tagName === 'DIV' && el.textContent === '1\n2\n3';
    const { rerender, container } = renderEditor(
      <LiquidEditor value={'a\nb\nc'} onChange={() => {}} />,
    );
    expect(screen.getByText(isGutter)).toBeInTheDocument();
    rerender(
      <I18nProvider locale="en">
        <LiquidEditor value={'a\nb\nc'} onChange={() => {}} showLineNumbers={false} />
      </I18nProvider>,
    );
    expect(
      [...container.querySelectorAll('div')].some((d) => d.textContent === '1\n2\n3'),
    ).toBe(false);
  });

  it('flags an unknown variable in the footer', () => {
    renderEditor(<LiquidEditor value="{{ first_naem }}" onChange={() => {}} variables={VARS} />);
    expect(screen.getByText(/Unknown variable/)).toHaveTextContent('first_naem');
  });

  it('does not flag when flagUnknownVariables is false', () => {
    renderEditor(
      <LiquidEditor
        value="{{ nope }}"
        onChange={() => {}}
        variables={VARS}
        flagUnknownVariables={false}
      />,
    );
    expect(screen.queryByText(/Unknown variable/)).not.toBeInTheDocument();
  });

  it('renders an external error in the footer and sets aria-invalid', () => {
    renderEditor(<LiquidEditor value="" onChange={() => {}} invalid error="Liquid syntax error" />);
    expect(screen.getByText('Liquid syntax error')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders the preview pane with content', () => {
    renderEditor(<LiquidEditor value="" onChange={() => {}} preview="Ada SMITH" />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Ada SMITH')).toBeInTheDocument();
  });

  it('shows the rendering state when previewStatus is loading', () => {
    renderEditor(<LiquidEditor value="" onChange={() => {}} previewStatus="loading" />);
    expect(screen.getByText('Rendering…')).toBeInTheDocument();
  });

  it('shows the error state when previewStatus is error', () => {
    renderEditor(<LiquidEditor value="" onChange={() => {}} previewStatus="error" />);
    expect(screen.getByText('Could not render preview')).toBeInTheDocument();
  });

  it('exposes the variable-insert menu and inserts at the end', async () => {
    const user = userEvent.setup();
    renderEditor(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Insert variable' }));
    await user.click(await screen.findByRole('menuitem', { name: 'First name' }));
    // Caret restore after the controlled onChange runs in a requestAnimationFrame;
    // findBy retries until the value settles.
    const ta = screen.getByRole('combobox');
    await screen.findByDisplayValue('{{ first_name }}');
    expect(ta).toHaveValue('{{ first_name }}');
  });

  it('opens autocomplete inside an output tag and accepts on Enter', async () => {
    const user = userEvent.setup();
    renderEditor(<Harness />);
    const ta = screen.getByRole('combobox');
    await user.click(ta);
    // userEvent treats `{` as a special-key delimiter — escape each literal
    // brace by doubling it, so `{{{{ fir` types the literal text `{{ fir`.
    await user.type(ta, '{{{{ fir');
    // Listbox appears with the matching variable.
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /First name/ })).toBeInTheDocument();
    await user.keyboard('{Enter}');
    // The completion replaces the partial word; caret restore is async (rAF).
    await screen.findByDisplayValue('{{ first_name');
    expect(ta).toHaveValue('{{ first_name');
    // Menu closed after accept.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes autocomplete on Escape without bubbling', async () => {
    const user = userEvent.setup();
    const onParentEscape = vi.fn();
    renderEditor(
      <div onKeyDown={(e) => e.key === 'Escape' && onParentEscape()}>
        <Harness />
      </div>,
    );
    const ta = screen.getByRole('combobox');
    // `{{{{ fir` types the literal `{{ fir` (each `{` escaped by doubling).
    await user.type(ta, '{{{{ fir');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onParentEscape).not.toHaveBeenCalled();
  });

  it('respects readOnly (no edits, no insert)', async () => {
    const user = userEvent.setup();
    renderEditor(<LiquidEditor value="locked" onChange={() => {}} readOnly variables={VARS} />);
    const ta = screen.getByRole('combobox');
    await user.type(ta, 'x');
    expect(ta).toHaveValue('locked');
  });
});
