import { createRef } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { VisuallyHidden } from './VisuallyHidden';

describe('<VisuallyHidden>', () => {
  it('renders a span by default with its text in the accessibility tree', () => {
    render(<VisuallyHidden>Opens in a new tab</VisuallyHidden>);
    const el = screen.getByText('Opens in a new tab');
    expect(el.tagName).toBe('SPAN');
    expect(el).not.toHaveAttribute('aria-hidden');
  });

  it('as="div" renders a div', () => {
    render(<VisuallyHidden as="div">x</VisuallyHidden>);
    expect(screen.getByText('x').tagName).toBe('DIV');
  });

  it('forwards ref, merges className, spreads props', () => {
    const ref = createRef<HTMLElement>();
    render(
      <VisuallyHidden ref={ref} className="extra" id="vh" data-x="1">
        x
      </VisuallyHidden>,
    );
    const el = screen.getByText('x');
    expect(ref.current).toBe(el);
    expect(el).toHaveClass('extra');
    expect(el.className.split(' ').length).toBeGreaterThan(1);
    expect(el).toHaveAttribute('id', 'vh');
    expect(el).toHaveAttribute('data-x', '1');
  });

  // jsdom computes no layout, so assert the source. DS-31: without an inline
  // inset the box sits at its static inline position and widens the page. The
  // BLOCK axis stays static on purpose: pinning it to the containing block's top
  // makes screen readers that scroll to the node being read jump the page there.
  // DS-14's vertical escape is contained by Card.Body's positioned scroller.
  it('mixin pins the inline start only; Card.Body scroll is a containing block', () => {
    const mixins = readFileSync(resolve(__dirname, '../../styles/mixins.scss'), 'utf8');
    const block = mixins.slice(mixins.indexOf('@mixin visually-hidden'));
    const body = block.slice(0, block.indexOf('}'));
    expect(body).not.toMatch(/inset-block-start|(?<!-)\binset:|\btop:/);
    expect(body).toMatch(/inset-inline-start:\s*0/);
    const card = readFileSync(resolve(__dirname, '../Card/Card.module.scss'), 'utf8');
    expect(card.slice(card.indexOf('\n.scroll {'))).toMatch(/position:\s*relative/);
  });
});
