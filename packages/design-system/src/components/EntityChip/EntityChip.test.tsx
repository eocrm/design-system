import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRef, type ComponentProps, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parse, type Rule } from 'postcss';
import { compile } from 'sass';
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

  describe('truncate + trailing (#565)', () => {
    it('truncate adds the single-line class; default does not', () => {
      const { rerender } = render(<EntityChip href="/t/1" label="Task" />);
      expect(screen.getByRole('link').className).not.toMatch(/truncate/);
      rerender(<EntityChip href="/t/1" label="Task" truncate />);
      expect(screen.getByRole('link').className).toMatch(/truncate/);
    });

    it('SCSS: only the label shrinks and ellipsizes; the chip caps at its container', () => {
      const scss = readFileSync(resolve(__dirname, 'EntityChip.module.scss'), 'utf8');
      const block = scss.match(/^\.truncate\s*\{([\s\S]*?)^\}/m)?.[1] ?? '';
      expect(block).toMatch(/max-width:\s*100%/);
      expect(block).toMatch(/white-space:\s*nowrap/);
      expect(block).toMatch(/>\s*\*\s*\{\s*flex-shrink:\s*0/);
      expect(block).toMatch(
        />\s*\.label\s*\{[^}]*flex-shrink:\s*1[^}]*min-width:\s*0[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis/,
      );
    });

    it('truncate keeps the full label in the accessible name', () => {
      render(<EntityChip href="/t/1" prefix="ENG-5" label="A very long task title" truncate />);
      // jsdom has no flex layout, so it joins the parts without separators.
      expect(screen.getByRole('link', { name: /A very long task title$/ })).toBeInTheDocument();
    });

    it('renders trailing after the status, and its text joins the name', () => {
      render(
        <EntityChip
          href="/t/1"
          label="Fix login"
          status={{ label: 'Open', category: 'open' }}
          trailing={<span data-testid="adorn">High</span>}
        />,
      );
      const link = screen.getByRole('link', { name: /High$/ });
      const adorn = screen.getByTestId('adorn');
      expect(link).toContainElement(adorn);
      expect(adorn.parentElement?.className).toMatch(/trailing/);
      expect(link.lastElementChild).toBe(adorn.parentElement);
    });

    it('trailing is not rendered while loading', () => {
      render(<EntityChip href="/t/1" label="Task" loading trailing={<span>High</span>} />);
      expect(screen.queryByText('High')).toBeNull();
    });
  });

  describe('loading is announced, not just aria-busy', () => {
    // aria-busy IS valid here (a global ARIA state, unlike aria-disabled) and
    // browsers expose it — but no mainstream screen reader reliably conveys
    // `busy` on a non-live element, and the ellipsis is aria-hidden. The label
    // reached the user fine; no signal of the loading STATE did.
    it('puts the state in the accessible name of a linked chip', () => {
      render(<EntityChip label="Appointment" href="/a/1" loading />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('aria-busy', 'true');
      expect(link).toHaveAccessibleName(/\(loading\)$/);
    });

    it('keeps the real label, which is why this was the weaker case', () => {
      // Unlike `unavailable`, a loading chip shows the entity's genuine name, so
      // the label was never misleading — only the state was missing.
      const { container } = render(<EntityChip label="Appointment" loading />);
      expect(screen.getByText('Appointment')).toBeInTheDocument();
      const word = screen.getByText('(loading)');
      expect(word).toBeInTheDocument();
      // A target-less chip is role=generic and has NO accessible name, so the
      // word reaches the user as content — which only works if it is not itself
      // hidden from the tree. getByText alone would pass either way.
      expect(word).not.toHaveAttribute('aria-hidden');
      expect(word.closest('[aria-hidden="true"]')).toBeNull();
      // ...and visually hidden rather than on screen. jsdom applies no
      // CSS-module styles, so the class name is the only thing assertable —
      // without this, dropping it renders a literal "(loading)" beside the
      // ellipsis with every test still green. The `unavailable` suite already
      // pins this; the first version of this test copied the other two halves
      // and not this one.
      expect(word.className).toMatch(/hiddenLabel/);
      // Order and spacing on the bare-span form, matching the `unavailable`
      // suite's equivalent pin. The leading `…` is the aria-hidden ellipsis.
      expect(container.textContent).toBe('…Appointment (loading)');
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

    it('drops the word once loading resolves — the name mutates, by design', () => {
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

// CSS-module class names carry a per-file hash (`_chip_08a367`); strip it so
// the baseline survives stylesheet edits.
function normalizeClasses(html: string): string {
  return html.replace(/_([A-Za-z]+)_[0-9a-z]{6}/g, '$1');
}

describe('<EntityChip> — markup without segments is unchanged (#582)', () => {
  it('renders exactly the pre-segments DOM', () => {
    const { container } = render(
      <EntityChip
        href="/tasks/5"
        icon={<svg data-testid="i" />}
        prefix="ENG-5"
        label="Fix login bug"
        status={{ label: 'In progress', category: 'in_progress' }}
        trailing={<span>High</span>}
        truncate
      />,
    );
    expect(normalizeClasses(container.innerHTML)).toBe(
      '<a style="--entity-chip-status-fg: var(--color-palette-blue-fg);" class="chip truncate" href="/tasks/5">' +
        '<span class="icon" aria-hidden="true"><svg data-testid="i"></svg></span>' +
        '<span class="prefix">ENG-5</span>' +
        '<span class="label">Fix login bug</span>' +
        '<span class="dot" aria-hidden="true"></span>' +
        '<span class="status">In progress</span>' +
        '<span class="trailing"><span>High</span></span>' +
        '</a>',
    );
  });
});

const TASK_BEFORE = [
  { kind: 'icon' as const, icon: <svg data-testid="type" />, label: 'Bug', color: 'red' as const },
];
const TASK_AFTER = [
  { kind: 'icon' as const, icon: <svg data-testid="prio" />, label: 'Normal' },
  { kind: 'text' as const, text: 'Reported', color: 'amber' as const },
];

describe('<EntityChip> — segments (#582)', () => {
  it('renders before → core → after, the whole chip one link named by every part', () => {
    render(
      <EntityChip
        href="/tasks/15"
        prefix="ENG-15"
        label="Fix the login bug"
        before={TASK_BEFORE}
        after={TASK_AFTER}
      />,
    );
    // jsdom has no layout, so it doesn't separate the core's own prefix/label
    // spans (browsers do — they're blockified flex items); the whitespace the
    // component puts BETWEEN segments and core is what this asserts.
    const link = screen.getByRole('link', {
      name: /^Bug ENG-15.*Fix the login bug Normal Reported$/,
    });
    expect(link.className).toMatch(/segmented/);
    const parts = Array.from(link.children).map((c) =>
      c.className.replace(/_([A-Za-z]+)_[0-9a-z]{6}/g, '$1'),
    );
    expect(parts).toEqual([
      'segment segmentIcon',
      'core',
      'segment segmentIcon',
      'segment segmentText',
    ]);
  });

  it('icon segment: role=img named by label, glyph hidden, palette colours set (slate default)', () => {
    render(<EntityChip href="/t" label="T" before={TASK_BEFORE} after={TASK_AFTER} />);
    const bug = screen.getByRole('img', { name: 'Bug' });
    expect(screen.getByTestId('type').parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(bug.style.getPropertyValue('--entity-chip-segment-bg')).toBe(
      'var(--color-palette-red-bg)',
    );
    expect(
      screen
        .getByRole('img', { name: 'Normal' })
        .style.getPropertyValue('--entity-chip-segment-fg'),
    ).toBe('var(--color-palette-slate-fg)');
  });

  it('size overrides the glyph (icon) or font size (text), in em', () => {
    render(
      <EntityChip
        href="/t"
        label="T"
        after={[
          { kind: 'icon', icon: <svg />, label: 'Big', size: 1.2 },
          { kind: 'text', text: 'Small', size: 0.75 },
        ]}
      />,
    );
    expect(
      screen
        .getByRole('img', { name: 'Big' })
        .style.getPropertyValue('--entity-chip-segment-glyph-size'),
    ).toBe('1.2em');
    expect(screen.getByText('Small').style.fontSize).toBe('0.75em');
  });

  it('keeps the core content (icon, prefix, label, status, trailing) inside .core', () => {
    const { container } = render(
      <EntityChip
        href="/t"
        prefix="K"
        label="L"
        status={{ label: 'Open', category: 'to_do' }}
        trailing={<span>tr</span>}
        after={TASK_AFTER}
      />,
    );
    const core = container.querySelector('[class*="core"]') as HTMLElement;
    expect(core).toHaveTextContent('KLOpentr');
  });

  it('empty segment arrays behave exactly like none', () => {
    const { container } = render(<EntityChip href="/t" label="L" before={[]} after={[]} />);
    expect(normalizeClasses(container.innerHTML)).toBe(
      '<a class="chip" href="/t"><span class="label">L</span></a>',
    );
  });

  it('loading and unavailable render no segments', () => {
    const { container, rerender } = render(
      <EntityChip href="/t" label="L" loading before={TASK_BEFORE} after={TASK_AFTER} />,
    );
    expect(container.querySelector('[class*="segment"]')).toBeNull();
    rerender(
      <EntityChip href="/t" label="L" unavailable before={TASK_BEFORE} after={TASK_AFTER} />,
    );
    expect(container.querySelector('[class*="segment"]')).toBeNull();
  });
});

describe('<EntityChip> — segmented layout CSS (#582)', () => {
  const css = parse(compile(resolve(__dirname, './EntityChip.module.scss')).css);
  const decl = (selector: string, prop: string): string | undefined => {
    let value: string | undefined;
    css.walkRules((rule: Rule) => {
      if (rule.selector !== selector) return;
      rule.walkDecls(prop, (d) => {
        value = d.value;
      });
    });
    return value;
  };

  it('root is the rounded clip: no padding/fill, clips, baseline from the core', () => {
    expect(decl('.chip.segmented', 'padding')).toBe('0');
    expect(decl('.chip.segmented', 'background')).toBe('none');
    expect(decl('.chip.segmented', 'overflow')).toBe('hidden');
    expect(decl('.chip.segmented', 'align-items')).toBe('baseline');
    expect(decl('.chip.segmented', 'max-width')).toBe('100%');
    expect(decl('.chip.segmented', 'white-space')).toBe('nowrap');
  });

  it('core shrinks and ellipsizes its label; segments never shrink and stretch to the core', () => {
    expect(decl('.core', 'flex-shrink')).toBe('1');
    expect(decl('.core', 'min-width')).toBe('0');
    expect(decl('.core > .label', 'text-overflow')).toBe('ellipsis');
    expect(decl('.segment', 'flex-shrink')).toBe('0');
    expect(decl('.segment', 'align-self')).toBe('stretch');
    expect(decl('.segmentGlyph > svg', 'width')).toBe('var(--entity-chip-segment-glyph-size)');
    expect(decl('.segmentText', 'font-size')).toBe('var(--entity-chip-segment-text-size)');
  });
});

// jsdom has no layout: fake the label's box to say whether it is clipped.
function fakeClip(el: HTMLElement, clipped: boolean) {
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: 100 });
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: clipped ? 300 : 100 });
}

describe('<EntityChip> — tooltips and labelMaxWidth (#582)', () => {
  it('icon segment shows its label on hover, and only that tooltip', async () => {
    const user = userEvent.setup();
    render(<EntityChip href="/t" label="Fix" truncate before={TASK_BEFORE} />);
    await user.hover(screen.getByRole('img', { name: 'Bug' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Bug');
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
  });

  it('text segment shows its tooltip when given', async () => {
    const user = userEvent.setup();
    render(
      <EntityChip
        href="/t"
        label="Fix"
        after={[{ kind: 'text', text: 'Reported', tooltip: 'Status: Reported' }]}
      />,
    );
    await user.hover(screen.getByText('Reported'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Status: Reported');
  });

  it('label tooltip shows the full label only when the label is clipped', async () => {
    const user = userEvent.setup();
    render(<EntityChip href="/t" label="A very long task title" truncate />);
    const label = screen.getByText('A very long task title');
    fakeClip(label, true);
    await user.hover(label);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('A very long task title');
  });

  it('a fully visible label gets no tooltip and no aria-describedby', async () => {
    const user = userEvent.setup();
    render(<EntityChip href="/t" label="Short" truncate />);
    const label = screen.getByText('Short');
    fakeClip(label, false);
    await user.hover(label);
    await new Promise((r) => setTimeout(r, 600)); // past Tooltip's 400ms delay
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(label).not.toHaveAttribute('aria-describedby');
  });

  it('labelMaxWidth caps the label in ch, single-line, even without truncate/segments', () => {
    render(<EntityChip href="/t" label="Long title" labelMaxWidth={40} />);
    const label = screen.getByText('Long title');
    expect(label.style.maxWidth).toBe('40ch');
    expect(label.className).toMatch(/capped/);
  });

  it('.capped makes the label single-line with an ellipsis', () => {
    const scss = readFileSync(resolve(__dirname, 'EntityChip.module.scss'), 'utf8');
    expect(scss).toMatch(
      /\.capped\s*\{[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;/,
    );
  });
});
