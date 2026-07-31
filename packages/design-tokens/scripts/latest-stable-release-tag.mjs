import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function latestStableReleaseTag(after) {
  const result = git('tag', '--list', 'v*');
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || 'unable to list Git tags');
  }
  const latest = result.stdout
    .split('\n')
    .map(parseStableReleaseTag)
    .filter(Boolean)
    .sort(compareVersions)[0];
  if (!latest) return undefined;
  if (!after) return latest.tag;

  const commit = git('rev-parse', '--verify', `${latest.tag}^{commit}`);
  if (
    commit.status !== 0 ||
    git('merge-base', '--is-ancestor', commit.stdout.trim(), after).status !== 0
  ) {
    return undefined;
  }
  return latest.tag;
}

function parseStableReleaseTag(tag) {
  const match = tag.match(/^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/);
  if (!match) return undefined;
  return { tag, version: match.slice(1).map(BigInt) };
}

function compareVersions(left, right) {
  for (let index = 0; index < left.version.length; index += 1) {
    if (left.version[index] > right.version[index]) return -1;
    if (left.version[index] < right.version[index]) return 1;
  }
  return 0;
}

function git(...args) {
  return spawnSync('git', args, { encoding: 'utf8' });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${latestStableReleaseTag(process.argv[2]) ?? ''}\n`);
}
