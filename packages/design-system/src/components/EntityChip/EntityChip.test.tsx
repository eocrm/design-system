import { createRef, type ComponentProps, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityChip } from './EntityChip';

// A stub component used to verify polymorphic `as` forwarding. Looks like
// react-router-dom's <Link> — accepts `to`, optionally `replace`, etc.
function StubRouterLink({
  to,
  replace,
  children,
  ...rest
}: {
  to: string;
  replace?: boolean;
  children?: ReactNode;
} & ComponentProps<'a'>) {
  return (
    <a data-to={to} data-replace={replace ? 'true' : undefined} {...rest}>
      {children}
    </a>
  );
}

describe('<EntityChip>', () => {
  it('renders the label', () => {
    render(<EntityChip label="ENG-5 Fix login bug" />);
    expect(screen.getByText('ENG-5 Fix login bug')).toBeInTheDocument();
  });

  it('renders the icon aria-hidden', () => {
    render(<EntityChip label="Task" icon={<svg data-testid="icon" />} />);
    const icon = screen.getByTestId('icon');
    expect(icon.parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the prefix with the muted class', () => {
    render(<EntityChip label="Fix login bug" prefix="ENG-5" />);
    expect(screen.getByText('ENG-5').className).toMatch(/prefix/);
  });

  it('resolves the status color from category', () => {
    render(<EntityChip label="Task" status={{ label: 'In progress', category: 'in_progress' }} />);
    const status = screen.getByText('In progress').closest('span');
    expect(status?.style.getPropertyValue('--entity-chip-status-fg')).toBe(
      'var(--color-palette-blue-fg)',
    );
  });

  it('an explicit status color wins over category', () => {
    render(
      <EntityChip
        label="Task"
        status={{ label: 'Blocked', category: 'in_progress', color: 'red' }}
      />,
    );
    const status = screen.getByText('Blocked').closest('span');
    expect(status?.style.getPropertyValue('--entity-chip-status-fg')).toBe(
      'var(--color-palette-red-fg)',
    );
  });

  it('falls back to slate with no category and no color', () => {
    render(<EntityChip label="Task" status={{ label: 'Mystery' }} />);
    const status = screen.getByText('Mystery').closest('span');
    expect(status?.style.getPropertyValue('--entity-chip-status-fg')).toBe(
      'var(--color-palette-slate-fg)',
    );
  });

  it('renders as <a> with href when href is set', () => {
    render(<EntityChip label="Contact" href="/contacts/1" />);
    expect(screen.getByText('Contact').closest('a')).toHaveAttribute('href', '/contacts/1');
  });

  it('renders as <span> by default when no href is set', () => {
    render(<EntityChip label="Contact" />);
    expect(screen.getByText('Contact').closest('span')?.tagName).toBe('SPAN');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders the element passed via `as`, forwarding extra props', () => {
    render(
      <EntityChip label="Contacts" as={StubRouterLink} to="/contacts">
        {/* label prop still drives content */}
      </EntityChip>,
    );
    expect(screen.getByText('Contacts')).toHaveAttribute('data-to', '/contacts');
  });

  it('as="button" gets type="button"', () => {
    render(<EntityChip label="Pick" as="button" onClick={() => {}} />);
    expect(screen.getByRole('button', { name: /Pick/ })).toHaveAttribute('type', 'button');
  });

  it('loading renders aria-busy, an ellipsis body, and a span (never a link)', () => {
    render(<EntityChip label="Contact" href="/contacts/1" loading />);
    expect(screen.getByText('…')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText('Contact')).not.toBeInTheDocument();
    const root = screen.getByText('…').closest('span[aria-busy]');
    expect(root).toHaveAttribute('aria-busy', 'true');
  });

  it('unavailable renders a span, aria-disabled, and the unavailable class', () => {
    render(<EntityChip label="Contact" href="/contacts/1" unavailable />);
    const chip = screen.getByText('Contact').closest('span[aria-disabled]');
    expect(chip).toHaveAttribute('aria-disabled', 'true');
    expect(chip?.className).toMatch(/unavailable/);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('loading keeps the icon slot', () => {
    render(<EntityChip label="Task" icon={<svg data-testid="icon" />} loading />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('unavailable neuters a consumer onClick — forced span, no click handler', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<EntityChip label="Pick" as="button" onClick={onClick} unavailable />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    await user.click(screen.getByText('Pick'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('is valid inline content — no div/block tags render', () => {
    const { container } = render(
      <p>
        <EntityChip
          label="Contact"
          prefix="ENG-5"
          icon={<svg />}
          status={{ label: 'Done', category: 'done' }}
        />
      </p>,
    );
    expect(container.querySelector('div')).toBeNull();
  });

  it('forwards ref to the underlying element', () => {
    const ref = createRef<HTMLAnchorElement>();
    render(<EntityChip label="Contact" href="/x" ref={ref} />);
    expect(ref.current?.tagName).toBe('A');
  });

  it('merges className with the internal chip class', () => {
    render(<EntityChip label="Contact" className="external" />);
    expect(screen.getByText('Contact').closest('span')?.className).toMatch(/external/);
  });
});
