import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const artifacts = [
  'design-tokens-compose',
  'design-tokens-compose-android',
  'design-tokens-compose-jvm',
  'design-tokens-compose-iosarm64',
  'design-tokens-compose-iossimulatorarm64',
];

export async function repairComposePublication({
  publicationRoot,
  version,
  repository,
  actor,
  token,
  fetchImpl = fetch,
  sleepImpl = sleep,
}) {
  const authorization = Buffer.from(`${actor}:${token}`).toString('base64');
  const base = `https://maven.pkg.github.com/${repository}/com/eocrm/design`;
  const files = await collectPublicationFiles(publicationRoot, version);
  let uploaded = 0;
  let alreadyPresent = 0;

  for (const { artifact, name, content } of files) {
    const url = `${base}/${artifact}/${version}/${name}`;
    const response = await uploadWithRetry({
      url,
      authorization,
      content,
      fetchImpl,
      sleepImpl,
    });
    if (response.ok) {
      uploaded += 1;
      continue;
    }
    if (response.status !== 409) {
      throw new Error(`Maven registry returned ${response.status} while uploading ${url}`);
    }

    const existing = await fetchImpl(url, {
      headers: { Authorization: `Basic ${authorization}` },
    });
    if (!existing.ok) {
      throw new Error(
        `Maven registry returned ${existing.status} while checking conflicted file ${url}`,
      );
    }
    const existingContent = Buffer.from(await existing.arrayBuffer());
    if (!existingContent.equals(content)) {
      throw new Error(`Maven registry conflict contains different bytes for ${url}`);
    }
    alreadyPresent += 1;
  }

  return { uploaded, alreadyPresent };
}

async function uploadWithRetry({ url, authorization, content, fetchImpl, sleepImpl }) {
  const maximumAttempts = 3;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const response = await fetchImpl(url, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${authorization}`,
        'Content-Type': 'application/octet-stream',
      },
      body: content,
    });
    if (response.status < 500 || response.status > 599 || attempt === maximumAttempts) {
      return response;
    }
    await sleepImpl(1_000 * 2 ** (attempt - 1));
  }
  throw new Error('unreachable');
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function collectPublicationFiles(publicationRoot, version) {
  const files = [];
  for (const artifact of artifacts) {
    const directory = join(publicationRoot, 'com/eocrm/design', artifact, version);
    const names = (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort(compareCodeUnits);
    const moduleName = `${artifact}-${version}.module`;
    const pomName = `${artifact}-${version}.pom`;
    for (const required of [moduleName, pomName]) {
      if (!names.includes(required)) {
        throw new Error(`staged Maven publication is missing ${artifact}/${version}/${required}`);
      }
    }
    const moduleDocument = JSON.parse(await readFile(join(directory, moduleName), 'utf8'));
    const referencedFiles = (moduleDocument.variants ?? []).flatMap((variant) =>
      (variant.files ?? []).map((file) => file.url),
    );
    for (const referenced of referencedFiles) {
      if (!names.includes(referenced)) {
        throw new Error(
          `staged Maven publication metadata references missing ${artifact}/${version}/${referenced}`,
        );
      }
    }
    for (const name of names) {
      files.push({ artifact, name, content: await readFile(join(directory, name)) });
    }
  }
  return files;
}

function compareCodeUnits(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

async function main(arguments_) {
  const [publicationRoot, version, ...extra] = arguments_;
  const repository = process.env.GITHUB_REPOSITORY;
  const actor = process.env.GITHUB_ACTOR;
  const token = process.env.GITHUB_TOKEN;
  if (!publicationRoot || !version || extra.length > 0) {
    throw new Error('usage: node repair-compose-publication.mjs <publication-root> <version>');
  }
  if (!repository || !actor || !token) {
    throw new Error('GITHUB_REPOSITORY, GITHUB_ACTOR, and GITHUB_TOKEN are required');
  }
  const result = await repairComposePublication({
    publicationRoot: resolve(publicationRoot),
    version,
    repository,
    actor,
    token,
  });
  process.stdout.write(
    `Compose Maven publication repaired: ${result.uploaded} uploaded, ${result.alreadyPresent} already present.\n`,
  );
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
