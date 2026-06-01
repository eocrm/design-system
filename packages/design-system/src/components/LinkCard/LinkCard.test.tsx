import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { LinkCard } from './LinkCard';

// A stand-in for a router's <Link> — verifies polymorphic `as` + prop passthrough.
function StubRouterLink({
  to,
  children,
  ...rest
}: { to: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={to} data-router="true" {...rest}>
      {children}
    </a>
  );
}

describe('LinkCard', () => {
  it('renders as <a> by default and passes href + children through', () => {
    render(<LinkCard href="/x">Go</LinkCard>);
    const el = screen.getByText('Go');
    expect(el.tagName).toBe('A');
    expect(el).toHaveAttribute('href', '/x');
  });

  it('as={RouterLink} renders the component and passes `to` through', () => {
    render(
      <LinkCard as={StubRouterLink} to="/contacts">
        Contacts
      </LinkCard>,
    );
    const el = screen.getByText('Contacts');
    expect(el).toHaveAttribute('href', '/contacts');
    expect(el).toHaveAttribute('data-router', 'true');
  });

  it('as="button" renders a <button> and fires onClick', async () => {
    const onClick = vi.fn();
    render(
      <LinkCard as="button" onClick={onClick}>
        Act
      </LinkCard>,
    );
    const btn = screen.getByRole('button', { name: 'Act' });
    expect(btn.tagName).toBe('BUTTON');
    expect(btn).toHaveAttribute('type', 'button');
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('as="button" type default can be overridden by consumer', () => {
    render(<LinkCard as="button" type="submit">S</LinkCard>);
    expect(screen.getByRole('button', { name: 'S' })).toHaveAttribute('type', 'submit');
  });

  it('defaults padding to md; padding prop swaps the class', () => {
    const { container, rerender } = render(<LinkCard href="/x">x</LinkCard>);
    expect((container.firstChild as HTMLElement).className).toMatch(/paddingMd/);
    rerender(
      <LinkCard href="/x" padding="lg">
        x
      </LinkCard>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/paddingLg/);
    rerender(
      <LinkCard href="/x" padding="none">
        x
      </LinkCard>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/paddingNone/);
  });

  it('tone sets data-tone; omitted → no data-tone', () => {
    const { container, rerender } = render(
      <LinkCard href="/x" tone="accent">
        x
      </LinkCard>,
    );
    expect(container.firstChild).toHaveAttribute('data-tone', 'accent');
    rerender(<LinkCard href="/x">x</LinkCard>);
    expect(container.firstChild).not.toHaveAttribute('data-tone');
  });

  it('forwards ref to the rendered element', () => {
    const ref = createRef<HTMLAnchorElement>();
    render(
      <LinkCard ref={ref} href="/x">
        x
      </LinkCard>,
    );
    expect(ref.current?.tagName).toBe('A');
  });

  it('merges className (with the base linkCard class) and spreads other attrs', () => {
    const { container } = render(
      <LinkCard href="/x" className="my-cls" data-foo="bar">
        x
      </LinkCard>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/linkCard/);
    expect(el.className).toMatch(/my-cls/);
    expect(el).toHaveAttribute('data-foo', 'bar');
  });
});
