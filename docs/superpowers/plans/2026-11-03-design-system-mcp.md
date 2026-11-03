# `@eocrm/design-system-mcp` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A stdio MCP server, published as `@eocrm/design-system-mcp`, that serves any project's pinned `@eocrm/design-system` docs to any MCP client. It ships with a portable skill and a primer about half the current size.

**Architecture:** Plain ESM package at `packages/design-system-mcp/`. The server resolves the project's DS version from its lockfile, fetches `AI-PRIMER.md` and `docs/**` for that exact version from jsDelivr (falling back to unpkg, then a disk cache, then a bundled snapshot), and exposes four tools plus server `instructions`. It is released by its own workflow with `mcp-v*` tags.

**Tech Stack:** Node 24 ESM (no build step, JSDoc types), `@modelcontextprotocol/sdk@1.32.2`, `zod@4.6.7`, `semver@7.8.6`, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-03-design-system-mcp-design.md`

## Global Constraints

- Package name `@eocrm/design-system-mcp`, bin `design-system-mcp`, run as `npx -y @eocrm/design-system-mcp` (stdio). Subcommand `install-skill`.
- No dependency on `@eocrm/design-system` or React. Runtime deps are exactly `@modelcontextprotocol/sdk`, `zod` and `semver`, pinned to the latest versions (user rule: packages always on latest).
- `engines.node`: `>=20` (consumers' machines, not this repo's `>=24 <25`).
- Doc URLs: `https://cdn.jsdelivr.net/npm/@eocrm/design-system@<v>/<path>`, fallback `https://unpkg.com/@eocrm/design-system@<v>/<path>`. Listing: `https://data.jsdelivr.com/v1/packages/npm/@eocrm/design-system@<v>?structure=flat` (exact versions only).
- Cache: `$XDG_CACHE_HOME` → `~/.cache` → `%LOCALAPPDATA%`, then `eocrm-design-system-mcp/<v>/`.
- Every tool response's first line: `@eocrm/design-system@<version> (from <source>)`, plus a warning line when a fallback or mismatch happened.
- Server instructions are under 1 KB.
- Primer is at most 14 KB. Content moves to docs and is never deleted. Global hard rules, anti-patterns and the component index stay in the primer.
- The DS `Release` workflow must not publish, version or tag on MCP-only changes. The MCP package has its own versioning and `mcp-vX.Y.Z` tags.
- Every task that touches `packages/design-system/**` is subject to DS Hard rule 8 (pre-push-review) at PR time.

## Review Focus

1. **Monorepo or workspace lockfile with the DS nested** (`packages/web/node_modules/@eocrm/design-system`). Expect the version to be found anyway. → Test in Task 3.
2. **Unknown component name in a different case or with a typo** (`button`, `DataTabel`). Expect a case-insensitive match, or the closest names suggested, never an error. → Test in Task 5.
3. **Offline on first run** (no cache, network down). Expect the bundled snapshot, with the mismatch line stating both versions. → Test in Task 4.
4. **Project that doesn't use the DS at all** (cwd is `~` or another repo). Expect latest, with the "no dependency found" note, and no crash on a missing `package.json`. → Test in Task 3.
5. **Client that doesn't support `roots`.** Expect a fallback to cwd with no hang waiting for `roots/list`. → Test in Task 5 (e2e client without the roots capability).

---

### Task 1: Generated `docs/components/index.json`

**Files:**

- Modify: `packages/design-system/scripts/generate-component-docs.mjs`
- Test: `packages/design-system/src/_meta/componentDocs.test.ts`
- Create (generated): `packages/design-system/docs/components/index.json`

**Interfaces:**

- Produces: `docs/components/index.json`, shaped as `Array<{ name: string; summary: string; cluster: string | null }>` and sorted by name. `name` is the doc's file stem. `summary` is the H1 text after `— ` with backticks stripped (`# \`<Button>\` — action triggers`gives`action triggers`). `cluster`comes from`src/components.manifest.json[name].cluster`, or `null` for non-component docs such as hooks.

- [ ] **Step 1: Write the failing test** in `componentDocs.test.ts`. `index.json` exists. Every `docs/components/*.md` stem appears exactly once. Every entry has a non-empty `summary`. `Button`'s summary is `action triggers`. Every non-null `cluster` matches the manifest.
- [ ] **Step 2: Run** `cd packages/design-system && npx vitest run src/_meta/componentDocs.test.ts`. Expected: FAIL (file missing).
- [ ] **Step 3: Implement.** In `generate-component-docs.mjs`, after the per-doc loop, build the array and write it with `JSON.stringify(x, null, 2) + '\n'`. Under `--check`, compare it instead and exit 1 on drift, the same way the `.md` files are handled. A doc whose H1 has no `— ` fails the generator, naming the file.
- [ ] **Step 4: Run** `npm run build:docs && npx vitest run src/_meta/componentDocs.test.ts && node scripts/generate-component-docs.mjs --check`. Expected: PASS, exit 0.
- [ ] **Step 5: Commit** `feat(docs): generate docs/components/index.json for agent tooling`

### Task 2: Slim `AI-PRIMER.md` to ≤ 14 KB

**Files:**

- Modify: `packages/design-system/AI-PRIMER.md`
- Create: `packages/design-system/docs/i18n.md`, `docs/accessible-names.md` (the "empty label prop means unset" section), `docs/typescript.md`. Dark theme goes into the existing `docs/theming.md`, and transient state stays in `docs/transient-state.md`.
- Modify: `docs/components/Text.md`, `Title.md` (typography hard rule), `Progress.md` (progress hard rule)
- Modify only if they read the primer alone: gates in `src/structure.test.ts` and `src/styles/contrast.test.ts`, which must read primer + `docs/**` (`readPrimer()` in contrast.test.ts already does)
- Test: `packages/design-system/src/_meta/componentDocs.test.ts`

- [ ] **Step 1: Write the failing test.** `statSync('AI-PRIMER.md').size <= 14 * 1024`. The primer links to each of `docs/i18n.md`, `docs/accessible-names.md`, `docs/typescript.md`, `docs/theming.md`, `docs/transient-state.md`, and each of those files exists.
- [ ] **Step 2: Run** `npx vitest run src/_meta/componentDocs.test.ts`. Expected: FAIL (size about 28 KB).
- [ ] **Step 3: Move the sections verbatim.** The primer keeps a one- or two-line summary and the link for each. The component index keeps one line per component. Typography and Progress index lines point to their docs for the rule. No sentence is dropped: diff the union of the old primer against new primer + docs, and every removed line must reappear somewhere.
- [ ] **Step 4: Run** `npm run build:docs && make test`, checking the **exit code**. Expected: 0. If a contrast or structure gate fails because a figure moved out of the primer, widen that gate to primer + `docs/**`, and never delete the assertion.
- [ ] **Step 5: Commit** `docs(primer): move long-form sections to docs/, primer ≤14 KB`

### Task 3: Package scaffold + version resolution

**Files:**

- Create: `packages/design-system-mcp/package.json`, `.gitignore` (`snapshot/`), `src/resolveVersion.js`
- Test: `packages/design-system-mcp/test/resolveVersion.test.mjs`, `test/fixtures/{npm,npm-workspace,pnpm,yarn-classic,yarn-berry,bun,range-only,no-ds}/…`

**Interfaces:**

- Produces: `resolveVersion(projectDir: string, { fetchPackument?: (name) => Promise<object> }): Promise<{ version: string, source: 'package-lock.json'|'pnpm-lock.yaml'|'yarn.lock'|'bun.lock'|'package.json range'|'latest', note?: string }>`
- `package.json`: `"type": "module"`, `"bin": { "design-system-mcp": "src/cli.js" }`, `"files": ["src", "skill", "snapshot", "README.md"]`, `"scripts": { "test": "node --test test/" }`, `publishConfig.access: public`, `license: Apache-2.0`, `engines.node >=20`.

- [ ] **Step 1: Write failing tests**, one per fixture:
  - `npm` gives `{version:'0.6.21', source:'package-lock.json'}`.
  - `npm-workspace` (DS only under `packages/web/node_modules/@eocrm/design-system`) gives `0.6.21`.
  - `pnpm` (`'@eocrm/design-system@0.6.20':`) gives `0.6.20`.
  - `yarn-classic` (`version "0.6.19"`) and `yarn-berry` (`version: 0.6.19`) give `0.6.19`.
  - `bun` (`"@eocrm/design-system@0.6.18"`) gives `0.6.18`.
  - `range-only` (`"^0.6.0"`, stub packument with versions `0.6.17…0.6.21`, `0.7.0`) gives `0.6.21` with `package.json range`.
  - `no-ds` and a nonexistent dir give stub-latest with `source:'latest'` and `note` containing `no @eocrm/design-system dependency found`.
- [ ] **Step 2: Run** `npm test -w @eocrm/design-system-mcp`. Expected: FAIL.
- [ ] **Step 3: Implement.** Check lockfiles in the order above, first hit wins. Text lockfiles use a regex on the exact resolved version. If several DS versions appear in one lockfile, take the highest (`// ponytail: highest wins; per-workspace resolution if a monorepo pins two`). Ranges resolve with `semver.maxSatisfying` against `https://registry.npmjs.org/@eocrm%2fdesign-system`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(mcp): package scaffold and DS version resolution`

### Task 4: Doc source (fetch → cache → bundled snapshot)

**Files:**

- Create: `packages/design-system-mcp/src/docSource.js`, `scripts/bundle-snapshot.mjs`
- Test: `test/docSource.test.mjs`, `test/fixtures/snapshot/` (`VERSION` = `0.6.21`, `AI-PRIMER.md`, `docs/components/Button.md`)

**Interfaces:**

- Produces: `createDocSource({ cacheDir?, snapshotDir?, fetch? })` returns `{ readFile(version, path): Promise<{ text, servedVersion, warning? }>, listFiles(version): Promise<{ files: string[], servedVersion, warning? }> }`. `files` are paths relative to the package root (`docs/components/Button.md`).
- `scripts/bundle-snapshot.mjs [outDir=snapshot]`: runs `npm pack @eocrm/design-system@latest`, extracts `AI-PRIMER.md`, `docs/**` and `src/components.manifest.json` into `outDir`, writes `outDir/VERSION`, and writes `outDir/files.json` (the listing).

- [ ] **Step 1: Write failing tests** with `fetch` stubbed:
  - A jsDelivr hit writes the cache. A second call doesn't fetch.
  - A jsDelivr 5xx falls back to unpkg.
  - When both fail and the cache misses, the result is the snapshot text with `warning` containing `bundled 0.6.21` and `requested 0.6.17 unavailable offline`.
  - When both fail but the cache hits, the result is the cache with no warning.
  - `listFiles` parses jsDelivr's flat listing (`{files:[{name:'/docs/components/Button.md'}]}`) into `docs/components/Button.md`, and falls back to `snapshot/files.json`.
  - A 404 for a file that doesn't exist in that version gives `null` text with no snapshot fallback.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Cache writes are atomic (write to a temp file, then rename). Fetch timeout is 5 s via `AbortSignal.timeout`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(mcp): versioned doc source with cache and offline snapshot`

### Task 5: MCP server, tools, instructions

**Files:**

- Create: `packages/design-system-mcp/src/server.js`, `src/tools.js`, `src/instructions.js`, `src/cli.js`
- Test: `test/tools.test.mjs`, `test/e2e.test.mjs`

**Interfaces:**

- Consumes: `resolveVersion`, `createDocSource`.
- Produces: `createServer({ docSource, resolveVersion, cwd })` returns an `McpServer`. Tools:
  - `get_primer()` returns `AI-PRIMER.md`.
  - `list_components()` returns markdown lines `- **Name** — summary (cluster)` from `docs/components/index.json`. If that file is absent, it lists names from `listFiles` plus `summaries unavailable for <v>; upgrade the DS`.
  - `get_component_doc({ name: string })` matches case-insensitively. On a miss it returns `No component "<name>". Closest: A, B, C` (top 3 by Levenshtein).
  - `get_doc({ topic: string })` takes a topic that is a `docs/*.md` stem (top level only) for that version. An unknown topic lists the available ones.
  - Project dir: the first `roots/list` root (`file://` URI) that has `package.json`, if the client advertised `roots`. Otherwise `cwd`. `roots/list` gets a 2 s timeout.
- `cli.js`: no args starts stdio. `install-skill` goes to Task 6. `--version` prints the version.
- `instructions.js` exports `INSTRUCTIONS` (string, under 1 KB): what the DS is; the rules (use DS components only and never raw `<button>`/`<input>`; tokens only, no raw colour or px; no margin or positioning on components, use `Stack`/`Cluster`; import from the package root only); "Call `get_primer` once per UI task, `list_components` before choosing components, and `get_component_doc` before using one."

- [ ] **Step 1: Write failing tests.**
  - `tools.test.mjs` uses stub docSource and resolveVersion:
    - The header line comes first in every tool.
    - `get_component_doc({name:'button'})` gives `Button.md`.
    - `{name:'DataTabel'}` lists `DataTable` among the closest.
    - Old-version `list_components` has no index and includes the "summaries unavailable" text.
    - `get_doc({topic:'nope'})` lists `setup`.
    - `INSTRUCTIONS.length < 1024`.
  - `e2e.test.mjs` spawns `node src/cli.js` with `EOCRM_DS_MCP_OFFLINE=1`, which makes docSource skip the network and use `test/fixtures/snapshot`. It connects an SDK `Client` over `StdioClientTransport` without the roots capability and checks:
    - `listTools` has exactly the four tool names.
    - `getServerVersion` / instructions contain `get_primer`.
    - `callTool get_component_doc {name:'Button'}` contains `<Button>`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** with `McpServer` + `StdioServerTransport` from the SDK, zod input schemas, and the version from `package.json` as the server version.
- [ ] **Step 4: Run.** Expected: PASS. Also run a manual smoke check: `npx @modelcontextprotocol/inspector node packages/design-system-mcp/src/cli.js` and call each tool once against the real network.
- [ ] **Step 5: Commit** `feat(mcp): stdio server with primer/component/doc tools`

### Task 6: Portable skill + `install-skill`

**Files:**

- Create: `packages/design-system-mcp/skill/eocrm-design-system/SKILL.md`, `src/installSkill.js`
- Modify: `src/cli.js`
- Test: `test/installSkill.test.mjs`

**Interfaces:**

- `installSkill({ home, dryRun, log }): Promise<string[]>` returns the paths written. It writes to `<home>/<dir>/eocrm-design-system/SKILL.md` for each client whose config root already exists under `home`. `CLIENT_SKILL_DIRS` maps client to dir. **Before coding, verify each client's current user-level skills path in its official docs.** The starting guesses to check: Claude Code `.claude/skills`, Codex `.codex/skills` or `.agents/skills`, Cursor `.cursor/skills`, VS Code/Copilot `.copilot/skills`. Record the doc URL beside each entry.
- SKILL.md frontmatter is `name` + `description` only. The description triggers on "building or changing UI in a project that depends on @eocrm/design-system". The body is the same rules as `INSTRUCTIONS` plus "if the `eocrm-design-system` MCP server is connected use its tools; otherwise read `node_modules/@eocrm/design-system/AI-PRIMER.md`".

- [ ] **Step 1: Write failing tests** against a temp `home`:
  - With only `.claude/` present, exactly one file is written, under `.claude/skills/eocrm-design-system/`.
  - `dryRun` writes nothing and returns the same paths.
  - A second run overwrites the file and doesn't duplicate it.
  - The SKILL.md frontmatter keys are exactly `name` and `description`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** `cli.js install-skill [--dry-run]` prints each path, or `No supported agent client found in <home>` and exits 0.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(mcp): portable SKILL.md and install-skill command`

### Task 7: Install docs

**Files:**

- Create: `packages/design-system-mcp/README.md`
- Modify: `packages/design-system/README.md` (agent section), `packages/design-system/AI-PRIMER.md` (first paragraph: "Agents: install the MCP server — see `@eocrm/design-system-mcp`")

- [ ] **Step 1: Write the README.**
  - What the server does, and the version-matching behaviour.
  - User-scope install for each client:
    - Claude Code: `claude mcp add --scope user eocrm-design-system -- npx -y @eocrm/design-system-mcp`
    - Codex: `codex mcp add …` plus the `~/.codex/config.toml` snippet.
    - Cursor: install deeplink (`cursor://anysphere.cursor-deeplink/mcp/install?name=…&config=<base64>`) plus the `~/.cursor/mcp.json` snippet.
    - VS Code: the `vscode:mcp/install?<urlencoded json>` link plus the `mcp.json` snippet.
    - A generic JSON block for other clients.
  - `npx -y @eocrm/design-system-mcp install-skill`.
  - Offline behaviour, cache location, troubleshooting ("tools bind at session start, restart the client").
  - Verify every command and link format against each client's current docs, and generate the base64/urlencoded payloads with a one-off node command, not by hand.
- [ ] **Step 2: Run** `npm run build:docs -w @eocrm/design-system` and the primer size test. Expected: PASS (still ≤ 14 KB).
- [ ] **Step 3: Commit** `docs(mcp): per-client install instructions`

### Task 8: CI + independent release

**Files:**

- Modify: `scripts/ci-changes.sh` (new key `mcp`: `^packages/design-system-mcp/`), `.github/workflows/quality.yml` (job `mcp`: `npm ci` then `npm test -w @eocrm/design-system-mcp`, gated on `needs.changes.outputs.mcp`, and added to `check.needs`), `packages/design-tokens/test/ci-changes-contract.test.mjs` (the new key)
- Create: `.github/workflows/release-mcp.yml`, `packages/design-tokens/test/tooling/release-isolation.test.mjs`
- Modify: `release.yml` `paths:`, adding `"!packages/design-system-mcp/**"` so MCP-only merges don't even start the DS Release

**release-mcp.yml:**

- Trigger: `push` to `main`, paths `packages/design-system-mcp/**` and `.github/workflows/release-mcp.yml`.
- Permissions: `contents: write`, `id-token: write`. `concurrency: release-mcp`, no cancel. `env.BUMP: patch`.
- Job:
  1. checkout with `fetch-depth: 0`, Node 24, `npm ci`, then `npm test -w @eocrm/design-system-mcp`.
  2. Compute the next version from the latest `mcp-v<semver>` tag (start at `0.1.0` if none) and refuse to run if the tag already exists.
  3. `npm version --no-git-tag-version` in the package.
  4. `node scripts/bundle-snapshot.mjs snapshot` in the package.
  5. Run `npm pack --dry-run` and assert `snapshot/VERSION` is in it.
  6. `npm publish --provenance --access public`, with the same E409 handling as `release.yml`.
  7. Poll `npm view @eocrm/design-system-mcp@<v> version` for up to 10 min.
  8. Tag `mcp-v<v>` and push.

- [ ] **Step 1: Write failing tests** in `release-isolation.test.mjs`:
  - Running `detect-library-changes` logic over a diff containing only `packages/design-system-mcp/src/server.js` gives `false`. Extract the path predicate if needed, or test the regex `^packages\/design-(?:tokens|system)\/` directly against that path.
  - `latestStableReleaseTag` ignores a tag named `mcp-v9.9.9`, using a temp git repo.
  - `release.yml` `on.push.paths` contains `!packages/design-system-mcp/**`.
  - `ci-changes.sh --files` with that one path emits `mcp=true` and `ds=false`.
- [ ] **Step 2: Run** `npm run test:tooling && npm run tokens:test`. Expected: FAIL on the new assertions.
- [ ] **Step 3: Implement** the workflow, CI key and paths change.
- [ ] **Step 4: Run** `npm run test:tooling && npm run tokens:test && npm test -w @eocrm/design-system-mcp`. Expected: PASS. Also lint the new workflow with `npx --yes action-validator .github/workflows/release-mcp.yml` if available, or check the YAML parses.
- [ ] **Step 5: Commit** `ci(mcp): path-selected tests and independent release workflow`

### Before merge (human step, blocks merge)

`release-mcp.yml` fails on the first merge unless the package already exists on npmjs with this workflow as its trusted publisher. File this as an eocrm human-work task blocking DS-1 (skill `eocrm:file-human-work`):

1. Locally run `cd packages/design-system-mcp && node scripts/bundle-snapshot.mjs && npm version 0.0.1 --no-git-tag-version && npm publish --access public`, then revert the version bump.
2. On npmjs, go to package settings, then Trusted publishing, and add `eocrm/design-system` with the workflow `release-mcp.yml`.

The PR goes through `pre-push-review` (variant A, Standard tier), because Tasks 1, 2 and 7 touch `packages/design-system/**`.
