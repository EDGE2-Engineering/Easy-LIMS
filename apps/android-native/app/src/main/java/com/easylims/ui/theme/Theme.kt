package com.easylims.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = Primary,
    background = Background,
    surface = Surface,
    error = Error,
    onPrimary = Surface,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    onError = Surface
)

@Composable
fun EasyLIMSTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        content = content
    )
}
