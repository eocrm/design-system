import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { installSkill } from '../src/installSkill.js';

const mkHome = async (...roots) => {
  const home = await mkdtemp(join(tmpdir(), 'skill-'));
  for (const r of roots) await mkdir(join(home, r));
  return home;
};

test('writes only for clients whose root exists', async () => {
  const home = await mkHome('.claude');
  const paths = await installSkill({ home });
  assert.deepEqual(paths, [join(home, '.claude/skills/eocrm-design-system/SKILL.md')]);
  await access(paths[0]);
});

test('dryRun writes nothing, returns same paths', async () => {
  const home = await mkHome('.claude');
  const paths = await installSkill({ home, dryRun: true });
  assert.equal(paths.length, 1);
  await assert.rejects(access(paths[0]));
});

test('second run overwrites without duplicating', async () => {
  const home = await mkHome('.claude', '.codex');
  const a = await installSkill({ home });
  const b = await installSkill({ home });
  assert.deepEqual(a, b);
  assert.equal(a.length, 2);
});

test('frontmatter keys are exactly name and description', async () => {
  const home = await mkHome('.claude');
  const [p] = await installSkill({ home });
  const fm = (await readFile(p, 'utf8')).match(/^---\n([\s\S]*?)\n---/)[1];
  const keys = fm.split('\n').map((l) => l.split(':')[0]);
  assert.deepEqual(keys, ['name', 'description']);
});
