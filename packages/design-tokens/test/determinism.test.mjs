import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { checkGenerated } from '../scripts/check-generated.mjs';
import { generate } from '../scripts/generate.mjs';
import { renderWeb } from '../scripts/lib/render-web.mjs';
import { validateTokens } from '../scripts/lib/validate-tokens.mjs';

test('renders identical repository-independent bytes on repeated calls', () => {
  const document = validateTokens({
    schemaVersion: 1,
    contractVersion: '0.0.0',
    tokens: [
      {
        id: 'space.small',
        type: 'dimension',
        value: '4px',
        outputs: { web: { name: '--space-sm' } },
      },
    ],
  });

  const first = renderWeb(document);
  const second = renderWeb(document);
  const output = `${first.tokensScss}${first.darkScss}`;

  assert.deepEqual(second, first);
  assert.doesNotMatch(output, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  assert.doesNotMatch(output, /(?:\/home\/|[A-Z]:\\)/);
});

test('drift check reports the relative name of every changed generated file', async () => {
  const expectedRoot = await mkdtemp(join(tmpdir(), 'eocrm-token-expected-'));

  try {
    await generate({ outputRoot: expectedRoot });
    const manifestPath = join(expectedRoot, 'manifest.json');
    const manifest = await readFile(manifestPath, 'utf8');
    await writeFile(
      manifestPath,
      manifest.replace('"contractVersion": "0.0.0"', '"contractVersion": "9.9.9"'),
    );

    assert.deepEqual(await checkGenerated({ expectedRoot }), ['manifest.json']);
  } finally {
    await rm(expectedRoot, { recursive: true });
  }
});
