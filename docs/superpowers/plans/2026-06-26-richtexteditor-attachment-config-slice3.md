# RichTextEditor Attachment Config (Slice 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user configure a ready attachment in `RichTextEditor` — edit alt text, alignment, and width; replace the file in place; open/download — via a floating config popover opened from a ⚙ gutter button and a "Configure" block-menu item.

**Architecture:** One new persisted field (`align`); `alt`/`width` become editable (width = display px, height cleared so the browser keeps aspect). A new internal `RichTextAttachmentConfig` popover (mirrors `RichTextLinkEditor`'s Floating-UI portal pattern) drives field changes through the editor's existing `commit`; Replace reuses `useUpload` via a new `replace(id, file)`. Render adds `data-align` (CSS `text-align`); HTML serialization round-trips `align`+`width` (Markdown drops them).

**Tech Stack:** React + TS, the in-house RichText engine, `@floating-ui/react-dom`, DS `Slider`/`Input`/`Button`, SCSS modules + tokens, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-26-richtexteditor-attachment-config-slice3-design.md`

---

## Conventions for every task

- Run tests from repo root: `npm test -- <path>` (Vitest `globals: true` — do NOT import `describe/it/expect/vi`).
- Engine: `packages/design-system/src/components/RichText/engine/`. Editor: `packages/design-system/src/components/RichTextEditor/`.
- After each task: `npx prettier --write <changed files>`, then commit with the task's message.
- If the manifest test fails (new composition), run `npm run build:manifest -w @eocrm/design-system` and include the regenerated file.
- Library changes → PR. Branch first (Task 0).

## File structure

**Create:**

- `…/RichTextEditor/RichTextAttachmentConfig.tsx` (+ `.test.tsx`) — the floating popover form.

**Modify:**

- `…/RichText/engine/model.ts` — `align` field on `Block`.
- `…/RichText/engine/attachment.ts` — `AttachmentAttrs.align` + `clearAttachmentFields`.
- `…/RichText/engine/renderDoc.tsx` — `data-align` on the attachment `<figure>`.
- `…/RichText/engine/toHtml.ts`, `fromHtml.ts` — serialize/parse `align` + `width`.
- `…/RichTextEditor/useUpload.ts` — `replace(id, file)`.
- `…/RichTextEditor/RichTextBlockControls.tsx` — ⚙ trigger (when configurable).
- `…/RichTextEditor/RichTextBlockMenu.tsx` — "Configure" item for attachments.
- `…/RichTextEditor/RichTextEditor.tsx` — config state, field handlers, replace picker, render popover.
- `…/RichTextEditor/RichTextEditor.module.scss` — `text-align` per `data-align` + popover styling reuse.
- `…/RichTextEditor/icons.tsx` — `GearIcon`.
- i18n `messages.ts`/`en.ts`/`ru.ts`.
- `packages/design-system/AGENTS.md`; `packages/playground/src/pages/components/RichTextEditorDemo.tsx`.

No `src/index.ts` change (no new public export — popover is internal; `UploadConfig`/`UploadResult` already exported).

---

## Task 0: Branch

- [ ] **Step 1**

```bash
cd /Users/dpws/projects/design-system
git checkout main && git pull --ff-only
git checkout -b feat/rte-attachment-config-slice3
git config --get core.hooksPath   # must print .husky/_
```

---

## Task 1: Model `align` + `AttachmentAttrs.align` + `clearAttachmentFields`

**Files:** Modify `model.ts`, `attachment.ts`; Test `attachment.test.ts`, `model.test.ts`.

- [ ] **Step 1: Add the model field** — in `model.ts`, in the attachment fields on `Block` (after `alt?`):

```ts
  /** Attachment image alignment within the editor width. Absent = left. */
  align?: 'left' | 'center' | 'right';
```

- [ ] **Step 2: Extend `AttachmentAttrs`** — in `attachment.ts`, add to the interface (after `alt?`):

```ts
  /** Image alignment. */
  align?: 'left' | 'center' | 'right';
```

And include it in `attachmentBlock`'s conditional spread (after the `alt` line):

```ts
    ...(attrs.align !== undefined ? { align: attrs.align } : {}),
```

- [ ] **Step 3: Add `clearAttachmentFields`** — append to `attachment.ts`:

```ts
/**
 * Remove the given keys from an attachment block (canonical "unset" — e.g.
 * resetting width/height to natural size). Same-ref no-op if the id is absent,
 * not an attachment, or none of the keys are present.
 */
export function clearAttachmentFields(
  doc: RichDoc,
  id: string,
  keys: ('width' | 'height' | 'align' | 'alt')[],
): RichDoc {
  const idx = findBlockIndex(doc, id);
  if (idx === -1 || doc.blocks[idx].type !== 'attachment') return doc;
  const block = doc.blocks[idx];
  if (!keys.some((k) => k in block)) return doc;
  const next = { ...block };
  for (const k of keys) delete next[k];
  const blocks = doc.blocks.slice();
  blocks[idx] = next;
  return { blocks };
}
```

- [ ] **Step 4: Tests** — append to `attachment.test.ts`:

```ts
import { clearAttachmentFields } from './attachment';

describe('align + clearAttachmentFields', () => {
  it('updateAttachmentBlock patches align', () => {
    const d: RichDoc = {
      blocks: [{ id: 'v', type: 'attachment', status: 'ready', src: 'x', inlines: [] }],
    };
    const r = updateAttachmentBlock(d, 'v', { align: 'center' });
    expect(r.blocks[0].align).toBe('center');
  });
  it('clearAttachmentFields removes width/height', () => {
    const d: RichDoc = {
      blocks: [
        {
          id: 'v',
          type: 'attachment',
          status: 'ready',
          src: 'x',
          width: 300,
          height: 200,
          inlines: [],
        },
      ],
    };
    const r = clearAttachmentFields(d, 'v', ['width', 'height']);
    expect(r.blocks[0]).not.toHaveProperty('width');
    expect(r.blocks[0]).not.toHaveProperty('height');
  });
  it('clearAttachmentFields is a same-ref no-op when none of the keys are present', () => {
    const d: RichDoc = {
      blocks: [{ id: 'v', type: 'attachment', status: 'ready', src: 'x', inlines: [] }],
    };
    expect(clearAttachmentFields(d, 'v', ['width', 'height'])).toBe(d);
  });
  it('clearAttachmentFields no-op for a non-attachment id', () => {
    const d: RichDoc = {
      blocks: [{ id: 'p', type: 'paragraph', inlines: [{ text: 'x', marks: [] }] }],
    };
    expect(clearAttachmentFields(d, 'p', ['width'])).toBe(d);
  });
});
```

- [ ] **Step 5: Run + typecheck**

Run: `npm test -- src/components/RichText/engine/attachment.test.ts` → PASS. `npm run typecheck` → PASS.

> `delete next[k]` over a union-keyed object may need `next[k as keyof Block]` — adjust the cast so tsc is happy; keep behavior identical.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/model.ts packages/design-system/src/components/RichText/engine/attachment.ts packages/design-system/src/components/RichText/engine/attachment.test.ts
git commit -m "feat(RichText): attachment align field + clearAttachmentFields"
```

---

## Task 2: Serialize align + width (HTML out/in)

**Files:** Modify `toHtml.ts`, `fromHtml.ts`; Tests alongside.

- [ ] **Step 1: Failing tests**

`toHtml.test.ts`:

```ts
it('serializes a centered, sized image attachment', () => {
  const doc = {
    blocks: [
      {
        id: 'a',
        type: 'attachment' as const,
        status: 'ready' as const,
        src: 'http://u/p.png',
        mime: 'image/png',
        alt: 'C',
        align: 'center' as const,
        width: 320,
        inlines: [],
      },
    ],
  };
  expect(toHtml(doc)).toBe(
    '<figure style="text-align:center"><img src="http://u/p.png" alt="C" width="320"></figure>',
  );
});
it('omits style/width when align/width are unset', () => {
  const doc = {
    blocks: [
      {
        id: 'a',
        type: 'attachment' as const,
        status: 'ready' as const,
        src: 'http://u/p.png',
        mime: 'image/png',
        alt: 'C',
        inlines: [],
      },
    ],
  };
  expect(toHtml(doc)).toBe('<figure><img src="http://u/p.png" alt="C"></figure>');
});
```

`fromHtml.test.ts`:

```ts
it('parses figure text-align + img width into align/width', () => {
  const doc = fromHtml(
    '<figure style="text-align:center"><img src="http://u/p.png" alt="C" width="320"></figure>',
  );
  const att = doc.blocks.find((b) => b.type === 'attachment')!;
  expect(att.align).toBe('center');
  expect(att.width).toBe(320);
});
it('ignores an unknown text-align value', () => {
  const doc = fromHtml(
    '<figure style="text-align:justify"><img src="http://u/p.png" alt="C"></figure>',
  );
  expect(doc.blocks.find((b) => b.type === 'attachment')!.align).toBeUndefined();
});
```

- [ ] **Step 2: Run — fail.**

- [ ] **Step 3: Implement `toHtml.ts`** — replace the attachment image branch in `blockHtml`'s `case 'attachment'` so it adds the optional `style` + `width` (keep the file-link branch unchanged):

```ts
if (attachmentIsImage(block)) {
  const alt = escapeAttr(block.alt ?? block.name ?? '');
  const widthAttr = typeof block.width === 'number' ? ` width="${block.width}"` : '';
  const heightAttr = typeof block.height === 'number' ? ` height="${block.height}"` : '';
  const figStyle =
    block.align === 'center' || block.align === 'right' ? ` style="text-align:${block.align}"` : '';
  return `<figure${figStyle}><img src="${escapeAttr(safe)}" alt="${alt}"${widthAttr}${heightAttr}></figure>`;
}
```

- [ ] **Step 4: Implement `fromHtml.ts`** — in the block-level `<img>`/`<figure><img>` handler added in Slice 2, after computing `src`, read align + width:

```ts
if (src) {
  const altAttr = img.getAttribute('alt') ?? '';
  const fig = child.tagName === 'FIGURE' ? (child as HTMLElement) : null;
  const ta = fig?.style.textAlign;
  const align = ta === 'center' || ta === 'right' || ta === 'left' ? ta : undefined;
  const w = Number(img.getAttribute('width'));
  const h = Number(img.getAttribute('height'));
  const block: Block = {
    id: nextId(),
    type: 'attachment',
    inlines: [],
    status: 'ready',
    src,
    mime: 'image/*',
    alt: altAttr,
    name: altAttr,
  };
  if (align) block.align = align;
  if (Number.isFinite(w) && w > 0) block.width = w;
  if (Number.isFinite(h) && h > 0) block.height = h;
  out.push(block);
}
```

> Match the actual variable names in the Slice-2 handler (`child`, `img`, `src`, `out`, `nextId`); `Block` type is imported in fromHtml. The existing handler currently pushes a fixed object — replace it with the above so align/width are captured.

- [ ] **Step 5: Run — pass** (`npm test -- src/components/RichText/engine/toHtml.test.ts src/components/RichText/engine/fromHtml.test.ts src/components/RichText/engine/serializeRoundtrip.test.ts`).

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/toHtml.ts packages/design-system/src/components/RichText/engine/fromHtml.ts packages/design-system/src/components/RichText/engine/toHtml.test.ts packages/design-system/src/components/RichText/engine/fromHtml.test.ts
git commit -m "feat(RichText): serialize attachment align + width (HTML round-trip)"
```

> Markdown: no change needed — `toMarkdown` emits `![alt](src)` regardless of align/width (lossy, already documented). Confirm no toMarkdown test breaks.

---

## Task 3: Render `data-align`

**Files:** Modify `renderDoc.tsx`, `RichTextEditor.module.scss`; Test `renderDoc.test.tsx`.

- [ ] **Step 1: Failing test** (append to `renderDoc.test.tsx`):

```ts
it('stamps data-align on a centered attachment figure', () => {
  const doc = { blocks: [{ id: 'a', type: 'attachment' as const, status: 'ready' as const, src: 'http://u/p.png', mime: 'image/png', name: 'p', align: 'center' as const, inlines: [] }] };
  const { container } = render(<I18nProvider locale="en">{renderDoc(doc, { editable: true })}</I18nProvider>);
  expect(container.querySelector('figure[data-block-id="a"]')).toHaveAttribute('data-align', 'center');
});
```

- [ ] **Step 2: Run — fail.**

- [ ] **Step 3: Implement** — in `renderDoc.tsx`'s `case 'attachment'`, add `data-align`:

```tsx
    case 'attachment':
      return (
        <figure
          key={block.id}
          {...anchor}
          contentEditable={false}
          data-attachment=""
          data-align={block.align || undefined}
        >
          <RichTextAttachment block={block} />
        </figure>
      );
```

- [ ] **Step 4: SCSS** — in `RichTextEditor.module.scss`, near the attachment styles, add (tokens not needed — `text-align` keyword values):

```scss
// Image alignment within the attachment figure. `text-align` aligns the inline
// <img> child — an allowed property (not the forbidden margin/position/flex/width).
figure[data-attachment][data-align='center'] {
  text-align: center;
}
figure[data-attachment][data-align='right'] {
  text-align: right;
}
```

> The `<Image>` root must be inline/inline-block for `text-align` to move it. Verify `components/Image/Image.module.scss` — if its root is `display: block`, add `figure[data-attachment] :first-child { display: inline-block }` (or wrap). Confirm during implementation; keep left (default) unchanged.

- [ ] **Step 5: Run + lint** (`npm test -- src/components/RichText/engine/renderDoc.test.tsx`; `npm run lint:css`).

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/RichText/engine/renderDoc.tsx packages/design-system/src/components/RichText/engine/renderDoc.test.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss
git commit -m "feat(RichText): render attachment alignment (data-align)"
```

---

## Task 4: i18n keys + GearIcon

**Files:** Modify `messages.ts`/`en.ts`/`ru.ts`, `icons.tsx`.

- [ ] **Step 1: `messages.ts`** — add to the `richTextEditor` interface:

```ts
/** ⚙ config button + "Configure" menu item label. */
attachmentConfigure: string;
/** Alt-text field label. */
attachmentAlt: string;
/** Alignment group label. */
attachmentAlign: string;
/** Align-left button aria-label. */
attachmentAlignLeft: string;
/** Align-center button aria-label. */
attachmentAlignCenter: string;
/** Align-right button aria-label. */
attachmentAlignRight: string;
/** Width slider label. */
attachmentWidth: string;
/** Reset-width link. */
attachmentWidthReset: string;
/** Replace-file button. */
attachmentReplace: string;
/** Open-in-new-tab button. */
attachmentOpen: string;
```

- [ ] **Step 2: `en.ts`**:

```ts
    attachmentConfigure: 'Configure',
    attachmentAlt: 'Alt text',
    attachmentAlign: 'Align',
    attachmentAlignLeft: 'Align left',
    attachmentAlignCenter: 'Align center',
    attachmentAlignRight: 'Align right',
    attachmentWidth: 'Width',
    attachmentWidthReset: 'Reset',
    attachmentReplace: 'Replace',
    attachmentOpen: 'Open',
```

- [ ] **Step 3: `ru.ts`**:

```ts
    attachmentConfigure: 'Настроить',
    attachmentAlt: 'Альт-текст',
    attachmentAlign: 'Выравнивание',
    attachmentAlignLeft: 'По левому краю',
    attachmentAlignCenter: 'По центру',
    attachmentAlignRight: 'По правому краю',
    attachmentWidth: 'Ширина',
    attachmentWidthReset: 'Сбросить',
    attachmentReplace: 'Заменить',
    attachmentOpen: 'Открыть',
```

- [ ] **Step 4: `GearIcon`** — append to `icons.tsx` (match the `base` pattern):

```tsx
export function GearIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
```

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck` → PASS.

```bash
git add packages/design-system/src/i18n/ packages/design-system/src/components/RichTextEditor/icons.tsx
git commit -m "feat(RichTextEditor): attachment-config i18n keys + gear icon"
```

---

## Task 5: `useUpload.replace(id, file)`

**Files:** Modify `useUpload.ts`; Test `useUpload.test.tsx`.

- [ ] **Step 1: Failing test** (append to `useUpload.test.tsx`)

```ts
it('replace swaps a ready attachment in place, keeping align/alt', async () => {
  const onUpload = vi
    .fn()
    .mockResolvedValue({ url: 'http://u/new.png', mime: 'image/png', name: 'new.png' });
  // seed: a ready attachment with align + alt + an old width
  let doc: RichDoc = {
    blocks: [
      {
        id: 'v',
        type: 'attachment',
        status: 'ready',
        src: 'http://u/old.png',
        mime: 'image/png',
        name: 'old.png',
        alt: 'My chart',
        align: 'center',
        width: 500,
        inlines: [],
      },
    ],
  };
  const getValue = () => doc;
  const apply = (d: RichDoc) => {
    doc = d;
  };
  const getCaret = () => ({ blockId: 'v', offset: 0 });
  const { result } = renderHook(() =>
    useUpload({ config: { onUpload }, getValue, applyInsert: apply, applySettle: apply, getCaret }),
  );
  act(() => {
    result.current.replace('v', new File(['x'], 'new.png', { type: 'image/png' }));
  });
  // immediately shows uploading + old width cleared, but keeps align/alt
  expect(doc.blocks[0].status).toBe('uploading');
  expect(doc.blocks[0]).not.toHaveProperty('width');
  expect(doc.blocks[0].align).toBe('center');
  expect(doc.blocks[0].alt).toBe('My chart');
  await waitFor(() => expect(doc.blocks[0].status).toBe('ready'));
  expect(doc.blocks[0].src).toBe('http://u/new.png');
  expect(doc.blocks[0].align).toBe('center'); // preserved through the swap
  expect(onUpload).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run — fail.**

- [ ] **Step 3: Implement** — in `useUpload.ts`, import `clearAttachmentFields`, and add `replace` before the `return`:

```ts
import {
  insertAttachmentBlock,
  updateAttachmentBlock,
  clearAttachmentFields,
} from '../RichText/engine/attachment';
```

```ts
const replace = useCallback(
  (id: string, file: File) => {
    filesRef.current.set(id, file);
    // Keep align/alt; drop the old display size so the new file's natural size
    // applies. Then run the upload (settles src/name/mime via runUpload).
    let doc = updateAttachmentBlock(getValue(), id, { status: 'uploading' });
    doc = clearAttachmentFields(doc, id, ['width', 'height']);
    applySettle(doc);
    runUpload(id, file);
  },
  [getValue, applySettle, runUpload],
);
```

And add `replace` to the returned object:

```ts
return { uploadFiles, retry, remove, replace, accept: config.accept };
```

> `runUpload`'s resolve patches `src/name/mime/width/height/alt` from the result; `res.width`/`alt` are usually `undefined` → stripped by `updateAttachmentBlock`, so the user's `alt` survives and the new file shows at natural size. `align` is never touched by `runUpload`, so it persists. Good.

- [ ] **Step 4: Run — pass** (`npm test -- src/components/RichTextEditor/useUpload.test.tsx`). **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/useUpload.ts packages/design-system/src/components/RichTextEditor/useUpload.test.tsx
git commit -m "feat(RichTextEditor): useUpload.replace (swap a file in place)"
```

---

## Task 6: `RichTextAttachmentConfig` popover

**Files:** Create `RichTextAttachmentConfig.tsx` + `.test.tsx`.

- [ ] **Step 1: Failing test**

```tsx
// RichTextAttachmentConfig.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n';
import { RichTextAttachmentConfig } from './RichTextAttachmentConfig';
import type { Block } from '../RichText/engine/model';

const rect = { top: 10, left: 10, width: 200, height: 120 };
const imgBlock = (over: Partial<Block> = {}): Block => ({
  id: 'v',
  type: 'attachment',
  status: 'ready',
  src: 'http://u/p.png',
  mime: 'image/png',
  name: 'p.png',
  alt: 'Chart',
  inlines: [],
  ...over,
});

function setup(
  block: Block,
  handlers: Partial<React.ComponentProps<typeof RichTextAttachmentConfig>> = {},
) {
  const props = {
    block,
    anchorRect: rect,
    maxWidth: 600,
    accept: 'image/*',
    onAltChange: vi.fn(),
    onAlignChange: vi.fn(),
    onWidthChange: vi.fn(),
    onWidthReset: vi.fn(),
    onReplace: vi.fn(),
    onClose: vi.fn(),
    ...handlers,
  };
  render(
    <I18nProvider locale="en">
      <RichTextAttachmentConfig {...props} />
    </I18nProvider>,
  );
  return props;
}

it('renders the alt field seeded from the block and commits on blur', async () => {
  const p = setup(imgBlock());
  const input = screen.getByLabelText('Alt text') as HTMLInputElement;
  expect(input.value).toBe('Chart');
  await userEvent.clear(input);
  await userEvent.type(input, 'New alt');
  input.blur();
  expect(p.onAltChange).toHaveBeenCalledWith('New alt');
});

it('fires onAlignChange from the alignment buttons', async () => {
  const p = setup(imgBlock());
  await userEvent.click(screen.getByRole('button', { name: 'Align center' }));
  expect(p.onAlignChange).toHaveBeenCalledWith('center');
});

it('fires onWidthReset from the reset control', async () => {
  const p = setup(imgBlock({ width: 320 }));
  await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(p.onWidthReset).toHaveBeenCalled();
});

it('a non-image attachment shows only Replace/Open/Download (no alt/align/width)', () => {
  setup(
    imgBlock({ mime: 'application/pdf', src: 'http://u/d.pdf', name: 'd.pdf', alt: undefined }),
  );
  expect(screen.queryByLabelText('Alt text')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Align center' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Download' })).toBeInTheDocument();
});

it('Escape calls onClose', async () => {
  const p = setup(imgBlock());
  await userEvent.keyboard('{Escape}');
  expect(p.onClose).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run — fail.**

- [ ] **Step 3: Implement** `RichTextAttachmentConfig.tsx`:

```tsx
// RichTextAttachmentConfig.tsx — floating config popover for a ready attachment.
// Internal + presentational: the editor owns the model and passes the block's
// current values + callbacks. Mirrors RichTextLinkEditor's portal + Floating-UI
// virtual-anchor + Esc/click-outside pattern. Image attachments get alt/align/
// width/replace/open/download; non-image chips get replace/open/download only.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, autoUpdate, flip, shift, offset } from '@floating-ui/react-dom';
import { Button } from '../Button';
import { Input } from '../Input';
import { Slider } from '../Slider';
import { Stack } from '../Stack';
import { Cluster } from '../Cluster';
import { useTranslation } from '../../i18n';
import type { Block } from '../RichText/engine/model';
import { safeHref } from '../RichText/engine/safeHref';
import { attachmentIsImage } from '../RichText/engine/attachment';
import styles from './RichTextEditor.module.scss';

export interface RichTextAttachmentConfigProps {
  /** The attachment block being configured (current values). */
  block: Block;
  /** Figure rect (viewport coords) to anchor the popover to. */
  anchorRect: { top: number; left: number; height: number; width: number };
  /** Editor content width (px) — the upper bound for the width slider. */
  maxWidth: number;
  /** Native picker filter for Replace. */
  accept?: string;
  onAltChange: (alt: string) => void;
  onAlignChange: (align: 'left' | 'center' | 'right') => void;
  onWidthChange: (width: number) => void;
  onWidthReset: () => void;
  onReplace: (file: File) => void;
  onClose: () => void;
}

const MIN_W = 80;

export function RichTextAttachmentConfig({
  block,
  anchorRect,
  maxWidth,
  accept,
  onAltChange,
  onAlignChange,
  onWidthChange,
  onWidthReset,
  onReplace,
  onClose,
}: RichTextAttachmentConfigProps) {
  const t = useTranslation();
  const isImage = attachmentIsImage(block);
  const popRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [alt, setAlt] = useState(block.alt ?? block.name ?? '');
  const sliderMax = Math.max(MIN_W + 1, maxWidth);
  const [width, setWidth] = useState<number>(Math.min(block.width ?? sliderMax, sliderMax));

  const virtualRef = useMemo(
    () => ({
      getBoundingClientRect: () => ({
        x: anchorRect.left,
        y: anchorRect.top,
        top: anchorRect.top,
        left: anchorRect.left,
        right: anchorRect.left + anchorRect.width,
        bottom: anchorRect.top + anchorRect.height,
        width: anchorRect.width,
        height: anchorRect.height,
      }),
    }),
    [anchorRect],
  );
  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip(), shift({ padding: 4 })],
    elements: { reference: virtualRef },
  });
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      popRef.current = node;
      refs.setFloating(node);
    },
    [refs],
  );

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [onClose]);

  const href = safeHref(block.src ?? '');

  return createPortal(
    <div
      ref={setRefs}
      className={styles.configPopover}
      style={floatingStyles}
      role="group"
      aria-label={t('richTextEditor.attachmentConfigure')}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <Stack gap="sm">
        {isImage && (
          <>
            <label className={styles.configRow}>
              <span className={styles.configLabel}>{t('richTextEditor.attachmentAlt')}</span>
              <Input
                size="sm"
                value={alt}
                aria-label={t('richTextEditor.attachmentAlt')}
                onChange={(e) => setAlt(e.target.value)}
                onBlur={() => onAltChange(alt)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAltChange(alt);
                  }
                }}
              />
            </label>
            <Cluster gap="xs">
              <span className={styles.configLabel}>{t('richTextEditor.attachmentAlign')}</span>
              {(['left', 'center', 'right'] as const).map((a) => (
                <Button
                  key={a}
                  size="sm"
                  iconOnly
                  variant={(block.align ?? 'left') === a ? 'secondary' : 'ghost'}
                  aria-pressed={(block.align ?? 'left') === a}
                  aria-label={t(
                    `richTextEditor.attachmentAlign${a[0].toUpperCase()}${a.slice(1)}` as 'richTextEditor.attachmentAlignLeft',
                  )}
                  onClick={() => onAlignChange(a)}
                >
                  {a === 'left' ? '⇤' : a === 'center' ? '↔' : '⇥'}
                </Button>
              ))}
            </Cluster>
            <Cluster gap="xs">
              <span className={styles.configLabel}>{t('richTextEditor.attachmentWidth')}</span>
              <Slider
                value={width}
                min={MIN_W}
                max={sliderMax}
                step={1}
                aria-label={t('richTextEditor.attachmentWidth')}
                onChange={(v) => setWidth(v as number)}
                onChangeEnd={(v) => onWidthChange(v as number)}
              />
              <Button size="sm" variant="ghost" onClick={onWidthReset}>
                {t('richTextEditor.attachmentWidthReset')}
              </Button>
            </Cluster>
          </>
        )}
        <Cluster gap="xs">
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onReplace(f);
              e.target.value = '';
            }}
          />
          <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
            {t('richTextEditor.attachmentReplace')}
          </Button>
          {href && (
            <Button size="sm" variant="ghost" asChild>
              {/* If Button has no asChild, render a plain <a> styled link instead. */}
              <a href={href} target="_blank" rel="noopener noreferrer">
                {t('richTextEditor.attachmentOpen')}
              </a>
            </Button>
          )}
          {href && (
            <a className={styles.configLink} href={href} download rel="noopener noreferrer">
              {t('richTextEditor.attachmentDownload')}
            </a>
          )}
        </Cluster>
      </Stack>
    </div>,
    document.body,
  );
}
```

> CHECK `<Button asChild>` exists. If not, render **Open** as a plain `<a className={styles.configLink} target="_blank">` (same as Download) — do NOT invent an API. Adjust the test's `getByRole('button'/'link', { name: 'Open' })` to match whichever element you render. Keep the behavioral assertions.
> CHECK `<Slider>`'s prop names against `Slider.tsx` (`value`, `min`, `max`, `step`, `onChange`, `onChangeEnd`, `aria-label`) — confirmed present; `value` is `number` in single mode.

- [ ] **Step 4: SCSS** — append popover styles to `RichTextEditor.module.scss` (reuse `.linkBubble`'s token pattern; tokens only):

```scss
.configPopover {
  z-index: var(--z-overlay-floating);
  min-width: var(--size-dropdown-min-width);
  padding: var(--space-2);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  box-shadow: var(--shadow-lg);
}
.configRow {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.configLabel {
  font-size: var(--font-size-sm);
  color: var(--color-fg-muted);
}
.configLink {
  font-size: var(--font-size-sm);
  color: var(--color-accent);
}
```

> Verify token names against `tokens.scss` (`--font-size-sm` may be `--text-sm` etc.) — substitute the nearest existing token; no raw values.

- [ ] **Step 5: Run + lint** (`npm test -- src/components/RichTextEditor/RichTextAttachmentConfig.test.tsx`; `npm run typecheck`; `npm run lint:css`). Fix the Open-element/role to match what you rendered.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextAttachmentConfig.tsx packages/design-system/src/components/RichTextEditor/RichTextAttachmentConfig.test.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss
git commit -m "feat(RichTextEditor): RichTextAttachmentConfig popover"
```

---

## Task 7: ⚙ gutter trigger + "Configure" menu item

**Files:** Modify `RichTextBlockControls.tsx`, `RichTextBlockMenu.tsx`; Test `RichTextBlockControls.test.tsx`.

- [ ] **Step 1: Failing tests** (append to `RichTextBlockControls.test.tsx`)

```tsx
it('shows a Configure (gear) button when onConfigure is provided', async () => {
  const onConfigure = vi.fn();
  render(<Harness activeBlockType="attachment" onConfigure={onConfigure} />);
  const gear = screen.getByRole('button', { name: 'Configure' });
  await userEvent.click(gear);
  expect(onConfigure).toHaveBeenCalledWith('b1');
});
it('no gear when onConfigure is omitted', () => {
  render(<Harness activeBlockType="attachment" />);
  expect(screen.queryByRole('button', { name: 'Configure' })).toBeNull();
});
it('block menu shows Configure for an attachment', async () => {
  const onConfigure = vi.fn();
  render(<Harness activeBlockType="attachment" menuOpen onConfigure={onConfigure} />);
  await userEvent.click(screen.getByRole('menuitem', { name: 'Configure' }));
  expect(onConfigure).toHaveBeenCalledWith('b1');
});
```

> Add `onConfigure?: (id) => void` to the Harness pass-through (it already spreads `{...props}`).

- [ ] **Step 2: Run — fail.**

- [ ] **Step 3: Implement `RichTextBlockControls.tsx`**:
- Add prop `onConfigure?: (blockId: string) => void;`.
- Import `GearIcon` from `./icons`.
- In the gutter (next to the ＋ button), render when `onConfigure` is set:

```tsx
{
  onConfigure && (
    <Button
      size="sm"
      variant="ghost"
      iconOnly
      tabIndex={-1}
      aria-label={t('richTextEditor.attachmentConfigure')}
      className={styles.gutterButton}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onConfigure(activeBlockId)}
    >
      <GearIcon />
    </Button>
  );
}
```

- Pass `onConfigure` down to `RichTextBlockMenu` (so the menu item can fire it):

```tsx
          <RichTextBlockMenu
            …existing props…
            onConfigure={onConfigure ? () => onConfigure(activeBlockId) : undefined}
          />
```

- [ ] **Step 4: Implement `RichTextBlockMenu.tsx`**:
- Add prop `onConfigure?: () => void;`.
- Render a Configure item at the top of `Content` when `onConfigure` is set (it's only passed for attachments):

```tsx
        <DropdownMenu.Content side="bottom" align="start">
          {onConfigure && (
            <DropdownMenu.Item onSelect={onConfigure}>
              {t('richTextEditor.attachmentConfigure')}
            </DropdownMenu.Item>
          )}
          {blockType !== 'attachment' && (
            <DropdownMenu.Sub>
              … existing Turn into …
            </DropdownMenu.Sub>
          )}
          … rest …
```

- [ ] **Step 5: Run — pass** (`npm test -- src/components/RichTextEditor/RichTextBlockControls.test.tsx`). **Step 6: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextBlockControls.tsx packages/design-system/src/components/RichTextEditor/RichTextBlockMenu.tsx packages/design-system/src/components/RichTextEditor/RichTextBlockControls.test.tsx
git commit -m "feat(RichTextEditor): attachment Configure trigger (gutter + block menu)"
```

---

## Task 8: Wire config into `RichTextEditor`

**Files:** Modify `RichTextEditor.tsx`; Test `RichTextEditor.test.tsx`.

- [ ] **Step 1: Failing tests** (append to `RichTextEditor.test.tsx`, inside the `upload` describe or a new `attachment config` describe; reuse `up()`, `pasteFile`, `firstBlockId`, `mockReadSelection`)

```tsx
describe('attachment config', () => {
  function up(): UploadConfig {
    return { onUpload: vi.fn().mockResolvedValue({ url: 'http://u/p.png', mime: 'image/png' }) };
  }
  // Seed a doc that already contains a ready image attachment.
  function seeded(): RichDoc {
    return {
      blocks: [
        {
          id: 'img',
          type: 'attachment',
          status: 'ready',
          src: 'http://u/p.png',
          mime: 'image/png',
          name: 'p.png',
          alt: 'Chart',
          inlines: [],
        },
        { id: 'p', type: 'paragraph', inlines: [{ text: 'hi', marks: [] }] },
      ],
    };
  }
  it('the gutter Configure opens the popover; alt edit lands in value (undoable)', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>(seeded());
      return <RichTextEditor value={doc} onChange={setDoc} blockControls upload={up()} />;
    }
    renderEditor(<Harness />);
    const fig = document.querySelector('figure[data-block-id="img"]') as HTMLElement;
    await user.hover(fig);
    await user.click(screen.getByRole('button', { name: 'Configure' }));
    const alt = await screen.findByLabelText('Alt text');
    await user.clear(alt);
    await user.type(alt, 'Updated');
    (alt as HTMLElement).blur();
    await waitFor(() =>
      expect(document.querySelector('figure[data-block-id="img"] img')).toHaveAttribute(
        'alt',
        'Updated',
      ),
    );
  });
  it('readOnly shows no Configure', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>(seeded());
      return <RichTextEditor value={doc} onChange={setDoc} blockControls upload={up()} readOnly />;
    }
    renderEditor(<Harness />);
    const fig = document.querySelector('figure[data-block-id="img"]') as HTMLElement;
    await user.hover(fig);
    expect(screen.queryByRole('button', { name: 'Configure' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run — fail.**

- [ ] **Step 3: Implement** in `RichTextEditor.tsx`:

3a. Import:

```ts
import { RichTextAttachmentConfig } from './RichTextAttachmentConfig';
import { clearAttachmentFields } from '../RichText/engine/attachment';
```

3b. State + the "configurable" computation (near `activeBlockId`/`activeBlockType`):

```ts
const [configBlockId, setConfigBlockId] = useState<string | null>(null);
const activeBlock = activeBlockId ? value.blocks.find((b) => b.id === activeBlockId) : undefined;
const canConfigure =
  uploadOn && activeBlock?.type === 'attachment' && activeBlock.status === 'ready';
const configBlock = configBlockId ? value.blocks.find((b) => b.id === configBlockId) : undefined;
```

3c. Field handlers:

```ts
const onConfigOpen = useCallback((id: string) => setConfigBlockId(id), []);
const onConfigClose = useCallback(() => {
  setConfigBlockId(null);
  rootRef.current?.focus();
}, []);
const onAltChange = useCallback(
  (id: string, alt: string) => {
    commit(
      {
        doc: updateAttachmentBlock(latest.current.value, id, { alt }),
        selection: readSelection(rootRef.current!) ?? {
          anchor: { blockId: id, offset: 0 },
          focus: { blockId: id, offset: 0 },
        },
      },
      'other',
    );
  },
  [commit],
);
const onAlignChange = useCallback(
  (id: string, align: 'left' | 'center' | 'right') => {
    commit(
      {
        doc: updateAttachmentBlock(latest.current.value, id, { align }),
        selection: { anchor: { blockId: id, offset: 0 }, focus: { blockId: id, offset: 0 } },
      },
      'other',
    );
  },
  [commit],
);
const onWidthChange = useCallback(
  (id: string, width: number) => {
    // store width only; clearing height lets the browser keep aspect ratio
    let d = updateAttachmentBlock(latest.current.value, id, { width });
    d = clearAttachmentFields(d, id, ['height']);
    commit(
      {
        doc: d,
        selection: { anchor: { blockId: id, offset: 0 }, focus: { blockId: id, offset: 0 } },
      },
      'other',
    );
  },
  [commit],
);
const onWidthReset = useCallback(
  (id: string) => {
    commit(
      {
        doc: clearAttachmentFields(latest.current.value, id, ['width', 'height']),
        selection: { anchor: { blockId: id, offset: 0 }, focus: { blockId: id, offset: 0 } },
      },
      'other',
    );
  },
  [commit],
);
const onConfigReplace = useCallback((id: string, file: File) => {
  uploaderRef.current.replace(id, file);
}, []);
```

> `updateAttachmentBlock` returns a `RichDoc`, not `{doc,selection}` — wrap it in a `{ doc, selection }` for `commit` as shown. Use a collapsed selection on the block (offset 0) — these are config edits, not caret moves; the `commitSilent`/pending-selection machinery will keep the caret stable enough, and the popover holds focus anyway.

3d. Render the popover. Define above the returns (needs the figure rect — measure from the DOM by block id, like the gutter does):

```ts
    const configEl =
      configBlock && configBlock.type === 'attachment' && configBlock.status === 'ready' && uploadOn
        ? (() => {
            const figEl = rootRef.current?.querySelector<HTMLElement>(
              `[data-block-id="${CSS.escape(configBlock.id)}"]`,
            );
            const r = figEl?.getBoundingClientRect();
            if (!r) return null;
            return (
              <RichTextAttachmentConfig
                key={configBlock.id}
                block={configBlock}
                anchorRect={{ top: r.top, left: r.left, width: r.width, height: r.height }}
                maxWidth={rootRef.current?.getBoundingClientRect().width ?? 600}
                accept={upload?.accept}
                onAltChange={(alt) => onAltChange(configBlock.id, alt)}
                onAlignChange={(align) => onAlignChange(configBlock.id, align)}
                onWidthChange={(w) => onWidthChange(configBlock.id, w)}
                onWidthReset={() => onWidthReset(configBlock.id)}
                onReplace={(file) => onConfigReplace(configBlock.id, file)}
                onClose={onConfigClose}
              />
            );
          })()
        : null;
```

Add `{configEl}` next to `{linkBubble}` in BOTH return branches (toolbar + non-toolbar-controls). (The non-toolbar-no-controls bare-fragment branch never has attachments configurable since `blockControls` is off — but `configEl` is gated on `uploadOn`, not `controlsOn`; to be safe, also render `{configEl}` in that branch, OR require `controlsOn` for the trigger. Since the ⚙ lives in the gutter (controls), config is only reachable when `blockControls` is on — so rendering `{configEl}` in the two shell branches is sufficient. Confirm.)

3e. Pass `onConfigure` to `RichTextBlockControls`:

```tsx
      <RichTextBlockControls
        …existing…
        onConfigure={canConfigure ? onConfigOpen : undefined}
      />
```

- [ ] **Step 4: Run — pass** (`npm test -- src/components/RichTextEditor/RichTextEditor.test.tsx`), `npm run typecheck`, `npm run lint:css`. If manifest test fails, regenerate.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx
git commit -m "feat(RichTextEditor): wire attachment config (popover, field commits, replace)"
```

---

## Task 9: JSDoc + AGENTS + demo

**Files:** Modify `RichTextEditor.tsx` (JSDoc), `AGENTS.md`, `RichTextEditorDemo.tsx`.

- [ ] **Step 1: JSDoc** — extend the `upload` prop's JSDoc in `RichTextEditor.tsx` with a sentence:

```
   * Ready image attachments can be configured (alt text, alignment, width,
   * replace, open/download) via a ⚙ in the block gutter or the block menu's
   * "Configure" — alignment + width round-trip through HTML but not Markdown.
```

And add a `@remarks` anti-pattern bullet:

```
 * - ❌ Expecting image alignment/width to survive a Markdown round-trip — they
 *   serialize to HTML only (Markdown has no syntax for them); the stored RichDoc
 *   JSON is lossless.
```

- [ ] **Step 2: AGENTS.md** — under the `upload` sub-section, add a line:

```
Ready image attachments are configurable (⚙ gutter button or block-menu "Configure"): alt text, alignment, width (slider), replace-in-place, open/download. Alignment + width persist in the doc and serialize to HTML; Markdown drops them.
```

- [ ] **Step 3: Demo** — in `RichTextEditorDemo.tsx`, update the "File upload" example's description to mention configuring an attachment (select an uploaded image → ⚙). No new example needed; the existing `upload` + `blockControls` demo already supports it — ensure the demo editor passes BOTH `blockControls` and `upload` so the ⚙ is reachable:

```tsx
<RichTextEditor
  value={uploadDoc}
  onChange={setUploadDoc}
  toolbar
  blockControls
  upload={{ onUpload: mockUpload, accept: 'image/*,.pdf' }}
  placeholder="Write…"
/>
```

- [ ] **Step 4: Build + commit**

Run: `make build` (or `npm run build -w playground`) → PASS.

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx packages/design-system/AGENTS.md packages/playground/src/pages/components/RichTextEditorDemo.tsx
git commit -m "docs(RichTextEditor): attachment-config JSDoc, AGENTS, demo"
```

---

## Task 10: Gates + Rule 8 review loop + PR

- [ ] **Step 1: Gates** — `npm test`, `npm run typecheck`, `npm run lint:css`, `npm run build`, `npm pack --dry-run -w @eocrm/design-system` (0 test files). All green.
- [ ] **Step 2: Fresh-context Rule 8 review** of `packages/design-system/` (10 categories). Pay attention to: the config popover (focus management, click-outside vs. the slider drag, the Open/Download element choice), align/width serialization round-trip, the width-only/height-cleared resize, replace preserving align/alt, readOnly suppression, and that an attachment edit can't slip past the void defenses. Fix Critical + Important; re-run gates; re-review until "clean enough to stop."
- [ ] **Step 3: Push + PR**

```bash
git push -u origin feat/rte-attachment-config-slice3
gh pr create --fill --title "feat(RichTextEditor): attachment config (Slice 3)"
```

- [ ] **Step 4: Wait for `Quality / check`, then merge (squash).**

---

## Self-review (plan vs spec)

**Spec coverage:**

- `align` model field + `AttachmentAttrs.align` + `clearAttachmentFields` → Task 1. ✓
- Config popover (alt/align/width/replace/open/download; reduced for chips) → Task 6. ✓
- ⚙ gutter trigger + "Configure" menu item → Task 7. ✓
- Editor wiring (config state, field handlers, replace, focus return, gated on upload+ready+readOnly) → Task 8. ✓
- `useUpload.replace` in-place, keeps align/alt → Task 5. ✓
- Render `data-align` + SCSS text-align → Task 3. ✓
- Serialize align+width to/from HTML; Markdown drops → Task 2. ✓
- i18n en+ru + gear icon → Task 4. ✓
- JSDoc/AGENTS/demo → Task 9. ✓
- DoD / review / PR → Task 10. ✓

**Deliberate refinement vs spec:** spec said "compute proportional height" on resize; plan stores **width only and clears height** (browser keeps aspect via `height:auto`) — simpler and avoids ratio math. Same visual result; noted in Task 8.

**Runtime-only unknowns flagged (not placeholders):** `<Button asChild>` existence (Task 6 fallback to `<a>`); `<Image>` root display for `text-align` centering (Task 3 fallback); exact token names for popover SCSS (Task 6); manifest regen if composition changes (Tasks 8/10).

**Type consistency:** `clearAttachmentFields(doc, id, keys)`, `AttachmentAttrs.align`, `replace(id, file)`, `onConfigure(blockId)`, the `align` union, and the popover prop names are used consistently across Tasks 1–9.
