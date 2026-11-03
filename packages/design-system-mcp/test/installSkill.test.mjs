import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { INSTRUCTIONS } from '../src/instructions.js';
import { installSkill } from '../src/installSkill.js';

const mkHome = async (t, ...roots) => {
  const home = await mkdtemp(join(tmpdir(), 'skill-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  for (const r of roots) await mkdir(join(home, r));
  return home;
};

test('writes only for clients whose root exists', async (t) => {
  const home = await mkHome(t, '.claude');
  const paths = await installSkill({ home });
  assert.deepEqual(paths, [join(home, '.claude/skills/eocrm-design-system/SKILL.md')]);
  await access(paths[0]);
});

test('dryRun writes nothing, returns same paths', async (t) => {
  const home = await mkHome(t, '.claude');
  const paths = await installSkill({ home, dryRun: true });
  assert.equal(paths.length, 1);
  await assert.rejects(access(paths[0]));
});

test('second run overwrites without duplicating', async (t) => {
  const home = await mkHome(t, '.claude', '.codex');
  const a = await installSkill({ home });
  const b = await installSkill({ home });
  assert.deepEqual(a, b);
  assert.equal(a.length, 2);
  assert.ok(
    a.some((p) => p.includes(join('.agents', 'skills'))),
    'codex target',
  );
});

test('frontmatter keys are exactly name and description', async (t) => {
  const home = await mkHome(t, '.claude');
  const [p] = await installSkill({ home });
  const fm = (await readFile(p, 'utf8')).match(/^---\n([\s\S]*?)\n---/)[1];
  const keys = fm.split('\n').map((l) => l.split(':')[0]);
  assert.deepEqual(keys, ['name', 'description']);
});

test('SKILL.md rules match INSTRUCTIONS', async () => {
  const skill = await readFile(
    new URL('../skill/eocrm-design-system/SKILL.md', import.meta.url),
    'utf8',
  );
  const rules = skill
    .split('\n')
    .filter((l) => l.startsWith('- '))
    .map((l) => l.replaceAll('`', ''));
  const expected = INSTRUCTIONS.split('\n').filter((l) => l.startsWith('- '));
  assert.equal(expected.length, 4);
  assert.deepEqual(rules.slice(0, expected.length), expected);
});
