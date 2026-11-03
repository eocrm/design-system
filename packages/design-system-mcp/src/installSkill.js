import { access, copyFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SKILL_SOURCE = new URL('../skill/eocrm-design-system/SKILL.md', import.meta.url);

/**
 * Client config root (under home) -> user-level skills dir (under home).
 * Install only happens when the root already exists.
 */
export const CLIENT_SKILL_DIRS = {
  // https://code.claude.com/docs/en/skills
  '.claude': '.claude/skills',
  // https://learn.chatgpt.com/docs/build-skills (developers.openai.com/codex/skills redirects here)
  '.codex': '.agents/skills',
  // https://cursor.com/docs/context/skills
  '.cursor': '.cursor/skills',
  // https://code.visualstudio.com/docs/copilot/customization/agent-skills
  '.copilot': '.copilot/skills',
};

const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );

/** @returns {Promise<string[]>} paths of the SKILL.md files written (or that would be, on dryRun) */
export async function installSkill({ home = homedir(), dryRun = false, log = () => {} } = {}) {
  const written = [];
  for (const [root, dir] of Object.entries(CLIENT_SKILL_DIRS)) {
    if (!(await exists(join(home, root)))) continue;
    const target = join(home, dir, 'eocrm-design-system', 'SKILL.md');
    if (!dryRun) {
      await mkdir(join(target, '..'), { recursive: true });
      await copyFile(SKILL_SOURCE, target);
    }
    log(target);
    written.push(target);
  }
  return written;
}
