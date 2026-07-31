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
}
