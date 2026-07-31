// GENERATED FILE — DO NOT EDIT.
// Source: packages/design-tokens/src/tokens.json
// Schema version: 1

package com.eocrm.design.tokens

import androidx.compose.ui.graphics.Color

public object EocrmTokenContract {
    public const val schemaVersion: Int = 1
    public const val contractVersion: String = "0.0.0"
}

public object EocrmLightTokens {
    public val colors: EocrmColors = EocrmColors(
        accent = Color(0xFF0052CC),
        accentBackgroundSubtle = Color(0xFFDEEBFF),
        accentForeground = Color(0xFFFFFFFF),
        accentHover = Color(0xFF0747A6),
        accentPressed = Color(0xFF053585),
        accentSubtleBackground = Color(0xFFDEEBFF),
        background = Color(0xFFFFFFFF),
        backgroundDangerSubtle = Color(0xFFFFEBE6),
        backgroundMuted = Color(0xFFF4F5F7),
        backgroundSubtle = Color(0xFFFAFBFC),
        backgroundSunken = Color(0xFFEBECF0),
        border = Color(0xFFDFE1E6),
        borderStrong = Color(0xFFC1C7D0),
        danger = Color(0xFFDE350B),
        dangerBackgroundSubtle = Color(0xFFFFEBE6),
        dangerForeground = Color(0xFFFFFFFF),
        dangerHover = Color(0xFFBF2600),
        foreground = Color(0xFF172B4D),
        foregroundDisabled = Color(0xFFA5ADBA),
        foregroundMuted = Color(0xFF5E6C84),
        foregroundSubtle = Color(0xFF6B778C),
        info = Color(0xFF0052CC),
        infoBackgroundSubtle = Color(0xFFEBF3FF),
        success = Color(0xFF00875A),
        successBackgroundSubtle = Color(0xFFE3FCEF),
        successForeground = Color(0xFFFFFFFF),
        successHover = Color(0xFF006644),
        warning = Color(0xFFFF991F),
        warningBackgroundSubtle = Color(0xFFFFF7ED),
        warningForeground = Color(0xFFFFFFFF),
    )
    public val dimensions: EocrmDimensions = eocrmDimensions
    public val typography: EocrmTypography = eocrmTypography
    public val semanticTones: EocrmSemanticTones = EocrmSemanticTones(
        danger = EocrmPaletteColor(
            background = Color(0xFFFFEBE6),
            foreground = Color(0xFFBF2600),
        ),
        info = EocrmPaletteColor(
            background = Color(0xFFDEEBFF),
            foreground = Color(0xFF0747A6),
        ),
        neutral = EocrmPaletteColor(
            background = Color(0xFFF4F5F7),
            foreground = Color(0xFF42526E),
        ),
        purple = EocrmPaletteColor(
            background = Color(0xFFEAE6FF),
            foreground = Color(0xFF403294),
        ),
        success = EocrmPaletteColor(
            background = Color(0xFFE3FCEF),
            foreground = Color(0xFF006644),
        ),
        warning = EocrmPaletteColor(
            background = Color(0xFFFFFAE6),
            foreground = Color(0xFF974F00),
        ),
    )
    public val avatarPalette: EocrmAvatarPalette = EocrmAvatarPalette(
        foreground = Color(0xFFFFFFFF),
        colors = listOf(
            Color(0xFF00A3BF),
            Color(0xFF36B37E),
            Color(0xFFFF8B00),
            Color(0xFF6554C0),
            Color(0xFFDE350B),
            Color(0xFF0052CC),
        ),
    )
    public val categoricalPalette: List<EocrmPaletteColor> = listOf(
        EocrmPaletteColor(
            background = Color(0xFFFFF7D6),
            foreground = Color(0xFF7A5300),
        ),
        EocrmPaletteColor(
            background = Color(0xFFDEEBFF),
            foreground = Color(0xFF0747A6),
        ),
        EocrmPaletteColor(
            background = Color(0xFFF1E3D3),
            foreground = Color(0xFF6B4A1F),
        ),
        EocrmPaletteColor(
            background = Color(0xFFD8DADC),
            foreground = Color(0xFF2E3338),
        ),
        EocrmPaletteColor(
            background = Color(0xFFFFE5DD),
            foreground = Color(0xFF9E3A14),
        ),
        EocrmPaletteColor(
            background = Color(0xFFDFF5F9),
            foreground = Color(0xFF00657A),
        ),
        EocrmPaletteColor(
            background = Color(0xFFD2F0E1),
            foreground = Color(0xFF00714D),
        ),
        EocrmPaletteColor(
            background = Color(0xFFFBDEF5),
            foreground = Color(0xFF7A1C70),
        ),
        EocrmPaletteColor(
            background = Color(0xFFFFF3C0),
            foreground = Color(0xFF806100),
        ),
        EocrmPaletteColor(
            background = Color(0xFFD4F5DD),
            foreground = Color(0xFF006633),
        ),
        EocrmPaletteColor(
            background = Color(0xFFE2E2F7),
            foreground = Color(0xFF2C2D80),
        ),
        EocrmPaletteColor(
            background = Color(0xFFECE6FF),
            foreground = Color(0xFF5D4BA6),
        ),
        EocrmPaletteColor(
            background = Color(0xFFE8F7C8),
            foreground = Color(0xFF3C6900),
        ),
        EocrmPaletteColor(
            background = Color(0xFFFFD9F0),
            foreground = Color(0xFF8C195E),
        ),
        EocrmPaletteColor(
            background = Color(0xFFD6F5EC),
            foreground = Color(0xFF00755A),
        ),
        EocrmPaletteColor(
            background = Color(0xFFD8E0F0),
            foreground = Color(0xFF1A2E63),
        ),
        EocrmPaletteColor(
            background = Color(0xFFF0F3CC),
            foreground = Color(0xFF4D5A00),
        ),
        EocrmPaletteColor(
            background = Color(0xFFFFF0DB),
            foreground = Color(0xFF974F00),
        ),
        EocrmPaletteColor(
            background = Color(0xFFFFE0EB),
            foreground = Color(0xFFA3174A),
        ),
        EocrmPaletteColor(
            background = Color(0xFFEFDDF0),
            foreground = Color(0xFF6A2B6B),
        ),
        EocrmPaletteColor(
            background = Color(0xFFEAE6FF),
            foreground = Color(0xFF403294),
        ),
        EocrmPaletteColor(
            background = Color(0xFFFFEBE6),
            foreground = Color(0xFFBF2600),
        ),
        EocrmPaletteColor(
            background = Color(0xFFFFE1E1),
            foreground = Color(0xFFA01A35),
        ),
        EocrmPaletteColor(
            background = Color(0xFFDCEEFB),
            foreground = Color(0xFF1F5285),
        ),
        EocrmPaletteColor(
            background = Color(0xFFE2E6ED),
            foreground = Color(0xFF3D4B66),
        ),
        EocrmPaletteColor(
            background = Color(0xFFE9E7E3),
            foreground = Color(0xFF4D4944),
        ),
        EocrmPaletteColor(
            background = Color(0xFFECE5DB),
            foreground = Color(0xFF5A4A3A),
        ),
        EocrmPaletteColor(
            background = Color(0xFFD6F0F0),
            foreground = Color(0xFF006970),
        ),
        EocrmPaletteColor(
            background = Color(0xFFE3DEFF),
            foreground = Color(0xFF4030A6),
        ),
        EocrmPaletteColor(
            background = Color(0xFFFFFACC),
            foreground = Color(0xFF6B5F00),
        ),
    )
}

public object EocrmDarkTokens {
    public val colors: EocrmColors = EocrmColors(
        accent = Color(0xFF579DFF),
        accentBackgroundSubtle = Color(0xFF1C3A5E),
        accentForeground = Color(0xFF1D2125),
        accentHover = Color(0xFF85B8FF),
        accentPressed = Color(0xFFCCE0FF),
        accentSubtleBackground = Color(0xFF1C3A5E),
        background = Color(0xFF1D2125),
        backgroundDangerSubtle = Color(0xFF42201D),
        backgroundMuted = Color(0xFF282E33),
        backgroundSubtle = Color(0xFF22272B),
        backgroundSunken = Color(0xFF161A1D),
        border = Color(0xFF38414A),
        borderStrong = Color(0xFF50585F),
        danger = Color(0xFFF87168),
        dangerBackgroundSubtle = Color(0xFF42201D),
        dangerForeground = Color(0xFF1D2125),
        dangerHover = Color(0xFFFF9C8F),
        foreground = Color(0xFFDEE4EA),
        foregroundDisabled = Color(0xFF5A6472),
        foregroundMuted = Color(0xFF9AA7B5),
        foregroundSubtle = Color(0xFF7E8B9A),
        info = Color(0xFF579DFF),
        infoBackgroundSubtle = Color(0xFF16324F),
        success = Color(0xFF4BCE97),
        successBackgroundSubtle = Color(0xFF1C3D31),
        successForeground = Color(0xFF1D2125),
        successHover = Color(0xFF7EE2B8),
        warning = Color(0xFFF5CD47),
        warningBackgroundSubtle = Color(0xFF3D3216),
        warningForeground = Color(0xFF1D2125),
    )
    public val dimensions: EocrmDimensions = eocrmDimensions
    public val typography: EocrmTypography = eocrmTypography
    public val semanticTones: EocrmSemanticTones = EocrmSemanticTones(
        danger = EocrmPaletteColor(
            background = Color(0xFF42201D),
            foreground = Color(0xFFFF9C8F),
        ),
        info = EocrmPaletteColor(
            background = Color(0xFF16324F),
            foreground = Color(0xFF9DC3FF),
        ),
        neutral = EocrmPaletteColor(
            background = Color(0xFF2C333A),
            foreground = Color(0xFFC7D1DB),
        ),
        purple = EocrmPaletteColor(
            background = Color(0xFF2B2C4D),
            foreground = Color(0xFFB8ACF6),
        ),
        success = EocrmPaletteColor(
            background = Color(0xFF1C3D31),
            foreground = Color(0xFF7EE2B8),
        ),
        warning = EocrmPaletteColor(
            background = Color(0xFF3D3216),
            foreground = Color(0xFFF5CD47),
        ),
    )
    public val avatarPalette: EocrmAvatarPalette = EocrmAvatarPalette(
        foreground = Color(0xFFFFFFFF),
        colors = listOf(
            Color(0xFF00A3BF),
            Color(0xFF36B37E),
            Color(0xFFFF8B00),
            Color(0xFF6554C0),
            Color(0xFFDE350B),
            Color(0xFF0052CC),
        ),
    )
    public val categoricalPalette: List<EocrmPaletteColor> = listOf(
        EocrmPaletteColor(
            background = Color(0xFF483919),
            foreground = Color(0xFFF9D994),
        ),
        EocrmPaletteColor(
            background = Color(0xFF192C48),
            foreground = Color(0xFF94BDF9),
        ),
        EocrmPaletteColor(
            background = Color(0xFF483419),
            foreground = Color(0xFFE6CBA8),
        ),
        EocrmPaletteColor(
            background = Color(0xFF2C3035),
            foreground = Color(0xFFC1C7CC),
        ),
        EocrmPaletteColor(
            background = Color(0xFF482619),
            foreground = Color(0xFFF2B39B),
        ),
        EocrmPaletteColor(
            background = Color(0xFF194048),
            foreground = Color(0xFF94E8F9),
        ),
        EocrmPaletteColor(
            background = Color(0xFF194839),
            foreground = Color(0xFF94F9D9),
        ),
        EocrmPaletteColor(
            background = Color(0xFF481943),
            foreground = Color(0xFFEAA4E3),
        ),
        EocrmPaletteColor(
            background = Color(0xFF483C19),
            foreground = Color(0xFFF9E194),
        ),
        EocrmPaletteColor(
            background = Color(0xFF194830),
            foreground = Color(0xFF94F9C7),
        ),
        EocrmPaletteColor(
            background = Color(0xFF191A48),
            foreground = Color(0xFFACACE2),
        ),
        EocrmPaletteColor(
            background = Color(0xFF251E43),
            foreground = Color(0xFFBAB2DC),
        ),
        EocrmPaletteColor(
            background = Color(0xFF344819),
            foreground = Color(0xFFCEF994),
        ),
        EocrmPaletteColor(
            background = Color(0xFF481935),
            foreground = Color(0xFFEEA0CF),
        ),
        EocrmPaletteColor(
            background = Color(0xFF19483D),
            foreground = Color(0xFF94F9E2),
        ),
        EocrmPaletteColor(
            background = Color(0xFF192648),
            foreground = Color(0xFFA6B8E8),
        ),
        EocrmPaletteColor(
            background = Color(0xFF414819),
            foreground = Color(0xFFEBF994),
        ),
        EocrmPaletteColor(
            background = Color(0xFF483219),
            foreground = Color(0xFFF9C994),
        ),
        EocrmPaletteColor(
            background = Color(0xFF48192A),
            foreground = Color(0xFFF19DBB),
        ),
        EocrmPaletteColor(
            background = Color(0xFF441C45),
            foreground = Color(0xFFDEAFDF),
        ),
        EocrmPaletteColor(
            background = Color(0xFF201948),
            foreground = Color(0xFFB3ABE3),
        ),
        EocrmPaletteColor(
            background = Color(0xFF482219),
            foreground = Color(0xFFF9A994),
        ),
        EocrmPaletteColor(
            background = Color(0xFF481923),
            foreground = Color(0xFFEF9EAF),
        ),
        EocrmPaletteColor(
            background = Color(0xFF193048),
            foreground = Color(0xFFA4C7EA),
        ),
        EocrmPaletteColor(
            background = Color(0xFF242D3D),
            foreground = Color(0xFFB9C2D5),
        ),
        EocrmPaletteColor(
            background = Color(0xFF33312D),
            foreground = Color(0xFFCAC7C3),
        ),
        EocrmPaletteColor(
            background = Color(0xFF3B3026),
            foreground = Color(0xFFD3C7BB),
        ),
        EocrmPaletteColor(
            background = Color(0xFF194548),
            foreground = Color(0xFF94F3F9),
        ),
        EocrmPaletteColor(
            background = Color(0xFF201948),
            foreground = Color(0xFFB0A8E6),
        ),
        EocrmPaletteColor(
            background = Color(0xFF484219),
            foreground = Color(0xFFF9EE94),
        ),
    )
}
