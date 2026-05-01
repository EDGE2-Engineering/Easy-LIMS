package com.easylims.models

import kotlinx.serialization.Serializable

@Serializable
data class MaterialMaster(
    val id: String? = null,
    val name: String,
    val created_at: String? = null
)
