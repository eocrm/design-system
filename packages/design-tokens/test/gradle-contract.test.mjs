import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const composeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../compose');

test('the Compose module passes its JVM contract tests', async (context) => {
  const java = spawnSync('java', ['-version'], { encoding: 'utf8' });
  if (java.error?.code === 'ENOENT') {
    context.skip('Java is unavailable; CI provides Java 21 and never skips this contract.');
    return;
  }
  assert.equal(java.status, 0, java.stderr || java.stdout);

  const gradlew = resolve(composeRoot, 'gradlew');
  await access(gradlew, constants.X_OK);
  const result = spawnSync(gradlew, ['--no-daemon', 'jvmTest'], {
    cwd: composeRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      GRADLE_USER_HOME: process.env.GRADLE_USER_HOME ?? resolve(tmpdir(), 'eocrm-gradle-home'),
    },
    timeout: 10 * 60 * 1000,
  });

  assert.equal(
    result.status,
    0,
    [result.stdout, result.stderr, result.error?.message].filter(Boolean).join('\n'),
  );
});
