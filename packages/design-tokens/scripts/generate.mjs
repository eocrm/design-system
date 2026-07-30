import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadTokenDocument } from './lib/load-tokens.mjs';
import { renderWeb } from './lib/render-web.mjs';

const defaultSource = new URL('../src/tokens.json', import.meta.url);
const defaultOutputRoot = new URL('../generated/', import.meta.url);

export function validateTokenSource(source = defaultSource) {
  return loadTokenDocument(source);
}

export async function generate({ outputRoot = defaultOutputRoot, source = defaultSource } = {}) {
  const document = await validateTokenSource(source);
  const { tokensScss, darkScss } = renderWeb(document);
  const manifest = {
    schemaVersion: document.schemaVersion,
    contractVersion: document.contractVersion,
    artifacts: {
      npm: '@eocrm/design-tokens',
      maven: 'com.eocrm.design:design-tokens-compose',
    },
  };

  await mkdir(new URL('./web/', toDirectoryUrl(outputRoot)), { recursive: true });
  await Promise.all([
    writeFile(new URL('./web/tokens.scss', toDirectoryUrl(outputRoot)), tokensScss),
    writeFile(new URL('./web/dark.scss', toDirectoryUrl(outputRoot)), darkScss),
    writeFile(
      new URL('./manifest.json', toDirectoryUrl(outputRoot)),
      `${JSON.stringify(manifest, null, 2)}\n`,
    ),
  ]);
}

async function main(arguments_) {
  const { validateOnly } = parseArguments(arguments_);
  if (validateOnly) {
    const document = await validateTokenSource();
    process.stdout.write(`Validated ${document.tokens.length} design tokens.\n`);
  } else {
    await generate();
    process.stdout.write('Generated design token artifacts.\n');
  }
}

function parseArguments(arguments_) {
  let validateOnly = false;

  for (const argument of arguments_) {
    if (argument === '--validate-only') {
      validateOnly = true;
    } else {
      throw new Error(`unknown argument ${argument}`);
    }
  }

  return { validateOnly };
}

function toDirectoryUrl(path) {
  const url = path instanceof URL ? path : pathToFileURL(resolve(path));
  return new URL(url.href.endsWith('/') ? url.href : `${url.href}/`);
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
