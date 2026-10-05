import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import * as publicApi from './index';

// Semantic public-API contract (#614) — replaces a raw SHA-256 of index.ts.
// Membership, not counts: adding a component must not require editing this.
// Compound components: parts are attached to the exported root (Object.assign),
// so their standalone runtime exports are private. Each member must exist on the root.
const COMPOUND_MEMBERS: Record<string, string[]> = {
  PageHeader: ['Breadcrumb', 'BackButton', 'Aside', 'Title', 'Subtitle', 'Meta', 'Actions'],
  Sortable: ['Item', 'Handle'],
};
const INTENTIONALLY_PRIVATE = new Set([
  ...Object.entries(COMPOUND_MEMBERS).flatMap(([root, members]) =>
    members.map((m) => `${root}/${root}${m}`),
  ),
  'Sortable/SortableItemContext', // internal context shared by the compound parts
  'Sortable/SortableItemContextValue',
  // i18n internals; consumers use the providers/hooks
  ...['LocaleContext', 'I18nContext', 'deepMerge', 'lookupKey', 'en', 'ru'].map((n) => `i18n/${n}`),
]);
// Util modules the barrel deliberately re-exports only a named subset of.
const SELECTIVE_MODULES = new Set([
  './components/DatePicker/utils',
  './components/DateRangePicker/utils',
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

// Every non-test, non-testutil module under _internal/, recursively.
const internalModules = readdirSync(INTERNAL_DIR, { recursive: true })
  .map(String)
  .filter(
    (f) => /\.tsx?$/.test(f) && !/\.test(util)?\.tsx?$/.test(f) && !f.endsWith('.testutil.ts'),
  )
  .map((f) => `./components/_internal/${f}`);

// Name-based check via the compiler: every name (value AND type) exported by a
// module that src/index.ts re-exports from must itself be exported by index.ts.
// Modules are discovered from index.ts's export declarations, so non-component
// barrels (i18n, app, calendar, palette, hooks) are covered too.
// Limit: guards names only, not signatures; a name re-exported from the wrong module still passes.
const INDEX_PATH = resolve(__dirname, 'index.ts');
const program = ts.createProgram([INDEX_PATH], {
  noEmit: true,
  skipLibCheck: true,
  jsx: ts.JsxEmit.ReactJSX,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2022,
  types: [],
});
const checker = program.getTypeChecker();
const indexFile = program.getSourceFile(INDEX_PATH)!;
const indexNames = new Set(
  checker.getExportsOfModule(checker.getSymbolAtLocation(indexFile)!).map((s) => s.name),
);
const reexportedModules = new Map<string, string[]>();
for (const stmt of indexFile.statements) {
  if (!ts.isExportDeclaration(stmt) || !stmt.moduleSpecifier) continue;
  const spec = (stmt.moduleSpecifier as ts.StringLiteral).text;
  const sym = checker.getSymbolAtLocation(stmt.moduleSpecifier);
  if (sym)
    reexportedModules.set(
      spec,
      checker.getExportsOfModule(sym).map((s) => s.name),
    );
}
const exemptName = (spec: string, name: string) => {
  const dir = spec.split('/').pop()!;
  return INTENTIONALLY_PRIVATE.has(`${dir}/${name}`);
};

describe('public API (src/index.ts)', () => {
  it.each([...reexportedModules.keys()].filter((m) => !SELECTIVE_MODULES.has(m)))(
    're-exports every name (values and types) of %s',
    (spec) => {
      const missing = reexportedModules
        .get(spec)!
        .filter((n) => !exemptName(spec, n) && !indexNames.has(n));
      expect(missing, `${spec} exports missing from src/index.ts`).toEqual([]);
    },
  );

  // Discovery from index.ts cannot notice a whole module disappearing, so the
  // non-component public modules are pinned by specifier here.
  it.each(['./i18n', './app', './calendar', './palette', './hooks/useBelowBreakpoint'])(
    'src/index.ts still re-exports %s',
    (spec) => {
      expect([...reexportedModules.keys()]).toContain(spec);
    },
  );

  it.each(componentDirs)('src/index.ts re-exports components/%s at all', (name) => {
    expect([...reexportedModules.keys()]).toContain(`./components/${name}`);
  });

  it.each(Object.entries(COMPOUND_MEMBERS))('%s exposes its compound members', (root, members) => {
    const exported = (publicApi as Record<string, unknown>)[root] as Record<string, unknown>;
    expect(Object.keys(exported)).toEqual(expect.arrayContaining(members));
  });

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
