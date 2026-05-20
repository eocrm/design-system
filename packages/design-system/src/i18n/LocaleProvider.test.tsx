import { render, screen } from '@testing-library/react';
import { LocaleProvider } from './LocaleProvider';
import { useLocale } from './useLocale';

function LocaleProbe() {
  const locale = useLocale();
  return <span data-testid="locale">{locale}</span>;
}

describe('LocaleProvider', () => {
  it('renders children', () => {
    render(
      <LocaleProvider locale="en-US">
        <span>hello</span>
      </LocaleProvider>,
    );
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('exposes the provided locale via useLocale', () => {
    render(
      <LocaleProvider locale="ru-RU">
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('ru-RU');
  });

  it('the innermost provider wins when nested', () => {
    render(
      <LocaleProvider locale="en-US">
        <LocaleProvider locale="ja-JP">
          <LocaleProbe />
        </LocaleProvider>
      </LocaleProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('ja-JP');
  });
});

describe('useLocale fallback', () => {
  it('falls back to navigator.language when no provider is mounted', () => {
    vi.stubGlobal('navigator', { language: 'de-DE' });
    render(<LocaleProbe />);
    expect(screen.getByTestId('locale')).toHaveTextContent('de-DE');
    vi.unstubAllGlobals();
  });

  it('falls back to en-US when neither provider nor navigator is available', () => {
    vi.stubGlobal('navigator', undefined);
    render(<LocaleProbe />);
    expect(screen.getByTestId('locale')).toHaveTextContent('en-US');
    vi.unstubAllGlobals();
  });
});
