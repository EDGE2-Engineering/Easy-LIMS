package com.easylims.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class UnitType(
    val id: String? = null,
    @SerialName("unit_type")
    val unitType: String,
    @SerialName("created_at")
    val createdAt: String? = null
)
