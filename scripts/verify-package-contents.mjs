#!/usr/bin/env node
// One tarball verifier (#619): used by Quality's `package` job and by
// packages/design-tokens/test/package-boundary.test.mjs (shared lists).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGES = [
  {
    name: '@eocrm/design-tokens',
    dir: 'packages/design-tokens',
    forbidden: [
      /(?:^|\/)src\//,
      /(?:^|\/)test\//,
      /CLAUDE\.md$/,
      /(?:^|\/)compose\//,
      /(?:^|\/)scripts\//,
    ],
  },
  {
    name: '@eocrm/design-system',
    dir: 'packages/design-system',
    forbidden: [
      /\.test\.(?:t|j)sx?$/,
      /\.spec\./,
      /(?:^|\/)types\//,
      /CLAUDE\.md$/,
      /tsconfig/,
      /(?:^|\/)compose\//,
    ],
  },
];

/**
 * Required paths: README.md, package.json, and every string target in `exports`
 * (conditional/nested objects are walked). Wildcard (`*`) targets are skipped:
 * they cannot be checked as a literal path.
 */
export function requiredPaths(pkgJson) {
  const targets = new Set(['README.md', 'package.json']);
  const walk = (v) => {
    if (typeof v === 'string') {
      if (!v.includes('*')) targets.add(v.replace(/^\.\//, ''));
    } else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(pkgJson.exports);
  return [...targets];
}

/** Problems for one package given its packed file list. */
export function verify(pkg, files, pkgJson) {
  const leaked = files.filter((p) => pkg.forbidden.some((re) => re.test(p)));
  const missing = requiredPaths(pkgJson).filter((p) => !files.includes(p));
  return [
    ...leaked.map((p) => `${pkg.name} tarball leaked: ${p}`),
    ...missing.map((p) => `${pkg.name} tarball missing: ${p}`),
  ];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  let failed = false;
  for (const pkg of PACKAGES) {
    const out = execFileSync('npm', ['pack', '--dry-run', '--json', '--workspace', pkg.name], {
      encoding: 'utf8',
      cwd: repoRoot,
    });
    const [{ files }] = JSON.parse(out);
    const paths = files.map((f) => f.path);
    const pkgJson = JSON.parse(readFileSync(join(repoRoot, pkg.dir, 'package.json'), 'utf8'));
    const problems = verify(pkg, paths, pkgJson);
    if (problems.length) {
      failed = true;
      for (const p of problems) console.error(`::error::${p}`);
    } else console.log(`${pkg.name} tarball OK (${paths.length} files)`);
  }
  process.exitCode = failed ? 1 : 0;
}
