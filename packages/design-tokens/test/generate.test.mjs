import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { generate, validateTokenSource } from '../scripts/generate.mjs';

const tokenSourcePath = fileURLToPath(new URL('../src/tokens.json', import.meta.url));

test('validates the authoritative token source through the exported API', async () => {
  const document = await validateTokenSource(tokenSourcePath);

  assert.equal(document.tokens.length, 289);
});

test('exported validation rejects an invalid source', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eocrm-token-generate-'));
  const invalidSource = join(directory, 'tokens.json');

  try {
    await writeFile(
      invalidSource,
      JSON.stringify({
        schemaVersion: 1,
        contractVersion: '1.0.0',
        tokens: [
          {
            id: 'space.invalid',
            type: 'dimension',
            value: '4rem',
            outputs: {
              compose: { group: 'dimensions', name: 'invalid' },
            },
          },
        ],
      }),
    );

    await assert.rejects(
      validateTokenSource(invalidSource),
      /Compose dimensions must resolve to a px value or numeric zero/,
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});

test('generates web artifacts and a stable publication manifest', async () => {
  const outputRoot = await mkdtemp(join(tmpdir(), 'eocrm-token-output-'));

  try {
    await generate({ outputRoot });

    const [tokensScss, darkScss, manifest] = await Promise.all([
      readFile(join(outputRoot, 'web/tokens.scss'), 'utf8'),
      readFile(join(outputRoot, 'web/dark.scss'), 'utf8'),
      readFile(join(outputRoot, 'manifest.json'), 'utf8'),
    ]);

    assert.match(tokensScss, /^\/\/ GENERATED FILE — DO NOT EDIT\.\n/);
    assert.match(darkScss, /^\/\/ GENERATED FILE — DO NOT EDIT\.\n/);
    assert.deepEqual(JSON.parse(manifest), {
      schemaVersion: 1,
      contractVersion: '0.0.0',
      artifacts: {
        npm: '@eocrm/design-tokens',
        maven: 'com.eocrm.design:design-tokens-compose',
      },
    });
    assert.equal(manifest.endsWith('\n'), true);
  } finally {
    await rm(outputRoot, { recursive: true });
  }
});
