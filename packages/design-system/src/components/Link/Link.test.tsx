import { createRef, type ComponentProps, type ReactNode } from 'react';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { parse, type Rule } from 'postcss';
import { compile } from 'sass';
import { Link } from './Link';

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

describe('<Link>', () => {
  it('renders an <a> by default', () => {
    const { container } = render(<Link href="/x">click</Link>);
    expect(container.querySelector('a')).toBeInTheDocument();
  });

  it('forwards href to the default <a>', () => {
    render(<Link href="https://example.com">x</Link>);
    expect(screen.getByText('x')).toHaveAttribute('href', 'https://example.com');
  });

  it('renders the element specified by `as`', () => {
    render(
      <Link as={StubRouterLink} to="/contacts">
        Contacts
      </Link>,
    );
    // StubRouterLink renders an <a> with data-to.
    expect(screen.getByText('Contacts')).toHaveAttribute('data-to', '/contacts');
  });

  it('forwards extra props the `as` component accepts (e.g., replace)', () => {
    render(
      <Link as={StubRouterLink} to="/x" replace>
        x
      </Link>,
    );
    expect(screen.getByText('x')).toHaveAttribute('data-replace', 'true');
  });

  it('defaults to variant="default"', () => {
    render(<Link href="/x">x</Link>);
    expect(screen.getByText('x').className).toMatch(/default/);
  });

  it.each([
    ['default', 'default'],
    ['muted', 'muted'],
    ['subtle', 'subtle'],
  ] as const)('variant="%s" applies the %s class', (variant, expectedFragment) => {
    render(
      <Link href="/x" variant={variant}>
        {variant}
      </Link>,
    );
    expect(screen.getByText(variant).className).toMatch(new RegExp(expectedFragment));
  });

  it('className is merged with the variant + base classes, not replaced', () => {
    render(
      <Link href="/x" className="custom">
        x
      </Link>,
    );
    const link = screen.getByText('x');
    expect(link.className).toMatch(/link/);
    expect(link.className).toMatch(/default/);
    expect(link.className).toMatch(/custom/);
  });

  it('ref forwards to the default <a>', () => {
    const ref = createRef<HTMLAnchorElement>();
    render(
      <Link ref={ref} href="/x">
        x
      </Link>,
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('A');
  });

  it('ref forwards to the `as` component output', () => {
    const ref = createRef<HTMLAnchorElement>();
    render(
      <Link as={StubRouterLink} to="/x" ref={ref}>
        x
      </Link>,
    );
    // StubRouterLink renders an <a>, so ref points at an <a>.
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('A');
  });

  it('renders a real <button> via as="button" carrying the link classes (pointer affordance)', () => {
    render(
      <Link as="button" type="button">
        Change email
      </Link>,
    );
    const el = screen.getByText('Change email');
    expect(el.tagName).toBe('BUTTON');
    // The pointer-cursor affordance lives on the `.link` class (Link.module.scss),
    // so a non-anchor must still receive it. The cursor *value* is verified
    // visually / via Playwright (jsdom doesn't apply CSS-module rules); this locks
    // that as="button" gets the link styling where `cursor: pointer` lives.
    expect(el.className).toMatch(/link/);
    expect(el.className).toMatch(/default/);
  });

  it('children renders inside the link', () => {
    render(
      <Link href="/x">
        <span>nested</span>
      </Link>,
    );
    expect(screen.getByText('nested')).toBeInTheDocument();
  });

  it('onClick fires on the default <a>', async () => {
    const handleClick = vi.fn();
    render(
      <Link href="/x" onClick={handleClick}>
        x
      </Link>,
    );
    screen.getByText('x').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('target + rel pass through to the default <a>', () => {
    render(
      <Link href="/x" target="_blank" rel="noopener noreferrer">
        x
      </Link>,
    );
    const link = screen.getByText('x');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does NOT set aria-current automatically', () => {
    render(<Link href="/x">x</Link>);
    expect(screen.getByText('x')).not.toHaveAttribute('aria-current');
  });
});

describe('<Link> underline prop', () => {
  it.each(['default', 'muted', 'subtle'] as const)(
    'omitted underline leaves variant="%s" class list unchanged (no underline* class)',
    (variant) => {
      render(
        <Link href="/x" variant={variant}>
          {variant}
        </Link>,
      );
      const el = screen.getByText(variant);
      expect(el.className).toMatch(/link/);
      expect(el.className).toMatch(new RegExp(variant));
      expect(el.className).not.toMatch(/underline/i);
    },
  );

  it('underline="hover" (explicit default) behaves identically to omitting the prop', () => {
    render(
      <Link href="/x" underline="hover">
        x
      </Link>,
    );
    expect(screen.getByText('x').className).not.toMatch(/underline/i);
  });

  it('underline="always" applies the underlineAlways class', () => {
    render(
      <Link href="/x" underline="always">
        x
      </Link>,
    );
    expect(screen.getByText('x').className).toMatch(/underlineAlways/);
  });

  it('underline="none" applies the underlineNone class', () => {
    render(
      <Link href="/x" underline="none">
        x
      </Link>,
    );
    expect(screen.getByText('x').className).toMatch(/underlineNone/);
  });

  it('underline classes are additive — variant + base classes stay present', () => {
    render(
      <Link href="/x" variant="muted" underline="always">
        x
      </Link>,
    );
    const el = screen.getByText('x');
    expect(el.className).toMatch(/link/);
    expect(el.className).toMatch(/muted/);
    expect(el.className).toMatch(/underlineAlways/);
  });
});

describe('<Link> underline — compiled CSS', () => {
  const css = compile(resolve(__dirname, 'Link.module.scss')).css;
  const root = parse(css);
  const allRules: Rule[] = [];
  root.walkRules((rule) => {
    allRules.push(rule);
  });

  // Count of class-like tokens (classes + pseudo-classes) in a selector —
  // a rough proxy for its specificity's "B" component, since these files
  // never use ids or attribute selectors.
  const classWeight = (selector: string) =>
    (selector.match(/\.[a-zA-Z0-9_-]+/g)?.length ?? 0) +
    (selector.match(/:[a-zA-Z-]+(?!\()/g)?.length ?? 0);

  it('`always` sets text-decoration: underline at rest, on a selector that outranks a bare variant class', () => {
    const alwaysRule = allRules.find((rule) =>
      rule.selectors.some((s) => /underlineAlways/.test(s) && !s.includes(':hover')),
    );
    expect(alwaysRule).toBeDefined();
    const decl = alwaysRule!.nodes.find(
      (node) => node.type === 'decl' && node.prop === 'text-decoration',
    );
    expect(decl && decl.type === 'decl' ? decl.value : undefined).toBe('underline');

    const winningSelector = alwaysRule!.selectors.find((s) => /underlineAlways/.test(s))!;
    // Every bare single-class variant selector (`.default`, `.muted`, `.subtle`)
    // must weigh less than the `always` override.
    for (const variantSelector of ['.default', '.muted', '.subtle']) {
      expect(classWeight(winningSelector)).toBeGreaterThan(classWeight(variantSelector));
    }
  });

  it('`none` wins over every variant :hover rule that sets text-decoration: underline', () => {
    const variantHoverUnderlineRules = allRules.filter(
      (rule) =>
        rule.selectors.some((s) => s.includes(':hover')) &&
        !rule.selectors.some((s) => /underline/i.test(s)) &&
        rule.nodes.some(
          (node) =>
            node.type === 'decl' && node.prop === 'text-decoration' && node.value === 'underline',
        ),
    );
    // Sanity: default + subtle variants underline on hover today.
    expect(variantHoverUnderlineRules.length).toBeGreaterThanOrEqual(2);

    const noneHoverRule = allRules.find((rule) =>
      rule.selectors.some((s) => /underlineNone/.test(s) && s.includes(':hover')),
    );
    expect(noneHoverRule).toBeDefined();
    const decl = noneHoverRule!.nodes.find(
      (node) => node.type === 'decl' && node.prop === 'text-decoration',
    );
    expect(decl && decl.type === 'decl' ? decl.value : undefined).toBe('none');

    const noneSelector = noneHoverRule!.selectors.find(
      (s) => /underlineNone/.test(s) && s.includes(':hover'),
    )!;
    for (const rule of variantHoverUnderlineRules) {
      for (const selector of rule.selectors) {
        expect(classWeight(noneSelector)).toBeGreaterThan(classWeight(selector));
      }
    }
  });
});
