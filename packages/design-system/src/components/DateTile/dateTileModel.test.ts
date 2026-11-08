// Pinned to a zone that differs from every explicit `timeZone` below, so a
// leak of the device zone into day maths would show up.
process.env.TZ = 'America/Los_Angeles';

import { describe, expect, it } from 'vitest';
import { dateTileParts } from './dateTileModel';

const words = { today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday', ongoing: 'Ongoing' };
const now = new Date('2026-11-12T10:00:00Z');
const base = { show: 'weekday' as const, relative: true, now, locale: 'en-GB', words };
const p = (
  o: Partial<Parameters<typeof dateTileParts>[0]> & {
    date: Parameters<typeof dateTileParts>[0]['date'];
  },
) => dateTileParts({ ...base, ...o });

describe('dateTileParts', () => {
  it('formats a plain day string', () => {
    expect(p({ date: '2026-11-20' })).toEqual({
      month: 'Nov',
      day: '20',
      bottom: 'Fri',
      relative: null,
      label: 'Friday, 20 November 2026',
      dateTime: '2026-11-20',
    });
  });

  it('uses relative words', () => {
    const today = p({ date: '2026-11-12' });
    expect(today).toMatchObject({ bottom: 'Today', relative: 'today' });
    expect(today.label.startsWith('Today, ')).toBe(true);
    expect(p({ date: '2026-11-13' })).toMatchObject({ bottom: 'Tomorrow', relative: 'tomorrow' });
    expect(p({ date: '2026-11-11' })).toMatchObject({ bottom: 'Yesterday', relative: 'past' });
  });

  it('relative off', () => {
    const r = p({ date: '2026-11-12', relative: false });
    expect(r).toMatchObject({ bottom: 'Thu', relative: null });
    expect(r.label).not.toContain('Today');
  });

  it('TZ pin takes effect and a day string with no timeZone uses the device day', () => {
    const at = new Date('2026-11-12T03:00:00Z');
    expect(at.getDate()).toBe(11);
    expect(p({ date: at, now: at }).day).toBe('11');
    expect(p({ date: '2026-11-11', now: at }).relative).toBe('today');
  });

  it('resolves instants in the given time zone (RF1)', () => {
    const date = new Date('2026-11-12T23:30:00Z');
    expect(p({ date, timeZone: 'Asia/Tokyo' }).day).toBe('13');
    expect(p({ date, timeZone: 'America/New_York' }).day).toBe('12');
  });

  it('computes today in the given time zone (RF5)', () => {
    const r = p({
      date: '2026-11-13',
      now: new Date('2026-11-12T23:30:00Z'),
      timeZone: 'Asia/Tokyo',
    });
    expect(r.relative).toBe('today');
  });

  describe('time', () => {
    const date = new Date('2026-11-20T14:30:00Z');
    it('time only', () => {
      const r = p({ date, timeZone: 'UTC', show: 'time' });
      expect(r.bottom).toBe('14:30');
      expect(r.label.endsWith(', 14:30')).toBe(true);
      expect(r.dateTime).toBe('2026-11-20T14:30:00.000Z');
    });
    it('weekday + time', () => {
      expect(p({ date, timeZone: 'UTC', show: 'weekday-time' }).bottom).toBe('Fri · 14:30');
    });
    it('today + time', () => {
      const d = new Date('2026-11-12T14:30:00Z');
      expect(p({ date: d, timeZone: 'UTC', show: 'weekday-time' }).bottom).toBe('Today · 14:30');
    });
    it('day string has no time', () => {
      expect(p({ date: '2026-11-20', show: 'time' }).bottom).toBe('Fri');
      expect(p({ date: '2026-11-20', show: 'weekday-time' }).bottom).toBe('Fri');
    });
    it('en-US 12h', () => {
      expect(p({ date, timeZone: 'UTC', show: 'time', locale: 'en-US' }).bottom).toMatch(
        /2:30\s?PM/,
      );
    });
  });

  it('shows the year when it differs from today', () => {
    const r = p({ date: '2027-03-04' });
    expect(r.month).toBe('Mar 2027');
    expect(r.label).toContain('2027');
  });

  describe('ranges', () => {
    it('same month', () => {
      expect(p({ date: '2026-11-20', end: '2026-11-22' })).toMatchObject({
        day: '20–22',
        bottom: 'Fri–Sun',
        month: 'Nov',
      });
    });
    it('cross month (RF3)', () => {
      const r = p({ date: '2026-11-28', end: '2026-12-02' });
      expect(r.day).toBe('28–2');
      expect(r.month).toContain('Nov');
      expect(r.month).toContain('Dec');
    });
    it('cross year (RF3)', () => {
      expect(p({ date: '2026-12-30', end: '2027-01-02' }).month).toContain('2027');
    });
    it('ongoing', () => {
      const r = p({ date: '2026-11-11', end: '2026-11-14' });
      expect(r).toMatchObject({ relative: 'ongoing', bottom: 'Wed–Sat' });
      expect(r.label.startsWith('Ongoing, ')).toBe(true);
    });
    it('starting today is ongoing', () => {
      const r = p({ date: '2026-11-12', end: '2026-11-14' });
      expect(r).toMatchObject({ relative: 'ongoing', bottom: 'Thu–Sat' });
      expect(r.label.startsWith('Ongoing, ')).toBe(true);
    });
    it('strips locale abbreviation dots from every month', () => {
      expect(p({ date: '2026-11-28', end: '2026-12-02', locale: 'ru' }).month).toBe('нояб – дек');
    });
    it('ru year line has no era word (single and cross-year)', () => {
      expect(p({ date: '2027-03-04', locale: 'ru' }).month).not.toMatch(/г/);
      const r = p({ date: '2026-12-30', end: '2027-01-02', locale: 'ru' }).month;
      expect(r).not.toMatch(/г/);
      expect(r).toMatch(/2026.*2027/);
    });
    it('en year line unchanged', () => {
      expect(p({ date: '2027-03-04', locale: 'en-US' }).month).toBe('Mar 2027');
    });
    it('ended', () => {
      expect(p({ date: '2026-11-01', end: '2026-11-03' }).relative).toBe('past');
    });
    it('starts tomorrow', () => {
      const r = p({ date: '2026-11-13', end: '2026-11-15' });
      expect(r).toMatchObject({ relative: 'tomorrow', bottom: 'Fri–Sun' });
      expect(r.label.startsWith('Tomorrow, ')).toBe(true);
    });
    it('time comes from the start instant', () => {
      const r = p({
        date: new Date('2026-11-20T09:00:00Z'),
        end: '2026-11-22',
        timeZone: 'UTC',
        show: 'time',
      });
      expect(r.bottom).toBe('09:00');
    });
    it('end equal to or before start is a single day (RF4)', () => {
      const single = p({ date: '2026-11-20' });
      expect(p({ date: '2026-11-20', end: '2026-11-20' })).toEqual(single);
      expect(p({ date: '2026-11-20', end: '2026-11-18' })).toEqual(single);
    });
  });

  it('throws on a calendar-invalid day string', () => {
    expect(() => p({ date: '2026-02-30' })).toThrow(/\[DateTile\] invalid date: 2026-02-30/);
  });

  it('throws on an invalid date (RF4)', () => {
    expect(() => p({ date: 'nope' })).toThrow(/\[DateTile\] invalid date/);
  });
});
