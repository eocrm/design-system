#!/usr/bin/env node
// Rewrites the generated props table between the props markers in every
// docs/components/<Name>.md. `--check` writes nothing and exits 1 on drift
// or on an issue reference in AI-PRIMER.md / docs/**.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as prettier from 'prettier';
import {
  START,
  END,
  insertBlock,
  unknownTags,
  extractFences,
  withDefault,
} from './component-docs-lib.mjs';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(PKG, 'docs');
const COMPONENT_DOCS = join(DOCS, 'components');
const CHECK = process.argv.includes('--check');

const NO_PROPS = ['Palette', 'useBelowBreakpoint', 'useMonth'];

const TAGS = {
  Canvas: 'canvas',
  DList: 'dl',
  FieldSet: 'fieldset',
  HR: 'hr',
  TableCaption: 'caption',
  TableCell: 'td',
  TableRow: 'tr',
  TableSection: 'tbody',
  Button: 'button',
  Input: 'input',
  TextArea: 'textarea',
  Div: 'div',
  Anchor: 'a',
  Span: 'span',
  Select: 'select',
  Form: 'form',
  Image: 'img',
  Heading: 'h1–h6',
  Paragraph: 'p',
  LI: 'li',
  UList: 'ul',
  OList: 'ol',
  Table: 'table',
  Label: 'label',
  Element: 'element',
};

function fail(message) {
  console.error(message);
  process.exit(2);
}

const configFile = ts.readConfigFile(join(PKG, 'tsconfig.json'), ts.sys.readFile);
const { options } = ts.parseJsonConfigFileContent(configFile.config, ts.sys, PKG);
const program = ts.createProgram([join(PKG, 'src/index.ts')], options);
const checker = program.getTypeChecker();
const moduleSymbol = checker.getSymbolAtLocation(program.getSourceFile(join(PKG, 'src/index.ts')));

const propsTypes = new Map();
for (const exp of checker.getExportsOfModule(moduleSymbol)) {
  if (!exp.name.endsWith('Props')) continue;
  propsTypes.set(exp.name, exp.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exp) : exp);
}

const docNames = readdirSync(COMPONENT_DOCS)
  .filter((f) => f.endsWith('.md'))
  .map((f) => basename(f, '.md'))
  .sort();

const ownerDoc = (typeName) =>
  docNames.filter((d) => typeName.startsWith(d)).sort((a, b) => b.length - a.length)[0];

function typesFor(name) {
  const others = [...propsTypes.keys()]
    .filter((t) => t !== `${name}Props` && ownerDoc(t) === name)
    .sort();
  return [...(propsTypes.has(`${name}Props`) ? [`${name}Props`] : []), ...others];
}

const isNative = (prop) =>
  (prop.declarations ?? []).length > 0 &&
  prop.declarations.every((d) => d.getSourceFile().fileName.includes('/node_modules/'));

const cell = (s) => s.replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|');
const stripIssueRefs = (s) =>
  s.replace(/\s*\(#\d+(?:,\s*#\d+)*\)/g, '').replace(/,\s*#\d+(?=\))/g, '');

const typeText = (t) => checker.typeToString(t, undefined, ts.TypeFormatFlags.NoTruncation);
const LITERAL =
  ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral | ts.TypeFlags.BooleanLiteral;

function literalUnion(t, optional) {
  const u = optional ? checker.getNonNullableType(t) : t;
  if (!u.isUnion() || u.flags & ts.TypeFlags.Boolean || u.types.length > 12) return undefined;
  if (!u.types.every((m) => m.flags & LITERAL)) return undefined;
  const node = u.aliasSymbol?.declarations?.[0]?.type;
  const order = ts.isUnionTypeNode(node ?? {})
    ? node.types.map((n) => checker.getTypeFromTypeNode(n))
    : [];
  const rank = (m) => order.indexOf(m) + 1 || order.length + 1;
  return [...u.types]
    .sort((a, b) => rank(a) - rank(b))
    .map((m) => (m.isStringLiteral() ? `'${m.value}'` : typeText(m)))
    .join(' | ');
}

function renderTable(docName, typeName) {
  const sym = propsTypes.get(typeName);
  const declared = checker.getDeclaredTypeOfSymbol(sym);
  const parts = declared.isUnion() ? declared.types : [declared];
  const merged = new Map();
  for (const part of parts) {
    for (const prop of checker.getPropertiesOfType(part)) {
      const decl = prop.valueDeclaration ?? prop.declarations?.[0] ?? sym.declarations[0];
      const optional = (prop.flags & ts.SymbolFlags.Optional) !== 0;
      let t = checker.getTypeOfSymbolAtLocation(prop, decl);
      if (checker.getNonNullableType(t).flags & ts.TypeFlags.TypeParameter)
        t = checker.getBaseConstraintOfType(checker.getNonNullableType(t)) ?? 'ElementType';
      let type = typeof t === 'string' ? t : (literalUnion(t, optional) ?? typeText(t));
      if (optional) type = type.replace(/ \| undefined\b/g, '').replace(/^undefined \| /, '');
      const doc = ts.displayPartsToString(prop.getDocumentationComment(checker));
      const entry = merged.get(prop.name);
      if (entry) {
        entry.doc ||= doc;
        if (!entry.types.includes(type)) entry.types.push(type);
        entry.required &&= !optional;
        entry.seen += 1;
      } else {
        merged.set(prop.name, { prop, decl, doc, types: [type], required: !optional, seen: 1 });
      }
    }
  }

  const fileOrder = [];
  const rows = [];
  let collapsed = false;
  for (const entry of merged.values()) {
    if (isNative(entry.prop)) {
      collapsed = true;
      continue;
    }
    const file = entry.decl.getSourceFile().fileName;
    if (!fileOrder.includes(file)) fileOrder.push(file);
    rows.push({ ...entry, file, pos: entry.decl.pos });
  }
  rows.sort((a, b) => fileOrder.indexOf(a.file) - fileOrder.indexOf(b.file) || a.pos - b.pos);

  const lines = ['| Prop | Type | Required | Description |', '|---|---|---|---|'];
  const examples = [];
  for (const { prop, doc, types, required, seen } of rows) {
    const tags = prop.getJsDocTags(checker);
    const unknown = unknownTags(tags.map((t) => t.name));
    if (unknown.length)
      fail(`${docName}: prop \`${prop.name}\` has unknown JSDoc tag @${unknown.join(', @')}`);
    const def = tags.find((t) => t.name === 'default');
    const defText = def
      ? ts
          .displayPartsToString(def.text)
          .trim()
          .replace(/^`(.*)`$/, '$1')
      : '';
    const { text, fences } = extractFences(stripIssueRefs(doc));
    for (const fence of fences)
      examples.push(`**\`${prop.name}\`** example:\n\n<!-- prettier-ignore -->\n${fence}`);
    const type = (types.length > 1 ? types.filter((t) => t !== 'undefined') : types)
      .join(' | ')
      .replace(/`/g, "'");
    lines.push(
      `| \`${prop.name}\` | \`${cell(type)}\` | ${required && seen === parts.length ? 'yes' : 'no'} | ${cell(withDefault(text, defText))} |`,
    );
  }
  const declText = sym.declarations[0].getText();
  if (/PolymorphicProps<|ComponentPropsWithoutRef<C>/.test(declText)) {
    const dflt = sym.declarations[0].typeParameters?.[0]?.default;
    const dfltType = dflt && checker.getTypeFromTypeNode(dflt);
    const tag = dfltType?.isStringLiteral() ? ` (default \`<${dfltType.value}>\`)` : '';
    lines.push(`| …native | | | plus native attributes of the \`as\` element${tag} |`);
  } else if (collapsed) {
    const m = declText.match(/HTML(\w+)Element/);
    const native = m ? `native \`<${TAGS[m[1]] ?? m[1]}>\` attributes` : 'native HTML attributes';
    lines.push(`| …native | | | plus ${native} |`);
  }
  return [`<!-- prettier-ignore -->\n${lines.join('\n')}`, ...examples].join('\n\n');
}

const prettierOptions = {
  ...(await prettier.resolveConfig(join(PKG, '..', '..', '.prettierrc.json'), {
    config: join(PKG, '..', '..', '.prettierrc.json'),
  })),
  proseWrap: 'preserve',
  parser: 'markdown',
};

const unresolved = docNames.filter((n) => typesFor(n).length === 0 && !NO_PROPS.includes(n));
if (unresolved.length)
  fail(
    `No exported <Name>Props type for: ${unresolved.join(', ')} — export one or add to NO_PROPS`,
  );
const staleNoProps = NO_PROPS.filter((n) => typesFor(n).length > 0);
if (staleNoProps.length)
  fail(
    `In NO_PROPS but a props type now exists: ${staleNoProps.join(', ')} — remove from NO_PROPS`,
  );

const stale = [];
for (const name of docNames) {
  const types = typesFor(name);
  if (types.length === 0) continue;
  const body =
    types.length === 1
      ? renderTable(name, types[0])
      : types.map((t) => `### \`${t}\`\n\n${renderTable(name, t)}`).join('\n\n');
  const formatted = await prettier.format(`## Props\n\n${body}\n`, prettierOptions);
  const block = `${START}\n\n${formatted}\n${END}`;
  const file = join(COMPONENT_DOCS, `${name}.md`);
  const current = readFileSync(file, 'utf8');
  const next = insertBlock(current, block);
  if (next === current) continue;
  stale.push(file);
  if (!CHECK) writeFileSync(file, next);
}

const ISSUE_REF = /\(#\d+\)|\([^()\n]*#\d{3,}\b[^()\n]*\)|(^|[^&\w])#[0-9]{3,5}\b/m;
const refs = [];
const mdFiles = [
  join(PKG, 'AI-PRIMER.md'),
  ...readdirSync(DOCS, { recursive: true })
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(DOCS, f)),
];
for (const file of mdFiles) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (ISSUE_REF.test(line)) refs.push(`${file}:${i + 1}: ${line.trim()}`);
    });
}

if (CHECK) {
  for (const file of stale) console.log(`stale: ${file}`);
  for (const ref of refs) console.log(`issue reference: ${ref}`);
  process.exit(stale.length || refs.length ? 1 : 0);
}
for (const file of stale) console.log(`wrote ${file}`);
for (const ref of refs) console.log(`issue reference (fix by hand): ${ref}`);
