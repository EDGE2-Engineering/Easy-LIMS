package com.easylims.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class MaterialMaster(
    val id: String? = null,
    val name: String? = null,
    @SerialName("created_at")
    val createdAt: String? = null
)
