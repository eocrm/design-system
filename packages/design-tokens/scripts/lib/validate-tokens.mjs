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
      tokensById.set(token.id, token);
    }

    const outputs = token.outputs ?? {};
    if (Object.keys(outputs).length === 0) {
      issues.push(issue(`${tokenPath}/outputs`, 'missing-output', 'token must declare at least one output'));
    }

    if (outputs.web) {
      addUnique(
        webNames,
        outputs.web.name,
        index,
        `${tokenPath}/outputs/web/name`,
        'duplicate-output',
        `duplicate web output ${outputs.web.name}`,
        issues
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
        issues
      );
    }
  }

  for (const [index, token] of document.tokens.entries()) {
    inspectAliases(token.value, token.id, `/tokens/${index}/value`, undefined, tokensById, issues);
  }

  for (const [index, token] of document.tokens.entries()) {
    if (!token.outputs?.compose) continue;
    for (const theme of (isThemed(token.value) ? ['light', 'dark'] : ['light'])) {
      let value;
      try {
        value = resolveTokenValue(document, token.id, theme);
      } catch {
        continue;
      }
      const valuePath = isThemed(token.value) ? `/tokens/${index}/value/${theme}` : `/tokens/${index}/value`;
      if (token.type === 'color' && !isComposeColor(value)) {
        issues.push(issue(valuePath, 'invalid-compose-value', 'Compose colors must resolve to a #RRGGBB hex value'));
      }
      if (token.type === 'dimension' && !isComposeDimension(value)) {
        issues.push(issue(valuePath, 'invalid-compose-value', 'Compose dimensions must resolve to a px value'));
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

function inspectAliases(value, sourceId, path, theme, tokensById, issues, stack = [sourceId]) {
  if (isThemed(value)) {
    inspectAliases(value.light, sourceId, `${path}/light`, 'light', tokensById, issues, stack);
    inspectAliases(value.dark, sourceId, `${path}/dark`, 'dark', tokensById, issues, stack);
    return;
  }
  if (!isAlias(value)) return;

  const target = tokensById.get(value.alias);
  if (!target) {
    issues.push(issue(`${path}/alias`, 'unknown-alias', `unknown token alias ${value.alias}`));
    return;
  }
  if (stack.includes(target.id)) {
    const cycle = [...stack.slice(stack.indexOf(target.id)), target.id];
    issues.push(issue(`${path}/alias`, 'alias-cycle', `alias cycle: ${cycle.join(' -> ')}`));
    return;
  }
  if ((theme !== undefined) !== isThemed(target.value)) {
    issues.push(issue(`${path}/alias`, 'theme-shape', `alias ${value.alias} has an incompatible theme shape`));
    return;
  }
  const targetValue = theme === undefined ? target.value : target.value[theme];
  inspectAliases(targetValue, target.id, path, theme, tokensById, issues, [...stack, target.id]);
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
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function isComposeDimension(value) {
  return typeof value === 'string' && /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?px$/.test(value);
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
