import { fromHtml } from './fromHtml';
import { toHtml } from './toHtml';
import { runsText } from './inlines';
import type { Block, RichDoc } from './model';

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

  it('drops script/style/table/hr', () => {
    const d = fromHtml(
      '<p>a</p><script>bad()</script><style>x{}</style><table><tr><td>t</td></tr></table><hr><p>b</p>',
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

it('parses a data-mention-id span into a mention mark', () => {
  const doc = fromHtml(
    '<p>cc <span data-mention-id="u1" data-mention-label="Alice">@Alice</span></p>',
  );
  const run = doc.blocks[0].inlines.find((r) => r.text === '@Alice');
  expect(run?.marks).toEqual([{ type: 'mention', id: 'u1', label: 'Alice' }]);
});

it('round-trips a mention through toHtml → fromHtml', () => {
  const doc: RichDoc = {
    blocks: [
      {
        id: 'b',
        type: 'paragraph',
        inlines: [
          { text: 'cc ', marks: [] },
          { text: '@Alice', marks: [{ type: 'mention', id: 'u1', label: 'Alice' }] },
        ],
      },
    ],
  };
  const back = fromHtml(toHtml(doc));
  const run = back.blocks[0].inlines.find((r) => r.text === '@Alice');
  expect(run?.marks).toEqual([{ type: 'mention', id: 'u1', label: 'Alice' }]);
});

it('round-trips a mention with special chars in id/label through toHtml → fromHtml', () => {
  const doc: RichDoc = {
    blocks: [
      {
        id: 'b',
        type: 'paragraph',
        inlines: [{ text: '@A&<>"B', marks: [{ type: 'mention', id: 'a&b"<', label: 'A&<>"B' }] }],
      },
    ],
  };
  const back = fromHtml(toHtml(doc));
  const run = back.blocks[0].inlines.find((r) => r.marks.some((m) => m.type === 'mention'));
  expect(run?.marks).toEqual([{ type: 'mention', id: 'a&b"<', label: 'A&<>"B' }]);
  expect(run?.text).toBe('@A&<>"B');
});

it('a plain span without data-mention-id is not a mention', () => {
  const doc = fromHtml('<p><span>plain</span></p>');
  expect(doc.blocks[0].inlines.every((r) => r.marks.every((m) => m.type !== 'mention'))).toBe(true);
});

it('a span with an empty data-mention-id is treated as plain text', () => {
  const doc = fromHtml('<p><span data-mention-id="">@x</span></p>');
  expect(doc.blocks[0].inlines.every((r) => r.marks.every((m) => m.type !== 'mention'))).toBe(true);
});

describe('fromHtml — attachments', () => {
  it('parses a block-level <img> into a ready image attachment block', () => {
    const doc = fromHtml('<p>x</p><img src="http://u/p.png" alt="Chart">');
    const att = doc.blocks.find((b) => b.type === 'attachment')!;
    expect(att).toBeTruthy();
    expect(att.src).toBe('http://u/p.png');
    expect(att.alt).toBe('Chart');
    expect(att.mime).toBe('image/*');
    expect(att.status).toBe('ready');
  });

  it('parses a <figure><img> into an attachment block', () => {
    const doc = fromHtml('<figure><img src="http://u/p.png" alt="Pic"></figure>');
    expect(doc.blocks.some((b) => b.type === 'attachment' && b.src === 'http://u/p.png')).toBe(
      true,
    );
  });

  it('drops an <img> with an unsafe src', () => {
    const doc = fromHtml('<img src="javascript:alert(1)" alt="x">');
    expect(doc.blocks.some((b) => b.type === 'attachment')).toBe(false);
  });
});
