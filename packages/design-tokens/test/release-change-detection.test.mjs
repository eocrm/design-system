import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const scriptPath = join(
  repositoryRoot,
  'packages/design-tokens/scripts/detect-library-changes.mjs',
);
const zeroSha = '0000000000000000000000000000000000000000';
const workflowPath = join(repositoryRoot, '.github/workflows/release.yml');

test('detects a library change earlier in a multi-commit push', async () => {
  const fixture = await createRepository();

  try {
    const before = commit(fixture, 'base');
    await write(fixture, 'packages/design-tokens/src/changed.json', '{}');
    commit(fixture, 'library');
    await write(fixture, 'packages/playground/later.txt', 'later');
    const after = commit(fixture, 'playground');

    const result = detect(fixture, before, after);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'true\n');
  } finally {
    await rm(fixture, { recursive: true });
  }
});

test('assumes a library change for an initial push zero SHA', async () => {
  const fixture = await createRepository();

  try {
    const after = commit(fixture, 'initial');
    const result = detect(fixture, zeroSha, after);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'true\n');
  } finally {
    await rm(fixture, { recursive: true });
  }
});

test('assumes a library change when the before commit is not an ancestor', async () => {
  const fixture = await createRepository();

  try {
    const base = commit(fixture, 'base');
    runGit(fixture, 'checkout', '-qb', 'discarded');
    await write(fixture, 'discarded.txt', 'discarded');
    const before = commit(fixture, 'discarded');
    runGit(fixture, 'checkout', '-q', 'main');
    await write(fixture, 'packages/playground/replacement.txt', 'replacement');
    const after = commit(fixture, 'replacement');
    assert.equal(runGit(fixture, 'merge-base', '--is-ancestor', before, after).status, 1);
    assert.notEqual(base, after);

    const result = detect(fixture, before, after);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'true\n');
  } finally {
    await rm(fixture, { recursive: true });
  }
});

test('skips playground and design-system CLAUDE-only push ranges', async () => {
  const fixture = await createRepository();

  try {
    const before = commit(fixture, 'base');
    await write(fixture, 'packages/playground/page.txt', 'page');
    commit(fixture, 'playground');
    await write(fixture, 'packages/design-system/CLAUDE.md', 'instructions');
    const after = commit(fixture, 'instructions');

    const result = detect(fixture, before, after);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'false\n');
  } finally {
    await rm(fixture, { recursive: true });
  }
});

test('serializes repository releases without cancelling partial-publication recovery', async () => {
  const workflow = await readFile(workflowPath, 'utf8');

  assert.match(
    workflow,
    /^concurrency:\n  group: release-\$\{\{ github\.repository \}\}\n  cancel-in-progress: false$/m,
  );
});

test('checks out full history and passes the complete push range to the detector', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const detectorJob = workflow.slice(
    workflow.indexOf('  detect-library-changes:'),
    workflow.indexOf('\n  publish:'),
  );

  assert.match(detectorJob, /fetch-depth: 0[\s\S]*?name: Detect library changes/);
  assert.match(
    detectorJob,
    /detect-library-changes\.mjs "\$\{\{ github\.event\.before \}\}" "\$\{\{ github\.sha \}\}"/,
  );
});

test('stages Compose publications locally and repairs every Maven file', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const composeStep = workflow.slice(
    workflow.indexOf('      - name: Publish Compose tokens'),
    workflow.indexOf('      - name: Verify published artifacts'),
  );

  assert.match(composeStep, /publishToMavenLocal/);
  assert.match(composeStep, /-Dmaven\.repo\.local="\$RUNNER_TEMP\/compose-maven"/);
  assert.match(composeStep, /repair-compose-publication\.mjs/);
  assert.doesNotMatch(composeStep, /grep -qiE '409/);
});

async function createRepository() {
  const fixture = await mkdtemp(join(tmpdir(), 'eocrm-release-diff-'));
  runGit(fixture, 'init', '-qb', 'main');
  runGit(fixture, 'config', 'user.email', 'test@example.com');
  runGit(fixture, 'config', 'user.name', 'Test');
  return fixture;
}

async function write(root, path, contents) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents);
}

function commit(root, message) {
  runGit(root, 'add', '.');
  const result = runGit(root, 'commit', '--allow-empty', '-qm', message);
  assert.equal(result.status, 0, result.stderr);
  return runGit(root, 'rev-parse', 'HEAD').stdout.trim();
}

function detect(root, before, after) {
  return spawnSync(process.execPath, [scriptPath, before, after], {
    cwd: root,
    encoding: 'utf8',
  });
}

function runGit(root, ...args) {
  return spawnSync('git', args, { cwd: root, encoding: 'utf8' });
}
