import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generate } from './generate.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultExpectedRoot = resolve(packageRoot, 'generated');
const defaultComposeExpectedRoot = resolve(
  packageRoot,
  'compose/src/commonMain/kotlin/com/eocrm/design/tokens',
);

export async function checkGenerated({
  expectedRoot = defaultExpectedRoot,
  composeExpectedRoot = defaultComposeExpectedRoot,
} = {}) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'eocrm-token-generated-'));
  const actualRoot = join(temporaryRoot, 'generated');
  const actualComposeRoot = join(temporaryRoot, 'compose');

  try {
    await generate({
      outputRoot: actualRoot,
      composeOutputRoot: actualComposeRoot,
    });
    const [generatedChanges, composeChanges] = await Promise.all([
      compareRoots(expectedRoot, actualRoot),
      compareRoots(composeExpectedRoot, actualComposeRoot),
    ]);
    return [...generatedChanges, ...composeChanges.map((name) => `compose/${name}`)];
  } finally {
    await rm(temporaryRoot, { recursive: true });
  }
}

async function compareRoots(expectedRoot, actualRoot) {
  const [expectedFiles, actualFiles] = await Promise.all([
    listFiles(expectedRoot),
    listFiles(actualRoot),
  ]);
  const fileNames = [...new Set([...expectedFiles, ...actualFiles])].sort(compareCodeUnits);
  const changed = [];
  for (const name of fileNames) {
    const [expected, actual] = await Promise.all([
      readOptional(join(expectedRoot, name)),
      readOptional(join(actualRoot, name)),
    ]);
    if (expected !== actual) changed.push(name);
  }
  return changed;
}

async function listFiles(root) {
  try {
    const entries = await readdir(root, { recursive: true, withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => relative(root, join(entry.parentPath, entry.name)));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function readOptional(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

function compareCodeUnits(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

async function main() {
  const changed = await checkGenerated();
  if (changed.length === 0) {
    process.stdout.write('Generated design token artifacts are up to date.\n');
    return;
  }
  process.stderr.write(
    `Generated design token artifacts have drifted:\n${changed.map((name) => `- ${name}`).join('\n')}\n`,
  );
  process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  await main();
}
