# Node 24 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Node.js 24 the enforced local and CI runtime for the repository without changing package behavior or weakening tests.

**Architecture:** A root runtime contract (`.nvmrc` plus `package.json#engines`) defines the supported major, while a focused repository-contract test prevents the three GitHub workflows from drifting from it. Existing token, library, playground, and release behavior remains unchanged; the current suites validate compatibility on Node 24.

**Tech Stack:** Node.js 24, npm workspaces, Node's built-in test runner, GitHub Actions YAML, Husky.

## Global Constraints

- CI and local development use Node 24.
- Root `package.json#engines.node` is exactly `>=24 <25`.
- Root `.nvmrc` contains exactly `24` followed by a newline.
- `quality.yml` and `deploy-playground.yml` each contain one Node 24 setup step; `release.yml` contains two, including one before the Node-based change detector.
- Do not pin a Node 24 patch release.
- Do not modify or skip existing token tests.
- Do not upgrade npm, Gradle, Java, Android, GitHub actions, or application dependencies.
- Do not change package APIs, generated artifacts, workflow topology, release versioning, or tarball contents.

---

### Task 1: Define and enforce the Node 24 runtime contract

**Files:**

- Create: `.nvmrc`
- Modify: `package.json`
- Modify: `.github/workflows/quality.yml`
- Modify: `.github/workflows/release.yml`
- Modify: `.github/workflows/deploy-playground.yml`
- Create: `packages/design-tokens/test/node-runtime-contract.test.mjs`

**Interfaces:**

- Consumes: root repository metadata and the three workflows' `Setup Node` steps.
- Produces: `.nvmrc = "24\n"`, `engines.node = ">=24 <25"`, and a test-enforced `node-version: "24"` workflow contract.

- [ ] **Step 1: Install dependencies and confirm the active runtime**

```bash
npm install
node --version
```

Expected: install exits 0 without changing dependency versions, and Node reports `v24.x.x`.

- [ ] **Step 2: Add the failing runtime-contract test**

Create `packages/design-tokens/test/node-runtime-contract.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const runtimeFiles = new Map([
  ['.github/workflows/quality.yml', 1],
  ['.github/workflows/release.yml', 2],
  ['.github/workflows/deploy-playground.yml', 1],
]);

test('pins local development and package support to Node 24', async () => {
  const [nvmrc, packageJson] = await Promise.all([
    readFile(resolve(repositoryRoot, '.nvmrc'), 'utf8'),
    readFile(resolve(repositoryRoot, 'package.json'), 'utf8').then(JSON.parse),
  ]);

  assert.equal(nvmrc, '24\n');
  assert.equal(packageJson.engines?.node, '>=24 <25');
});

test('runs every GitHub workflow Node job on Node 24', async () => {
  for (const [path, expectedSteps] of runtimeFiles) {
    const workflow = await readFile(resolve(repositoryRoot, path), 'utf8');
    const setupNodeSteps = workflow.match(
      /- name: Setup Node[\s\S]*?(?=\n\s+- name:|\n\s+[a-zA-Z][\w-]*:|$)/g,
    );

    assert.equal(setupNodeSteps?.length, expectedSteps, `${path} Setup Node count`);
    for (const step of setupNodeSteps) {
      assert.match(step, /uses: actions\/setup-node@v4/);
      assert.match(step, /node-version: "24"/);
      assert.doesNotMatch(step, /node-version: "22"/);
    }
  }
});
```

- [ ] **Step 3: Run the focused test to verify RED**

```bash
node --test packages/design-tokens/test/node-runtime-contract.test.mjs
```

Expected: FAIL because `.nvmrc` does not exist; after adding only the test fixture temporarily if needed to expose all assertions, the workflow/package assertions also fail on missing `engines` and Node 22.

- [ ] **Step 4: Add the local and package runtime metadata**

Create `.nvmrc` with:

```text
24
```

Add this top-level field to root `package.json` after `version`:

```json
"engines": {
  "node": ">=24 <25"
},
```

Run `npm install` once after the metadata edit so `package-lock.json` records the root engine only if npm changes it. If `package-lock.json` does not change, do not touch it.

- [ ] **Step 5: Migrate every workflow Setup Node step**

In each of the following files, replace every `node-version: "22"` with `node-version: "24"`:

```text
.github/workflows/quality.yml
.github/workflows/release.yml
.github/workflows/deploy-playground.yml
```

Do not change action versions, caching, triggers, permissions, jobs, or commands.

In `.github/workflows/release.yml`, add this step in the
`detect-library-changes` job immediately after Checkout and before Detect
library changes:

```yaml
- name: Setup Node
  uses: actions/setup-node@v4
  with:
    node-version: '24'
```

This job invokes `detect-library-changes.mjs`; the explicit setup prevents it
from using the runner's unspecified system Node. Do not add npm caching here
because the job does not install dependencies.

- [ ] **Step 6: Run the focused runtime and workflow tests to verify GREEN**

```bash
node --test packages/design-tokens/test/node-runtime-contract.test.mjs
node --test packages/design-tokens/test/release-change-detection.test.mjs
```

Expected: both commands exit 0. The first proves local/CI Node 24 alignment; the second proves the workflow edits preserved release, cache, and deployment contracts.

- [ ] **Step 7: Verify formatting and inspect dependency metadata**

```bash
npm run format:check
git diff --check
git diff -- package-lock.json
```

Expected: formatting and whitespace checks pass. Any `package-lock.json` diff is limited to the root `engines` metadata; otherwise restore no lockfile content.

- [ ] **Step 8: Commit the runtime migration**

```bash
git add .nvmrc package.json package-lock.json \
  .github/workflows/quality.yml \
  .github/workflows/release.yml \
  .github/workflows/deploy-playground.yml \
  packages/design-tokens/test/node-runtime-contract.test.mjs
git commit -m "chore: migrate repository to Node 24"
```

If `package-lock.json` is unchanged, omit it from `git add`.

---

### Task 2: Validate and deliver the migration

**Files:**

- No intended source changes. Fix only failures caused by Task 1; do not absorb unrelated upgrades or refactors.

**Interfaces:**

- Consumes: the Node 24 contract committed by Task 1.
- Produces: full local gate evidence, a reviewed PR, and a successful Node 24 GitHub quality/release run.

- [ ] **Step 1: Confirm runtime and run all repository gates outside restricted child-process sandboxes**

```bash
node --version
make test
make build-lib
make lint
npm run format:check
npm_config_cache=/tmp/node24-npm-cache npm pack --dry-run --json \
  --workspace @eocrm/design-system > /tmp/node24-design-system-pack.json
```

Expected: Node reports `v24.x.x`; every gate exits 0. The token suite runs its Gradle and nested Git/Node subprocess tests without skips.

- [ ] **Step 2: Audit the design-system dry-run package**

```bash
jq '[.[0].files[].path | select(test("(^|/)(test|tests|__tests__|internal)(/|\\.|$)|\\.(test|spec)\\.|CLAUDE\\.md$|tsconfig"))] | {leaks: ., count: length}' \
  /tmp/node24-design-system-pack.json
```

Expected:

```json
{
  "leaks": [],
  "count": 0
}
```

- [ ] **Step 3: Run the applicable pre-push review loop**

Because this change touches workflows but not `packages/design-system/**` or playground mockups, the package-specific pre-push review variants do not apply. Run two fresh independent reviewers against the complete branch diff for runtime correctness, workflow consistency, test strength, unintended release changes, and package-lock scope. Fix every Critical/Important finding and repeat until both reviewers in one round return `clean enough to stop`.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin chore/node24-migration
gh pr create --repo eocrm/design-system --base main --head chore/node24-migration \
  --title "chore: migrate repository to Node 24" \
  --body "## Summary
- make Node 24 the supported local runtime
- run quality, release, and playground workflows on Node 24
- enforce runtime alignment with repository-contract tests

## Test plan
- full repository gates under Node 24
- focused workflow/runtime contract tests
- package dry-run audit"
```

- [ ] **Step 5: Wait for Node 24 CI and merge**

```bash
gh pr checks <pr-number> --repo eocrm/design-system --watch
gh pr view <pr-number> --repo eocrm/design-system --json mergeStateStatus --jq .mergeStateStatus
gh pr merge <pr-number> --repo eocrm/design-system --squash --delete-branch
```

Expected: `Quality / check` passes with workflow `Setup Node` selecting Node 24. If the branch is `BEHIND`, update it and wait for the new check before merging; never use `--admin`.

- [ ] **Step 6: Watch the exact Release run**

Resolve the squash-merge SHA and watch the matching Release run. Because workflow files are release-sensitive, `detect-library-changes` is expected to select publication and produce the next patch tag.

```bash
MERGE_SHA=$(gh pr view <pr-number> --repo eocrm/design-system --json mergeCommit --jq .mergeCommit.oid)
gh run list --repo eocrm/design-system --workflow Release --commit "$MERGE_SHA" \
  --json databaseId,status,conclusion,url
gh run watch <run-id> --repo eocrm/design-system --exit-status
gh api -X GET repos/eocrm/design-system/tags -f per_page=5 --jq '.[].name'
```

Expected: quality, publish, artifact verification, tag push, and playground deployment succeed; the newest tag advances from `v0.3.30` to the next available patch version.

---

## Plan self-review

- Spec coverage: local version selection, package engine range, all Node-using workflow jobs (including release detection), unchanged token tests, Node 24 validation, PR quality, and release handling are covered.
- Placeholder scan: angle-bracket PR/run identifiers are runtime outputs, not missing implementation requirements; every code/config edit is explicit.
- Consistency: `.nvmrc`, `engines.node`, workflow values, test assertions, and commands all use Node major 24 and the exact range `>=24 <25`.
