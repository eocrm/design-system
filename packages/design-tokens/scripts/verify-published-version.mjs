import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const npmRegistry = 'https://npm.pkg.github.com';

export async function verifyPublishedVersion(
  version,
  {
    repository = process.env.GITHUB_REPOSITORY ?? 'eocrm/design-system',
    actor = process.env.GITHUB_ACTOR,
    token = process.env.GITHUB_TOKEN ?? process.env.NODE_AUTH_TOKEN,
    attempts = 12,
    retryDelayMs = 5_000,
  } = {},
) {
  if (!actor || !token) {
    throw new Error('GITHUB_ACTOR and GITHUB_TOKEN are required');
  }

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const [tokensVersion, designSystemVersion, mavenVersion] = await Promise.all([
        readNpmVersion('@eocrm/design-tokens', version, token),
        readNpmVersion('@eocrm/design-system', version, token),
        readMavenVersion(repository, version, actor, token),
      ]);
      for (const [coordinate, actual] of [
        ['@eocrm/design-tokens', tokensVersion],
        ['@eocrm/design-system', designSystemVersion],
        ['com.eocrm.design:design-tokens-compose', mavenVersion],
      ]) {
        if (actual !== version) {
          throw new Error(`${coordinate}: expected ${version}, received ${actual}`);
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

async function readNpmVersion(packageName, version, token) {
  const { stdout } = await execFileAsync(
    'npm',
    ['view', `${packageName}@${version}`, 'version', '--json', `--registry=${npmRegistry}`],
    {
      env: { ...process.env, NODE_AUTH_TOKEN: token },
    },
  );
  return JSON.parse(stdout);
}

async function readMavenVersion(repository, version, actor, token) {
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
  const pom = await response.text();
  const match = pom.match(/<version>([^<]+)<\/version>/);
  if (!match) throw new Error(`Maven POM has no version: ${url}`);
  return match[1];
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
