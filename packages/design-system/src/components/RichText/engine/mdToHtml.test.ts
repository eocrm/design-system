import { mdToHtml } from './mdToHtml';

describe('mdToHtml — blocks', () => {
  it('converts ATX headings', () => {
    expect(mdToHtml('# A\n## B')).toBe('<h1>A</h1><h2>B</h2>');
  });
  it('converts paragraphs (wrapped lines joined)', () => {
    expect(mdToHtml('one\ntwo\n\nthree')).toBe('<p>one two</p><p>three</p>');
  });
  it('converts fenced code verbatim and escaped', () => {
    expect(mdToHtml('```\na <b>\n```')).toBe('<pre><code>a &lt;b&gt;</code></pre>');
  });
  it('converts blockquotes', () => {
    expect(mdToHtml('> quoted')).toBe('<blockquote><p>quoted</p></blockquote>');
  });
  it('converts unordered and ordered lists', () => {
    expect(mdToHtml('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>');
    expect(mdToHtml('1. a\n2. b')).toBe('<ol><li>a</li><li>b</li></ol>');
  });
  it('nests lists by indentation', () => {
    expect(mdToHtml('- a\n  - b')).toBe('<ul><li>a<ul><li>b</li></ul></li></ul>');
  });
});

describe('mdToHtml — inline', () => {
  it('converts bold/italic/strike/code', () => {
    expect(mdToHtml('**b** *i* ~~s~~ `c`')).toBe('<p><strong>b</strong> <em>i</em> <del>s</del> <code>c</code></p>');
  });
  it('converts links but not images', () => {
    expect(mdToHtml('[t](/u)')).toBe('<p><a href="/u">t</a></p>');
    expect(mdToHtml('![alt](/img.png)')).toBe('<p>alt</p>');
  });
  it('honors backslash escapes and escapes HTML in text', () => {
    expect(mdToHtml('a \\* b')).toBe('<p>a * b</p>');
    expect(mdToHtml('a < b & c')).toBe('<p>a &lt; b &amp; c</p>');
  });
});
