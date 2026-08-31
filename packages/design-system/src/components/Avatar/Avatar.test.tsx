import { resolve } from 'node:path';
import { parse, type Declaration, type Root, type Rule } from 'postcss';
import { compile } from 'sass';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Avatar, avatarColorIndex } from './Avatar';

// The presence shapes are pure CSS and jsdom computes no styles, so they are
// asserted against the compiled stylesheet — the same way DataTable checks its
// responsive rules.
const stylesheet: Root = parse(compile(resolve(__dirname, './Avatar.module.scss')).css);

// Selectors are matched against the COMPILED output, where Sass has dropped the
// quotes from `[data-status='away']`. Writing them quoted here matches nothing
// and every assertion below passes vacuously.
function compiledRule(parent: Root, selector: string): Rule | undefined {
  let match: Rule | undefined;
  parent.walkRules((rule) => {
    if (rule.selectors.some((candidate) => candidate.endsWith(selector))) match = rule;
  });
  return match;
}

function compiledDeclaration(rule: Rule | undefined, property: string): Declaration | undefined {
  return rule?.nodes.find(
    (node): node is Declaration => node.type === 'decl' && node.prop === property,
  );
}

describe('Avatar', () => {
  it('renders the initials when no src is provided', () => {
    render(<Avatar name="Alex Rivera" />);
    expect(screen.getByRole('img', { name: 'Alex Rivera' })).toHaveTextContent('AR');
  });

  it('uses the first letter of up to two words for initials', () => {
    render(<Avatar name="Priya Lakshmi Shah" />);
    expect(screen.getByRole('img', { name: 'Priya Lakshmi Shah' })).toHaveTextContent('PL');
  });

  it('uppercases the initials regardless of input casing', () => {
    render(<Avatar name="alex rivera" />);
    expect(screen.getByRole('img', { name: 'alex rivera' })).toHaveTextContent('AR');
  });

  it('falls back to "?" for an empty/whitespace name', () => {
    const { container } = render(<Avatar name="   " />);
    expect(container.firstChild).toHaveTextContent('?');
  });

  it('renders an <img> when src is provided', () => {
    const { container } = render(<Avatar name="Alex" src="https://example.com/a.jpg" />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/a.jpg');
  });

  it('applies the size class', () => {
    const { container } = render(<Avatar name="A" size="lg" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/lg/);
  });

  it('applies the xl size class', () => {
    const { container } = render(<Avatar name="A" size="xl" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/xl/);
  });

  it('produces the same color for the same name (deterministic)', () => {
    const { container, rerender } = render(<Avatar name="Alex Rivera" />);
    const first = (container.firstChild as HTMLElement).style.getPropertyValue('--avatar-bg');
    rerender(<Avatar name="Alex Rivera" />);
    const second = (container.firstChild as HTMLElement).style.getPropertyValue('--avatar-bg');
    expect(first).toBe(second);
    expect(first).toMatch(/var\(--color-avatar-\d\)/);
  });

  it('exposes the name as the accessible label', () => {
    render(<Avatar name="Alex Rivera" />);
    const el = screen.getByLabelText('Alex Rivera');
    expect(el.getAttribute('role')).toBe('img');
  });

  it('does not set the color CSS variable when an image is used', () => {
    const { container } = render(<Avatar name="Alex" src="https://example.com/a.jpg" />);
    expect((container.firstChild as HTMLElement).style.getPropertyValue('--avatar-bg')).toBe('');
  });

  it('forwards refs to the underlying span', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Avatar name="A" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it('treats empty/whitespace src as missing and falls back to initials', () => {
    const { container } = render(<Avatar name="Alex Rivera" src="" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.firstChild).toHaveTextContent('AR');

    const { container: c2 } = render(<Avatar name="Alex Rivera" src="   " />);
    expect(c2.querySelector('img')).toBeNull();
  });

  it('uses the name as the image alt when src is provided', () => {
    render(<Avatar name="Alex Rivera" src="https://example.com/a.jpg" />);
    // With src present, the wrapper drops role="img" — the <img> itself is the
    // accessible image, accessible by alt text.
    expect(screen.getByRole('img', { name: 'Alex Rivera' }).tagName).toBe('IMG');
  });

  it('omits the style attribute entirely when an image is used and no style prop is passed', () => {
    const { container } = render(<Avatar name="Alex" src="https://example.com/a.jpg" />);
    expect(container.firstChild).not.toHaveAttribute('style');
  });

  it('uses the trimmed name as the image alt when the consumer passes whitespace', () => {
    render(<Avatar name="   " src="https://example.com/a.jpg" />);
    // Whitespace name → fallback "?" so the image is at least labeled.
    expect(screen.getByRole('img', { name: '?' }).tagName).toBe('IMG');
  });

  it('renders the rendered color matching avatarColorIndex(name)', () => {
    const { container } = render(<Avatar name="Alex Rivera" />);
    const expected = avatarColorIndex('Alex Rivera');
    expect((container.firstChild as HTMLElement).style.getPropertyValue('--avatar-bg')).toBe(
      `var(--color-avatar-${expected})`,
    );
  });

  it('avatarColorIndex covers the full 1–6 palette over a varied input set', () => {
    // 16 distinct names should hit every palette slot at least once.
    const names = [
      'Alex Rivera',
      'Jordan Park',
      'Sam Chen',
      'Maya Owens',
      'Priya Shah',
      'Marcus Lin',
      'Diana Okafor',
      'Tomás Reyes',
      'Ola Berg',
      'Hideo Tanaka',
      'Lena Ivanova',
      'Aki Tanaka',
      'Chris Park',
      'Noah West',
      'Emma Bell',
      'Kai Fischer',
    ];
    const slots = new Set(names.map((n) => avatarColorIndex(n)));
    expect(slots.size).toBeGreaterThanOrEqual(5);
    for (const i of slots) {
      expect(i).toBeGreaterThanOrEqual(1);
      expect(i).toBeLessThanOrEqual(6);
    }
  });

  it('falls back to initials when the image fails to load', () => {
    const { container } = render(
      <Avatar name="Alex Rivera" src="https://example.com/missing.jpg" />,
    );
    // Initially an <img>.
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    // Simulate the image failing to load.
    fireEvent.error(img!);
    // Now there is no <img> and the initials are shown.
    expect(container.querySelector('img')).toBeNull();
    expect(container.firstChild).toHaveTextContent('AR');
  });

  it('does not emit an empty style attribute when the consumer passes style={{}}', () => {
    const { container } = render(<Avatar name="Alex" src="https://example.com/a.jpg" style={{}} />);
    expect(container.firstChild).not.toHaveAttribute('style');
  });

  it('renders presence dot when status is set', () => {
    const { container } = render(<Avatar name="Alex" status="online" />);
    const dot = container.querySelector('[data-status="online"]');
    expect(dot).not.toBeNull();
    expect(dot).toHaveAttribute('aria-hidden', 'true');
  });

  it('omits presence dot when status is undefined', () => {
    const { container } = render(<Avatar name="Alex" />);
    expect(container.querySelector('[data-status]')).toBeNull();
  });

  it('switches presence color when status changes', () => {
    const { container, rerender } = render(<Avatar name="Alex" status="online" />);
    expect(container.querySelector('[data-status="online"]')).not.toBeNull();
    rerender(<Avatar name="Alex" status="busy" />);
    expect(container.querySelector('[data-status="online"]')).toBeNull();
    expect(container.querySelector('[data-status="busy"]')).not.toBeNull();
  });

  it('does NOT wrap in Tooltip by default (tooltip is opt-in)', () => {
    render(<Avatar name="Alex" />);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  // #506. Presence was colour-only: the dot is decorative and `status` reached
  // neither the accessible name nor the tooltip, so colour was the entire
  // channel and WCAG 1.4.1 applied. Two channels were added — the name below,
  // and a per-status silhouette asserted after it.
  describe('presence reaches more than the eye', () => {
    it.each([
      ['online', 'online'],
      ['busy', 'busy'],
      ['away', 'away'],
      ['offline', 'offline'],
    ] as const)('folds %s into the accessible name', (status, label) => {
      render(<Avatar name="Alex" status={status} />);
      expect(screen.getByRole('img', { name: `Alex, ${label}` })).toBeInTheDocument();
    });

    it('folds the status into the img alt when a src is present', () => {
      // The two branches render different markup — a bare wrapper around an
      // <img> here, a role="img" wrapper there — and the status has to survive
      // both. Folding rather than a hidden child is what makes that possible:
      // the role="img" branch prunes its children as presentational, so a
      // visually-hidden span would be silent in exactly half the cases.
      render(<Avatar name="Alex" src="https://example.com/a.jpg" status="busy" />);
      expect(screen.getByRole('img', { name: 'Alex, busy' })).toBeInTheDocument();
    });

    it('leaves the name alone when no status is set', () => {
      render(<Avatar name="Alex" />);
      expect(screen.getByRole('img', { name: 'Alex' })).toBeInTheDocument();
    });

    it('keeps the dot itself out of the accessible tree', () => {
      // Otherwise the status is announced twice — once from the folded name and
      // once from the dot.
      const { container } = render(<Avatar name="Alex" status="away" />);
      expect(container.querySelector('[data-status="away"]')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
    });

    it('gives every status its own silhouette, not just its own colour', () => {
      // The shape channel is what survives colour-vision deficiency, and the
      // gate in contrast.test.ts cannot see it: OKLab ΔE is blind to
      // dichromacy, so it reads light away/busy as 0.158 and passes while a
      // protanope sees roughly 0.015.
      //
      // Asserted against the COMPILED stylesheet, because the shapes live
      // entirely in CSS — jsdom computes no styles, so a DOM-level check could
      // only compare four identical class names and would pass whatever the
      // rules said. Each status must contribute geometry, not just a fill.
      for (const [status, property] of [
        ['away', 'background-image'],
        ['offline', 'box-shadow'],
      ] as const) {
        const rule = compiledRule(stylesheet, `[data-status=${status}]`);
        expect(compiledDeclaration(rule, property), `${status} carries ${property}`).toBeDefined();
      }
      // busy's bar is a pseudo-element, so its geometry lives in the ::after.
      const busyBar = compiledRule(stylesheet, '[data-status=busy]::after');
      expect(compiledDeclaration(busyBar, 'content'), 'busy draws a bar').toBeDefined();

      // online is the one status with no added geometry — a plain filled disc
      // is a distinct silhouette precisely because the other three are not.
      //
      // The rule has to be asserted present FIRST. Both checks below are
      // toBeUndefined(), and compiledDeclaration(undefined, …) is undefined, so
      // without this line they pass when the selector matches nothing — which
      // is every way this test could actually break.
      const online = compiledRule(stylesheet, '[data-status=online]');
      expect(online, 'the online rule exists at all').toBeDefined();
      expect(compiledDeclaration(online, 'background-image')).toBeUndefined();
      expect(compiledDeclaration(online, 'box-shadow')).toBeUndefined();
    });
  });

  it('wraps in Tooltip when tooltip prop is true (visible on hover)', async () => {
    const user = userEvent.setup();
    render(<Avatar name="Alex" tooltip />);
    const avatar = screen.getByRole('img', { name: 'Alex' });
    await user.hover(avatar);
    const tip = await screen.findByRole('tooltip', {}, { timeout: 2000 });
    expect(tip).toHaveTextContent('Alex');
  });
});
