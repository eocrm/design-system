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

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = join(__dirname, '..', 'src', 'components');
const OUTPUT_PATH = join(__dirname, '..', 'src', 'components.manifest.json');

const CLUSTERS = {
  // Layout
  Stack: 'Layout',
  Cluster: 'Layout',
  Constrain: 'Layout',
  Indent: 'Layout',
  AppLayout: 'Layout',
  Divider: 'Layout',
  Grid: 'Layout',
  Split: 'Layout',
  Sticky: 'Layout',
  Masonry: 'Layout',
  Card: 'Layout',
  Page: 'Layout',
  Screen: 'Layout',
  PageHeader: 'Layout',

  // Forms
  Button: 'Forms',
  SocialButton: 'Forms',
  ButtonGroup: 'Forms',
  Checkbox: 'Forms',
  ColorPicker: 'Forms',
  DatePicker: 'Forms',
  DatePickers: 'Forms',
  DateRangePicker: 'Forms',
  Field: 'Forms',
  FormRow: 'Forms',
  FormSection: 'Forms',
  FileUpload: 'Forms',
  IconPicker: 'Forms',
  ImageCrop: 'Forms',
  Input: 'Forms',
  Kanban: 'Forms',
  LiquidEditor: 'Forms',
  PasswordInput: 'Forms',
  PasswordStrengthMeter: 'Forms',
  PhoneInput: 'Forms',
  Radio: 'Forms',
  OptionsPicker: 'Forms',
  EmojiPicker: 'Forms',
  Select: 'Forms',
  Slider: 'Forms',
  Sortable: 'Forms',
  SortableGroup: 'Forms',
  StatusMenu: 'Forms',
  Switch: 'Forms',
  RichTextEditor: 'Forms',
  Textarea: 'Forms',
  TimeField: 'Forms',

  // Display
  Avatar: 'Display',
  Image: 'Display',
  MediaTile: 'Display',
  Badge: 'Display',
  Dot: 'Display',
  EntityChip: 'Display',
  Timeline: 'Display',
  Thread: 'Display',
  BrandIcon: 'Display',
  Logo: 'Display',
  Calendar: 'Display',
  DefinitionList: 'Display',
  CircularProgress: 'Display',
  Code: 'Display',
  CursorPagination: 'Display',
  DashboardCanvas: 'Display',
  DataTable: 'Display',
  EmptyState: 'Display',
  ErrorState: 'Display',
  IconTile: 'Display',
  FilterChip: 'Display',
  FlowCanvas: 'Display',
  Kbd: 'Display',
  Pagination: 'Display',
  PersonDisplay: 'Display',
  Progress: 'Display',
  Skeleton: 'Display',
  Table: 'Display',
  RichText: 'Display',
  Text: 'Display',
  Title: 'Display',

  // Feedback
  Alert: 'Feedback',
  Toast: 'Feedback',

  // Navigation
  Accordion: 'Navigation',
  Breadcrumb: 'Navigation',
  Link: 'Navigation',
  LinkCard: 'Navigation',
  Rail: 'Navigation',
  Tabs: 'Navigation',
  TopBar: 'Navigation',

  // Overlays
  ConfirmationPopover: 'Overlays',
  Drawer: 'Overlays',
  DropdownMenu: 'Overlays',
  Lightbox: 'Overlays',
  Modal: 'Overlays',
  Popover: 'Overlays',
  Tooltip: 'Overlays',
};

// `(?:\.\./)+`, not a single `../`, since #509 — the other half of the flat-walk
// bug. Once nested files are read, their imports sit one level deeper.
const FROM_PARENT_PATH = /from\s+['"](?:\.\.\/)+([A-Z][a-zA-Z0-9]+)(?:\/[^'"]*)?['"]/g;

function listComponentDirs() {
  return readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .sort();
}

// Kept in sync with src/_meta/manifest.ts, deliberately. Recursive since #509:
// the flat readdir never reached RichText/engine/, so 20 modules and the
// imports in them were invisible to the graph.
function collectSourceText(componentDir) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (
        (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) &&
        !entry.name.endsWith('.test.tsx') &&
        !entry.name.endsWith('.test.ts')
      ) {
        out.push(readFileSync(path, 'utf-8'));
      }
    }
  };
  walk(componentDir);
  return out.join('\n');
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
