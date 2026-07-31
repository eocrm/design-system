import { spawnSync } from 'node:child_process';
import { latestStableReleaseTag } from './latest-stable-release-tag.mjs';

const [after] = process.argv.slice(2);

if (!after) {
  process.stderr.write('usage: node detect-library-changes.mjs <after-sha>\n');
  process.exitCode = 2;
} else {
  let latestTag;
  try {
    latestTag = latestStableReleaseTag(after);
  } catch {
    latestTag = undefined;
  }
  const diff = latestTag && git('diff', '--name-only', latestTag, after);
  if (!diff || diff.status !== 0) {
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

function git(...args) {
  return spawnSync('git', args, { encoding: 'utf8' });
}
