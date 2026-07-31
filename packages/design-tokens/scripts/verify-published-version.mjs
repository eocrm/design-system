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
const mavenPublications = [
  ['kotlinMultiplatform', 'design-tokens-compose'],
  ['android', 'design-tokens-compose-android'],
  ['jvm', 'design-tokens-compose-jvm'],
  ['iosArm64', 'design-tokens-compose-iosarm64'],
  ['iosSimulatorArm64', 'design-tokens-compose-iossimulatorarm64'],
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
  const [tokens, designSystem, maven] = await Promise.all([
    readNpmPackIntegrity(resolve(root, 'packages/design-tokens')),
    readNpmPackIntegrity(resolve(root, 'packages/design-system')),
    readLocalMavenIntegrity(root),
  ]);
  return new Map([
    ['@eocrm/design-tokens', tokens],
    ['@eocrm/design-system', designSystem],
    ['com.eocrm.design:design-tokens-compose', maven],
  ]);
}

async function readLocalMavenIntegrity(root) {
  const publicationRoot = resolve(root, 'packages/design-tokens/compose/build/publications');
  const files = await Promise.all(
    mavenPublications.flatMap(([publication]) => [
      readFile(resolve(publicationRoot, publication, 'module.json')),
      readFile(resolve(publicationRoot, publication, 'pom-default.xml')),
    ]),
  );
  return fingerprint(files);
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

export async function readMavenArtifact(repository, version, actor, token) {
  const authorization = Buffer.from(`${actor}:${token}`).toString('base64');
  const base = `https://maven.pkg.github.com/${repository}/com/eocrm/design`;
  const headers = { Authorization: `Basic ${authorization}` };
  const metadata = [];
  const artifactChecks = [];

  for (const [, artifact] of mavenPublications) {
    const artifactBase = `${base}/${artifact}/${version}/${artifact}-${version}`;
    const [module, pom] = await Promise.all([
      fetchBuffer(`${artifactBase}.module`, headers),
      fetchBuffer(`${artifactBase}.pom`, headers),
    ]);
    metadata.push(module, pom);
    const document = JSON.parse(module.toString('utf8'));
    if (document.component?.version !== version) {
      throw new Error(
        `${artifact}: expected module version ${version}, received ${document.component?.version}`,
      );
    }
    for (const variant of document.variants ?? []) {
      for (const file of variant.files ?? []) {
        if (!file.url || !file.sha256) continue;
        artifactChecks.push(
          fetchBuffer(`${base}/${artifact}/${version}/${file.url}`, headers).then((content) => {
            const actual = sha256Hex(content);
            if (actual !== file.sha256) {
              throw new Error(
                `${artifact}/${file.url}: expected sha256 ${file.sha256}, received ${actual}`,
              );
            }
          }),
        );
      }
    }
  }
  await Promise.all(artifactChecks);
  return { version, integrity: fingerprint(metadata) };
}

function sha256(content) {
  return `sha256:${sha256Hex(content)}`;
}

function sha256Hex(content) {
  return createHash('sha256').update(content).digest('hex');
}

function fingerprint(files) {
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(String(file.length));
    hash.update('\0');
    hash.update(file);
  }
  return `sha256:${hash.digest('hex')}`;
}

async function fetchBuffer(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Maven registry returned ${response.status} for ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
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
