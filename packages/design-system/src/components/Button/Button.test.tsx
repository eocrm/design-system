import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Button } from './Button';

describe('Button', () => {
  it('renders its children inside a <button>', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('defaults type="button" so it does not submit ancestor forms', () => {
    render(<Button>Hi</Button>);
    expect(screen.getByRole('button', { name: 'Hi' })).toHaveAttribute('type', 'button');
  });

  it('applies the variant and size class names', () => {
    render(
      <Button variant="danger" size="lg">
        Delete
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toMatch(/danger/);
    expect(btn.className).toMatch(/lg/);
  });

  it('applies the danger-outline class (#596), not the filled danger one', () => {
    render(<Button variant="danger-outline">Remove</Button>);
    const classes = screen.getByRole('button', { name: 'Remove' }).className.split(' ');
    expect(classes.some((c) => /danger-outline/.test(c))).toBe(true);
    expect(classes.some((c) => /(^|_)danger(_|$)/.test(c))).toBe(false);
  });

  it('danger-outline paints surface fill with danger text and border via its own tokens', () => {
    const scss = readFileSync(resolve(__dirname, 'Button.module.scss'), 'utf8');
    const block = scss.match(/\.danger-outline \{[\s\S]*?\n\}/)![0];
    expect(block).toMatch(/background: var\(--button-bg-danger-outline\)/);
    expect(block).toMatch(/color: var\(--button-fg-danger-outline\)/);
    expect(block).toMatch(/border-color: var\(--button-border-color-danger-outline\)/);
    expect(block).toMatch(/focus-ring\(var\(--button-ring-danger-outline\)\)/);
  });

  it('applies the xs size class', () => {
    render(<Button size="xs">Tiny</Button>);
    expect(screen.getByRole('button', { name: 'Tiny' }).className).toMatch(/xs/);
  });

  it('applies the success variant class name', () => {
    render(<Button variant="success">Saved!</Button>);
    expect(screen.getByRole('button', { name: 'Saved!' }).className).toMatch(/success/);
  });

  it('fullWidth and align="start" add layout classes; iconOnly ignores both', () => {
    render(
      <>
        <Button fullWidth align="start">
          Row
        </Button>
        <Button>Plain</Button>
        <Button iconOnly fullWidth align="start" aria-label="Close">
          ×
        </Button>
      </>,
    );
    const row = screen.getByRole('button', { name: 'Row' }).className;
    expect(row).toMatch(/fullWidth/);
    expect(row).toMatch(/alignStart/);
    for (const name of ['Plain', 'Close']) {
      const cls = screen.getByRole('button', { name }).className;
      expect(cls).not.toMatch(/fullWidth|alignStart/);
    }
  });

  it('fullWidth centres one line in the size height (DS-38): padding from --button-height-current and 1lh', () => {
    const scss = readFileSync(resolve(__dirname, 'Button.module.scss'), 'utf8');
    const rule = scss.match(/\.fullWidth\s*\{([^}]*)\}/)![1];
    expect(rule).toMatch(
      /padding-block:\s*max\(0px,\s*calc\(\(var\(--button-height-current\)\s*-\s*1lh\)/,
    );
    expect(rule).toMatch(/line-height:\s*var\(--line-height-normal\)/);
    expect(rule).toMatch(/min-height:\s*var\(--button-height-current\)/);
    for (const size of ['xs', 'sm', 'md', 'lg'])
      expect(scss).toMatch(
        new RegExp(
          `\\.${size}\\s*\\{[^}]*--button-height-current:\\s*var\\(--button-height-${size}\\)`,
        ),
      );
  });

  it('applies selected paint only to secondary and ghost variants', () => {
    render(
      <>
        <Button variant="secondary" selected>
          Owner: Ada
        </Button>
        <Button variant="ghost" selected>
          Assignee: Lin
        </Button>
        <Button variant="primary" selected>
          Save
        </Button>
        <Button variant="danger" selected>
          Delete
        </Button>
        <Button variant="success" selected>
          Saved
        </Button>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Owner: Ada' }).className).toMatch(/selected/);
    expect(screen.getByRole('button', { name: 'Assignee: Lin' }).className).toMatch(/selected/);
    expect(screen.getByRole('button', { name: 'Save' }).className).not.toMatch(/selected/);
    expect(screen.getByRole('button', { name: 'Delete' }).className).not.toMatch(/selected/);
    expect(screen.getByRole('button', { name: 'Saved' }).className).not.toMatch(/selected/);
  });

  it('removes selected paint when selected is false', () => {
    const { rerender } = render(
      <Button variant="secondary" selected>
        Owner: Ada
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Owner: Ada' }).className).toMatch(/selected/);

    rerender(
      <Button variant="secondary" selected={false}>
        Owner: Ada
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Owner: Ada' }).className).not.toMatch(/selected/);
  });

  it('keeps selected paint separate from native toggle-button semantics', () => {
    render(
      <>
        <Button variant="secondary" selected>
          Filter
        </Button>
        <Button variant="secondary" selected aria-pressed>
          Toggle
        </Button>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Filter' })).not.toHaveAttribute('aria-pressed');
    expect(screen.getByRole('button', { name: 'Toggle' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('passes through an explicit mixed aria-pressed value', () => {
    render(
      <Button selected aria-pressed="mixed">
        Owner: Ada
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Owner: Ada' })).toHaveAttribute(
      'aria-pressed',
      'mixed',
    );
  });

  it('keeps a selected button disabled', () => {
    render(
      <Button variant="secondary" selected disabled>
        Owner: Ada
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Owner: Ada' });
    expect(button).toBeDisabled();
    expect(button.className).toMatch(/selected/);
  });

  it('derives selected hover paint from the selected accent tokens', () => {
    const tokens = readFileSync(resolve(__dirname, 'Button.tokens.scss'), 'utf8');

    expect(tokens).toContain('--button-bg-selected: var(--color-accent-bg-subtle);');
    expect(tokens).toMatch(
      /--button-bg-selected-hover:\s*color-mix\(\s*in srgb,\s*var\(--button-bg-selected\),\s*var\(--button-border-color-selected\) 12%\s*\);/s,
    );
    expect(tokens).toContain('--button-fg-selected: var(--color-fg);');
  });

  it('merges the className prop with internal classes', () => {
    render(<Button className="external">Hi</Button>);
    const btn = screen.getByRole('button', { name: 'Hi' });
    expect(btn.className).toMatch(/external/);
    expect(btn.className).toMatch(/button/);
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Press</Button>);
    await user.click(screen.getByRole('button', { name: 'Press' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Press
      </Button>,
    );
    await user.click(screen.getByRole('button', { name: 'Press' }));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Press' })).toBeDisabled();
  });

  it('keeps an aria-disabled button natively enabled', () => {
    render(<Button aria-disabled="true">Unavailable</Button>);

    const button = screen.getByRole('button', { name: 'Unavailable' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
  });

  it('styles aria-disabled buttons as unavailable without enabling hover paint', () => {
    const scss = readFileSync(resolve(__dirname, 'Button.module.scss'), 'utf8');

    expect(scss).toMatch(
      /&:disabled,\s*&\[aria-disabled='true'\]\s*\{[^}]*opacity:\s*var\(--button-opacity-disabled\);[^}]*cursor:\s*not-allowed;/s,
    );
    expect(scss).toMatch(/&:disabled\s*\{[^}]*pointer-events:\s*none;/s);

    const hoverSelectors = scss.match(/&:hover[^{]*/g) ?? [];
    expect(hoverSelectors.length).toBeGreaterThan(0);
    hoverSelectors.forEach((selector) => {
      expect(selector).toContain(":not(:disabled, [aria-disabled='true'])");
    });
  });

  it('forwards a ref to the underlying button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Hi</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe('Hi');
  });

  it('renders as an icon-only button at size xs with an accessible name', () => {
    render(
      <Button size="xs" aria-label="Remove">
        <svg data-testid="icon" aria-hidden="true" />
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('applies the iconOnly class when iconOnly is set', () => {
    render(
      <Button iconOnly aria-label="Remove">
        <svg data-testid="icon" aria-hidden="true" />
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Remove' }).className).toMatch(/iconOnly/);
  });
});

describe('Button — polymorphic `as` (#530)', () => {
  it('renders a real anchor that navigates and announces as a link', () => {
    render(
      <Button as="a" href="https://idp.example.com/enroll">
        Open identity console
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Open identity console' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://idp.example.com/enroll');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('does not emit type="button" onto the anchor', () => {
    render(
      <Button as="a" href="/x">
        Go
      </Button>,
    );
    expect(screen.getByRole('link', { name: 'Go' })).not.toHaveAttribute('type');
  });

  it('keeps the button paint and forwards anchor-only attributes', () => {
    render(
      <Button as="a" href="/x" target="_blank" rel="noreferrer" variant="secondary" size="sm">
        Go
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Go' });
    expect(link.className).toMatch(/secondary/);
    expect(link.className).toMatch(/sm/);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('forwards the ref to the rendered element', () => {
    const ref = createRef<HTMLAnchorElement>();
    render(
      <Button as="a" href="/x" ref={ref}>
        Go
      </Button>,
    );
    expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
  });

  it('renders any other element named by `as`, keeping type="button" off it', () => {
    render(
      <Button as="span" data-testid="span-button">
        Span
      </Button>,
    );
    const el = screen.getByTestId('span-button');
    expect(el.tagName).toBe('SPAN');
    expect(el).not.toHaveAttribute('type');
    expect(el.className).toMatch(/primary/);
  });

  it('still renders a <button type="button"> when `as` is omitted', () => {
    render(<Button onClick={() => {}}>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn.tagName).toBe('BUTTON');
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('types: href is rejected without as="a", required with it, and button-only props with it', () => {
    render(
      <>
        {/* @ts-expect-error href is not a <button> attribute */}
        <Button href="/x">Dead link</Button>
        {/* @ts-expect-error `disabled` is not an <a> attribute */}
        <Button as="a" href="/x" disabled>
          Nope
        </Button>
        {/* @ts-expect-error an anchor without href is neither focusable nor a link */}
        <Button as="a">No href</Button>
      </>,
    );
    // Rendering is incidental here — the assertions that matter are the two
    // expect-error directives above, which fail `tsc --noEmit` if either
    // constraint stops holding.
    expect(screen.getByRole('link', { name: 'Nope' })).toBeInTheDocument();
  });
});

describe('Button — palette `color`', () => {
  it('paints the palette soft pair through custom properties, with no variant class', () => {
    render(<Button color="amber">No show</Button>);
    const btn = screen.getByRole('button', { name: 'No show' });
    const classes = btn.className.split(' ');
    expect(classes.some((c) => /palette/.test(c))).toBe(true);
    expect(classes.some((c) => /(^|_)primary(_|$)/.test(c))).toBe(false);
    expect(btn.style.getPropertyValue('--button-palette-bg')).toBe('var(--color-palette-amber-bg)');
    expect(btn.style.getPropertyValue('--button-palette-fg')).toBe('var(--color-palette-amber-fg)');
  });

  it('merges the consumer style', () => {
    render(
      <Button color="green" style={{ minWidth: 100 }}>
        Completed
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Completed' });
    expect(btn.style.minWidth).toBe('100px');
    expect(btn.style.getPropertyValue('--button-palette-bg')).toBe('var(--color-palette-green-bg)');
  });

  it('hovers and presses with a brightness filter, guarded against disabled', () => {
    const scss = readFileSync(resolve(__dirname, 'Button.module.scss'), 'utf8');
    const block = scss.match(/\.palette \{[\s\S]*?\n\}/)![0];
    expect(block).toMatch(/background: var\(--button-palette-bg, transparent\)/);
    expect(block).toMatch(/color: var\(--button-palette-fg, currentColor\)/);
    expect(block).toMatch(
      /&:hover:not\(:disabled, \[aria-disabled='true'\]\) \{\s*filter: brightness\(0\.96\)/,
    );
    expect(block).toMatch(
      /&:active:not\(:disabled, \[aria-disabled='true'\]\) \{\s*filter: brightness\(0\.92\)/,
    );
  });

  it('color wins over variant and selected', () => {
    render(
      <Button color="amber" variant="secondary" selected>
        A
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'A' });
    expect(button.className).toMatch(/palette/);
    expect(button.className).not.toMatch(/secondary|selected/);
  });
});

describe('Button touch tokens (DS-35)', () => {
  const scss = readFileSync(resolve(__dirname, 'Button.tokens.scss'), 'utf8');
  it('re-points --button-height-md to size-touch on coarse pointers', () => {
    expect(scss).toMatch(
      /@media \(pointer: coarse\)[\s\S]*--button-height-md:\s*var\(\-\-size\-touch\)/,
    );
  });
  it('re-points --button-height-lg to size-touch on coarse pointers', () => {
    expect(scss).toMatch(
      /@media \(pointer: coarse\)[\s\S]*--button-height-lg:\s*var\(\-\-size\-touch\)/,
    );
  });
});

describe('Button — loading (DS-77)', () => {
  it('loading: keeps the accessible name, sets aria-disabled, stays focusable', async () => {
    render(<Button loading>Ask</Button>);
    const btn = screen.getByRole('button', { name: 'Ask' });
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).not.toHaveAttribute('disabled');
    await userEvent.tab();
    expect(btn).toHaveFocus();
  });

  it('loading: ignores clicks', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Ask
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('loading: blocks form submission', async () => {
    const submit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <form onSubmit={submit}>
        <input aria-label="field" />
        <Button type="submit" loading>
          Go
        </Button>
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    await userEvent.type(screen.getByLabelText('field'), 'x{Enter}');
    expect(submit).not.toHaveBeenCalled();
  });

  it('loading: still submits when not loading (guard is state-bound)', async () => {
    const submit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <form onSubmit={submit}>
        <Button type="submit" loading={false}>
          Go
        </Button>
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('loading: announces through a polite region present before loading', async () => {
    const { rerender } = render(
      <Button loading={false} loadingLabel="Loading…">
        Ask
      </Button>,
    );
    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('');
    rerender(
      <Button loading loadingLabel="Loading…">
        Ask
      </Button>,
    );
    expect(await screen.findByText('Loading…')).toBe(region);
    expect(screen.getByRole('status')).toBe(region);
    rerender(
      <Button loading={false} loadingLabel="Loading…">
        Ask
      </Button>,
    );
    await waitFor(() => expect(region).toHaveTextContent(''));
  });

  it('no loading prop: renders no status region', () => {
    render(<Button>Ask</Button>);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('loading as="a": click is defaultPrevented', () => {
    render(
      <Button as="a" href="#x" loading>
        Open
      </Button>,
    );
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    screen.getByRole('link', { name: 'Open' }).dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true);
  });

  it('loading: spinner is an aria-hidden, empty span', () => {
    render(<Button loading>Ask</Button>);
    const spinner = screen
      .getByRole('button', { name: 'Ask' })
      .querySelector(':scope > span[aria-hidden="true"]:empty');
    expect(spinner).not.toBeNull();
  });

  it('iconOnly loading: the name stays the aria-label and the icon is hidden', () => {
    render(
      <Button iconOnly loading aria-label="Send">
        <svg data-testid="icon" />
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
    expect(screen.getByTestId('icon').closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('loading without loadingLabel: warns once per instance and announces nothing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = render(<Button loading>Ask</Button>);
    rerender(<Button loading>Ask!</Button>);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('`loading` without `loadingLabel`');
    expect(screen.getByRole('status')).toHaveTextContent('');
    warn.mockRestore();
  });

  it('is free of the i18n catalogue and CircularProgress (bundle size)', () => {
    const src = readFileSync(resolve(__dirname, 'Button.tsx'), 'utf8');
    expect(src).not.toMatch(/from '\.\.\/\.\.\/i18n|from '\.\.\/CircularProgress/);
  });
});
