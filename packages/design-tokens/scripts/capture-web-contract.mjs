import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
// The generated files, not the design-system re-exports. `src/styles/tokens.scss`
// used to hold the `:root` block; it is now a bare `@forward` of this package's
// generated entry point, so capturing from it threw `no :root token scope found`
// and this script had been unrunnable — the fixture it writes was hand-edited
// instead. check-web-compat.mjs already reads these same generated paths, so
// capture and check now agree on their input by construction.
const sourcePaths = {
  tokens: 'packages/design-tokens/generated/web/tokens.scss',
  dark: 'packages/design-tokens/generated/web/dark.scss',
  badge: 'packages/design-system/src/components/Badge/Badge.tokens.scss',
};
const fixturePath = 'packages/design-tokens/test/fixtures/current-web-contract.json';

export async function captureWebContract() {
  const entries = await Promise.all(
    Object.entries(sourcePaths).map(async ([key, source]) => [
      key,
      { source, content: await readFile(resolve(repositoryRoot, source), 'utf8') },
    ]),
  );

  return captureWebContractFromSources(Object.fromEntries(entries));
}

export function captureWebContractFromSources(sources) {
  const contract = emptyContract();

  for (const source of [sources.tokens, sources.badge]) {
    const blocks = findBlocks(source.content).filter(({ header }) => header === ':root');
    if (blocks.length === 0) {
      throw new Error(`no :root token scope found in ${source.source}`);
    }
    for (const block of blocks) {
      addBlockDeclarations(contract, 'light', block.body, {
        source: source.source,
        selector: ':root',
      });
    }
  }

  const darkBlocks = findBlocks(sources.dark.content);
  // Optional. The design-system dark.scss this parser was written against
  // factored its declarations into `@mixin dark-tokens` and `@include`d it from
  // both dark scopes; the generated dark.scss this now reads writes the
  // declarations into each scope directly instead. Requiring the mixin made
  // captureWebContract() throw on the only input it is ever pointed at, which
  // is why the fixture ended up hand-maintained. Both layouts stay supported:
  // the synthetic sources in source.test.mjs still exercise the mixin path.
  const mixin = darkBlocks.find(({ header }) => header === '@mixin dark-tokens');
  const forcedDark = requireSingleBlock(
    darkBlocks,
    ({ header, ancestors }) => header === ":root[data-theme='dark']" && ancestors.length === 0,
    ":root[data-theme='dark']",
    sources.dark.source,
  );
  const systemDark = requireSingleBlock(
    darkBlocks,
    ({ header, ancestors }) =>
      header === ":root:not([data-theme='light'])" &&
      ancestors.includes('@media (prefers-color-scheme: dark)'),
    "@media (prefers-color-scheme: dark) :root:not([data-theme='light'])",
    sources.dark.source,
  );
  const forcedLight = requireSingleBlock(
    darkBlocks,
    ({ header, ancestors }) => header === ":root[data-theme='light']" && ancestors.length === 0,
    ":root[data-theme='light']",
    sources.dark.source,
  );

  if (mixin) {
    requireMixinInclude(forcedDark.body, 'dark-tokens', forcedDark.header);
    requireMixinInclude(systemDark.body, 'dark-tokens', systemDark.header);
  }

  addBlockDeclarations(contract, 'forcedDark', forcedDark.body, {
    source: sources.dark.source,
    selector: forcedDark.header,
  });
  if (mixin) {
    addBlockDeclarations(contract, 'forcedDark', mixin.body, {
      source: sources.dark.source,
      selector: forcedDark.header,
      mixin: 'dark-tokens',
    });
  }
  addBlockDeclarations(contract, 'systemDark', systemDark.body, {
    source: sources.dark.source,
    selector: systemDark.header,
    atRule: '@media (prefers-color-scheme: dark)',
  });
  if (mixin) {
    addBlockDeclarations(contract, 'systemDark', mixin.body, {
      source: sources.dark.source,
      selector: systemDark.header,
      atRule: '@media (prefers-color-scheme: dark)',
      mixin: 'dark-tokens',
    });
  }
  addBlockDeclarations(contract, 'forcedLight', forcedLight.body, {
    source: sources.dark.source,
    selector: forcedLight.header,
  });

  return sortContract(contract);
}

function emptyContract() {
  return {
    light: {},
    forcedDark: {},
    systemDark: {},
    forcedLight: {},
    selectors: {
      light: [{ selector: ':root' }],
      forcedDark: [{ selector: ":root[data-theme='dark']" }],
      systemDark: [
        {
          atRule: '@media (prefers-color-scheme: dark)',
          selector: ":root:not([data-theme='light'])",
        },
      ],
      forcedLight: [{ selector: ":root[data-theme='light']" }],
    },
    provenance: {
      light: {},
      forcedDark: {},
      systemDark: {},
      forcedLight: {},
    },
  };
}

function addBlockDeclarations(contract, scope, body, provenance) {
  for (const { name, value } of parseDeclarations(body)) {
    const previous = contract[scope][name];
    if (previous !== undefined && previous !== value) {
      throw new Error(
        `conflicting declaration ${name} in ${scope}: ${JSON.stringify(previous)} vs ${JSON.stringify(value)}`,
      );
    }
    contract[scope][name] = value;
    const origins = contract.provenance[scope][name] ?? [];
    if (!origins.some((origin) => sameOrigin(origin, provenance))) {
      origins.push(provenance);
    }
    contract.provenance[scope][name] = origins;
  }
}

function parseDeclarations(body) {
  const declarations = [];
  const declarationPattern = /^\s*(--[a-z0-9-]+)\s*:\s*([\s\S]*?);/gm;
  let match;
  while ((match = declarationPattern.exec(body)) !== null) {
    declarations.push({
      name: match[1],
      value: normalizeValue(match[2]),
    });
  }
  return declarations;
}

function normalizeValue(value) {
  return value.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim();
}

function findBlocks(source) {
  const text = stripComments(source);
  const blocks = [];
  scanBlocks(text, [], blocks);
  return blocks;
}

function scanBlocks(text, ancestors, blocks) {
  let statementStart = 0;
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    if (character === '"' || character === "'") {
      index = skipString(text, index);
      continue;
    }
    if (character === ';') {
      statementStart = index + 1;
      index += 1;
      continue;
    }
    if (character !== '{') {
      index += 1;
      continue;
    }

    const close = matchingBrace(text, index);
    const header = text.slice(statementStart, index).trim();
    const body = text.slice(index + 1, close);
    blocks.push({ header, body, ancestors });
    scanBlocks(body, [...ancestors, header], blocks);
    index = close + 1;
    statementStart = index;
  }
}

function matchingBrace(text, open) {
  let depth = 1;
  for (let index = open + 1; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' || character === "'") {
      index = skipString(text, index) - 1;
    } else if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error('unterminated SCSS block');
}

function skipString(text, start) {
  const quote = text[start];
  let index = start + 1;
  while (index < text.length) {
    if (text[index] === '\\') {
      index += 2;
    } else if (text[index] === quote) {
      return index + 1;
    } else {
      index += 1;
    }
  }
  throw new Error('unterminated SCSS string');
}

function stripComments(source) {
  let output = '';
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (character === '"' || character === "'") {
      const end = skipString(source, index);
      output += source.slice(index, end);
      index = end;
      continue;
    }
    if (character === '/' && source[index + 1] === '/') {
      output += '  ';
      index += 2;
      while (index < source.length && source[index] !== '\n') {
        output += ' ';
        index += 1;
      }
      continue;
    }
    if (character === '/' && source[index + 1] === '*') {
      output += '  ';
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        output += source[index] === '\n' ? '\n' : ' ';
        index += 1;
      }
      if (index === source.length) throw new Error('unterminated SCSS comment');
      output += '  ';
      index += 2;
      continue;
    }
    output += character;
    index += 1;
  }
  return output;
}

function requireSingleBlock(blocks, predicate, label, source) {
  const matches = blocks.filter(predicate);
  if (matches.length !== 1) {
    throw new Error(`expected exactly one ${label} scope in ${source}; found ${matches.length}`);
  }
  return matches[0];
}

function requireMixinInclude(body, mixin, selector) {
  if (!new RegExp(`@include\\s+${mixin}\\s*;`).test(body)) {
    throw new Error(`${selector} does not include ${mixin}`);
  }
}

function sameOrigin(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sortContract(contract) {
  for (const scope of ['light', 'forcedDark', 'systemDark', 'forcedLight']) {
    contract[scope] = sortObject(contract[scope]);
    contract.provenance[scope] = sortObject(contract.provenance[scope]);
  }
  return contract;
}

function sortObject(value) {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => compareCodeUnits(left, right)),
  );
}

function compareCodeUnits(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

async function main() {
  const contract = await captureWebContract();
  const outputPath = resolve(repositoryRoot, fixturePath);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(contract, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  await main();
}
