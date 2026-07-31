export class TokenSemanticError extends Error {
  constructor(issues) {
    const sortedIssues = issues.slice().sort(compareIssues);
    super(sortedIssues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'));
    this.name = 'TokenSemanticError';
    this.issues = sortedIssues;
  }
}

export function validateTokens(document) {
  const issues = [];
  const tokensById = new Map();
  const webNames = new Map();
  const composeNames = new Map();

  for (const [index, token] of document.tokens.entries()) {
    const tokenPath = `/tokens/${index}`;
    if (tokensById.has(token.id)) {
      issues.push(issue(`${tokenPath}/id`, 'duplicate-id', `duplicate token id ${token.id}`));
    } else {
      tokensById.set(token.id, { token, index });
    }

    const outputs = token.outputs ?? {};
    if (Object.keys(outputs).length === 0) {
      issues.push(
        issue(`${tokenPath}/outputs`, 'missing-output', 'token must declare at least one output'),
      );
    }

    if (outputs.web) {
      addUnique(
        webNames,
        outputs.web.name,
        index,
        `${tokenPath}/outputs/web/name`,
        'duplicate-output',
        `duplicate web output ${outputs.web.name}`,
        issues,
      );
    }

    if (outputs.compose) {
      const composeName = `${outputs.compose.group}.${outputs.compose.name}`;
      addUnique(
        composeNames,
        composeName,
        index,
        `${tokenPath}/outputs/compose/name`,
        'duplicate-output',
        `duplicate Compose output ${composeName}`,
        issues,
      );
    }
  }

  const inspectedAliasPaths = new Set();
  for (const [index, token] of document.tokens.entries()) {
    inspectAliases(
      token.value,
      token.id,
      `/tokens/${index}/value`,
      undefined,
      tokensById,
      issues,
      inspectedAliasPaths,
    );
  }

  for (const [index, token] of document.tokens.entries()) {
    if (token.outputs?.compose) continue;
    for (const theme of isThemed(token.value) ? ['light', 'dark'] : ['light']) {
      let value;
      try {
        value = resolveTokenValue(document, token.id, theme);
      } catch {
        continue;
      }
      const valuePath = isThemed(token.value)
        ? `/tokens/${index}/value/${theme}`
        : `/tokens/${index}/value`;
      const isOptionalWebOverride =
        value === null && isThemed(token.value) && token.outputs?.web && !token.outputs?.compose;
      if (!isOptionalWebOverride && !isValidTokenValue(token.type, value)) {
        issues.push(
          issue(
            valuePath,
            'invalid-token-value',
            `${token.type} token has an invalid resolved value`,
          ),
        );
      }
    }
  }

  for (const [index, token] of document.tokens.entries()) {
    if (!token.outputs?.compose) continue;
    const groupPath = `/tokens/${index}/outputs/compose/group`;
    const allowedGroupTypes = new Map([
      ['avatarPalette', new Set(['color'])],
      ['categoricalPalette', new Set(['color'])],
      ['colors', new Set(['color'])],
      ['dimensions', new Set(['dimension'])],
      ['semanticTones', new Set(['color'])],
      ['typography', new Set(['dimension', 'fontWeight', 'lineHeight'])],
    ]);
    const groupTypes = allowedGroupTypes.get(token.outputs.compose.group);
    if (!groupTypes) {
      issues.push(
        issue(
          groupPath,
          'invalid-compose-group',
          `unknown Compose output group ${token.outputs.compose.group}`,
        ),
      );
    } else if (!groupTypes.has(token.type)) {
      issues.push(
        issue(
          groupPath,
          'invalid-compose-group-type',
          `Compose group ${token.outputs.compose.group} does not support token type ${token.type}`,
        ),
      );
    }
    const supportedTypes = new Set(['color', 'dimension', 'fontWeight', 'lineHeight']);
    if (!supportedTypes.has(token.type)) {
      issues.push(
        issue(
          `/tokens/${index}/type`,
          'invalid-compose-type',
          `Compose output does not support token type ${token.type}`,
        ),
      );
      continue;
    }
    for (const theme of isThemed(token.value) ? ['light', 'dark'] : ['light']) {
      let value;
      try {
        value = resolveTokenValue(document, token.id, theme);
      } catch {
        continue;
      }
      const valuePath = isThemed(token.value)
        ? `/tokens/${index}/value/${theme}`
        : `/tokens/${index}/value`;
      if (token.type === 'color' && !isComposeColor(value)) {
        issues.push(
          issue(
            valuePath,
            'invalid-compose-value',
            'Compose colors must resolve to a #RRGGBB hex value',
          ),
        );
      }
      if (token.type === 'dimension' && !isComposeDimension(value)) {
        issues.push(
          issue(
            valuePath,
            'invalid-compose-value',
            'Compose dimensions must resolve to a px value or numeric zero',
          ),
        );
      }
      if (token.type === 'fontWeight' && ![400, 500, 600, 700].includes(value)) {
        issues.push(
          issue(
            valuePath,
            'invalid-compose-value',
            'Compose font weights must resolve to 400, 500, 600, or 700',
          ),
        );
      }
      if (
        token.type === 'lineHeight' &&
        !(typeof value === 'number' && Number.isFinite(value) && value > 0)
      ) {
        issues.push(
          issue(
            valuePath,
            'invalid-compose-value',
            'Compose line heights must resolve to a positive unitless number',
          ),
        );
      }
    }
  }

  if (issues.length > 0) throw new TokenSemanticError(issues);
  return document;
}

export function resolveTokenValue(document, tokenId, theme) {
  const tokensById = new Map(document.tokens.map((token) => [token.id, token]));
  const stack = [];

  function resolve(id) {
    const token = tokensById.get(id);
    if (!token) throw new Error(`unknown token alias ${id}`);
    if (stack.includes(id)) throw new Error(`alias cycle: ${[...stack, id].join(' -> ')}`);
    stack.push(id);
    const value = resolveValue(selectTheme(token.value, theme));
    stack.pop();
    return value;
  }

  function resolveValue(value) {
    if (isAlias(value)) return resolve(value.alias);
    return isThemed(value) ? resolveValue(selectTheme(value, theme)) : value;
  }

  return resolve(tokenId);
}

function inspectAliases(
  value,
  sourceId,
  path,
  theme,
  tokensById,
  issues,
  inspectedAliasPaths,
  stack = [sourceId],
) {
  if (isThemed(value)) {
    inspectAliases(
      value.light,
      sourceId,
      `${path}/light`,
      'light',
      tokensById,
      issues,
      inspectedAliasPaths,
      stack,
    );
    inspectAliases(
      value.dark,
      sourceId,
      `${path}/dark`,
      'dark',
      tokensById,
      issues,
      inspectedAliasPaths,
      stack,
    );
    return;
  }
  if (!isAlias(value)) return;

  const aliasPath = `${path}/alias`;
  if (inspectedAliasPaths.has(aliasPath)) return;
  inspectedAliasPaths.add(aliasPath);

  const targetLocation = tokensById.get(value.alias);
  if (!targetLocation) {
    issues.push(issue(aliasPath, 'unknown-alias', `unknown token alias ${value.alias}`));
    return;
  }
  const { token: target, index: targetIndex } = targetLocation;
  if (stack.includes(target.id)) {
    const cycle = [...stack.slice(stack.indexOf(target.id)), target.id];
    issues.push(issue(aliasPath, 'alias-cycle', `alias cycle: ${cycle.join(' -> ')}`));
    return;
  }
  if ((theme !== undefined) !== isThemed(target.value)) {
    issues.push(
      issue(aliasPath, 'theme-shape', `alias ${value.alias} has an incompatible theme shape`),
    );
    return;
  }
  const targetValue = theme === undefined ? target.value : target.value[theme];
  const targetPath =
    theme === undefined ? `/tokens/${targetIndex}/value` : `/tokens/${targetIndex}/value/${theme}`;
  inspectAliases(
    targetValue,
    target.id,
    targetPath,
    theme,
    tokensById,
    issues,
    inspectedAliasPaths,
    [...stack, target.id],
  );
}

function addUnique(map, key, index, path, code, message, issues) {
  if (map.has(key)) {
    issues.push(issue(path, code, message));
    return;
  }
  map.set(key, index);
}

function isAlias(value) {
  return value !== null && typeof value === 'object' && 'alias' in value;
}

function isThemed(value) {
  return value !== null && typeof value === 'object' && 'light' in value && 'dark' in value;
}

function selectTheme(value, theme) {
  return isThemed(value) ? value[theme] : value;
}

function isComposeColor(value) {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/.test(value);
}

function isComposeDimension(value) {
  return (
    value === 0 || (typeof value === 'string' && /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?px$/.test(value))
  );
}

function isValidTokenValue(type, value) {
  switch (type) {
    case 'color':
      return (
        typeof value === 'string' &&
        (/^#[0-9A-Fa-f]{3,8}$/.test(value) ||
          /^(?:rgb|rgba|hsl|hsla|oklch|color)\(/.test(value) ||
          ['transparent', 'currentColor'].includes(value))
      );
    case 'dimension':
      return (
        value === 0 ||
        (typeof value === 'string' &&
          /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:px|rem|em|%)$/.test(value))
      );
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'fontFamily':
      return typeof value === 'string' && value.trim().length > 0;
    case 'fontWeight':
      return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 1000;
    case 'lineHeight':
      return typeof value === 'number' && Number.isFinite(value) && value > 0;
    case 'duration':
      return (
        typeof value === 'string' &&
        /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:ms|s)(?:\s+[A-Za-z][A-Za-z0-9-]*(?:\([^)]*\))?)?$/.test(
          value,
        )
      );
    case 'shadow':
    case 'css':
      return typeof value === 'string' && value.trim().length > 0;
    default:
      return false;
  }
}

function issue(path, code, message) {
  return { path, code, message };
}

function compareIssues(left, right) {
  return compareCodeUnits(left.path, right.path) || compareCodeUnits(left.code, right.code);
}

function compareCodeUnits(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
