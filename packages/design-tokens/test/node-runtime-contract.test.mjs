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

test('sets up uncached Node before detecting release library changes', async () => {
  const workflow = await readFile(resolve(repositoryRoot, '.github/workflows/release.yml'), 'utf8');
  const detectorJob = workflow.slice(
    workflow.indexOf('  detect-library-changes:'),
    workflow.indexOf('\n  publish:'),
  );
  assertReleaseDetectorSetupNode(detectorJob);
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

test('ignores setup-node text embedded in YAML block scalars', () => {
  const workflow = `
steps:
  - name: Setup Node
    uses: actions/setup-node@v4
    with:
      node-version: "24"
  - name: Inspect fixture
    run: |
      - name: Pretend Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "23"
`;

  assert.doesNotThrow(() => assertWorkflowUsesNode24(workflow, 1, 'scalar fixture'));
});

test('rejects setup-node action refs other than v4', () => {
  const workflow = `
steps:
  - name: Setup Node
    uses: actions/setup-node@v3
    with:
      node-version: "24"
`;

  assert.throws(
    () => assertWorkflowUsesNode24(workflow, 1, 'action ref fixture'),
    /must use actions\/setup-node@v4/,
  );
});

test('rejects cache entries in the release detector Setup Node with mapping', () => {
  const detectorJob = `
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

  assert.throws(() => assertReleaseDetectorSetupNode(detectorJob), /must not configure cache/);
});

function assertWorkflowUsesNode24(workflow, expectedSteps, path) {
  const setupNodeSteps = extractSetupNodeSteps(workflow);

  for (const [index, step] of setupNodeSteps.entries()) {
    assert.equal(
      step.actionRef,
      'v4',
      `${path} Setup Node step ${index + 1} must use actions/setup-node@v4`,
    );
  }
  assert.equal(setupNodeSteps.length, expectedSteps, `${path} actions/setup-node count`);
  for (const [index, step] of setupNodeSteps.entries()) {
    const nodeVersions = extractWithNodeVersions(step);
    assert.deepEqual(
      nodeVersions,
      ['"24"'],
      `${path} actions/setup-node@v4 step ${index + 1} node-version`,
    );
  }
}

function assertReleaseDetectorSetupNode(detectorJob) {
  const setupNodeSteps = extractSetupNodeSteps(detectorJob);
  const detectChangesIndex = detectorJob.indexOf('      - name: Detect library changes');

  assertWorkflowUsesNode24(detectorJob, 1, 'release detector');
  assert.notEqual(detectChangesIndex, -1, 'missing Detect library changes step');
  assert.ok(
    detectorJob.indexOf(setupNodeSteps[0].contents) < detectChangesIndex,
    'Setup Node must run before Detect library changes',
  );
  assert.deepEqual(
    extractWithMappings(setupNodeSteps[0]).flatMap((mapping) =>
      mapping.entries.filter((entry) => entry.key === 'cache'),
    ),
    [],
    'release detector Setup Node with mapping must not configure cache',
  );
}

function extractSetupNodeSteps(workflow) {
  const lines = removeYamlBlockScalarBodies(workflow);
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
    const contents = lines.slice(start, end).join('\n');
    const actionRef = extractSetupNodeActionRef(contents);
    if (actionRef) steps.push({ actionRef, contents });
  }

  return steps;
}

function extractWithNodeVersions(step) {
  return extractWithMappings(step).flatMap((mapping) =>
    mapping.entries.filter((entry) => entry.key === 'node-version').map((entry) => entry.value),
  );
}

function extractWithMappings(step) {
  const lines = step.contents.split('\n');
  const usesLine = lines.find((line) =>
    /^[ \t]*(?:-\s+)?uses:\s*(?:actions\/setup-node@[^\s#'\"]+|["']actions\/setup-node@[^'\"]+["'])\s*(?:#.*)?$/.test(
      line,
    ),
  );
  const listItemUses = usesLine.match(/^([ \t]*)-\s+uses:/);
  const fieldIndentation = listItemUses
    ? listItemUses[1].length + 2
    : usesLine.match(/^([ \t]*)uses:/)[1].length;
  const mappings = [];

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
    mappings.push({
      entries: mappingEntries.filter((entry) => entry.indentation === childIndentation),
    });
  }

  return mappings;
}

function extractSetupNodeActionRef(step) {
  const usesLine = step.match(
    /^[ \t]*(?:-\s+)?uses:\s*(?:actions\/setup-node@([^\s#'\"]+)|["']actions\/setup-node@([^'\"]+)["'])\s*(?:#.*)?$/m,
  );

  return usesLine ? (usesLine[1] ?? usesLine[2]) : undefined;
}

function removeYamlBlockScalarBodies(workflow) {
  const lines = workflow.split('\n');
  const nonScalarLines = [];
  let scalarIndentation;

  for (const line of lines) {
    const indentation = line.match(/^[ \t]*/)[0].length;
    if (scalarIndentation !== undefined) {
      if (line.trim() === '' || indentation > scalarIndentation) continue;
      scalarIndentation = undefined;
    }

    nonScalarLines.push(line);
    if (
      /^[ \t]*(?:-\s+)?(?:[A-Za-z_][\w-]*|["'][^"']+["']):\s*[>|][+-]?\d*\s*(?:#.*)?$/.test(line)
    ) {
      scalarIndentation = indentation;
    }
  }

  return nonScalarLines;
}
