import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const runtimeFiles = new Map([
  ['.github/workflows/quality.yml', 1],
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

test('sets up Node before detecting release library changes', async () => {
  const workflow = await readFile(resolve(repositoryRoot, '.github/workflows/release.yml'), 'utf8');
  const detectorJob = workflow.slice(
    workflow.indexOf('  detect-library-changes:'),
    workflow.indexOf('\n  publish:'),
  );
  const setupNodeSteps = extractSetupNodeSteps(detectorJob);
  const detectChangesIndex = detectorJob.indexOf('      - name: Detect library changes');

  assert.equal(setupNodeSteps.length, 1, 'release detector actions/setup-node@v4 count');
  assert.notEqual(detectChangesIndex, -1, 'missing Detect library changes step');
  assert.ok(
    detectorJob.indexOf(setupNodeSteps[0]) < detectChangesIndex,
    'Setup Node must run before Detect library changes',
  );
});

test('rejects setup-node uses hidden by another step name', () => {
  const workflow = `
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

  assert.throws(() => assertWorkflowUsesNode24(workflow, 1, 'renamed fixture'));
});

test('rejects non-24 versions even when a setup-node step contains 24 text', () => {
  const workflow = `
steps:
  - name: Setup Node
    uses: actions/setup-node@v4
    with:
      # Previous runtime: node-version: "24"
      node-version: "23"
`;

  assert.throws(() => assertWorkflowUsesNode24(workflow, 1, 'version fixture'));
});

test('rejects node-version outside the setup-node with mapping', () => {
  const workflow = `
steps:
  - name: Setup Node
    uses: actions/setup-node@v4
    env:
      node-version: "24"
`;

  assert.throws(() => assertWorkflowUsesNode24(workflow, 1, 'env fixture'));
});

function assertWorkflowUsesNode24(workflow, expectedSteps, path) {
  const setupNodeSteps = extractSetupNodeSteps(workflow);

  assert.equal(setupNodeSteps.length, expectedSteps, `${path} actions/setup-node@v4 count`);
  for (const [index, step] of setupNodeSteps.entries()) {
    const nodeVersions = extractWithNodeVersions(step);
    assert.deepEqual(
      nodeVersions,
      ['"24"'],
      `${path} actions/setup-node@v4 step ${index + 1} node-version`,
    );
  }
}

function extractSetupNodeSteps(workflow) {
  const lines = workflow.split('\n');
  const steps = [];

  for (let start = 0; start < lines.length; start += 1) {
    const listItem = lines[start].match(/^([ \t]*)-\s+/);
    if (!listItem) continue;

    const indentation = listItem[1].length;
    let end = start + 1;
    while (end < lines.length) {
      if (lines[end].trim() === '') {
        end += 1;
        continue;
      }
      const nextIndentation = lines[end].match(/^[ \t]*/)[0].length;
      if (nextIndentation <= indentation) break;
      end += 1;
    }
    steps.push(lines.slice(start, end).join('\n'));
  }

  return steps.filter((step) => /^[ \t]*(?:-\s+)?uses:\s*actions\/setup-node@v4\s*$/m.test(step));
}

function extractWithNodeVersions(step) {
  const lines = step.split('\n');
  const usesLine = lines.find((line) =>
    /^[ \t]*(?:-\s+)?uses:\s*actions\/setup-node@v4\s*$/.test(line),
  );
  const listItemUses = usesLine.match(/^([ \t]*)-\s+uses:/);
  const fieldIndentation = listItemUses
    ? listItemUses[1].length + 2
    : usesLine.match(/^([ \t]*)uses:/)[1].length;
  const nodeVersions = [];

  for (let start = 0; start < lines.length; start += 1) {
    const withMapping = lines[start].match(/^([ \t]*)with:\s*$/);
    if (!withMapping || withMapping[1].length !== fieldIndentation) continue;

    const mappingEntries = [];
    for (let index = start + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.trim() === '' || line.trimStart().startsWith('#')) continue;

      const indentation = line.match(/^[ \t]*/)[0].length;
      if (indentation <= fieldIndentation) break;

      const entry = line.match(/^([ \t]*)([A-Za-z_][\w-]*):\s*(.*?)\s*$/);
      if (entry) {
        mappingEntries.push({
          indentation: entry[1].length,
          key: entry[2],
          value: entry[3],
        });
      }
    }

    const childIndentation = Math.min(...mappingEntries.map((entry) => entry.indentation));
    nodeVersions.push(
      ...mappingEntries
        .filter((entry) => entry.indentation === childIndentation && entry.key === 'node-version')
        .map((entry) => entry.value),
    );
  }

  return nodeVersions;
}
