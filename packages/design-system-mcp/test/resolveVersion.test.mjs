import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { resolveVersion } from '../src/resolveVersion.js';

const fx = (n) => fileURLToPath(new URL(`./fixtures/${n}`, import.meta.url));
const fetchPackument = async () => ({
  'dist-tags': { latest: '0.7.0' },
  versions: Object.fromEntries(
    ['0.6.17', '0.6.18', '0.6.19', '0.6.20', '0.6.21', '0.7.0'].map((v) => [v, {}]),
  ),
});
const run = (n) => resolveVersion(fx(n), { fetchPackument });

for (const [dir, version, source] of [
  ['npm', '0.6.21', 'package-lock.json'],
  ['npm-workspace', '0.6.21', 'package-lock.json'],
  ['pnpm', '0.6.20', 'pnpm-lock.yaml'],
  ['yarn-classic', '0.6.19', 'yarn.lock'],
  ['yarn-berry', '0.6.19', 'yarn.lock'],
  ['bun', '0.6.18', 'bun.lock'],
  ['range-only', '0.6.21', 'package.json range'],
  ['peer-only', '0.6.21', 'package.json range'],
]) {
  test(`resolves ${dir}`, async () => {
    assert.deepEqual(await run(dir), { version, source });
  });
}

for (const dir of ['no-ds', 'does-not-exist']) {
  test(`falls back to latest for ${dir}`, async () => {
    const r = await run(dir);
    assert.equal(r.version, '0.7.0');
    assert.equal(r.source, 'latest');
    assert.match(r.note, /no @eocrm\/design-system dependency found/);
  });
}

test('default packument fetch sends a timeout signal and the abbreviated Accept header', async (t) => {
  let init;
  t.mock.method(globalThis, 'fetch', async (_url, i) => {
    init = i;
    return { ok: true, json: async () => ({ 'dist-tags': { latest: '0.7.0' }, versions: {} }) };
  });
  assert.equal((await resolveVersion(fx('no-ds'))).version, '0.7.0');
  assert.ok(init.signal instanceof AbortSignal);
  assert.equal(init.headers.Accept, 'application/vnd.npm.install-v1+json');
});
