import assert from 'node:assert/strict';
import test from 'node:test';
import { renderCompose } from '../scripts/lib/render-compose.mjs';
import { validateTokens } from '../scripts/lib/validate-tokens.mjs';

test('renders a complete typed Compose API with stable public names', () => {
  const document = validateTokens({
    schemaVersion: 1,
    contractVersion: '1.2.3',
    tokens: [
      composeToken(
        'color.background',
        'color',
        {
          light: '#ffffff',
          dark: '#11223344',
        },
        'colors',
        'background',
      ),
      composeToken('space.4', 'dimension', '16px', 'dimensions', 'space4'),
      composeToken('font.size.medium', 'dimension', '14px', 'typography', 'fontSizeMedium'),
      composeToken('font.weight.semibold', 'fontWeight', 600, 'typography', 'fontWeightSemibold'),
      composeToken('line.height.normal', 'lineHeight', 1.5, 'typography', 'lineHeightNormal'),
      composeToken(
        'tone.info.background',
        'color',
        {
          light: '#deebff',
          dark: '#16324f',
        },
        'semanticTones',
        'infoBackground',
      ),
      composeToken(
        'tone.info.foreground',
        'color',
        {
          light: '#0747a6',
          dark: '#9dc3ff',
        },
        'semanticTones',
        'infoForeground',
      ),
      composeToken('avatar.foreground', 'color', '#ffffff', 'avatarPalette', 'foreground'),
      composeToken('avatar.palette.1', 'color', '#00a3bf', 'avatarPalette', 'palette1'),
      composeToken(
        'palette.red.background',
        'color',
        {
          light: '#ffebe6',
          dark: '#482219',
        },
        'categoricalPalette',
        'redBackground',
      ),
      composeToken(
        'palette.red.foreground',
        'color',
        {
          light: '#bf2600',
          dark: '#f9a994',
        },
        'categoricalPalette',
        'redForeground',
      ),
      {
        id: 'transition.fast',
        type: 'duration',
        value: '100ms ease-out',
        outputs: { web: { name: '--transition-fast' } },
      },
    ],
  });

  assert.deepEqual(Object.fromEntries(renderCompose(document)), expectedComposeFiles);
});

test('renders themed dimensions and typography into distinct light and dark instances', () => {
  const document = validateTokens({
    schemaVersion: 1,
    contractVersion: '1.0.0',
    tokens: [
      composeToken('color.background', 'color', '#ffffff', 'colors', 'background'),
      composeToken(
        'space.adaptive',
        'dimension',
        { light: '4px', dark: '8px' },
        'dimensions',
        'adaptive',
      ),
      composeToken(
        'font.size.adaptive',
        'dimension',
        { light: '12px', dark: '14px' },
        'typography',
        'adaptive',
      ),
      composeToken('tone.info.background', 'color', '#deebff', 'semanticTones', 'infoBackground'),
      composeToken('tone.info.foreground', 'color', '#0747a6', 'semanticTones', 'infoForeground'),
      composeToken('avatar.foreground', 'color', '#ffffff', 'avatarPalette', 'foreground'),
    ],
  });

  const output = Object.fromEntries(renderCompose(document));

  assert.match(
    output['EocrmDimensions.kt'],
    /eocrmLightDimensions[\s\S]*adaptive = 4\.dp[\s\S]*eocrmDarkDimensions[\s\S]*adaptive = 8\.dp/,
  );
  assert.match(
    output['EocrmTypography.kt'],
    /eocrmLightTypography[\s\S]*adaptive = 12\.sp[\s\S]*eocrmDarkTypography[\s\S]*adaptive = 14\.sp/,
  );
  assert.match(
    output['EocrmTokenContract.kt'],
    /EocrmLightTokens[\s\S]*dimensions: EocrmDimensions = eocrmLightDimensions[\s\S]*typography: EocrmTypography = eocrmLightTypography/,
  );
  assert.match(
    output['EocrmTokenContract.kt'],
    /EocrmDarkTokens[\s\S]*dimensions: EocrmDimensions = eocrmDarkDimensions[\s\S]*typography: EocrmTypography = eocrmDarkTypography/,
  );
});

test('reports an actionable Compose boundary error for a valid web-only document', () => {
  const document = validateTokens({
    schemaVersion: 1,
    contractVersion: '1.0.0',
    tokens: [
      {
        id: 'color.web-only',
        type: 'color',
        value: '#ffffff',
        outputs: { web: { name: '--color-web-only' } },
      },
    ],
  });

  assert.throws(
    () => renderCompose(document),
    (error) => {
      assert.equal(error.name, 'ComposeRenderError');
      assert.equal(
        error.message,
        'Compose rendering requires colors, dimensions, typography, semanticTones, and avatarPalette.foreground; missing colors, dimensions, typography, semanticTones, avatarPalette.foreground',
      );
      return true;
    },
  );
});

test('rejects Compose values without a safe typed conversion', () => {
  assert.throws(
    () =>
      validateTokens({
        schemaVersion: 1,
        contractVersion: '1.0.0',
        tokens: [composeToken('unsafe.value', 'css', 'calc(100% - 1px)', 'dimensions', 'unsafe')],
      }),
    /Compose output does not support token type css/,
  );
});

test('rejects unknown Compose groups and types that do not match their group', () => {
  assert.throws(
    () =>
      validateTokens({
        schemaVersion: 1,
        contractVersion: '1.0.0',
        tokens: [
          composeToken('color.wrong', 'dimension', '4px', 'colors', 'wrong'),
          composeToken('color.unknown', 'color', '#ffffff', 'unknownGroup', 'unknown'),
        ],
      }),
    (error) => {
      assert.deepEqual(
        error.issues.map(({ path, code }) => ({ path, code })),
        [
          {
            path: '/tokens/0/outputs/compose/group',
            code: 'invalid-compose-group-type',
          },
          {
            path: '/tokens/1/outputs/compose/group',
            code: 'invalid-compose-group',
          },
        ],
      );
      return true;
    },
  );
});

function composeToken(id, type, value, group, name) {
  return { id, type, value, outputs: { compose: { group, name } } };
}

const header = `// GENERATED FILE — DO NOT EDIT.
// Source: packages/design-tokens/src/tokens.json
// Schema version: 1

`;

const expectedComposeFiles = {
  'EocrmColors.kt': `${header}package com.eocrm.design.tokens

import androidx.compose.ui.graphics.Color

public data class EocrmColors(
    public val background: Color,
)
`,
  'EocrmDimensions.kt': `${header}package com.eocrm.design.tokens

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

public data class EocrmDimensions(
    public val space4: Dp,
)

internal val eocrmDimensions: EocrmDimensions = EocrmDimensions(
    space4 = 16.dp,
)
`,
  'EocrmTypography.kt': `${header}package com.eocrm.design.tokens

import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

public data class EocrmTypography(
    public val fontSizeMedium: TextUnit,
    public val fontWeightSemibold: FontWeight,
    public val lineHeightNormal: TextUnit,
)

internal val eocrmTypography: EocrmTypography = EocrmTypography(
    fontSizeMedium = 14.sp,
    fontWeightSemibold = FontWeight.SemiBold,
    lineHeightNormal = 1.5.em,
)
`,
  'EocrmPalettes.kt': `${header}package com.eocrm.design.tokens

import androidx.compose.ui.graphics.Color

public data class EocrmPaletteColor(
    public val background: Color,
    public val foreground: Color,
)

public data class EocrmSemanticTones(
    public val info: EocrmPaletteColor,
)

public data class EocrmAvatarPalette(
    public val foreground: Color,
    public val colors: List<Color>,
)
`,
  'EocrmTokenContract.kt': `${header}package com.eocrm.design.tokens

import androidx.compose.ui.graphics.Color

public object EocrmTokenContract {
    public const val schemaVersion: Int = 1
    public const val contractVersion: String = "1.2.3"
}

public object EocrmLightTokens {
    public val colors: EocrmColors = EocrmColors(
        background = Color(0xFFFFFFFF),
    )
    public val dimensions: EocrmDimensions = eocrmDimensions
    public val typography: EocrmTypography = eocrmTypography
    public val semanticTones: EocrmSemanticTones = EocrmSemanticTones(
        info = EocrmPaletteColor(
            background = Color(0xFFDEEBFF),
            foreground = Color(0xFF0747A6),
        ),
    )
    public val avatarPalette: EocrmAvatarPalette = EocrmAvatarPalette(
        foreground = Color(0xFFFFFFFF),
        colors = listOf(
            Color(0xFF00A3BF),
        ),
    )
    public val categoricalPalette: List<EocrmPaletteColor> = listOf(
        EocrmPaletteColor(
            background = Color(0xFFFFEBE6),
            foreground = Color(0xFFBF2600),
        ),
    )
}

public object EocrmDarkTokens {
    public val colors: EocrmColors = EocrmColors(
        background = Color(0x44112233),
    )
    public val dimensions: EocrmDimensions = eocrmDimensions
    public val typography: EocrmTypography = eocrmTypography
    public val semanticTones: EocrmSemanticTones = EocrmSemanticTones(
        info = EocrmPaletteColor(
            background = Color(0xFF16324F),
            foreground = Color(0xFF9DC3FF),
        ),
    )
    public val avatarPalette: EocrmAvatarPalette = EocrmAvatarPalette(
        foreground = Color(0xFFFFFFFF),
        colors = listOf(
            Color(0xFF00A3BF),
        ),
    )
    public val categoricalPalette: List<EocrmPaletteColor> = listOf(
        EocrmPaletteColor(
            background = Color(0xFF482219),
            foreground = Color(0xFFF9A994),
        ),
    )
}
`,
};
