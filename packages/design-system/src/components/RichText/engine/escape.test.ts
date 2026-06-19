import { escapeHtml, escapeAttr } from './escape';

describe('escape', () => {
  it('escapeHtml escapes & < >', () => {
    expect(escapeHtml('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
  });
  it('escapeAttr escapes & < > and quotes', () => {
    expect(escapeAttr(`a"b'c&d<e>f`)).toBe('a&quot;b&#39;c&amp;d&lt;e&gt;f');
  });
});
