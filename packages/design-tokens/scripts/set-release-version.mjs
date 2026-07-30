import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generate } from './generate.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const semverPattern =
  /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export async function setReleaseVersion(version, { root = repositoryRoot } = {}) {
  if (!semverPattern.test(version)) {
    throw new Error(`invalid semantic version: ${version}`);
  }

  const paths = {
    tokensPackage: resolve(root, 'packages/design-tokens/package.json'),
    designSystemPackage: resolve(root, 'packages/design-system/package.json'),
    tokenSource: resolve(root, 'packages/design-tokens/src/tokens.json'),
    manifest: resolve(root, 'packages/design-tokens/generated/manifest.json'),
  };
  const [tokensPackageSource, designSystemPackageSource, tokenSourceText, manifestSource] =
    await Promise.all(Object.values(paths).map((path) => readFile(path, 'utf8')));
  const tokensPackage = parseObject(tokensPackageSource, paths.tokensPackage);
  const designSystemPackage = parseObject(designSystemPackageSource, paths.designSystemPackage);
  const tokenSource = parseObject(tokenSourceText, paths.tokenSource);
  const manifest = parseObject(manifestSource, paths.manifest);

  requireString(tokensPackage, 'version', paths.tokensPackage);
  requireString(designSystemPackage, 'version', paths.designSystemPackage);
  if (
    !designSystemPackage.dependencies ||
    typeof designSystemPackage.dependencies !== 'object' ||
    typeof designSystemPackage.dependencies['@eocrm/design-tokens'] !== 'string'
  ) {
    throw new Error(`${paths.designSystemPackage}: missing dependencies["@eocrm/design-tokens"]`);
  }
  requireString(tokenSource, 'contractVersion', paths.tokenSource);
  requireString(manifest, 'contractVersion', paths.manifest);

  tokensPackage.version = version;
  designSystemPackage.version = version;
  designSystemPackage.dependencies['@eocrm/design-tokens'] = version;
  tokenSource.contractVersion = version;

  await Promise.all([
    writeJson(paths.tokensPackage, tokensPackage),
    writeJson(paths.designSystemPackage, designSystemPackage),
    writeJson(paths.tokenSource, tokenSource),
  ]);
  await generate({
    source: paths.tokenSource,
    outputRoot: resolve(root, 'packages/design-tokens/generated'),
    composeOutputRoot: resolve(
      root,
      'packages/design-tokens/compose/src/commonMain/kotlin/com/eocrm/design/tokens',
    ),
  });
}

function parseObject(source, path) {
  const value = JSON.parse(source);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${path}: expected a JSON object`);
  }
  return value;
}

function requireString(object, key, path) {
  if (typeof object[key] !== 'string') {
    throw new Error(`${path}: missing string ${key}`);
  }
}

function writeJson(path, value) {
  return writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function parseArguments(arguments_) {
  const [version, flag, root, ...extra] = arguments_;
  if (!version || flag !== '--root' || !root || extra.length > 0) {
    throw new Error('usage: node set-release-version.mjs <version> --root <repository-root>');
  }
  return { version, root };
}

async function main(arguments_) {
  const { version, root } = parseArguments(arguments_);
  await setReleaseVersion(version, { root });
  process.stdout.write(`Synchronized release version ${version}.\n`);
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
