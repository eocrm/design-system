import { mergeAriaDescribedby } from './refs';

describe('_internal/refs — mergeAriaDescribedby', () => {
  it('returns the extra id when consumer is undefined', () => {
    expect(mergeAriaDescribedby(undefined, 'tip-1')).toBe('tip-1');
  });

  it('returns the extra id when consumer is the empty string', () => {
    expect(mergeAriaDescribedby('', 'tip-1')).toBe('tip-1');
  });

  it('appends extra after a single consumer id', () => {
    expect(mergeAriaDescribedby('err-1', 'tip-1')).toBe('err-1 tip-1');
  });

  it('preserves consumer ordering when there are multiple', () => {
    expect(mergeAriaDescribedby('err-1 hint-1', 'tip-1')).toBe('err-1 hint-1 tip-1');
  });

  it('dedupes when the extra id is already present', () => {
    expect(mergeAriaDescribedby('tip-1 hint-1', 'tip-1')).toBe('tip-1 hint-1');
  });

  it('normalises any whitespace separator in the consumer value', () => {
    expect(mergeAriaDescribedby('err-1   hint-1', 'tip-1')).toBe('err-1 hint-1 tip-1');
  });
});
