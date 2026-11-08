import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRef } from 'react';
import { render } from '@testing-library/react';
import { I18nProvider, ru } from '../../i18n';
import { DateTile } from './DateTile';
import { dateTileParts } from './dateTileModel';
import styles from './DateTile.module.scss';

const now = new Date('2026-11-12T10:00:00Z');
const scss = readFileSync(resolve(__dirname, 'DateTile.module.scss'), 'utf8');
const root = (c: HTMLElement) => c.firstChild as HTMLElement;

describe('DateTile', () => {
  it('renders a <time> with dateTime', () => {
    const { container } = render(<DateTile date="2026-11-20" now={now} />);
    expect(root(container).nodeName).toBe('TIME');
    expect(root(container)).toHaveAttribute('datetime', '2026-11-20');
  });

  it('has a hidden label with the full date and hides the visuals', () => {
    const { container, getByText } = render(<DateTile date="2026-11-20" now={now} />);
    // Default locale is whatever useLocale resolves (navigator.language in jsdom).
    const label = dateTileParts({
      date: '2026-11-20',
      show: 'weekday',
      relative: true,
      now,
      locale: navigator.language || 'en-US',
      words: { today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday', ongoing: 'Ongoing' },
    }).label;
    expect(label).toMatch(/Friday/);
    expect(label).toMatch(/20/);
    expect(label).toMatch(/November/);
    expect(label).toMatch(/2026/);
    expect(getByText(label)).toBeInTheDocument();
    const hidden = [...container.querySelectorAll('[aria-hidden="true"]')];
    expect(hidden).toHaveLength(3);
    expect(hidden.map((h) => h.textContent).join(' ')).toMatch(/20/);
    expect(hidden.every((h) => !h.textContent!.includes(label))).toBe(true);
    expect(getByText(label)).not.toHaveAttribute('aria-hidden');
  });

  it('applies the class contract', () => {
    const { container, rerender } = render(<DateTile date="2026-11-12" now={now} />);
    let cls = root(container).className;
    for (const c of [styles.stacked, styles['size-md'], styles.filled, styles.today])
      expect(cls).toContain(c);
    rerender(<DateTile date="2026-11-01" now={now} layout="page" surface="plain" />);
    cls = root(container).className;
    for (const c of [styles.page, styles.plain, styles.past]) expect(cls).toContain(c);
    rerender(<DateTile date="2026-11-10" end="2026-11-14" now={now} />);
    expect(root(container).className).toContain(styles.today);
  });

  it('applies size classes', () => {
    const { container, rerender } = render(<DateTile date="2026-11-20" now={now} size="sm" />);
    expect(root(container).className).toContain(styles['size-sm']);
    rerender(<DateTile date="2026-11-20" now={now} size="lg" />);
    expect(root(container).className).toContain(styles['size-lg']);
  });

  it('sm renders no bottom line', () => {
    const { container } = render(
      <DateTile date={new Date('2026-11-20T09:00:00Z')} size="sm" show="time" now={now} />,
    );
    expect(container.querySelector(`.${styles.bottom}`)).toBeNull();
    const md = render(<DateTile date="2026-11-20" now={now} />);
    expect(md.container.querySelector(`.${styles.bottom}`)).not.toBeNull();
  });

  it('color sets the band var for page only', () => {
    const page = render(<DateTile date="2026-11-20" now={now} layout="page" color="green" />);
    expect(root(page.container).style.getPropertyValue('--date-tile-band-bg')).toBe(
      'var(--color-palette-green-bg)',
    );
    const stacked = render(<DateTile date="2026-11-20" now={now} color="green" />);
    expect(root(stacked.container).style.getPropertyValue('--date-tile-band-bg')).toBe('');
  });

  it('translates relative words', () => {
    const { container } = render(
      <I18nProvider locale="ru" messages={ru}>
        <DateTile date="2026-11-12" now={now} />
      </I18nProvider>,
    );
    expect(container.textContent).toContain('Сегодня');
  });

  it('forwards ref and spreads className / data-*', () => {
    const ref = createRef<HTMLTimeElement>();
    const { container } = render(
      <DateTile ref={ref} date="2026-11-20" now={now} className="x" data-foo="bar" />,
    );
    expect(ref.current).toBe(root(container));
    expect(root(container)).toHaveClass('x');
    expect(root(container)).toHaveAttribute('data-foo', 'bar');
  });

  describe('SCSS contract', () => {
    it('.past does not use opacity', () => {
      expect(scss).not.toMatch(/opacity/);
    });
    it('.plain.today sets no background', () => {
      const m = scss.match(/\.today\.stacked\.plain\s*\{[^}]*\}/);
      expect(m).not.toBeNull();
      expect(m![0]).not.toMatch(/background/);
    });
    it('.page.today uses the today ring', () => {
      const m = scss.match(/\.page\.today\s*\{[^}]*\}/);
      expect(m![0]).toMatch(/(outline|box-shadow)[^;]*--date-tile-today-ring/);
    });
  });
});
