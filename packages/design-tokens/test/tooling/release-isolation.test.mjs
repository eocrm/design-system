import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse } from 'yaml';

// @eocrm/design-system-mcp releases independently (release-mcp.yml, mcp-v* tags):
// an MCP-only change must never start, version or publish the design-system release.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const mcpPath = 'packages/design-system-mcp/src/server.js';
const scripts = join(root, 'packages/design-tokens/scripts');

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

async function withRepository(fn) {
  const repo = await mkdtemp(join(tmpdir(), 'eocrm-release-isolation-'));
  try {
    git(repo, 'init', '-qb', 'main');
    git(repo, 'config', 'user.email', 'test@example.com');
    git(repo, 'config', 'user.name', 'Test');
    git(repo, 'config', 'tag.gpgsign', 'false');
    git(repo, 'config', 'commit.gpgsign', 'false');
    await fn(repo);
  } finally {
    await rm(repo, { recursive: true });
  }
}

function commit(repo, message) {
  git(repo, 'add', '.');
  git(repo, 'commit', '--allow-empty', '-qm', message);
  return git(repo, 'rev-parse', 'HEAD');
}

function run(repo, script, ...args) {
  const result = spawnSync(process.execPath, [join(scripts, script), ...args], {
    cwd: repo,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('an MCP-only change is not a library change', async () => {
  await withRepository(async (repo) => {
    commit(repo, 'base');
    git(repo, 'tag', 'v1.2.3');
    await mkdir(join(repo, dirname(mcpPath)), { recursive: true });
    await writeFile(join(repo, mcpPath), 'export {};\n');
    const after = commit(repo, 'mcp');

    assert.equal(run(repo, 'detect-library-changes.mjs', after), 'false\n');
  });
});

test('latestStableReleaseTag ignores mcp-v* tags', async () => {
  await withRepository(async (repo) => {
    commit(repo, 'base');
    git(repo, 'tag', 'v1.2.3');
    git(repo, 'tag', 'mcp-v9.9.9');

    assert.equal(run(repo, 'latest-stable-release-tag.mjs'), 'v1.2.3\n');
  });
});

test('release.yml does not start for MCP-only pushes', async () => {
  const workflow = parse(await readFile(join(root, '.github/workflows/release.yml'), 'utf8'));
  assert.ok(workflow.on.push.paths.includes('!packages/design-system-mcp/**'));
});

test('ci-changes.sh selects only the mcp stage for an MCP-only PR', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'eocrm-ci-changes-'));
  try {
    const list = join(dir, 'files.txt');
    await writeFile(list, `${mcpPath}\n`);
    const result = spawnSync('bash', [join(root, 'scripts/ci-changes.sh'), '--files', list], {
      encoding: 'utf8',
      env: { ...process.env, GITHUB_OUTPUT: '' },
    });
    assert.equal(result.status, 0, result.stderr);
    const keys = Object.fromEntries(
      result.stdout
        .trim()
        .split('\n')
        .map((l) => l.split('=')),
    );
    assert.equal(keys.mcp, 'true');
    assert.equal(keys.ds, 'false');
    assert.deepEqual(
      Object.keys(keys).filter((k) => keys[k] === 'true'),
      ['mcp'],
    );
  } finally {
    await rm(dir, { recursive: true });
  }
});
