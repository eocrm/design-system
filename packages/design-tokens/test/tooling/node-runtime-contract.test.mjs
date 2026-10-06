import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse } from 'yaml';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

const runtimeFiles = new Map([
  ['.github/workflows/quality.yml', 6],
  ['.github/workflows/release.yml', 2],
  ['.github/workflows/deploy-playground.yml', 1],
]);

test('pins local development and package support to Node 24', async () => {
  const [nvmrc, packageJson] = await Promise.all([
    readFile(resolve(repositoryRoot, '.nvmrc'), 'utf8'),
    readFile(resolve(repositoryRoot, 'package.json'), 'utf8').then(JSON.parse),
  ]);

  assert.equal(nvmrc, '24\n');
  assert.equal(packageJson.engines?.node, '>=24 <25');
});

test('runs every GitHub workflow Node job on Node 24', async () => {
  for (const [path, expectedSteps] of runtimeFiles) {
    const workflow = await readFile(resolve(repositoryRoot, path), 'utf8');
    assertWorkflowUsesNode24(workflow, expectedSteps, path);
  }
});

test('sets up uncached Node before detecting release library changes', async () => {
  const workflow = await readFile(resolve(repositoryRoot, '.github/workflows/release.yml'), 'utf8');
  assertReleaseDetectorSetupNode(workflow);
});

test('rejects non-24 versions in any setup-node step', () => {
  const workflow = `
jobs:
  a:
    steps:
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "24"
      - name: Provision runtime
        uses: actions/setup-node@v4
        with:
          node-version: "23"
`;

  assert.throws(() => assertWorkflowUsesNode24(workflow, 2, 'version fixture'));
});

test('rejects setup-node action refs other than v4', () => {
  const workflow = `
jobs:
  a:
    steps:
      - uses: actions/setup-node@v3
        with:
          node-version: "24"
`;

  assert.throws(
    () => assertWorkflowUsesNode24(workflow, 1, 'action ref fixture'),
    /must use actions\/setup-node@v4/,
  );
});

test('rejects cache entries in the release detector Setup Node', () => {
  const workflow = `
jobs:
  detect-library-changes:
    steps:
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: "npm"
      - name: Detect library changes
        run: node packages/design-tokens/scripts/detect-library-changes.mjs "${'${{ github.sha }}'}"
`;

  assert.throws(() => assertReleaseDetectorSetupNode(workflow), /must not configure cache/);
});

test('rejects a release detector that sets up Node after detecting', () => {
  const workflow = `
jobs:
  detect-library-changes:
    steps:
      - name: Detect library changes
        run: node packages/design-tokens/scripts/detect-library-changes.mjs
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "24"
`;

  assert.throws(
    () => assertReleaseDetectorSetupNode(workflow),
    /Setup Node must run before Detect library changes/,
  );
});

/** Every setup-node step in a workflow, as { job, step }. */
function setupNodeSteps(source) {
  const wf = parse(source);
  return Object.entries(wf.jobs ?? {}).flatMap(([job, def]) =>
    (def.steps ?? [])
      .filter((s) => typeof s.uses === 'string' && s.uses.startsWith('actions/setup-node@'))
      .map((step) => ({ job, step })),
  );
}

function assertWorkflowUsesNode24(workflow, expectedSteps, path) {
  const steps = setupNodeSteps(workflow);

  assert.equal(steps.length, expectedSteps, `${path} actions/setup-node count`);
  for (const { job, step } of steps) {
    assert.equal(
      step.uses,
      'actions/setup-node@v4',
      `${path} ${job} Setup Node step must use actions/setup-node@v4`,
    );
    assert.equal(String(step.with?.['node-version']), '24', `${path} ${job} node-version`);
  }
}

function assertReleaseDetectorSetupNode(workflow) {
  const job = parse(workflow).jobs['detect-library-changes'];
  const detectIndex = job.steps.findIndex((s) => s.name === 'Detect library changes');
  const setupIndex = job.steps.findIndex((s) => s.uses?.startsWith('actions/setup-node@'));
  const [setupNode] = setupNodeSteps(workflow).filter(
    ({ job: name }) => name === 'detect-library-changes',
  );

  assert.notEqual(detectIndex, -1, 'missing Detect library changes step');
  assert.notEqual(setupIndex, -1, 'missing Setup Node step');
  assert.ok(setupIndex < detectIndex, 'Setup Node must run before Detect library changes');
  assert.equal(
    setupNodeSteps(workflow).filter((s) => s.job === 'detect-library-changes').length,
    1,
  );
  assert.equal(String(setupNode.step.with?.['node-version']), '24');
  assert.equal(
    setupNode.step.with?.cache,
    undefined,
    'release detector Setup Node must not configure cache',
  );
}
