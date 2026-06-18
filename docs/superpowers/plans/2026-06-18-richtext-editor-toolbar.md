# RichTextEditor toolbar + commands (Slice 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a built-in, opt-in toolbar to `<RichTextEditor>` (mark buttons, block-type dropdown, list toggles), the commands that power it, list-input keys (Enter-exits-empty-item, Tab indent/outdent), and collapsed-caret pending marks.

**Architecture:** A pure `commands.ts` derives active state from `(doc, range)` and maps toolbar actions to compositions of the existing engine transforms. The editor tracks its selection reactively (`selectionchange`) and renders an internal `RichTextToolbar` when `toolbar` is set, dispatching through the same commit path the keyboard uses. No new engine transforms.

**Tech Stack:** TypeScript, React, CSS Modules + tokens, Vitest + RTL, Playwright. Reuses `Button`/`ButtonGroup`/`DropdownMenu`.

**Spec:** `docs/superpowers/specs/2026-06-18-richtext-editor-toolbar-design.md`
**Builds on:** the editable editor shipped in `@eocrm/design-system@0.1.48`.

---

## Conventions

- Library rules: `packages/design-system/CLAUDE.md` (four-file rule via `structure.test.ts` — N/A here since no new top-level component dir; JSDoc Rule 7; tokens-only SCSS Rule 3; no margin/position-except-anchor Rule 4; i18n Rule 9).
- **Gates:** `npm test`/`npm run typecheck` per-package (`-w @eocrm/design-system`); **`npm run lint:css`/`npm run format:check` are ROOT scripts**.
- Vitest `globals: true` — don't import describe/it/expect/vi.
- Engine imports from `../RichText/engine/...`. Branch: `feat/richtext-editor-toolbar`. `npx prettier --write` before each commit.

## Engine signatures used (Slice 1, do not redefine)

`../RichText/engine/`: `transforms.ts` (`toggleMark(doc,range,mark)`, `setBlockType(doc,blockId,patch)` — `patch: Partial<Pick<Block,'type'|'level'|'depth'>>`, both `{doc,selection}`); `position.ts` (`orderedRange(doc,range)→{start,end}`, `findBlockIndex`, `blockLength`, `isCollapsed`); `marks.ts` (`hasMark(marks,type)`); `inlines.ts` (`runsText`); `model.ts` (`RichDoc`,`Block`,`Mark`,`MarkType`,`BlockType`,`Range`,`Point`).

---

## File structure

| File                                 | Responsibility                                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `RichTextEditor/commands.ts`         | pure: `activeMarks`, `currentBlock`, `runToggleMark`, `runSetBlock`, `runToggleList`, `runIndent`, `applyExactMarks` |
| `RichTextEditor/icons.tsx`           | inline SVG icons (Bold/Italic/Underline/Strike/BulletList/OrderedList)                                               |
| `RichTextEditor/RichTextToolbar.tsx` | internal presentational toolbar                                                                                      |
| `RichTextEditor/RichTextEditor.tsx`  | (modify) selection tracking, pending marks, list keys, toolbar render, `toolbar` prop                                |
| `RichTextEditor.module.scss`         | (modify) toolbar styles                                                                                              |
| tests                                | `commands.test.ts`, `RichTextToolbar.test.tsx`, `RichTextEditor.test.tsx` additions                                  |

Modified: `src/i18n/{messages,en,ru}.ts`, `src/components.manifest.json` (regen), `AGENTS.md`, `packages/playground/src/pages/components/RichTextEditorDemo.tsx`.

---

## Task 1: `commands.ts` (pure, TDD)

**Files:** Create `packages/design-system/src/components/RichTextEditor/commands.ts` + `commands.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {
  activeMarks,
  currentBlock,
  runToggleMark,
  runSetBlock,
  runToggleList,
  runIndent,
} from './commands';
import { createBlock } from '../RichText/engine/model';
import { runsText } from '../RichText/engine/inlines';
import type { RichDoc, Range, Inline } from '../RichText/engine/model';

const at = (blockId: string, offset: number) => ({ blockId, offset });
const span = (
  a: { blockId: string; offset: number },
  f: { blockId: string; offset: number },
): Range => ({ anchor: a, focus: f });
const bold = { type: 'bold' as const };

function para(id: string, inlines: Inline[]): RichDoc['blocks'][number] {
  return { id, type: 'paragraph', inlines };
}

describe('activeMarks', () => {
  it('returns marks present on EVERY char of the selection (intersection)', () => {
    const doc: RichDoc = {
      blocks: [
        para('a', [
          { text: 'ab', marks: [bold] },
          { text: 'cd', marks: [] },
        ]),
      ],
    };
    expect(activeMarks(doc, span(at('a', 0), at('a', 2)), null)).toEqual(['bold']);
    expect(activeMarks(doc, span(at('a', 0), at('a', 4)), null)).toEqual([]); // not all bold
  });

  it('collapsed → marks of the char before the caret', () => {
    const doc: RichDoc = { blocks: [para('a', [{ text: 'ab', marks: [bold] }])] };
    expect(activeMarks(doc, span(at('a', 1), at('a', 1)), null)).toEqual(['bold']);
    expect(activeMarks(doc, span(at('a', 0), at('a', 0)), null)).toEqual([]); // start → none
  });

  it('collapsed + pending → the pending marks', () => {
    const doc: RichDoc = { blocks: [para('a', [{ text: 'ab', marks: [] }])] };
    expect(activeMarks(doc, span(at('a', 0), at('a', 0)), [bold])).toEqual(['bold']);
  });
});

describe('currentBlock', () => {
  it('single block → its type (+ level)', () => {
    const doc: RichDoc = { blocks: [createBlock('heading', 'H', { level: 2, id: 'a' })] };
    expect(currentBlock(doc, span(at('a', 0), at('a', 1)))).toEqual({ type: 'heading', level: 2 });
  });
  it('multi-block same type → that type', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('paragraph', 'a', { id: 'a' }),
        createBlock('paragraph', 'b', { id: 'b' }),
      ],
    };
    expect(currentBlock(doc, span(at('a', 0), at('b', 1)))).toEqual({ type: 'paragraph' });
  });
  it('multi-block mixed → null', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('paragraph', 'a', { id: 'a' }),
        createBlock('heading', 'b', { level: 1, id: 'b' }),
      ],
    };
    expect(currentBlock(doc, span(at('a', 0), at('b', 1)))).toBeNull();
  });
});

describe('runners', () => {
  it('runToggleMark toggles over the selection', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', 'abcd', { id: 'a' })] };
    const r = runToggleMark(doc, span(at('a', 0), at('a', 4)), bold);
    expect(r.doc.blocks[0].inlines[0].marks).toEqual([bold]);
  });

  it('runSetBlock applies to every block in the selection', () => {
    const doc: RichDoc = {
      blocks: [
        createBlock('paragraph', 'a', { id: 'a' }),
        createBlock('paragraph', 'b', { id: 'b' }),
      ],
    };
    const r = runSetBlock(doc, span(at('a', 0), at('b', 1)), { type: 'heading', level: 2 });
    expect(r.doc.blocks.map((b) => b.type)).toEqual(['heading', 'heading']);
    expect(r.doc.blocks.map((b) => b.level)).toEqual([2, 2]);
  });

  it('runToggleList: not-list → list; all-list → paragraph', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', 'a', { id: 'a' })] };
    const on = runToggleList(doc, span(at('a', 0), at('a', 1)), 'bullet_item');
    expect(on.doc.blocks[0].type).toBe('bullet_item');
    expect(on.doc.blocks[0].depth).toBe(0);
    const off = runToggleList(on.doc, span(at('a', 0), at('a', 1)), 'bullet_item');
    expect(off.doc.blocks[0].type).toBe('paragraph');
    expect(off.doc.blocks[0].depth).toBeUndefined();
  });

  it('runIndent in/out clamps depth at 0 and only affects list items', () => {
    const doc: RichDoc = { blocks: [createBlock('bullet_item', 'a', { id: 'a', depth: 0 })] };
    const indented = runIndent(doc, span(at('a', 0), at('a', 1)), 'in');
    expect(indented.doc.blocks[0].depth).toBe(1);
    const out = runIndent(indented.doc, span(at('a', 0), at('a', 1)), 'out');
    expect(out.doc.blocks[0].depth).toBe(0);
    const clamped = runIndent(out.doc, span(at('a', 0), at('a', 1)), 'out');
    expect(clamped.doc.blocks[0].depth).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/commands.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `commands.ts`**

```ts
// commands.ts — pure active-state derivation + command runners for the toolbar.
// Every runner composes the existing engine transforms; no new model logic.
import type {
  RichDoc,
  Block,
  Mark,
  MarkType,
  BlockType,
  Point,
  Range,
} from '../RichText/engine/model';
import { toggleMark, setBlockType, applyMark, removeMark } from '../RichText/engine/transforms';
import {
  orderedRange,
  findBlockIndex,
  blockLength,
  isCollapsed,
} from '../RichText/engine/position';
import { hasMark } from '../RichText/engine/marks';

export type CommandResult = { doc: RichDoc; selection: Range };

const MARK_TYPES: MarkType[] = ['bold', 'italic', 'underline', 'strike', 'code', 'link'];

function blocksInRange(doc: RichDoc, range: Range): { si: number; ei: number } {
  const { start, end } = orderedRange(doc, range);
  return { si: findBlockIndex(doc, start.blockId), ei: findBlockIndex(doc, end.blockId) };
}

/** Marks of the character immediately before the caret (none at a block start). */
function marksAtCaret(doc: RichDoc, caret: Point): MarkType[] {
  const idx = findBlockIndex(doc, caret.blockId);
  if (idx === -1 || caret.offset <= 0) return [];
  let pos = 0;
  for (const run of doc.blocks[idx].inlines) {
    const end = pos + run.text.length;
    if (caret.offset - 1 >= pos && caret.offset - 1 < end) return run.marks.map((m) => m.type);
    pos = end;
  }
  return [];
}

/** Mark types active across the selection (for the toolbar's pressed state). */
export function activeMarks(doc: RichDoc, range: Range, pending: Mark[] | null): MarkType[] {
  if (isCollapsed(range)) {
    return pending ? pending.map((m) => m.type) : marksAtCaret(doc, range.anchor);
  }
  const { start, end } = orderedRange(doc, range);
  const { si, ei } = blocksInRange(doc, range);
  if (si === -1 || ei === -1) return [];
  const out: MarkType[] = [];
  for (const type of MARK_TYPES) {
    let any = false;
    let all = true;
    for (let i = si; i <= ei && all; i += 1) {
      const block = doc.blocks[i];
      const from = i === si ? start.offset : 0;
      const to = i === ei ? end.offset : blockLength(block);
      let pos = 0;
      for (const run of block.inlines) {
        const rs = pos;
        const re = pos + run.text.length;
        pos = re;
        const f = Math.max(from, rs);
        const t = Math.min(to, re);
        if (t > f) {
          any = true;
          if (!hasMark(run.marks, type)) {
            all = false;
            break;
          }
        }
      }
    }
    if (any && all) out.push(type);
  }
  return out;
}

/** The block type (+ heading level) spanning the selection, or null if mixed. */
export function currentBlock(
  doc: RichDoc,
  range: Range,
): { type: BlockType; level?: 1 | 2 | 3 } | null {
  const { si, ei } = blocksInRange(doc, range);
  if (si === -1 || ei === -1) return null;
  const first = doc.blocks[si];
  for (let i = si; i <= ei; i += 1) {
    if (doc.blocks[i].type !== first.type || doc.blocks[i].level !== first.level) return null;
  }
  return first.level !== undefined
    ? { type: first.type, level: first.level }
    : { type: first.type };
}

export function runToggleMark(doc: RichDoc, range: Range, mark: Mark): CommandResult {
  return toggleMark(doc, range, mark);
}

/** Apply `patch` to every block in the selection, preserving the selection. */
export function runSetBlock(
  doc: RichDoc,
  range: Range,
  patch: Partial<Pick<Block, 'type' | 'level' | 'depth'>>,
): CommandResult {
  const { si, ei } = blocksInRange(doc, range);
  if (si === -1 || ei === -1) return { doc, selection: range };
  let d = doc;
  for (let i = si; i <= ei; i += 1) {
    d = setBlockType(d, d.blocks[i].id, patch).doc;
  }
  return { doc: d, selection: range };
}

export function runToggleList(
  doc: RichDoc,
  range: Range,
  listType: 'bullet_item' | 'ordered_item',
): CommandResult {
  const { si, ei } = blocksInRange(doc, range);
  if (si === -1 || ei === -1) return { doc, selection: range };
  let allList = true;
  for (let i = si; i <= ei; i += 1) {
    if (doc.blocks[i].type !== listType) {
      allList = false;
      break;
    }
  }
  return runSetBlock(doc, range, allList ? { type: 'paragraph' } : { type: listType, depth: 0 });
}

export function runIndent(doc: RichDoc, range: Range, dir: 'in' | 'out'): CommandResult {
  const { si, ei } = blocksInRange(doc, range);
  if (si === -1 || ei === -1) return { doc, selection: range };
  let d = doc;
  for (let i = si; i <= ei; i += 1) {
    const b = d.blocks[i];
    if (b.type !== 'bullet_item' && b.type !== 'ordered_item') continue;
    const depth = Math.max(0, (b.depth ?? 0) + (dir === 'in' ? 1 : -1));
    d = setBlockType(d, b.id, { depth }).doc;
  }
  return { doc: d, selection: range };
}

/** Force the marks of the text in `range` to exactly `marks` (used by pending marks). */
export function applyExactMarks(doc: RichDoc, range: Range, marks: Mark[]): RichDoc {
  let d = doc;
  for (const type of MARK_TYPES) {
    const mark = marks.find((m) => m.type === type);
    d = mark ? applyMark(d, range, mark).doc : removeMark(d, range, type).doc;
  }
  return d;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/commands.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/commands.ts packages/design-system/src/components/RichTextEditor/commands.test.ts
git commit -m "feat(RichTextEditor): toolbar commands + active-state derivation"
```

---

## Task 2: `icons.tsx` — inline SVG icons

**Files:** Create `packages/design-system/src/components/RichTextEditor/icons.tsx`

- [ ] **Step 1: Write the icons**

```tsx
// icons.tsx — minimal inline SVG icons for the toolbar (the library ships no
// icon dependency). Sized 1em / currentColor so they inherit the Button.
import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

export function BoldIcon() {
  return (
    <svg {...base}>
      <path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z" />
    </svg>
  );
}
export function ItalicIcon() {
  return (
    <svg {...base}>
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  );
}
export function UnderlineIcon() {
  return (
    <svg {...base}>
      <path d="M6 3v7a6 6 0 0 0 12 0V3" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
  );
}
export function StrikeIcon() {
  return (
    <svg {...base}>
      <line x1="4" y1="12" x2="20" y2="12" />
      <path d="M7.5 7a4 4 0 0 1 6.5-1.5M16.5 17a4 4 0 0 1-6.5 1.5" />
    </svg>
  );
}
export function BulletListIcon() {
  return (
    <svg {...base}>
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function OrderedListIcon() {
  return (
    <svg {...base}>
      <line x1="10" y1="6" x2="20" y2="6" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <line x1="10" y1="18" x2="20" y2="18" />
      <path d="M4 6h1v3M4 9h2" strokeWidth="1.5" />
      <path d="M4 15h2v1l-2 2h2" strokeWidth="1.5" />
    </svg>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd packages/design-system && npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/RichTextEditor/icons.tsx
git commit -m "feat(RichTextEditor): inline toolbar icons"
```

---

## Task 3: `RichTextToolbar.tsx` (presentational, TDD)

**Files:** Create `packages/design-system/src/components/RichTextEditor/RichTextToolbar.tsx` + `RichTextToolbar.test.tsx`. Adds i18n keys (consumed here; defined in Task 4 — but to typecheck/test this task, do Task 4 first OR temporarily; recommended order: do Task 4 before Task 3's test run).

- [ ] **Step 1: Write the component**

```tsx
import type { BlockType, MarkType } from '../RichText/engine/model';
import { Button } from '../Button';
import { DropdownMenu } from '../DropdownMenu';
import { useTranslation } from '../../i18n';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikeIcon,
  BulletListIcon,
  OrderedListIcon,
} from './icons';
import styles from './RichTextEditor.module.scss';

export type BlockChoice = { type: BlockType; level?: 1 | 2 | 3 };

export interface RichTextToolbarProps {
  activeMarks: MarkType[];
  block: BlockChoice | null;
  disabled?: boolean;
  onToggleMark: (type: MarkType) => void;
  onSetBlock: (choice: BlockChoice) => void;
  onToggleList: (listType: 'bullet_item' | 'ordered_item') => void;
}

const MARKS: {
  type: MarkType;
  Icon: () => JSX.Element;
  key: 'bold' | 'italic' | 'underline' | 'strike';
}[] = [
  { type: 'bold', Icon: BoldIcon, key: 'bold' },
  { type: 'italic', Icon: ItalicIcon, key: 'italic' },
  { type: 'underline', Icon: UnderlineIcon, key: 'underline' },
  { type: 'strike', Icon: StrikeIcon, key: 'strike' },
];

/** Internal toolbar for `<RichTextEditor toolbar>`. Presentational: the editor
 *  owns the selection + commands and passes active state + dispatch callbacks. */
export function RichTextToolbar({
  activeMarks,
  block,
  disabled,
  onToggleMark,
  onSetBlock,
  onToggleList,
}: RichTextToolbarProps) {
  const t = useTranslation();

  const blockLabel = (() => {
    if (!block) return t('richTextEditor.mixed');
    switch (block.type) {
      case 'heading':
        return t(`richTextEditor.heading${block.level ?? 1}` as 'richTextEditor.heading1');
      case 'blockquote':
        return t('richTextEditor.blockquote');
      case 'code_block':
        return t('richTextEditor.codeBlock');
      case 'bullet_item':
      case 'ordered_item':
      case 'paragraph':
      default:
        return t('richTextEditor.paragraph');
    }
  })();

  const isList = (lt: 'bullet_item' | 'ordered_item') => block?.type === lt;

  return (
    <div className={styles.toolbar} role="toolbar" aria-label={t('richTextEditor.toolbar')}>
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            aria-label={t('richTextEditor.blockType')}
          >
            {blockLabel}
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => onSetBlock({ type: 'paragraph' })}>
            {t('richTextEditor.paragraph')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => onSetBlock({ type: 'heading', level: 1 })}>
            {t('richTextEditor.heading1')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => onSetBlock({ type: 'heading', level: 2 })}>
            {t('richTextEditor.heading2')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => onSetBlock({ type: 'heading', level: 3 })}>
            {t('richTextEditor.heading3')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => onSetBlock({ type: 'blockquote' })}>
            {t('richTextEditor.blockquote')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => onSetBlock({ type: 'code_block' })}>
            {t('richTextEditor.codeBlock')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>

      <span className={styles.toolbarSep} aria-hidden="true" />

      {MARKS.map(({ type, Icon, key }) => {
        const active = activeMarks.includes(type);
        return (
          <Button
            key={type}
            size="sm"
            variant={active ? 'secondary' : 'ghost'}
            iconOnly
            aria-label={t(`richTextEditor.${key}`)}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onToggleMark(type)}
          >
            <Icon />
          </Button>
        );
      })}

      <span className={styles.toolbarSep} aria-hidden="true" />

      <Button
        size="sm"
        variant={isList('bullet_item') ? 'secondary' : 'ghost'}
        iconOnly
        aria-label={t('richTextEditor.bulletList')}
        aria-pressed={isList('bullet_item')}
        disabled={disabled}
        onClick={() => onToggleList('bullet_item')}
      >
        <BulletListIcon />
      </Button>
      <Button
        size="sm"
        variant={isList('ordered_item') ? 'secondary' : 'ghost'}
        iconOnly
        aria-label={t('richTextEditor.orderedList')}
        aria-pressed={isList('ordered_item')}
        disabled={disabled}
        onClick={() => onToggleList('ordered_item')}
      >
        <OrderedListIcon />
      </Button>
    </div>
  );
}
```

> Verify `DropdownMenu.Trigger` clones its child (no `asChild`) and `Button`'s `variant`/`size`/`iconOnly`/`disabled` props against `Button.tsx`/`DropdownMenu/`. If `Button` doesn't forward `aria-pressed` through its prop spread, add it explicitly (it extends `ButtonHTMLAttributes`, so it should).

- [ ] **Step 2: Write the test** (after Task 4 i18n exists)

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RichTextToolbar } from './RichTextToolbar';
import { I18nProvider } from '../../i18n';

function renderTb(props: Partial<React.ComponentProps<typeof RichTextToolbar>> = {}) {
  const onToggleMark = vi.fn();
  const onSetBlock = vi.fn();
  const onToggleList = vi.fn();
  render(
    <I18nProvider locale="en">
      <RichTextToolbar
        activeMarks={[]}
        block={{ type: 'paragraph' }}
        onToggleMark={onToggleMark}
        onSetBlock={onSetBlock}
        onToggleList={onToggleList}
        {...props}
      />
    </I18nProvider>,
  );
  return { onToggleMark, onSetBlock, onToggleList };
}

describe('RichTextToolbar', () => {
  it('renders a toolbar with mark + list buttons', () => {
    renderTb();
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bullet list' })).toBeInTheDocument();
  });

  it('reflects active marks via aria-pressed', () => {
    renderTb({ activeMarks: ['bold'] });
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('fires onToggleMark on click', async () => {
    const user = userEvent.setup();
    const { onToggleMark } = renderTb();
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(onToggleMark).toHaveBeenCalledWith('bold');
  });

  it('the block-type trigger shows the current block label', () => {
    renderTb({ block: { type: 'heading', level: 2 } });
    expect(screen.getByRole('button', { name: 'Block type' })).toHaveTextContent('Heading 2');
  });

  it('marks a list button pressed when the block is that list', () => {
    renderTb({ block: { type: 'bullet_item' } });
    expect(screen.getByRole('button', { name: 'Bullet list' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('disables all buttons when disabled', () => {
    renderTb({ disabled: true });
    expect(screen.getByRole('button', { name: 'Bold' })).toBeDisabled();
  });
});
```

- [ ] **Step 3: Run + commit**

Run: `cd packages/design-system && npm test -- src/components/RichTextEditor/RichTextToolbar.test.tsx`
Expected: PASS (after Task 4).

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextToolbar.tsx packages/design-system/src/components/RichTextEditor/RichTextToolbar.test.tsx
git commit -m "feat(RichTextEditor): presentational toolbar"
```

---

## Task 4: i18n keys

**Files:** Modify `src/i18n/messages.ts`, `en.ts`, `ru.ts` (the existing `richTextEditor` namespace).

- [ ] **Step 1: Extend `Messages`** — add to the `richTextEditor` block in `messages.ts`:

```ts
toolbar: string;
blockType: string;
paragraph: string;
heading1: string;
heading2: string;
heading3: string;
blockquote: string;
codeBlock: string;
mixed: string;
bold: string;
italic: string;
underline: string;
strike: string;
bulletList: string;
orderedList: string;
```

- [ ] **Step 2: `en.ts`** — add to `richTextEditor`:

```ts
    toolbar: 'Formatting',
    blockType: 'Text style',
    paragraph: 'Paragraph',
    heading1: 'Heading 1',
    heading2: 'Heading 2',
    heading3: 'Heading 3',
    blockquote: 'Quote',
    codeBlock: 'Code block',
    mixed: 'Mixed',
    bold: 'Bold',
    italic: 'Italic',
    underline: 'Underline',
    strike: 'Strikethrough',
    bulletList: 'Bullet list',
    orderedList: 'Numbered list',
```

- [ ] **Step 3: `ru.ts`** — add to `richTextEditor`:

```ts
    toolbar: 'Форматирование',
    blockType: 'Стиль текста',
    paragraph: 'Абзац',
    heading1: 'Заголовок 1',
    heading2: 'Заголовок 2',
    heading3: 'Заголовок 3',
    blockquote: 'Цитата',
    codeBlock: 'Блок кода',
    mixed: 'Разное',
    bold: 'Полужирный',
    italic: 'Курсив',
    underline: 'Подчёркнутый',
    strike: 'Зачёркнутый',
    bulletList: 'Маркированный список',
    orderedList: 'Нумерованный список',
```

- [ ] **Step 4: Typecheck + commit**

Run: `cd packages/design-system && npm run typecheck`
Expected: PASS (both locales satisfy `Messages`).

```bash
git add packages/design-system/src/i18n/messages.ts packages/design-system/src/i18n/en.ts packages/design-system/src/i18n/ru.ts
git commit -m "feat(RichTextEditor): toolbar i18n strings"
```

---

## Task 5: Wire the editor — selection tracking, pending marks, list keys, toolbar

**Files:** Modify `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx`, `RichTextEditor.module.scss`, `RichTextEditor.test.tsx`.

This is the integration task. Read the current `RichTextEditor.tsx` first. Apply the following additions; the existing controlled loop (beforeinput listener, `commit`, selection-restore effect, `onKeyDown`, composition) stays — you are extending it.

- [ ] **Step 1: Add the `toolbar` prop + imports**

In `RichTextEditorProps`, add:

```ts
  /** Render the built-in formatting toolbar above the editor. Default `false`. */
  toolbar?: boolean;
```

Destructure `toolbar = false` in the component params. Add imports:

```ts
import { useMemo, useState } from 'react'; // merge into the existing react import
import type { Mark, MarkType } from '../RichText/engine/model';
import { isCollapsed } from '../RichText/engine/position';
import { insertText } from '../RichText/engine/transforms';
import {
  activeMarks as deriveActiveMarks,
  currentBlock as deriveCurrentBlock,
  runToggleMark,
  runSetBlock,
  runToggleList,
  runIndent,
  applyExactMarks,
} from './commands';
import { RichTextToolbar, type BlockChoice } from './RichTextToolbar';
```

- [ ] **Step 2: Add selection + pending-marks state**

Near the other refs/state in the component body:

```ts
const [selection, setSelection] = useState<Range | null>(null);
const [pendingMarks, setPendingMarks] = useState<Mark[] | null>(null);
const pendingMarksRef = useRef<Mark[] | null>(null);
pendingMarksRef.current = pendingMarks;
```

- [ ] **Step 3: Track selection while focused (only when the toolbar needs it)**

```ts
useEffect(() => {
  if (!toolbar || readOnly) return;
  const root = rootRef.current;
  if (!root) return;
  const onSelChange = () => {
    const sel = readSelection(root);
    setSelection(sel);
    // Abandon pending marks if the caret moved to a different collapsed point.
    const pend = pendingMarksRef.current;
    if (pend && (!sel || !isCollapsed(sel))) setPendingMarks(null);
  };
  document.addEventListener('selectionchange', onSelChange);
  return () => document.removeEventListener('selectionchange', onSelChange);
}, [toolbar, readOnly]);
```

- [ ] **Step 4: Apply pending marks on insert (extend the native beforeinput handler)**

Inside the existing `onBeforeInput` (in the `useEffect([commit])`), BEFORE the `applyInput` call, special-case insertText with pending marks:

```ts
// Pending marks: a mark toggled with a collapsed caret applies to the
// next typed text, then clears.
const pend = pendingMarksRef.current;
if (pend && e.inputType === 'insertText' && isCollapsed(range)) {
  const text = e.data ?? '';
  if (text) {
    e.preventDefault();
    const inserted = insertText(doc, range.anchor, text);
    const span = {
      anchor: range.anchor,
      focus: { blockId: range.anchor.blockId, offset: range.anchor.offset + text.length },
    };
    const marked = applyExactMarks(inserted.doc, span, pend);
    setPendingMarks(null);
    commit({ doc: marked, selection: inserted.selection });
    return;
  }
}
```

(Place this right after `if (!range) return;` and before computing `data`/`applyInput`.)

- [ ] **Step 5: List keys + collapsed-mark→pending in `onKeyDown`**

Replace the body of `onKeyDown` with (keeps shortcut handling, adds Tab/Enter list keys + pending-mark routing):

```ts
const onKeyDown = useCallback(
  (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const root = rootRef.current;
    if (!root) return;
    const range = readSelection(root);
    if (!range) return;
    const blockType = deriveCurrentBlock(value, range)?.type;
    const inList = blockType === 'bullet_item' || blockType === 'ordered_item';

    // Tab / Shift+Tab indent/outdent — only inside a list (else let focus move).
    if (e.key === 'Tab' && inList) {
      e.preventDefault();
      commit(runIndent(value, range, e.shiftKey ? 'out' : 'in'));
      return;
    }

    // Enter in an EMPTY list item exits the list (→ paragraph).
    if (e.key === 'Enter' && inList && isCollapsed(range)) {
      const idx = value.blocks.findIndex((b) => b.id === range.anchor.blockId);
      if (idx !== -1 && blockLength(value.blocks[idx]) === 0) {
        e.preventDefault();
        commit(runSetBlock(value, range, { type: 'paragraph' }));
        return;
      }
    }

    // Mark shortcut with a collapsed caret → set pending instead of a no-op.
    const mark = shortcutMark(e);
    if (mark) {
      e.preventDefault();
      if (isCollapsed(range)) {
        setPendingMarks((prev) =>
          toggleInList(prev ?? marksAtCaretMarks(value, range.anchor), mark),
        );
      } else {
        commit(runToggleMark(value, range, mark));
      }
      return;
    }
  },
  [value, readOnly, commit],
);
```

**`shortcutMark` is the single source of the key→mark mapping — put it in `shortcuts.ts`, not inline.** Refactor `shortcuts.ts`: extract the mapping into an exported `shortcutMark(e) → Mark | null`, and rewrite `applyShortcut` to use it (`const m = shortcutMark(e); return m ? toggleMark(doc, range, m) : null;`). Add a `shortcutMark` unit test to `shortcuts.test.ts`. Then in `RichTextEditor.tsx` import `shortcutMark` from `./shortcuts` (keep `applyShortcut` imported too — it's still the right call for the _selection_ case, or drop it and call `runToggleMark` for that case; either is fine as long as `applyShortcut` doesn't become dead — if you stop using it, delete it + its test).

Add to `shortcuts.ts`:

```ts
import type { Mark } from '../RichText/engine/model';
/** The mark a formatting shortcut maps to (⌘B/I/U, ⌘⇧X), or null. */
export function shortcutMark(e: ShortcutKey): Mark | null {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return null;
  const k = e.key.toLowerCase();
  if (k === 'b' && !e.shiftKey) return { type: 'bold' };
  if (k === 'i' && !e.shiftKey) return { type: 'italic' };
  if (k === 'u' && !e.shiftKey) return { type: 'underline' };
  if (k === 'x' && e.shiftKey) return { type: 'strike' };
  return null;
}
```

And these editor-local helpers at the top of `RichTextEditor.tsx` (import `blockLength` from `../RichText/engine/position`, `hasMark`/`withMark`/`withoutMark` from `../RichText/engine/marks`, `Point` from the engine model):

```ts
function toggleInList(marks: Mark[], mark: Mark): Mark[] {
  return hasMark(marks, mark.type) ? withoutMark(marks, mark.type) : withMark(marks, mark);
}
function marksAtCaretMarks(doc: RichDoc, caret: Point): Mark[] {
  const idx = doc.blocks.findIndex((b) => b.id === caret.blockId);
  if (idx === -1 || caret.offset <= 0) return [];
  let pos = 0;
  for (const run of doc.blocks[idx].inlines) {
    const end = pos + run.text.length;
    if (caret.offset - 1 >= pos && caret.offset - 1 < end) return run.marks;
    pos = end;
  }
  return [];
}
```

In `onKeyDown`, replace `applyShortcut` detection with `shortcutMark(e)` (as shown in the Step-5 `onKeyDown` body above).

- [ ] **Step 6: Compute toolbar state + render the toolbar**

Before the `return`:

```ts
const toolbarMarks = useMemo<MarkType[]>(
  () => (selection ? deriveActiveMarks(value, selection, pendingMarks) : []),
  [value, selection, pendingMarks],
);
const toolbarBlock = useMemo<BlockChoice | null>(
  () => (selection ? deriveCurrentBlock(value, selection) : null),
  [value, selection],
);

const runCommand = useCallback(
  (result: { doc: RichDoc; selection: Range }) => commit(result),
  [commit],
);
const onToolbarMark = useCallback(
  (type: MarkType) => {
    const root = rootRef.current;
    const range = root ? readSelection(root) : selection;
    if (!range) return;
    if (isCollapsed(range)) {
      setPendingMarks((prev) =>
        toggleInList(prev ?? marksAtCaretMarks(value, range.anchor), { type } as Mark),
      );
    } else {
      runCommand(runToggleMark(value, range, { type } as Mark));
    }
  },
  [value, selection, runCommand],
);
const onToolbarSetBlock = useCallback(
  (choice: BlockChoice) => {
    const root = rootRef.current;
    const range = root ? readSelection(root) : selection;
    if (range) runCommand(runSetBlock(value, range, choice));
  },
  [value, selection, runCommand],
);
const onToolbarToggleList = useCallback(
  (listType: 'bullet_item' | 'ordered_item') => {
    const root = rootRef.current;
    const range = root ? readSelection(root) : selection;
    if (range) runCommand(runToggleList(value, range, listType));
  },
  [value, selection, runCommand],
);
```

Wrap the existing `<div contentEditable>` so the toolbar sits above it inside one container. Change the single returned `<div …>` into:

```tsx
const editable = <div /* existing contentEditable div with all its current props/children */ />;

if (!toolbar) return editable;
return (
  <div className={styles.shell}>
    <RichTextToolbar
      activeMarks={toolbarMarks}
      block={toolbarBlock}
      disabled={readOnly}
      onToggleMark={onToolbarMark}
      onSetBlock={onToolbarSetBlock}
      onToggleList={onToolbarToggleList}
    />
    {editable}
  </div>
);
```

> The `forwardRef` still points at the contentEditable div (not the shell). Keep `setRefs` on the editable div.

- [ ] **Step 7: Toolbar styles in `RichTextEditor.module.scss`**

```scss
.shell {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-wrap: wrap;
  padding: var(--space-1) var(--space-2);
  border: var(--border-width) solid var(--color-border);
  border-bottom: 0;
  border-start-start-radius: var(--radius-md);
  border-start-end-radius: var(--radius-md);
  background: var(--color-bg-muted);
}

.toolbarSep {
  width: var(--border-width);
  align-self: stretch;
  margin-block: var(--space-1);
  background: var(--color-border);
}
```

When the toolbar is present the editable surface should square its top corners; add:

```scss
.shell .root {
  border-start-start-radius: 0;
  border-start-end-radius: 0;
}
```

> Verify tokens exist (`--space-1/2`, `--border-width`, `--color-border`, `--radius-md`, `--color-bg-muted`). `margin-block` on `.toolbarSep` is internal child spacing for a 1px rule — if stylelint's no-margin rule (Rule 4) flags it, use `padding-block` or a fixed-height token instead. Run `lint:css`.

- [ ] **Step 8: Component test additions**

Append to `RichTextEditor.test.tsx`:

```tsx
import * as sel from './selection';

describe('RichTextEditor toolbar', () => {
  it('renders the toolbar when `toolbar` is set', () => {
    renderEditor(<RichTextEditor value={docFromText('hi')} onChange={() => {}} toolbar />);
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
  });

  it('a block-type choice updates the doc', async () => {
    const user = userEvent.setup();
    const spy = vi
      .spyOn(sel, 'readSelection')
      .mockReturnValue({ anchor: { blockId: 'k', offset: 0 }, focus: { blockId: 'k', offset: 2 } });
    try {
      function Harness() {
        const [doc, setDoc] = useState<RichDoc>({
          blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hi', marks: [] }] }],
        });
        return <RichTextEditor value={doc} onChange={setDoc} toolbar />;
      }
      renderEditor(<Harness />);
      await user.click(screen.getByRole('button', { name: 'Block type' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Heading 2' }));
      expect(screen.getByRole('heading', { level: 2, name: 'hi' })).toBeInTheDocument();
    } finally {
      spy.mockRestore();
    }
  });

  it('a bullet-list click converts the block to a list', async () => {
    const user = userEvent.setup();
    const spy = vi
      .spyOn(sel, 'readSelection')
      .mockReturnValue({ anchor: { blockId: 'k', offset: 0 }, focus: { blockId: 'k', offset: 2 } });
    try {
      function Harness() {
        const [doc, setDoc] = useState<RichDoc>({
          blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hi', marks: [] }] }],
        });
        return <RichTextEditor value={doc} onChange={setDoc} toolbar />;
      }
      renderEditor(<Harness />);
      await user.click(screen.getByRole('button', { name: 'Bullet list' }));
      expect(screen.getByRole('listitem')).toHaveTextContent('hi');
    } finally {
      spy.mockRestore();
    }
  });
});
```

> If the existing test file mocked `./selection` via `vi.mock`, reuse that mechanism instead of `vi.spyOn` (match whatever the Slice-2 ⌘B test used). Keep assertions meaningful.

- [ ] **Step 9: Gates + commit**

```bash
cd packages/design-system && npm test -- src/components/RichTextEditor/ src/structure.test.ts && npm run typecheck
cd /Users/dpws/projects/design-system && npm run lint:css
```

Expected: all PASS.

```bash
git add packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx
git commit -m "feat(RichTextEditor): toolbar wiring, list keys, pending marks"
```

---

## Task 6: Demo + AGENTS + manifest

**Files:** Modify `RichTextEditorDemo.tsx`, `AGENTS.md`, regen `components.manifest.json`.

- [ ] **Step 1: Demo** — in `packages/playground/src/pages/components/RichTextEditorDemo.tsx`, add `toolbar` to the editable example: `<RichTextEditor value={doc} onChange={setDoc} toolbar placeholder="Write a note…" />`. Add a one-line `<Text>` note that the toolbar + shortcuts both work.

- [ ] **Step 2: AGENTS.md** — update the `<RichTextEditor>` entry: note the `toolbar` prop (mark buttons, block-type menu, lists), list keys (Enter-exit / Tab-indent), and pending marks. Remove any "no toolbar yet" wording.

- [ ] **Step 3: Regenerate the manifest** (RichTextEditor now composes Button/ButtonGroup?/DropdownMenu in addition to RichText):

```bash
cd packages/design-system && npm run build:manifest && npm test -- src/_meta/manifest.test.ts
```

Expected: drift test passes; `RichTextEditor.composes` now includes `Button`, `DropdownMenu` (and `RichText`). (No CLUSTERS change.)

- [ ] **Step 4: Build + commit**

Run (root): `make build`
Expected: PASS.

```bash
npx prettier --write packages/design-system/AGENTS.md
git add packages/playground/src/pages/components/RichTextEditorDemo.tsx packages/design-system/AGENTS.md packages/design-system/src/components.manifest.json
git commit -m "feat(RichTextEditor): demo toolbar + AGENTS + manifest"
```

- [ ] **Step 5: Visual verification** — `make dev`, open `/components/rich-text-editor`, confirm: the toolbar shows; select text + click Bold → bolds (button shows pressed); the block-type dropdown sets Heading 2 / Quote / Code; the bullet/ordered buttons toggle lists; Tab indents a list item, Enter on an empty item exits; collapsed caret + Bold + type → bold text; active states track the caret; dark theme legible. Fix issues (token swaps, active-state, selection-tracking timing).

---

## Task 7: Full gates + library review-fix loop

- [ ] **Step 1:** From `packages/design-system`: `npm test`, `npm run typecheck`, `npm run build`, `npm pack --dry-run -w @eocrm/design-system` (no test files). From root: `npm run lint:css`, `npm run format:check`.
- [ ] **Step 2:** Spawn a fresh-context Rule-8 reviewer over `RichTextEditor/` (commands, toolbar, icons, the editor changes) + i18n/manifest/demo. Emphasis: command correctness (multi-block setBlock, toggleList, indent clamping), pending-marks correctness (applied once then cleared; cleared on caret move), list-key a11y (Tab not trapped outside lists), toolbar a11y (`role="toolbar"`, `aria-pressed`, labels), token discipline, Rule 4 (toolbar separators), no cross-package leakage. Fix Critical/Important; re-gate; repeat until clean.
- [ ] **Step 3:** Commit fixes.

---

## Task 8: PR

- [ ] **Step 1:** `git push -u origin feat/richtext-editor-toolbar`
- [ ] **Step 2:** `gh pr create` — title `feat(RichTextEditor): toolbar + commands (Slice 3)`; body summarizing the toolbar, commands, list keys, pending marks; link spec + plan. Body ends with the Claude Code line.
- [ ] **Step 3:** `gh pr checks --watch`; when green, report for merge authorization (auto-publishes). Do NOT auto-merge.

---

## Self-review (completed during planning)

- **Spec coverage:** commands + active state → Task 1; icons → Task 2; toolbar UI → Task 3; i18n → Task 4; selection tracking + pending marks + list keys + toolbar render + `toolbar` prop → Task 5; demo/AGENTS/manifest → Task 6; gates/review/PR → Tasks 7–8. Out-of-scope items (links/undo/serialization) excluded. All spec sections map to a task.
- **Placeholder scan:** complete code in every code step; the one integration task (5) gives full code blocks + precise insertion points for modifying the existing file.
- **Type consistency:** `BlockChoice` shared by `RichTextToolbar` + the editor; `activeMarks`/`currentBlock`/`run*` signatures consistent between `commands.ts` (Task 1) and the editor (Task 5); `{doc, selection}` return shape uniform; engine imports (`setBlockType` patch shape, `orderedRange`, `hasMark`/`withMark`/`withoutMark`) match Slice-1.

```

```
