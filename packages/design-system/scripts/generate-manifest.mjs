#!/usr/bin/env node
// Regenerate src/components.manifest.json by walking src/components/ and
// extracting cross-component imports. Re-run after adding a new component
// or changing the import graph. The drift test in src/_meta/manifest.test.ts
// fails if the committed JSON doesn't match what this script produces.
//
// Plain Node ESM — the logic is duplicated from src/_meta/manifest.ts in
// pure JavaScript to avoid pulling tsx / ts-node into the build chain for
// a single utility script. If you change one, update the other; the test
// in manifest.test.ts catches drift between the committed JSON and the
// TypeScript implementation.

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = join(__dirname, '..', 'src', 'components');
const OUTPUT_PATH = join(__dirname, '..', 'src', 'components.manifest.json');

const CLUSTERS = {
  // Layout
  Stack: 'Layout',
  Cluster: 'Layout',
  Divider: 'Layout',
  Grid: 'Layout',
  Card: 'Layout',
  PageHeader: 'Layout',

  // Forms
  Button: 'Forms',
  ButtonGroup: 'Forms',
  Checkbox: 'Forms',
  ColorPicker: 'Forms',
  DatePicker: 'Forms',
  DatePickers: 'Forms',
  DateRangePicker: 'Forms',
  FileUpload: 'Forms',
  ImageCrop: 'Forms',
  Input: 'Forms',
  Kanban: 'Forms',
  PasswordInput: 'Forms',
  PasswordStrengthMeter: 'Forms',
  Radio: 'Forms',
  OptionsPicker: 'Forms',
  Select: 'Forms',
  Slider: 'Forms',
  Sortable: 'Forms',
  Switch: 'Forms',
  Textarea: 'Forms',

  // Display
  Avatar: 'Display',
  Badge: 'Display',
  Calendar: 'Display',
  DefinitionList: 'Display',
  CircularProgress: 'Display',
  Code: 'Display',
  CursorPagination: 'Display',
  DataTable: 'Display',
  EmptyState: 'Display',
  Pagination: 'Display',
  Progress: 'Display',
  Skeleton: 'Display',
  Table: 'Display',
  Text: 'Display',
  Title: 'Display',

  // Feedback
  Alert: 'Feedback',
  Toast: 'Feedback',

  // Navigation
  Accordion: 'Navigation',
  Breadcrumb: 'Navigation',
  Link: 'Navigation',
  Tabs: 'Navigation',

  // Overlays
  ConfirmationPopover: 'Overlays',
  Drawer: 'Overlays',
  DropdownMenu: 'Overlays',
  Modal: 'Overlays',
  Popover: 'Overlays',
  Tooltip: 'Overlays',
};

const FROM_PARENT_PATH = /from\s+['"]\.\.\/([A-Z][a-zA-Z0-9]+)(?:\/[^'"]*)?['"]/g;

function listComponentDirs() {
  return readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .sort();
}

function collectSourceText(componentDir) {
  const files = readdirSync(componentDir).filter((f) => {
    if (!f.endsWith('.tsx') && !f.endsWith('.ts')) return false;
    if (f.endsWith('.test.tsx') || f.endsWith('.test.ts')) return false;
    return statSync(join(componentDir, f)).isFile();
  });
  return files.map((f) => readFileSync(join(componentDir, f), 'utf-8')).join('\n');
}

function extractParentImports(source) {
  const deps = new Set();
  for (const match of source.matchAll(FROM_PARENT_PATH)) {
    deps.add(match[1]);
  }
  return [...deps];
}

function buildManifest() {
  const names = listComponentDirs();
  const known = new Set(names);
  const manifest = {};
  for (const name of names) {
    const dir = join(COMPONENTS_DIR, name);
    const src = collectSourceText(dir);
    const imports = extractParentImports(src)
      .filter((n) => known.has(n) && n !== name)
      .sort();
    manifest[name] = {
      tier: imports.length === 0 ? 'primitive' : 'composition',
      cluster: CLUSTERS[name] ?? null,
      composes: imports,
      composedBy: [],
    };
  }
  for (const [name, entry] of Object.entries(manifest)) {
    for (const dep of entry.composes) {
      const target = manifest[dep];
      if (target) {
        target.composedBy.push(name);
      }
    }
  }
  for (const entry of Object.values(manifest)) {
    entry.composedBy.sort();
  }
  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  );
  return sorted;
}

const manifest = buildManifest();
const output = JSON.stringify(manifest, null, 2) + '\n';
writeFileSync(OUTPUT_PATH, output);

const counts = Object.values(manifest).reduce(
  (acc, entry) => {
    acc[entry.tier] += 1;
    return acc;
  },
  { primitive: 0, composition: 0 },
);
// eslint-disable-next-line no-console
console.log(
  `components.manifest.json regenerated — ${Object.keys(manifest).length} components ` +
    `(${counts.primitive} primitives, ${counts.composition} compositions).`,
);
