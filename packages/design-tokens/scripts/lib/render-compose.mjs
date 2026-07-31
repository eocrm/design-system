import { resolveTokenValue } from './validate-tokens.mjs';

export class ComposeRenderError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ComposeRenderError';
  }
}

export function renderCompose(document) {
  const groups = groupComposeTokens(document);
  const missing = ['colors', 'dimensions', 'typography', 'semanticTones'].filter(
    (group) => groups[group].length === 0,
  );
  if (!groups.avatarPalette.some((token) => token.composeName === 'foreground')) {
    missing.push('avatarPalette.foreground');
  }
  if (missing.length > 0) {
    throw new ComposeRenderError(
      `Compose rendering requires colors, dimensions, typography, semanticTones, and avatarPalette.foreground; missing ${missing.join(', ')}`,
    );
  }
  const header = `// GENERATED FILE — DO NOT EDIT.
// Source: packages/design-tokens/src/tokens.json
// Schema version: ${document.schemaVersion}

`;

  return new Map([
    ['EocrmColors.kt', renderColors(header, groups.colors)],
    ['EocrmDimensions.kt', renderDimensions(header, groups.dimensions)],
    ['EocrmTypography.kt', renderTypography(header, groups.typography)],
    ['EocrmPalettes.kt', renderPalettes(header, groups.semanticTones)],
    ['EocrmTokenContract.kt', renderContract(header, document, groups)],
  ]);
}

function groupComposeTokens(document) {
  const groups = {
    colors: [],
    dimensions: [],
    typography: [],
    semanticTones: [],
    avatarPalette: [],
    categoricalPalette: [],
  };
  for (const token of document.tokens) {
    const output = token.outputs.compose;
    if (output) {
      groups[output.group].push({
        ...token,
        composeName: output.name,
        document,
      });
    }
  }
  for (const tokens of Object.values(groups)) {
    tokens.sort((left, right) => {
      if (left.composeName < right.composeName) return -1;
      if (left.composeName > right.composeName) return 1;
      return 0;
    });
  }
  return groups;
}

function renderColors(header, tokens) {
  return `${header}package com.eocrm.design.tokens

import androidx.compose.ui.graphics.Color

public data class EocrmColors(
${tokens.map((token) => `    public val ${token.composeName}: Color,`).join('\n')}
)
`;
}

function renderDimensions(header, tokens) {
  const instances = hasThemedValues(tokens)
    ? [
        renderDimensionInstance('eocrmLightDimensions', tokens, 'light'),
        renderDimensionInstance('eocrmDarkDimensions', tokens, 'dark'),
      ].join('\n\n')
    : renderDimensionInstance('eocrmDimensions', tokens, 'light');
  return `${header}package com.eocrm.design.tokens

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

public data class EocrmDimensions(
${tokens.map((token) => `    public val ${token.composeName}: Dp,`).join('\n')}
)

${instances}
`;
}

function renderTypography(header, tokens) {
  const instances = hasThemedValues(tokens)
    ? [
        renderTypographyInstance('eocrmLightTypography', tokens, 'light'),
        renderTypographyInstance('eocrmDarkTypography', tokens, 'dark'),
      ].join('\n\n')
    : renderTypographyInstance('eocrmTypography', tokens, 'light');
  return `${header}package com.eocrm.design.tokens

import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

public data class EocrmTypography(
${tokens.map((token) => `    public val ${token.composeName}: ${typographyType(token)},`).join('\n')}
)

${instances}
`;
}

function renderPalettes(header, semanticTokens) {
  const toneNames = pairNames(semanticTokens);
  return `${header}package com.eocrm.design.tokens

import androidx.compose.ui.graphics.Color

public data class EocrmPaletteColor(
    public val background: Color,
    public val foreground: Color,
)

public data class EocrmSemanticTones(
${toneNames.map((name) => `    public val ${name}: EocrmPaletteColor,`).join('\n')}
)

public data class EocrmAvatarPalette(
    public val foreground: Color,
    public val colors: List<Color>,
)
`;
}

function renderContract(header, document, groups) {
  return `${header}package com.eocrm.design.tokens

import androidx.compose.ui.graphics.Color

public object EocrmTokenContract {
    public const val schemaVersion: Int = ${document.schemaVersion}
    public const val contractVersion: String = "${document.contractVersion}"
}

${renderThemeObject('EocrmLightTokens', 'light', groups)}

${renderThemeObject('EocrmDarkTokens', 'dark', groups)}
`;
}

function renderThemeObject(name, theme, groups) {
  const avatarForeground = groups.avatarPalette.find((token) => token.composeName === 'foreground');
  const avatarColors = groups.avatarPalette.filter((token) =>
    token.composeName.startsWith('palette'),
  );
  return `public object ${name} {
    public val colors: EocrmColors = EocrmColors(
${groups.colors.map((token) => `        ${token.composeName} = ${renderColor(resolve(token, theme))},`).join('\n')}
    )
    public val dimensions: EocrmDimensions = ${instanceName('Dimensions', groups.dimensions, theme)}
    public val typography: EocrmTypography = ${instanceName('Typography', groups.typography, theme)}
    public val semanticTones: EocrmSemanticTones = EocrmSemanticTones(
${renderPalettePairs(groups.semanticTones, theme, 8)}
    )
    public val avatarPalette: EocrmAvatarPalette = EocrmAvatarPalette(
        foreground = ${renderColor(resolve(avatarForeground, theme))},
        colors = listOf(
${avatarColors.map((token) => `            ${renderColor(resolve(token, theme))},`).join('\n')}
        ),
    )
    public val categoricalPalette: List<EocrmPaletteColor> = listOf(
${renderPalettePairs(groups.categoricalPalette, theme, 8)}
    )
}`;
}

function renderPalettePairs(tokens, theme, indent) {
  const spaces = ' '.repeat(indent);
  const childSpaces = ' '.repeat(indent + 4);
  return pairNames(tokens)
    .map((name) => {
      const background = tokens.find((token) => token.composeName === `${name}Background`);
      const foreground = tokens.find((token) => token.composeName === `${name}Foreground`);
      return `${spaces}${tokens[0]?.outputs.compose.group === 'semanticTones' ? `${name} = ` : ''}EocrmPaletteColor(
${childSpaces}background = ${renderColor(resolve(background, theme))},
${childSpaces}foreground = ${renderColor(resolve(foreground, theme))},
${spaces}),`;
    })
    .join('\n');
}

function pairNames(tokens) {
  return tokens
    .filter((token) => token.composeName.endsWith('Background'))
    .map((token) => token.composeName.slice(0, -'Background'.length));
}

function typographyType(token) {
  return token.type === 'fontWeight' ? 'FontWeight' : 'TextUnit';
}

function renderDimensionInstance(name, tokens, theme) {
  return `internal val ${name}: EocrmDimensions = EocrmDimensions(
${tokens.map((token) => `    ${token.composeName} = ${renderDimension(resolve(token, theme))},`).join('\n')}
)`;
}

function renderTypographyInstance(name, tokens, theme) {
  return `internal val ${name}: EocrmTypography = EocrmTypography(
${tokens.map((token) => `    ${token.composeName} = ${renderTypographyValue(token, theme)},`).join('\n')}
)`;
}

function renderTypographyValue(token, theme) {
  const value = resolve(token, theme);
  if (token.type === 'fontWeight') {
    return `FontWeight.${new Map([
      [400, 'Normal'],
      [500, 'Medium'],
      [600, 'SemiBold'],
      [700, 'Bold'],
    ]).get(value)}`;
  }
  if (token.type === 'lineHeight') return `${formatNumber(value)}.em`;
  return `${stripPixels(value)}.sp`;
}

function instanceName(type, tokens, theme) {
  if (!hasThemedValues(tokens)) return `eocrm${type}`;
  const themeName = theme === 'light' ? 'Light' : 'Dark';
  return `eocrm${themeName}${type}`;
}

function hasThemedValues(tokens) {
  return tokens.some(
    (token) =>
      token.value !== null &&
      typeof token.value === 'object' &&
      'light' in token.value &&
      'dark' in token.value,
  );
}

function renderColor(value) {
  const hex = value.slice(1).toUpperCase();
  return hex.length === 6 ? `Color(0xFF${hex})` : `Color(0x${hex.slice(6)}${hex.slice(0, 6)})`;
}

function renderDimension(value) {
  return `${value === 0 ? '0' : stripPixels(value)}.dp`;
}

function stripPixels(value) {
  return value.slice(0, -2);
}

function formatNumber(value) {
  return String(value);
}

function resolve(token, theme) {
  return resolveTokenValue(token.document, token.id, theme);
}
