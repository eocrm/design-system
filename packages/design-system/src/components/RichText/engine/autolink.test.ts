import { findUrl, linkifyRuns } from './autolink';

describe('findUrl', () => {
  it('finds an http(s) URL ending at the caret', () => {
    expect(findUrl('see https://a.com/x')).toEqual({ start: 4, end: 19, href: 'https://a.com/x' });
  });
  it('normalizes a bare www. host to https', () => {
    expect(findUrl('go www.a.com')).toEqual({ start: 3, end: 12, href: 'https://www.a.com' });
  });
  it('excludes trailing sentence punctuation', () => {
    expect(findUrl('see https://a.com.')).toEqual({ start: 4, end: 17, href: 'https://a.com' });
    expect(findUrl('(https://a.com)')).toEqual({ start: 1, end: 14, href: 'https://a.com' });
  });
  it('returns null when the text does not end in a URL', () => {
    expect(findUrl('just words')).toBeNull();
    expect(findUrl('https://a.com then more')).toBeNull(); // URL not at the end
  });
  it('rejects unsafe schemes', () => {
    expect(findUrl('x javascript:alert(1)')).toBeNull();
  });
});

describe('linkifyRuns', () => {
  it('splits a string into plain + link runs', () => {
    expect(linkifyRuns('a https://b.com c')).toEqual([
      { text: 'a ', marks: [] },
      { text: 'https://b.com', marks: [{ type: 'link', href: 'https://b.com' }] },
      { text: ' c', marks: [] },
    ]);
  });
  it('returns a single plain run when there is no URL', () => {
    expect(linkifyRuns('no urls here')).toEqual([{ text: 'no urls here', marks: [] }]);
  });
  it('drops unsafe URLs (leaves them as plain text)', () => {
    expect(linkifyRuns('javascript:alert(1)')).toEqual([
      { text: 'javascript:alert(1)', marks: [] },
    ]);
  });
});
