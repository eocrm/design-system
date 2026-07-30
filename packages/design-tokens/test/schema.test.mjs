import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadTokenDocument } from '../scripts/lib/load-tokens.mjs';

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
