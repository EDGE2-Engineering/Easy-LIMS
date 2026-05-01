package com.easylims.models

import kotlinx.serialization.Serializable

@Serializable
data class HSNCode(
    val id: String? = null,
    val code: String,
    val description: String? = null,
    val created_at: String? = null
)
