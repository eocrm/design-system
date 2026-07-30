import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function compareWebContracts(expected, actual) {
  const differences = { missing: [], extra: [], changed: [] };
  for (const scope of ['light', 'forcedDark', 'systemDark', 'forcedLight']) {
    const expectedValues = expected[scope] ?? {};
    const actualValues = actual[scope] ?? {};
    const names = [...new Set([...Object.keys(expectedValues), ...Object.keys(actualValues)])].sort(
      compareCodeUnits,
    );

    for (const name of names) {
      if (!(name in actualValues)) {
        differences.missing.push(`${scope} ${name}`);
      } else if (!(name in expectedValues)) {
        differences.extra.push(`${scope} ${name}`);
      } else if (expectedValues[name] !== actualValues[name]) {
        differences.changed.push(
          `${scope} ${name}: ${expectedValues[name]} -> ${actualValues[name]}`,
        );
      }
    }
  }
  return differences;
}

export function parseGeneratedWebContract(tokensScss, darkScss) {
  return {
    light: declarations(blockBody(tokensScss, ':root')),
    forcedDark: declarations(blockBody(darkScss, ":root[data-theme='dark']")),
    systemDark: declarations(blockBody(darkScss, ":root:not([data-theme='light'])")),
    forcedLight: declarations(blockBody(darkScss, ":root[data-theme='light']")),
  };
}

function blockBody(source, selector) {
  const start = source.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`missing selector ${selector}`);
  const open = source.indexOf('{', start);
  let depth = 1;
  for (let index = open + 1; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(open + 1, index);
  }
  throw new Error(`unterminated selector ${selector}`);
}

function declarations(body) {
  const values = {};
  const pattern = /^\s*(--[a-z0-9-]+)\s*:\s*([\s\S]*?);/gm;
  for (const match of body.matchAll(pattern)) {
    values[match[1]] = normalizeValue(match[2]);
  }
  return values;
}

function normalizeValue(value) {
  return value.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim();
}

function compareCodeUnits(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

async function main() {
  const [fixtureSource, tokensScss, darkScss] = await Promise.all([
    readFile(resolve(packageRoot, 'test/fixtures/current-web-contract.json'), 'utf8'),
    readFile(resolve(packageRoot, 'generated/web/tokens.scss'), 'utf8'),
    readFile(resolve(packageRoot, 'generated/web/dark.scss'), 'utf8'),
  ]);
  const expected = JSON.parse(fixtureSource);
  const actual = parseGeneratedWebContract(tokensScss, darkScss);
  const differences = compareWebContracts(expected, actual);
  const count = Object.values(differences).reduce((sum, entries) => sum + entries.length, 0);

  if (count === 0) {
    process.stdout.write('Generated web tokens match the captured contract.\n');
    return;
  }
  for (const [category, entries] of Object.entries(differences)) {
    if (entries.length > 0)
      process.stderr.write(`${category}:\n${entries.map((entry) => `- ${entry}`).join('\n')}\n`);
  }
  process.exitCode = 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  await main();
}
