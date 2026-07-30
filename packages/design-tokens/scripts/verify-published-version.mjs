import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const npmRegistry = 'https://npm.pkg.github.com';
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const coordinates = [
  '@eocrm/design-tokens',
  '@eocrm/design-system',
  'com.eocrm.design:design-tokens-compose',
];

export async function verifyPublishedVersion(
  version,
  {
    repository = process.env.GITHUB_REPOSITORY ?? 'eocrm/design-system',
    actor = process.env.GITHUB_ACTOR,
    token = process.env.GITHUB_TOKEN ?? process.env.NODE_AUTH_TOKEN,
    attempts = 12,
    retryDelayMs = 5_000,
    expected,
    readPublished,
    root = defaultRoot,
  } = {},
) {
  if ((!expected || !readPublished) && (!actor || !token)) {
    throw new Error('GITHUB_ACTOR and GITHUB_TOKEN are required');
  }

  const expectedArtifacts = expected ?? (await readLocalArtifacts(root));
  const publishedReader =
    readPublished ??
    ((coordinate) =>
      coordinate.startsWith('@')
        ? readNpmArtifact(coordinate, version, token)
        : readMavenArtifact(repository, version, actor, token));

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const published = await Promise.all(
        coordinates.map((coordinate) => publishedReader(coordinate)),
      );
      for (const [index, coordinate] of coordinates.entries()) {
        const actual = published[index];
        if (actual.version !== version) {
          throw new Error(`${coordinate}: expected ${version}, received ${actual.version}`);
        }
        const expectedIntegrity = expectedArtifacts.get(coordinate);
        if (actual.integrity !== expectedIntegrity) {
          throw new Error(
            `${coordinate}: expected integrity ${expectedIntegrity}, received ${actual.integrity}`,
          );
        }
      }
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolvePromise) => setTimeout(resolvePromise, retryDelayMs));
      }
    }
  }
  throw lastError;
}

async function readLocalArtifacts(root) {
  const [tokens, designSystem, pom] = await Promise.all([
    readNpmPackIntegrity(resolve(root, 'packages/design-tokens')),
    readNpmPackIntegrity(resolve(root, 'packages/design-system')),
    readFile(
      resolve(
        root,
        'packages/design-tokens/compose/build/publications/kotlinMultiplatform/pom-default.xml',
      ),
    ),
  ]);
  return new Map([
    ['@eocrm/design-tokens', tokens],
    ['@eocrm/design-system', designSystem],
    ['com.eocrm.design:design-tokens-compose', sha256(pom)],
  ]);
}

async function readNpmPackIntegrity(packageRoot) {
  const { stdout } = await execFileAsync('npm', ['pack', '--dry-run', '--json'], {
    cwd: packageRoot,
  });
  const result = JSON.parse(stdout);
  if (!Array.isArray(result) || typeof result[0]?.integrity !== 'string') {
    throw new Error(`npm pack returned no integrity for ${packageRoot}`);
  }
  return result[0].integrity;
}

async function readNpmArtifact(packageName, version, token) {
  const options = { env: { ...process.env, NODE_AUTH_TOKEN: token } };
  const [versionResult, integrityResult] = await Promise.all([
    execFileAsync(
      'npm',
      ['view', `${packageName}@${version}`, 'version', '--json', `--registry=${npmRegistry}`],
      options,
    ),
    execFileAsync(
      'npm',
      [
        'view',
        `${packageName}@${version}`,
        'dist.integrity',
        '--json',
        `--registry=${npmRegistry}`,
      ],
      options,
    ),
  ]);
  return {
    version: JSON.parse(versionResult.stdout),
    integrity: JSON.parse(integrityResult.stdout),
  };
}

async function readMavenArtifact(repository, version, actor, token) {
  const artifact = 'design-tokens-compose';
  const url =
    `https://maven.pkg.github.com/${repository}/com/eocrm/design/` +
    `${artifact}/${version}/${artifact}-${version}.pom`;
  const authorization = Buffer.from(`${actor}:${token}`).toString('base64');
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${authorization}` },
  });
  if (!response.ok) {
    throw new Error(`Maven registry returned ${response.status} for ${url}`);
  }
  const pom = Buffer.from(await response.arrayBuffer());
  const match = pom.toString('utf8').match(/<version>([^<]+)<\/version>/);
  if (!match) throw new Error(`Maven POM has no version: ${url}`);
  return { version: match[1], integrity: sha256(pom) };
}

function sha256(content) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

async function main(arguments_) {
  const [version, ...extra] = arguments_;
  if (!version || extra.length > 0) {
    throw new Error('usage: node verify-published-version.mjs <version>');
  }
  await verifyPublishedVersion(version);
  process.stdout.write(`Verified all published artifacts at ${version}.\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
