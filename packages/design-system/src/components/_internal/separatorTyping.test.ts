import { typeSeparator, type SeparatorState } from './separatorTyping';

const none: SeparatorState = { converted: false, grouped: false };
const converted: SeparatorState = { converted: true, grouped: false };
const grouped: SeparatorState = { converted: false, grouped: true };
// de: decimal ',', group '.'
const de = (text: string, at: number, ch: string, state = none, end = at) =>
  typeSeparator(text, at, end, ch, ',', '.', state);

describe('typeSeparator', () => {
  it('ignores locales whose decimal is "." and chars that are not separators', () => {
    expect(typeSeparator('1', 1, 1, '.', '.', ',', none)).toBeNull();
    expect(de('1', 1, '5')).toBeNull();
  });

  it('a "." with no decimal types the decimal and marks it converted', () => {
    expect(de('1', 1, '.')).toEqual({ text: '1,', caret: 2, state: converted });
    // ru: '.' does not group there, but still types the decimal.
    expect(typeSeparator('1', 1, 1, '.', ',', ' ', none)).toEqual({
      text: '1,',
      caret: 2,
      state: converted,
    });
  });

  it('a typed decimal with none present passes through and is not converted', () => {
    expect(de('1', 1, ',', converted)).toEqual({ block: false, state: none });
  });

  it('a second "." is blocked, a second decimal passes; both clear converted', () => {
    expect(de('1,5', 3, '.', converted)).toEqual({ block: true, state: none });
    expect(de('1,24', 4, ',', converted)).toEqual({ block: false, state: none });
  });

  it('is selection-aware: a decimal inside the selection does not count', () => {
    expect(de('1,5', 1, '.', none, 2)).toEqual({ text: '1,5', caret: 2, state: converted });
    expect(de('1,5', 0, '.', none, 3)).toEqual({ text: ',', caret: 1, state: converted });
  });

  it('reinterprets a converted decimal + exactly 3 digits as a group', () => {
    // The typed decimal stays the decimal; a typed '.' becomes the (converted) decimal again.
    expect(de('1,234', 5, ',', converted)).toEqual({
      text: '1.234,',
      caret: 6,
      state: grouped,
    });
    expect(de('1,234', 5, '.', converted)).toEqual({
      text: '1.234,',
      caret: 6,
      state: { converted: true, grouped: true },
    });
  });

  it('does not reinterpret an unconverted decimal, 2 or 4 digits, or before a digit', () => {
    expect(de('1,234', 5, ',', none)).toEqual({ block: false, state: none });
    expect(de('1,24', 4, '.', converted)).toEqual({ block: true, state: none });
    expect(de('1,2345', 6, ',', converted)).toEqual({ block: false, state: none });
    expect(de('1,2345', 5, '.', converted)).toEqual({ block: true, state: none });
  });

  it('never reinterprets where "." does not group (ru, fr)', () => {
    const ru = typeSeparator('1,234', 5, 5, ',', ',', ' ', converted);
    expect(ru).toEqual({ block: false, state: none });
  });

  describe('after a reinterpretation (strict 3-digit groups)', () => {
    it('rejects a 4th digit in a group before the decimal', () => {
      expect(de('1.234', 5, '5', grouped)).toEqual({ block: true, state: grouped });
      expect(de('1.234', 0, '5', grouped)).toBeNull();
      expect(de('123.456', 0, '7', grouped)).toEqual({ block: true, state: grouped });
      expect(de('1.23', 4, '4', grouped)).toBeNull();
      // Fraction digits are free.
      expect(de('1.234,5678', 10, '9', grouped)).toBeNull();
    });

    it('rejects a separator after an incomplete group', () => {
      expect(de('1.23', 4, '.', grouped)).toEqual({ block: true, state: grouped });
      expect(de('1.23', 4, ',', grouped)).toEqual({ block: true, state: grouped });
      expect(de('1.234', 5, ',', grouped)).toEqual({ block: false, state: grouped });
      expect(de('1.234', 5, '.', grouped)).toEqual({
        text: '1.234,',
        caret: 6,
        state: { converted: true, grouped: true },
      });
    });
  });

  it('a digit is left alone outside strict grouping', () => {
    expect(de('1.234', 5, '5', none)).toBeNull();
  });
});
