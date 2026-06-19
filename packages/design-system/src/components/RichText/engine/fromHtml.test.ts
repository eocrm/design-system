import { fromHtml } from './fromHtml';
import { runsText } from './inlines';
import type { Block } from './model';

const text = (b: Block) => runsText(b.inlines);

describe('fromHtml — blocks', () => {
  it('maps headings (h4–h6 clamp to level 3) and paragraphs', () => {
    const d = fromHtml('<h1>A</h1><h2>B</h2><h5>C</h5><p>D</p>');
    expect(d.blocks.map((b) => [b.type, b.level, text(b)])).toEqual([
      ['heading', 1, 'A'],
      ['heading', 2, 'B'],
      ['heading', 3, 'C'],
      ['paragraph', undefined, 'D'],
    ]);
  });

  it('maps a blockquote (inner paragraphs → blockquote blocks)', () => {
    const d = fromHtml('<blockquote><p>one</p><p>two</p></blockquote>');
    expect(d.blocks.map((b) => [b.type, text(b)])).toEqual([
      ['blockquote', 'one'],
      ['blockquote', 'two'],
    ]);
  });

  it('maps pre/code to a code_block preserving whitespace', () => {
    const d = fromHtml('<pre><code>a\n  b</code></pre>');
    expect(d.blocks[0].type).toBe('code_block');
    expect(text(d.blocks[0])).toBe('a\n  b');
  });

  it('maps nested lists to flat items with depth', () => {
    const d = fromHtml('<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>');
    expect(d.blocks.map((b) => [b.type, b.depth, text(b)])).toEqual([
      ['bullet_item', 0, 'a'],
      ['bullet_item', 1, 'b'],
      ['bullet_item', 0, 'c'],
    ]);
  });

  it('uses ordered_item for <ol>', () => {
    const d = fromHtml('<ol><li>a</li></ol>');
    expect(d.blocks[0].type).toBe('ordered_item');
  });

  it('unwraps unknown containers and wraps loose text in a paragraph', () => {
    const d = fromHtml('<div><p>x</p></div>loose');
    expect(d.blocks.map((b) => [b.type, text(b)])).toEqual([
      ['paragraph', 'x'],
      ['paragraph', 'loose'],
    ]);
  });

  it('drops script/style/table/img/hr', () => {
    const d = fromHtml(
      '<p>a</p><script>bad()</script><style>x{}</style><table><tr><td>t</td></tr></table><img src="x"><hr><p>b</p>',
    );
    expect(d.blocks.map(text)).toEqual(['a', 'b']);
  });

  it('splits a <br> into separate blocks', () => {
    const d = fromHtml('<p>a<br>b</p>');
    expect(d.blocks.map((b) => [b.type, text(b)])).toEqual([
      ['paragraph', 'a'],
      ['paragraph', 'b'],
    ]);
  });

  it('returns emptyDoc for empty/whitespace input', () => {
    expect(fromHtml('').blocks).toEqual([
      { id: expect.any(String), type: 'paragraph', inlines: [{ text: '', marks: [] }] },
    ]);
    expect(fromHtml('   \n  ').blocks.length).toBe(1);
    expect(runsText(fromHtml('   ').blocks[0].inlines)).toBe('');
  });

  it('drops SVG and MathML foreign content (including embedded script text)', () => {
    expect(
      fromHtml('<p>a</p><svg><text>x</text><script>bad()</script></svg><p>b</p>').blocks.map(text),
    ).toEqual(['a', 'b']);
    expect(fromHtml('<p>a</p><math><mn>42</mn></math><p>b</p>').blocks.map(text)).toEqual([
      'a',
      'b',
    ]);
  });

  it('drops <noscript> content', () => {
    expect(fromHtml('<p>a</p><noscript><p>hidden</p></noscript><p>b</p>').blocks.map(text)).toEqual(
      ['a', 'b'],
    );
  });
});

describe('fromHtml — inline marks', () => {
  it('maps semantic inline tags to marks', () => {
    const d = fromHtml('<p><strong>b</strong><em>i</em><u>u</u><s>s</s><code>c</code></p>');
    expect(d.blocks[0].inlines).toEqual([
      { text: 'b', marks: [{ type: 'bold' }] },
      { text: 'i', marks: [{ type: 'italic' }] },
      { text: 'u', marks: [{ type: 'underline' }] },
      { text: 's', marks: [{ type: 'strike' }] },
      { text: 'c', marks: [{ type: 'code' }] },
    ]);
  });

  it('combines nested marks', () => {
    const d = fromHtml('<p><strong><em>x</em></strong></p>');
    expect(d.blocks[0].inlines).toEqual([
      { text: 'x', marks: [{ type: 'bold' }, { type: 'italic' }] },
    ]);
  });

  it('maps a[href] to a link via safeHref, dropping unsafe hrefs but keeping text', () => {
    const ok = fromHtml('<p><a href="/x">t</a></p>');
    expect(ok.blocks[0].inlines).toEqual([{ text: 't', marks: [{ type: 'link', href: '/x' }] }]);
    const bad = fromHtml('<p><a href="javascript:alert(1)">t</a></p>');
    expect(bad.blocks[0].inlines).toEqual([{ text: 't', marks: [] }]);
  });

  it('drops a tab-obfuscated javascript: href but keeps the text', () => {
    const d = fromHtml('<p><a href="java\tscript:alert(1)">x</a></p>');
    expect(d.blocks[0].inlines).toEqual([{ text: 'x', marks: [] }]);
  });

  it('recovers bold/italic/underline/strike from inline CSS (Word/Docs)', () => {
    const d = fromHtml(
      '<p><span style="font-weight:700">b</span><span style="font-style:italic">i</span><span style="text-decoration:underline">u</span><span style="text-decoration:line-through">s</span></p>',
    );
    expect(d.blocks[0].inlines).toEqual([
      { text: 'b', marks: [{ type: 'bold' }] },
      { text: 'i', marks: [{ type: 'italic' }] },
      { text: 'u', marks: [{ type: 'underline' }] },
      { text: 's', marks: [{ type: 'strike' }] },
    ]);
  });

  it('collapses whitespace and trims block edges', () => {
    const d = fromHtml('<p>  a   b  </p>');
    expect(text(d.blocks[0])).toBe('a b');
  });
});
