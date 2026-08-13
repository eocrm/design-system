import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import test from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const designSystemRoot = join(repositoryRoot, 'packages/design-system');
const tokenRoot = join(repositoryRoot, 'packages/design-tokens');

test('preserves the design-system package and TypeScript export surfaces', async () => {
  const packageJson = JSON.parse(await readFile(join(designSystemRoot, 'package.json'), 'utf8'));
  const indexSource = await readFile(join(designSystemRoot, 'src/index.ts'));

  assert.deepEqual(packageJson.exports, {
    '.': {
      types: './src/index.ts',
      import: './src/index.ts',
    },
    './styles/global.scss': './src/styles/global.scss',
    './styles/tokens.scss': './src/styles/tokens.scss',
    './styles/reset.scss': './src/styles/reset.scss',
    './styles/typography.scss': './src/styles/typography.scss',
    './styles/mixins.scss': './src/styles/mixins.scss',
    './package.json': './package.json',
  });
  assert.equal(
    createHash('sha256').update(indexSource).digest('hex'),
    '58e7bc35a731d491fcb90c046f265732660efd0de02b8f6dbe1c7e4162f1db98',
  );
});

test('packed Sass entry points resolve through the installed token package', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eocrm-package-boundary-'));
  const packDirectory = join(directory, 'packs');
  const fixture = join(directory, 'fixture');

  try {
    await Promise.all([
      mkdir(packDirectory, { recursive: true }),
      mkdir(fixture, { recursive: true }),
    ]);
    const tokenTarball = await pack(tokenRoot, packDirectory);
    const designSystemTarball = await pack(designSystemRoot, packDirectory);
    const [designSystemPackage, tokenPackage] = await Promise.all([
      readFile(join(designSystemRoot, 'package.json'), 'utf8').then(JSON.parse),
      readFile(join(tokenRoot, 'package.json'), 'utf8').then(JSON.parse),
    ]);

    assert.equal(designSystemPackage.dependencies['@eocrm/design-tokens'], tokenPackage.version);

    await writeFile(
      join(fixture, 'package.json'),
      `${JSON.stringify(
        {
          name: 'eocrm-package-boundary-fixture',
          private: true,
          dependencies: {
            '@eocrm/design-tokens': `file:${tokenTarball}`,
          },
        },
        null,
        2,
      )}\n`,
    );
    await run(
      'npm',
      ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--legacy-peer-deps'],
      fixture,
    );
    const installedDesignSystem = join(fixture, 'node_modules/@eocrm/design-system');
    await mkdir(installedDesignSystem, { recursive: true });
    await run(
      'tar',
      ['-xzf', designSystemTarball, '--strip-components=1', '-C', installedDesignSystem],
      fixture,
    );

    await writeFile(
      join(fixture, 'index.html'),
      '<!doctype html><script type="module" src="/main.js"></script>\n',
    );
    await writeFile(
      join(fixture, 'main.js'),
      [
        "import '@eocrm/design-system/styles/tokens.scss';",
        "import './node_modules/@eocrm/design-system/src/styles/dark.scss';",
        "import '@eocrm/design-system/styles/global.scss';",
        '',
      ].join('\n'),
    );
    await run(join(repositoryRoot, 'node_modules/.bin/vite'), ['build'], fixture);
  } finally {
    await rm(directory, { recursive: true });
  }
});

async function pack(packageRoot, destination) {
  const before = new Set(await readdir(destination));
  await run('npm', ['pack', '--json', '--pack-destination', destination], packageRoot);
  const created = (await readdir(destination)).filter(
    (name) => name.endsWith('.tgz') && !before.has(name),
  );
  assert.equal(created.length, 1, `expected one tarball from ${packageRoot}`);
  return join(destination, created[0]);
}

async function run(command, arguments_, cwd = repositoryRoot) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, arguments_, {
      cwd,
      env: { ...process.env, npm_config_cache: join(tmpdir(), 'eocrm-npm-cache') },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolvePromise(stdout);
      else reject(new Error(`${command} exited ${code}\n${stdout}${stderr}`));
    });
  });
}
