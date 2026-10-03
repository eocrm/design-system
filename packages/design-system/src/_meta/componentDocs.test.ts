import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PKG = resolve(__dirname, '../..');
const SCRIPT = resolve(PKG, 'scripts/generate-component-docs.mjs');
const LIB: string = resolve(PKG, 'scripts/component-docs-lib.mjs');
const doc = (n: string) => readFileSync(resolve(PKG, 'docs/components', `${n}.md`), 'utf8');

describe('docs/components props tables', () => {
  it('match the generator (run `npm run build:docs` if this fails)', () => {
    let out = '';
    try {
      out = execFileSync('node', [SCRIPT, '--check'], { cwd: PKG, encoding: 'utf8' });
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string };
      throw new Error(
        `Stale component docs — run \`npm run build:docs\`:\n${err.stdout}${err.stderr}`,
      );
    }
    expect(out).not.toMatch(/stale/i);
  }, 60_000);

  it('renders union (polymorphic) props', () => {
    const md = doc('Button');
    expect(md).toContain('<!-- props:start -->');
    expect(md).toMatch(/\| `variant` \|/);
    expect(md).toMatch(/\| `as` \|/);
  });

  it('keeps compound sub-props and excludes sibling-doc prefixes', () => {
    expect(doc('Card')).toContain('`CardHeaderProps`');
    expect(doc('Button')).not.toContain('ButtonGroupProps');
  });

  it('escapes pipes inside type cells', () => {
    const row = doc('Accordion')
      .split('\n')
      .find((l) => l.startsWith('| `type` |'))!;
    expect(row).toContain('\\|');
    expect(row.split(/(?<!\\)\|/).length).toBe(6);
  });

  it('renders a polymorphic as-prop by its constraint and the default element', () => {
    const md = doc('Button');
    expect(md).toMatch(/^\| `as` \| `ElementType` \| no \| .* Default: `'button'`\. \|$/m);
    expect(md).toContain(
      '| …native | | | plus native attributes of the `as` element (default `<button>`) |',
    );
  });

  const row = (n: string, prop: string) =>
    doc(n)
      .split('\n')
      .find((l) => l.startsWith(`| \`${prop}\` |`))!;

  it('takes a union member description from any constituent', () => {
    expect(row('Grid', 'minColumnWidth')).toMatch(/\| \S[^|]*\|$/);
    expect(row('Masonry', 'minColumnWidth')).toMatch(/\| \S[^|]*\|$/);
  });

  it('expands small literal-union aliases in declaration order', () => {
    expect(row('Button', 'variant')).toContain(
      "| `'primary' \\| 'secondary' \\| 'ghost' \\| 'danger' \\| 'danger-outline' \\| 'success'` |",
    );
  });

  it("documents SocialButton's own variant default", () => {
    expect(row('SocialButton', 'variant')).toMatch(/Default: `'secondary'`\. \|$/);
  });

  it('has no Default column; @default goes into the description once', async () => {
    expect(doc('Button')).toContain('| Prop | Type | Required | Description |\n|---|---|---|---|');
    const { withDefault } = await import(LIB);
    expect(withDefault('Size.', "'md'")).toBe("Size. Default: `'md'`.");
    expect(withDefault("Size. Defaults to `'md'`.", "'md'")).toBe("Size. Defaults to `'md'`.");
  });

  it('inserts a missing block after the first code fence, first line untouched', async () => {
    const { insertBlock } = await import(LIB);
    const md = '# Title\n\n```tsx\n<X />\n```\n\nProse.\n';
    const out = insertBlock(md, 'BLOCK');
    expect(out.split('\n')[0]).toBe('# Title');
    expect(out).toBe('# Title\n\n```tsx\n<X />\n```\n\nBLOCK\n\nProse.\n');
  });

  it('rejects unknown JSDoc tags (a prose @media line truncates the description)', async () => {
    const { unknownTags } = await import(LIB);
    expect(unknownTags(['default', 'remarks', 'media'])).toEqual(['media']);
  });

  it('moves fenced code out of table cells into an example after the table', () => {
    const md = doc('Alert');
    expect(row('Alert', 'onDismiss')).toContain('(example below)');
    expect(md).toMatch(/\*\*`onDismiss`\*\* example:\n\n```/);
    expect(md.split('\n').filter((l) => l.startsWith('|') && l.includes('```'))).toEqual([]);
  });
});
