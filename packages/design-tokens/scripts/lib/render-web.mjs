const HEADER = `// GENERATED FILE — DO NOT EDIT.
// Source: packages/design-tokens/src/tokens.json
// Schema version: `;

export function renderWeb(document) {
  const webTokens = document.tokens
    .filter((token) => token.outputs.web)
    .sort((left, right) => compareCodeUnits(left.outputs.web.name, right.outputs.web.name));
  const webNames = new Map(webTokens.map((token) => [token.id, token.outputs.web.name]));
  const lightDeclarations = webTokens
    .map((token) =>
      declaration(token.outputs.web.name, selectTheme(token.value, 'light'), webNames),
    )
    .filter(Boolean);
  const darkDeclarations = webTokens
    .filter(
      (token) =>
        isThemed(token.value) &&
        renderValue(token.value.dark, webNames) !== renderValue(token.value.light, webNames),
    )
    .map((token) => declaration(token.outputs.web.name, selectTheme(token.value, 'dark'), webNames))
    .filter(Boolean);
  const accents = renderAccents(document.accents ?? {}, webTokens);
  const header = `${HEADER}${document.schemaVersion}\n`;

  return {
    tokensScss: `${header}
:root {
  color-scheme: light;
${lightDeclarations.join('\n')}
}
${accents.map((accent) => `\n:root[data-accent='${accent.name}'] {\n${accent.light.join('\n')}\n}\n`).join('')}`,
    darkScss: `${header}
:root[data-theme='dark'] {
  color-scheme: dark;
${darkDeclarations.join('\n')}
}
${accents.map((accent) => `\n:root[data-accent='${accent.name}'][data-theme='dark'] {\n${accent.dark.join('\n')}\n}\n`).join('')}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;
${darkDeclarations.map((line) => `  ${line}`).join('\n')}
  }
${accents.map((accent) => `\n  :root[data-accent='${accent.name}']:not([data-theme='light']) {\n${accent.dark.map((line) => `  ${line}`).join('\n')}\n  }\n`).join('')}}

:root[data-theme='light'] {
  color-scheme: light;
}
`,
  };
}

// Per accent: literal-colour overrides of tokens that have a web output. Values are
// never aliases (validated), so aliases of an overridden token follow it via var().
function renderAccents(accents, webTokens) {
  return Object.keys(accents)
    .sort(compareCodeUnits)
    .map((name) => {
      const overrides = webTokens
        .filter((token) => accents[name][token.id])
        .map((token) => ({ name: token.outputs.web.name, ...accents[name][token.id] }));
      return {
        name,
        light: overrides.map((o) => declaration(o.name, o.light)),
        dark: overrides.map((o) => declaration(o.name, o.dark)),
      };
    })
    .filter((accent) => accent.light.length > 0);
}

function declaration(name, value, webNames) {
  if (value === null) return undefined;
  const renderedValue = renderValue(value, webNames);
  const line = `  ${name}: ${renderedValue};`;
  return line.length > 100 ? `  ${name}:\n    ${renderedValue};` : line;
}

function renderValue(value, webNames) {
  if (value === null) return '';
  if (!isAlias(value)) return String(value);
  const targetName = webNames.get(value.alias);
  if (!targetName) throw new Error(`web alias ${value.alias} has no web output`);
  return `var(${targetName})`;
}

function selectTheme(value, theme) {
  return isThemed(value) ? value[theme] : value;
}

function isAlias(value) {
  return value !== null && typeof value === 'object' && 'alias' in value;
}

function isThemed(value) {
  return value !== null && typeof value === 'object' && 'light' in value && 'dark' in value;
}

function compareCodeUnits(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
