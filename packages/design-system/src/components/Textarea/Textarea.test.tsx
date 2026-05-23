import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './Textarea';

describe('<Textarea>', () => {
  // ─── Baseline parity with Input ────────────────────────────────────────

  it('renders without crashing with default props', () => {
    render(<Textarea aria-label="Notes" />);
    expect(screen.getByRole('textbox', { name: 'Notes' })).toBeInTheDocument();
  });

  it('defaults to size="md"', () => {
    render(<Textarea aria-label="Notes" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea.className).toMatch(/sizeMd/);
  });

  it('applies size="sm" class', () => {
    render(<Textarea aria-label="Notes" size="sm" />);
    expect(screen.getByRole('textbox').className).toMatch(/sizeSm/);
  });

  it('applies size="lg" class', () => {
    render(<Textarea aria-label="Notes" size="lg" />);
    expect(screen.getByRole('textbox').className).toMatch(/sizeLg/);
  });

  it('invalid={true} adds the invalid class and aria-invalid', () => {
    render(<Textarea aria-label="Notes" invalid />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea.className).toMatch(/invalid/);
  });

  it('invalid omitted does NOT set aria-invalid', () => {
    render(<Textarea aria-label="Notes" />);
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });

  it('disableAutofill smart default blocks when no autoComplete', () => {
    render(<Textarea aria-label="Notes" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('autoComplete', 'off');
    expect(textarea).toHaveAttribute('data-1p-ignore', '');
    expect(textarea).toHaveAttribute('data-lpignore', 'true');
    expect(textarea).toHaveAttribute('data-form-type', 'other');
  });

  it('disableAutofill smart default allows when autoComplete is set', () => {
    render(<Textarea aria-label="Notes" autoComplete="street-address" />);
    expect(screen.getByRole('textbox')).toHaveAttribute(
      'autoComplete',
      'street-address',
    );
    expect(screen.getByRole('textbox')).not.toHaveAttribute('data-1p-ignore');
  });

  it('disableAutofill={true} force-blocks even with autoComplete set', () => {
    render(
      <Textarea
        aria-label="Notes"
        autoComplete="street-address"
        disableAutofill
      />,
    );
    const textarea = screen.getByRole('textbox');
    // Consumer's autoComplete still wins (spread order matches Input)…
    expect(textarea).toHaveAttribute('autocomplete', 'street-address');
    // …but the data-* opt-outs ARE applied.
    expect(textarea).toHaveAttribute('data-1p-ignore');
  });

  it('forwards ref to the <textarea> element (not the wrapper)', () => {
    let captured: HTMLTextAreaElement | null = null;
    render(
      <Textarea
        aria-label="Notes"
        ref={(node) => {
          captured = node;
        }}
      />,
    );
    expect(captured).not.toBeNull();
    // TS cannot track that the ref callback ran — cast through unknown.
    expect((captured as unknown as HTMLTextAreaElement).tagName).toBe('TEXTAREA');
  });

  it('className is merged with internal classes, not replaced', () => {
    render(<Textarea aria-label="Notes" className="custom" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea.className).toMatch(/custom/);
    expect(textarea.className).toMatch(/textarea/);
  });

  it('controlled: value + onChange round-trip', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [v, setV] = useState('');
      return (
        <Textarea
          aria-label="Notes"
          value={v}
          onChange={(e) => setV(e.target.value)}
        />
      );
    }
    render(<Controlled />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'hello');
    expect(textarea).toHaveValue('hello');
  });

  it('uncontrolled: typing updates content even without onChange', async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Notes" defaultValue="hi" />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, ' there');
    expect(textarea).toHaveValue('hi there');
  });

  // ─── Textarea-specific ─────────────────────────────────────────────────

  it('minRows={5} seeds the native rows attribute', () => {
    render(<Textarea aria-label="Notes" minRows={5} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5');
  });

  it('minRows default is 3 (rows attribute = 3)', () => {
    render(<Textarea aria-label="Notes" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '3');
  });

  describe('auto-grow', () => {
    // jsdom returns scrollHeight=0 for textareas by default; we stub it so
    // the auto-grow effect can compute a meaningful height.
    let originalDescriptor: PropertyDescriptor | undefined;
    let stubbedScrollHeight = 0;

    beforeAll(() => {
      originalDescriptor = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        'scrollHeight',
      );
      Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
        configurable: true,
        get() {
          return stubbedScrollHeight;
        },
      });
    });

    afterAll(() => {
      if (originalDescriptor) {
        Object.defineProperty(
          HTMLElement.prototype,
          'scrollHeight',
          originalDescriptor,
        );
      } else {
        // @ts-expect-error — restoring to no descriptor
        delete HTMLTextAreaElement.prototype.scrollHeight;
      }
    });

    it('autoGrow=true (default) sets an inline height after mount', () => {
      stubbedScrollHeight = 200;
      const { container } = render(<Textarea aria-label="Notes" />);
      const textarea = container.querySelector('textarea')!;
      expect(textarea.style.height).not.toBe('');
      expect(textarea.style.height).toMatch(/px$/);
    });

    it('autoGrow=false leaves inline height unset', () => {
      stubbedScrollHeight = 200;
      const { container } = render(
        <Textarea aria-label="Notes" autoGrow={false} />,
      );
      const textarea = container.querySelector('textarea')!;
      expect(textarea.style.height).toBe('');
    });

    it('maxRows clamps the inline height + sets overflowY to auto past the ceiling', () => {
      // Big scrollHeight so we'd exceed the cap.
      stubbedScrollHeight = 10000;
      const { container } = render(
        <Textarea aria-label="Notes" minRows={2} maxRows={4} />,
      );
      const textarea = container.querySelector('textarea')!;
      // overflowY should be 'auto' (we're past the cap).
      expect(textarea.style.overflowY).toBe('auto');
    });

    it('toggling autoGrow off clears the prior inline height/overflowY', () => {
      stubbedScrollHeight = 200;
      const { container, rerender } = render(<Textarea aria-label="Notes" autoGrow />);
      const textarea = container.querySelector('textarea')!;
      expect(textarea.style.height).toMatch(/px$/);

      rerender(<Textarea aria-label="Notes" autoGrow={false} />);
      expect(textarea.style.height).toBe('');
      expect(textarea.style.overflowY).toBe('');
    });

    it('typing updates the inline height (re-measures on value change)', async () => {
      stubbedScrollHeight = 50;
      function Controlled() {
        const [v, setV] = useState('');
        return (
          <Textarea
            aria-label="Notes"
            value={v}
            onChange={(e) => setV(e.target.value)}
          />
        );
      }
      const { container } = render(<Controlled />);
      const textarea = container.querySelector('textarea')!;
      const heightBefore = textarea.style.height;
      // Simulate scrollHeight growing as the user types.
      stubbedScrollHeight = 150;
      const user = userEvent.setup();
      await user.type(textarea, 'hello');
      const heightAfter = textarea.style.height;
      expect(heightAfter).not.toBe(heightBefore);
    });
  });

  // ─── Resize handle ─────────────────────────────────────────────────────

  it('resize defaults to "vertical" when autoGrow is false', () => {
    const { container } = render(
      <Textarea aria-label="Notes" autoGrow={false} />,
    );
    expect(container.querySelector('textarea')!.className).toMatch(
      /resizeVertical/,
    );
  });

  it('resize is forced to "none" when autoGrow is true (even if vertical passed)', () => {
    const { container } = render(
      <Textarea aria-label="Notes" autoGrow={true} resize="vertical" />,
    );
    const textarea = container.querySelector('textarea')!;
    expect(textarea.className).toMatch(/resizeNone/);
    expect(textarea.className).not.toMatch(/resizeVertical/);
  });

  it('resize="both" applies the right class when autoGrow=false', () => {
    const { container } = render(
      <Textarea aria-label="Notes" autoGrow={false} resize="both" />,
    );
    expect(container.querySelector('textarea')!.className).toMatch(/resizeBoth/);
  });

  // ─── Counter ───────────────────────────────────────────────────────────

  it('counter shows automatically when maxLength is set', () => {
    render(
      <Textarea aria-label="Notes" maxLength={140} defaultValue="hi" />,
    );
    expect(screen.getByText('2 / 140')).toBeInTheDocument();
  });

  it('counter format is ${len} (no slash) when showCount=true and no maxLength', () => {
    render(<Textarea aria-label="Notes" showCount defaultValue="hello" />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('counter is hidden when showCount=false even if maxLength is set', () => {
    render(
      <Textarea
        aria-label="Notes"
        maxLength={140}
        showCount={false}
        defaultValue="hi"
      />,
    );
    expect(screen.queryByText(/\/\s*140/)).not.toBeInTheDocument();
  });

  it('counter is hidden when neither maxLength nor showCount is set', () => {
    const { container } = render(<Textarea aria-label="Notes" />);
    // No counter span exists at all.
    expect(container.querySelector('span[aria-live]')).toBeNull();
  });

  it('counter updates as the user types (uncontrolled)', async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Notes" maxLength={140} />);
    expect(screen.getByText('0 / 140')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox'), 'hello');
    expect(screen.getByText('5 / 140')).toBeInTheDocument();
  });

  it('counter has aria-live="polite" and aria-atomic="true"', () => {
    const { container } = render(
      <Textarea aria-label="Notes" maxLength={140} />,
    );
    const counter = container.querySelector('span[aria-live]')!;
    expect(counter).toHaveAttribute('aria-live', 'polite');
    expect(counter).toHaveAttribute('aria-atomic', 'true');
  });

  it('numeric defaultValue is reflected in the counter', () => {
    render(<Textarea aria-label="Notes" defaultValue={123} showCount />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('disableAutofill={false} force-allows autofill even without an autoComplete hint', () => {
    render(<Textarea aria-label="Notes" disableAutofill={false} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).not.toHaveAttribute('autocomplete');
    expect(textarea).not.toHaveAttribute('data-1p-ignore');
  });
});
