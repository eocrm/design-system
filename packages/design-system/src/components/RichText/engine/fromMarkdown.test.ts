import { fromMarkdown } from './fromMarkdown';
import { runsText } from './inlines';

describe('fromMarkdown', () => {
  it('parses a representative document end-to-end', () => {
    const md = '# Title\n\nRead the [docs](/x) and **note** this.\n\n- a\n  - b\n\n> quote\n\n```\ncode\n```';
    const d = fromMarkdown(md);
    expect(d.blocks.map((b) => [b.type, b.depth, runsText(b.inlines)])).toEqual([
      ['heading', undefined, 'Title'],
      ['paragraph', undefined, 'Read the docs and note this.'],
      ['bullet_item', 0, 'a'],
      ['bullet_item', 1, 'b'],
      ['blockquote', undefined, 'quote'],
      ['code_block', undefined, 'code'],
    ]);
  });

  it('carries link + bold marks through the HTML hop', () => {
    const d = fromMarkdown('[t](/u) and **b**');
    expect(d.blocks[0].inlines).toEqual([
      { text: 't', marks: [{ type: 'link', href: '/u' }] },
      { text: ' and ', marks: [] },
      { text: 'b', marks: [{ type: 'bold' }] },
    ]);
  });

  it('never produces underline (no Markdown syntax for it)', () => {
    const d = fromMarkdown('**b** *i* ~~s~~');
    const marks = d.blocks[0].inlines.flatMap((r) => r.marks.map((m) => m.type));
    expect(marks).not.toContain('underline');
  });
});
