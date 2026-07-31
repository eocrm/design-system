# Root AGENTS.md Pointer Design

## Purpose

Add a small compatibility entry point for coding agents that discover `AGENTS.md`
but do not automatically discover Claude-specific repository guidance.

## Design

Create a root `AGENTS.md` that:

- identifies the repository as Claude-first;
- directs agents to read the root `CLAUDE.md` before working;
- directs agents working within a package to read that package's nearest
  `CLAUDE.md`;
- directs agents to inspect `.claude/skills/` and load skills relevant to the
  current task; and
- states that the linked Claude files remain authoritative.

The file will not duplicate implementation rules or package guidance. Keeping it
as pointers prevents parallel instruction sets from drifting apart.

## Verification

Confirm that every referenced path exists and that the new `AGENTS.md` contains
only navigation and precedence guidance.
