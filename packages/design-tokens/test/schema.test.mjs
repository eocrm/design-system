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

test('rejects recursively nested themed values', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'eocrm-tokens-schema-'));
  const file = join(dir, 'nested-theme.json');
  const input = validDocument('1.2.3');
  input.tokens[0].value = {
    light: { light: '#000000', dark: '#111111' },
    dark: '#222222',
  };
  await writeFile(file, JSON.stringify(input));

  await assert.rejects(loadTokenDocument(file), /\/tokens\/0\/value/);
});

test('accepts an accents map and rejects malformed accents', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'eocrm-tokens-schema-'));
  const file = join(dir, 'tokens.json');
  const base = validDocument('1.2.3');
  base.tokens[0] = {
    ...base.tokens[0],
    id: 'color.accent',
    value: { light: '#000000', dark: '#ffffff' },
  };
  const withAccents = (accents) => ({ ...base, accents });
  const override = { 'color.accent': { light: '#17736d', dark: '#6dcfc4' } };

  await writeFile(file, JSON.stringify(withAccents({ tealpine: override })));
  await assert.doesNotReject(loadTokenDocument(file));

  await writeFile(file, JSON.stringify(withAccents({ Teal: override })));
  await assert.rejects(loadTokenDocument(file), /accents/);

  await writeFile(file, JSON.stringify(withAccents({ tealpine: 'nope' })));
  await assert.rejects(loadTokenDocument(file), /accents/);
});
