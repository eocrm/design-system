# README Artifact Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display the latest verified release version for each of the three published library artifacts in the root README.

**Architecture:** Replace the generic package badge with three labeled views of the latest semantic `v*` Git tag. Link each view to the corresponding GitHub Packages artifact while preserving the existing CI and playground deployment badges.

**Tech Stack:** Markdown, Shields.io GitHub tag badges, GitHub Packages

## Global Constraints

- Show `design-system`, `design-tokens`, and `compose tokens` as separate badges.
- Use the latest semver-sorted `v*` tag because release tags are created only after all artifacts are verified.
- Keep the existing CI and playground deployment badges unchanged.
- Do not depend on authenticated registry APIs to render badges.

---

### Task 1: Replace the Generic Package Badge

**Files:**

- Modify: `README.md:3-7`

**Interfaces:**

- Consumes: release tags matching `v*` from `eocrm/design-system`
- Produces: three clickable artifact-version badges in the root README

- [ ] **Step 1: Record the current badge block**

Run:

```bash
sed -n '1,10p' README.md
```

Expected: one CI badge, one generic Package badge, and one Playground badge.

- [ ] **Step 2: Replace the generic badge**

Replace the generic Package badge with these three Markdown badges:

```markdown
[![design-system](https://img.shields.io/github/v/tag/eocrm/design-system?sort=semver&filter=v*&label=design-system)](https://github.com/eocrm/design-system/pkgs/npm/design-system)
[![design-tokens](https://img.shields.io/github/v/tag/eocrm/design-system?sort=semver&filter=v*&label=design-tokens)](https://github.com/eocrm/design-system/pkgs/npm/design-tokens)
[![compose tokens](https://img.shields.io/github/v/tag/eocrm/design-system?sort=semver&filter=v*&label=compose%20tokens)](https://github.com/eocrm/design-system/packages)
```

Leave the CI and Playground badge lines byte-for-byte unchanged.

- [ ] **Step 3: Verify the Markdown change**

Run:

```bash
git diff --check
npm run format:check
```

Expected: both commands exit successfully.

- [ ] **Step 4: Inspect the rendered targets**

Run:

```bash
rg -n "img\\.shields\\.io|github\\.com/eocrm/design-system/(pkgs|packages)" README.md
```

Expected: CI, three artifact-version badges, and Playground appear; each artifact label is unique and each link targets its artifact page or the repository package index.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/superpowers/plans/2026-07-31-readme-artifact-badges.md
git commit -m "docs: show released artifact versions"
```
