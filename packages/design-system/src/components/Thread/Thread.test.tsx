import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Thread } from './Thread';

function basic() {
  return render(
    <Thread>
      <Thread.Item node={<span data-testid="node-a">A</span>}>
        <span data-testid="body-a">first comment</span>
        <Thread.Item node={<span data-testid="node-b">B</span>}>
          <span data-testid="body-b">a reply</span>
        </Thread.Item>
      </Thread.Item>
    </Thread>,
  );
}

describe('Thread', () => {
  it('renders a top-level item node and body text', () => {
    const { container } = basic();
    expect(container.querySelector('ul')).not.toBeNull();
    expect(screen.getByTestId('node-a')).toBeInTheDocument();
    expect(screen.getByTestId('body-a')).toHaveTextContent('first comment');
  });

  it('renders a nested Thread.Item as a reply inside a nested <ul>', () => {
    const { container } = basic();
    // Root <ul> + the nested replies <ul> = at least two.
    expect(container.querySelectorAll('ul').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('body-b')).toHaveTextContent('a reply');
    expect(screen.getByTestId('node-b')).toBeInTheDocument();
  });

  it('renders the rail on an item WITH replies', () => {
    const { container } = basic();
    expect(container.querySelector('[class*="rail"]')).not.toBeNull();
  });

  it('renders NO rail on an item without replies', () => {
    const { container } = render(
      <Thread>
        <Thread.Item node={<span>A</span>}>just a comment, no replies</Thread.Item>
      </Thread>,
    );
    expect(container.querySelector('[class*="rail"]')).toBeNull();
  });

  it('depth-caps: replies past maxDepth render flat (indent stops compounding)', () => {
    // maxDepth={1}: A(depth 0) → B(depth 1) is allowed to indent; B → C is over the
    // cap and renders flat.
    const { container } = render(
      <Thread maxDepth={1}>
        <Thread.Item node={<span>A</span>}>
          <span>top</span>
          <Thread.Item node={<span>B</span>}>
            <span>reply</span>
            <Thread.Item node={<span>C</span>}>
              <span data-testid="deep">deep reply</span>
            </Thread.Item>
          </Thread.Item>
        </Thread.Item>
      </Thread>,
    );
    expect(container.querySelector('[class*="repliesFlat"]')).not.toBeNull();
    expect(screen.getByTestId('deep')).toHaveTextContent('deep reply');
    // The over-cap reply (C) sits directly in the FLAT container — its parent <ul>
    // is `repliesFlat`, not a further-indented `.replies` sub-list (indent stopped).
    const deepUl = screen.getByTestId('deep').closest('li')?.parentElement;
    expect(deepUl?.className).toMatch(/repliesFlat/);
  });

  it('compact adds the compact class to the root <ul>', () => {
    const { container } = render(
      <Thread compact>
        <Thread.Item node={<span>A</span>}>x</Thread.Item>
      </Thread>,
    );
    expect((container.querySelector('ul') as HTMLElement).className).toMatch(/compact/);
  });

  it('defaults to header alignment (no alignTop class on the root)', () => {
    const { container } = render(
      <Thread>
        <Thread.Item node={<span>A</span>}>x</Thread.Item>
      </Thread>,
    );
    expect((container.querySelector('ul') as HTMLElement).className).not.toMatch(/alignTop/);
  });

  it('nodeAlign="top" adds the alignTop class to the root <ul>', () => {
    const { container } = render(
      <Thread nodeAlign="top">
        <Thread.Item node={<span>A</span>}>x</Thread.Item>
      </Thread>,
    );
    expect((container.querySelector('ul') as HTMLElement).className).toMatch(/alignTop/);
  });

  it('forwards refs to the root <ul> and item <li>', () => {
    const ulRef = createRef<HTMLUListElement>();
    const liRef = createRef<HTMLLIElement>();
    render(
      <Thread ref={ulRef}>
        <Thread.Item ref={liRef} node={<span>A</span>}>
          x
        </Thread.Item>
      </Thread>,
    );
    expect(ulRef.current?.tagName).toBe('UL');
    expect(liRef.current?.tagName).toBe('LI');
  });

  it('merges className and spreads attrs on both root and item', () => {
    const { container } = render(
      <Thread className="root-c" data-testid="th">
        <Thread.Item className="item-c" node={<span>A</span>} data-kind="x">
          x
        </Thread.Item>
      </Thread>,
    );
    const ul = container.querySelector('ul') as HTMLElement;
    const li = container.querySelector('li') as HTMLElement;
    expect(ul.className).toMatch(/root-c/);
    expect(ul).toHaveAttribute('data-testid', 'th');
    expect(li.className).toMatch(/item-c/);
    expect(li).toHaveAttribute('data-kind', 'x');
  });

  it('sorts children: plain nodes are body, Thread.Item children are replies', () => {
    const { container } = render(
      <Thread>
        <Thread.Item node={<span>A</span>}>
          plain string body
          <Thread.Item node={<span>B</span>}>nested reply</Thread.Item>
        </Thread.Item>
      </Thread>,
    );
    // The plain string is body text; the Thread.Item is rendered as a nested <li>.
    expect(screen.getByText(/plain string body/)).toBeInTheDocument();
    expect(container.querySelectorAll('li').length).toBe(2);
    expect(container.querySelectorAll('ul').length).toBeGreaterThanOrEqual(2);
  });
});
