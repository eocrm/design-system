// Prism must stay out of the RichText/RichTextEditor static graph: highlight.ts
// is reached only through useHighlight's dynamic import() (DS-104).
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(__dirname, '..');
const read = (file: string) => ({ file, src: readFileSync(join(root, file), 'utf8') });
const sources = [
  ...['RichText', 'RichTextEditor'].flatMap((dir) =>
    readdirSync(join(root, dir), { recursive: true, encoding: 'utf8' })
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
      .map((f) => read(`${dir}/${f}`)),
  ),
  // The CodeBlock modules RichText imports eagerly must stay Prism-free too.
  read('CodeBlock/CopyCodeButton.tsx'),
  read('CodeBlock/languages.ts'),
];
// Static value imports, side-effect imports and re-exports; `import type` /
// `export type` are erased and pull in nothing. Dynamic `import()` is not matched.
const staticSpecifiers = (src: string) =>
  [
    ...src.matchAll(
      /^\s*(?:import\s+(?!type\b)(?:[^;'"]*?\bfrom\s*)?|export\s+(?!type\b)[^;'"]*?\bfrom\s*)['"]([^'"]+)['"]/gm,
    ),
  ].map((m) => m[1]);
// CodeBlock's index/component or its highlighter, from inside or outside CodeBlock/.
const isBanned = (spec: string) =>
  spec === 'prism-react-renderer' ||
  /^\.\/?(?:index)?$/.test(spec) ||
  /(?:^|\/)(?:CodeBlock|highlight)(?:\/(?:index|CodeBlock|highlight))?$/.test(spec);

it('the import scan catches value, side-effect and re-export forms, not types or import()', () => {
  const src = [
    "import { a } from '../CodeBlock';",
    "import '../CodeBlock/highlight';",
    "export { b } from './highlight';",
    "export * from 'prism-react-renderer';",
    "import type { C } from '../CodeBlock';",
    "export type { D } from '../CodeBlock';",
    "const e = import('../CodeBlock/highlight');",
  ].join('\n');
  expect(staticSpecifiers(src).filter(isBanned)).toEqual([
    '../CodeBlock',
    '../CodeBlock/highlight',
    './highlight',
    'prism-react-renderer',
  ]);
});

it('scans the RichText and RichTextEditor sources', () => {
  expect(sources.map((s) => s.file)).toEqual(
    expect.arrayContaining([
      'RichText/RichText.tsx',
      'RichText/useHighlight.ts',
      'CodeBlock/CopyCodeButton.tsx',
      'CodeBlock/languages.ts',
    ]),
  );
});

it('no RichText/RichTextEditor module statically imports Prism or CodeBlock', () => {
  const hits = sources.flatMap(({ file, src }) =>
    staticSpecifiers(src)
      .filter(isBanned)
      .map((spec) => `${file}: ${spec}`),
  );
  expect(hits).toEqual([]);
});

it('useHighlight reaches highlight.ts through a dynamic import', () => {
  const src = sources.find((s) => s.file === 'RichText/useHighlight.ts')!.src;
  expect(src).toContain("import('../CodeBlock/highlight')");
});
