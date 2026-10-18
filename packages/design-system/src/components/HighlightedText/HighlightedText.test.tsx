import { render } from '@testing-library/react';
import { createRef } from 'react';
import { HighlightedText } from './HighlightedText';

describe('HighlightedText', () => {
  it('wraps matched runs in <mark> and keeps the full text in order', () => {
    const { container } = render(
      <HighlightedText
        text="Invoice overdue for Acme"
        ranges={[
          { start: 0, length: 7 },
          { start: 20, length: 4 },
        ]}
      />,
    );
    const p = container.firstChild as HTMLElement;
    expect(p.tagName).toBe('P');
    expect(p.textContent).toBe('Invoice overdue for Acme');
    const marks = p.querySelectorAll('mark');
    expect([...marks].map((m) => m.textContent)).toEqual(['Invoice', 'Acme']);
    expect(marks[0].className).toMatch(/mark/);
  });

  it('renders plain text with no <mark> by default', () => {
    const { container } = render(<HighlightedText text="nothing matched" />);
    expect(container.querySelector('mark')).toBeNull();
    expect(container.textContent).toBe('nothing matched');
  });

  it('renders markup-looking text as text, never HTML', () => {
    const { container } = render(
      <HighlightedText text="<b>bold</b>" ranges={[{ start: 3, length: 4 }]} />,
    );
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toBe('<b>bold</b>');
  });

  it('passes Text props through and merges className', () => {
    const { container } = render(
      <HighlightedText
        text="excerpt"
        as="span"
        size="sm"
        tone="muted"
        lineClamp={2}
        className="custom"
        data-testid="x"
      />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe('SPAN');
    expect(el.className).toMatch(/sizeSm/);
    expect(el.className).toMatch(/toneMuted/);
    expect(el.className).toMatch(/lineClamp/);
    expect(el.className).toMatch(/custom/);
    expect(el).toHaveAttribute('data-testid', 'x');
  });

  it('forwards ref to the rendered element', () => {
    const ref = createRef<HTMLElement>();
    render(<HighlightedText ref={ref} text="x" />);
    expect(ref.current?.tagName).toBe('P');
  });
});
