# RichTextEditor emoji + color Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an emoji-insert toolbar button and curated text/highlight color (toolbar popover + block ⠿ menu) to `<RichTextEditor>`.

**Architecture:** Emoji reuses the existing `EmojiPickerPopover` + `insertText` transform (no engine change). Color is a new pair of value-carrying inline marks (`textColor`/`bgColor`) modeled exactly like `link`/`mention`, storing a palette **key** resolved to a CSS-var token by a shared `colorMarks` palette module.

**Tech Stack:** React + TypeScript, the in-house RichText engine, Vitest + RTL.

**Ships as two PRs:** Phase 1 (emoji) first, then Phase 2 (color). Each gates on `make test && make build && make lint && npm run format:check`, a Hard-rule-8 review, then squash-merge → auto-release.

Spec: `docs/superpowers/specs/2026-06-27-rte-emoji-color-design.md`.

---

## Phase 1 — Emoji (PR `feat/rte-toolbar-emoji`)

### Task 1: i18n `emoji` key

**Files:**

- Modify: `packages/design-system/src/i18n/messages.ts` (RichTextEditor section)
- Modify: `packages/design-system/src/i18n/en.ts`, `packages/design-system/src/i18n/ru.ts`

- [ ] **Step 1:** Add `emoji: string;` to the `richTextEditor` block in `messages.ts` (near `link`), with JSDoc `/** Emoji-insert toolbar button. */`.
- [ ] **Step 2:** Add `emoji: 'Emoji',` to `en.ts` and `emoji: 'Эмодзи',` to `ru.ts` in the `richTextEditor` block.
- [ ] **Step 3:** `npm test -w @eocrm/design-system -- src/i18n` — expect PASS (the i18n parity meta-test stays green).
- [ ] **Step 4:** Commit: `feat(RichTextEditor): i18n emoji key`.

### Task 2: SmileIcon

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/icons.tsx`

- [ ] **Step 1:** Add a `SmileIcon` export mirroring the other icons (the `base` svg props pattern already in the file): a circle + two eyes + a smile arc.

```tsx
export function SmileIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}
```

- [ ] **Step 2:** `npm run typecheck -w @eocrm/design-system` — expect PASS.
- [ ] **Step 3:** Commit: `feat(RichTextEditor): SmileIcon`.

### Task 3: Toolbar emoji button + editor insert

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/RichTextToolbar.tsx`
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx`
- Test: `packages/design-system/src/components/RichTextEditor/RichTextEditor.test.tsx`

- [ ] **Step 1 (failing test):** add to the `toolbar` describe in `RichTextEditor.test.tsx`:

```tsx
it('inserts an emoji from the toolbar at the caret', async () => {
  const user = userEvent.setup();
  function Harness() {
    const [doc, setDoc] = useState<RichDoc>(docFromText('hi '));
    return <RichTextEditor value={doc} onChange={setDoc} toolbar />;
  }
  render(
    <I18nProvider locale="en">
      <Harness />
    </I18nProvider>,
  );
  const box = screen.getByRole('textbox');
  // caret at end of "hi "
  const sel = document.getSelection()!;
  const range = document.createRange();
  range.selectNodeContents(box.querySelector('[data-block-id]')!);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
  fireEvent(document, new Event('selectionchange'));
  await user.click(screen.getByRole('button', { name: 'Emoji' }));
  await user.click(await screen.findByRole('button', { name: /grinning|😀/ }));
  await waitFor(() => expect(box.textContent).toContain('😀'));
});
```

(If the emoji accessible name differs, query the first emoji button inside the picker grid instead.)

- [ ] **Step 2:** Run it — expect FAIL (no Emoji button).
- [ ] **Step 3 (toolbar):** In `RichTextToolbar.tsx`, add prop `onInsertEmoji: (emoji: string) => void;` (JSDoc: "Insert an emoji at the caret."). Import `EmojiPickerPopover` from `'../EmojiPicker'` and `SmileIcon` from `'./icons'`. After the link button group, render:

```tsx
<EmojiPickerPopover
  trigger={
    <Button
      size="sm"
      variant="ghost"
      iconOnly
      aria-label={t('richTextEditor.emoji')}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
    >
      <SmileIcon />
    </Button>
  }
  onSelect={onInsertEmoji}
/>
```

- [ ] **Step 4 (editor):** In `RichTextEditor.tsx`, import `insertText` from `'../RichText/engine/transforms'`. Add:

```tsx
const onInsertEmoji = useCallback(
  (emoji: string) => {
    const root = rootRef.current;
    // Fall back to the tracked `selection` because opening the emoji popover moves
    // focus out of the editable (so a live readSelection is null).
    const range = (root ? readSelection(root) : null) ?? selection;
    if (range) commit(insertText(latest.current.value, range, emoji));
  },
  [selection, commit],
);
```

Pass `onInsertEmoji={onInsertEmoji}` to `<RichTextToolbar>`.

- [ ] **Step 5:** Run the test — expect PASS. Then `make test -w`… actually `npm test -w @eocrm/design-system -- src/components/RichTextEditor/RichTextEditor.test.tsx`.
- [ ] **Step 6:** Update the demo `RichTextEditorDemo.tsx` toolbar example description to mention the emoji button; add a one-line note to `AGENTS.md` RichTextEditor toolbar list.
- [ ] **Step 7:** Commit: `feat(RichTextEditor): emoji-insert toolbar button`.

### Phase 1 gate + ship

- [ ] `make test && make build && make lint && npm run format:check` green.
- [ ] Hard-rule-8 review (library change). Fix Critical/Important. Re-gate.
- [ ] PR `feat/rte-toolbar-emoji`, watch `Quality / check`, squash-merge, watch Release, sync main.

---

## Phase 2 — Color (PR `feat/rte-color-marks`)

### Task 4: Model — color marks

**Files:**

- Modify: `packages/design-system/src/components/RichText/engine/model.ts`
- Modify: `packages/design-system/src/components/RichText/engine/marks.ts` (+ `marks.test.ts`)

- [ ] **Step 1:** In `model.ts`, extend the union:

```ts
export type MarkType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'link'
  | 'mention'
  | 'textColor'
  | 'bgColor';

export type Mark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'underline' }
  | { type: 'strike' }
  | { type: 'code' }
  | { type: 'link'; href: string }
  | { type: 'mention'; id: string; label: string }
  | { type: 'textColor'; color: string }
  | { type: 'bgColor'; color: string };
```

Update the JSDoc on `MarkType`/`Mark` to mention color marks carry a palette key.

- [ ] **Step 2 (failing test):** in `marks.test.ts`, add cases: a single mark equality for `{type:'textColor',color:'red'}` vs `{...color:'blue'}` (NOT equal) and vs identical (equal); a `marksEqual` list test with a color mark.
- [ ] **Step 3:** Run — expect FAIL if `marks.ts` compares color marks only by type.
- [ ] **Step 4:** In `marks.ts`, find the single-mark comparison (where `link` compares `href` and `mention` compares `id`+`label`) and add: `textColor`/`bgColor` compare `color`. (If the file already does a structural/deep compare that covers `color`, no change — keep the test as a guard.)
- [ ] **Step 5:** Run — expect PASS. `npm run typecheck -w @eocrm/design-system` will now FAIL in `renderDoc.tsx`/`toHtml.ts`/`toMarkdown.ts`/`fromHtml.ts` (non-exhaustive switches) — that is expected and fixed in Tasks 6–7. To keep this task green, add the minimal `case 'textColor': case 'bgColor':` arms needed for typecheck where switches are exhaustive, returning the un-wrapped inner / no-op, with a `// filled in Task N` — OR sequence Tasks 4→6→7 without an intermediate typecheck gate. **Chosen:** do NOT run typecheck as this task's gate; gate on `marks.test.ts` only, and run full typecheck at the end of Task 7.
- [ ] **Step 6:** Commit: `feat(RichText): textColor/bgColor marks in the model`.

### Task 5: Palette module

**Files:**

- Create: `packages/design-system/src/components/RichText/engine/colorMarks.ts`
- Test: `packages/design-system/src/components/RichText/engine/colorMarks.test.ts`

- [ ] **Step 1 (failing test):**

```ts
import { isColorKey, textColorVar, bgColorVar, COLOR_KEYS } from './colorMarks';

it('lists the palette keys', () => {
  expect(COLOR_KEYS).toEqual(['gray', 'red', 'green', 'amber', 'blue']);
});
it('resolves text + bg color vars for a known key', () => {
  expect(textColorVar('red')).toBe('var(--color-danger)');
  expect(bgColorVar('red')).toBe('var(--color-danger-bg-subtle)');
});
it('returns undefined for an unknown key', () => {
  expect(textColorVar('mauve')).toBeUndefined();
  expect(bgColorVar('mauve')).toBeUndefined();
  expect(isColorKey('mauve')).toBe(false);
  expect(isColorKey('blue')).toBe(true);
});
```

- [ ] **Step 2:** Run — expect FAIL (module missing).
- [ ] **Step 3:** Implement `colorMarks.ts`:

```ts
// colorMarks.ts — the curated, token-backed palette for textColor/bgColor marks.
// Marks store a KEY (e.g. 'red'); these resolve a key to a CSS custom property so
// colors stay theme-able and tokens-only. Shared by the renderer, serializers, and UI.
export type ColorKey = 'gray' | 'red' | 'green' | 'amber' | 'blue';
export const COLOR_KEYS: ColorKey[] = ['gray', 'red', 'green', 'amber', 'blue'];

const TEXT_VAR: Record<ColorKey, string> = {
  gray: '--color-fg-muted',
  red: '--color-danger',
  green: '--color-success',
  amber: '--color-warning',
  blue: '--color-accent',
};
const BG_VAR: Record<ColorKey, string> = {
  gray: '--color-bg-muted',
  red: '--color-danger-bg-subtle',
  green: '--color-success-bg-subtle',
  amber: '--color-warning-bg-subtle',
  blue: '--color-accent-bg-subtle',
};

export function isColorKey(s: string): s is ColorKey {
  return (COLOR_KEYS as string[]).includes(s);
}
export function textColorVar(key: string): string | undefined {
  return isColorKey(key) ? `var(${TEXT_VAR[key]})` : undefined;
}
export function bgColorVar(key: string): string | undefined {
  return isColorKey(key) ? `var(${BG_VAR[key]})` : undefined;
}
/** The bare token name (e.g. '--color-danger'), for fromHtml var-matching. */
export function textVarName(key: ColorKey): string {
  return TEXT_VAR[key];
}
export function bgVarName(key: ColorKey): string {
  return BG_VAR[key];
}
```

- [ ] **Step 4:** Run — expect PASS. Commit: `feat(RichText): color palette module (token-backed keys)`.

### Task 6: setColorMark transform + renderDoc

**Files:**

- Modify: `packages/design-system/src/components/RichText/engine/transforms.ts` (+ `transforms.test.ts`)
- Modify: `packages/design-system/src/components/RichText/engine/renderDoc.tsx` (+ `renderDoc.test.tsx`)

- [ ] **Step 1 (failing test, transforms):** in `transforms.test.ts`:

```ts
it('setColorMark applies, replaces, and clears a textColor over a range', () => {
  const d0 = /* doc with "abc" in block 'a' */;
  const r = { anchor: { blockId: 'a', offset: 0 }, focus: { blockId: 'a', offset: 3 } };
  const d1 = setColorMark(d0, r, 'textColor', 'red');
  expect(blockMarks(d1, 'a')).toContainEqual({ type: 'textColor', color: 'red' });
  const d2 = setColorMark(d1, r, 'textColor', 'blue'); // replace, not stack
  const colors = blockMarks(d2, 'a').filter((m) => m.type === 'textColor');
  expect(colors).toEqual([{ type: 'textColor', color: 'blue' }]);
  const d3 = setColorMark(d2, r, 'textColor', null); // clear
  expect(blockMarks(d3, 'a').some((m) => m.type === 'textColor')).toBe(false);
});
```

(Build `d0` and the `blockMarks` helper from the existing test utilities in `transforms.test.ts`.)

- [ ] **Step 2:** Run — expect FAIL.
- [ ] **Step 3:** In `transforms.ts` add:

```ts
export function setColorMark(
  doc: RichDoc,
  range: Range,
  type: 'textColor' | 'bgColor',
  key: string | null,
): RichDoc {
  const cleared = removeMark(doc, range, type);
  return key ? applyMark(cleared, range, { type, color: key }) : cleared;
}
```

- [ ] **Step 4:** Run — expect PASS.
- [ ] **Step 5 (failing test, renderDoc):** in `renderDoc.test.tsx`, assert a `textColor:'red'` run renders a span with inline `color: var(--color-danger)` and a `bgColor:'green'` run renders `background-color: var(--color-success-bg-subtle)` (both editable and read-only modes).
- [ ] **Step 6:** Run — expect FAIL.
- [ ] **Step 7:** In `renderDoc.tsx`, in the per-mark wrapping switch (where `bold`/`link` are handled), add arms that wrap the inner in `<span style={{ color: textColorVar(mark.color) }}>` / `<span style={{ backgroundColor: bgColorVar(mark.color) }}>` (skip the style if the resolver returns undefined). Import from `./colorMarks`.
- [ ] **Step 8:** Run — expect PASS. Commit: `feat(RichText): setColorMark transform + color span rendering`.

### Task 7: Serialization (toHtml / toMarkdown / fromHtml)

**Files:**

- Modify: `packages/design-system/src/components/RichText/engine/toHtml.ts` (+ test)
- Modify: `packages/design-system/src/components/RichText/engine/toMarkdown.ts` (+ test)
- Modify: `packages/design-system/src/components/RichText/engine/fromHtml.ts` (+ test)

- [ ] **Step 1 (failing tests):**
  - `toHtml`: a `textColor:'red'` run → contains `style="color:var(--color-danger)"`; `bgColor:'blue'` → `style="background-color:var(--color-accent-bg-subtle)"`.
  - `toMarkdown`: a colored run serializes its text with NO color syntax (color dropped).
  - `fromHtml`: `<span style="color: var(--color-danger)">x</span>` → a `textColor:'red'` mark; `<span style="background-color:#ffebe6">x</span>` (a recognized default-theme hex) → `bgColor:'red'`; an unknown color (`color:#123456`) → NO color mark.
- [ ] **Step 2:** Run — expect FAIL.
- [ ] **Step 3 (toHtml):** add `'textColor'`/`'bgColor'` to `MARK_ORDER` (outermost, before `bold`), and in the wrap switch emit `<span style="color:${textColorVar(mark.color)}">…` / `background-color`. Skip if the resolver is undefined.
- [ ] **Step 4 (toMarkdown):** ensure the mark switch has no-op arms for `textColor`/`bgColor` (Markdown has no color — emit inner unchanged). Add a comment mirroring how alignment is dropped.
- [ ] **Step 5 (fromHtml):** when parsing a `<span>`'s inline style, read `color` and `background-color`; map to a palette key via a helper in `colorMarks.ts`:

```ts
// colorMarks.ts — add: recognise our own var() output AND the default-theme hex.
const TEXT_HEX: Record<ColorKey, string> = {
  gray: '#5e6c84',
  red: '#de350b',
  green: '#00875a',
  amber: '#ff991f',
  blue: '#0052cc',
};
const BG_HEX: Record<ColorKey, string> = {
  gray: '#f4f5f7',
  red: '#ffebe6',
  green: '#e3fcef',
  amber: '#fff7ed',
  blue: '#deebff',
};
export function textColorKeyFrom(css: string): ColorKey | undefined {
  /* match var(--token) or hex (case-insensitive) */
}
export function bgColorKeyFrom(css: string): ColorKey | undefined {
  /* … */
}
```

Add unknown-color → undefined → no mark. (Hex literals are the v1 default-theme values, documented as a best-effort import aid; primary round-trip is via our own `var(--token)` output.) Add `colorMarks` tests for `textColorKeyFrom`/`bgColorKeyFrom`.

- [ ] **Step 6:** Run all engine tests + `npm run typecheck -w @eocrm/design-system` — expect PASS (all mark switches now exhaustive).
- [ ] **Step 7:** Commit: `feat(RichText): color mark serialization (HTML round-trip, Markdown drop)`.

### Task 8: Commands — activeColors + editor handlers

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/commands.ts` (+ `commands.test.ts`)
- Modify: `packages/design-system/src/components/RichText/engine/position.ts` OR `transforms.ts` — add `wholeBlockRange(doc, blockId): Range | null`
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx`

- [ ] **Step 1 (failing test):** `commands.test.ts` — `activeColors(doc, range, pending)` returns `{ textColor: 'red' }` when every char in range carries `textColor:'red'`, `{}` when mixed/none, and reads `pending` for a collapsed caret.
- [ ] **Step 2:** Run — expect FAIL.
- [ ] **Step 3:** Implement `activeColors` mirroring `activeMarks` (`commands.ts:58`) but returning the single color key per type that spans the whole range (else omit). Export `ActiveColors = { textColor?: string; bgColor?: string }`.
- [ ] **Step 4:** Add `wholeBlockRange(doc, blockId)` = `{ anchor:{blockId,offset:0}, focus:{blockId,offset:blockLength(block)} }` (null if not found) next to `blockLength` in `position.ts`; unit-test it.
- [ ] **Step 5 (editor):** add handlers (mirroring `onToolbarMark`/`stageOrToggleMark`):

```ts
const stageOrSetColor = useCallback(
  (range: Range, type: 'textColor' | 'bgColor', key: string | null) => {
    if (isCollapsed(range)) {
      pendingAtRef.current = range.anchor;
      setPendingMarks((prev) => {
        const base = (prev ?? marksAtCaretMarks(latest.current.value, range.anchor)).filter(
          (m) => m.type !== type,
        );
        return key ? [...base, { type, color: key }] : base;
      });
    } else {
      commit(setColorMark(latest.current.value, range, type, key));
    }
  },
  [commit],
);

const onSetColor = useCallback(
  (type: 'textColor' | 'bgColor', key: string | null) => {
    const root = rootRef.current;
    const range = (root ? readSelection(root) : null) ?? selection;
    if (range) stageOrSetColor(range, type, key);
  },
  [selection, stageOrSetColor],
);

const onBlockColor = useCallback(
  (id: string, type: 'textColor' | 'bgColor', key: string | null) => {
    const r = wholeBlockRange(latest.current.value, id);
    if (r) commit(setColorMark(latest.current.value, r, type, key));
  },
  [commit],
);

const toolbarColors = useMemo(
  () => (selection ? activeColors(value, selection, pendingMarks) : {}),
  [value, selection, pendingMarks],
);
```

- [ ] **Step 6:** Run engine + commands tests — expect PASS. Commit: `feat(RichTextEditor): color commands (activeColors, set/stage, block color)`.

### Task 9: RichTextColorMenu component

**Files:**

- Create: `packages/design-system/src/components/RichTextEditor/RichTextColorMenu.tsx` (+ `.test.tsx`)
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.module.scss`
- Modify: i18n (`messages.ts`, `en.ts`, `ru.ts`): `color`, `textColor`, `highlight`, `colorClear`, `colorGray`, `colorRed`, `colorGreen`, `colorAmber`, `colorBlue`.

- [ ] **Step 1 (failing test):** rendering `<RichTextColorMenu active={{textColor:'red'}} onPick={spy} />` shows a "Text" row + "Highlight" row; each swatch is a button with the color-name aria-label; the active swatch has the `swatchActive` class; clicking a text swatch calls `onPick('textColor','green')`; clicking the text Clear calls `onPick('textColor', null)`.
- [ ] **Step 2:** Run — expect FAIL.
- [ ] **Step 3:** Implement the presentational component:

```tsx
export interface RichTextColorMenuProps {
  active: { textColor?: string; bgColor?: string };
  onPick: (type: 'textColor' | 'bgColor', key: string | null) => void;
}
```

Two rows; each row = a label (`textColor`/`highlight`), a ⌀ Clear swatch (`aria-label={t('richTextEditor.colorClear')}`, `onMouseDown preventDefault`, `onClick={() => onPick(type, null)}`), then `COLOR_KEYS.map` of swatch buttons. Text swatch background = `textColorVar(key)`; highlight swatch background = `bgColorVar(key)` (via inline `style` — allowed: dynamic token value, not a static raw value, same as renderDoc). aria-label = `t('richTextEditor.color' + Capitalized(key))`. Active key → `styles.swatchActive`.

- [ ] **Step 4 (SCSS):** add `.colorMenu` (Stack), `.colorRow` (Cluster), `.swatch`/`.swatchActive` (fixed square via `height: var(--space-4)` + `aspect-ratio: 1`, `border-radius: var(--radius-sm)`, `border: var(--border-width) solid var(--color-border)`; active adds a `box-shadow` ring with `--ring-accent`). Tokens only; no `width`.
- [ ] **Step 5:** Run — expect PASS. Commit: `feat(RichTextEditor): RichTextColorMenu swatch grid + i18n`.

### Task 10: Toolbar color button

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/RichTextToolbar.tsx` (+ editor wiring + test)
- Modify: `packages/design-system/src/components/RichTextEditor/icons.tsx` (a `TextColorIcon` — an "A" with an underline bar)

- [ ] **Step 1 (failing test):** in the toolbar describe — select a word, click the "Color" toolbar button, click the red Text swatch, assert the selected text is wrapped in a span with `color: var(--color-danger)`.
- [ ] **Step 2:** Run — expect FAIL.
- [ ] **Step 3:** Add `TextColorIcon` to `icons.tsx`. In `RichTextToolbar.tsx` add props `colors: { textColor?: string; bgColor?: string }` and `onSetColor: (type, key|null) => void`. Render (after the link group) a `Popover`:

```tsx
<Popover>
  <Popover.Trigger>
    <Button
      size="sm"
      variant="ghost"
      iconOnly
      aria-label={t('richTextEditor.color')}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
    >
      <TextColorIcon />
    </Button>
  </Popover.Trigger>
  <Popover.Content>
    <RichTextColorMenu active={colors} onPick={onSetColor} />
  </Popover.Content>
</Popover>
```

- [ ] **Step 4 (editor):** pass `colors={toolbarColors}` and `onSetColor={onSetColor}` to `<RichTextToolbar>`.
- [ ] **Step 5:** Run — expect PASS. Commit: `feat(RichTextEditor): color button in the toolbar`.

### Task 11: Block ⠿ menu Color submenu

**Files:**

- Modify: `packages/design-system/src/components/RichTextEditor/RichTextBlockMenu.tsx` (+ test)
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextBlockControls.tsx` (thread an `onColor` prop)
- Modify: `packages/design-system/src/components/RichTextEditor/RichTextEditor.tsx` (wire `onBlockColor`)

- [ ] **Step 1 (failing test):** `RichTextBlockMenu.test.tsx` — with `onColor` provided and `menuOpen`, a "Color" submenu trigger appears; opening it and clicking the green Text swatch calls `onColor('textColor','green')`. With `onColor` omitted, no Color entry.
- [ ] **Step 2:** Run — expect FAIL.
- [ ] **Step 3:** In `RichTextBlockMenu.tsx` add prop `onColor?: (type: 'textColor'|'bgColor', key: string|null) => void`. When set, add a `DropdownMenu.Sub` ("Color") whose `SubContent` renders `<RichTextColorMenu active={{}} onPick={onColor} />` (block menu doesn't reflect an active color — pass `{}`). Place it after Configure / before Turn into.
- [ ] **Step 4:** In `RichTextBlockControls.tsx` add `onColor?: (blockId, type, key) => void` and pass `onColor={onColor ? (type, key) => onColor(activeBlockId, type, key) : undefined}` to the menu.
- [ ] **Step 5:** In `RichTextEditor.tsx` pass `onColor={controlsOn ? onBlockColor : undefined}` to `<RichTextBlockControls>`.
- [ ] **Step 6:** Run — expect PASS. Commit: `feat(RichTextEditor): Color submenu in the block menu (whole-block)`.

### Task 12: Demo + docs

**Files:**

- Modify: `packages/playground/src/pages/components/RichTextEditorDemo.tsx`
- Modify: `packages/design-system/AGENTS.md`, JSDoc on `RichTextEditor` (the toolbar paragraph) + `RichTextBlockControls`.

- [ ] **Step 1:** Add a "Text & highlight color" example (seed a doc, show the toolbar color button + block-menu color). Mention color round-trips through HTML, drops in Markdown.
- [ ] **Step 2:** Update `AGENTS.md` RichTextEditor section: toolbar now has emoji + color; color is a token palette, HTML-only serialization; block ⠿ menu has whole-block Color.
- [ ] **Step 3:** `make test && make build && make lint && npm run format:check` — green.
- [ ] **Step 4:** Commit: `docs(RichTextEditor): color + emoji demo and guidance`.

### Phase 2 gate + ship

- [ ] All gates green; `npm pack --dry-run` shows no test files.
- [ ] Hard-rule-8 review loop until clean (focus: token discipline on the inline color styles, a11y of swatch buttons, serialization round-trip, exhaustive mark switches).
- [ ] PR `feat/rte-color-marks`, green `Quality / check`, squash-merge, Release, sync main.

---

## Self-review notes

- **Spec coverage:** emoji (Tasks 1–3); model+palette (4–5); transform+render (6); serialization (7); commands/pending/whole-block (8); color menu+i18n+scss (9); toolbar (10); block menu (11); demo/docs (12). All spec sections mapped.
- **Type consistency:** `setColorMark`, `textColorVar`/`bgColorVar`, `isColorKey`, `ColorKey`, `COLOR_KEYS`, `activeColors`/`ActiveColors`, `wholeBlockRange`, `onSetColor`/`onBlockColor`/`onColor`, `RichTextColorMenu` props used consistently across tasks.
- **Known sequencing note:** Task 4 intentionally defers full typecheck to Task 7 (mark switches become exhaustive incrementally). Engine `make test` is the gate per task; full typecheck at end of Task 7.
