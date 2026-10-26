import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { List } from './List';

const items = (
  <>
    <List.Item>One</List.Item>
    <List.Item>Two</List.Item>
    <List.Item>Three</List.Item>
  </>
);

describe('List', () => {
  it('renders a bulleted <ul role="list"> of <li> by default', () => {
    render(<List>{items}</List>);
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('UL');
    expect(list).toHaveAttribute('data-gap', 'sm');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('renders variant="number" as <ol role="list">', () => {
    render(<List variant="number">{items}</List>);
    expect(screen.getByRole('list').tagName).toBe('OL');
  });

  it('hides markers from assistive tech', () => {
    const { container } = render(<List>{items}</List>);
    const markers = container.querySelectorAll('li > span');
    expect(markers).toHaveLength(3);
    markers.forEach((m) => expect(m).toHaveAttribute('aria-hidden', 'true'));
  });

  it('leaves numbering to CSS counters (no JS-computed number text)', () => {
    const { container } = render(<List variant="number">{items}</List>);
    expect(screen.getByRole('list')).toHaveAttribute('data-variant', 'number');
    container.querySelectorAll('li > span').forEach((m) => expect(m.textContent).toBe(''));
  });

  it('renders around a wrapper that returns null', () => {
    const Maybe = ({ show }: { show: boolean }) => (show ? <List.Item>Shown</List.Item> : null);
    render(
      <List variant="number">
        <Maybe show={false} />
        <Maybe show />
        <List.Item>Plain</List.Item>
      </List>,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('draws badge numbers with the badge class', () => {
    const { container } = render(
      <List variant="number" numberStyle="badge">
        {items}
      </List>,
    );
    const badges = container.querySelectorAll('li > span > span');
    expect(badges).toHaveLength(3);
    badges.forEach((b) => expect(b.className).toMatch(/badge/));
  });

  it('ignores numberStyle for bullets', () => {
    const { container } = render(<List numberStyle="badge">{items}</List>);
    expect(container.querySelector('[class*="badge"]')).toBeNull();
    expect(container.querySelectorAll('[class*="bullet"]')).toHaveLength(3);
  });

  it('exposes the marker scale as data-size', () => {
    const { rerender } = render(<List>{items}</List>);
    expect(screen.getByRole('list')).toHaveAttribute('data-size', 'body');
    rerender(<List size="heading">{items}</List>);
    expect(screen.getByRole('list')).toHaveAttribute('data-size', 'heading');
  });

  it('marks a nested list', () => {
    render(
      <List>
        <List.Item>
          Parent
          <List>
            <List.Item>Child</List.Item>
          </List>
        </List.Item>
      </List>,
    );
    const [outer, inner] = screen.getAllByRole('list');
    expect(outer).not.toHaveAttribute('data-nested');
    expect(inner).toHaveAttribute('data-nested', 'true');
  });

  it('forwards ref, merges className and passes attributes through', () => {
    const ref = createRef<HTMLElement>();
    render(
      <List
        ref={ref}
        variant="number"
        className="extra"
        data-testid="x"
        gap="md"
        aria-label="Steps"
      >
        {items}
      </List>,
    );
    const list = screen.getByTestId('x');
    expect(ref.current).toBe(list);
    expect(list.tagName).toBe('OL');
    expect(list.className).toContain('extra');
    expect(list.className).toMatch(/list/);
    expect(list).toHaveAttribute('data-gap', 'md');
    expect(list).toHaveAttribute('aria-label', 'Steps');
  });

  it('forwards List.Item ref, className and attributes', () => {
    const ref = createRef<HTMLLIElement>();
    render(
      <List>
        <List.Item ref={ref} className="row" id="r1">
          A
        </List.Item>
      </List>,
    );
    expect(ref.current).toBe(screen.getByRole('listitem'));
    expect(ref.current).toHaveClass('row');
    expect(ref.current).toHaveAttribute('id', 'r1');
  });
});
