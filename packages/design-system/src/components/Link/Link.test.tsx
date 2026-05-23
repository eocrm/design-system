import { createRef, type ComponentProps, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
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
