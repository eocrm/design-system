import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createDocSource } from '../src/docSource.js';

const snapshotDir = fileURLToPath(new URL('./fixtures/snapshot', import.meta.url));
const P = 'docs/components/Button.md';
const res = (status, body = '') => ({ status, ok: status < 400, text: async () => body });

/** @param {(url: string) => any} handler */
function setup(handler) {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    const r = handler(url);
    if (r instanceof Error) throw r;
    return r;
  };
  return { calls, fetch };
}
const mk = async (fetch, extra = {}) =>
  createDocSource({
    cacheDir: await mkdtemp(join(tmpdir(), 'dsc-')),
    snapshotDir,
    fetch,
    ...extra,
  });

test('jsDelivr hit is cached; second call does not fetch', async () => {
  const { calls, fetch } = setup(() => res(200, 'remote'));
  const src = await mk(fetch);
  assert.deepEqual(await src.readFile('0.6.17', P), { text: 'remote', servedVersion: '0.6.17' });
  assert.equal(calls[0], `https://cdn.jsdelivr.net/npm/@eocrm/design-system@0.6.17/${P}`);
  await src.readFile('0.6.17', P);
  assert.equal(calls.length, 1);
});

test('jsDelivr 5xx falls back to unpkg', async () => {
  const { calls, fetch } = setup((u) => (u.includes('jsdelivr') ? res(503) : res(200, 'unpkg')));
  const r = await (await mk(fetch)).readFile('0.6.17', P);
  assert.equal(r.text, 'unpkg');
  assert.equal(calls[1], `https://unpkg.com/@eocrm/design-system@0.6.17/${P}`);
});

test('both fail, cache miss: snapshot with warning', async () => {
  const { fetch } = setup(() => new Error('offline'));
  const r = await (await mk(fetch)).readFile('0.6.17', P);
  assert.equal(r.text, '# Button snapshot\n');
  assert.equal(r.servedVersion, '0.6.21');
  assert.match(r.warning, /bundled 0\.6\.21/);
  assert.match(r.warning, /requested 0\.6\.17 unavailable offline/);
});

test('both fail, cache hit: cache, no warning', async () => {
  let fail = false;
  const { fetch } = setup(() => (fail ? new Error('offline') : res(200, 'remote')));
  const src = await mk(fetch);
  await src.readFile('0.6.17', P);
  fail = true;
  assert.deepEqual(await src.readFile('0.6.17', P), { text: 'remote', servedVersion: '0.6.17' });
});

test('jsDelivr 404 then unpkg 200 returns unpkg text', async () => {
  const { fetch } = setup((u) => (u.includes('jsdelivr') ? res(404) : res(200, 'unpkg')));
  assert.equal((await (await mk(fetch)).readFile('0.6.17', P)).text, 'unpkg');
});

test('listFiles 404 falls back to snapshot with warning', async () => {
  const { fetch } = setup(() => res(404));
  const r = await (await mk(fetch)).listFiles('0.6.17');
  assert.ok(r.files.includes(P));
  assert.match(r.warning, /bundled 0\.6\.21/);
});

test('unwritable cache still returns fetched text', async () => {
  const { fetch } = setup(() => res(200, 'remote'));
  const dir = await mkdtemp(join(tmpdir(), 'dsc-'));
  const cacheDir = join(dir, 'file');
  await writeFile(cacheDir, 'x');
  const src = createDocSource({ cacheDir, snapshotDir, fetch });
  assert.equal((await src.readFile('0.6.17', P)).text, 'remote');
});

test('rejects bad version and path without fetching or reading', async () => {
  const { calls, fetch } = setup(() => res(200, 'remote'));
  const src = await mk(fetch);
  for (const off of [false, true]) {
    const s = off ? await mk(fetch, { offline: true }) : src;
    assert.equal((await s.readFile('../../etc', P)).text, null);
    assert.deepEqual((await s.listFiles('../../etc')).files, []);
    for (const p of ['../x', '/etc/passwd', 'docs\\..\\..\\x', 'docs/../../x'])
      assert.equal((await s.readFile('0.6.17', p)).text, null, p);
  }
  assert.equal(calls.length, 0);
});

test('404 gives null text, no snapshot fallback', async () => {
  const { fetch } = setup(() => res(404));
  assert.deepEqual(await (await mk(fetch)).readFile('0.6.17', P), {
    text: null,
    servedVersion: '0.6.17',
  });
});

test('listFiles parses jsDelivr flat listing', async () => {
  const body = JSON.stringify({
    files: [{ name: '/docs/components/Button.md' }, { name: '/dist/index.js' }],
  });
  const { calls, fetch } = setup(() => res(200, body));
  const r = await (await mk(fetch)).listFiles('0.6.17');
  assert.deepEqual(r, { files: [P], servedVersion: '0.6.17' });
  assert.equal(
    calls[0],
    'https://data.jsdelivr.com/v1/packages/npm/@eocrm/design-system@0.6.17?structure=flat',
  );
});

test('listFiles falls back to snapshot files.json with warning', async () => {
  const { fetch } = setup(() => new Error('offline'));
  const r = await (await mk(fetch)).listFiles('0.6.17');
  assert.ok(r.files.includes(P));
  assert.match(r.warning, /bundled 0\.6\.21/);
});

test('offline: never fetches, serves snapshot', async () => {
  const { calls, fetch } = setup(() => res(200, 'remote'));
  const src = await mk(fetch, { offline: true });
  const r = await src.readFile('0.6.17', P);
  assert.equal(r.text, '# Button snapshot\n');
  assert.match(r.warning, /requested 0\.6\.17 unavailable offline/);
  assert.equal((await src.readFile('0.6.21', P)).warning, undefined);
  assert.ok((await src.listFiles('0.6.21')).files.includes(P));
  assert.equal(calls.length, 0);
});
