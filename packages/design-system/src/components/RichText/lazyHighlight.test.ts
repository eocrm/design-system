// Prism must stay out of the RichText/RichTextEditor static graph: highlight.ts
// is reached only through useHighlight's dynamic import() (DS-104).
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(__dirname, '..');
const sources = ['RichText', 'RichTextEditor'].flatMap((dir) =>
  readdirSync(join(root, dir), { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => ({ file: `${dir}/${f}`, src: readFileSync(join(root, dir, f), 'utf8') })),
);
// Value imports only: `import type` is erased and pulls in nothing.
const banned =
  /^import\s+(?!type\b)[^;]*?from\s+['"]([^'"]*\/CodeBlock(?:\/highlight)?|prism-react-renderer)['"]/gm;

it('scans the RichText and RichTextEditor sources', () => {
  expect(sources.map((s) => s.file)).toEqual(
    expect.arrayContaining(['RichText/RichText.tsx', 'RichText/useHighlight.ts']),
  );
});

it('no RichText/RichTextEditor module statically imports Prism or CodeBlock', () => {
  const hits = sources.flatMap(({ file, src }) =>
    [...src.matchAll(banned)].map((m) => `${file}: ${m[1]}`),
  );
  expect(hits).toEqual([]);
});

it('useHighlight reaches highlight.ts through a dynamic import', () => {
  const src = sources.find((s) => s.file === 'RichText/useHighlight.ts')!.src;
  expect(src).toContain("import('../CodeBlock/highlight')");
});
