# `@eocrm/design-system-mcp` — agent onboarding for any project and any client

Task: DS-1 (https://dpws.eocrm.io/tasks/DS-1)

## Intent

`@eocrm/design-system` is going to be used beyond the CRM. Today agents find
its contract (`AI-PRIMER.md`, `docs/components/<Name>.md`, the manifest) only
because the CRM's `CLAUDE.md` has a hand-written pointer, and even there it
leaks:

- **(a)** agents skip the pointer and read component source or guess;
- **(b)** the host's `node_modules` copy drifts from the container's (named
  Docker volumes), so the reliable read is a long `docker compose exec … cat`;
- **(c)** `AI-PRIMER.md` is ~28 KB (~7k tokens), paid in full on every UI task.

Goal: **install once per machine, works in every project that depends on the
DS, in every common agent client** (Claude Code, Codex, Cursor, VS Code /
Copilot, and other MCP clients), always serving the docs for the DS version
that project actually pins. Inspired by BoardUI's MCP server.

## Goals

1. A new public npm package, `@eocrm/design-system-mcp`, runnable as
   `npx -y @eocrm/design-system-mcp` — a stdio MCP server.
2. The server serves docs **for the project's pinned DS version**, fetched from
   the already-public `@eocrm/design-system` npm tarball contents (no second
   copy of the docs is published).
3. The server's MCP `instructions` carry the hard rules and "look before you
   build" guidance, so any MCP client gets them with no skill/hook.
4. A portable `SKILL.md` (Agent Skills standard, no client-specific
   frontmatter) as an optional extra, plus a command to install it.
5. `AI-PRIMER.md` slimmed to ≈ half (≤ 14 KB); moved content becomes on-demand docs.
6. Per-client install instructions (one command / one-click link each).
7. Released automatically on merge, versioned independently of the DS.

## Non-goals

- Installing component source into projects (BoardUI's `install_components`):
  our consumers import the npm package.
- Licensing, telemetry, accounts.
- A hosted/remote MCP server (rejected: GitHub Pages can't run one, and a
  remote server can't see the project's lockfile).
- Client hooks (per-client formats; the server instructions replace the
  reminder they would give).
- Changes to the CRM repo (removing its hand-written pointer, the docker
  `cat` instructions) — a follow-up PR there once this ships.
- Any change to components, tokens or public API of `@eocrm/design-system`.

## Anti-goals (failure even if it "works")

- Serving docs for a **different** DS version than the project pins, silently.
  A mismatch must be visible in the tool output.
- Slimming the primer by **deleting** guidance. Content moves, it doesn't
  disappear; hard rules and anti-patterns stay in the primer.
- `npx` start that downloads React/dnd-kit/d3 (why this is a separate package).
- A second hand-maintained copy of docs that can drift from the library.

## Decided

- **Option A** — separate small npm package, run via `npx` (user decision).
  Alternatives rejected: `npx github:eocrm/design-system` (clones + installs the
  whole monorepo on every start), hosted remote MCP (above).
- **All clients**, MCP as the universal layer; skill is an extra; no hooks.
- Package lives in this monorepo: `packages/design-system-mcp/`.

## Design

### Version resolution

The server needs the project root. Order:

1. MCP **roots** from the client (`roots/list`), first root that has a
   `package.json`;
2. else `process.cwd()`.

Then the DS version, first hit wins:

1. `package-lock.json` → `packages["node_modules/@eocrm/design-system"].version`
   (also workspace-nested paths: any `…/node_modules/@eocrm/design-system`);
2. `pnpm-lock.yaml`, `yarn.lock`, `bun.lock` (text) — exact resolved version;
3. `package.json` dependency range → highest matching published version
   (npm registry packument);
4. nothing found → latest, and every tool response says
   "no @eocrm/design-system dependency found; showing latest X".

The **committed lockfile**, not `node_modules`, is the source — this is what
fixes the Docker/host drift (b). Resolution happens per tool call (cheap;
lockfile is re-read) so switching projects/branches is reflected.

**Supported DS versions (my call):** every published version — all of them
(0.6.17+) ship `AI-PRIMER.md` and `docs/components/*.md`. The server must not
depend on files only new versions have: the component list and the `get_doc`
topic enum come from jsDelivr's file listing for the exact version
(`https://data.jsdelivr.com/v1/packages/npm/@eocrm/design-system@<v>?structure=flat`
— exact versions only, no ranges/tags). Old versions get the old 28 KB primer
as-is.

A version not on npmjs (e.g. an old GitHub Packages-only build, private
registry) → not fetchable; serve the bundled snapshot with the mismatch
warning. No registry/`.npmrc`-aware fetching (my call).

Every tool response starts with a one-line header:
`@eocrm/design-system@<version> (from <source>)`.

### Fetching docs

- Files fetched from `https://cdn.jsdelivr.net/npm/@eocrm/design-system@<v>/<path>`,
  fallback `https://unpkg.com/@eocrm/design-system@<v>/<path>`.
- Cached on disk per exact version (immutable on npm) under the OS cache dir
  (`$XDG_CACHE_HOME` / `~/.cache` / `%LOCALAPPDATA%`) `eocrm-design-system-mcp/<v>/`.
- **Offline fallback:** the package bundles a snapshot of `AI-PRIMER.md` and
  `docs/**` from the latest published DS at MCP publish time (see Release).
  If fetch fails and the cache misses, serve the
  bundled snapshot and say so in the header
  (`… bundled <bv>, requested <v> unavailable offline`).

### Tools

| Tool                | Input                                                                                        | Returns                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `get_primer`        | —                                                                                            | slimmed `AI-PRIMER.md`                                                  |
| `list_components`   | —                                                                                            | every component: name, one-line summary, cluster — from the DS manifest |
| `get_component_doc` | `name` (case-insensitive; unknown → closest names suggested)                                 | `docs/components/<Name>.md`                                             |
| `get_doc`           | `topic` (enum from the `docs/*.md` present in that version: setup, theming, tokens, i18n, …) | that doc                                                                |

`list_components` source (my call): a new generated
`docs/components/index.json` (`[{ name, summary, cluster }]`) emitted by
`npm run build:docs`, where `summary` is the doc's TL;DR first sentence and
`cluster` comes from the manifest; covered by the existing docs drift test.
For versions published before it exists: names from the file listing, no
summaries, plus a note "summaries unavailable for <v>; upgrade the DS". No
parsing of `manifest.ts`.

### Server instructions

Short (< 1 KB): what the DS is; hard rules (DS components only, tokens only,
no layout on components, root imports only); "call `list_components` and the
relevant `get_component_doc` before writing UI; call `get_primer` once per
task". This is the fix for (a) in every client.

### Skill

`packages/design-system-mcp/skill/eocrm-design-system/SKILL.md` — standard
`name` + `description` frontmatter only. Triggers on building UI in a project
using `@eocrm/design-system`; body = same rules + "use the MCP tools".
`npx -y @eocrm/design-system-mcp install-skill` copies it into the user-level
skill dirs of detected clients. The builder must verify each client's
current user-level skill path before hard-coding it.

### Primer slimming (c)

Target ≈ half the current size (≤ 14 KB; < 10 KB isn't reachable without
dropping the index or anti-patterns — my call to relax it). Stays: the global
hard rules, setup pointer, anti-patterns, component index (one line each — the
non-MCP path, e.g. reading from `node_modules`, still needs it). Moves out to
`docs/*.md` (new files where needed): i18n, the empty-label rule, dark theme,
theming, transient state, TypeScript notes. **Component-specific** rules
(typography → `docs/components/Text.md`/`Title.md`, progress →
`Progress.md`) move to their component docs and the index line points there.
Any existing test/script that reads primer sections
(`structure.test.ts`, `generate-component-docs.mjs`) is updated, not
weakened.

### Install docs

`packages/design-system-mcp/README.md` (shows on npmjs) with, per client,
user-scope install: Claude Code (`claude mcp add --scope user …`), Codex
(`codex mcp add …` / config.toml), Cursor (one-click deeplink + JSON),
VS Code (install URL + `mcp.json`), generic JSON for others. Linked from
`packages/design-system/README.md` and `AI-PRIMER.md`'s top.

### Release

**Independent versioning (user decision).** The MCP package does not share
the DS version, so a server-only fix never republishes tokens/DS/Compose.

- New workflow `.github/workflows/release-mcp.yml` (own file → own npm
  trusted-publisher entry): on push to `main` touching
  `packages/design-system-mcp/**`, runs the MCP package's tests, computes the
  next version from the latest `mcp-v*` tag (patch by default, own `BUMP`),
  publishes with the same E409 handling and post-publish verification as
  `release.yml`, then pushes an `mcp-vX.Y.Z` tag.
- `release.yml` must ignore the package: excluded from
  `detect-library-changes.mjs` and from `set-release-version.mjs`, and its
  `v*` tag lookup must not match `mcp-v*`.
- **Bundled snapshot** = the latest **published** DS at MCP publish time
  (`npm pack @eocrm/design-system@latest`, extract `AI-PRIMER.md`, `docs/**`),
  so it always equals a real DS version, recorded in the package. Not the
  repo's working tree (may be unreleased).
- **Human step (first publish):** npm trusted publishing can only be
  configured on an existing package — the maintainer publishes `0.0.x` once
  manually (or creates the package) and registers `release.yml` as its trusted
  publisher before the first automated release.

### Tests

`node --test` in the package (like `design-tokens`): version resolution per
lockfile format and fallback order; fetch → cache → bundled fallback with
`fetch` stubbed; tool handlers (unknown component suggestions, header line).
One end-to-end test spawning the server over stdio with the SDK client and
calling `list_components` against the bundled snapshot (no network).

## Left to the builder

Language (plain ESM JS with JSDoc vs TS + build — repo has no build step for
packages, prefer plain ESM), lockfile parsing approach, cache layout, exact
instructions/skill wording, README structure, Node engine floor (follow the
repo's), `@modelcontextprotocol/sdk` at latest.
