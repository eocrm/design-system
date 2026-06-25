import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Timeline } from './Timeline';

function basic() {
  return render(
    <Timeline>
      <Timeline.Item node={<span data-testid="node-a">A</span>}>
        <span data-testid="content-a">first</span>
      </Timeline.Item>
      <Timeline.Item node={<span>B</span>}>second</Timeline.Item>
    </Timeline>,
  );
}

describe('Timeline', () => {
  it('renders an <ol> with one <li> per item', () => {
    const { container } = basic();
    expect(container.querySelector('ol')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('renders each item node and content', () => {
    basic();
    expect(screen.getByTestId('node-a')).toBeInTheDocument();
    expect(screen.getByTestId('content-a')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('renders a connector element in every item (the last-stop is CSS :last-child)', () => {
    const { container } = basic();
    // Both items carry a connector node; CSS (.item:last-child .connector{display:none})
    // hides it on the last — the DOM still contains it.
    expect(container.querySelectorAll('[class*="connector"]')).toHaveLength(2);
  });

  it('compact adds the compact class to the <ol>', () => {
    const { container } = render(
      <Timeline compact>
        <Timeline.Item node={<span>A</span>}>x</Timeline.Item>
      </Timeline>,
    );
    expect((container.querySelector('ol') as HTMLElement).className).toMatch(/compact/);
  });

  it('forwards refs to the <ol> and <li>', () => {
    const olRef = createRef<HTMLOListElement>();
    const liRef = createRef<HTMLLIElement>();
    render(
      <Timeline ref={olRef}>
        <Timeline.Item ref={liRef} node={<span>A</span>}>
          x
        </Timeline.Item>
      </Timeline>,
    );
    expect(olRef.current?.tagName).toBe('OL');
    expect(liRef.current?.tagName).toBe('LI');
  });

  it('merges className and spreads attrs on both root and item', () => {
    const { container } = render(
      <Timeline className="root-c" data-testid="tl">
        <Timeline.Item className="item-c" node={<span>A</span>} data-kind="x">
          x
        </Timeline.Item>
      </Timeline>,
    );
    const ol = container.querySelector('ol') as HTMLElement;
    const li = container.querySelector('li') as HTMLElement;
    expect(ol.className).toMatch(/root-c/);
    expect(ol).toHaveAttribute('data-testid', 'tl');
    expect(li.className).toMatch(/item-c/);
    expect(li).toHaveAttribute('data-kind', 'x');
  });

  it('Timeline.Item renders standalone (no provider needed)', () => {
    expect(() => render(<Timeline.Item node={<span>A</span>}>x</Timeline.Item>)).not.toThrow();
  });
});
