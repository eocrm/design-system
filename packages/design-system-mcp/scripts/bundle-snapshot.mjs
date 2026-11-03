#!/usr/bin/env node
// Usage: node scripts/bundle-snapshot.mjs [outDir=snapshot]
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

const out = resolve(process.argv[2] ?? 'snapshot');
const tmp = await mkdtemp(join(tmpdir(), 'ds-snapshot-'));
try {
  const [tgz] = execFileSync('npm', ['pack', '@eocrm/design-system@latest', '--silent'], {
    cwd: tmp,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .slice(-1);
  execFileSync('tar', ['-xzf', tgz], { cwd: tmp });
  const pkg = join(tmp, 'package');
  const { version } = JSON.parse(await readFile(join(pkg, 'package.json'), 'utf8'));

  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await cp(join(pkg, 'AI-PRIMER.md'), join(out, 'AI-PRIMER.md'));
  await cp(join(pkg, 'docs'), join(out, 'docs'), { recursive: true });
  await writeFile(join(out, 'VERSION'), `${version}\n`);

  const files = [];
  for (const e of await readdir(out, { recursive: true, withFileTypes: true })) {
    if (e.isFile()) files.push(relative(out, join(e.parentPath, e.name)));
  }
  const listing = files.filter((f) => f !== 'VERSION').sort();
  await writeFile(join(out, 'files.json'), JSON.stringify(listing, null, 2) + '\n');
  console.log(`snapshot ${version}: ${listing.length} files -> ${out}`);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
