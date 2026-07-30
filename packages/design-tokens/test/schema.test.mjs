import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadTokenDocument } from '../scripts/lib/load-tokens.mjs';

const validDocument = (contractVersion) => ({
  schemaVersion: 1,
  contractVersion,
  tokens: [
    {
      id: 'color.primary',
      type: 'color',
      value: '#000000',
      outputs: { web: { name: '--color-primary' } },
    },
  ],
});

test('reports every structural schema error with its JSON path', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'eocrm-tokens-schema-'));
  const file = join(dir, 'tokens.json');
  await writeFile(file, JSON.stringify({ schemaVersion: 0, tokens: 'wrong' }));

  await assert.rejects(loadTokenDocument(file), (error) => {
    assert.match(error.message, /schemaVersion/);
    assert.match(error.message, /tokens/);
    return true;
  });
});

test('orders structural errors by JSON path using code-unit order', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'eocrm-tokens-schema-'));
  const file = join(dir, 'tokens.json');
  await writeFile(file, JSON.stringify({ schemaVersion: 0, contractVersion: 0, tokens: 'wrong' }));

  await assert.rejects(loadTokenDocument(file), (error) => {
    assert.ok(error.message.indexOf('/contractVersion') < error.message.indexOf('/schemaVersion'));
    assert.ok(error.message.indexOf('/schemaVersion') < error.message.indexOf('/tokens'));
    return true;
  });
});

test('rejects SemVer prerelease numeric identifiers with leading zeroes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'eocrm-tokens-schema-'));

  for (const contractVersion of ['1.2.3-01', '1.2.3-alpha.01']) {
    const file = join(dir, `${contractVersion}.json`);
    await writeFile(file, JSON.stringify(validDocument(contractVersion)));
    await assert.rejects(loadTokenDocument(file), /contractVersion/);
  }
});

test('accepts valid semantic versions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'eocrm-tokens-schema-'));

  for (const contractVersion of ['1.2.3', '1.2.3-alpha.1', '1.2.3+build.5']) {
    const file = join(dir, `${contractVersion}.json`);
    await writeFile(file, JSON.stringify(validDocument(contractVersion)));
    await assert.doesNotReject(loadTokenDocument(file));
  }
});
