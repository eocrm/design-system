import { createRef, type ComponentProps, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n/I18nProvider';
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

  it('status dot is an empty aria-hidden sibling of the status span (not a glyph)', () => {
    const { container } = render(
      <EntityChip label="Task" status={{ label: 'Done', category: 'done' }} />,
    );
    const dot = container.querySelector('[class*="dot"]') as HTMLElement;
    expect(dot).toHaveAttribute('aria-hidden', 'true');
    expect(dot.textContent).toBe('');
    expect(dot.parentElement).toBe(container.firstElementChild); // direct flex item of the chip root
  });

  it('resolves the status color from category, injected on the chip root (so the dot sees it too)', () => {
    const { container } = render(
      <EntityChip label="Task" status={{ label: 'In progress', category: 'in_progress' }} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--entity-chip-status-fg')).toBe(
      'var(--color-palette-blue-fg)',
    );
  });

  it('an explicit status color wins over category', () => {
    const { container } = render(
      <EntityChip
        label="Task"
        status={{ label: 'Blocked', category: 'in_progress', color: 'red' }}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--entity-chip-status-fg')).toBe(
      'var(--color-palette-red-fg)',
    );
  });

  it('falls back to slate with no category and no color', () => {
    const { container } = render(<EntityChip label="Task" status={{ label: 'Mystery' }} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--entity-chip-status-fg')).toBe(
      'var(--color-palette-slate-fg)',
    );
  });

  it('the separator dot takes the status color via currentcolor (CSS reads --entity-chip-status-fg from the root)', () => {
    const { container } = render(
      <EntityChip label="Task" status={{ label: 'Done', category: 'done' }} />,
    );
    // jsdom doesn't resolve CSS Modules, so this asserts the wiring: the dot
    // has no per-element color override and the fg custom property lives on
    // the shared root ancestor the .dot/.status CSS rules both read from.
    const dot = container.querySelector('[class*="dot"]') as HTMLElement;
    const root = container.firstElementChild as HTMLElement;
    expect(dot.style.getPropertyValue('--entity-chip-status-fg')).toBe('');
    expect(root.contains(dot)).toBe(true);
    expect(root.style.getPropertyValue('--entity-chip-status-fg')).toBe(
      'var(--color-palette-green-fg)',
    );
  });

  it('renders as <a> with href when href is set', () => {
    render(<EntityChip label="Contact" href="/contacts/1" />);
    expect(screen.getByText('Contact').closest('a')).toHaveAttribute('href', '/contacts/1');
  });

  it('renders as <span> by default when no href is set', () => {
    const { container } = render(<EntityChip label="Contact" />);
    expect((container.firstElementChild as HTMLElement).tagName).toBe('SPAN');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders the element passed via `as`, forwarding extra props', () => {
    render(
      <EntityChip label="Contacts" as={StubRouterLink} to="/contacts">
        {/* label prop still drives content */}
      </EntityChip>,
    );
    expect(screen.getByText('Contacts').closest('a')).toHaveAttribute('data-to', '/contacts');
  });

  it('as="button" gets type="button"', () => {
    render(<EntityChip label="Pick" as="button" onClick={() => {}} />);
    expect(screen.getByRole('button', { name: /Pick/ })).toHaveAttribute('type', 'button');
  });

  it('loading + href stays a real link, aria-busy, named after the label', () => {
    render(<EntityChip label="Contact" href="/contacts/1" loading />);
    expect(screen.getByText('…')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Contact/ });
    expect(link).toHaveAttribute('href', '/contacts/1');
    expect(link).toHaveAttribute('aria-busy', 'true');
    expect(link).not.toHaveAttribute('aria-disabled');
  });

  it('unavailable + href renders a live <a href> — no aria-disabled', () => {
    render(<EntityChip label="Contact" href="/contacts/1" unavailable />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/contacts/1');
    expect(link).not.toHaveAttribute('aria-disabled');
    expect(link.className).toMatch(/unavailable/);
  });

  it('`color` injects the palette bg/fg pair, and bg-hover matches bg so the hover filter works on any color', () => {
    const { container } = render(<EntityChip label="Acme Corp" href="/deals/9" color="violet" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--entity-chip-bg')).toBe('var(--color-palette-violet-bg)');
    expect(root.style.getPropertyValue('--entity-chip-fg')).toBe('var(--color-palette-violet-fg)');
    expect(root.style.getPropertyValue('--entity-chip-bg-hover')).toBe(
      'var(--color-palette-violet-bg)',
    );
  });

  it('without `color`, no chip-fill custom properties are injected — the default accent (mention-matched) tokens apply', () => {
    const { container } = render(<EntityChip label="Contact" href="/contacts/1" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--entity-chip-bg')).toBe('');
    expect(root.style.getPropertyValue('--entity-chip-fg')).toBe('');
  });

  it('`color` and `status` inject independently — the status color does not leak into the chip fill', () => {
    const { container } = render(
      <EntityChip
        label="Fix login bug"
        href="/tasks/5"
        color="teal"
        status={{ label: 'In progress', category: 'in_progress' }}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--entity-chip-bg')).toBe('var(--color-palette-teal-bg)');
    expect(root.style.getPropertyValue('--entity-chip-status-fg')).toBe(
      'var(--color-palette-blue-fg)',
    );
  });

  it("unavailable + `color`: the muted fg override still wins (the `.unavailable` class rule beats `.chip`'s color regardless of the injected --entity-chip-fg)", () => {
    const { container } = render(
      <EntityChip label="Deleted contact" href="/contacts/9" color="violet" unavailable />,
    );
    const root = container.firstElementChild as HTMLElement;
    // The chip fill's own custom property IS still injected (unavailable
    // doesn't touch the background) — only the text color is muted, by a
    // `.unavailable { color: ... }` rule declared after `.chip`'s in the
    // stylesheet, independent of what --entity-chip-fg resolves to.
    expect(root.style.getPropertyValue('--entity-chip-fg')).toBe('var(--color-palette-violet-fg)');
    expect(root.className).toMatch(/unavailable/);
  });

  it('unavailable + custom `as` keeps the real component and its props', () => {
    render(<EntityChip label="Task" as={StubRouterLink} to="/tasks/5" unavailable />);
    expect(screen.getByText('Task').closest('a')).toHaveAttribute('data-to', '/tasks/5');
  });

  it('bare-span loading stays a span with aria-busy', () => {
    render(<EntityChip label="Contact" loading />);
    const root = screen.getByText('…').closest('span[aria-busy]');
    expect(root).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('loading keeps the icon slot', () => {
    render(<EntityChip label="Task" icon={<svg data-testid="icon" />} loading />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('bare-span unavailable keeps aria-disabled and neuters a consumer onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<EntityChip label="Pick" onClick={onClick} unavailable />);
    const chip = screen.getByText('Pick').closest('span[aria-disabled]');
    expect(chip).toHaveAttribute('aria-disabled', 'true');
    expect(chip?.className).toMatch(/unavailable/);
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
    const { container } = render(<EntityChip label="Contact" className="external" />);
    expect(container.querySelector('.external')?.className).toMatch(/chip/);
  });

  describe('loading is announced, not just aria-busy', () => {
    // aria-busy IS valid here (it is a global ARIA state, unlike aria-disabled),
    // but it carries no weight outside a live region and the ellipsis is
    // aria-hidden — so nothing reached a screen reader at all.
    it('puts the state in the accessible name of a linked chip', () => {
      render(<EntityChip label="Appointment" href="/a/1" loading />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('aria-busy', 'true');
      expect(link).toHaveAccessibleName(/\(loading\)$/);
    });

    it('keeps the real label, which is why this was the weaker case', () => {
      // Unlike `unavailable`, a loading chip shows the entity's genuine name, so
      // the label was never misleading — only the state was missing.
      render(<EntityChip label="Appointment" loading />);
      expect(screen.getByText('Appointment')).toBeInTheDocument();
      expect(screen.getByText('(loading)')).toBeInTheDocument();
    });

    it('announces loading BEFORE unavailable when a chip carries both', () => {
      render(<EntityChip label="Appointment" href="/a/1" loading unavailable />);
      // The accessible NAME, not textContent: the `…` is aria-hidden, so it is
      // in the DOM but correctly absent from the name. Regex pins the ORDER
      // without pinning whitespace, which differs between jsdom and browsers.
      expect(screen.getByRole('link')).toHaveAccessibleName(
        /^Appointment\s*\(loading\)\s*\(unavailable\)$/,
      );
    });

    it('adds nothing once loading resolves — the name mutates, by design', () => {
      // This is the cost the JSDoc warns about, pinned so it is a known
      // property rather than a surprise: the accessible name is not stable
      // across the transition.
      const { rerender } = render(<EntityChip label="Appointment" href="/a/1" loading />);
      expect(screen.getByRole('link')).toHaveAccessibleName(/\(loading\)$/);
      rerender(<EntityChip label="Appointment" href="/a/1" />);
      expect(screen.getByRole('link')).toHaveAccessibleName('Appointment');
      expect(screen.queryByText('(loading)')).not.toBeInTheDocument();
    });

    it('takes the word from the i18n provider, including an empty override', () => {
      // Overriding to '' is the documented escape hatch for consumers who would
      // rather own an aria-live region than have the name change.
      render(
        <I18nProvider locale="en" overrides={{ entityChip: { loading: '' } }}>
          <EntityChip label="Appointment" href="/a/1" loading />
        </I18nProvider>,
      );
      expect(screen.getByRole('link')).toHaveAccessibleName('Appointment');
    });
  });

  describe('unavailable is announced, not just muted', () => {
    // The bug: browsers DO expose `aria-disabled`, but it carries no meaning on
    // a non-widget role such as `generic`, so no assistive tech conveys it —
    // the muted colour was the sole carrier of the state. The canonical use is to
    // withhold the entity name and show a TYPE word, which made a masked
    // reference indistinguishable from a real entity of that name.
    it('renders the state word as real text on a bare-span chip', () => {
      // A target-less chip is role=generic, which has no accessible name at
      // all — the word reaches the user as CONTENT in reading order, not via a
      // name. So this asserts presence, not a name.
      render(<EntityChip label="Appointment" unavailable />);
      expect(screen.getByText('(unavailable)')).toBeInTheDocument();
    });

    it('puts the state in the accessible NAME of a linked chip', () => {
      // Regex, not an exact string: jsdom's accname implementation does not
      // insert the inter-element space a browser does, so pinning the whole
      // string would bake a false model of the platform into the suite.
      // Chromium computes "Appointment (unavailable)" here.
      render(<EntityChip label="Appointment" href="/a/1" unavailable />);
      expect(screen.getByRole('link')).toHaveAccessibleName(/\(unavailable\)$/);
    });

    it('is defeated by a consumer aria-label — which is why the docs forbid it', () => {
      // {...rest} spreads before the component-owned ARIA, and aria-label is not
      // reclaimed. Pinning the trap so nobody "fixes" it by accident: an
      // aria-label replaces the whole name and takes the state word with it.
      render(<EntityChip label="Appointment" href="/a/1" unavailable aria-label="Appointment" />);
      const link = screen.getByRole('link');
      expect(link).toHaveAccessibleName('Appointment');
      // The word is still in the DOM — it just no longer contributes to the name.
      expect(link.textContent).toContain('(unavailable)');
    });

    it('is the ONLY difference from an available chip of the same label', () => {
      // The exact repro from the issue: same label, same icon, one flag apart.
      const { container: off } = render(<EntityChip label="Appointment" />);
      const { container: on } = render(<EntityChip label="Appointment" unavailable />);
      expect(off.textContent).toBe('Appointment');
      expect(on.textContent).toBe('Appointment (unavailable)');
    });

    it('announces it on a LINKED chip too, where the chip stays interactive', () => {
      // Muted styling is the only signal there as well, even though the link
      // is live and carries no aria-disabled.
      render(<EntityChip label="Appointment" href="/appointments/7" unavailable />);
      const link = screen.getByRole('link');
      expect(link).not.toHaveAttribute('aria-disabled');
      expect(link.textContent).toContain('(unavailable)');
    });

    it('announces it alongside loading, where the label is also hidden', () => {
      render(<EntityChip label="Appointment" href="/a/1" loading unavailable />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('aria-busy', 'true');
      expect(link.textContent).toContain('(unavailable)');
    });

    it('places the state word right after the name, before any status', () => {
      // Trailing the status gave "Appointment In progress (unavailable)", where
      // the parenthetical can be heard as qualifying the STATUS rather than the
      // entity. This is the reason it is rendered in both branches rather than
      // once after them.
      render(
        <EntityChip
          label="Appointment"
          href="/a/1"
          status={{ label: 'In progress', category: 'in_progress' }}
          unavailable
        />,
      );
      const link = screen.getByRole('link');
      expect(link.textContent).toBe('Appointment (unavailable)In progress');
    });

    it('adds nothing when the chip is available', () => {
      render(<EntityChip label="Appointment" />);
      expect(screen.queryByText('(unavailable)')).not.toBeInTheDocument();
    });

    it('renders the state word visually hidden, not on screen', () => {
      const { container } = render(<EntityChip label="Appointment" unavailable />);
      const word = screen.getByText('(unavailable)');
      // Same mechanism the loading label already uses — real text in the DOM,
      // clipped by the visually-hidden mixin rather than display:none (which
      // would remove it from the accessible name too).
      expect(word.className).toMatch(/hiddenLabel/);
      expect(container.querySelector('[hidden]')).toBeNull();
      expect(word).not.toHaveAttribute('aria-hidden');
    });

    it('takes the word from the i18n provider', () => {
      render(
        <I18nProvider locale="en" overrides={{ entityChip: { unavailable: '[masked]' } }}>
          <EntityChip label="Appointment" unavailable />
        </I18nProvider>,
      );
      expect(screen.getByText('[masked]')).toBeInTheDocument();
      expect(screen.queryByText('(unavailable)')).not.toBeInTheDocument();
    });
  });
});
