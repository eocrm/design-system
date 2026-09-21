import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QrCode } from './QrCode';

const VALUE = 'https://example.com/invoice/42';

function sideOf(container: HTMLElement): number {
  const viewBox = container.querySelector('svg')!.getAttribute('viewBox')!;
  return Number(viewBox.split(' ')[2]);
}

describe('QrCode', () => {
  it('renders a toggle button with the default accessible name', () => {
    render(<QrCode value={VALUE} />);
    const button = screen.getByRole('button', { name: 'QR code' });

    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('uses the label prop as the accessible name', () => {
    render(<QrCode value={VALUE} label="QR code for invoice 42" />);

    expect(screen.getByRole('button', { name: 'QR code for invoice 42' })).toBeInTheDocument();
  });

  it('hides the drawing from assistive tech', () => {
    const { container } = render(<QrCode value={VALUE} />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('surrounds the code with a quiet zone', () => {
    const { container } = render(<QrCode value={VALUE} />);
    const viewBox = container.querySelector('svg')!.getAttribute('viewBox')!;

    // Square, and 8 modules wider than the odd module count.
    expect(viewBox).toMatch(/^0 0 (\d+) \1$/);
    expect((sideOf(container) - 8) % 2).toBe(1);
  });

  it('draws the modules as a single path', () => {
    const { container } = render(<QrCode value={VALUE} />);

    expect(container.querySelectorAll('path')).toHaveLength(1);
  });

  it('inverts on click and back again', async () => {
    const user = userEvent.setup();
    render(<QrCode value={VALUE} />);
    const button = screen.getByRole('button');

    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('inverts from the keyboard', async () => {
    const user = userEvent.setup();
    render(<QrCode value={VALUE} />);

    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard(' ');
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('still calls a consumer onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<QrCode value={VALUE} onClick={onClick} />);

    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('defaults to level M, and to level H when a logo is present', () => {
    const plain = render(<QrCode value={VALUE} />).container;
    const explicitM = render(<QrCode value={VALUE} level="M" />).container;
    const withLogo = render(<QrCode value={VALUE} logo="/logo.svg" />).container;
    const explicitH = render(<QrCode value={VALUE} level="H" />).container;

    // Guard: if M and H produced the same symbol, the assertions below would
    // pass without proving anything.
    expect(sideOf(explicitM)).not.toBe(sideOf(explicitH));

    expect(sideOf(plain)).toBe(sideOf(explicitM));
    expect(sideOf(withLogo)).toBe(sideOf(explicitH));
  });

  it('lets an explicit level win over the logo default', () => {
    const forced = render(<QrCode value={VALUE} logo="/logo.svg" level="L" />).container;
    const reference = render(<QrCode value={VALUE} level="L" />).container;

    expect(sideOf(forced)).toBe(sideOf(reference));
  });

  it('renders the logo overlay and its punch-out only when logo is set', () => {
    const withoutLogo = render(<QrCode value={VALUE} />).container;
    expect(withoutLogo.querySelectorAll('rect')).toHaveLength(1); // paper only

    const withLogo = render(<QrCode value={VALUE} logo="/logo.svg" />).container;
    expect(withLogo.querySelectorAll('rect')).toHaveLength(2); // paper + punch
  });

  it('treats an empty logo string as no logo at all', () => {
    // `logo={settings.logoUrl ?? ''}` must not punch a hole with nothing in it.
    const empty = render(<QrCode value={VALUE} logo="" />).container;
    const absent = render(<QrCode value={VALUE} />).container;

    expect(empty.querySelectorAll('rect')).toHaveLength(1); // paper only, no punch
    expect(sideOf(empty)).toBe(sideOf(absent)); // level M, not H
    expect(empty.querySelector('button')!.style.getPropertyValue('--qr-logo-src')).toBe('');
  });

  it('exposes the logo as a CSS custom property', () => {
    render(<QrCode value={VALUE} logo="/logo.svg" />);
    const button = screen.getByRole('button');

    expect(button.style.getPropertyValue('--qr-logo-src')).toBe('url("/logo.svg")');
    expect(button.style.getPropertyValue('--qr-logo-size')).toMatch(/^[\d.]+%$/);
  });

  it('percent-encodes a logo URL that would break out of the CSS declaration', () => {
    render(<QrCode value={VALUE} logo={'a");background:red;b'} />);

    expect(screen.getByRole('button').style.getPropertyValue('--qr-logo-src')).toBe(
      'url("a%22%29;background:red;b")',
    );
  });

  it('forwards ref to the button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<QrCode value={VALUE} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('merges className rather than replacing it', () => {
    render(<QrCode value={VALUE} className="mine" />);
    const button = screen.getByRole('button');

    expect(button).toHaveClass('mine');
    expect(button.className.split(' ').length).toBeGreaterThan(1);
  });

  describe('when the value cannot be encoded', () => {
    it.each([
      ['an empty value', ''],
      ['a value over capacity', 'x'.repeat(5000)],
    ])('renders the error branch for %s', (_label, value) => {
      const { container } = render(<QrCode value={value} />);
      const button = screen.getByRole('button', { name: 'QR code unavailable' });

      expect(button).toBeDisabled();
      expect(button).not.toHaveAttribute('aria-pressed');
      expect(container.querySelector('svg')).toBeNull();
    });

    it('does not repeat the message in the accessible name', () => {
      render(<QrCode value="" />);

      // The message is the button's CONTENT, so name-from-content supplies the
      // name. An aria-label here would make a reader say it twice.
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-label');
    });

    it('still forwards ref and merges className', () => {
      const ref = createRef<HTMLButtonElement>();
      render(<QrCode value="" ref={ref} className="mine" />);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(screen.getByRole('button')).toHaveClass('mine');
    });
  });
});
