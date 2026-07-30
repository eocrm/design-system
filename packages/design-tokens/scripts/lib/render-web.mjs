const HEADER = `// GENERATED FILE — DO NOT EDIT.
// Source: packages/design-tokens/src/tokens.json
// Schema version: `;

export function renderWeb(document) {
  const webTokens = document.tokens.filter((token) => token.outputs.web);
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
  const header = `${HEADER}${document.schemaVersion}\n`;

  return {
    tokensScss: `${header}
:root {
  color-scheme: light;
${lightDeclarations.join('\n')}
}
`,
    darkScss: `${header}
:root[data-theme='dark'] {
  color-scheme: dark;
${darkDeclarations.join('\n')}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;
${darkDeclarations.map((line) => `  ${line}`).join('\n')}
  }
}

:root[data-theme='light'] {
  color-scheme: light;
}
`,
  };
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
