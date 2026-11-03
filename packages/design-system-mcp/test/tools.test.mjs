import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ListRootsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { INSTRUCTIONS } from '../src/instructions.js';
import { createServer } from '../src/server.js';

const snapshotDir = fileURLToPath(new URL('./fixtures/snapshot', import.meta.url));
const npmFixture = fileURLToPath(new URL('./fixtures/npm', import.meta.url));

const NEW = {
  'AI-PRIMER.md': '# Primer',
  'docs/setup.md': '# Setup',
  'docs/theming.md': '# Theming',
  'docs/components/Button.md': '# Button doc',
  'docs/components/DataTable.md': '# DataTable doc',
  'docs/components/Dialog.md': '# Dialog doc',
  'docs/components/index.json': JSON.stringify([
    { name: 'Button', summary: 'Clickable action', cluster: 'actions' },
    { name: 'DataTable', summary: 'Tabular data', cluster: 'data' },
    { name: 'Dialog', summary: 'Modal', cluster: 'overlays' },
  ]),
};
const OLD = Object.fromEntries(
  Object.entries(NEW).filter(([k]) => k !== 'docs/components/index.json'),
);

/** Stub docSource over an in-memory file map. */
const stubDocSource = (files, warning) => ({
  async readFile(version, path) {
    return { text: files[path] ?? null, servedVersion: version, ...(warning && { warning }) };
  },
  async listFiles(version) {
    return { files: Object.keys(files), servedVersion: version };
  },
});

async function connect({ files = NEW, resolveVersion, warning, roots } = {}) {
  const calls = [];
  const server = createServer({
    docSource: stubDocSource(files, warning),
    resolveVersion:
      resolveVersion ??
      (async (dir) => {
        calls.push(dir);
        return { version: '0.7.0', source: 'package-lock.json' };
      }),
    cwd: '/fallback-cwd',
    snapshotDir,
  });
  const client = new Client(
    { name: 't', version: '0' },
    roots ? { capabilities: { roots: {} } } : {},
  );
  if (roots) client.setRequestHandler(ListRootsRequestSchema, roots);
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  const call = async (name, args = {}) => {
    const r = await client.callTool({ name, arguments: args });
    return { text: r.content[0].text, isError: r.isError };
  };
  return { call, calls };
}

const HEADER = '@eocrm/design-system@0.7.0 (from package-lock.json)';

test('every tool starts with the version header', async () => {
  const { call } = await connect();
  for (const [name, args] of [
    ['get_primer', {}],
    ['list_components', {}],
    ['get_component_doc', { name: 'Button' }],
    ['get_doc', { topic: 'setup' }],
  ]) {
    assert.equal((await call(name, args)).text.split('\n')[0], HEADER, name);
  }
});

test('get_primer returns AI-PRIMER.md', async () => {
  const { call } = await connect();
  assert.match((await call('get_primer')).text, /# Primer/);
});

test('get_component_doc matches case-insensitively', async () => {
  const { call } = await connect();
  assert.match((await call('get_component_doc', { name: 'button' })).text, /# Button doc/);
});

test('get_component_doc miss lists closest names', async () => {
  const { call } = await connect();
  const { text } = await call('get_component_doc', { name: 'DataTabel' });
  assert.match(text, /No component "DataTabel"\. Closest: DataTable/);
});

test('get_component_doc never builds a path from raw input', async () => {
  const { call } = await connect();
  const { text } = await call('get_component_doc', { name: '../../AI-PRIMER' });
  assert.match(text, /No component/);
  assert.doesNotMatch(text, /# Primer/);
});

test('list_components uses index.json summaries', async () => {
  const { call } = await connect();
  assert.match(
    (await call('list_components')).text,
    /- \*\*Button\*\* — Clickable action \(actions\)/,
  );
});

test('list_components tolerates malformed index entries', async () => {
  const { call } = await connect({
    files: {
      ...NEW,
      'docs/components/index.json': JSON.stringify([
        { name: 'Button', cluster: 'actions' },
        { summary: 'nameless' },
        null,
        { name: 'Dialog', summary: 'Modal' },
      ]),
    },
  });
  const body = (await call('list_components')).text.split('\n\n')[1];
  assert.equal(body, '- **Button** (actions)\n- **Dialog** — Modal');
});

test('list_components on an old version without index.json', async () => {
  const { call } = await connect({ files: OLD });
  const { text } = await call('list_components');
  assert.match(text, /- \*\*DataTable\*\*/);
  assert.match(text, /summaries unavailable for 0\.7\.0; upgrade the DS/);
});

test('get_doc serves a top-level topic and lists topics on a miss', async () => {
  const { call } = await connect();
  assert.match((await call('get_doc', { topic: 'Setup' })).text, /# Setup/);
  const { text } = await call('get_doc', { topic: 'nope' });
  assert.match(text, /setup/);
  assert.match(text, /theming/);
});

test('docSource warning appears after the header', async () => {
  const { call } = await connect({ warning: 'using bundled 0.6.21 docs' });
  const lines = (await call('get_primer')).text.split('\n');
  assert.equal(lines[0], HEADER);
  assert.match(lines[1], /using bundled 0\.6\.21 docs/);
});

test('resolveVersion failure falls back to the bundled snapshot version', async () => {
  const { call } = await connect({
    resolveVersion: async () => {
      throw new Error('offline');
    },
  });
  const { text, isError } = await call('get_primer');
  const lines = text.split('\n');
  assert.ok(!isError);
  assert.match(lines[0], /^@eocrm\/design-system@0\.6\.21 \(from /);
  assert.match(
    lines[1],
    /could not resolve @eocrm\/design-system version \(offline\); serving bundled 0\.6\.21/,
  );
});

test('resolveVersion failure with no snapshot is a tool error, not a crash', async () => {
  const server = createServer({
    docSource: stubDocSource(NEW),
    resolveVersion: async () => {
      throw new Error('offline');
    },
    cwd: '/x',
    snapshotDir: '/nonexistent',
  });
  const client = new Client({ name: 't', version: '0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  const r = await client.callTool({ name: 'get_primer', arguments: {} });
  assert.equal(r.isError, true);
  assert.match(r.content[0].text, /could not resolve/);
});

test('project dir: first file:// root with package.json, else cwd', async () => {
  const withRoots = await connect({
    roots: async () => ({
      roots: [
        { uri: 'file://remote-host/share' }, // fileURLToPath throws: non-local host
        { uri: 'file:///definitely/missing' },
        { uri: `file://${npmFixture}` },
      ],
    }),
  });
  await withRoots.call('get_primer');
  assert.equal(withRoots.calls[0], npmFixture);

  const noRoots = await connect();
  await noRoots.call('get_primer');
  assert.equal(noRoots.calls[0], '/fallback-cwd');
});

test('INSTRUCTIONS is under 1 KB', () => {
  assert.ok(Buffer.byteLength(INSTRUCTIONS) < 1024);
  assert.match(INSTRUCTIONS, /get_primer/);
});
