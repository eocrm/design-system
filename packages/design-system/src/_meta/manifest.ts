/**
 * Build-time helper that derives a dependency graph of every component
 * directory in `src/components/`. Output is committed as
 * `src/components.manifest.json` and consumed by:
 *
 * - the drift-detection Vitest test alongside this file
 * - the playground's `/components/dependencies` page
 * - (future) AGENTS.md auto-generated architecture section
 *
 * The graph is computed from import statements — no per-component
 * metadata to maintain. A component is a "primitive" if it imports no
 * other components in this directory; "composition" otherwise.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = join(__dirname, '..', 'components');

export type ComponentTier = 'primitive' | 'composition';

export interface ComponentManifestEntry {
  /** `'primitive'` if no other library components are imported; `'composition'` otherwise. */
  tier: ComponentTier;
  /** Functional cluster — derived from `CLUSTERS` map below. `null` if not classified. */
  cluster: string | null;
  /** Sorted list of library components this one imports. Empty for primitives. */
  composes: string[];
  /** Sorted inverse — components that import this one. */
  composedBy: string[];
}

export type ComponentManifest = Record<string, ComponentManifestEntry>;

/**
 * Functional-cluster table. Mirrors the AGENTS.md and AppShell sidebar
 * grouping. Update this when adding a component to keep the cluster
 * column accurate; the test alongside this file fails if a component is
 * unclassified.
 */
const CLUSTERS: Record<string, string> = {
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
  DefinitionList: 'Display',
  Calendar: 'Display',
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
// bug. Once nested files are read, their imports are one level deeper, so
// `from '../../RichTextEditor/…'` inside RichText/engine/ has to match too.
// Widening the walk without widening this pattern still sees nothing.
const FROM_PARENT_PATH = /from\s+['"](?:\.\.\/)+([A-Z][a-zA-Z0-9]+)(?:\/[^'"]*)?['"]/g;

function listComponentDirs(): string[] {
  return readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .sort();
}

function collectSourceText(componentDir: string): string {
  // Concatenate every non-test .tsx + .ts file UNDER the component dir so that
  // sub-files (e.g. SVSquare.tsx inside ColorPicker/) contribute their imports
  // to the parent component's dependency set.
  //
  // Recursive since #509. It said "every" and read one level, so nothing in a
  // nested directory counted — RichText/engine/ holds 20 modules and none of
  // them were ever parsed. That hid a real bidirectional dependency between
  // RichText and RichTextEditor for as long as the acyclic gate has been green;
  // the gate was not wrong, it was being fed half the source. Fixing the walk
  // without first breaking that cycle turns the gate red.
  const out: string[] = [];
  const walk = (dir: string) => {
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

/**
 * The import-matching half of the walk, exposed so it can be asserted directly.
 *
 * The pattern has to accept more than one `../` (#509). Nothing in the tree
 * currently exercises that — the only nested directory, RichText/engine, had
 * its single upward import removed when the RichText <-> RichTextEditor cycle
 * was broken — so the manifest looks the same whether the pattern is right or
 * wrong. That is exactly the condition under which a fix rots.
 */
export function collectImportsFrom(lines: string[]): string[] {
  return extractParentImports(lines.join('\n'));
}

function extractParentImports(source: string): string[] {
  const deps = new Set<string>();
  for (const match of source.matchAll(FROM_PARENT_PATH)) {
    deps.add(match[1]);
  }
  return [...deps];
}

/**
 * Build the full component manifest by walking every directory under
 * `src/components/` and parsing its source-file imports. Output is sorted
 * (component keys + composes / composedBy arrays) so the JSON is stable
 * across runs.
 */
export function buildManifest(): ComponentManifest {
  const names = listComponentDirs();
  const knownComponents = new Set(names);
  const manifest: ComponentManifest = {};

  // First pass: populate `composes` for each component.
  for (const name of names) {
    const dir = join(COMPONENTS_DIR, name);
    const src = collectSourceText(dir);
    const imports = extractParentImports(src).filter((n) => knownComponents.has(n) && n !== name);
    imports.sort();
    manifest[name] = {
      tier: imports.length === 0 ? 'primitive' : 'composition',
      cluster: CLUSTERS[name] ?? null,
      composes: imports,
      composedBy: [],
    };
  }

  // Second pass: invert the graph for `composedBy`.
  for (const [name, entry] of Object.entries(manifest)) {
    for (const dep of entry.composes) {
      const target = manifest[dep];
      if (target) {
        target.composedBy.push(name);
      }
    }
  }

  // Sort composedBy lists for stable output.
  for (const entry of Object.values(manifest)) {
    entry.composedBy.sort();
  }

  // Return a key-sorted object so JSON.stringify gives deterministic output.
  return Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  ) as ComponentManifest;
}

/** Path to the committed manifest JSON (relative to the design-system root). */
export const MANIFEST_PATH = join(__dirname, '..', 'components.manifest.json');
