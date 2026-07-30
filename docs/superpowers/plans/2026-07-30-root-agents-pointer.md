# Root AGENTS.md Pointer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a root agent-discovery file that points to the repository's authoritative Claude guidance and skills.

**Architecture:** A single root `AGENTS.md` acts as a compatibility entry point. It contains navigation and precedence guidance only, leaving all substantive rules in the existing Claude files.

**Tech Stack:** Markdown repository documentation

## Global Constraints

- Identify the repository as Claude-first.
- Keep `CLAUDE.md`, package-level `CLAUDE.md` files, and `.claude/skills/` authoritative.
- Do not duplicate implementation or package rules.

---

### Task 1: Add the root compatibility pointer

**Files:**
- Create: `AGENTS.md`
- Read: `CLAUDE.md`
- Read: `.claude/skills/`

**Interfaces:**
- Consumes: Existing root and package-level Claude instructions and repository-local Claude skills.
- Produces: A root discovery file for agents that automatically load `AGENTS.md`.

- [ ] **Step 1: Confirm every referenced guidance path exists**

Run:

```bash
test -f CLAUDE.md
find packages -mindepth 2 -maxdepth 2 -name CLAUDE.md -print
find .claude/skills -mindepth 2 -maxdepth 2 -name SKILL.md -print
```

Expected: all commands exit successfully; the latter two commands list the package guidance and repository-local skill files.

- [ ] **Step 2: Create the root pointer**

Create `AGENTS.md` with:

```markdown
# Agent guidance

This is a Claude-first repository. Before doing any work, read and follow the root [`CLAUDE.md`](./CLAUDE.md).

When working inside a package, also read and follow the nearest package-level `CLAUDE.md`.

Inspect [`.claude/skills/`](./.claude/skills/) and load every skill relevant to the current task before acting.

The Claude guidance and skills are authoritative. Keep this file as a short compatibility pointer rather than duplicating their rules here.
```

- [ ] **Step 3: Verify the pointer**

Run:

```bash
test -f AGENTS.md
rg -n 'CLAUDE\.md|\.claude/skills|authoritative' AGENTS.md
git diff --check
```

Expected: `AGENTS.md` exists, all three pointer concepts are found, and `git diff --check` exits successfully with no output.

- [ ] **Step 4: Commit the documentation**

```bash
git add AGENTS.md docs/superpowers/plans/2026-07-30-root-agents-pointer.md
git commit -m "docs: add root agent guidance pointer"
```
