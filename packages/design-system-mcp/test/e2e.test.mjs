import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const snapshotDir = fileURLToPath(new URL('./fixtures/snapshot', import.meta.url));
// Lockfile pins 0.6.21 (= snapshot VERSION), so no network is needed.
const cwd = fileURLToPath(new URL('./fixtures/npm', import.meta.url));

test('stdio server end to end (offline, no roots)', async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cli],
    cwd,
    env: { ...process.env, EOCRM_DS_MCP_OFFLINE: '1', EOCRM_DS_MCP_SNAPSHOT_DIR: snapshotDir },
    stderr: 'ignore',
  });
  const client = new Client({ name: 'e2e', version: '0' });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), [
      'get_component_doc',
      'get_doc',
      'get_primer',
      'list_components',
    ]);
    assert.equal(client.getServerVersion()?.name, '@eocrm/design-system-mcp');
    assert.match(client.getInstructions() ?? '', /get_primer/);

    const r = await client.callTool({ name: 'get_component_doc', arguments: { name: 'Button' } });
    const text = r.content[0].text;
    assert.match(text, /^@eocrm\/design-system@0\.6\.21 \(from package-lock\.json\)\n/);
    assert.match(text, /# Button snapshot/);
  } finally {
    await client.close();
  }
});
