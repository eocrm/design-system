// extract-props.mjs — read each design-system component's public `<Name>Props`
// type (and its JSDoc) into a flat props manifest the playground renders as the
// "API" table at the bottom of every demo page.
//
// Source of truth is the component's own TypeScript + JSDoc (Rule 7 guarantees
// it's complete), so the table can never drift from the shipped API. Inherited
// DOM/React attributes are filtered out — only props *declared in the library
// source* show up, which is exactly the component-specific surface.
//
// Consumed by the Vite plugin in vite.config.ts (regenerates on every dev/build)
// and by `npm run build:props`. Pure read; no dependency on a running app.
import ts from 'typescript';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DS_SRC = resolve(__dirname, '..', '..', 'design-system', 'src');
const COMPONENTS_DIR = join(DS_SRC, 'components');
const ROOT_INDEX = join(DS_SRC, 'index.ts');

// Cap on an expanded alias definition we'll surface in the API table — keeps a
// pathological generic from dumping a wall of text into a chip.
const MAX_EXPANSION_LENGTH = 200;

/** Compiler options mirroring tsconfig.base.json (enough to resolve types). */
const COMPILER_OPTIONS = {
  target: ts.ScriptTarget.ES2022,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  strict: true,
  esModuleInterop: true,
  skipLibCheck: true,
  resolveJsonModule: true,
  noEmit: true,
};

/** Component directories that expose an `index.ts` barrel. */
function componentDirs() {
  return readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => {
      try {
        return statSync(join(COMPONENTS_DIR, name, 'index.ts')).isFile();
      } catch {
        return false;
      }
    })
    .sort();
}

function isLibrarySourceFile(fileName) {
  return fileName.includes('/design-system/src/') && !fileName.endsWith('.d.ts');
}

/** Strip the `| undefined` an optional prop's resolved type carries — the
 * `required` flag already conveys optionality, so it's pure noise in the table. */
function cleanTypeText(text) {
  return text.replace(/\s*\|\s*undefined\b/g, '').trim();
}

/**
 * The documented default for a prop. Prefers an explicit `@default` JSDoc tag;
 * falls back to the codebase's prose convention of marking the default option
 * inline, e.g. `` `primary` (default) `` or `` `md` (32px, default) ``.
 */
function documentedDefault(symbol, checker, description) {
  const tag = symbol
    .getJsDocTags(checker)
    .find((t) => t.name === 'default' || t.name === 'defaultValue');
  if (tag) {
    return ts
      .displayPartsToString(tag.text)
      .trim()
      .replace(/^[`'"]|[`'"]$/g, '');
  }
  // `<token>` immediately followed by a parenthetical that contains "default".
  const match = description.match(/`([^`]+)`\s*\([^)]*\bdefault\b[^)]*\)/i);
  return match ? match[1] : '';
}

/** typeToString that keeps named aliases (`Block[]`, not the expanded blob). */
function aliasedTypeText(type, checker, node) {
  return cleanTypeText(
    checker.typeToString(
      type,
      node,
      ts.TypeFormatFlags.NoTruncation |
        ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
        ts.TypeFormatFlags.InTypeAlias,
    ),
  );
}

/** `{ a: string; b?: T }` for an interface / object type, one level deep. */
function objectShape(type, checker) {
  const props = type.getProperties();
  if (props.length === 0) return '';
  const parts = props.map((p) => {
    const decl = p.valueDeclaration ?? p.declarations?.[0];
    const pt = decl
      ? checker.getTypeOfSymbolAtLocation(p, decl)
      : checker.getDeclaredTypeOfSymbol(p);
    const optional = p.flags & ts.SymbolFlags.Optional ? '?' : '';
    return `${p.getName()}${optional}: ${aliasedTypeText(pt, checker, decl)}`;
  });
  return `{ ${parts.join('; ')} }`;
}

/**
 * Map of every public type (e.g. `DividerOrientation`, `RichDoc`) to its expanded
 * definition, read from the package's root barrel — so the API table can expand it
 * inline on click. Unions/aliases expand to their members (`"horizontal" | "vertical"`)
 * via `typeToString` without the alias-preserving flag; interfaces / nominal object
 * types (which print as their own name) expand to a one-level shape (`{ blocks: Block[] }`).
 */
function extractTypeAliases(program, checker) {
  const types = {};
  const rootIndex = program.getSourceFile(ROOT_INDEX);
  const rootModule = rootIndex && checker.getSymbolAtLocation(rootIndex);
  if (!rootModule) return types;

  for (const exp of checker.getExportsOfModule(rootModule)) {
    let sym = exp;
    if (sym.flags & ts.SymbolFlags.Alias) {
      try {
        sym = checker.getAliasedSymbol(sym);
      } catch {
        continue;
      }
    }
    if (!(sym.flags & ts.SymbolFlags.TypeAlias) && !(sym.flags & ts.SymbolFlags.Interface)) {
      continue;
    }

    const name = exp.getName();
    let declared;
    try {
      declared = checker.getDeclaredTypeOfSymbol(sym);
    } catch {
      continue;
    }
    // Aliases (unions, primitives) expand here; an interface / nominal object prints
    // as its own name, so fall back to building its shape from its properties.
    let expansion = cleanTypeText(
      checker.typeToString(
        declared,
        undefined,
        ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.InTypeAlias,
      ),
    );
    if (expansion === name) expansion = objectShape(declared, checker);

    if (expansion && expansion !== name && expansion.length <= MAX_EXPANSION_LENGTH) {
      types[name] = expansion;
    }
  }
  return types;
}

/**
 * Build the manifest: `{ components, types }`. `components[Name].props` is the prop
 * table; `types` maps public type-alias names appearing in those prop types to
 * their expanded definitions (for click-to-expand in the API table).
 */
export function extractProps() {
  const names = componentDirs();
  const rootNames = [...names.map((n) => join(COMPONENTS_DIR, n, 'index.ts')), ROOT_INDEX];
  const program = ts.createProgram(rootNames, COMPILER_OPTIONS);
  const checker = program.getTypeChecker();

  const components = {};

  for (const name of names) {
    const indexPath = join(COMPONENTS_DIR, name, 'index.ts');
    const sourceFile = program.getSourceFile(indexPath);
    if (!sourceFile) continue;

    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) continue;

    const exports = checker.getExportsOfModule(moduleSymbol);
    const propsSymbol = exports.find((s) => s.getName() === `${name}Props`);
    if (!propsSymbol) continue;

    const type = checker.getDeclaredTypeOfSymbol(propsSymbol);
    const members = type.getApparentProperties();

    const props = [];
    for (const member of members) {
      const decls = member.getDeclarations() ?? [];
      // Keep only props authored in the library source — drops the hundreds of
      // inherited HTMLAttributes/DOMAttributes members from lib.dom.d.ts.
      const ownDecl = decls.find((d) => isLibrarySourceFile(d.getSourceFile().fileName));
      if (!ownDecl) continue;

      const propType = checker.getTypeOfSymbolAtLocation(member, ownDecl);
      const typeText = cleanTypeText(
        checker.typeToString(
          propType,
          ownDecl,
          ts.TypeFormatFlags.NoTruncation |
            ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
            ts.TypeFormatFlags.InTypeAlias,
        ),
      );
      const description = ts.displayPartsToString(member.getDocumentationComment(checker)).trim();

      props.push({
        name: member.getName(),
        type: typeText,
        required: (member.flags & ts.SymbolFlags.Optional) === 0,
        default: documentedDefault(member, checker, description),
        description,
        // Source position so we can present props in authored order.
        order: ownDecl.getStart(),
      });
    }

    if (props.length === 0) continue;
    props.sort((a, b) => a.order - b.order);
    components[name] = {
      props: props.map(({ order, ...rest }) => rest),
    };
  }

  // Only keep aliases that actually appear in some prop's type — no point shipping
  // expansions the table will never reference.
  const referenced = new Set();
  for (const c of Object.values(components)) {
    for (const p of c.props) {
      for (const id of p.type.match(/[A-Za-z_$][\w$]*/g) ?? []) referenced.add(id);
    }
  }
  const allTypes = extractTypeAliases(program, checker);
  const types = {};
  for (const [name, expansion] of Object.entries(allTypes)) {
    if (referenced.has(name)) types[name] = expansion;
  }

  return { components, types };
}
