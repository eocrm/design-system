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
const stableTagScriptPath = join(
  repositoryRoot,
  'packages/design-tokens/scripts/latest-stable-release-tag.mjs',
);
const workflowPath = join(repositoryRoot, '.github/workflows/release.yml');
const qualityWorkflowPath = join(repositoryRoot, '.github/workflows/quality.yml');

test('detects a library change earlier in a multi-commit push', async () => {
  const fixture = await createRepository();

  try {
    commit(fixture, 'base');
    tag(fixture, 'v1.2.3');
    await write(fixture, 'packages/design-tokens/src/changed.json', '{}');
    commit(fixture, 'library');
    await write(fixture, 'packages/playground/later.txt', 'later');
    const after = commit(fixture, 'playground');

    const result = detect(fixture, after);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'true\n');
  } finally {
    await rm(fixture, { recursive: true });
  }
});

test('detects a replaced pending library push from the latest release tag', async () => {
  const fixture = await createRepository();

  try {
    commit(fixture, 'released');
    tag(fixture, 'v1.2.3');
    await write(fixture, 'packages/design-system/src/library.txt', 'library');
    const replacedPending = commit(fixture, 'library');
    await write(fixture, 'packages/playground/later.txt', 'later');
    const survivingPush = commit(fixture, 'playground');

    const result = detect(fixture, survivingPush);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'true\n');
  } finally {
    await rm(fixture, { recursive: true });
  }
});

test('falls back conservatively when no release tag exists', async () => {
  const fixture = await createRepository();

  try {
    const after = commit(fixture, 'initial');
    const result = detect(fixture, after);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'true\n');
  } finally {
    await rm(fixture, { recursive: true });
  }
});

test('falls back conservatively when the latest release tag is not an ancestor', async () => {
  const fixture = await createRepository();

  try {
    const base = commit(fixture, 'base');
    tag(fixture, 'v1.2.2');
    runGit(fixture, 'checkout', '-qb', 'discarded');
    await write(fixture, 'discarded.txt', 'discarded');
    const tagged = commit(fixture, 'discarded');
    tag(fixture, 'v1.2.3');
    runGit(fixture, 'checkout', '-q', 'main');
    await write(fixture, 'packages/playground/replacement.txt', 'replacement');
    const after = commit(fixture, 'replacement');
    assert.equal(runGit(fixture, 'merge-base', '--is-ancestor', tagged, after).status, 1);
    assert.notEqual(base, after);

    const result = detect(fixture, after);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'true\n');
  } finally {
    await rm(fixture, { recursive: true });
  }
});

test('does not republish tagged library changes when only excluded files changed since', async () => {
  const fixture = await createRepository();

  try {
    await write(fixture, 'packages/design-tokens/src/released.json', '{}');
    commit(fixture, 'base');
    tag(fixture, 'v1.2.3');
    await write(fixture, 'packages/playground/page.txt', 'page');
    commit(fixture, 'playground');
    await write(fixture, 'packages/design-system/CLAUDE.md', 'instructions');
    const after = commit(fixture, 'instructions');

    const result = detect(fixture, after);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'false\n');
  } finally {
    await rm(fixture, { recursive: true });
  }
});

test('falls back conservatively when no semantic release tag exists', async () => {
  const fixture = await createRepository();

  try {
    commit(fixture, 'base');
    tag(fixture, 'vnot-semver');
    await write(fixture, 'packages/playground/page.txt', 'page');
    const after = commit(fixture, 'playground');

    const result = detect(fixture, after);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'true\n');
  } finally {
    await rm(fixture, { recursive: true });
  }
});

test('rejects release tags with non-semantic numeric prerelease identifiers', async () => {
  const fixture = await createRepository();

  try {
    commit(fixture, 'base');
    tag(fixture, 'v1.2.3-01');
    await write(fixture, 'packages/playground/page.txt', 'page');
    const after = commit(fixture, 'playground');

    const result = detect(fixture, after);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'true\n');
  } finally {
    await rm(fixture, { recursive: true });
  }
});

test('detects changes since the latest stable tag instead of a newer prerelease tag', async () => {
  const fixture = await createRepository();

  try {
    commit(fixture, 'stable release');
    tag(fixture, 'v1.2.3');
    await write(fixture, 'packages/design-tokens/src/candidate.json', '{}');
    commit(fixture, 'prerelease candidate');
    tag(fixture, 'v9.0.0-rc.1');
    await write(fixture, 'packages/playground/page.txt', 'page');
    const after = commit(fixture, 'playground');

    const result = detect(fixture, after);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'true\n');
  } finally {
    await rm(fixture, { recursive: true });
  }
});

test('selects the highest stable semantic version and ignores other v-prefixed tags', async () => {
  const fixture = await createRepository();

  try {
    commit(fixture, 'base');
    for (const name of ['v1.9.9', 'v2.0.0', 'v10.0.0', 'vlatest', 'v99.0.0-rc.1']) {
      tag(fixture, name);
    }

    const result = latestStableTag(fixture);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'v10.0.0\n');
  } finally {
    await rm(fixture, { recursive: true });
  }
});

test('prints an empty stable tag consistently when only malformed or prerelease tags exist', async () => {
  const fixture = await createRepository();

  try {
    commit(fixture, 'base');
    tag(fixture, 'vlatest');
    tag(fixture, 'v1.2.3-rc.1');

    const result = latestStableTag(fixture);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '\n');
  } finally {
    await rm(fixture, { recursive: true });
  }
});

test('fails tag selection instead of treating a Git error as an empty repository', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'eocrm-release-not-git-'));

  try {
    const result = latestStableTag(fixture);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /not a git repository/);
  } finally {
    await rm(fixture, { recursive: true });
  }
});

test('falls back conservatively when shallow history omits the release tag', async () => {
  const fixture = await createRepository();
  const cloneRoot = await mkdtemp(join(tmpdir(), 'eocrm-release-shallow-'));
  const shallow = join(cloneRoot, 'repository');

  try {
    commit(fixture, 'released');
    tag(fixture, 'v1.2.3');
    await write(fixture, 'packages/playground/page.txt', 'page');
    commit(fixture, 'playground');
    const clone = spawnSync('git', ['clone', '--depth=1', `file://${fixture}`, shallow], {
      encoding: 'utf8',
    });
    assert.equal(clone.status, 0, clone.stderr);
    const after = runGit(shallow, 'rev-parse', 'HEAD').stdout.trim();

    const result = detect(shallow, after);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'true\n');
  } finally {
    await Promise.all([rm(fixture, { recursive: true }), rm(cloneRoot, { recursive: true })]);
  }
});

test('serializes repository releases without cancelling partial-publication recovery', async () => {
  const workflow = await readFile(workflowPath, 'utf8');

  assert.match(
    workflow,
    /^concurrency:\n  group: release-\$\{\{ github\.repository \}\}\n  cancel-in-progress: false$/m,
  );
});

test('checks out full history and asks the detector about the surviving commit', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const detectorJob = workflow.slice(
    workflow.indexOf('  detect-library-changes:'),
    workflow.indexOf('\n  publish:'),
  );

  assert.match(detectorJob, /fetch-depth: 0[\s\S]*?name: Detect library changes/);
  assert.match(detectorJob, /detect-library-changes\.mjs "\$\{\{ github\.sha \}\}"/);
});

test('uses the shared stable-tag selector to compute the next release version', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const versionStep = workflow.slice(
    workflow.indexOf('      - name: Determine next version'),
    workflow.indexOf('      - name: Synchronize release version'),
  );

  assert.match(versionStep, /latest-stable-release-tag\.mjs/);
  assert.doesNotMatch(versionStep, /git tag --list/);
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

test('recognizes the npm 11 duplicate-version error for resumable releases', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const npmPublishSteps = workflow.slice(
    workflow.indexOf('      - name: Publish design tokens'),
    workflow.indexOf('      - name: Publish Compose tokens'),
  );

  assert.equal(
    npmPublishSteps.match(/cannot publish over the previously published versions/g)?.length,
    2,
  );
  assert.equal(npmPublishSteps.match(/set \+e/g)?.length, 2);
});

test('deploys the playground only after publish succeeds or an intentional no-change skip', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  const deployJob = workflow.slice(workflow.indexOf('  deploy-playground:'));
  const normalizedJob = deployJob.replace(/\s+/g, ' ');

  assert.match(
    normalizedJob,
    /needs: \[quality, detect-library-changes, publish\] if: >- always\(\) && needs\.quality\.result == 'success' && needs\.detect-library-changes\.result == 'success' && \(needs\.publish\.result == 'success' \|\| \(needs\.publish\.result == 'skipped' && needs\.detect-library-changes\.outputs\.changed == 'false'\)\)/,
  );
});

test('caches npm and Gradle dependencies in quality and release jobs', async () => {
  const [qualityWorkflow, releaseWorkflow] = await Promise.all([
    readFile(qualityWorkflowPath, 'utf8'),
    readFile(workflowPath, 'utf8'),
  ]);

  for (const workflow of [
    qualityWorkflow,
    releaseWorkflow.slice(releaseWorkflow.indexOf('  publish:')),
  ]) {
    const nodeStep = extractWorkflowStep(workflow, 'Setup Node');
    const javaStep = extractWorkflowStep(workflow, 'Setup Java');
    const androidStep = extractWorkflowStep(workflow, 'Setup Android SDK');

    assert.match(nodeStep, /uses: actions\/setup-node@v4/);
    assert.match(nodeStep, /cache: "npm"/);
    assert.match(javaStep, /uses: actions\/setup-java@v4/);
    assert.match(javaStep, /cache: "gradle"/);
    assert.match(javaStep, /packages\/design-tokens\/compose\/\*\*\/\*\.gradle\*/);
    assert.match(javaStep, /packages\/design-tokens\/compose\/gradle\.properties/);
    assert.match(javaStep, /packages\/design-tokens\/compose\/\*\*\/gradle-wrapper\.properties/);
    assert.doesNotMatch(androidStep, /cache/i);
  }
});

function extractWorkflowStep(workflow, name) {
  const start = workflow.indexOf(`      - name: ${name}`);
  const next = workflow.indexOf('\n      - name:', start + 1);
  assert.notEqual(start, -1, `missing workflow step: ${name}`);
  return workflow.slice(start, next === -1 ? undefined : next);
}

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

function tag(root, name) {
  const result = runGit(root, 'tag', name);
  assert.equal(result.status, 0, result.stderr);
}

function detect(root, after) {
  return spawnSync(process.execPath, [scriptPath, after], {
    cwd: root,
    encoding: 'utf8',
  });
}

function latestStableTag(root) {
  return spawnSync(process.execPath, [stableTagScriptPath], {
    cwd: root,
    encoding: 'utf8',
  });
}

function runGit(root, ...args) {
  return spawnSync('git', args, { cwd: root, encoding: 'utf8' });
}
