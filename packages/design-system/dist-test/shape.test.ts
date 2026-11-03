import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Contract of the compiled package (`npm run build`): checks what consumers
// actually receive in dist/, not how the build gets there.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');

const read = (file: string) => readFileSync(file, 'utf8');

// Value import/export specifiers; `import type` / `export type` are erased.
const SPECIFIER =
  /(?:^|[\n;])\s*(?:import|export)\s+(?!type[\s{])(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
const specifiers = (code: string) => [...code.matchAll(SPECIFIER)].map((m) => m[1]);

/** Every dist .js module reachable from dist/index.js, with its specifiers. */
function distGraph(): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  const visit = (file: string) => {
    if (graph.has(file)) return;
    const specs = specifiers(read(file));
    graph.set(file, specs);
    for (const spec of specs) {
      if (spec.startsWith('.') && spec.endsWith('.js')) visit(resolve(dirname(file), spec));
    }
  };
  visit(join(dist, 'index.js'));
  return graph;
}

const SRC_EXTS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];
const resolveSrc = (from: string, spec: string) =>
  SRC_EXTS.map((ext) => resolve(dirname(from), spec) + ext).find(existsSync);

/** Every src .ts/.tsx module reachable from src/index.ts via value imports. */
function srcGraph(): Set<string> {
  const seen = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const spec of specifiers(read(file))) {
      if (!spec.startsWith('.') || /\.s?css$/.test(spec)) continue;
      const target = resolveSrc(file, spec);
      if (!target) throw new Error(`unresolved ${spec} from ${relative(src, file)}`);
      visit(target);
    }
  };
  visit(join(src, 'index.ts'));
  return seen;
}

// Barrels and re-export shims have no code of their own; the bundler points
// importers straight at the real module, so they get no dist twin.
const REEXPORT = /export\s+(?:type\s+)?(?:\*|\{[^}]*\})(?:\s+as\s+\w+)?\s+from\s*['"][^'"]+['"];?/g;
const isPureReexport = (file: string) =>
  read(file)
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
    .replace(REEXPORT, '')
    .trim() === '';

const twin = (srcFile: string) => join(dist, relative(src, srcFile).replace(/\.tsx?$/, '.js'));
const isReact = (spec: string) => /^react(-dom)?(\/|$)/.test(spec);
const DIRECTIVE = "'use client';\n";

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

test('every src module reachable from index has a dist .js twin', () => {
  const graph = distGraph();
  for (const [file, specs] of graph) {
    for (const spec of specs.filter((s) => s.startsWith('.'))) {
      expect(existsSync(resolve(dirname(file), spec)), `${spec} from ${file}`).toBe(true);
    }
  }
  const modules = [...srcGraph()].filter((f) => !isPureReexport(f));
  expect(modules.map((f) => relative(src, f))).toContain('components/Button/Button.tsx');
  const missing = modules.map(twin).filter((f) => !graph.has(f));
  expect(missing).toEqual([]);
});

test('no dist module imports node: builtins or ./src paths', () => {
  for (const [file, specs] of distGraph()) {
    for (const spec of specs) expect(spec, file).not.toMatch(/^node:|(^|\/)src\//);
  }
});

test('modules importing react/react-dom start with "use client"', () => {
  const clientModules = [...distGraph()].filter(([, specs]) => specs.some(isReact));
  expect(clientModules.map(([f]) => relative(dist, f))).toContain('components/Button/Button.js');
  for (const [file] of clientModules) {
    expect(read(file).startsWith(DIRECTIVE), file).toBe(true);
  }
});

// A dist module with no code of its own: only imports and export lists.
const isDistReexport = (code: string) =>
  code
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
    .replace(
      /import\s[^;"]*?(?:from\s*)?"[^"]+";|export\s*(?:\*|\{[^}]*\})[^;"]*(?:"[^"]+")?;/g,
      '',
    )
    .trim() === '';

test('modules with own code that import a client module are client modules too', () => {
  // Regression cases: compound components built with `Object.assign` onto a
  // client root, which throws on a client reference in an RSC server graph.
  for (const file of [
    'Modal/Modal.js',
    'Drawer/Drawer.js',
    'DropdownMenu/DropdownMenu.js',
    'Popover/Popover.js',
  ]) {
    expect(read(join(dist, 'components', file)).startsWith(DIRECTIVE), file).toBe(true);
  }
  const isClient = (file: string) => read(file).startsWith(DIRECTIVE);
  for (const [file, specs] of distGraph()) {
    if (isClient(file) || isDistReexport(read(file))) continue;
    const clientDeps = specs
      .filter((s) => s.startsWith('.') && s.endsWith('.js'))
      .filter((s) => isClient(resolve(dirname(file), s)));
    expect(clientDeps, relative(dist, file)).toEqual([]);
  }
});

test('pure modules carry no directive', () => {
  const palette = readdirSync(join(dist, 'palette'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => `palette/${f}`);
  expect(palette).toContain('palette/palette.js');
  for (const file of ['i18n/en.js', 'i18n/ru.js', 'i18n/format.js', 'index.js', ...palette]) {
    expect(read(join(dist, file)), file).not.toMatch(/^\s*['"]use client['"]/);
  }
});

test('every CSS-bearing module imports its css', () => {
  const graph = distGraph();
  const cssBearing = [...srcGraph()].filter((f) =>
    specifiers(read(f)).some((s) => s.endsWith('.module.scss')),
  );
  expect(cssBearing.map((f) => relative(src, f))).toContain('components/Button/Button.tsx');
  for (const file of cssBearing) {
    // The CSS import sits on the dist twin or on the `X.module.js` chunk it
    // imports for the `.module.scss` (whichever owns the CSS).
    const own = twin(file);
    const candidates = [
      own,
      ...(graph.get(own) ?? [])
        .filter((s) => s.endsWith('.module.js'))
        .map((s) => resolve(dirname(own), s)),
    ];
    const cssImports = candidates.flatMap((c) =>
      (graph.get(c) ?? []).filter((s) => s.endsWith('.css')).map((s) => resolve(dirname(c), s)),
    );
    expect(cssImports.length, relative(src, file)).toBeGreaterThan(0);
    for (const css of cssImports) expect(existsSync(css), css).toBe(true);
  }
});

test('declarations exist for index and a component', () => {
  expect(existsSync(join(dist, 'index.d.ts'))).toBe(true);
  expect(existsSync(join(dist, 'components/Button/index.d.ts'))).toBe(true);
});

test('declaration specifiers are explicit (node16/nodenext-resolvable)', () => {
  const RELATIVE = /(?:from\s+|import\(\s*|import\s+)(['"])(\.[^'"]*)\1/g;
  const declarations = walk(dist).filter((f) => f.endsWith('.d.ts'));
  expect(declarations.map((f) => relative(dist, f))).toContain('index.d.ts');
  for (const file of declarations) {
    for (const [, , spec] of read(file).matchAll(RELATIVE)) {
      expect(spec, relative(dist, file)).toMatch(/\.js$/);
      expect(existsSync(resolve(dirname(file), spec.replace(/\.js$/, '.d.ts'))), spec).toBe(true);
    }
  }
});

test('global stylesheets exist and are non-empty', () => {
  const global = read(join(dist, 'styles/global.css'));
  const tokens = read(join(dist, 'styles/tokens.css'));
  const bundle = read(join(dist, 'styles.css'));
  const RESET = /box-sizing:\s*border-box/;

  expect(global).toContain('--color-accent');
  expect(global).toMatch(RESET);
  expect(tokens).toContain('--color-accent');
  expect(tokens).toMatch(/\[data-theme=['"]?dark['"]?\]/);
  expect(tokens).not.toMatch(RESET);
  expect(bundle.startsWith(global)).toBe(true);
  const buttonCss = walk(join(dist, 'components/Button')).find((f) => f.endsWith('.css'));
  expect(buttonCss).toBeDefined();
  expect(bundle).toContain(read(buttonCss!));
});

test('styles.css holds every component css once, in bundler import order', () => {
  const bundle = read(join(dist, 'styles.css'));
  const componentCss = walk(dist).filter(
    (f) =>
      f.endsWith('.css') && !f.startsWith(join(dist, 'styles')) && f !== join(dist, 'styles.css'),
  );
  expect(componentCss.map((f) => relative(dist, f))).toContain('components/Button/Button.css');
  for (const file of componentCss) {
    const css = read(file);
    const at = bundle.indexOf(css);
    expect(at, relative(dist, file)).toBeGreaterThan(-1);
    expect(bundle.indexOf(css, at + 1), relative(dist, file)).toBe(-1);
  }
  // Alert imports Button and sorts before it: a bundler emits the child
  // (Button) first, so Alert's rules win at equal specificity.
  expect(specifiers(read(join(dist, 'components/Alert/Alert.js')))).toContain(
    '../Button/Button.js',
  );
  const pos = (f: string) => bundle.indexOf(read(join(dist, 'components', f)));
  expect(pos('Button/Button.css')).toBeLessThan(pos('Alert/Alert.css'));
});

// Consumer Vite builds tree-shake a bare `import "./X.module.css"` (a CSS module
// with no used export), silently dropping component styles. Ship plain `.css`.
it('ships no *.module.css file and imports none', () => {
  const files = walk(dist);
  expect(files.filter((f) => f.endsWith('.module.css')).map((f) => relative(dist, f))).toEqual([]);
  const offenders = files
    .filter((f) => f.endsWith('.js'))
    .filter((f) => specifiers(read(f)).some((s) => s.endsWith('.module.css')))
    .map((f) => relative(dist, f));
  expect(offenders).toEqual([]);
});
