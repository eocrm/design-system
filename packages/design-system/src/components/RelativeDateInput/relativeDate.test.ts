import { formatRelativeDate, parseRelativeDate } from './relativeDate';

const point = { mode: 'point' } as const;
const pointNow = { mode: 'point', allowNow: true } as const;
const range = { mode: 'range' } as const;

describe('relativeDate grammar', () => {
  it('reads `m` as months and `min` as minutes (#700)', () => {
    expect(parseRelativeDate('today+3m', point)).toMatchObject({ offset: { n: 3, unit: 'm' } });
    expect(parseRelativeDate('now-5min', pointNow)).toMatchObject({
      offset: { n: 5, unit: 'min' },
    });
  });

  it.each([
    ['today', point],
    ['today+7d', point],
    ['today-1w', point],
    ['now-30min', pointNow],
    ['now+2h', pointNow],
    ['start:this:month', point],
    ['end:next:quarter+1d', point],
    ['end:last:year-2m', point],
    ['2026-11-03', point],
    ['2026-11-03T09:00:00Z', pointNow],
    ['last:30d', range],
    ['next:7d', range],
    ['next:12m', range],
    ['this:month', range],
    ['last:week', range],
    ['next:year', range],
    ['this:quarter:to_date', range],
  ] as const)('round-trips %s', (expr, opts) => {
    const v = parseRelativeDate(expr, opts);
    expect(v).not.toBeNull();
    expect(formatRelativeDate(v!)).toBe(expr);
  });

  it.each([
    ['now', point],
    ['today+3h', pointNow],
    ['today+2mo', point], // months are `m`, matching the eocrm server grammar (#700)
    ['today+1001d', point],
    ['last:0d', range],
    ['last:1001d', range],
    ['this:month', point],
    ['today', range],
    ['2026-11-03', range],
    ['2026-11-03T09:00:00Z', point],
    ['2026-13-01', point],
    ['', point],
    ['garbage', point],
    ['today+7', point],
    ['today+7x', point],
    ['start:this:decade', point],
  ] as const)('rejects %j', (expr, opts) => {
    expect(parseRelativeDate(expr, opts)).toBeNull();
  });

  it('omits a zero offset', () => {
    expect(
      formatRelativeDate({
        kind: 'anchor',
        anchor: 'today',
        offset: { sign: 1, n: 0, unit: 'd' },
      }),
    ).toBe('today');
  });
});
