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
    const setupNodeSteps = workflow.match(/- name: Setup Node[\s\S]*?(?=\n\s+- name:|$)/g);

    assert.equal(setupNodeSteps?.length, expectedSteps, `${path} Setup Node count`);
    for (const step of setupNodeSteps) {
      assert.match(step, /uses: actions\/setup-node@v4/);
      assert.match(step, /node-version: "24"/);
      assert.doesNotMatch(step, /node-version: "22"/);
    }
  }
});
