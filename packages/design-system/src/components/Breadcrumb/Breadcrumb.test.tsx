import { type ComponentProps, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { Breadcrumb } from './Breadcrumb';

// Stub for the polymorphic `as` test.
function StubRouterLink({
  to,
  children,
  ...rest
}: {
  to: string;
  children?: ReactNode;
} & ComponentProps<'a'>) {
  return (
    <a data-to={to} {...rest}>
      {children}
    </a>
  );
}

describe('<Breadcrumb>', () => {
  it('renders a <nav> with aria-label="Breadcrumb" by default', () => {
    render(
      <Breadcrumb>
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item>B</Breadcrumb.Item>
      </Breadcrumb>,
    );
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });

  it('custom ariaLabel overrides the default', () => {
    render(
      <Breadcrumb ariaLabel="Page hierarchy">
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item>B</Breadcrumb.Item>
      </Breadcrumb>,
    );
    expect(screen.getByRole('navigation', { name: 'Page hierarchy' })).toBeInTheDocument();
  });

  it('renders an <ol> with one <li> per item', () => {
    const { container } = render(
      <Breadcrumb>
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item href="/b">B</Breadcrumb.Item>
        <Breadcrumb.Item>C</Breadcrumb.Item>
      </Breadcrumb>,
    );
    expect(container.querySelector('ol')).toBeInTheDocument();
    expect(container.querySelectorAll('li')).toHaveLength(3);
  });

  it('auto-current: the LAST child gets aria-current="page" and is NOT a link', () => {
    render(
      <Breadcrumb>
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item href="/b">B</Breadcrumb.Item>
        <Breadcrumb.Item>C</Breadcrumb.Item>
      </Breadcrumb>,
    );
    const currentNode = screen.getByText('C');
    expect(currentNode).toHaveAttribute('aria-current', 'page');
    expect(currentNode.tagName).toBe('SPAN');
  });

  it('non-last items render as muted Links', () => {
    render(
      <Breadcrumb>
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item href="/b">B</Breadcrumb.Item>
        <Breadcrumb.Item>C</Breadcrumb.Item>
      </Breadcrumb>,
    );
    const a = screen.getByText('A');
    const b = screen.getByText('B');
    expect(a.tagName).toBe('A');
    expect(a).toHaveAttribute('href', '/a');
    expect(a.className).toMatch(/muted/);
    expect(b.tagName).toBe('A');
    expect(b.className).toMatch(/muted/);
  });

  it('separator renders between items but NOT after the last', () => {
    const { container } = render(
      <Breadcrumb>
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item href="/b">B</Breadcrumb.Item>
        <Breadcrumb.Item>C</Breadcrumb.Item>
      </Breadcrumb>,
    );
    // 3 items → 2 separators (between A-B and B-C, NOT after C).
    // Use span[aria-hidden] to avoid matching the lucide SVG's own aria-hidden="true".
    const separators = container.querySelectorAll('span[aria-hidden="true"]');
    expect(separators).toHaveLength(2);
  });

  it('custom separator is used when provided', () => {
    render(
      <Breadcrumb separator={<span data-testid="slash">/</span>}>
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item>B</Breadcrumb.Item>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('slash')).toBeInTheDocument();
  });

  it('separator wrapper span has aria-hidden="true"', () => {
    render(
      <Breadcrumb separator={<span data-testid="sep">/</span>}>
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item>B</Breadcrumb.Item>
      </Breadcrumb>,
    );
    const wrapper = screen.getByTestId('sep').parentElement;
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
  });

  it('explicit current={true} on a non-last child works', () => {
    render(
      <Breadcrumb>
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item href="/b" current>
          B (current)
        </Breadcrumb.Item>
        <Breadcrumb.Item href="/c">C</Breadcrumb.Item>
      </Breadcrumb>,
    );
    const b = screen.getByText('B (current)');
    expect(b.tagName).toBe('SPAN');
    expect(b).toHaveAttribute('aria-current', 'page');
    // C still becomes auto-current too (last child).
    const c = screen.getByText('C');
    expect(c.tagName).toBe('SPAN');
    expect(c).toHaveAttribute('aria-current', 'page');
  });

  it('Item `as` prop forwards to a custom component', () => {
    render(
      <Breadcrumb>
        <Breadcrumb.Item as={StubRouterLink} to="/contacts">
          Contacts
        </Breadcrumb.Item>
        <Breadcrumb.Item>Acme</Breadcrumb.Item>
      </Breadcrumb>,
    );
    const contactsLink = screen.getByText('Contacts');
    expect(contactsLink).toHaveAttribute('data-to', '/contacts');
  });

  it('Item className merges onto the rendered element', () => {
    render(
      <Breadcrumb>
        <Breadcrumb.Item href="/a" className="custom-link">
          A
        </Breadcrumb.Item>
        <Breadcrumb.Item className="custom-current">B</Breadcrumb.Item>
      </Breadcrumb>,
    );
    expect(screen.getByText('A').className).toMatch(/custom-link/);
    expect(screen.getByText('B').className).toMatch(/custom-current/);
  });

  it('single-child Breadcrumb auto-marks that child as current', () => {
    render(
      <Breadcrumb>
        <Breadcrumb.Item>Only crumb</Breadcrumb.Item>
      </Breadcrumb>,
    );
    const node = screen.getByText('Only crumb');
    expect(node.tagName).toBe('SPAN');
    expect(node).toHaveAttribute('aria-current', 'page');
  });
});
