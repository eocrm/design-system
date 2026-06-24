# `<MediaTile>` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `<MediaTile>` media tile (full-bleed body + a top name/size bar + a bottom controls bar over gradient gray scrims, revealed on hover/focus) to `@eocrm/design-system`, resolving issue eocrm/design-system#200.

**Architecture:** A presentational `forwardRef<HTMLDivElement>` container — a `position: relative` box that clips its `media` body and overlays two absolutely-positioned bars. The bars are `opacity: 0; pointer-events: none` and revealed (`opacity: 1; pointer-events: auto`) by a per-`revealOn` selector (`:hover`/`:focus-within`/always). Opacity (not visibility) keeps the action buttons tabbable. Tokens-only styling; no new i18n.

**Tech Stack:** TypeScript, React, SCSS modules, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-24-mediatile-design.md`

---

## File map

Library (`packages/design-system/`):

- `src/components/MediaTile/MediaTile.tsx` (new) — the component.
- `src/components/MediaTile/MediaTile.module.scss` (new) — root + bars + reveal selectors.
- `src/components/MediaTile/MediaTile.tokens.scss` (new) — `--mediatile-*`.
- `src/components/MediaTile/MediaTile.test.tsx` (new).
- `src/components/MediaTile/index.ts` (new).
- `src/index.ts` (modify) — exports.
- `src/_meta/manifest.ts` + `scripts/generate-manifest.mjs` (modify) — `MediaTile: 'Display'`; then `npm run build:manifest`.
- `AGENTS.md` (modify) — TL;DR.

Playground (`packages/playground/`):

- `src/pages/components/MediaTileDemo.tsx` (new).
- `src/App.tsx` / `src/layout/AppShell/navItems.ts` / `src/pages/components/ComponentsIndex.tsx` / `src/pages/mockups/registry.ts` (modify) — wiring.

---

## Task 1: `MediaTile` component (TDD)

**Files:** Create `MediaTile.tokens.scss`, `MediaTile.module.scss`, `MediaTile.tsx`, `index.ts`, `MediaTile.test.tsx`.

- [ ] **Step 1: Write the failing test (`MediaTile.test.tsx`)**

Vitest globals on. CSS-module class names keep their source name as a substring (so `[class*="barTop"]` and `toMatch(/reveal-hover/)` work).

```tsx
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { MediaTile, type MediaTileProps } from './MediaTile';

function renderTile(props: Partial<MediaTileProps> = {}) {
  return render(
    <MediaTile
      media={<div data-testid="media">M</div>}
      title="photo.jpg"
      meta="2 MB"
      actions={<button>Del</button>}
      {...props}
    />,
  );
}

describe('MediaTile', () => {
  it('renders the media, title, meta, and actions', () => {
    renderTile();
    expect(screen.getByTestId('media')).toBeInTheDocument();
    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByText('2 MB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Del' })).toBeInTheDocument();
  });

  it('renders the action buttons at rest (no hover) so they stay tabbable', () => {
    renderTile();
    // The reveal is CSS-only (opacity); the button is in the DOM without any hover.
    expect(screen.getByRole('button', { name: 'Del' })).toBeInTheDocument();
  });

  it("defaults revealOn to 'hover'", () => {
    const { container } = renderTile();
    expect((container.firstChild as HTMLElement).className).toMatch(/reveal-hover/);
  });

  it.each(['hover', 'focus', 'visible'] as const)('revealOn=%s applies the matching class', (r) => {
    const { container } = renderTile({ revealOn: r });
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`reveal-${r}`));
  });

  it("defaults radius to 'md'", () => {
    const { container } = renderTile();
    expect((container.firstChild as HTMLElement).className).toMatch(/radius-md/);
  });

  it.each(['none', 'sm', 'md', 'lg'] as const)('radius=%s applies the matching class', (rad) => {
    const { container } = renderTile({ radius: rad });
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`radius-${rad}`));
  });

  it('omits the top bar when there is no title and no meta', () => {
    const { container } = render(<MediaTile media={<div>M</div>} actions={<button>Del</button>} />);
    expect(container.querySelector('[class*="barTop"]')).toBeNull();
  });

  it('omits the bottom bar when there are no actions', () => {
    const { container } = render(<MediaTile media={<div>M</div>} title="x" />);
    expect(container.querySelector('[class*="barBottom"]')).toBeNull();
  });

  it('forwards ref to the root div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<MediaTile ref={ref} media={<div>M</div>} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className and spreads HTML attributes', () => {
    const { container } = render(
      <MediaTile media={<div>M</div>} className="custom" data-testid="tile" />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/custom/);
    expect(root).toHaveAttribute('data-testid', 'tile');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/MediaTile/MediaTile.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `MediaTile.tokens.scss`**

```scss
:root {
  --mediatile-radius-none: 0;
  --mediatile-radius-sm: var(--radius-sm);
  --mediatile-radius-md: var(--radius-md);
  --mediatile-radius-lg: var(--radius-lg);

  // Semi-opaque slate scrim behind the bars (fades to transparent toward the center).
  --mediatile-scrim: rgb(15 23 42 / 72%);
  --mediatile-fg: var(--color-fg-on-overlay); // #fff — text/controls on the scrim

  --mediatile-bar-gap: var(--space-2);
  --mediatile-bar-padding: var(--space-2);
  --mediatile-reveal-transition: var(--transition-fast);

  --mediatile-title-size: var(--font-size-sm);
  --mediatile-title-weight: var(--font-weight-semibold);
  --mediatile-meta-size: var(--font-size-xs);
  --mediatile-meta-opacity: var(--opacity-muted);
}
```

- [ ] **Step 4: Create `MediaTile.module.scss`**

```scss
@use './MediaTile.tokens';

// stylelint-disable property-disallowed-list -- internal overlay positioning, not consumer layout

.root {
  position: relative;
  overflow: hidden;
  display: block;
}

.radius-none {
  border-radius: var(--mediatile-radius-none);
}

.radius-sm {
  border-radius: var(--mediatile-radius-sm);
}

.radius-md {
  border-radius: var(--mediatile-radius-md);
}

.radius-lg {
  border-radius: var(--mediatile-radius-lg);
}

.media {
  display: block;
}

.bar {
  position: absolute;
  inset-inline: 0;
  display: flex;
  align-items: center;
  gap: var(--mediatile-bar-gap);
  padding: var(--mediatile-bar-padding);
  color: var(--mediatile-fg);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--mediatile-reveal-transition);
}

.barTop {
  inset-block-start: 0;
  background: linear-gradient(to bottom, var(--mediatile-scrim), transparent);
}

.barBottom {
  inset-block-end: 0;
  justify-content: center;
  background: linear-gradient(to top, var(--mediatile-scrim), transparent);
}

// Reveal models — selected by the `reveal-*` modifier class on the root.
.reveal-hover:hover .bar,
.reveal-hover:focus-within .bar,
.reveal-focus:focus-within .bar,
.reveal-visible .bar {
  opacity: 1;
  pointer-events: auto;
}

.title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: var(--mediatile-title-size);
  font-weight: var(--mediatile-title-weight);
}

.meta {
  flex: none;
  font-size: var(--mediatile-meta-size);
  opacity: var(--mediatile-meta-opacity);
}

@media (prefers-reduced-motion: reduce) {
  .bar {
    transition: none;
  }
}
```

(If stylelint flags anything: the top-of-file `stylelint-disable property-disallowed-list` covers the `position`/`inset-*` overlay positioning. If it flags the raw `rgb(...)` in `MediaTile.tokens.scss`, that's a component-token literal — `declaration-strict-value` targets `.module.scss`, so it should pass; if the config includes tokens files, hoist the scrim into `src/styles/tokens.scss` as a primitive and reference it. Verify: `npx stylelint "src/components/MediaTile/*.scss"`.)

- [ ] **Step 5: Create `MediaTile.tsx`**

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './MediaTile.module.scss';

/** When the overlay bars reveal. */
export type MediaTileReveal = 'hover' | 'focus' | 'visible';
/** Corner rounding (clips the media). */
export type MediaTileRadius = 'none' | 'sm' | 'md' | 'lg';

export interface MediaTileProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  /** Tile body — full-bleed media (an `<Image>`, or a centered file-type icon). */
  media: ReactNode;
  /** Top-bar leading content (e.g. the file name). Truncates with an ellipsis. */
  title?: ReactNode;
  /** Top-bar trailing content (e.g. the file size). Sits at the end of the row. */
  meta?: ReactNode;
  /** Bottom-bar controls (e.g. preview / download / delete icon buttons), centered. */
  actions?: ReactNode;
  /**
   * When the bars + scrims reveal. Default `'hover'`.
   * - `'hover'` — on pointer hover OR keyboard focus-within (focus always included for a11y).
   * - `'focus'` — only on focus-within (no mouse-over reveal).
   * - `'visible'` — always shown.
   */
  revealOn?: MediaTileReveal;
  /** Corner rounding (clips the media). Default `'md'`. */
  radius?: MediaTileRadius;
}

/**
 * Media tile for gallery / file-grid views — a full-bleed `media` body (an `<Image>`, or a
 * centered file-type icon) with a top bar (`title` + `meta`) and a bottom bar (`actions`),
 * each over a gradient gray scrim, **revealed on hover / keyboard focus** so the image isn't
 * permanently cluttered. Drop one per tile inside a `<Masonry>` / `<Grid>`.
 *
 * The reveal uses `opacity` (not `visibility`), so the action buttons stay in the tab order:
 * tabbing to a control fires `:focus-within` and reveals the bar. Set `revealOn="visible"` to
 * always show the bars, or `"focus"` to reveal only on keyboard focus.
 *
 * @example
 * <Masonry minColumnWidth="180px" gap="sm">
 *   {files.map((f) => (
 *     <MediaTile
 *       key={f.id}
 *       media={<Image src={f.thumbUrl} alt={f.name} aspectRatio={1} objectFit="cover" />}
 *       title={f.name}
 *       meta={formatBytes(f.size)}
 *       actions={
 *         <Cluster gap="xs">
 *           <Button iconOnly variant="ghost" size="sm" aria-label={`Download ${f.name}`} onClick={...}>
 *             <Download size={16} />
 *           </Button>
 *         </Cluster>
 *       }
 *     />
 *   ))}
 * </Masonry>
 *
 * @remarks When NOT to use
 * - A plain, non-revealing image block → `<Image>` (optionally inside a `<Card>`).
 * - A colored icon chip → `<IconTile>`.
 *
 * @remarks Anti-patterns
 * - ❌ Putting the ONLY copy of critical info in a hover-revealed bar — it's hidden at rest
 *   for mouse users until hover. Use `revealOn="visible"` if the info must always show.
 * - ❌ Omitting `aria-label` on icon-only action buttons — they're the tile's only labels.
 * - ❌ Expecting `MediaTile` to size the body — the `media` (`<Image aspectRatio>` or a fixed
 *   box) owns the tile's aspect; MediaTile only clips + overlays.
 */
// {...rest} last (Pattern A) so the consumer can add onClick / data-* to the tile.
export const MediaTile = forwardRef<HTMLDivElement, MediaTileProps>(function MediaTile(
  { media, title, meta, actions, revealOn = 'hover', radius = 'md', className, ...rest },
  ref,
) {
  const hasTopBar = title != null || meta != null;
  return (
    <div
      ref={ref}
      className={clsx(
        styles.root,
        styles[`radius-${radius}`],
        styles[`reveal-${revealOn}`],
        className,
      )}
      {...rest}
    >
      <div className={styles.media}>{media}</div>

      {hasTopBar && (
        <div className={clsx(styles.bar, styles.barTop)}>
          {title != null && <span className={styles.title}>{title}</span>}
          {meta != null && <span className={styles.meta}>{meta}</span>}
        </div>
      )}

      {actions != null && <div className={clsx(styles.bar, styles.barBottom)}>{actions}</div>}
    </div>
  );
});
```

- [ ] **Step 6: Create `index.ts`**

```ts
export { MediaTile } from './MediaTile';
export type { MediaTileProps, MediaTileReveal, MediaTileRadius } from './MediaTile';
```

- [ ] **Step 7: Run tests + typecheck + stylelint**

Run: `cd packages/design-system && npx vitest run src/components/MediaTile/ && npx tsc --noEmit && npx stylelint "src/components/MediaTile/*.scss"`
Expected: all green (the `.each` blocks expand to 3 + 4 cases, so ~13 test cases total).

Also run `npx vitest run src/structure.test.ts` — it may fail ONLY on `MediaTile is re-exported from src/index.ts` (that's Task 2). If so, that's expected; do NOT add the barrel export here.

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/MediaTile/
git commit -m "feat(MediaTile): media tile with hover/focus-revealed top + bottom scrim bars"
```

---

## Task 2: Exports + manifest

**Files:** Modify `src/index.ts`, `src/_meta/manifest.ts`, `scripts/generate-manifest.mjs`.

- [ ] **Step 1: Add exports to `src/index.ts`** (near the `Image` / `IconTile` Display exports):

```ts
export { MediaTile } from './components/MediaTile';
export type { MediaTileProps, MediaTileReveal, MediaTileRadius } from './components/MediaTile';
```

- [ ] **Step 2: Add `MediaTile: 'Display'` to the `CLUSTERS` map in BOTH** `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs` (next to `Image: 'Display',`). Keep the two maps identical.

- [ ] **Step 3: Regenerate + verify**

Run: `cd packages/design-system && npm run build:manifest && npx vitest run src/_meta/manifest.test.ts src/structure.test.ts && npx tsc --noEmit`
Expected: `components.manifest.json` gains a `MediaTile` entry (`tier: "primitive"`, `cluster: "Display"`, `composes: []`); manifest + structure tests pass; tsc clean.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/index.ts packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs packages/design-system/src/components.manifest.json
git commit -m "feat(MediaTile): barrel export + manifest CLUSTERS (Display)"
```

---

## Task 3: Playground demo + wiring

**Files:** Create `MediaTileDemo.tsx`; modify `App.tsx`, `navItems.ts`, `ComponentsIndex.tsx`, `registry.ts`.

- [ ] **Step 1: Create `packages/playground/src/pages/components/MediaTileDemo.tsx`**

```tsx
import {
  MediaTile,
  Image,
  Masonry,
  Cluster,
  Stack,
  Text,
  Button,
  type MediaTileReveal,
} from '@eocrm/design-system';
import { Maximize2, Download, Trash2, FileText } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

interface FileItem {
  id: string;
  name: string;
  size: string;
  src?: string;
}
const FILES: FileItem[] = [
  {
    id: 'f1',
    name: 'lake-survey.jpg',
    size: '2.4 MB',
    src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&q=70',
  },
  {
    id: 'f2',
    name: 'north-meadow.png',
    size: '1.1 MB',
    src: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&q=70',
  },
  { id: 'f3', name: 'site-plan.pdf', size: '380 KB' },
  {
    id: 'f4',
    name: 'ridge-road.jpg',
    size: '3.0 MB',
    src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=70',
  },
  {
    id: 'f5',
    name: 'forest-lake.jpg',
    size: '0.9 MB',
    src: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=400&q=70',
  },
];

const iconBody = (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      aspectRatio: '1',
      background: 'var(--color-bg-muted)',
      color: 'var(--color-fg-muted)',
    }}
  >
    <FileText size={40} />
  </div>
);

function fileActions(name: string) {
  return (
    <Cluster gap="xs">
      <Button iconOnly variant="ghost" size="sm" aria-label={`Preview ${name}`} onClick={() => {}}>
        <Maximize2 size={16} />
      </Button>
      <Button iconOnly variant="ghost" size="sm" aria-label={`Download ${name}`} onClick={() => {}}>
        <Download size={16} />
      </Button>
      <Button iconOnly variant="ghost" size="sm" aria-label={`Delete ${name}`} onClick={() => {}}>
        <Trash2 size={16} />
      </Button>
    </Cluster>
  );
}

export function MediaTileDemo() {
  return (
    <DemoLayout
      name="MediaTile"
      componentName="MediaTile"
      description="Media tile for gallery / file-grid views — a full-bleed image (or a file-type icon), with a top bar (name + size) and a bottom bar (controls) over gradient gray scrims, revealed on hover / keyboard focus. Drop one per tile in a Masonry. For a plain image use Image."
      files={getComponentFiles('MediaTile')}
    >
      <Example
        title="Files grid (Masonry of tiles)"
        description="Hover a tile (or Tab into it) to reveal the name + size on top and the preview / download / delete controls on the bottom, each on a gray scrim. The non-image file shows a centered icon."
        code={`<Masonry minColumnWidth="180px" gap="sm">
  {files.map((f) => (
    <MediaTile key={f.id}
      media={<Image src={f.src} alt={f.name} aspectRatio={1} objectFit="cover" />}
      title={f.name} meta={f.size}
      actions={<Cluster gap="xs"><Button iconOnly aria-label={\`Download \${f.name}\`}>…</Button></Cluster>} />
  ))}
</Masonry>`}
      >
        <Masonry minColumnWidth="180px" gap="sm">
          {FILES.map((f) => (
            <MediaTile
              key={f.id}
              media={
                f.src ? (
                  <Image src={f.src} alt={f.name} aspectRatio={1} objectFit="cover" />
                ) : (
                  iconBody
                )
              }
              title={f.name}
              meta={f.size}
              actions={fileActions(f.name)}
            />
          ))}
        </Masonry>
      </Example>

      <Example
        title="revealOn — hover / focus / visible"
        description="hover (default): reveal on pointer hover OR keyboard focus. focus: only on focus-within. visible: always shown."
        code={`<MediaTile revealOn="hover" … />
<MediaTile revealOn="focus" … />
<MediaTile revealOn="visible" … />`}
      >
        <Cluster gap="md" align="start">
          {(['hover', 'focus', 'visible'] as MediaTileReveal[]).map((r) => (
            <Stack key={r} gap="xs" align="center">
              <div style={{ width: 160 }}>
                <MediaTile
                  revealOn={r}
                  media={
                    <Image
                      src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&q=70"
                      alt="Mountain lake"
                      aspectRatio={1}
                      objectFit="cover"
                    />
                  }
                  title="lake-survey.jpg"
                  meta="2.4 MB"
                  actions={fileActions('lake-survey.jpg')}
                />
              </div>
              <Text size="xs" tone="muted">
                revealOn=&quot;{r}&quot;
              </Text>
            </Stack>
          ))}
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
```

(Confirm props against the real APIs: `Masonry` accepts `minColumnWidth` + `gap`; `Button` has `iconOnly`/`variant="ghost"`/`size="sm"`; `Image` has `aspectRatio`/`objectFit`. Inline `style` is allowed on demo pages. Adapt only if a prop differs — don't invent props.)

- [ ] **Step 2: Wire the route** (`App.tsx`) — import near another Display demo + a route:

```tsx
import { MediaTileDemo } from './pages/components/MediaTileDemo';
// inside <Routes>:
<Route path="/components/media-tile" element={<MediaTileDemo />} />;
```

- [ ] **Step 3: Wire the nav** (`layout/AppShell/navItems.ts`) — in the **Display** group, add (import `GalleryThumbnails` from lucide-react; if absent, use `Images` or `LayoutGrid`):

```ts
{ to: '/components/media-tile', label: 'MediaTile', icon: GalleryThumbnails, end: false },
```

- [ ] **Step 4: Wire the overview card** (`ComponentsIndex.tsx`) — `Image` is already imported; add `MediaTile` to the import and a card with a small static tile preview:

```tsx
{
  to: '/components/media-tile',
  name: 'MediaTile',
  description: 'Media tile — image/icon body with hover-revealed name/size + controls bars.',
  preview: (
    <div style={{ width: '100%', maxWidth: 140 }}>
      <MediaTile
        revealOn="visible"
        media={
          <Image
            src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=200&q=60"
            alt=""
            aspectRatio={1}
            objectFit="cover"
          />
        }
        title="lake.jpg"
        meta="2.4 MB"
      />
    </div>
  ),
},
```

(`revealOn="visible"` so the preview shows the bars without a hover. Confirm `MediaTile`/`Image` are imported at the top of `ComponentsIndex.tsx`.)

- [ ] **Step 5: Wire the registry union** (`pages/mockups/registry.ts`) — add `| 'MediaTile'` to the `ComponentName` union (near `'Masonry'`).

- [ ] **Step 6: Build the playground**

Run: `cd /Users/dpws/projects/design-system && make build`
Expected: typecheck + bundle succeed. Fix prettier drift with `npx prettier --write`.

- [ ] **Step 7: Commit**

```bash
git add packages/playground/src/pages/components/MediaTileDemo.tsx packages/playground/src/App.tsx \
        packages/playground/src/layout/AppShell/navItems.ts packages/playground/src/pages/components/ComponentsIndex.tsx \
        packages/playground/src/pages/mockups/registry.ts
git commit -m "feat(MediaTile): playground demo + nav/route/overview/registry wiring"
```

---

## Task 4: AGENTS.md

**Files:** Modify `packages/design-system/AGENTS.md`

- [ ] **Step 1: Add a TL;DR** in the Display area (grep for `Image` / `IconTile`; match the heading depth):

````md
### `<MediaTile>` — media tile with revealed overlay bars

`<MediaTile media title meta actions>` — a full-bleed `media` body (an `<Image>` or a file-type icon) with a top bar (`title` + `meta`) and a bottom bar (`actions`), each over a gradient gray scrim, **revealed on hover / keyboard focus**. Drop one per tile in a `<Masonry>` / `<Grid>` for a gallery or file grid. The reveal uses `opacity` (not `visibility`), so the action buttons stay tabbable — tabbing in fires `:focus-within` and reveals the bar.

```tsx
<Masonry minColumnWidth="180px" gap="sm">
  {files.map((f) => (
    <MediaTile
      key={f.id}
      media={<Image src={f.thumbUrl} alt={f.name} aspectRatio={1} objectFit="cover" />}
      title={f.name}
      meta={formatBytes(f.size)}
      actions={
        <Cluster gap="xs">
          <Button iconOnly variant="ghost" size="sm" aria-label={`Download ${f.name}`}>
            <Download size={16} />
          </Button>
        </Cluster>
      }
    />
  ))}
</Masonry>
```

- `revealOn`: `'hover'` (default — hover OR keyboard focus) · `'focus'` (focus only) · `'visible'` (always).
- Bars render only when they have content; icon-only `actions` need `aria-label`s.
- MediaTile clips + overlays only — the `media` (`<Image aspectRatio>`) owns the tile's aspect.
````

- [ ] **Step 2: Format + commit**

```bash
cd /Users/dpws/projects/design-system
npx prettier --write packages/design-system/AGENTS.md
git add packages/design-system/AGENTS.md
git commit -m "docs(MediaTile): AGENTS.md TL;DR"
```

---

## Task 5: Full gates + browser verification

- [ ] **Step 1: Run all gates from the repo root**

```bash
cd /Users/dpws/projects/design-system
make test && make build-lib && make lint && npm run format:check
npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'   # expect 0
```

Expected: all PASS; tarball grep `0`.

- [ ] **Step 2: Browser (Playwright, manual) on the running playground** (`/components/media-tile`):
  - At rest, a tile shows a clean image with no bars (default `revealOn='hover'`).
  - Hovering a tile fades in the top bar (name left, size right) and the bottom controls bar, each on a gray gradient scrim; moving away hides them.
  - **Tab** into a tile's controls (no mouse) → the bars reveal (`:focus-within`) and the buttons are focusable/operable — confirm by reading the computed `opacity` of a bar going 0→1 on focus.
  - The `revealOn="visible"` example shows the bars permanently; `revealOn="focus"` shows them only when focused, not on mouse hover.
  - The non-image tile shows the centered file icon. No console errors.

---

## Self-review notes

- **Spec coverage:** slots `media`/`title`/`meta`/`actions` (T1) · top + bottom gradient scrim bars (T1 SCSS) · `revealOn` 3-value reveal selectors + opacity-keeps-tabbable (T1) · `radius` (T1) · bars omitted when empty (T1) · tokens incl. scrim + reused `--color-fg-on-overlay` (T1) · `Omit<…,'title'>` (T1) · reduced-motion (T1) · exports + manifest `Display`/`primitive` (T2) · demo + wiring (T3) · JSDoc `@remarks` (T1) · AGENTS (T4) · no i18n. All spec sections map to a task.
- **Type consistency:** `MediaTileReveal = 'hover'|'focus'|'visible'`, `MediaTileRadius = 'none'|'sm'|'md'|'lg'`, `MediaTileProps` defined in `MediaTile.tsx` (T1), re-exported (T1 index → T2 barrel). Class names `reveal-${revealOn}` / `radius-${radius}` match the SCSS `.reveal-*` / `.radius-*`.
- **Rule 4:** only the component's own internal overlay positioning (`relative` root + `absolute` bars), with the file-level justified `stylelint-disable` (mirrors Image/Modal). No consumer layout props.
- **a11y:** opacity-based reveal + `:focus-within` keeps controls tabbable and reveals on focus (the issue's hard requirement); browser-verified in T5.
