import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SNAPSHOT_DIR } from './docSource.js';
import { INSTRUCTIONS } from './instructions.js';
import { createTools } from './tools.js';

const PKG = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const ROOTS_TIMEOUT_MS = 2000;

/**
 * @param {{
 *   docSource: ReturnType<typeof import('./docSource.js').createDocSource>,
 *   resolveVersion: typeof import('./resolveVersion.js').resolveVersion,
 *   cwd?: string,
 *   snapshotDir?: string,
 * }} opts
 */
export function createServer({
  docSource,
  resolveVersion,
  cwd = process.cwd(),
  snapshotDir = SNAPSHOT_DIR,
}) {
  const server = new McpServer(
    { name: PKG.name, version: PKG.version },
    { instructions: INSTRUCTIONS },
  );

  /** First `file://` client root that has a package.json, else cwd. */
  async function projectDir() {
    if (!server.server.getClientCapabilities()?.roots) return cwd;
    try {
      const { roots } = await server.server.listRoots(undefined, { timeout: ROOTS_TIMEOUT_MS });
      for (const { uri } of roots) {
        if (!uri.startsWith('file://')) continue;
        const dir = fileURLToPath(uri);
        if (
          await access(join(dir, 'package.json')).then(
            () => true,
            () => false,
          )
        )
          return dir;
      }
    } catch {
      // client didn't answer in time: fall back to cwd
    }
    return cwd;
  }

  /** @returns {Promise<{ version: string, source: string, warnings: string[] }>} */
  async function context() {
    try {
      const r = await resolveVersion(await projectDir());
      return { version: r.version, source: r.source, warnings: r.note ? [r.note] : [] };
    } catch (e) {
      const snap = (await readFile(join(snapshotDir, 'VERSION'), 'utf8').catch(() => null))?.trim();
      const reason = e instanceof Error ? e.message : String(e);
      if (!snap)
        throw new Error(
          `could not resolve @eocrm/design-system version (${reason}) and no bundled docs are available`,
        );
      return {
        version: snap,
        source: 'bundled snapshot',
        warnings: [
          `could not resolve @eocrm/design-system version (${reason}); serving bundled ${snap}`,
        ],
      };
    }
  }

  /** Wrap a tool body with the version header + warnings. */
  const handler =
    (/** @type {(tools: ReturnType<typeof createTools>, args: any) => Promise<string>} */ run) =>
    async (/** @type {any} */ args) => {
      try {
        const { version, source, warnings } = await context();
        const warn = (/** @type {string|undefined} */ w) => {
          if (w && !warnings.includes(w)) warnings.push(w);
        };
        const body = await run(createTools(docSource, version, warn), args);
        const header = [
          `@eocrm/design-system@${version} (from ${source})`,
          ...warnings.map((w) => `warning: ${w}`),
        ];
        return {
          content: [
            { type: /** @type {const} */ ('text'), text: `${header.join('\n')}\n\n${body}` },
          ],
        };
      } catch (e) {
        return {
          isError: true,
          content: [
            {
              type: /** @type {const} */ ('text'),
              text: e instanceof Error ? e.message : String(e),
            },
          ],
        };
      }
    };

  server.registerTool(
    'get_primer',
    {
      description:
        'The design-system AI primer: rules, layout model and component overview. Call once per UI task.',
    },
    handler((t) => t.getPrimer()),
  );
  server.registerTool(
    'list_components',
    {
      description:
        'List every design-system component with a one-line summary. Call before choosing components.',
    },
    handler((t) => t.listComponents()),
  );
  server.registerTool(
    'get_component_doc',
    {
      description:
        'Full doc for one component (props, usage, anti-patterns). Call before using it.',
      inputSchema: {
        name: z.string().describe('Component name, e.g. "Button" (case-insensitive)'),
      },
    },
    handler((t, { name }) => t.getComponentDoc(name)),
  );
  server.registerTool(
    'get_doc',
    {
      description:
        'A topic guide from docs/ (e.g. "setup"). An unknown topic lists the available ones.',
      inputSchema: { topic: z.string().describe('Doc file stem, e.g. "setup"') },
    },
    handler((t, { topic }) => t.getDoc(topic)),
  );

  return server;
}
