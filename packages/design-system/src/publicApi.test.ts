import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as publicApi from './index';

// Semantic public-API contract (#614) — replaces a raw SHA-256 of index.ts.
// Membership, not counts: adding a component must not require editing this.
// Component-index runtime exports deliberately absent from the barrel.
const INTENTIONALLY_PRIVATE = new Set([
  // Compound sub-parts: reached via PageHeader.* / Sortable.* members of the exported root.
  'PageHeader/PageHeaderBreadcrumb',
  'PageHeader/PageHeaderBackButton',
  'PageHeader/PageHeaderAside',
  'PageHeader/PageHeaderTitle',
  'PageHeader/PageHeaderSubtitle',
  'PageHeader/PageHeaderMeta',
  'PageHeader/PageHeaderActions',
  'Sortable/SortableHandle',
  'Sortable/SortableItem',
  'Sortable/SortableItemContext', // internal context for the compound parts
]);
// _internal names a public module exports on purpose: timeUtils is a shim over
// DatePicker/utils (resolveHourCycle, roundTimeToStep) and formatTime is calendar's own.
const INTERNAL_NAME_ALSO_PUBLIC = new Set(['formatTime', 'resolveHourCycle', 'roundTimeToStep']);
const COMPONENTS_DIR = resolve(__dirname, 'components');
const INTERNAL_DIR = resolve(COMPONENTS_DIR, '_internal');
const componentDirs = readdirSync(COMPONENTS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== '_internal')
  .map((d) => d.name)
  .filter((name) => existsSync(resolve(COMPONENTS_DIR, name, 'index.ts')));

// Non-test, non-testutil modules directly in _internal/ plus the overlay barrel.
const internalModules = [
  ...readdirSync(INTERNAL_DIR)
    .filter(
      (f) => /\.tsx?$/.test(f) && !/\.test(util)?\.tsx?$/.test(f) && !f.endsWith('.testutil.ts'),
    )
    .map((f) => `./components/_internal/${f}`),
  './components/_internal/overlay/index.ts',
];

describe('public API (src/index.ts)', () => {
  it.each(componentDirs)('re-exports every runtime export of components/%s', async (name) => {
    const mod = (await import(`./components/${name}/index.ts`)) as Record<string, unknown>;
    const runtime = Object.keys(mod);
    expect(runtime.length).toBeGreaterThan(0);
    const missing = runtime.filter(
      (key) => !INTENTIONALLY_PRIVATE.has(`${name}/${key}`) && !(key in publicApi),
    );
    expect(missing, `${name} exports missing from src/index.ts`).toEqual([]);
  });

  it('does not export internal helpers', () => {
    expect(publicApi).not.toHaveProperty('WidgetShape');
  });

  it.each(internalModules)('does not leak runtime exports of %s', async (path) => {
    const mod = (await import(path)) as Record<string, unknown>;
    const leaked = Object.keys(mod).filter(
      (k) => !INTERNAL_NAME_ALSO_PUBLIC.has(k) && k in publicApi,
    );
    expect(leaked, `_internal exports leaked from src/index.ts`).toEqual([]);
  });
});
