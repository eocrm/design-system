# Demo source-view: all files per component — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two hard-coded `?raw` source imports per demo with a build-time directory scan, so every demo shows ALL public source files of its component (component + styles + tokens + index + any compound siblings).

**Architecture:** One central `import.meta.glob('@lib-source/components/**/*.{tsx,ts,scss,css}', { query: '?raw', eager: true })` exposed via `getComponentFiles(name)`. `DemoBody` accepts an array of `{filename, code, language}` and renders one tab per file.

**Spec:** `docs/superpowers/specs/2026-05-27-demo-all-component-files-design.md`

**Branch:** `feat/demo-all-component-files` (already checked out off main)

---

## Task 1: Helper module

**Files:**

- Create: `packages/playground/src/lib/componentFiles.ts`

- [ ] **Step 1: Write the helper**

```ts
const raw = import.meta.glob('@lib-source/components/**/*.{tsx,ts,scss,css}', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>;

export interface ComponentFile {
  filename: string;
  code: string;
  language: 'tsx' | 'ts' | 'scss' | 'css';
}

const EXT_ORDER: Record<string, number> = {
  tsx: 0,
  scss: 1,
  css: 1,
  ts: 2,
};

function priority(name: string, component: string): [number, number, string] {
  const ext = name.split('.').pop() ?? '';
  const extRank = EXT_ORDER[ext] ?? 9;

  // Within each extension family, the canonical files for the component
  // come first.
  let nameRank = 99;
  if (name === `${component}.tsx`) nameRank = 0;
  else if (ext === 'tsx') nameRank = 1;
  else if (name === `${component}.module.scss`) nameRank = 0;
  else if (name === `${component}.tokens.scss`) nameRank = 1;
  else if (ext === 'scss' || ext === 'css') nameRank = 2;
  else if (name === 'index.ts') nameRank = 99;
  else if (ext === 'ts') nameRank = 50;

  return [extRank, nameRank, name];
}

export function getComponentFiles(name: string): ComponentFile[] {
  const dirMarker = `/components/${name}/`;

  return Object.entries(raw)
    .filter(([path]) => path.includes(dirMarker))
    .filter(([path]) => {
      const after = path.slice(path.indexOf(dirMarker) + dirMarker.length);
      // Only files directly under the component dir, not nested children
      // (none today, but safer).
      if (after.includes('/')) return false;
      return !after.includes('.test.');
    })
    .map(([path, code]) => {
      const filename = path.slice(path.indexOf(dirMarker) + dirMarker.length);
      const ext = filename.split('.').pop() as ComponentFile['language'];
      return { filename, code, language: ext };
    })
    .sort((a, b) => {
      const pa = priority(a.filename, name);
      const pb = priority(b.filename, name);
      if (pa[0] !== pb[0]) return pa[0] - pb[0];
      if (pa[1] !== pb[1]) return pa[1] - pb[1];
      return pa[2].localeCompare(pb[2]);
    });
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/playground/src/lib/componentFiles.ts
git commit -m "Playground: getComponentFiles helper (build-time glob over component dirs)"
```

---

## Task 2: DemoLayout / DemoBody accept the new prop shape

**Files:**

- Modify: `packages/playground/src/pages/components/DemoLayout.tsx`
- Modify: `packages/playground/src/pages/components/DemoBody.tsx`

- [ ] **Step 1: Update `DemoLayout`**

Drop `tsxSource / scssSource / tsxFilename / scssFilename`. Add `files: ComponentFile[]`. Forward `files` to `DemoBody`.

```tsx
import { type ReactNode } from 'react';
import { Stack } from '@eocrm/design-system';
import { DemoBody } from './DemoBody';
import type { ComponentName } from '../mockups/registry';
import type { ComponentFile } from '../../lib/componentFiles';
import styles from './DemoLayout.module.scss';

export interface DemoLayoutProps {
  name: string;
  description: string;
  files: ComponentFile[];
  componentName?: ComponentName;
  children: ReactNode;
}

export function DemoLayout({ name, description, files, componentName, children }: DemoLayoutProps) {
  return (
    <Stack gap="lg">
      <header className={styles.header}>
        <span className={styles.eyebrow}>Component</span>
        <h1 className={styles.title}>{name}</h1>
        <p className={styles.description}>{description}</p>
      </header>

      <DemoBody files={files} componentName={componentName}>
        {children}
      </DemoBody>
    </Stack>
  );
}
```

- [ ] **Step 2: Update `DemoBody`**

Replace the two-tab hard-code with a tab-per-file render. Active state defaults to `files[0].filename`. Render `<CodeBlock>` for the active file. Tab labels are the bare filenames.

```tsx
import { useState, type ReactNode } from 'react';
import { ChevronDown, Code2 } from 'lucide-react';
import { Card, Tabs } from '@eocrm/design-system';
import { CodeBlock } from './CodeBlock';
import { CrossLinks } from '../shared/CrossLinks';
import type { ComponentName } from '../mockups/registry';
import type { ComponentFile } from '../../lib/componentFiles';
import styles from './DemoLayout.module.scss';

export interface DemoBodyProps {
  files: ComponentFile[];
  componentName?: ComponentName;
  children: ReactNode;
}

export function DemoBody({ files, componentName, children }: DemoBodyProps) {
  const [activeId, setActiveId] = useState(files[0]?.filename ?? '');
  const active = files.find((f) => f.filename === activeId) ?? files[0];

  return (
    <>
      <Card padding="none">
        <details className={styles.sourceDetails}>
          <summary className={styles.sourceSummary}>
            <span className={styles.summaryLabel}>
              <Code2 size={14} />
              View source code
            </span>
            <ChevronDown size={14} className={styles.chevron} />
          </summary>
          <div className={styles.sourceBody}>
            <Tabs
              items={files.map((f) => ({ id: f.filename, label: f.filename }))}
              activeId={activeId}
              onChange={setActiveId}
            />
            {active && (
              <div className={styles.sourceCode}>
                <CodeBlock code={active.code} language={active.language} filename={active.filename} />
              </div>
            )}
          </div>
        </details>
      </Card>

      <h2 className={styles.sectionTitle}>Examples</h2>
      <div className={styles.examplesGrid}>{children}</div>

      {componentName && <CrossLinks kind="component" name={componentName} />}
    </>
  );
}
```

Note: `CodeBlock` already accepts `language: string` — confirm by reading `packages/playground/src/pages/components/CodeBlock.tsx`. If it accepts a narrower union, widen to include `'ts'` and `'css'`.

- [ ] **Step 3: Build / typecheck**

```bash
make build
```

Fails if any demo still passes the old prop shape — that's fine, demos migrate in Task 3.

To unblock typechecking in this commit, you can either (a) make the new props additionally accept the old shape behind a feature-flagged branch (don't), or (b) migrate at least one demo (e.g., `AlertDemo`) inline with this commit. Choose (b) — change `AlertDemo.tsx` to the new shape in the same commit so the build is green.

- [ ] **Step 4: Commit**

```bash
git add packages/playground/src/pages/components/DemoLayout.tsx \
        packages/playground/src/pages/components/DemoBody.tsx \
        packages/playground/src/pages/components/AlertDemo.tsx
git commit -m "Playground: DemoLayout/DemoBody take ComponentFile[] (one tab per file)"
```

---

## Task 3: Migrate all 58 demo pages

**Files:**

- Modify: every `packages/playground/src/pages/components/*Demo.tsx` (except `AlertDemo.tsx` which was migrated in Task 2)

The migration per file:

1. Drop the two lines:

   ```tsx
   import tsxSource from '@lib-source/components/<X>/<X>.tsx?raw';
   import scssSource from '@lib-source/components/<X>/<X>.module.scss?raw';
   ```

2. Add one line at the import block:

   ```tsx
   import { getComponentFiles } from '../../lib/componentFiles';
   ```

3. In the `<DemoLayout>` invocation, drop the four lines:

   ```tsx
   tsxSource={tsxSource}
   scssSource={scssSource}
   tsxFilename="<X>.tsx"
   scssFilename="<X>.module.scss"
   ```

4. Add one line:

   ```tsx
   files={getComponentFiles('<X>')}
   ```

**The component-name string** passed to `getComponentFiles` is whatever the demo's `?raw` imports pointed at on `main`. Don't second-guess it — `grep '@lib-source/components/[A-Z]' packages/playground/src/pages/components/<X>Demo.tsx` shows the answer.

- [ ] **Step 1: Migrate every demo**

Do every `*Demo.tsx` in `packages/playground/src/pages/components/`. Skip files that don't `import @lib-source/...` (e.g., `ComponentsIndex.tsx`, `CodeBlock.tsx`).

- [ ] **Step 2: Gates**

```bash
make build
make lint
```

Both must be green.

- [ ] **Step 3: Browser smoke-test**

```bash
make up
```

- Open http://localhost:8080/components/button — confirm three tabs (`Button.tsx`, `Button.module.scss`, `Button.tokens.scss`), each shows the right file.
- Open `/components/dropdown-menu` — confirm 7-8 tabs including `DropdownMenu.tsx`, `Item.tsx`, `Radio.tsx`, `CheckboxItem.tsx`, `Trigger.tsx`, `DropdownMenu.module.scss`, `DropdownMenu.tokens.scss`, `index.ts`.
- Open `/components/calendar` — confirm tabs include the calendar's many partials.
- Open `/components/alert` — confirm Alert still works after Task 2's inline migration.

- [ ] **Step 4: Commit**

```bash
git add packages/playground/src/pages/components/
git commit -m "Playground: migrate all 58 demos to files={getComponentFiles(...)}"
```

---

## Task 4: Update playground CLAUDE.md

**Files:**

- Modify: `packages/playground/CLAUDE.md`

- [ ] **Step 1: Replace Hard rule 3 example**

In Hard rule 3, change the example block to show the new shape:

```tsx
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function <Name>Demo() {
  return (
    <DemoLayout
      name="<Name>"
      componentName="<Name>"
      description="One sentence on what it is and when to use it."
      files={getComponentFiles('<Name>')}
    >
      <Example title="..." description="..." code={`...`}>
        {/* live preview */}
      </Example>
      {/* more <Example> blocks for each variant / size / state */}
    </DemoLayout>
  );
}
```

Add a sentence above the example: "The `files` prop is derived from a build-time scan of the component's directory — every `.tsx`, `.scss`, and `.ts` file (excluding `.test.tsx`) appears as a tab in the source-view, ordered: primary `.tsx` → other `.tsx` → `.module.scss` → `.tokens.scss` → `index.ts`."

- [ ] **Step 2: Commit**

```bash
git add packages/playground/CLAUDE.md
git commit -m "Playground CLAUDE.md: document files={getComponentFiles(...)} pattern"
```

---

## Task 5: Push + PR

- [ ] **Step 1: Final gate sweep**

```bash
make build
make lint
npm test -w @eocrm/design-system -- --run
```

All three green.

- [ ] **Step 2: Push**

```bash
git push -u origin feat/demo-all-component-files
```

If the pre-push hook flags prettier issues, run `npx prettier --write <files>`, add, commit, push again. Don't `--no-verify`.

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "Playground: source-view shows every file per component" --body "$(cat <<'EOF'
## Summary

The "View source code" panel on each component demo now shows ALL public source files in the component's directory — one tab per filename — instead of the hard-coded `Component.tsx` + `Component.module.scss` pair.

Driven by a build-time `import.meta.glob` in a new helper (`packages/playground/src/lib/componentFiles.ts`); each demo replaces its two `?raw` imports + four prop lines with one `files={getComponentFiles('Component')}` prop.

Visible improvements:

- The `Component.tokens.scss` file added by the component-tokens migration is now visible per component.
- Compound components (DropdownMenu, Calendar, DatePicker, DataTable) now show their sub-component sources.
- The `index.ts` re-export manifest is visible.

## Test plan

- [x] `make build` / `make lint` clean
- [x] Library tests still 2075/2075 (no library changes; smoke-check only)
- [x] Browser: confirmed multi-tab source view on Button, DropdownMenu, Calendar, Alert
EOF
)"
```

Report the PR URL.
