import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n/I18nProvider';
import { TopBar } from './TopBar';

describe('TopBar', () => {
  it('renders as a <header> banner landmark by default with the default aria-label', () => {
    render(<TopBar />);
    const bar = screen.getByRole('banner', { name: 'Application top bar' });
    expect(bar.tagName).toBe('HEADER');
  });

  it('honors the aria-label prop override', () => {
    render(<TopBar aria-label="Custom bar" />);
    expect(screen.getByRole('banner', { name: 'Custom bar' })).toBeInTheDocument();
  });

  it('renders as a <div> (no banner role) when as="div" is passed', () => {
    const { container } = render(<TopBar as="div" aria-label="Nested" />);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    const root = container.firstElementChild;
    expect(root?.tagName).toBe('DIV');
    expect(root?.getAttribute('aria-label')).toBe('Nested');
  });

  it('uses ru locale for the default aria-label when I18nProvider locale="ru"', () => {
    render(
      <I18nProvider locale="ru">
        <TopBar />
      </I18nProvider>,
    );
    expect(screen.getByRole('banner', { name: 'Верхняя панель приложения' })).toBeInTheDocument();
  });

  it('merges consumer className with the internal class instead of replacing it', () => {
    render(<TopBar aria-label="bar" className="custom-class" />);
    const bar = screen.getByRole('banner');
    expect(bar.className).toContain('custom-class');
    // The internal layout class must still be present so the bar keeps its
    // sticky-top + flex chrome — `className` is merge, not replace.
    expect(bar.className.split(' ').length).toBeGreaterThan(1);
  });

  it('forwards refs on the root and every subcomponent', () => {
    const rootRef = createRef<HTMLElement>();
    const startRef = createRef<HTMLDivElement>();
    const endRef = createRef<HTMLDivElement>();
    const searchRef = createRef<HTMLInputElement>();
    const buttonRef = createRef<HTMLButtonElement>();
    render(
      <TopBar ref={rootRef} aria-label="bar">
        <TopBar.Start ref={startRef}>
          <TopBar.Search ref={searchRef} placeholder="search" />
        </TopBar.Start>
        <TopBar.End ref={endRef}>
          <TopBar.IconButton ref={buttonRef} aria-label="act">
            <span>i</span>
          </TopBar.IconButton>
        </TopBar.End>
      </TopBar>,
    );
    expect(rootRef.current?.tagName).toBe('HEADER');
    expect(startRef.current?.tagName).toBe('DIV');
    expect(endRef.current?.tagName).toBe('DIV');
    expect(searchRef.current?.tagName).toBe('INPUT');
    expect(buttonRef.current?.tagName).toBe('BUTTON');
  });

  describe('Search', () => {
    it('renders a <input type="search"> with the placeholder as the aria-label fallback', () => {
      render(
        <TopBar aria-label="bar">
          <TopBar.Start>
            <TopBar.Search placeholder="Search contacts" />
          </TopBar.Start>
        </TopBar>,
      );
      const input = screen.getByRole('searchbox', { name: 'Search contacts' });
      expect(input).toHaveAttribute('type', 'search');
      expect(input).toHaveAttribute('placeholder', 'Search contacts');
    });

    it('uses t("topBar.search") as aria-label when neither placeholder nor aria-label is set', () => {
      render(
        <TopBar aria-label="bar">
          <TopBar.Start>
            <TopBar.Search />
          </TopBar.Start>
        </TopBar>,
      );
      expect(screen.getByRole('searchbox', { name: 'Search' })).toBeInTheDocument();
    });

    it('explicit aria-label wins over both placeholder and the i18n default', () => {
      render(
        <TopBar aria-label="bar">
          <TopBar.Start>
            <TopBar.Search placeholder="placeholder" aria-label="Find" />
          </TopBar.Start>
        </TopBar>,
      );
      expect(screen.getByRole('searchbox', { name: 'Find' })).toBeInTheDocument();
    });

    it('renders the optional <kbd> hotkey hint when `hotkey` is provided', () => {
      render(
        <TopBar aria-label="bar">
          <TopBar.Start>
            <TopBar.Search placeholder="search" hotkey="⌘K" />
          </TopBar.Start>
        </TopBar>,
      );
      // The kbd is aria-hidden, so we query the DOM directly.
      const kbd = document.querySelector('kbd');
      expect(kbd).not.toBeNull();
      expect(kbd?.textContent).toBe('⌘K');
      expect(kbd?.getAttribute('aria-hidden')).toBe('true');
    });

    it('omits the kbd hint when `hotkey` is not provided', () => {
      render(
        <TopBar aria-label="bar">
          <TopBar.Start>
            <TopBar.Search placeholder="search" />
          </TopBar.Start>
        </TopBar>,
      );
      expect(document.querySelector('kbd')).toBeNull();
    });

    it('forwards `value` / `onChange` through to the underlying input', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <TopBar aria-label="bar">
          <TopBar.Start>
            <TopBar.Search placeholder="search" value="hi" onChange={onChange} />
          </TopBar.Start>
        </TopBar>,
      );
      const input = screen.getByRole('searchbox');
      expect(input).toHaveValue('hi');
      await user.type(input, 'x');
      expect(onChange).toHaveBeenCalled();
    });

    it('sets the password-manager and autofill ignore attributes on the input', () => {
      render(
        <TopBar aria-label="bar">
          <TopBar.Start>
            <TopBar.Search placeholder="search" />
          </TopBar.Start>
        </TopBar>,
      );
      const input = screen.getByRole('searchbox');
      expect(input).toHaveAttribute('autocomplete', 'off');
      expect(input).toHaveAttribute('data-1p-ignore');
      expect(input).toHaveAttribute('data-lpignore', 'true');
      expect(input).toHaveAttribute('data-form-type', 'other');
    });
  });

  describe('IconButton', () => {
    it('renders a <button> with the given aria-label and no indicator dot by default', () => {
      render(
        <TopBar aria-label="bar">
          <TopBar.End>
            <TopBar.IconButton aria-label="Create new">
              <span data-testid="icon">+</span>
            </TopBar.IconButton>
          </TopBar.End>
        </TopBar>,
      );
      const button = screen.getByRole('button', { name: 'Create new' });
      expect(button.tagName).toBe('BUTTON');
      // No indicator span when `indicator` is omitted.
      expect(button.querySelector('span[aria-hidden]')).toBeNull();
    });

    it('renders the indicator dot when `indicator` is set', () => {
      render(
        <TopBar aria-label="bar">
          <TopBar.End>
            <TopBar.IconButton aria-label="Notifications" indicator>
              <span>b</span>
            </TopBar.IconButton>
          </TopBar.End>
        </TopBar>,
      );
      const button = screen.getByRole('button', { name: 'Notifications' });
      const dot = button.querySelector('span[aria-hidden]');
      expect(dot).not.toBeNull();
    });

    it('applies the correct tone class for each indicatorTone option', () => {
      const tones = ['danger', 'warning', 'info', 'accent'] as const;
      for (const tone of tones) {
        const { unmount } = render(
          <TopBar aria-label={`bar-${tone}`}>
            <TopBar.End>
              <TopBar.IconButton aria-label={`btn-${tone}`} indicator indicatorTone={tone}>
                <span>i</span>
              </TopBar.IconButton>
            </TopBar.End>
          </TopBar>,
        );
        const dot = screen
          .getByRole('button', { name: `btn-${tone}` })
          .querySelector('span[aria-hidden]');
        expect(dot).not.toBeNull();
        // The class list should contain something that ends in the tone (the
        // CSS module hashes the class but keeps the readable suffix).
        expect(dot?.className.toLowerCase()).toContain(tone);
        unmount();
      }
    });

    it('forwards click handlers and other button props through the wrapping Button', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <TopBar aria-label="bar">
          <TopBar.End>
            <TopBar.IconButton aria-label="act" onClick={onClick} data-testid="btn">
              <span>i</span>
            </TopBar.IconButton>
          </TopBar.End>
        </TopBar>,
      );
      const button = screen.getByTestId('btn');
      await user.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Start / End', () => {
    it('Start and End are distinct DOM elements with their own classes', () => {
      render(
        <TopBar aria-label="bar">
          <TopBar.Start data-testid="start">
            <span>start</span>
          </TopBar.Start>
          <TopBar.End data-testid="end">
            <span>end</span>
          </TopBar.End>
        </TopBar>,
      );
      const start = screen.getByTestId('start');
      const end = screen.getByTestId('end');
      expect(start.tagName).toBe('DIV');
      expect(end.tagName).toBe('DIV');
      expect(start.className).not.toBe(end.className);
    });
  });
});
