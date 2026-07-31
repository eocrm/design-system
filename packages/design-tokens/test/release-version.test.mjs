import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { readMavenArtifact, verifyPublishedVersion } from '../scripts/verify-published-version.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const scriptPath = resolve(
  repositoryRoot,
  'packages/design-tokens/scripts/set-release-version.mjs',
);

test('synchronizes both npm packages, the dependency, and generated contract version', async () => {
  const fixture = await createFixture();

  try {
    const result = runScript('1.2.3', fixture);
    assert.equal(result.status, 0, result.stderr);

    const [tokensPackage, designSystemPackage, tokenSource, manifest] = await Promise.all([
      readJson(join(fixture, 'packages/design-tokens/package.json')),
      readJson(join(fixture, 'packages/design-system/package.json')),
      readJson(join(fixture, 'packages/design-tokens/src/tokens.json')),
      readJson(join(fixture, 'packages/design-tokens/generated/manifest.json')),
    ]);

    assert.equal(tokensPackage.version, '1.2.3');
    assert.equal(designSystemPackage.version, '1.2.3');
    assert.equal(designSystemPackage.dependencies['@eocrm/design-tokens'], '1.2.3');
    assert.equal(tokenSource.contractVersion, '1.2.3');
    assert.equal(manifest.contractVersion, '1.2.3');
  } finally {
    await rm(fixture, { recursive: true });
  }
});

test('rejects invalid versions without modifying any file', async () => {
  const fixture = await createFixture();

  try {
    const before = await snapshotFixture(fixture);
    const result = runScript('1.02.3', fixture);
    const after = await snapshotFixture(fixture);

    assert.notEqual(result.status, 0);
    assert.deepEqual(after, before);
  } finally {
    await rm(fixture, { recursive: true });
  }
});

test('accepts already-published artifacts only when their content matches', async () => {
  const coordinates = [
    '@eocrm/design-tokens',
    '@eocrm/design-system',
    'com.eocrm.design:design-tokens-compose',
  ];
  const expected = new Map(coordinates.map((coordinate) => [coordinate, 'sha256:same']));

  await verifyPublishedVersion('1.2.3', {
    attempts: 1,
    expected,
    readPublished: async (coordinate) => ({
      version: '1.2.3',
      integrity: expected.get(coordinate),
    }),
  });
});

test('rejects a same-version artifact whose content differs', async () => {
  const expected = new Map([
    ['@eocrm/design-tokens', 'sha256:new'],
    ['@eocrm/design-system', 'sha256:same'],
    ['com.eocrm.design:design-tokens-compose', 'sha256:same'],
  ]);

  await assert.rejects(
    verifyPublishedVersion('1.2.3', {
      attempts: 1,
      expected,
      readPublished: async (coordinate) => ({
        version: '1.2.3',
        integrity: coordinate === '@eocrm/design-tokens' ? 'sha256:old' : 'sha256:same',
      }),
    }),
    /@eocrm\/design-tokens: expected integrity sha256:new, received sha256:old/,
  );
});

test('rejects an incomplete Maven multiplatform publication', async () => {
  const originalFetch = globalThis.fetch;
  const module = JSON.stringify({
    component: { version: '1.2.3' },
    variants: [
      {
        files: [
          {
            url: 'contract.jar',
            sha256: 'b7d937266e14e249149d9a9e89a06e62e8cb057c04697a0d3ab41558412bcb45',
          },
        ],
      },
    ],
  });
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('.module')) {
      return new Response(module);
    }
    if (String(url).endsWith('.pom')) {
      return new Response('<version>1.2.3</version>');
    }
    return new Response('missing', { status: 404 });
  };

  try {
    await assert.rejects(
      readMavenArtifact('eocrm/design-system', '1.2.3', 'actor', 'token'),
      /Maven registry returned 404.*contract\.jar/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

async function createFixture() {
  const fixture = await mkdtemp(join(tmpdir(), 'eocrm-release-version-'));
  const paths = [
    'packages/design-tokens/package.json',
    'packages/design-system/package.json',
    'packages/design-tokens/src/tokens.json',
    'packages/design-tokens/generated/manifest.json',
  ];
  for (const path of paths) {
    const target = join(fixture, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await readFile(join(repositoryRoot, path)));
  }
  return fixture;
}

function runScript(version, root) {
  return spawnSync(process.execPath, [scriptPath, version, '--root', root], {
    encoding: 'utf8',
  });
}

async function snapshotFixture(root) {
  const paths = [
    'packages/design-tokens/package.json',
    'packages/design-system/package.json',
    'packages/design-tokens/src/tokens.json',
    'packages/design-tokens/generated/manifest.json',
  ];
  return Object.fromEntries(
    await Promise.all(paths.map(async (path) => [path, await readFile(join(root, path), 'utf8')])),
  );
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}
