import { segmentHighlights } from './highlightRanges';

describe('segmentHighlights', () => {
  it('splits text around a match', () => {
    expect(segmentHighlights('find the needle here', [{ start: 9, length: 6 }])).toEqual([
      { text: 'find the ', match: false },
      { text: 'needle', match: true },
      { text: ' here', match: false },
    ]);
  });

  it('returns the whole text as one plain segment when there are no ranges', () => {
    expect(segmentHighlights('plain', [])).toEqual([{ text: 'plain', match: false }]);
  });

  it('sorts unsorted ranges and merges overlapping or touching ones', () => {
    expect(
      segmentHighlights('abcdefghij', [
        { start: 6, length: 2 },
        { start: 1, length: 3 },
        { start: 2, length: 3 },
        { start: 5, length: 1 },
      ]),
    ).toEqual([
      { text: 'a', match: false },
      { text: 'bcdefgh', match: true },
      { text: 'ij', match: false },
    ]);
  });

  it('clamps out-of-range ranges and drops empty or invalid ones', () => {
    expect(
      segmentHighlights('hello', [
        { start: -2, length: 3 },
        { start: 4, length: 99 },
        { start: 2, length: 0 },
        { start: 10, length: 2 },
        { start: Number.NaN, length: 2 },
      ]),
    ).toEqual([
      { text: 'h', match: true },
      { text: 'ell', match: false },
      { text: 'o', match: true },
    ]);
  });

  it('drops a range nested inside an earlier one', () => {
    expect(
      segmentHighlights('abcdef', [
        { start: 0, length: 4 },
        { start: 1, length: 2 },
      ]),
    ).toEqual([
      { text: 'abcd', match: true },
      { text: 'ef', match: false },
    ]);
  });

  it('uses UTF-16 offsets (an emoji is two code units)', () => {
    expect(segmentHighlights('🙂 hi', [{ start: 3, length: 2 }])).toEqual([
      { text: '🙂 ', match: false },
      { text: 'hi', match: true },
    ]);
  });
});
