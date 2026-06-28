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

/** Build the manifest for every component that exports `<Name>Props`. */
export function extractProps() {
  const names = componentDirs();
  const rootNames = names.map((n) => join(COMPONENTS_DIR, n, 'index.ts'));
  const program = ts.createProgram(rootNames, COMPILER_OPTIONS);
  const checker = program.getTypeChecker();

  const manifest = {};

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
    manifest[name] = {
      props: props.map(({ order, ...rest }) => rest),
    };
  }

  return manifest;
}
