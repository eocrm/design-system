# RichTextEditor File Upload + Attachment Blocks (Slice 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add file upload to `RichTextEditor` (toolbar button + clipboard-file paste, consumer `onUpload` handler) rendering uploads as **void attachment blocks** — inline `<Image>` previews for images, file chips otherwise — that the Slice 1 block controls already manage.

**Architecture:** A new void block type `'attachment'` (no text, `inlines: []`, `contentEditable=false`). Pure engine transforms create/patch it; `selection.ts` gains void-caret mapping; `renderDoc` gets an attachment case; the editor layer drives the upload lifecycle (insert spinner blocks → parallel `onUpload` → settle by id) and exposes `upload={{ onUpload, accept?, onUploadingChange? }}`.

**Tech Stack:** React + TypeScript, the in-house RichText engine, shipped `<Image>` + `<CircularProgress>`, SCSS modules + tokens, Vitest + Testing Library; void-caret behavior gets Playwright/manual verification (jsdom has no real caret).

**Spec:** `docs/superpowers/specs/2026-06-25-richtexteditor-file-upload-slice2-design.md`

---

## Conventions for every task

- Run tests from repo root: `npm test -- <path>` (Vitest `globals: true` — do NOT import `describe/it/expect/vi`).
- Engine: `packages/design-system/src/components/RichText/engine/`. Editor: `packages/design-system/src/components/RichTextEditor/`.
- After each task: `npx prettier --write <changed files>`, then commit with the task's message.
- Library changes → PR (root `CLAUDE.md`). Branch first (Task 0).

## File structure

**Create:**

- `…/RichText/engine/attachment.ts` (+ `.test.ts`) — `insertAttachmentBlock`, `updateAttachmentBlock`, void helpers.
- `…/RichTextEditor/useUpload.ts` (+ `.test.tsx`) — the upload-lifecycle hook (state, parallel uploads, settle-by-id, onUploadingChange, retry/remove).
- `…/RichTextEditor/RichTextAttachment.tsx` — the attachment render component (spinner / error / Image / chip), used by `renderDoc`.

**Modify:**

- `…/RichText/engine/model.ts` — add `'attachment'` to `BlockType`; optional attachment fields on `Block`.
- `…/RichText/engine/renderDoc.tsx` — `case 'attachment'`.
- `…/RichText/engine/transforms.ts` — make `mergeBlockBackward`/`splitBlock` void-aware.
- `…/RichText/engine/toHtml.ts`, `toMarkdown.ts`, `fromHtml.ts` — attachment serialization.
- `…/RichTextEditor/selection.ts` — void-caret mapping.
- `…/RichTextEditor/RichTextEditor.tsx` — `upload` prop, paste-files, lifecycle wiring, error-action delegation.
- `…/RichTextEditor/RichTextToolbar.tsx` — upload button + hidden file input.
- `…/RichTextEditor/RichTextBlockMenu.tsx` — hide "Turn into" for attachment blocks.
- `…/RichTextEditor/icons.tsx` — `AttachIcon`.
- `…/RichTextEditor/RichTextEditor.module.scss` — attachment/spinner/chip/error styles.
- `…/RichTextEditor/index.ts` + `src/index.ts` — export `UploadConfig`, `UploadResult`.
- i18n `messages.ts`/`en.ts`/`ru.ts`.
- `packages/design-system/AGENTS.md`; `packages/playground/src/pages/components/RichTextEditorDemo.tsx`.

---

## Task 0: Branch

- [ ] **Step 1**

```bash
cd /Users/dpws/projects/design-system
git checkout main && git pull --ff-only
git checkout -b feat/rte-file-upload-slice2
git config --get core.hooksPath   # must print .husky/_
```

---

## Task 1: Model — `'attachment'` block type + fields

**Files:** Modify `…/engine/model.ts`; Test `…/engine/model.test.ts`.

- [ ] **Step 1: Add the failing test** (append to `model.test.ts`)

```ts
import { createBlock } from './model';
import type { Block } from './model';

it('an attachment block holds file fields and is void (empty inlines)', () => {
  const b: Block = {
    id: 'a1',
    type: 'attachment',
    src: 'https://x/y.png',
    name: 'y.png',
    mime: 'image/png',
    status: 'ready',
    inlines: [],
  };
  expect(b.type).toBe('attachment');
  expect(b.inlines).toEqual([]);
});
```

- [ ] **Step 2: Run — fail** (`'attachment'` not assignable to `BlockType`)

Run: `npm run typecheck` → FAIL.

- [ ] **Step 3: Implement** — in `model.ts`:

Add `'attachment'` to the `BlockType` union:

```ts
export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'bullet_item'
  | 'ordered_item'
  | 'blockquote'
  | 'code_block'
  | 'attachment';
```

Add optional fields to the `Block` interface (after `inlines`):

```ts
  /** Attachment block only (type === 'attachment'). The uploaded URL — absent while uploading. */
  src?: string;
  /** Attachment filename / chip label. */
  name?: string;
  /** Attachment MIME — `image/*` renders a preview, else a file chip. */
  mime?: string;
  /** Natural image dimensions (layout hints). */
  width?: number;
  height?: number;
  /** Image alt text. */
  alt?: string;
  /** Attachment upload state. `ready`/absent = final. */
  status?: 'uploading' | 'ready' | 'error';
```

- [ ] **Step 4: Run — pass**

Run: `npm run typecheck` → PASS. `npm test -- src/components/RichText/engine/model.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/model.ts packages/design-system/src/components/RichText/engine/model.test.ts
git commit -m "feat(RichText): 'attachment' void block type + fields"
```

---

## Task 2: Engine — attachment transforms

**Files:** Create `…/engine/attachment.ts` + `attachment.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// attachment.test.ts
import { createBlock } from './model';
import type { Block, RichDoc } from './model';
import { insertAttachmentBlock, updateAttachmentBlock, isVoidBlock } from './attachment';

const p = (id: string, text = '') => createBlock('paragraph', text, { id });
const doc = (blocks: Block[]): RichDoc => ({ blocks });

describe('isVoidBlock', () => {
  it('is true only for attachment blocks', () => {
    expect(isVoidBlock({ id: 'a', type: 'attachment', inlines: [] })).toBe(true);
    expect(isVoidBlock(p('p'))).toBe(false);
  });
});

describe('insertAttachmentBlock', () => {
  it('inserts a void block and a trailing paragraph; caret after the attachment', () => {
    const d = doc([p('a', 'hello')]);
    const r = insertAttachmentBlock(
      d,
      { blockId: 'a', offset: 5 },
      {
        name: 'y.png',
        mime: 'image/png',
        status: 'uploading',
      },
    );
    const types = r.doc.blocks.map((b) => b.type);
    // hello | attachment | (trailing empty paragraph)
    expect(types).toEqual(['paragraph', 'attachment', 'paragraph']);
    expect(r.doc.blocks[1].name).toBe('y.png');
    expect(r.doc.blocks[1].status).toBe('uploading');
    expect(r.doc.blocks[1].inlines).toEqual([]);
    // caret on the block AFTER the attachment
    expect(r.selection.anchor.blockId).toBe(r.doc.blocks[2].id);
    expect(r.selection.anchor.offset).toBe(0);
  });
  it('splits mid-paragraph: text before stays, text after moves to the trailing block', () => {
    const d = doc([p('a', 'abcd')]);
    const r = insertAttachmentBlock(
      d,
      { blockId: 'a', offset: 2 },
      { name: 'f', status: 'uploading' },
    );
    // 'ab' | attachment | 'cd'
    expect(r.doc.blocks.map((b) => b.type)).toEqual(['paragraph', 'attachment', 'paragraph']);
    expect(r.doc.blocks[0].inlines[0].text).toBe('ab');
    expect(r.doc.blocks[2].inlines[0].text).toBe('cd');
  });
});

describe('updateAttachmentBlock', () => {
  it('patches fields by id', () => {
    const d = doc([{ id: 'x', type: 'attachment', name: 'f', status: 'uploading', inlines: [] }]);
    const next = updateAttachmentBlock(d, 'x', {
      status: 'ready',
      src: 'http://u/f.png',
      mime: 'image/png',
    });
    expect(next.blocks[0].status).toBe('ready');
    expect(next.blocks[0].src).toBe('http://u/f.png');
  });
  it('no-op (same ref) when id is absent', () => {
    const d = doc([p('a')]);
    expect(updateAttachmentBlock(d, 'nope', { status: 'ready' })).toBe(d);
  });
});
```

- [ ] **Step 2: Run — fail** (`npm test -- src/components/RichText/engine/attachment.test.ts`).

- [ ] **Step 3: Implement** `attachment.ts`:

```ts
// attachment.ts — attachment (void) block helpers + transforms. Pure + immutable.
import type { RichDoc, Block, Point, Range } from './model';
import { createBlock, nextId } from './model';
import { findBlockIndex, blockLength } from './position';
import { sliceInlines, normalizeInlines } from './inlines';

export interface AttachmentAttrs {
  name?: string;
  mime?: string;
  src?: string;
  width?: number;
  height?: number;
  alt?: string;
  status?: 'uploading' | 'ready' | 'error';
}

/** True for void blocks (no editable text; caret sits adjacent, never inside). */
export function isVoidBlock(block: Block): boolean {
  return block.type === 'attachment';
}

function collapsed(blockId: string, offset = 0): Range {
  return { anchor: { blockId, offset }, focus: { blockId, offset } };
}

function attachmentBlock(attrs: AttachmentAttrs): Block {
  return {
    id: nextId(),
    type: 'attachment',
    inlines: [],
    status: attrs.status ?? 'ready',
    ...(attrs.name !== undefined ? { name: attrs.name } : {}),
    ...(attrs.mime !== undefined ? { mime: attrs.mime } : {}),
    ...(attrs.src !== undefined ? { src: attrs.src } : {}),
    ...(attrs.width !== undefined ? { width: attrs.width } : {}),
    ...(attrs.height !== undefined ? { height: attrs.height } : {}),
    ...(attrs.alt !== undefined ? { alt: attrs.alt } : {}),
  };
}

/**
 * Split the block at `point` and insert an attachment block between the halves.
 * Always leaves an editable paragraph AFTER the attachment (the caret's home);
 * the caret lands at offset 0 of that trailing block. If `point` is inside a void
 * block, inserts after it instead of splitting.
 */
export function insertAttachmentBlock(
  doc: RichDoc,
  point: Point,
  attrs: AttachmentAttrs,
): { doc: RichDoc; selection: Range } {
  const idx = findBlockIndex(doc, point.blockId);
  if (idx === -1) return { doc, selection: collapsed(point.blockId, point.offset) };
  const block = doc.blocks[idx];
  const att = attachmentBlock(attrs);

  if (isVoidBlock(block)) {
    // No splitting a void — insert the attachment + a trailing paragraph after it.
    const after = createBlock('paragraph');
    const blocks = [...doc.blocks.slice(0, idx + 1), att, after, ...doc.blocks.slice(idx + 1)];
    return { doc: { blocks }, selection: collapsed(after.id) };
  }

  const left: Block = {
    ...block,
    inlines: normalizeInlines(sliceInlines(block.inlines, 0, point.offset)),
  };
  const rightInlines = normalizeInlines(
    sliceInlines(block.inlines, point.offset, blockLength(block)),
  );
  const right: Block = {
    ...createBlock(block.type, '', { level: block.level, depth: block.depth }),
    inlines: rightInlines,
  };
  const blocks = [...doc.blocks.slice(0, idx), left, att, right, ...doc.blocks.slice(idx + 1)];
  return { doc: { blocks }, selection: collapsed(right.id) };
}

/** Patch an attachment block's fields by id. Same-ref no-op if absent/not attachment. */
export function updateAttachmentBlock(doc: RichDoc, id: string, patch: AttachmentAttrs): RichDoc {
  const idx = findBlockIndex(doc, id);
  if (idx === -1 || doc.blocks[idx].type !== 'attachment') return doc;
  const blocks = doc.blocks.slice();
  blocks[idx] = { ...blocks[idx], ...patch };
  return { blocks };
}
```

> Confirm `sliceInlines`/`normalizeInlines` are exported from `./inlines` (they are — used by `transforms.ts`). `right` always exists, so a trailing editable block is guaranteed when splitting; the void-insert branch adds one explicitly.

- [ ] **Step 4: Run — pass.** **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/attachment.ts packages/design-system/src/components/RichText/engine/attachment.test.ts
git commit -m "feat(RichText): insertAttachmentBlock + updateAttachmentBlock + isVoidBlock"
```

---

## Task 3: Engine — void-aware merge/split

**Files:** Modify `…/engine/transforms.ts`; Test `…/engine/transforms.test.ts`.

- [ ] **Step 1: Add failing tests** (append to `transforms.test.ts`)

```ts
import { mergeBlockBackward, splitBlock } from './transforms';

describe('void-aware merge/split', () => {
  const att = (id: string): Block => ({
    id,
    type: 'attachment',
    name: 'f',
    status: 'ready',
    inlines: [],
  });
  it('mergeBlockBackward removes a preceding void instead of concatenating text', () => {
    const d: RichDoc = {
      blocks: [att('v'), { id: 'p', type: 'paragraph', inlines: [{ text: 'hi', marks: [] }] }],
    };
    const r = mergeBlockBackward(d, 'p');
    // the void is removed; the paragraph survives
    expect(r.doc.blocks.map((b) => b.id)).toEqual(['p']);
    expect(r.doc.blocks[0].inlines[0].text).toBe('hi');
  });
  it('splitBlock on a void is a no-op (same ref)', () => {
    const d: RichDoc = { blocks: [att('v')] };
    expect(splitBlock(d, { blockId: 'v', offset: 0 }).doc).toBe(d);
  });
});
```

- [ ] **Step 2: Run — fail.**

- [ ] **Step 3: Implement** — in `transforms.ts`, import `isVoidBlock` from `./attachment` and add guards:

In `splitBlock`, right after resolving `block`:

```ts
const block = doc.blocks[idx];
if (isVoidBlock(block)) return { doc, selection: collapsed(point) }; // can't split a void
```

In `mergeBlockBackward`, after resolving `prev`/`cur`:

```ts
const prev = doc.blocks[idx - 1];
const cur = doc.blocks[idx];
// If either neighbor is a void, "merge backward" means delete the void, not
// concatenate text. Remove whichever is void; keep the other (and its caret).
if (isVoidBlock(prev)) {
  const blocks = doc.blocks.slice();
  blocks.splice(idx - 1, 1); // drop the void; `cur` shifts up
  return { doc: { blocks }, selection: collapsed({ blockId: cur.id, offset: 0 }) };
}
if (isVoidBlock(cur)) {
  const blocks = doc.blocks.slice();
  blocks.splice(idx, 1); // drop the void; caret to end of prev
  return { doc: { blocks }, selection: collapsed({ blockId: prev.id, offset: blockLength(prev) }) };
}
```

(Place these BEFORE the existing `joinOffset`/concatenation logic. `collapsed` and `blockLength` are already in scope in `transforms.ts`.)

- [ ] **Step 4: Run — pass** (`npm test -- src/components/RichText/engine/transforms.test.ts`). **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/transforms.ts packages/design-system/src/components/RichText/engine/transforms.test.ts
git commit -m "feat(RichText): void-aware mergeBlockBackward + splitBlock"
```

---

## Task 4: Render — `RichTextAttachment` + renderDoc case

**Files:** Create `…/RichTextEditor/RichTextAttachment.tsx`; Modify `…/engine/renderDoc.tsx`; Test `…/engine/renderDoc.test.tsx`.

> NOTE: `renderDoc` lives in `engine/` (no i18n/component deps today). The attachment
> visual is a component in `RichTextEditor/` to keep `<Image>`/i18n out of the pure
> engine. `renderDoc` imports it lazily via an injected renderer option to avoid a
> layering violation — OR (simpler, chosen here) `renderDoc` emits the `<figure>` +
> minimal markup directly and the editor styles it; the spinner/Image are imported
> into `renderDoc.tsx`. Since `renderDoc.tsx` already imports React and is `.tsx`,
> importing `<Image>`/`<CircularProgress>` is acceptable (they're library-internal).
> Use this direct approach: put the attachment JSX in `RichTextAttachment.tsx` and
> import it from `renderDoc.tsx`.

- [ ] **Step 1: Write `RichTextAttachment.test.tsx`** (failing)

```tsx
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '../../i18n';
import { RichTextAttachment } from './RichTextAttachment';
import type { Block } from '../RichText/engine/model';

const att = (over: Partial<Block>): Block => ({
  id: 'a',
  type: 'attachment',
  inlines: [],
  ...over,
});
const wrap = (b: Block) =>
  render(
    <I18nProvider locale="en">
      <RichTextAttachment block={b} />
    </I18nProvider>,
  );

it('renders an image preview when ready + image mime', () => {
  wrap(
    att({ status: 'ready', src: 'http://u/p.png', mime: 'image/png', name: 'p.png', alt: 'Chart' }),
  );
  expect(screen.getByRole('img', { name: 'Chart' })).toBeInTheDocument();
});
it('renders a file chip (download link) for a non-image', () => {
  wrap(att({ status: 'ready', src: 'http://u/d.pdf', mime: 'application/pdf', name: 'd.pdf' }));
  const link = screen.getByRole('link', { name: /d\.pdf/i });
  expect(link).toHaveAttribute('href', 'http://u/d.pdf');
});
it('renders a spinner while uploading', () => {
  wrap(att({ status: 'uploading', name: 'p.png' }));
  expect(screen.getByText('p.png')).toBeInTheDocument();
  expect(screen.getByLabelText('Uploading…')).toBeInTheDocument();
});
it('renders an error state with retry/remove action hooks', () => {
  wrap(att({ status: 'error', name: 'p.png' }));
  expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
  expect(document.querySelector('[data-attachment-action="retry"]')).toBeTruthy();
  expect(document.querySelector('[data-attachment-action="remove"]')).toBeTruthy();
});
```

- [ ] **Step 2: Run — fail.**

- [ ] **Step 3: Implement `RichTextAttachment.tsx`**

```tsx
// RichTextAttachment.tsx — renders one attachment block's body (spinner / error /
// image preview / file chip). Pure presentational: the error Retry/Remove buttons
// carry `data-attachment-action` + `data-block-id` hooks that the editor delegates
// (renderDoc stays callback-free). The read-only viewer renders the same markup;
// its action buttons simply have no editor delegate.
import { Image } from '../Image';
import { CircularProgress } from '../CircularProgress';
import { useTranslation } from '../../i18n';
import type { Block } from '../RichText/engine/model';
import { safeHref } from '../RichText/engine/safeHref';
import { AttachFileIcon } from './icons';
import styles from './RichTextEditor.module.scss';

function isImage(block: Block): boolean {
  if (block.mime) return block.mime.startsWith('image/');
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(block.src ?? '');
}

export function RichTextAttachment({ block }: { block: Block }) {
  const t = useTranslation();
  const name = block.name ?? '';

  if (block.status === 'uploading') {
    return (
      <span className={styles.attachmentLoading}>
        <CircularProgress size="sm" aria-label={t('richTextEditor.uploadingFile')} />
        <span className={styles.attachmentName}>{name}</span>
      </span>
    );
  }
  if (block.status === 'error') {
    return (
      <span className={styles.attachmentError}>
        <span className={styles.attachmentName}>{name}</span>
        <span className={styles.attachmentLabel}>{t('richTextEditor.uploadFailed')}</span>
        <button type="button" data-attachment-action="retry" data-block-id={block.id}>
          {t('richTextEditor.uploadRetry')}
        </button>
        <button type="button" data-attachment-action="remove" data-block-id={block.id}>
          {t('richTextEditor.uploadRemove')}
        </button>
      </span>
    );
  }
  // ready
  const href = safeHref(block.src ?? '');
  if (isImage(block) && href) {
    return <Image src={href} alt={block.alt ?? name} width={block.width} height={block.height} />;
  }
  return (
    <a className={styles.attachmentChip} href={href} download rel="noopener noreferrer">
      <AttachFileIcon />
      <span className={styles.attachmentName}>{name}</span>
    </a>
  );
}
```

> `AttachFileIcon` is added in Task 7. If you implement this task first, add a tiny
> placeholder export `export function AttachFileIcon(){return <svg {...base}/>}` and
> flesh it out in Task 7. Confirm `<Image>`'s `width`/`height` accept `number | undefined`
> (it extends `ImgHTMLAttributes`, so yes).

- [ ] **Step 4: Add the `renderDoc` case** — in `renderDoc.tsx`'s `renderBlock` switch, add before `default`:

```tsx
    case 'attachment':
      return (
        <figure key={block.id} {...anchor} contentEditable={false} data-attachment="">
          {renderAttachment(block)}
        </figure>
      );
```

At the top of `renderDoc.tsx` add an injectable renderer to avoid a hard engine→component edge, OR import directly. Chosen: import directly (renderDoc is already `.tsx`):

```tsx
import { RichTextAttachment } from '../../RichTextEditor/RichTextAttachment';
const renderAttachment = (block: Block) => <RichTextAttachment block={block} />;
```

> If a circular-import or layering concern surfaces (renderDoc in engine importing
> from RichTextEditor), instead thread an optional `renderAttachment` through
> `RenderDocOptions` and have `RichTextEditor` pass it; the read-only `<RichText>`
> passes a default. Resolve during implementation; prefer the simplest that builds.

- [ ] **Step 5: Add a renderDoc test** (append to `renderDoc.test.tsx`)

```tsx
it('renders an attachment block as a contenteditable=false figure', () => {
  const doc = {
    blocks: [
      {
        id: 'a',
        type: 'attachment' as const,
        status: 'ready' as const,
        src: 'http://u/p.png',
        mime: 'image/png',
        name: 'p.png',
        inlines: [],
      },
    ],
  };
  const { container } = render(
    <I18nProvider locale="en">{renderDoc(doc, { editable: true })}</I18nProvider>,
  );
  const fig = container.querySelector('figure[data-block-id="a"]');
  expect(fig).toBeTruthy();
  expect(fig).toHaveAttribute('contenteditable', 'false');
});
```

> `renderDoc.test.tsx` may not currently wrap in `I18nProvider`; since the attachment
> uses `useTranslation`, wrap this test (and import `I18nProvider`). Other tests are unaffected.

- [ ] **Step 6: Run — pass** (`npm test -- src/components/RichText/engine/renderDoc.test.tsx src/components/RichTextEditor/RichTextAttachment.test.tsx`), `npm run typecheck`. **Step 7: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextAttachment.tsx packages/design-system/src/components/RichTextEditor/RichTextAttachment.test.tsx packages/design-system/src/components/RichText/engine/renderDoc.tsx packages/design-system/src/components/RichText/engine/renderDoc.test.tsx
git commit -m "feat(RichText): render attachment blocks (image/chip/spinner/error)"
```

---

## Task 5: Void-caret selection mapping

**Files:** Modify `…/RichTextEditor/selection.ts`; Test `…/RichTextEditor/selection.test.ts`.

Goal: a DOM selection on/adjacent to a void figure maps to `{ figureId, 0 }`, and `{ voidId, 0 }` maps to a caret just before the figure. Build on the existing `blockElementFor`/`pointFromDom`/`pointToDom`.

- [ ] **Step 1: Add failing tests** (append to `selection.test.ts`)

```ts
import { pointFromDom, pointToDom } from './selection';

function root(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

describe('void-block selection', () => {
  it('a selection ON the figure maps to {figureId, 0}', () => {
    const r = root(
      '<p data-block-id="p">hi</p><figure data-block-id="v" contenteditable="false"></figure>',
    );
    const fig = r.querySelector('[data-block-id="v"]')!;
    expect(pointFromDom(r, fig, 0)).toEqual({ blockId: 'v', offset: 0 });
  });
  it('a root-level caret at the figure index maps to the void {id,0}', () => {
    const r = root(
      '<p data-block-id="p">hi</p><figure data-block-id="v" contenteditable="false"></figure>',
    );
    // caret at root offset 1 == just before the figure (child index 1)
    expect(pointFromDom(r, r, 1)).toEqual({ blockId: 'v', offset: 0 });
  });
  it('pointToDom for a void returns a position just before the figure', () => {
    const r = root(
      '<p data-block-id="p">hi</p><figure data-block-id="v" contenteditable="false"></figure>',
    );
    const dom = pointToDom(r, { blockId: 'v', offset: 0 })!;
    // node is the root, offset is the figure's child index
    const figIndex = Array.prototype.indexOf.call(
      r.childNodes,
      r.querySelector('[data-block-id="v"]'),
    );
    expect(dom.node).toBe(r);
    expect(dom.offset).toBe(figIndex);
  });
});
```

- [ ] **Step 2: Run — fail.**

- [ ] **Step 3: Implement** in `selection.ts`:

(a) In `pointFromDom`, before the existing `blockElementFor` resolution, handle root-level anchors adjacent to a void figure:

```ts
export function pointFromDom(root: HTMLElement, node: Node, offset: number): Point | null {
  // Root-level caret (between blocks): if it sits at the boundary of a void
  // figure, resolve to that void's {id, 0}.
  if (node === root) {
    const children = root.childNodes;
    const at = children[offset] as HTMLElement | undefined; // element just after the caret
    const before = children[offset - 1] as HTMLElement | undefined;
    const fig =
      at && at.nodeType === 1 && at.hasAttribute('data-block-id') && at.tagName === 'FIGURE'
        ? at
        : before &&
            before.nodeType === 1 &&
            before.hasAttribute?.('data-block-id') &&
            before.tagName === 'FIGURE'
          ? before
          : null;
    if (fig) return { blockId: fig.getAttribute('data-block-id')!, offset: 0 };
  }
  const blockEl = blockElementFor(root, node);
  if (!blockEl) return null;
  // A void figure has no text; offset is always 0.
  if (blockEl.tagName === 'FIGURE' && blockEl.hasAttribute('data-block-id')) {
    return { blockId: blockEl.getAttribute('data-block-id')!, offset: 0 };
  }
  return {
    blockId: blockEl.getAttribute('data-block-id')!,
    offset: offsetWithinBlock(blockEl, node, offset),
  };
}
```

(b) In `pointToDom`, before the TreeWalker logic, handle a void target:

```ts
export function pointToDom(root: HTMLElement, point: Point): { node: Node; offset: number } | null {
  const blockEl = root.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(point.blockId)}"]`);
  if (!blockEl) return null;
  // Void figure: caret can't go inside — return a position just before it in the root.
  if (blockEl.tagName === 'FIGURE') {
    const parent = blockEl.parentNode!;
    const index = Array.prototype.indexOf.call(parent.childNodes, blockEl);
    return { node: parent, offset: index };
  }
  // …existing TreeWalker body unchanged…
}
```

> `blockElementFor` already returns the figure (it has `data-block-id`), so case (a)
> only needs the root-anchor branch. Keep the existing exact-behavior for non-void
> blocks (the figure short-circuits run zero times otherwise).

- [ ] **Step 4: Run — pass** (`npm test -- src/components/RichTextEditor/selection.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/selection.ts packages/design-system/src/components/RichTextEditor/selection.test.ts
git commit -m "feat(RichTextEditor): void-caret selection mapping for attachment figures"
```

> **Runtime caveat (flag, not a placeholder):** real-browser caret placement around
> `contentEditable=false` varies; arrow-over and click-beside behavior is verified
> manually/Playwright in Task 13's demo. The unit tests above lock the model↔DOM
> mapping that the editor relies on.

---

## Task 6: Serialization — attachment to/from HTML + to Markdown

**Files:** Modify `toHtml.ts`, `toMarkdown.ts`, `fromHtml.ts`; Tests alongside.

- [ ] **Step 1: Add failing tests**

`toHtml.test.ts`:

```ts
it('serializes a ready image attachment to <figure><img>', () => {
  const doc = {
    blocks: [
      {
        id: 'a',
        type: 'attachment' as const,
        status: 'ready' as const,
        src: 'http://u/p.png',
        mime: 'image/png',
        alt: 'Chart',
        name: 'p.png',
        inlines: [],
      },
    ],
  };
  expect(toHtml(doc)).toBe('<figure><img src="http://u/p.png" alt="Chart"></figure>');
});
it('serializes a ready file attachment to a download link', () => {
  const doc = {
    blocks: [
      {
        id: 'a',
        type: 'attachment' as const,
        status: 'ready' as const,
        src: 'http://u/d.pdf',
        mime: 'application/pdf',
        name: 'd.pdf',
        inlines: [],
      },
    ],
  };
  expect(toHtml(doc)).toBe('<a href="http://u/d.pdf" download>d.pdf</a>');
});
it('skips a non-ready attachment', () => {
  const doc = {
    blocks: [
      {
        id: 'a',
        type: 'attachment' as const,
        status: 'uploading' as const,
        name: 'p',
        inlines: [],
      },
    ],
  };
  expect(toHtml(doc)).toBe('');
});
```

`toMarkdown.test.ts`:

```ts
it('serializes attachments to markdown image / link', () => {
  expect(
    toMarkdown({
      blocks: [
        {
          id: 'a',
          type: 'attachment' as const,
          status: 'ready' as const,
          src: 'http://u/p.png',
          mime: 'image/png',
          alt: 'Chart',
          inlines: [],
        },
      ],
    }),
  ).toBe('![Chart](http://u/p.png)');
  expect(
    toMarkdown({
      blocks: [
        {
          id: 'b',
          type: 'attachment' as const,
          status: 'ready' as const,
          src: 'http://u/d.pdf',
          name: 'd.pdf',
          inlines: [],
        },
      ],
    }),
  ).toBe('[d.pdf](http://u/d.pdf)');
});
```

`fromHtml.test.ts`:

```ts
it('parses <img> into a ready image attachment block', () => {
  const doc = fromHtml('<p>x</p><figure><img src="http://u/p.png" alt="Chart"></figure>');
  const att = doc.blocks.find((b) => b.type === 'attachment')!;
  expect(att.src).toBe('http://u/p.png');
  expect(att.alt).toBe('Chart');
  expect(att.mime).toBe('image/*');
  expect(att.status).toBe('ready');
});
```

- [ ] **Step 2: Run — fail.**

- [ ] **Step 3: Implement.**

`toHtml.ts` — add an `isImage` check + an `attachment` case in `blockHtml`:

```ts
function attachmentIsImage(block: Block): boolean {
  if (block.mime) return block.mime.startsWith('image/');
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(block.src ?? '');
}
```

In `blockHtml`'s switch:

```ts
    case 'attachment': {
      if (block.status && block.status !== 'ready') return '';
      const safe = safeHref(block.src ?? '');
      if (safe === undefined) return '';
      if (attachmentIsImage(block)) {
        const alt = escapeAttr(block.alt ?? block.name ?? '');
        return `<figure><img src="${escapeAttr(safe)}" alt="${alt}"></figure>`;
      }
      return `<a href="${escapeAttr(safe)}" download>${escapeHtml(block.name ?? safe)}</a>`;
    }
```

(`escapeAttr`/`escapeHtml`/`safeHref` already imported.)

> The top-level `toHtml` loop calls `blockHtml` for non-list blocks, so attachment is
> handled. A skipped (`''`) block contributes nothing — fine.

`toMarkdown.ts` — in `blockMd`, before the inline computation, handle attachment:

```ts
if (block.type === 'attachment') {
  if (block.status && block.status !== 'ready') return '';
  const url = safeHref(block.src ?? '') ?? '';
  const isImg = block.mime
    ? block.mime.startsWith('image/')
    : /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(block.src ?? '');
  return isImg ? `![${block.alt ?? block.name ?? ''}](${url})` : `[${block.name ?? url}](${url})`;
}
```

> A skipped attachment returns `''`; the `toMarkdown` join inserts blank lines around
> it. Acceptable (a stray transient block is the consumer's bug, gated by `onUploadingChange`).

`fromHtml.ts` — handle `<img>` at block level. In `collectBlocks`, inside the child loop, BEFORE the `BLOCK_TAGS`/inline branch, add:

```ts
if (
  isElement(child) &&
  (child.tagName === 'IMG' || (child.tagName === 'FIGURE' && child.querySelector('img')))
) {
  flush();
  const img = (child.tagName === 'IMG' ? child : child.querySelector('img')!) as HTMLImageElement;
  const src = safeHref(img.getAttribute('src') ?? '');
  if (src) {
    out.push({
      id: nextId(),
      type: 'attachment',
      inlines: [],
      status: 'ready',
      src,
      mime: 'image/*',
      alt: img.getAttribute('alt') ?? '',
      name: img.getAttribute('alt') ?? '',
    });
  }
  continue;
}
```

> Import `safeHref` into `fromHtml.ts` if not present. `<img>` is currently dropped
> (it's neither a BLOCK_TAG nor handled inline), so this is purely additive.

- [ ] **Step 4: Run — pass** (`npm test -- src/components/RichText/engine/toHtml.test.ts src/components/RichText/engine/toMarkdown.test.ts src/components/RichText/engine/fromHtml.test.ts src/components/RichText/engine/serializeRoundtrip.test.ts`).

> If `serializeRoundtrip.test.ts` asserts exhaustive block coverage, add an attachment case there too.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/toHtml.ts packages/design-system/src/components/RichText/engine/toMarkdown.ts packages/design-system/src/components/RichText/engine/fromHtml.ts packages/design-system/src/components/RichText/engine/*.test.ts
git commit -m "feat(RichText): serialize attachment blocks (HTML out/in, Markdown out)"
```

> **Scope note:** `fromMarkdown` image import is intentionally NOT added (today
> `mdToHtml` flattens `![alt]()` to alt text). Stored RichDoc JSON round-trips
> losslessly; markdown is a lossy export. Documented in the spec's serialization
> section + AGENTS.

---

## Task 7: i18n keys + attach icon

**Files:** Modify `messages.ts`/`en.ts`/`ru.ts`; `…/RichTextEditor/icons.tsx`.

- [ ] **Step 1: Add keys** to `messages.ts` `richTextEditor` interface:

```ts
/** aria-label on the toolbar upload button. */
upload: string;
/** Spinner aria-label while a file uploads. */
uploadingFile: string;
/** Error-state label when an upload fails. */
uploadFailed: string;
/** Retry action on a failed upload. */
uploadRetry: string;
/** Remove action on a failed upload. */
uploadRemove: string;
/** aria-label on a file-chip download link. */
attachmentDownload: string;
```

`en.ts`:

```ts
    upload: 'Add file',
    uploadingFile: 'Uploading…',
    uploadFailed: 'Upload failed',
    uploadRetry: 'Retry',
    uploadRemove: 'Remove',
    attachmentDownload: 'Download',
```

`ru.ts`:

```ts
    upload: 'Добавить файл',
    uploadingFile: 'Загрузка…',
    uploadFailed: 'Не удалось загрузить',
    uploadRetry: 'Повторить',
    uploadRemove: 'Удалить',
    attachmentDownload: 'Скачать',
```

- [ ] **Step 2: Add `AttachFileIcon`** to `icons.tsx` (paperclip):

```tsx
export function AttachFileIcon() {
  return (
    <svg {...base}>
      <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49" />
    </svg>
  );
}
```

- [ ] **Step 3: Typecheck → PASS. Commit**

```bash
git add packages/design-system/src/i18n/ packages/design-system/src/components/RichTextEditor/icons.tsx
git commit -m "feat(RichTextEditor): upload i18n keys + attach icon"
```

---

## Task 8: Upload lifecycle hook (`useUpload`)

**Files:** Create `…/RichTextEditor/useUpload.ts` + `useUpload.test.tsx`.

The hook owns: inserting spinner blocks, running `onUpload` in parallel, settling by id, `onUploadingChange`, and exposing `retry(id)`/`remove(id)`. It calls back into the editor's `commit`/`update` via injected callbacks so it stays testable in isolation.

- [ ] **Step 1: Write `useUpload.test.tsx`** (failing) — drive the hook with a fake editor surface

```tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUpload } from './useUpload';
import { emptyDoc, docFromText } from '../RichText/engine/model';
import type { RichDoc } from '../RichText/engine/model';

function harness(onUpload: (f: File) => Promise<any>, onUploadingChange?: (b: boolean) => void) {
  let doc: RichDoc = docFromText('hi');
  const getValue = () => doc;
  const setValue = (d: RichDoc) => {
    doc = d;
  };
  const caret = () => ({ blockId: doc.blocks[0].id, offset: 0 });
  const { result } = renderHook(() =>
    useUpload({ config: { onUpload, onUploadingChange }, getValue, setValue, getCaret: caret }),
  );
  return { result, getDoc: () => doc };
}

const file = (name: string, type = 'image/png') => new File(['x'], name, { type });

it('inserts a spinner block then swaps to ready on resolve', async () => {
  const onUpload = vi.fn().mockResolvedValue({ url: 'http://u/p.png', mime: 'image/png' });
  const { result, getDoc } = harness(onUpload);
  act(() => {
    result.current.uploadFiles([file('p.png')]);
  });
  // a spinner attachment exists immediately
  expect(getDoc().blocks.some((b) => b.type === 'attachment' && b.status === 'uploading')).toBe(
    true,
  );
  await waitFor(() => {
    expect(getDoc().blocks.some((b) => b.type === 'attachment' && b.status === 'ready')).toBe(true);
  });
  expect(onUpload).toHaveBeenCalledTimes(1);
});

it('marks error on reject and retry re-invokes onUpload', async () => {
  const onUpload = vi
    .fn()
    .mockRejectedValueOnce(new Error('nope'))
    .mockResolvedValueOnce({ url: 'http://u/p.png', mime: 'image/png' });
  const { result, getDoc } = harness(onUpload);
  act(() => {
    result.current.uploadFiles([file('p.png')]);
  });
  await waitFor(() => expect(getDoc().blocks.some((b) => b.status === 'error')).toBe(true));
  const errId = getDoc().blocks.find((b) => b.status === 'error')!.id;
  act(() => {
    result.current.retry(errId);
  });
  await waitFor(() => expect(getDoc().blocks.some((b) => b.status === 'ready')).toBe(true));
  expect(onUpload).toHaveBeenCalledTimes(2);
});

it('fires onUploadingChange(true) then (false) around a batch', async () => {
  const onUploadingChange = vi.fn();
  const onUpload = vi.fn().mockResolvedValue({ url: 'http://u/p.png' });
  const { result } = harness(onUpload, onUploadingChange);
  act(() => {
    result.current.uploadFiles([file('a.png'), file('b.png')]);
  });
  expect(onUploadingChange).toHaveBeenCalledWith(true);
  await waitFor(() => expect(onUploadingChange).toHaveBeenCalledWith(false));
  expect(onUpload).toHaveBeenCalledTimes(2);
});

it('multi-file keeps file order', async () => {
  const onUpload = vi.fn((f: File) =>
    Promise.resolve({ url: `http://u/${f.name}`, mime: 'image/png' }),
  );
  const { result, getDoc } = harness(onUpload);
  act(() => {
    result.current.uploadFiles([file('1.png'), file('2.png'), file('3.png')]);
  });
  const names = getDoc()
    .blocks.filter((b) => b.type === 'attachment')
    .map((b) => b.name);
  expect(names).toEqual(['1.png', '2.png', '3.png']);
});
```

- [ ] **Step 2: Run — fail.**

- [ ] **Step 3: Implement `useUpload.ts`**

```ts
// useUpload.ts — drives the attachment upload lifecycle for RichTextEditor. Owns
// the in-flight File map (for retry), inserts spinner blocks, runs onUpload in
// parallel, and settles each block by id. Editor I/O is injected so the hook is
// unit-testable without a DOM editor.
import { useCallback, useRef } from 'react';
import type { RichDoc, Point } from '../RichText/engine/model';
import { insertAttachmentBlock, updateAttachmentBlock } from '../RichText/engine/attachment';

export interface UploadConfig {
  onUpload: (file: File) => Promise<{
    url: string;
    name?: string;
    mime?: string;
    width?: number;
    height?: number;
    alt?: string;
  }>;
  accept?: string;
  onUploadingChange?: (uploading: boolean) => void;
}

interface UseUploadArgs {
  config: UploadConfig;
  getValue: () => RichDoc;
  /** Apply a new doc (the editor wires this to its controlled onChange/commit). */
  setValue: (doc: RichDoc) => void;
  /** Current caret Point (where to insert). */
  getCaret: () => Point;
}

export function useUpload({ config, getValue, setValue, getCaret }: UseUploadArgs) {
  const filesRef = useRef(new Map<string, File>()); // block id → File (for retry)
  const inflightRef = useRef(0);

  const setInflight = useCallback(
    (delta: number) => {
      const prev = inflightRef.current;
      inflightRef.current = Math.max(0, prev + delta);
      if (prev === 0 && inflightRef.current > 0) config.onUploadingChange?.(true);
      if (prev > 0 && inflightRef.current === 0) config.onUploadingChange?.(false);
    },
    [config],
  );

  const runUpload = useCallback(
    (id: string, file: File) => {
      setInflight(1);
      config
        .onUpload(file)
        .then(
          (res) => {
            filesRef.current.delete(id);
            setValue(
              updateAttachmentBlock(getValue(), id, {
                status: 'ready',
                src: res.url,
                name: res.name ?? file.name,
                mime: res.mime ?? file.type,
                width: res.width,
                height: res.height,
                alt: res.alt,
              }),
            );
          },
          () => {
            setValue(updateAttachmentBlock(getValue(), id, { status: 'error' }));
          },
        )
        .finally(() => setInflight(-1));
    },
    [config, getValue, setValue, setInflight],
  );

  const uploadFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      // Insert all spinner blocks first (in order), then kick off uploads.
      let doc = getValue();
      let caret = getCaret();
      const ids: string[] = [];
      for (const file of files) {
        const r = insertAttachmentBlock(doc, caret, {
          name: file.name,
          mime: file.type,
          status: 'uploading',
        });
        doc = r.doc;
        caret = r.selection.anchor; // next insert goes after the previous (trailing paragraph)
        // the attachment block is the one just before the caret's block
        const caretIdx = doc.blocks.findIndex((b) => b.id === caret.blockId);
        const attId = doc.blocks[caretIdx - 1].id;
        ids.push(attId);
        filesRef.current.set(attId, file);
      }
      setValue(doc);
      files.forEach((file, i) => runUpload(ids[i], file));
    },
    [getValue, getCaret, setValue, runUpload],
  );

  const retry = useCallback(
    (id: string) => {
      const file = filesRef.current.get(id);
      if (!file) return;
      setValue(updateAttachmentBlock(getValue(), id, { status: 'uploading' }));
      runUpload(id, file);
    },
    [getValue, setValue, runUpload],
  );

  const remove = useCallback(
    (id: string) => {
      filesRef.current.delete(id);
      const doc = getValue();
      const blocks = doc.blocks.filter((b) => b.id !== id);
      setValue({ blocks: blocks.length ? blocks : getValue().blocks });
    },
    [getValue, setValue],
  );

  return { uploadFiles, retry, remove, accept: config.accept };
}
```

> Note on history/undo: `setValue` here is the editor's controlled update. In Task 9
> the editor passes a `setValue` that records the INITIAL insert as one history step
> and applies async settles WITHOUT a new history entry (e.g. a `commitSilent`).
> The hook itself is history-agnostic. `remove` uses `removeBlockUnit` semantics in
> the editor; here a plain filter suffices for the hook test (empty-doc guard lives
> in the editor's delete path).

- [ ] **Step 4: Run — pass** (`npm test -- src/components/RichTextEditor/useUpload.test.tsx`). **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/useUpload.ts packages/design-system/src/components/RichTextEditor/useUpload.test.tsx
git commit -m "feat(RichTextEditor): useUpload lifecycle hook"
```

---

## Task 9: Wire upload into `RichTextEditor` (prop, paste, toolbar, error delegation)

**Files:** Modify `…/RichTextEditor/RichTextEditor.tsx`, `RichTextToolbar.tsx`; Test `RichTextEditor.test.tsx`.

- [ ] **Step 1: Add failing component tests** (append to `RichTextEditor.test.tsx`)

```tsx
import { UploadConfig } from './useUpload';

describe('upload', () => {
  function up(over: Partial<UploadConfig> = {}): UploadConfig {
    return {
      onUpload: vi.fn().mockResolvedValue({ url: 'http://u/p.png', mime: 'image/png' }),
      ...over,
    };
  }
  it('pasting a file inserts an attachment and calls onUpload', async () => {
    const cfg = up();
    function Harness() {
      const [doc, setDoc] = useState(docFromText('hi'));
      return <RichTextEditor value={doc} onChange={setDoc} upload={cfg} />;
    }
    renderEditor(<Harness />);
    mockReadSelection.mockReturnValue({
      anchor: {
        blockId: document.querySelector('[data-block-id]')!.getAttribute('data-block-id')!,
        offset: 0,
      },
      focus: {
        blockId: document.querySelector('[data-block-id]')!.getAttribute('data-block-id')!,
        offset: 0,
      },
    });
    const box = screen.getByRole('textbox');
    const file = new File(['x'], 'p.png', { type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(file);
    box.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }) as any,
    );
    await waitFor(() => expect(cfg.onUpload).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(document.querySelector('figure[data-block-id]')).toBeTruthy());
  });
  it('no upload config → file paste is ignored (no attachment)', () => {
    function Harness() {
      const [doc, setDoc] = useState(docFromText('hi'));
      return <RichTextEditor value={doc} onChange={setDoc} />;
    }
    renderEditor(<Harness />);
    const box = screen.getByRole('textbox');
    const dt = new DataTransfer();
    dt.items.add(new File(['x'], 'p.png', { type: 'image/png' }));
    box.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }) as any,
    );
    expect(document.querySelector('figure[data-block-id]')).toBeNull();
  });
});
```

> jsdom supports `DataTransfer`/`ClipboardEvent` unevenly; if `clipboardData` can't be
> attached, fall back to calling the editor's paste handler with a stubbed event
> exposing `clipboardData.files`. Keep the assertion (onUpload called, figure rendered).

- [ ] **Step 2: Run — fail.**

- [ ] **Step 3: Implement** in `RichTextEditor.tsx`:

3a. Import + prop:

```ts
import { useUpload, type UploadConfig } from './useUpload';
```

Add to `RichTextEditorProps`:

```ts
  /**
   * Enable file upload: a toolbar button (when `toolbar`) and clipboard-file paste.
   * `onUpload(file)` resolves with where the file landed; images render inline,
   * other files as chips. Reject to show a retry/remove error. `onUploadingChange`
   * fires while uploads are in flight (wire it to your submit button). Omit to
   * disable. Ignored when `readOnly`.
   */
  upload?: UploadConfig;
```

Destructure `upload,` in the component args.

3b. Instantiate the hook (after `commit` is defined). The hook's `setValue` records one history step for the synchronous insert and a silent update for settles. Simplest correct wiring:

```ts
const uploadOn = !!upload && !readOnly;
const uploader = useUpload({
  config: upload ?? { onUpload: async () => ({ url: '' }) },
  getValue: () => latest.current.value,
  setValue: (doc) =>
    commit(
      {
        doc,
        selection: pendingSelectionRef.current ??
          readSelection(rootRef.current!) ?? {
            anchor: { blockId: doc.blocks[0].id, offset: 0 },
            focus: { blockId: doc.blocks[0].id, offset: 0 },
          },
      },
      'other',
    ),
  getCaret: () =>
    readSelection(rootRef.current!)?.anchor ?? {
      blockId: latest.current.value.blocks[0].id,
      offset: 0,
    },
});
```

> The async settles calling `commit` will each create a history entry. To honor "no
> undo through settles", thread a `commitSilent` (records onChange + pendingSelection
> but does NOT push history) and have `useUpload` use it for `updateAttachmentBlock`
> results while the initial insert uses `commit`. Add `commitSilent` next to
> `commit`: same body minus the `historyRecord`/`syncHistoryFlags` lines. Pass both
> into the hook (split `setValue` into `applyInsert` and `applySettle`). Implement
> this split — it's the clean version of the note in Task 8.

3c. Paste: in the existing `onPaste` handler, at the very top (before HTML handling):

```ts
if (uploadOn) {
  const files = Array.from(e.clipboardData?.files ?? []);
  if (files.length > 0) {
    e.preventDefault();
    uploader.uploadFiles(files);
    return;
  }
}
```

> `uploadOn`/`uploader` are component-scope; the paste effect closes over them — add
> to its dependency array (or read via a ref like other handlers do).

3d. Error-action delegation: add a click handler on the editor root that catches the attachment error buttons:

```ts
const onRootClick = useCallback(
  (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest('[data-attachment-action]');
    if (!el) return;
    const id = el.getAttribute('data-block-id')!;
    const action = el.getAttribute('data-attachment-action');
    if (action === 'retry') uploader.retry(id);
    else if (action === 'remove') uploader.remove(id);
  },
  [uploader],
);
```

Attach `onClick={onRootClick}` to the editable `<div>`.

3e. Toolbar: pass `upload` presence + a trigger down. Add to the toolbar branch:

```tsx
        <RichTextToolbar … onUpload={uploadOn ? (files) => uploader.uploadFiles(files) : undefined} uploadAccept={upload?.accept} />
```

- [ ] **Step 4: Implement the toolbar button** in `RichTextToolbar.tsx`:

Add props:

```ts
  /** When set, renders an upload button that opens a file picker. */
  onUpload?: (files: File[]) => void;
  uploadAccept?: string;
```

Render (near the link button), with a hidden input:

```tsx
{
  onUpload && (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={uploadAccept}
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onUpload(files);
          e.target.value = '';
        }}
      />
      <Button
        size="sm"
        variant="ghost"
        iconOnly
        aria-label={t('richTextEditor.upload')}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <AttachFileIcon />
      </Button>
    </>
  );
}
```

Add `const fileInputRef = useRef<HTMLInputElement>(null);`, import `useRef` + `AttachFileIcon`.

- [ ] **Step 5: Run — pass** (`npm test -- src/components/RichTextEditor/RichTextEditor.test.tsx`), `npm run typecheck`. **Step 6: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx packages/design-system/src/components/RichTextEditor/RichTextToolbar.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx
git commit -m "feat(RichTextEditor): wire upload (prop, paste, toolbar button, error actions)"
```

---

## Task 10: Hide "Turn into" for attachment blocks

**Files:** Modify `RichTextBlockMenu.tsx` + `RichTextBlockControls.tsx` (pass the active block's type) + test.

- [ ] **Step 1: Add a failing test** to `RichTextBlockControls.test.tsx`: when `activeBlockType === 'attachment'`, the "Turn into" menuitem is absent but Duplicate/Delete remain.

```tsx
it('omits Turn into for an attachment block', async () => {
  render(<Harness activeBlockType="attachment" menuOpen />);
  await userEvent.click(screen.getByRole('button', { name: 'Block actions' }));
  expect(screen.queryByRole('menuitem', { name: /turn into/i })).toBeNull();
  expect(screen.getByRole('menuitem', { name: /duplicate/i })).toBeInTheDocument();
});
```

> Add an `activeBlockType?: BlockType` prop to the Harness + components.

- [ ] **Step 2: Run — fail.**

- [ ] **Step 3: Implement** — thread `activeBlockType` from `RichTextEditor` (derive from `activeBlockId`) → `RichTextBlockControls` → `RichTextBlockMenu`; in `RichTextBlockMenu`, wrap the `<DropdownMenu.Sub>` (Turn into) in `{blockType !== 'attachment' && ( … )}`.

- [ ] **Step 4: Run — pass. Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextBlockMenu.tsx packages/design-system/src/components/RichTextEditor/RichTextBlockControls.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx packages/design-system/src/components/RichTextEditor/RichTextBlockControls.test.tsx
git commit -m "feat(RichTextEditor): hide Turn into for attachment blocks"
```

---

## Task 11: SCSS — attachment styles

**Files:** Modify `…/RichTextEditor/RichTextEditor.module.scss` (tokens only).

- [ ] **Step 1: Add** (verify token names against `tokens.scss`; substitute nearest if needed):

```scss
.attachmentLoading,
.attachmentError {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-muted);
  color: var(--color-fg-muted);
}

.attachmentChip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-fg);
  text-decoration: none;
}

.attachmentName {
  font-weight: var(--font-weight-medium);
}
.attachmentLabel {
  color: var(--color-fg-danger);
}
```

> `figure[data-block-id]` default margin: the engine forbids component margins, but a
> `<figure>` has UA margin. Reset it in the prose styles or here: `figure { margin: 0; }`
> is layout-ish — instead the attachment `<figure>` should carry NO class and the
> reset belongs in `RichText/prose` (where block element resets already live). Add
> `figure { margin: 0; }` to `prose` if a margin appears in the demo.

- [ ] **Step 2: `npm run lint:css` → PASS. Step 3: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss
git commit -m "style(RichTextEditor): attachment block styles"
```

---

## Task 12: Exports + JSDoc + AGENTS

**Files:** `…/RichTextEditor/index.ts`, `src/index.ts`, `RichTextEditor.tsx` (JSDoc @remarks), `AGENTS.md`.

- [ ] **Step 1: Export types** — in `…/RichTextEditor/index.ts`:

```ts
export type { UploadConfig, UploadResult } from './useUpload';
```

> If `UploadResult` isn't a named export yet, extract the inline result type in
> `useUpload.ts` into `export interface UploadResult { url: string; name?: string; mime?: string; width?: number; height?: number; alt?: string }` and use it in `UploadConfig`.

Confirm `src/index.ts` re-exports from `./components/RichTextEditor` (it already re-exports `RichTextEditorProps`); add the two types there too.

- [ ] **Step 2: Add `@remarks` anti-patterns** to the `RichTextEditor` JSDoc:

```ts
 * - ❌ Persisting/submitting the doc while an upload is in flight — gate your submit
 *   on `upload.onUploadingChange` (transient blocks are skipped by `toHtml`/`toMarkdown`,
 *   but the model still carries them until they settle).
 * - ❌ Doing validation only in the picker `accept` — it's a hint, not enforcement
 *   (paste bypasses it). Validate (size/type) inside `onUpload` and reject.
```

- [ ] **Step 3: AGENTS.md** — add an `**`upload` prop**` sub-section mirroring the `blockControls` one, noting: toolbar button + paste, `onUpload`/`accept`/`onUploadingChange`, image-vs-chip by mime, consumer validation, attachments are void blocks managed by `blockControls`, markdown image import not supported (JSON lossless).

- [ ] **Step 4: typecheck + `npm pack --dry-run -w @eocrm/design-system` (no test files). Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/index.ts packages/design-system/src/index.ts packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx packages/design-system/src/components/RichTextEditor/useUpload.ts packages/design-system/AGENTS.md
git commit -m "docs(RichTextEditor): export Upload types, JSDoc, AGENTS for upload"
```

---

## Task 13: Playground demo

**Files:** Modify `packages/playground/src/pages/components/RichTextEditorDemo.tsx`.

- [ ] **Step 1: Add a mock uploader + state**:

```tsx
const [uploadDoc, setUploadDoc] = useState<RichDoc>(() =>
  docFromText('Paste a screenshot or use the toolbar button to attach a file. '),
);
// Mock: turn the File into a local object URL after a short delay.
const mockUpload = (file: File) =>
  new Promise<{ url: string; mime: string; name: string }>((resolve) =>
    setTimeout(
      () => resolve({ url: URL.createObjectURL(file), mime: file.type, name: file.name }),
      600,
    ),
  );
```

- [ ] **Step 2: Add an `<Example>`** (after the block-controls one):

```tsx
<Example
  title="File upload"
  description="Provide upload={{ onUpload }} to enable a toolbar attach button and clipboard-file paste. Images render inline; other files as a download chip. Uploading shows a spinner; a rejected onUpload shows Retry/Remove. Wire onUploadingChange to your submit button."
  code={`<RichTextEditor value={doc} onChange={setDoc} toolbar
  upload={{ onUpload: (file) => uploadToServer(file) }} />`}
>
  <RichTextEditor
    value={uploadDoc}
    onChange={setUploadDoc}
    toolbar
    upload={{ onUpload: mockUpload, accept: 'image/*,.pdf' }}
    placeholder="Write…"
  />
</Example>
```

- [ ] **Step 3: `make build` → PASS.**

- [ ] **Step 4: Manual/Playwright void-caret verification** (`make dev`): paste an image → spinner → preview; click before/after the image and type; Backspace just after an image removes it; arrow keys move past it; drag-reorder the image via its Slice 1 handle; a file (e.g. PDF) shows a chip; force a rejection (temporarily throw in `mockUpload`) → Retry/Remove. Note any caret quirks and fix in `selection.ts`.

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/pages/components/RichTextEditorDemo.tsx
git commit -m "demo(RichTextEditor): file upload example"
```

---

## Task 14: Gates + Rule 8 review loop + PR

- [ ] **Step 1: Gates** — `npm test`, `npm run typecheck`, `npm run lint:css`, `npm run build`, `npm pack --dry-run -w @eocrm/design-system` (0 test files). All green.
- [ ] **Step 2: Fresh-context Rule 8 review** of `packages/design-system/` across the 10 categories; pay special attention to the void-caret selection edge cases, the upload lifecycle (history/undo, in-flight signal, settle-after-delete), and serialization round-trip. Fix Critical + Important; re-run gates; re-review until "clean enough to stop."
- [ ] **Step 3: Push + PR**

```bash
git push -u origin feat/rte-file-upload-slice2
gh pr create --fill --title "feat(RichTextEditor): file upload + attachment blocks (Slice 2)"
```

- [ ] **Step 4: Wait for `Quality / check`, then merge (squash).**

---

## Self-review (plan vs spec)

**Spec coverage:**

- `upload` config (onUpload/accept/onUploadingChange), no progress, consumer validation → Tasks 8, 9, 12. ✓
- Void `attachment` block model → Task 1. ✓
- renderDoc image/chip/spinner/error → Task 4. ✓
- Void-caret selection → Task 5 (+ manual Task 13). ✓
- Void-aware transforms (insert/update/merge/split + delete-adjacent-void) → Tasks 2, 3. (Backspace/Delete-removes-adjacent-void: `mergeBlockBackward` void-awareness in Task 3 covers Backspace-at-start; the editor's Delete path routes through the same engine — confirm in Task 9 wiring; if a dedicated forward-delete case is needed, add it there.) ✓ (with a noted verify point)
- Upload lifecycle (parallel, ordered, settle-by-id, retry/remove, onUploadingChange, no-undo-through-settle) → Task 8 + Task 9's `commitSilent` split. ✓
- Serialization (HTML out/in, MD out; transient skipped) → Task 6. fromMarkdown image import intentionally deferred (documented). ✓ (scoped)
- Toolbar button + paste, gated on `upload`, readOnly-suppressed → Task 9. ✓
- Hide Turn into for attachments → Task 10. ✓
- i18n en+ru → Task 7. Exports → Task 12. SCSS tokens → Task 11. Demo → Task 13. ✓

**Known scope trims (intentional, documented):** `fromMarkdown` image import (mdToHtml lacks `<img>`); drag-and-drop file upload; block-menu "Upload" item (all Slice-3-or-later).

**Runtime-only unknowns flagged (not placeholders):** exact void-caret browser behavior (Task 5/13), jsdom `ClipboardEvent.files` support (Task 9 fallback), `renderDoc`→component import layering (Task 4 fallback), token-name confirmation (Task 11).

**Type consistency:** `UploadConfig`/`UploadResult`, `AttachmentAttrs`, `insertAttachmentBlock`/`updateAttachmentBlock`/`isVoidBlock`, `status` union, `data-attachment-action` hooks are used consistently across Tasks 1–13.
