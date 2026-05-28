import { render } from '@testing-library/react';
import { createRef } from 'react';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { I18nProvider } from '../../i18n/I18nProvider';

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

  it('passwords shorter than 8 chars always score 1, regardless of character variety', () => {
    // "Ab1!" — 4 chars but mixed-case + digit + special — used to score 2 under
    // the old heuristic. Should cap at 1 ("Weak") because length dominates.
    const { container, rerender } = render(<PasswordStrengthMeter value="Ab1!" />);
    expect(container.querySelectorAll('[class*="filled"]')).toHaveLength(1);
    expect(container.querySelector('span[class*="label"]')?.textContent).toBe('Weak');

    // Even at 7 chars with full variety — still 1.
    rerender(<PasswordStrengthMeter value="Ab1!@#$" />);
    expect(container.querySelectorAll('[class*="filled"]')).toHaveLength(1);

    // Single char — still 1 (not 0; empty is the only 0).
    rerender(<PasswordStrengthMeter value="x" />);
    expect(container.querySelectorAll('[class*="filled"]')).toHaveLength(1);
  });

  it('default heuristic — 12+ chars + mixed case + digit + special → 4', () => {
    const { container } = render(<PasswordStrengthMeter value="Hunter2!@#xyz" />);
    expect(container.querySelectorAll('[class*="filled"]')).toHaveLength(4);
    expect(container.querySelector('span[class*="label"]')?.textContent).toBe('Very strong');
  });

  it('score prop wins over value + scoreFn', () => {
    const { container } = render(
      <PasswordStrengthMeter value="weak" score={4} scoreFn={() => 0 as const} />,
    );
    expect(container.querySelectorAll('[class*="filled"]')).toHaveLength(4);
    expect(container.querySelector('span[class*="label"]')?.textContent).toBe('Very strong');
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

  it('I18nProvider overrides the default strings', () => {
    const { container } = render(
      <I18nProvider
        locale="en"
        overrides={{
          passwordStrengthMeter: {
            weak: 'Слабый',
            fair: 'Норм',
            strong: 'Хорошо',
            veryStrong: 'Сильный',
          },
        }}
      >
        <PasswordStrengthMeter value="hunter22" />
      </I18nProvider>,
    );
    expect(container.querySelector('span[class*="label"]')?.textContent).toBe('Слабый');
  });

  it('live region announces the label', () => {
    const { container } = render(<PasswordStrengthMeter value="Hunter2!@#xyz" />);
    expect(container.querySelector('[role="status"]')).toHaveTextContent('Very strong');
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
