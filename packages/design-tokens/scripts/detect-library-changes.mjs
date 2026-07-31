import { spawnSync } from 'node:child_process';

const [before, after] = process.argv.slice(2);
const zeroSha = '0000000000000000000000000000000000000000';

if (!before || !after) {
  process.stderr.write('usage: node detect-library-changes.mjs <before-sha> <after-sha>\n');
  process.exitCode = 2;
} else if (before === zeroSha) {
  process.stdout.write('true\n');
} else if (!isAncestor(before, after)) {
  process.stdout.write('true\n');
} else {
  const diff = git('diff', '--name-only', before, after);
  if (diff.status !== 0) {
    process.stdout.write('true\n');
  } else {
    const changed = diff.stdout
      .split('\n')
      .filter(Boolean)
      .filter((path) => path !== 'packages/design-system/CLAUDE.md')
      .some(
        (path) =>
          /^packages\/design-(?:tokens|system)\//.test(path) ||
          /^\.github\/workflows\/(?:release|quality|deploy-playground)\.yml$/.test(path),
      );
    process.stdout.write(`${changed}\n`);
  }
}

function isAncestor(before, after) {
  return git('merge-base', '--is-ancestor', before, after).status === 0;
}

function git(...args) {
  return spawnSync('git', args, { encoding: 'utf8' });
}
