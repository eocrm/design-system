import { categoryPoint, matchCategory } from './chartSyncMatch';

const days = ['Mon', 'Tue', 'Wed'];
const starts = [100, 200, 300];

describe('categoryPoint', () => {
  it('sends the bucket [v_i, v_i+1), the last bucket reusing the previous step', () => {
    expect(categoryPoint(0, days, starts)).toMatchObject({ from: 100, to: 200 });
    expect(categoryPoint(2, days, starts)).toMatchObject({ from: 300, to: 400 });
  });

  it('converts Dates to epoch ms', () => {
    const d = [new Date(0), new Date(1000)];
    expect(categoryPoint(1, ['a', 'b'], d)).toMatchObject({ from: 1000, to: 2000 });
  });

  it('without values sends the label only', () => {
    expect(categoryPoint(1, days)).toEqual({ label: 'Tue' });
  });

  it('treats a length mismatch as no values', () => {
    expect(categoryPoint(1, days, [1, 2])).toEqual({ label: 'Tue' });
  });
});

describe('matchCategory', () => {
  it('by value picks the bucket containing from', () => {
    expect(matchCategory({ source: 's', from: 100 }, days, starts)).toBe(0);
    expect(matchCategory({ source: 's', from: 250, to: 250 }, days, starts)).toBe(1);
    expect(matchCategory({ source: 's', from: 399 }, days, starts)).toBe(2);
  });

  it('by value out of range is null', () => {
    expect(matchCategory({ source: 's', from: 99 }, days, starts)).toBeNull();
    expect(matchCategory({ source: 's', from: 400 }, days, starts)).toBeNull();
  });

  it('by label matches exactly', () => {
    expect(matchCategory({ source: 's', label: 'Wed' }, days)).toBe(2);
    expect(matchCategory({ source: 's', label: 'wed' }, days)).toBeNull();
  });

  it('a label payload never matches a receiver with values', () => {
    expect(matchCategory({ source: 's', label: 'Wed' }, days, starts)).toBeNull();
  });

  it('a value-only payload never matches a receiver without values', () => {
    expect(matchCategory({ source: 's', from: 200 }, days)).toBeNull();
  });

  it('a length mismatch on the receiver falls back to the label', () => {
    expect(matchCategory({ source: 's', label: 'Tue', from: 999 }, days, [1])).toBe(1);
  });
});
