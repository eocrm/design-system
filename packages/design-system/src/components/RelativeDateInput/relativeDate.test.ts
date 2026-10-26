import { formatRelativeDate, parseRelativeDate } from './relativeDate';

const point = { mode: 'point' } as const;
const pointNow = { mode: 'point', allowNow: true } as const;
const range = { mode: 'range' } as const;

describe('relativeDate grammar', () => {
  it.each([
    ['today', point],
    ['today+7d', point],
    ['today-1w', point],
    ['now-30min', pointNow],
    ['now+2h', pointNow],
    ['start:this:month', point],
    ['end:next:quarter+1d', point],
    ['end:last:year-2mo', point],
    ['2026-11-03', point],
    ['2026-11-03T09:00:00Z', pointNow],
    ['last:30d', range],
    ['next:7d', range],
    ['next:12mo', range],
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
