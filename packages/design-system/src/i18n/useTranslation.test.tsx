import { render, screen } from '@testing-library/react';
import { I18nProvider } from './I18nProvider';
import { useTranslation } from './useTranslation';
import { en } from './en';
import { ru } from './ru';

// Test-only augmentation: while the live `Messages` interface is empty
// (components haven't migrated yet), give the tests something to look up.
// Each test populates `en`/`ru` directly before render — the cast on the
// `messages.ts` skeleton already opens this door, and these tests are the
// canonical proof that the resolution chain works end-to-end.
declare module './messages' {
  interface Messages {
    // All optional so the real en/ru locale files (which don't populate these)
    // still satisfy the interface at compile time. Tests `seed()` them at
    // runtime before exercising the resolution chain.
    greeting?: string;
    nested?: { dismiss: string };
    fn?: (params: Record<string, unknown>) => string;
  }
}

type WritableMessages = {
  greeting?: string;
  nested?: { dismiss?: string };
  fn?: (params: Record<string, unknown>) => string;
};

function seed(target: object, fixture: WritableMessages) {
  // Mutate the in-memory locale objects so the provider's deepMerge sees them.
  Object.assign(target, fixture);
}

function clear(target: object) {
  for (const key of Object.keys(target)) {
    delete (target as Record<string, unknown>)[key];
  }
}

afterEach(() => {
  clear(en);
  clear(ru);
});

function Probe({
  k,
  params,
  testId = 'out',
}: {
  k: 'greeting' | 'nested.dismiss' | 'fn' | 'missing.key';
  params?: Record<string, unknown>;
  testId?: string;
}) {
  const t = useTranslation();
  return <span data-testid={testId}>{t(k as never, params)}</span>;
}

describe('useTranslation', () => {
  it('returns the en default when no provider is mounted', () => {
    seed(en, { greeting: 'Hello' });
    render(<Probe k="greeting" />);
    expect(screen.getByTestId('out')).toHaveTextContent('Hello');
  });

  it('returns the ru default inside <I18nProvider locale="ru">', () => {
    seed(en, { greeting: 'Hello' });
    seed(ru, { greeting: 'Привет' });
    render(
      <I18nProvider locale="ru">
        <Probe k="greeting" />
      </I18nProvider>,
    );
    expect(screen.getByTestId('out')).toHaveTextContent('Привет');
  });

  it('applies overrides on top of the locale defaults', () => {
    seed(en, { greeting: 'Hello', nested: { dismiss: 'Dismiss' } });
    render(
      <I18nProvider locale="en" overrides={{ nested: { dismiss: 'Hide' } }}>
        <Probe k="nested.dismiss" />
      </I18nProvider>,
    );
    expect(screen.getByTestId('out')).toHaveTextContent('Hide');
  });

  it('overrides do not blow away sibling keys', () => {
    seed(en, { greeting: 'Hello', nested: { dismiss: 'Dismiss' } });
    render(
      <I18nProvider locale="en" overrides={{ nested: { dismiss: 'Hide' } }}>
        <>
          <Probe k="nested.dismiss" testId="dismiss" />
          <Probe k="greeting" testId="greeting" />
        </>
      </I18nProvider>,
    );
    expect(screen.getByTestId('dismiss')).toHaveTextContent('Hide');
    expect(screen.getByTestId('greeting')).toHaveTextContent('Hello');
  });

  it('returns the key string and warns when a key is missing', () => {
    seed(en, { greeting: 'Hello' });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Probe k="missing.key" />);
    expect(screen.getByTestId('out')).toHaveTextContent('missing.key');
    expect(warn).toHaveBeenCalledWith('[i18n] missing key:', 'missing.key');
    warn.mockRestore();
  });

  it('invokes function leaves with params', () => {
    seed(en, {
      fn: (params) => `count=${params.count as number}`,
    });
    render(<Probe k="fn" params={{ count: 7 }} />);
    expect(screen.getByTestId('out')).toHaveTextContent('count=7');
  });

  it('invokes function leaves with an empty object when no params are passed', () => {
    seed(en, {
      fn: (params) => `count=${(params.count as number | undefined) ?? 0}`,
    });
    render(<Probe k="fn" />);
    expect(screen.getByTestId('out')).toHaveTextContent('count=0');
  });
});
