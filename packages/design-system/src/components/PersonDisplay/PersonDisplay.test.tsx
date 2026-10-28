import { createRef } from 'react';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { parse, type Declaration, type Rule } from 'postcss';
import { compile } from 'sass';
import { I18nProvider } from '../../i18n/I18nProvider';
import { Link } from '../Link';
import { PersonDisplay, type PersonDisplaySize } from './PersonDisplay';

it('renders Avatar + Name + Description together', () => {
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Sarah Chen" />
      <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
      <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
    </PersonDisplay>,
  );
  expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
  expect(screen.getByText('sarah@acme.com')).toBeInTheDocument();
});

it('defaults size to md and exposes it via data-size on the root', () => {
  const { container } = render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Avery Liu" />
      <PersonDisplay.Name>Avery Liu</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(container.firstElementChild).toHaveAttribute('data-size', 'md');
});

it('size="sm" propagates to the root data-size', () => {
  const { container } = render(
    <PersonDisplay size="sm">
      <PersonDisplay.Avatar name="Avery Liu" />
      <PersonDisplay.Name>Avery Liu</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(container.firstElementChild).toHaveAttribute('data-size', 'sm');
});

it('size="lg" propagates to the root data-size', () => {
  const { container } = render(
    <PersonDisplay size="lg">
      <PersonDisplay.Avatar name="Priya Mehta" />
      <PersonDisplay.Name>Priya Mehta</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(container.firstElementChild).toHaveAttribute('data-size', 'lg');
});

it('Name with no href renders as plain text (no anchor)', () => {
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Marcus Vega" />
      <PersonDisplay.Name>Marcus Vega</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.getByText('Marcus Vega')).toBeInTheDocument();
});

it('Name with href renders as an anchor with the right URL', () => {
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Sarah Chen" />
      <PersonDisplay.Name href="/contacts/sarah-chen">Sarah Chen</PersonDisplay.Name>
    </PersonDisplay>,
  );
  const link = screen.getByRole('link', { name: 'Sarah Chen' });
  expect(link).toHaveAttribute('href', '/contacts/sarah-chen');
});

it('renders multiple Description lines, each visible', () => {
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Marcus Vega" />
      <PersonDisplay.Name>Marcus Vega</PersonDisplay.Name>
      <PersonDisplay.Description>marcus@acme.com</PersonDisplay.Description>
      <PersonDisplay.Description>Account Executive</PersonDisplay.Description>
    </PersonDisplay>,
  );
  expect(screen.getByText('marcus@acme.com')).toBeInTheDocument();
  expect(screen.getByText('Account Executive')).toBeInTheDocument();
});

it('Description accepts arbitrary children (renders nested content)', () => {
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Admin" />
      <PersonDisplay.Name>System Admin</PersonDisplay.Name>
      <PersonDisplay.Description>
        admin@acme.com <span data-testid="inline-marker">impersonating</span>
      </PersonDisplay.Description>
    </PersonDisplay>,
  );
  expect(screen.getByTestId('inline-marker')).toHaveTextContent('impersonating');
});

it('Avatar status prop passes through (presence dot rendered)', () => {
  const { container } = render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Priya Mehta" status="online" />
      <PersonDisplay.Name>Priya Mehta</PersonDisplay.Name>
    </PersonDisplay>,
  );
  // Avatar renders the presence dot with data-status attribute.
  expect(container.querySelector('[data-status="online"]')).not.toBeNull();
});

it('className on root, Name, Description merges with internal styles', () => {
  const { container } = render(
    <PersonDisplay className="custom-root">
      <PersonDisplay.Avatar name="Sarah" />
      <PersonDisplay.Name className="custom-name">Sarah Chen</PersonDisplay.Name>
      <PersonDisplay.Description className="custom-desc">sarah@x.com</PersonDisplay.Description>
    </PersonDisplay>,
  );
  expect(container.firstElementChild).toHaveClass('custom-root');
  expect(container.querySelector('.custom-name')).toBeInTheDocument();
  expect(container.querySelector('.custom-desc')).toBeInTheDocument();
});

it('Root forwards ref to the wrapping div', () => {
  const ref = createRef<HTMLDivElement>();
  render(
    <PersonDisplay ref={ref}>
      <PersonDisplay.Avatar name="Sarah" />
      <PersonDisplay.Name>Sarah</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(ref.current).toBeInstanceOf(HTMLDivElement);
});

it('Description forwards ref to its span', () => {
  const ref = createRef<HTMLSpanElement>();
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Sarah" />
      <PersonDisplay.Name>Sarah</PersonDisplay.Name>
      <PersonDisplay.Description ref={ref}>sarah@x.com</PersonDisplay.Description>
    </PersonDisplay>,
  );
  expect(ref.current).toBeInstanceOf(HTMLSpanElement);
});

it('Avatar forwards ref to its span', () => {
  const ref = createRef<HTMLSpanElement>();
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar ref={ref} name="Sarah" />
      <PersonDisplay.Name>Sarah</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(ref.current).toBeInstanceOf(HTMLSpanElement);
});

it('Name (no href) forwards ref to its span', () => {
  const ref = createRef<HTMLSpanElement>();
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Sarah" />
      <PersonDisplay.Name ref={ref}>Sarah</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(ref.current).toBeInstanceOf(HTMLSpanElement);
});

it('Name (with href) forwards ref to its anchor', () => {
  const ref = createRef<HTMLAnchorElement>();
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Sarah" />
      <PersonDisplay.Name ref={ref} href="/contacts/sarah">
        Sarah
      </PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
});

it('spreads arbitrary HTML attributes onto the root div', () => {
  const { container } = render(
    <PersonDisplay data-testid="person-row">
      <PersonDisplay.Avatar name="Sarah" />
      <PersonDisplay.Name>Sarah</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(container.firstElementChild).toHaveAttribute('data-testid', 'person-row');
});

it('renders without crashing when only Avatar + Name are passed (no Description)', () => {
  render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Avery Liu" />
      <PersonDisplay.Name>Avery Liu</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(screen.getByText('Avery Liu')).toBeInTheDocument();
});

it('does not apply the shrink class by default', () => {
  const { container } = render(
    <PersonDisplay>
      <PersonDisplay.Avatar name="Sarah" />
      <PersonDisplay.Name>Sarah</PersonDisplay.Name>
    </PersonDisplay>,
  );
  // CSS-module hashed class contains the substring "shrink" when applied.
  expect(container.firstElementChild?.className).not.toMatch(/shrink/);
});

it('shrink applies the shrink-wrap class on the root', () => {
  const { container } = render(
    <PersonDisplay shrink>
      <PersonDisplay.Avatar name="Sarah" />
      <PersonDisplay.Name>Sarah</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(container.firstElementChild?.className).toMatch(/shrink/);
  // shrink composes with (does not replace) the root class + data-size.
  expect(container.firstElementChild?.className).toMatch(/root/);
  expect(container.firstElementChild).toHaveAttribute('data-size', 'md');
});

it('shrink composes with a consumer className', () => {
  const { container } = render(
    <PersonDisplay shrink className="custom-root">
      <PersonDisplay.Avatar name="Sarah" />
      <PersonDisplay.Name>Sarah</PersonDisplay.Name>
    </PersonDisplay>,
  );
  expect(container.firstElementChild).toHaveClass('custom-root');
  expect(container.firstElementChild?.className).toMatch(/shrink/);
});

describe('PersonDisplay stylesheet — self-containment (#527)', () => {
  const stylesheet = parse(compile(resolve(__dirname, './PersonDisplay.module.scss')).css);

  function rule(selector: string): Rule | undefined {
    let match: Rule | undefined;
    stylesheet.walkRules((r) => {
      if (r.selectors.includes(selector)) match = r;
    });
    return match;
  }
  function decl(r: Rule | undefined, property: string): Declaration | undefined {
    let match: Declaration | undefined;
    r?.walkDecls(property, (d) => {
      match = d;
    });
    return match;
  }

  // An inline-flex box is sized shrink-to-fit, whose floor is its min-content
  // width — which a nowrap Description makes as wide as the whole line. Both
  // halves are load-bearing: measured in Chromium, dropping either one puts
  // ~204px of a long email outside a DataTable stacked card.
  it('the root clamps to its container', () => {
    expect(decl(rule('.root'), 'max-width')).toMatchObject({ value: '100%' });
  });

  // The INLINE axis only, and the order matters: `overflow` is x-then-y, so
  // `visible clip` clips the block axis instead — verified in Chromium, where
  // it reports `overflow-x: visible`. #527 is a horizontal escape, and the
  // block axis of a single `nowrap` line has no overflow to clip, so clipping
  // it bought nothing and shaved the focus ring of any focusable a consumer
  // puts in a Description (#524's failure mode). `clip` over `hidden` so the
  // line is not a scroll container for a string nobody can scroll.
  it('the nowrap description clips itself on the inline axis only', () => {
    const description = rule('.description');
    expect(decl(description, 'white-space')).toMatchObject({ value: 'nowrap' });
    expect(decl(description, 'overflow')).toMatchObject({ value: 'clip visible' });
    expect(decl(description, 'min-width')).toMatchObject({ value: '0' });
  });
});

describe('PersonDisplay — size="inline" (#579)', () => {
  it('uses the inline Avatar and a bare Name that inherits size, weight and colour', () => {
    const { container } = render(
      <PersonDisplay size="inline">
        <PersonDisplay.Avatar name="Avery Liu" />
        <PersonDisplay.Name>Avery Liu</PersonDisplay.Name>
      </PersonDisplay>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveAttribute('data-size', 'inline');
    expect(screen.getByRole('img', { name: 'Avery Liu' }).className).toMatch(/inline/);
    // No <Text> wrapper inside the Name slot: Text always sets a size and
    // weight class, so the text must sit directly in the slot's own span.
    const slot = root.querySelector('[class*="name"]') as HTMLElement;
    expect(slot).toHaveTextContent('Avery Liu');
    expect(slot.children).toHaveLength(0);
  });

  it('a linked Name also renders bare', () => {
    render(
      <PersonDisplay size="inline">
        <PersonDisplay.Avatar name="Avery Liu" />
        <PersonDisplay.Name href="/m/avery">Avery Liu</PersonDisplay.Name>
      </PersonDisplay>,
    );
    expect(screen.getByRole('link', { name: 'Avery Liu' }).children).toHaveLength(0);
  });

  it('top-aligns to the line box so it never grows a text line', () => {
    const css = parse(compile(resolve(__dirname, './PersonDisplay.module.scss')).css);
    let va: string | undefined;
    css.walkRules((rule: Rule) => {
      if (rule.selector !== '.root[data-size=inline]') return;
      rule.walkDecls('vertical-align', (d: Declaration) => {
        va = d.value;
      });
    });
    expect(va).toBe('top');
  });
});

describe('PersonDisplay — AgentAvatar + OnBehalfOf (#717)', () => {
  // Written first, against the pre-#717 code: without OnBehalfOf the output
  // must stay DOM-identical (no agent-row wrapper, no new attributes).
  it('without OnBehalfOf the DOM is unchanged', () => {
    const { container } = render(
      <PersonDisplay>
        <PersonDisplay.Avatar name="Sarah Chen" />
        <PersonDisplay.Name href="/c/sarah">Sarah Chen</PersonDisplay.Name>
        <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
      </PersonDisplay>,
    );
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<div class="_root_01f9b9" data-size="md"><span role="img" aria-label="Sarah Chen" class="_avatar_5b238c _md_5b238c" style="--avatar-bg: var(--color-avatar-2);"><span class="_crop_5b238c"><span aria-hidden="true">SC</span></span></span><div class="_column_01f9b9"><a href="/c/sarah" class="_link_ef752c _subtle_ef752c _name_01f9b9"><span class="_text_d6c5f6 _sizeMd_d6c5f6 _toneDefault_d6c5f6 _weightMedium_d6c5f6 _alignLeft_d6c5f6">Sarah Chen</span></a><span class="_description_01f9b9"><span class="_text_d6c5f6 _sizeSm_d6c5f6 _toneMuted_d6c5f6 _weightRegular_d6c5f6 _alignLeft_d6c5f6">sarah@acme.com</span></span></div></div>"`,
    );
  });

  const AGENT = 'Claude Code · demo laptop';
  const agentRow = (container: HTMLElement) =>
    container.querySelector('[class*="agentRow"]') as HTMLElement | null;

  it('OnBehalfOf renders "for" + member in one row with the Name', () => {
    const { container } = render(
      <PersonDisplay>
        <PersonDisplay.AgentAvatar name={AGENT} member={{ name: 'Ada Lovelace' }} />
        <PersonDisplay.Name>{AGENT}</PersonDisplay.Name>
        <PersonDisplay.OnBehalfOf>Ada Lovelace</PersonDisplay.OnBehalfOf>
        <PersonDisplay.Description>CLI session</PersonDisplay.Description>
      </PersonDisplay>,
    );
    const row = agentRow(container);
    expect(row).not.toBeNull();
    expect(row).toHaveTextContent(`${AGENT}for Ada Lovelace`);
    // The row is the column's first item; Descriptions follow it.
    expect(row?.parentElement?.firstElementChild).toBe(row);
    expect(row?.nextElementSibling).toHaveTextContent('CLI session');
  });

  it.each([undefined, '', '  '])(
    'OnBehalfOf with no member (%j) renders the former-member copy',
    (member) => {
      render(
        <PersonDisplay>
          <PersonDisplay.Name>{AGENT}</PersonDisplay.Name>
          <PersonDisplay.OnBehalfOf>{member}</PersonDisplay.OnBehalfOf>
        </PersonDisplay>,
      );
      expect(screen.getByText('for a former member')).toBeInTheDocument();
    },
  );

  it('OnBehalfOf accepts a Link child', () => {
    render(
      <PersonDisplay>
        <PersonDisplay.Name>{AGENT}</PersonDisplay.Name>
        <PersonDisplay.OnBehalfOf>
          <Link href="/m/ada">Ada Lovelace</Link>
        </PersonDisplay.OnBehalfOf>
      </PersonDisplay>,
    );
    expect(screen.getByRole('link', { name: 'Ada Lovelace' })).toHaveAttribute('href', '/m/ada');
  });

  it.each<PersonDisplaySize>(['inline', 'sm', 'md', 'lg'])(
    'AgentAvatar inside PersonDisplay is aria-hidden and sized from context (%s)',
    (size) => {
      const { container } = render(
        <PersonDisplay size={size}>
          {/* Consumer ARIA must not resurface it as an image. */}
          <PersonDisplay.AgentAvatar
            name={AGENT}
            member={{ name: 'Ada Lovelace' }}
            role="img"
            aria-label="x"
          />
          <PersonDisplay.Name>{AGENT}</PersonDisplay.Name>
          <PersonDisplay.OnBehalfOf>Ada Lovelace</PersonDisplay.OnBehalfOf>
        </PersonDisplay>,
      );
      expect(screen.queryByRole('img')).toBeNull();
      const agent = container.querySelector('[data-agent-avatar]') as HTMLElement;
      // Sorted into the avatar slot: the root's first child, outside the column.
      expect(container.firstElementChild?.firstElementChild).toBe(agent);
      expect(agent).toHaveAttribute('aria-hidden', 'true');
      expect(agent).not.toHaveAttribute('aria-label');
      expect(agent.className).toMatch(new RegExp(`_${size}_`));
      expect(agent.querySelector('[data-part="badge"]') !== null).toBe(size !== 'inline');
    },
  );

  it('title carries the full text when children are strings', () => {
    const { container } = render(
      <PersonDisplay>
        <PersonDisplay.Name>{AGENT}</PersonDisplay.Name>
        <PersonDisplay.OnBehalfOf>Ada Lovelace</PersonDisplay.OnBehalfOf>
      </PersonDisplay>,
    );
    const [name, onBehalfOf] = Array.from(agentRow(container)!.children);
    expect(name).toHaveAttribute('title', AGENT);
    expect(onBehalfOf).toHaveAttribute('title', 'for Ada Lovelace');
  });

  it('no title when children are not a string', () => {
    const { container } = render(
      <PersonDisplay>
        <PersonDisplay.Name>
          <b>{AGENT}</b>
        </PersonDisplay.Name>
        <PersonDisplay.OnBehalfOf>
          <Link href="/m/ada">Ada Lovelace</Link>
        </PersonDisplay.OnBehalfOf>
      </PersonDisplay>,
    );
    const [name, onBehalfOf] = Array.from(agentRow(container)!.children);
    expect(name).not.toHaveAttribute('title');
    expect(onBehalfOf).not.toHaveAttribute('title');
  });

  it('ru prefix', () => {
    render(
      <I18nProvider locale="ru">
        <PersonDisplay>
          <PersonDisplay.Name>{AGENT}</PersonDisplay.Name>
          <PersonDisplay.OnBehalfOf>Ada Lovelace</PersonDisplay.OnBehalfOf>
        </PersonDisplay>
      </I18nProvider>,
    );
    expect(screen.getByTitle('от имени: Ada Lovelace')).toHaveTextContent('от имени: Ada Lovelace');
  });

  it('OnBehalfOf is muted, regular weight, at the Name size', () => {
    const { container } = render(
      <PersonDisplay size="lg">
        <PersonDisplay.Name>{AGENT}</PersonDisplay.Name>
        <PersonDisplay.OnBehalfOf>Ada Lovelace</PersonDisplay.OnBehalfOf>
      </PersonDisplay>,
    );
    const text = agentRow(container)!.children[1].firstElementChild!;
    expect(text.className).toMatch(/sizeLg/);
    expect(text.className).toMatch(/toneMuted/);
    expect(text.className).toMatch(/weightRegular/);
  });

  describe('stylesheet (Review Focus 1)', () => {
    const css = parse(compile(resolve(__dirname, './PersonDisplay.module.scss')).css);
    const tokens = parse(compile(resolve(__dirname, './PersonDisplay.tokens.scss')).css);
    function decls(selector: string): Record<string, string> {
      const out: Record<string, string> = {};
      css.walkRules((r) => {
        if (r.selectors.includes(selector)) r.walkDecls((d) => void (out[d.prop] = d.value));
      });
      return out;
    }

    it('the agent row is a shrinkable flex row', () => {
      expect(decls('.agentRow')).toMatchObject({
        display: 'flex',
        'min-width': '0',
        gap: 'var(--person-display-agent-row-gap)',
      });
    });

    it('OnBehalfOf shrinks first, down to a token min-width', () => {
      const name = decls('.agentRow > .name');
      const onBehalfOf = decls('.onBehalfOf');
      expect(Number(onBehalfOf['flex-shrink'])).toBeGreaterThan(Number(name['flex-shrink']));
      expect(onBehalfOf['min-width']).toContain('var(--person-display-on-behalf-of-min-width)');
      expect(name['min-width']).toBe('0');
    });

    // Block containers: a flex container does not paint the ellipsis (see
    // `.description`). Inline axis only, like `.description`, so a focused
    // Link's top/bottom ring bands are not clipped; `margin` compensation is
    // banned by stylelint, so the block axis can't reserve ring room instead.
    it.each(['.agentRow > .name', '.onBehalfOf'])('%s truncates with an ellipsis', (selector) => {
      expect(decls(selector)).toMatchObject({
        display: 'block',
        overflow: 'clip visible',
        'text-overflow': 'ellipsis',
        'white-space': 'nowrap',
      });
    });

    // A Link inside OnBehalfOf is flush with the clip's inline end; padding
    // inside the clip box keeps its trailing ring band painted.
    it('OnBehalfOf reserves ring room at its inline end', () => {
      expect(decls('.onBehalfOf')['padding-inline-end']).toBe(
        'calc(var(--ring-width) + var(--ring-offset))',
      );
    });

    it('declares the row tokens', () => {
      const t: Record<string, string> = {};
      tokens.walkDecls((d) => void (t[d.prop] = d.value));
      expect(t['--person-display-agent-row-gap']).toBe('var(--space-1)');
      expect(t['--person-display-on-behalf-of-min-width']).toBeDefined();
    });
  });
});
