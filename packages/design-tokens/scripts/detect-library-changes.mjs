import { spawnSync } from 'node:child_process';

const [after] = process.argv.slice(2);

if (!after) {
  process.stderr.write('usage: node detect-library-changes.mjs <after-sha>\n');
  process.exitCode = 2;
} else {
  const latestTag = latestSemanticReleaseTag(after);
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

function latestSemanticReleaseTag(after) {
  const result = git('tag', '--list', 'v*', '--sort=-v:refname');
  if (result.status !== 0) return undefined;
  const tag = result.stdout.split('\n').find((candidate) => isSemanticReleaseTag(candidate));
  if (!tag) return undefined;
  const commit = git('rev-parse', '--verify', `${tag}^{commit}`);
  if (
    commit.status !== 0 ||
    git('merge-base', '--is-ancestor', commit.stdout.trim(), after).status !== 0
  ) {
    return undefined;
  }
  return tag;
}

function isSemanticReleaseTag(tag) {
  const match = tag.match(
    /^v(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/,
  );
  if (!match) return false;
  return (
    match[1] === undefined ||
    match[1]
      .split('.')
      .every(
        (identifier) =>
          !/^[0-9]+$/.test(identifier) || identifier === '0' || !identifier.startsWith('0'),
      )
  );
}

function git(...args) {
  return spawnSync('git', args, { encoding: 'utf8' });
}
