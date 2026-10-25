package com.eocrm.design.tokens

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import kotlin.test.Test
import kotlin.test.assertEquals

class TokenContractTest {
    @Test
    fun exposesRepresentativeLightAndDarkValues() {
        assertEquals(Color(0xFFFFFFFF), EocrmLightTokens.colors.background)
        assertEquals(Color(0xFF1D2125), EocrmDarkTokens.colors.background)
        assertEquals(16.dp, EocrmLightTokens.dimensions.space4)
        assertEquals(30, EocrmLightTokens.categoricalPalette.size)
        assertEquals(1, EocrmTokenContract.schemaVersion)
    }

    @Test
    fun tealPineOverridesOnlyAccentColors() {
        assertEquals(Color(0xFF0B6D67), EocrmTealPineLightTokens.colors.accent)
        assertEquals(Color(0xFF6DCFC4), EocrmTealPineDarkTokens.colors.accent)
        assertEquals(
            EocrmLightTokens.colors.copy(
                accent = EocrmTealPineLightTokens.colors.accent,
                accentHover = EocrmTealPineLightTokens.colors.accentHover,
                accentPressed = EocrmTealPineLightTokens.colors.accentPressed,
                accentForeground = EocrmTealPineLightTokens.colors.accentForeground,
                accentBackgroundSubtle = EocrmTealPineLightTokens.colors.accentBackgroundSubtle,
                accentSubtleBackground = EocrmTealPineLightTokens.colors.accentSubtleBackground,
            ),
            EocrmTealPineLightTokens.colors,
        )
        assertEquals(EocrmLightTokens.dimensions, EocrmTealPineLightTokens.dimensions)
        assertEquals(EocrmDarkTokens.semanticTones, EocrmTealPineDarkTokens.semanticTones)
    }
}
