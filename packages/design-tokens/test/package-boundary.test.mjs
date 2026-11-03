import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import test from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const designSystemRoot = join(repositoryRoot, 'packages/design-system');
const tokenRoot = join(repositoryRoot, 'packages/design-tokens');

test('playground token reference reads the authoritative token package', async () => {
  const pageSource = await readFile(
    join(repositoryRoot, 'packages/playground/src/pages/Tokens/TokensPage.tsx'),
    'utf8',
  );

  assert.match(pageSource, /@eocrm\/design-tokens\/styles\/tokens\.scss\?raw/);
  assert.doesNotMatch(pageSource, /@lib-source\/styles\/tokens\.scss\?raw/);
});

test('preserves the design-system package and TypeScript export surfaces', async () => {
  const packageJson = JSON.parse(await readFile(join(designSystemRoot, 'package.json'), 'utf8'));

  assert.deepEqual(packageJson.exports, {
    '.': {
      source: './src/index.ts',
      types: './dist/index.d.ts',
      import: './dist/index.js',
      // CommonJS resolvers (Jest) use require/default; without it the package does not resolve.
      default: './dist/index.js',
    },
    './styles/global.css': {
      source: './src/styles/global.scss',
      default: './dist/styles/global.css',
    },
    './styles/tokens.css': './dist/styles/tokens.css',
    './styles.css': './dist/styles.css',
    './package.json': './package.json',
  });
});

test('packed CSS entry points build in a plain Vite consumer', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'eocrm-package-boundary-'));
  const packDirectory = join(directory, 'packs');
  const fixture = join(directory, 'fixture');

  try {
    await Promise.all([
      mkdir(packDirectory, { recursive: true }),
      mkdir(fixture, { recursive: true }),
    ]);
    const designSystemTarball = await pack(designSystemRoot, packDirectory);
    const [designSystemPackage, tokenPackage] = await Promise.all([
      readFile(join(designSystemRoot, 'package.json'), 'utf8').then(JSON.parse),
      readFile(join(tokenRoot, 'package.json'), 'utf8').then(JSON.parse),
    ]);

    assert.equal(designSystemPackage.devDependencies['@eocrm/design-tokens'], tokenPackage.version);

    await writeFile(
      join(fixture, 'package.json'),
      `${JSON.stringify(
        {
          name: 'eocrm-package-boundary-fixture',
          private: true,
          dependencies: {
            '@eocrm/design-system': `file:${designSystemTarball}`,
            // peer dependencies (--legacy-peer-deps does not install them)
            react: '^19.0.0',
            'react-dom': '^19.0.0',
            'lucide-react': '>=1.16.0 <2.0.0',
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
    await writeFile(
      join(fixture, 'index.html'),
      '<!doctype html><script type="module" src="/main.js"></script>\n',
    );
    await writeFile(
      join(fixture, 'main.js'),
      [
        "import '@eocrm/design-system/styles/tokens.css';",
        "import '@eocrm/design-system/styles/global.css';",
        "import '@eocrm/design-system/styles.css';",
        "import { Button } from '@eocrm/design-system';",
        'console.log(Button);',
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

test('shared tarball verifier flags leaked paths and missing export targets', async () => {
  const { PACKAGES, verify } = await import('../../../scripts/verify-package-contents.mjs');
  const pkg = PACKAGES.find((p) => p.name === '@eocrm/design-system');
  const pkgJson = {
    exports: {
      '.': { source: './src/index.ts', import: './dist/index.js' },
      './x/*': './dist/x/*.css',
    },
  };
  const problems = verify(pkg, ['README.md', 'LICENSE', 'package.json', 'src/x.test.tsx'], pkgJson);

  assert.deepEqual(problems, [
    '@eocrm/design-system tarball leaked: src/x.test.tsx',
    '@eocrm/design-system tarball missing: dist/index.js',
  ]);
});
