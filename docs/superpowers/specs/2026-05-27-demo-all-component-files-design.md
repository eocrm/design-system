# Demo source-view: show all files per component

## Problem

Each component demo's "View source code" panel today shows two tabs hard-coded by the demo file:

```tsx
import tsxSource from '@lib-source/components/Alert/Alert.tsx?raw';
import scssSource from '@lib-source/components/Alert/Alert.module.scss?raw';

<DemoLayout
  tsxSource={tsxSource}
  scssSource={scssSource}
  tsxFilename="Alert.tsx"
  scssFilename="Alert.module.scss"
  …
/>
```

This worked when every component was exactly `<Name>.tsx` + `<Name>.module.scss`. The component-tokens migration just added a third file per component (`<Name>.tokens.scss`), and several components have always had more (compound components like `DropdownMenu` with `Item/Radio/CheckboxItem` siblings, `Calendar` with `View*`/`Day*` partials, `DatePicker` with inline/range variants). The source-view still shows only two files, so the rest is invisible to consumers reading the demo.

## Goal

The "View source code" panel shows **every public source file** in the component's directory — one tab per filename. The two-line manual wiring per demo is replaced with a single lookup.

## Scope

In scope:

- A helper that reads the component's directory at build time and returns `{ filename, code, language }[]`.
- `DemoBody` / `DemoLayout` accept `files: ComponentFile[]` and render N tabs (one per file).
- All 58 demo pages migrated to the new API.
- Playground `CLAUDE.md` Hard rule 3 example updated.

Out of scope:

- Library changes (none needed).
- Test files in the tab strip. `<Name>.test.tsx` exists in every component dir but it's not what a consumer is looking at when they think "the component's source." They're filtered out.
- Mockup pages. They don't use `DemoLayout`.

## Design

### File inclusion

A file appears in the tab strip if it is inside `packages/design-system/src/components/<Name>/` AND its extension is `.tsx`, `.ts`, `.scss`, or `.css` AND it is NOT a test file (`.test.tsx`, `.test.ts`).

`index.ts` IS included — consumers care which symbols are re-exported.

### Tab order

Files sort by a stable rule so the same component always shows the same order:

1. `<Name>.tsx` first (the primary component file)
2. Other `.tsx` files alphabetically (compound sub-components)
3. `<Name>.module.scss`
4. `<Name>.tokens.scss`
5. Other `.scss` / `.css` files alphabetically
6. `index.ts` last (the export manifest)
7. Other `.ts` files alphabetically (rare)

Rationale: humans read top-to-bottom by importance. The main component is what they came for; the export manifest is the bookkeeping they consult last.

### Implementation

New file: `packages/playground/src/lib/componentFiles.ts`.

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

export function getComponentFiles(name: string): ComponentFile[] { … }
```

`import.meta.glob` with `eager: true` and a literal-string pattern is statically analyzed by Vite: the matched files are bundled, the rest are not. Calling this function from each demo costs nothing extra — the bundle includes the same set of `?raw` source strings whether one file references them or fifty do.

The filter inside `getComponentFiles`:

1. Match path prefix `components/<name>/`.
2. Reject any path containing `.test.`.
3. Map to `{ filename: basename(path), code, language: extname(path).slice(1) }`.
4. Sort by the order above.

### DemoLayout / DemoBody API change

The four props `tsxSource`, `scssSource`, `tsxFilename`, `scssFilename` collapse into one:

```ts
interface DemoLayoutProps {
  name: string;
  description: string;
  files: ComponentFile[];
  componentName?: ComponentName;
  children: ReactNode;
}
```

`DemoBody` renders the `<Tabs>` items from `files.map(f => ({ id: f.filename, label: f.filename }))` and the `<CodeBlock>` for the active file. The default active tab is `files[0]` (the primary `.tsx`).

Edge case: if there are more than ~6 tabs, the Tabs component already handles horizontal overflow with its internal scroll behavior. No new UI is needed.

### Per-demo migration

Every demo loses two `?raw` imports and four prop lines, gains one helper import and one prop:

```tsx
// before
import tsxSource from '@lib-source/components/Alert/Alert.tsx?raw';
import scssSource from '@lib-source/components/Alert/Alert.module.scss?raw';

<DemoLayout
  name="Alert"
  componentName="Alert"
  description="…"
  tsxSource={tsxSource}
  scssSource={scssSource}
  tsxFilename="Alert.tsx"
  scssFilename="Alert.module.scss"
>

// after
import { getComponentFiles } from '../../lib/componentFiles';

<DemoLayout
  name="Alert"
  componentName="Alert"
  description="…"
  files={getComponentFiles('Alert')}
>
```

This is mechanical for all 58 demos.

## Risks

- **Tab overflow on compound components.** `DropdownMenu` has 5 `.tsx` + 1 tokens + 1 module + 1 index = 8 tabs. `Calendar` has ~10. The existing `<Tabs>` primitive handles overflow but it's worth eyeballing in the browser.
- **A demo whose component name differs from its dir.** Spot-check: e.g., `DatePickersDemo.tsx` covers `DatePicker` + `DateRangePicker` + inline variants. Currently it must point at one component's files; under the new helper it stays single-component. The demos call `getComponentFiles('DatePicker')` (or whatever they pointed at before), behavior unchanged.

## Out of scope (deliberately deferred)

- **Search across files** (find-in-source). Not asked for. Browser Cmd+F covers the displayed file.
- **Highlight a token reference from one file to its definition in another.** Cool, lots of work, no signal anyone wants it.
- **Show the demo `.tsx` itself as a tab.** The demo IS the page you're on; showing its own source is redundant.
