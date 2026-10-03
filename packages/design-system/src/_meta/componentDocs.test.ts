import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PKG = resolve(__dirname, '../..');
const SCRIPT = resolve(PKG, 'scripts/generate-component-docs.mjs');
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
    expect(row.split(/(?<!\\)\|/).length).toBe(7);
  });

  it('renders a polymorphic as-prop by its constraint and the default element', () => {
    const md = doc('Button');
    expect(md).toContain("| `as` | `ElementType` | no | 'button' |");
    expect(md).toContain(
      '| …native | | | | plus native attributes of the `as` element (default `<button>`) |',
    );
  });
});
