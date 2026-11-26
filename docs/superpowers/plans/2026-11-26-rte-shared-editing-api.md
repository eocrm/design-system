# RichTextEditor Shared-Editing API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/collab` with a yjs-free public shared-editing API on `RichTextEditor` and remove all Yjs code (DS-96, 0.9.0).

**Architecture:**

- Promote the internal `collabSeam` capabilities to documented props and a `controller` ref.
- Move the presence overlay and status UI from `src/collab/` into `RichTextEditor`.
- Then delete `src/collab/` and every packaging trace of `/collab` and `yjs`.

**Tech Stack:** React 19 + TS, SCSS modules + tokens, Vitest (Node + jsdom), i18n en/ru.

**Spec:** `docs/superpowers/specs/2026-11-26-rte-shared-editing-api-design.md`

## Global Constraints

- **The API verbatim, per the spec's "API" section.** All props are optional, and with none set `RichTextEditor` is byte-identical: existing RichTextEditor tests stay unmodified.
- **No `yjs` anywhere** in the repo's package.json files, the lockfile entries owned by these workspaces, `src`, or `dist` after Task 2.
- **Untrusted presence:** keep the hardening (per-entry try/catch, string coercion, colour only via a CSS custom property).
- **Package Hard rules:**
  - tokens only, except app-supplied presence colours (documented);
  - no layout props (the internal overlay anchor is allowed);
  - JSDoc on every prop and export;
  - i18n en + ru;
  - Rule 10: the status live region always renders when `syncStatus` is set;
  - forwardRef + rest props.

## Review Focus

- `history='external'` plus an outside `value` change while the user is typing must not drop the user's keystroke and must keep the caret → Task 1 test.
- `createBlockId` is per instance: two editors with different id sources never cross-contaminate → Task 1 test.
- `onEdit` fires exactly once per commit, before `onChange`, and upload settles report `'silent'` → Task 1 test.
- `uploadOwner` absent means today's upload behaviour (Retry offered) → Task 1 test.
- After Task 2, `grep -ri yjs packages/*/src packages/*/package.json` finds nothing, and the `dist` test asserts no yjs → Task 2.

---

### Task 1: Public shared-editing API on `RichTextEditor`

**Files:**

- `RichTextEditor.tsx`: replace the `CollabSeamContext` consumption with props.
- Delete `collabSeam.ts`.
- Move `src/collab/presence.tsx` → `src/components/RichTextEditor/RichTextPresence.tsx` (with its scss/tokens).
- Move the status UI from `src/collab/CollaborativeRichTextEditor.tsx` → `RichTextEditor/RichTextSyncStatus.tsx`.
- `useUpload.ts` and the attachment UI: `uploadOwner`.
- i18n: rename `collab.*` → `richTextEditor.*` (en/ru).
- `index.ts` and `src/index.ts`: export the new types, plus `Range` and `Point`.
- Tests: `RichTextEditor.sharedEditing.test.tsx`. Port the relevant jsdom cases from `src/collab/CollaborativeRichTextEditor.test.tsx` and `presence` tests to the new props, without yjs.

`src/collab/` must still build at the end of this task: either point it at the new props, or leave it compiling untouched until Task 2 deletes it. Your call, as long as `make test` is green.

- [ ] **Step 1: Failing tests** for each prop, per the spec semantics and the Review Focus items.
- [ ] **Step 2:** RED.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npx vitest run src/components/RichTextEditor`, then typecheck, `lint:css` and `make lint`. The full `npm test` must be green.
- [ ] **Step 5:** Commit `feat(rich-text-editor): public shared-editing API (DS-96)`.

### Task 2: Remove `/collab` and yjs

**Files:**

- `packages/design-system/src/collab/**`: delete.
- `packages/design-system/package.json`: drop `exports["./collab"]`, the `yjs` peer, `peerDependenciesMeta` and the devDependency.
- `vite.lib.config.ts`: drop the entry.
- `size-budgets.json`: drop the `collab` entry.
- `scripts/size-guard.mjs`: drop the yjs external.
- `dist-test/shape.test.ts`: drop the collab cases, and add "no `yjs` anywhere in `dist`".
- `packages/design-tokens/test/package-boundary.test.mjs`: drop `./collab`.
- `packages/design-system/CLAUDE.md`: remove exception (f) and fix the counts and wording.
- `scripts/generate-docs*` / the manifest generators: remove the `src/collab` scan and the synthetic entry.
- CLUSTERS (both maps): remove `CollaborativeRichTextEditor`.
- `docs/components/CollaborativeRichTextEditor.md`: delete, then regenerate `docs/components/index.json`.
- `AI-PRIMER.md` and `README.md`: remove the collab lines.
- Playground: delete `CollaborativeRichTextEditorDemo.tsx`, unwire it from `App.tsx`, `navItems.ts`, `ComponentsIndex.tsx`, `overviewSchematics.tsx` and `registry.ts`, and drop `yjs` from the playground `package.json`.
- `package-lock.json`: update via `npm install`.

- [ ] **Step 1:** Delete and unwire. Run `npm install`, `npm run build:docs` and `npm run build:manifest`.
- [ ] **Step 2:** From the root run `make test && make lint && npm run format:check && npm run typecheck && npm run build -w @eocrm/design-system && npm run size -w @eocrm/design-system && npm run test:dist -w @eocrm/design-system`. Every exit code must be 0. Then grep for `yjs` and `/collab` across `packages/` (excluding `node_modules` and `docs/superpowers`), which should find nothing.
- [ ] **Step 3:** Commit `refactor!: remove /collab and yjs; the Yjs binding moves to eocrm (DS-96)`.

### Task 3: Docs, demo and release bump

**Files:**

- `docs/components/RichTextEditor.md`: a "Shared editing (sync hooks)" section per the spec. Run `npm run build:docs`.
- `AI-PRIMER.md`: the RichTextEditor line mentions the sync hooks.
- `packages/playground/src/pages/components/RichTextEditorDemo.tsx`: a "Shared editing hooks" example per the spec (yjs-free).
- `.github/workflows/release.yml`: `BUMP` to minor. Check git history for how earlier minor bumps were done and reverted, and follow that.

- [ ] **Step 1:** Docs and demo.
- [ ] **Step 2:** Release bump.
- [ ] **Step 3:** Run all the gates from Task 2.
- [ ] **Step 4:** Commit `docs(rich-text-editor): shared editing hooks docs and demo; release 0.9.0 (DS-96)`.
