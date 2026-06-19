import { safeHref } from './safeHref';

describe('safeHref', () => {
  it('keeps relative paths and the http(s)/mailto/tel schemes', () => {
    expect(safeHref('/path')).toBe('/path');
    expect(safeHref('./x')).toBe('./x');
    expect(safeHref('#frag')).toBe('#frag');
    expect(safeHref('https://x.test')).toBe('https://x.test');
    expect(safeHref('http://x.test')).toBe('http://x.test');
    expect(safeHref('mailto:a@b.test')).toBe('mailto:a@b.test');
    expect(safeHref('tel:+123')).toBe('tel:+123');
  });

  it('drops dangerous and protocol-relative URLs', () => {
    expect(safeHref('javascript:alert(1)')).toBeUndefined();
    expect(safeHref('data:text/html;base64,xx')).toBeUndefined();
    expect(safeHref('//evil.test')).toBeUndefined();
    expect(safeHref('   ')).toBeUndefined();
    expect(safeHref('')).toBeUndefined();
  });
});
