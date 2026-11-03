#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createDocSource } from './docSource.js';
import { resolveVersion } from './resolveVersion.js';
import { createServer } from './server.js';

const [arg] = process.argv.slice(2);

if (arg === '--version') {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  console.log(pkg.version);
} else if (arg === undefined) {
  const snapshotDir = process.env.EOCRM_DS_MCP_SNAPSHOT_DIR || undefined;
  const docSource = createDocSource({
    offline: process.env.EOCRM_DS_MCP_OFFLINE === '1',
    ...(snapshotDir && { snapshotDir }),
  });
  await createServer({ docSource, resolveVersion, snapshotDir }).connect(
    new StdioServerTransport(),
  );
} else {
  console.error(`Unknown argument "${arg}". Usage: design-system-mcp [--version]`);
  process.exit(1);
}
