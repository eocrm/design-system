// tsc emits declarations with the source's extensionless relative specifiers
// (`'./Button'`), which node16/nodenext consumers cannot resolve. Rewrite each
// to the explicit `./x.js` or `./x/index.js` (last step of `npm run build`).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );

for (const file of walk(dist).filter((f) => f.endsWith('.d.ts'))) {
  const code = readFileSync(file, 'utf8');
  const fixed = code.replace(
    /((?:from\s+|import\(\s*)(['"]))(\.{1,2}(?:\/[^'"]*)?)\2/g,
    (_, head, quote, spec) => {
      const target = resolve(dirname(file), spec);
      if (existsSync(`${target}.d.ts`)) return `${head}${spec}.js${quote}`;
      if (existsSync(join(target, 'index.d.ts'))) return `${head}${spec}/index.js${quote}`;
      throw new Error(`${file}: cannot resolve declaration for '${spec}'`);
    },
  );
  if (fixed !== code) writeFileSync(file, fixed);
}
