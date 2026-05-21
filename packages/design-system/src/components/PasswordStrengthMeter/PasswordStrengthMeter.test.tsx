import { render } from '@testing-library/react';
import { createRef } from 'react';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

describe('PasswordStrengthMeter', () => {
  it('renders 4 segments', () => {
    const { container } = render(<PasswordStrengthMeter value="" />);
    expect(container.querySelectorAll('span[class*="segment"]')).toHaveLength(4);
  });

  it('empty value → score 0, label is empty by default', () => {
    const { container } = render(<PasswordStrengthMeter value="" />);
    expect(container.querySelector('span[class*="label"]')?.textContent).toBe('');
    expect(container.querySelectorAll('[class*="filled"]')).toHaveLength(0);
  });

  it('default heuristic — short password → score 1', () => {
    const { container } = render(<PasswordStrengthMeter value="hunter22" />); // 8 chars, lower + digit only
    // 8+ chars (1) → score 1
    expect(container.querySelectorAll('[class*="filled"]')).toHaveLength(1);
    expect(container.querySelector('span[class*="label"]')?.textContent).toBe('Weak');
  });

  it('default heuristic — 12+ chars + mixed case + digit + special → 4', () => {
    const { container } = render(<PasswordStrengthMeter value="Hunter2!@#xyz" />);
    expect(container.querySelectorAll('[class*="filled"]')).toHaveLength(4);
    expect(container.querySelector('span[class*="label"]')?.textContent).toBe('Strong');
  });

  it('score prop wins over value + scoreFn', () => {
    const { container } = render(
      <PasswordStrengthMeter value="weak" score={4} scoreFn={() => 0 as const} />,
    );
    expect(container.querySelectorAll('[class*="filled"]')).toHaveLength(4);
    expect(container.querySelector('span[class*="label"]')?.textContent).toBe('Strong');
  });

  it('custom scoreFn is called with the value', () => {
    const scoreFn = vi.fn().mockReturnValue(2 as const);
    const { container } = render(<PasswordStrengthMeter value="abc" scoreFn={scoreFn} />);
    expect(scoreFn).toHaveBeenCalledWith('abc');
    expect(container.querySelectorAll('[class*="filled"]')).toHaveLength(2);
  });

  it('showLabel={false} hides the textual label (but keeps the live region)', () => {
    const { container } = render(<PasswordStrengthMeter value="Hunter2!" showLabel={false} />);
    // The visible .label span is absent...
    expect(container.querySelector('span[class*="label"]:not([class*="srOnly"])')).toBeNull();
    // ...but the live region still exists.
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });

  it('labels override the default strings', () => {
    const { container } = render(
      <PasswordStrengthMeter
        value="hunter22"
        labels={{ weak: 'Слабый', fair: 'Норм', good: 'Хорошо', strong: 'Сильный' }}
      />,
    );
    expect(container.querySelector('span[class*="label"]')?.textContent).toBe('Слабый');
  });

  it('live region announces the label', () => {
    const { container } = render(<PasswordStrengthMeter value="Hunter2!@#xyz" />);
    expect(container.querySelector('[role="status"]')).toHaveTextContent('Strong');
  });

  it('forwards ref to the root div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<PasswordStrengthMeter value="x" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className on the root', () => {
    const { container } = render(<PasswordStrengthMeter value="x" className="my-cls" />);
    expect(container.querySelector('div.my-cls')).not.toBeNull();
  });
});
