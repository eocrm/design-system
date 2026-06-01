import { render, screen, act } from '@testing-library/react';
import { AppProvider } from './AppProvider';
import { useLocale } from '../i18n/useLocale';
import { useTranslation } from '../i18n/useTranslation';
import { toast, _setViewportConfig } from '../components/Toast/api';
import { store } from '../components/Toast/store';

function LocaleProbe() {
  return <span data-testid="locale">{useLocale()}</span>;
}
function AlertDismiss() {
  const t = useTranslation();
  return <span data-testid="alert-dismiss">{t('alert.dismiss')}</span>;
}
function ToastDismiss() {
  const t = useTranslation();
  return <span data-testid="toast-dismiss">{t('toast.dismiss')}</span>;
}
function ToastNotifications() {
  const t = useTranslation();
  return <span data-testid="toast-notifications">{t('toast.notifications')}</span>;
}

describe('AppProvider', () => {
  // Mirror Toast.test.tsx hygiene: clear the global toast store + reset the
  // viewport config baseline, and use fake timers so the 4s auto-dismiss
  // timer a toast schedules doesn't leak across tests.
  beforeEach(() => {
    store._reset();
    _setViewportConfig({ position: 'bottom-right', duration: 4000 });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    store._reset();
  });

  it('renders children', () => {
    render(
      <AppProvider locale="en">
        <span data-testid="child">hi</span>
      </AppProvider>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('hi');
  });

  it('useLocale() returns intlLocale when provided', () => {
    render(
      <AppProvider locale="en" intlLocale="en-US">
        <LocaleProbe />
      </AppProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('en-US');
  });

  it('useLocale() falls back to locale when intlLocale is omitted', () => {
    render(
      <AppProvider locale="ru">
        <LocaleProbe />
      </AppProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('ru');
  });

  it('useTranslation() reflects locale (en vs ru)', () => {
    const { rerender } = render(
      <AppProvider locale="en">
        <AlertDismiss />
      </AppProvider>,
    );
    expect(screen.getByTestId('alert-dismiss')).toHaveTextContent('Dismiss');
    rerender(
      <AppProvider locale="ru">
        <AlertDismiss />
      </AppProvider>,
    );
    expect(screen.getByTestId('alert-dismiss')).toHaveTextContent('Закрыть');
  });

  it('translations overrides deep-merge over built-in messages', () => {
    render(
      <AppProvider locale="en" translations={{ toast: { dismiss: 'Hide' } }}>
        <ToastDismiss />
        <ToastNotifications />
      </AppProvider>,
    );
    // overridden key wins…
    expect(screen.getByTestId('toast-dismiss')).toHaveTextContent('Hide');
    // …and the sibling key in the SAME section keeps its built-in default
    // (proves deep-merge, not whole-bundle replace).
    expect(screen.getByTestId('toast-notifications')).toHaveTextContent('Notifications');
  });

  it('auto-mounts the toast viewport (toasts render)', () => {
    render(
      <AppProvider locale="en">
        <span />
      </AppProvider>,
    );
    act(() => {
      toast('Saved successfully');
    });
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
  });

  it('toast={false} mounts no viewport', () => {
    render(
      <AppProvider locale="en" toast={false}>
        <span />
      </AppProvider>,
    );
    act(() => {
      toast('Should not appear');
    });
    expect(screen.queryByText('Should not appear')).toBeNull();
  });

  it('toast config (position) is forwarded to the viewport', () => {
    render(
      <AppProvider locale="en" toast={{ position: 'top-right' }}>
        <span />
      </AppProvider>,
    );
    act(() => {
      toast('Positioned toast');
    });
    const ol = screen.getByText('Positioned toast').closest('ol');
    expect(ol).toHaveAttribute('data-position', 'top-right');
  });
});
