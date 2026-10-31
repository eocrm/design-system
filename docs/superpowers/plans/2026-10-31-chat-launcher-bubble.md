# ChatLauncher + ChatBubble Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `ChatLauncher` (floating non-modal chat panel) and `ChatBubble` + `ChatBubble.List` (message bubbles in a `role="log"`) per #725.

**Architecture:** Two library components in `packages/design-system/src/components/{ChatBubble,ChatLauncher}/`, each complete per the root CLAUDE.md Core invariant (tests, docs, AI-PRIMER line, index export, CLUSTERS in both manifest maps). One new shared token `--z-chat-launcher`. Playground demos + wiring last.

**Tech Stack:** React 18 + TypeScript, SCSS modules on tokens, Vitest (+ RTL, jsdom), lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-10-31-chat-launcher-bubble-design.md` — numbered decisions 1–24 are binding; read it before any task.

## Global Constraints

- Branch: `feat/batch-719-725` (already checked out). Commit per task. No `Co-Authored-By`, no session links in commits.
- Read `CLAUDE.md` (root), `packages/design-system/CLAUDE.md` and `packages/playground/CLAUDE.md` first. Hard rules 1–10 apply.
- Vitest runs from inside `packages/design-system` (`npx vitest run <path>`); `format:check` / `lint:css` from repo root.
- No per-component label props (Hard rule 9). Strings: `chatLauncher.close` = "Close chat" / "Закрыть чат"; `chatBubble.member` = "You said" / "Вы написали"; `chatBubble.assistant` = "Assistant said" / "Ассистент написал"; `chatBubble.pending` = "Assistant is typing…" / "Ассистент печатает…". Add to `src/i18n/messages.ts` (with JSDoc), `en.ts`, `ru.ts`.
- Never inline-disable an `eocrm/*` ESLint rule (CI-only check: `node --test tools/eslint-plugin-eocrm/rules.test.mjs`). Stylelint disables only with a written reason, mirroring `Toast.module.scss`.
- New component's CLUSTERS entry goes in BOTH `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs` (cluster `'Feedback'` for both — matches Toast; my call), then `npm run build:manifest`.
- Docs: `docs/components/<Name>.md` (TL;DR, canonical snippet, "When NOT to use", generated props via `npm run build:docs`) + one alphabetical line in `AI-PRIMER.md`. Component JSDoc: one-line summary + `@see docs/components/<Name>.md`.

## Review Focus

1. Consumer's own `onKeyDown`/`className`/`id` passed to `ChatLauncher` — must merge, not clobber `role`/`hidden`/`aria-labelledby`/Escape handling (test in Task 2).
2. A `DropdownMenu`/`Popover` inside the panel handling Escape itself (`defaultPrevented`) — panel must stay open (test in Task 2).
3. `open` toggled to `false` by the consumer while focus is elsewhere on the page — focus must not be stolen (test in Task 2).
4. Many messages arriving while the panel is closed, then reopen — lands at bottom if it was at bottom at close (test in Task 2).
5. `ChatBubble pending` with children passed — children not rendered, single pending label (test in Task 1).

---

### Task 1: ChatBubble + ChatBubble.List

**Files:**

- Create: `packages/design-system/src/components/ChatBubble/{ChatBubble.tsx,ChatBubbleList.tsx,ChatBubble.module.scss,ChatBubble.tokens.scss,ChatBubble.test.tsx,index.ts}`
- Modify: `src/i18n/{messages,en,ru}.ts`, `src/index.ts`, `src/_meta/manifest.ts`, `scripts/generate-manifest.mjs`, `AI-PRIMER.md`
- Create: `docs/components/ChatBubble.md`

**Interfaces:**

- Produces: `ChatBubble` (compound, `ChatBubble.List` attached via `Object.assign`), types `ChatBubbleProps`, `ChatBubbleFrom = 'member' | 'assistant'`, `ChatBubbleListProps`. Exported from `src/index.ts` with types.

- [ ] **Step 1: Write failing tests** in `ChatBubble.test.tsx`:
  - `from="member"` root has class matching `/member/`; `from="assistant"` → `/assistant/`.
  - accessible text starts with the role label: `screen.getByText('You said:', { exact: false })` lives inside a VisuallyHidden; same for "Assistant said".
  - `footer` renders outside the body element (`body.contains(footerEl) === false`, root contains both).
  - `pending`: renders `Assistant is typing…` once, does not render `children`, dots element is `aria-hidden="true"`, no `aria-busy` anywhere.
  - ru locale via `I18nProvider` (see `AgentAvatar.test.tsx` import) swaps the label.
  - `ChatBubble.List`: `role="log"`, `aria-live="polite"`; consumer `role="list"` does NOT override role (Pattern B); `aria-label` passes through.
  - refs forward to root `div`s; `className` merges.
  - Compiled-CSS assertion (postcss+sass pattern from `IconTile.test.tsx`): root rule has `width: 100%` and no `align-self`; `.dots` animation is disabled inside `@media (prefers-reduced-motion: reduce)`.
- [ ] **Step 2:** `npx vitest run src/components/ChatBubble` → FAIL (module not found).
- [ ] **Step 3: Implement** per spec 18–22. Root `div.bubble.<from>` = full-width flex row, `justify-content` end/start; inner column holds `.body` (max-width `var(--chat-bubble-max-width)` = 80%, radius `--radius-lg`, padding on space tokens) then `footer`. Member body = accent-subtle bg token, assistant = neutral subtle surface token (pick existing semantic colour tokens; check `contrast.test.ts` still passes). `ChatBubbleList` = `div` gap `var(--space-3)` flex column.
- [ ] **Step 4:** tests PASS; `npm run build:docs`, `npm run build:manifest`; write docs md + AI-PRIMER line.
- [ ] **Step 5:** commit `feat(ChatBubble): message bubble + role=log list (#725)`.

### Task 2: ChatLauncher

**Files:**

- Create: `packages/design-system/src/components/ChatLauncher/{ChatLauncher.tsx,isAtBottom.ts,isAtBottom.test.ts,ChatLauncher.module.scss,ChatLauncher.tokens.scss,ChatLauncher.test.tsx,index.ts}`, `docs/components/ChatLauncher.md`
- Modify: `packages/design-tokens/src/tokens.json` (add `layer.chat-launcher`, value `900`, web name `--z-chat-launcher`, next to `layer.modal`; then from repo root `npm run tokens:generate && npm run tokens:check`), i18n files, `src/index.ts`, both manifest maps, `AI-PRIMER.md`

**Interfaces:**

- Consumes: `Button` (`iconOnly`, `size="lg"`, `variant="primary"`), `useTranslation`, lucide `X`.
- Produces: `ChatLauncher`, `ChatLauncherProps` (exact shape in spec "API"); `isAtBottom(scrollTop: number, scrollHeight: number, clientHeight: number, threshold?: number): boolean` (default threshold 24px).

- [ ] **Step 1: Failing tests.** `isAtBottom.test.ts` (Node): exact bottom true; within threshold true; threshold+1 false; content shorter than viewport true.
      `ChatLauncher.test.tsx` (jsdom; stub `ResizeObserver` + scroll metrics as `Tabs.test.tsx` does):
  - launcher button: name = `label`, `aria-expanded` false/true, `aria-controls` = panel id; click calls `onOpenChange(!open)`.
  - panel: `role="dialog"`, no `aria-modal`, named by `title`; `hidden` when closed and still in the DOM (children stay mounted — a child input's typed value survives close/reopen rerender).
  - open → focus moves to `initialFocusRef.current`, else panel. Already-inside focus not moved.
  - Escape inside panel → `onOpenChange(false)`, focus on launcher after rerender with `open={false}`. Escape on launcher while open → same. Escape with `defaultPrevented` (child handler calls `preventDefault`) → not called. Consumer `onKeyDown` still fires.
  - close button name "Close chat" (ru: "Закрыть чат") → `onOpenChange(false)` + focus to launcher.
  - consumer sets `open={false}` while focus is on an outside button → focus stays on that button.
  - portaled: panel's closest root is a child of `document.body`, not of the render container.
  - stick-to-bottom: first open scrolls body to bottom; grow while at bottom → follows; grow while scrolled up → unchanged; close at bottom, add content, reopen → bottom; close scrolled up, reopen → saved scrollTop restored.
  - ref → panel; `className`/`id`/`data-*` on panel, `role`/`hidden` not overridable.
  - compiled CSS: `.panel[hidden]` has `display: none`; root uses `var(--z-chat-launcher)`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement** per spec 7–17. Root (portaled `div`, fixed, `inset-inline-end`/`bottom` = `--chat-launcher-inset`, `z-index: var(--z-chat-launcher)`, flex column align end, gap `--space-3`) contains panel then launcher. Panel = header (`Title`-sized text + close Button iconOnly `variant="ghost"` size sm) / body (`overflow-y: auto`, `min-height: 0`, flex 1 within the panel's own column — internal, allowed) / footer. Width/height per spec 15 with `min()` + `dvh`. Escape handler on root `onKeyDown`. Focus-return on close only when `document.activeElement` is inside the root (covers Escape/close button; spec 11).
- [ ] **Step 4:** PASS; `npm run build:docs`, `npm run build:manifest`; docs md ("When NOT to use": not for page-level dialogs → Modal/Drawer; not for anchored menus → Popover) + AI-PRIMER line.
- [ ] **Step 5:** commit `feat(ChatLauncher): floating non-modal chat panel (#725)`.

### Task 3: Playground demos + wiring

**Files:**

- Create: `packages/playground/src/pages/components/{ChatLauncherDemo,ChatBubbleDemo}.tsx`
- Modify: `src/App.tsx` (routes `/components/chat-launcher`, `/components/chat-bubble`), `src/layout/AppShell/navItems.ts` (Feedback-ish group used by Toast — use Toast's group), `src/pages/components/ComponentsIndex.tsx` + `overviewSchematics.tsx`, `src/pages/mockups/registry.ts` (`ComponentName` union); `npm run build:props` from `packages/playground`.

**Interfaces:** Consumes Tasks 1–2 via `@eocrm/design-system` only.

- [ ] **Step 1:** ChatBubbleDemo: member/assistant, footer with feedback buttons (Button ghost iconOnly thumbs), pending, a full `ChatBubble.List` conversation. ChatLauncherDemo: ONE live instance driven by page state, with a working composer (`Textarea` + send Button in `footer`, `initialFocusRef` on the textarea) that appends a member bubble, shows a pending assistant bubble, then a canned reply after ~1s. Static examples show code only (no second fixed launcher).
- [ ] **Step 2:** wire the four places + schematics (blueprint-accent vocabulary, one solid accent focal element).
- [ ] **Step 3:** from repo root: `make test && make build-lib && make lint && npm run format:check` all exit 0.
- [ ] **Step 4:** commit `feat(playground): ChatLauncher + ChatBubble demos (#725)`.
