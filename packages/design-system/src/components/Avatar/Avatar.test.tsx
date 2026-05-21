import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Avatar, avatarColorIndex } from './Avatar';

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

  it('wraps in Tooltip when tooltip prop is true (visible on hover)', async () => {
    const user = userEvent.setup();
    render(<Avatar name="Alex" tooltip />);
    const avatar = screen.getByRole('img', { name: 'Alex' });
    await user.hover(avatar);
    const tip = await screen.findByRole('tooltip', {}, { timeout: 2000 });
    expect(tip).toHaveTextContent('Alex');
  });
});
